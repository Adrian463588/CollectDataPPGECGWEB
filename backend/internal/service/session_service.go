// ============================================================
// SessionService — Business logic for session lifecycle
// ============================================================
package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/experiment-controller/backend/internal/model"
	"github.com/experiment-controller/backend/internal/store"
	"github.com/experiment-controller/backend/internal/wib"
)

// Sentinel errors for clean error handling in handlers.
var (
	ErrPhaseMismatch     = errors.New("PHASE_MISMATCH")
	ErrSessionCompleted  = errors.New("SESSION_COMPLETED")
	ErrPhaseNotSkippable = errors.New("PHASE_NOT_SKIPPABLE")
	ErrSessionNotFound   = errors.New("SESSION_NOT_FOUND")
)

// Valid phase transitions
var validTransitions = map[model.Phase][]model.Phase{
	model.PhaseIntro:       {model.PhaseDeviceCheck},
	model.PhaseDeviceCheck: {model.PhaseCountdown},
	model.PhaseCountdown:   {model.PhaseRelaxation},
	model.PhaseRelaxation:  {model.PhaseRoutine},
	model.PhaseRoutine:     {model.PhaseStress},
	model.PhaseStress:      {model.PhaseComplete},
}

type SessionService struct {
	sessions  store.SessionStore
	events    store.EventStore
	stimuli   store.StimulusStore
	generator *StimulusGenerator
}

func NewSessionService(
	sessions store.SessionStore,
	events store.EventStore,
	stimuli store.StimulusStore,
	generator *StimulusGenerator,
) *SessionService {
	return &SessionService{
		sessions:  sessions,
		events:    events,
		stimuli:   stimuli,
		generator: generator,
	}
}

func (s *SessionService) CreateSession(ctx context.Context, participantID uuid.UUID, cfg model.SessionConfig) (*model.Session, error) {
	sess, err := s.sessions.Create(ctx, participantID, cfg)
	if err != nil {
		return nil, err
	}

	// Generate stimuli for the session
	problems := s.generator.GenerateForSession(sess.ID, cfg)
	if err := s.stimuli.BulkCreate(ctx, problems); err != nil {
		return nil, fmt.Errorf("generate stimuli: %w", err)
	}

	sess.StimuliCount = len(problems)

	// Log session creation event
	s.events.Create(ctx, sess.ID, model.BatchEventItem{
		EventType:      "SESSION_CREATED",
		ClientTimeMs:   wib.TimeToUnixMs(wib.Now()),
		IdempotencyKey: uuid.New(),
		Payload: map[string]interface{}{
			"participant_id": participantID.String(),
			"config":         cfg,
		},
	})

	return sess, nil
}

func (s *SessionService) TransitionPhase(ctx context.Context, sessionID uuid.UUID, toPhase model.Phase, clientTimeMs int64) (*model.TransitionResponse, error) {
	sess, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Validate transition
	if !isValidTransition(sess.CurrentPhase, toPhase) {
		return nil, fmt.Errorf("invalid transition: %s → %s", sess.CurrentPhase, toPhase)
	}

	// Update session phase
	if toPhase == model.PhaseComplete {
		if err := s.sessions.Complete(ctx, sessionID); err != nil {
			return nil, err
		}
	} else {
		if err := s.sessions.UpdatePhase(ctx, sessionID, toPhase, model.SessionRunning); err != nil {
			return nil, err
		}
	}

	// Log transition event
	serverTime := wib.Now()
	s.events.Create(ctx, sessionID, model.BatchEventItem{
		EventType:      "PHASE_TRANSITION",
		ClientTimeMs:   clientTimeMs,
		IdempotencyKey: uuid.New(),
		Payload: map[string]interface{}{
			"from_phase": string(sess.CurrentPhase),
			"to_phase":   string(toPhase),
		},
	})

	// Calculate phase end time
	var durationMs int
	switch toPhase {
	case model.PhaseRelaxation:
		durationMs = sess.Config.RelaxationDurationMs
	case model.PhaseStress:
		durationMs = sess.Config.StressDurationMs
	case model.PhaseCountdown:
		durationMs = 5000 // 5-second countdown
	}

	endsAt := serverTime.Add(time.Duration(durationMs) * time.Millisecond)

	return &model.TransitionResponse{
		Phase:        toPhase,
		StartedAtWIB: wib.FormatISO(serverTime),
		EndsAtWIB:    wib.FormatISO(endsAt),
	}, nil
}

