package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/mock"

	"github.com/experiment-controller/backend/internal/model"
)

// ---- ParticipantStore Mock ----

type MockParticipantStore struct {
	mock.Mock
}

func (m *MockParticipantStore) Create(ctx context.Context, req model.CreateParticipantRequest) (*model.Participant, error) {
	args := m.Called(ctx, req)
	if args.Get(0) != nil {
		return args.Get(0).(*model.Participant), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockParticipantStore) GetByCode(ctx context.Context, code string) (*model.Participant, error) {
	args := m.Called(ctx, code)
	if args.Get(0) != nil {
		return args.Get(0).(*model.Participant), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockParticipantStore) GetByID(ctx context.Context, id uuid.UUID) (*model.Participant, error) {
	args := m.Called(ctx, id)
	if args.Get(0) != nil {
		return args.Get(0).(*model.Participant), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockParticipantStore) DeleteByCode(ctx context.Context, code string) error {
	args := m.Called(ctx, code)
	return args.Error(0)
}

// ---- SessionStore Mock ----

type MockSessionStore struct {
	mock.Mock
}

func (m *MockSessionStore) Create(ctx context.Context, participantID uuid.UUID, cfg model.SessionConfig) (*model.Session, error) {
	args := m.Called(ctx, participantID, cfg)
	if args.Get(0) != nil {
		return args.Get(0).(*model.Session), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockSessionStore) GetByID(ctx context.Context, id uuid.UUID) (*model.Session, error) {
	args := m.Called(ctx, id)
	if args.Get(0) != nil {
		return args.Get(0).(*model.Session), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockSessionStore) UpdatePhase(ctx context.Context, id uuid.UUID, phase model.Phase, status model.SessionStatus) error {
	args := m.Called(ctx, id, phase, status)
	return args.Error(0)
}

func (m *MockSessionStore) UpdateStatus(ctx context.Context, id uuid.UUID, status model.SessionStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockSessionStore) Complete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockSessionStore) ListAll(ctx context.Context) ([]model.Session, error) {
	args := m.Called(ctx)
	if args.Get(0) != nil {
		return args.Get(0).([]model.Session), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockSessionStore) ListByParticipant(ctx context.Context, participantID uuid.UUID) ([]model.Session, error) {
	args := m.Called(ctx, participantID)
	if args.Get(0) != nil {
		return args.Get(0).([]model.Session), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockSessionStore) UpdateHeartbeat(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockSessionStore) DB() *pgxpool.Pool {
	args := m.Called()
	if args.Get(0) != nil {
		return args.Get(0).(*pgxpool.Pool)
	}
	return nil
}

// ---- EventStore Mock ----

type MockEventStore struct {
	mock.Mock
}

func (m *MockEventStore) Create(ctx context.Context, sessionID uuid.UUID, item model.BatchEventItem) (*model.Event, bool, error) {
	args := m.Called(ctx, sessionID, item)
	var ev *model.Event
	if args.Get(0) != nil {
		ev = args.Get(0).(*model.Event)
	}
	return ev, args.Bool(1), args.Error(2)
}

func (m *MockEventStore) BatchCreate(ctx context.Context, sessionID uuid.UUID, items []model.BatchEventItem) (int, int, error) {
	args := m.Called(ctx, sessionID, items)
	return args.Int(0), args.Int(1), args.Error(2)
}

func (m *MockEventStore) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.Event, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) != nil {
		return args.Get(0).([]model.Event), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockEventStore) ListAll(ctx context.Context) ([]model.Event, error) {
	args := m.Called(ctx)
	if args.Get(0) != nil {
		return args.Get(0).([]model.Event), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockEventStore) GetPhaseTimestamps(ctx context.Context, sessionID uuid.UUID) (map[string]string, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) != nil {
		return args.Get(0).(map[string]string), args.Error(1)
	}
	return nil, args.Error(1)
}

// ---- StimulusStore Mock ----

type MockStimulusStore struct {
	mock.Mock
}

func (m *MockStimulusStore) BulkCreate(ctx context.Context, stimuli []model.Stimulus) error {
	args := m.Called(ctx, stimuli)
	return args.Error(0)
}

func (m *MockStimulusStore) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.Stimulus, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) != nil {
		return args.Get(0).([]model.Stimulus), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockStimulusStore) GetByID(ctx context.Context, id uuid.UUID) (*model.Stimulus, error) {
	args := m.Called(ctx, id)
	if args.Get(0) != nil {
		return args.Get(0).(*model.Stimulus), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockStimulusStore) CountBySession(ctx context.Context, sessionID uuid.UUID) (int, error) {
	args := m.Called(ctx, sessionID)
	return args.Int(0), args.Error(1)
}

// ---- NoteStore Mock ----

type MockNoteStore struct {
	mock.Mock
}

func (m *MockNoteStore) Create(ctx context.Context, sessionID uuid.UUID, content string) (*model.ResearcherNote, error) {
	args := m.Called(ctx, sessionID, content)
	if args.Get(0) != nil {
		return args.Get(0).(*model.ResearcherNote), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *MockNoteStore) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.ResearcherNote, error) {
	args := m.Called(ctx, sessionID)
	if args.Get(0) != nil {
		return args.Get(0).([]model.ResearcherNote), args.Error(1)
	}
	return nil, args.Error(1)
}
