// ============================================================
// Models — Domain types
// ============================================================
package model

import (
	"time"

	"github.com/google/uuid"
)

// ---- Participant ----

type Participant struct {
	ID        uuid.UUID              `json:"id"`
	Code      string                 `json:"code"`
	CreatedAt time.Time              `json:"created_at"`
	Metadata  map[string]interface{} `json:"metadata"`
}

// ---- Session ----

type SessionStatus string

const (
	SessionCreated   SessionStatus = "CREATED"
	SessionRunning   SessionStatus = "RUNNING"
	SessionPaused    SessionStatus = "PAUSED"
	SessionCompleted SessionStatus = "COMPLETED"
	SessionAborted   SessionStatus = "ABORTED"
	SessionStale     SessionStatus = "STALE"
)

type Phase string

const (
	PhaseIntro       Phase = "INTRO"
	PhaseDeviceCheck Phase = "DEVICE_CHECK"
	PhaseCountdown   Phase = "COUNTDOWN"
	PhaseRelaxation  Phase = "RELAXATION"
	PhaseStress      Phase = "STRESS"
	PhaseComplete    Phase = "COMPLETE"
)

type BreathingConfig struct {
	InhaleMs         int `json:"inhale_ms"`
	HoldAfterInhaleMs int `json:"hold_after_inhale_ms"`
	ExhaleMs         int `json:"exhale_ms"`
	HoldAfterExhaleMs int `json:"hold_after_exhale_ms"`
}

type SessionConfig struct {
	RelaxationDurationMs int             `json:"relaxation_duration_ms"`
	StressDurationMs     int             `json:"stress_duration_ms"`
	QuestionTimeoutMs    int             `json:"question_timeout_ms"`
	Difficulty           string          `json:"difficulty"`
	AudioEnabled         bool            `json:"audio_enabled"`
	ScoreVisible         bool            `json:"score_visible"`
	BreathingConfig      BreathingConfig `json:"breathing_config"`
}

type Session struct {
	ID            uuid.UUID     `json:"id"`
	ParticipantID uuid.UUID     `json:"participant_id"`
	Status        SessionStatus `json:"status"`
	CurrentPhase  Phase         `json:"current_phase"`
	Config        SessionConfig `json:"config"`
	StimuliCount  int           `json:"stimuli_count,omitempty"`
	StartedAt     *time.Time    `json:"started_at,omitempty"`
	CompletedAt   *time.Time    `json:"completed_at,omitempty"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type SessionState struct {
	ID                   uuid.UUID     `json:"id"`
	Status               SessionStatus `json:"status"`
	CurrentPhase         Phase         `json:"current_phase"`
	PhaseStartedAtWIB    string        `json:"phase_started_at_wib"`
	PhaseEndsAtWIB       string        `json:"phase_ends_at_wib"`
	ElapsedMs            int64         `json:"elapsed_ms"`
	Config               SessionConfig `json:"config"`
	CurrentStimulusIndex *int          `json:"current_stimulus_index,omitempty"`
}

// ---- Event ----

type Event struct {
	ID             uuid.UUID              `json:"id"`
	SessionID      uuid.UUID              `json:"session_id"`
	EventType      string                 `json:"event_type"`
	ServerTime     time.Time              `json:"server_time"`
	ClientTimeMs   *int64                 `json:"client_time_ms,omitempty"`
	ClientOffsetMs *int64                 `json:"client_offset_ms,omitempty"`
	IdempotencyKey uuid.UUID              `json:"idempotency_key"`
	Payload        map[string]interface{} `json:"payload"`
	CreatedAt      time.Time              `json:"created_at"`
}

// ---- Stimulus ----

type Stimulus struct {
	ID            uuid.UUID `json:"id"`
	SessionID     uuid.UUID `json:"session_id"`
	SequenceNr    int       `json:"sequence_nr"`
	ProblemText   string    `json:"problem_text"`
	CorrectAnswer int       `json:"correct_answer"`
	Difficulty    string    `json:"difficulty"`
	CreatedAt     time.Time `json:"created_at"`
}

// ---- Response ----

type Response struct {
	ID                uuid.UUID  `json:"id"`
	SessionID         uuid.UUID  `json:"session_id"`
	StimulusID        uuid.UUID  `json:"stimulus_id"`
	ParticipantAnswer *int       `json:"participant_answer,omitempty"`
	IsCorrect         bool       `json:"is_correct"`
	ReactionTimeMs    *int       `json:"reaction_time_ms,omitempty"`
	TimedOut          bool       `json:"timed_out"`
	ServerTime        time.Time  `json:"server_time"`
	CreatedAt         time.Time  `json:"created_at"`
}

// ---- API Request/Response ----

type CreateParticipantRequest struct {
	Code     string                 `json:"code"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type CreateSessionRequest struct {
	ParticipantCode string        `json:"participant_code"`
	Config          SessionConfig `json:"config"`
}

type TransitionRequest struct {
	ToPhase      Phase `json:"to_phase"`
	ClientTimeMs int64 `json:"client_time_ms"`
}

type TransitionResponse struct {
	Phase        Phase  `json:"phase"`
	StartedAtWIB string `json:"started_at_wib"`
	EndsAtWIB    string `json:"ends_at_wib"`
}

type HeartbeatRequest struct {
	SequenceNr   int   `json:"sequence_nr"`
	ClientTimeMs int64 `json:"client_time_ms"`
}

type HeartbeatResponse struct {
	ServerTimeWIB string `json:"server_time_wib"`
	Status        string `json:"status"`
}

type BatchEventItem struct {
	EventType      string                 `json:"event_type"`
	ClientTimeMs   int64                  `json:"client_time_ms"`
	IdempotencyKey uuid.UUID              `json:"idempotency_key"`
	Payload        map[string]interface{} `json:"payload"`
}

type BatchEventsRequest struct {
	Events []BatchEventItem `json:"events"`
}

type BatchEventsResponse struct {
	Accepted   int `json:"accepted"`
	Duplicates int `json:"duplicates"`
}

type SubmitResponseRequest struct {
	StimulusID        uuid.UUID `json:"stimulus_id"`
	ParticipantAnswer *int      `json:"participant_answer"`
	ReactionTimeMs    *int      `json:"reaction_time_ms"`
	ClientTimeMs      int64     `json:"client_time_ms"`
	IdempotencyKey    uuid.UUID `json:"idempotency_key"`
}

type SubmitResponseResult struct {
	ID        uuid.UUID `json:"id"`
	IsCorrect bool      `json:"is_correct"`
}

type APIError struct {
	Error struct {
		Code      string `json:"code"`
		Message   string `json:"message"`
		RequestID string `json:"request_id"`
	} `json:"error"`
}