func (s *SessionService) GetSession(ctx context.Context, sessionID uuid.UUID) (*model.Session, error) {
	return s.sessions.GetByID(ctx, sessionID)
}

func (s *SessionService) Heartbeat(ctx context.Context, sessionID uuid.UUID) error {
	return s.sessions.UpdateHeartbeat(ctx, sessionID)
}

func (s *SessionService) GetStimuli(ctx context.Context, sessionID uuid.UUID) ([]model.Stimulus, error) {
	return s.stimuli.ListBySession(ctx, sessionID)
}

// LogEvent creates a single event via the injected event store.
// Used by handlers that need to log events without direct store access.
func (s *SessionService) LogEvent(ctx context.Context, sessionID uuid.UUID, item model.BatchEventItem) (*model.Event, bool, error) {
	return s.events.Create(ctx, sessionID, item)
}

func (s *SessionService) PauseSession(ctx context.Context, sessionID uuid.UUID) error {
	return s.sessions.UpdateStatus(ctx, sessionID, model.SessionPaused)
}

func (s *SessionService) ResumeSession(ctx context.Context, sessionID uuid.UUID) error {
	return s.sessions.UpdateStatus(ctx, sessionID, model.SessionRunning)
}

// Phases that can be skipped via dev controls
var skippablePhases = map[model.Phase]bool{
	model.PhaseRelaxation: true,
	model.PhaseRoutine:    true,
	model.PhaseStress:     true,
}

// SkipPhase ends the current phase immediately and transitions to the next phase.
// Only allowed for skippable phases (RELAXATION, STRESS).
func (s *SessionService) SkipPhase(ctx context.Context, sessionID uuid.UUID, currentPhase model.Phase, clientTimeMs int64, idempotencyKey uuid.UUID) (*model.SkipResponse, error) {
	// Validate phase is skippable
	if !skippablePhases[currentPhase] {
		return nil, fmt.Errorf("%w: phase %s is not skippable", ErrPhaseNotSkippable, currentPhase)
	}

	sess, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrSessionNotFound, err)
	}

	// Validate session is in the expected phase
	if sess.CurrentPhase != currentPhase {
		return nil, fmt.Errorf("%w: session is in %s, not %s", ErrPhaseMismatch, sess.CurrentPhase, currentPhase)
	}

	// Validate session is not completed
	if sess.Status == model.SessionCompleted {
		return nil, fmt.Errorf("%w: session is already completed", ErrSessionCompleted)
	}

	// Get next phase
	nextPhase := getNextPhase(currentPhase)
	if nextPhase == "" {
		return nil, fmt.Errorf("no next phase after %s", currentPhase)
	}

	serverTime := wib.Now()

	// Log PHASE_TRANSITION with end_reason: manual_skip
	s.events.Create(ctx, sessionID, model.BatchEventItem{
		EventType:      "PHASE_TRANSITION",
		ClientTimeMs:   clientTimeMs,
		IdempotencyKey: idempotencyKey,
		Payload: map[string]interface{}{
			"from_phase": string(currentPhase),
			"to_phase":   string(nextPhase),
			"end_reason": "manual_skip",
		},
	})

	// Update session phase
	if nextPhase == model.PhaseComplete {
		if err := s.sessions.Complete(ctx, sessionID); err != nil {
			return nil, err
		}
	} else {
		if err := s.sessions.UpdatePhase(ctx, sessionID, nextPhase, model.SessionRunning); err != nil {
			return nil, err
		}
	}

	return &model.SkipResponse{
		FromPhase:       currentPhase,
		ToPhase:         nextPhase,
		EndReason:       "manual_skip",
		TransitionedWIB: wib.FormatISO(serverTime),
	}, nil
}

// getNextPhase returns the single valid next phase, or empty if none.
func getNextPhase(from model.Phase) model.Phase {
	targets := validTransitions[from]
	if len(targets) == 1 {
		return targets[0]
	}
	return ""
}

func isValidTransition(from, to model.Phase) bool {
	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}
	for _, p := range allowed {
		if p == to {
			return true
		}
	}
	return false
}
