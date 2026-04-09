package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/experiment-controller/backend/internal/model"
)

type SessionStore interface {
	DB() *pgxpool.Pool
	Create(ctx context.Context, participantID uuid.UUID, cfg model.SessionConfig) (*model.Session, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Session, error)
	UpdatePhase(ctx context.Context, id uuid.UUID, phase model.Phase, status model.SessionStatus) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status model.SessionStatus) error
	Complete(ctx context.Context, id uuid.UUID) error
	ListAll(ctx context.Context) ([]model.Session, error)
	ListByParticipant(ctx context.Context, participantID uuid.UUID) ([]model.Session, error)
	UpdateHeartbeat(ctx context.Context, id uuid.UUID) error
}

type ParticipantStore interface {
	Create(ctx context.Context, req model.CreateParticipantRequest) (*model.Participant, error)
	GetByCode(ctx context.Context, code string) (*model.Participant, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Participant, error)
	DeleteByCode(ctx context.Context, code string) error
}


type EventStore interface {
	Create(ctx context.Context, sessionID uuid.UUID, item model.BatchEventItem) (*model.Event, bool, error)
	BatchCreate(ctx context.Context, sessionID uuid.UUID, items []model.BatchEventItem) (accepted, duplicates int, err error)
	ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.Event, error)
	ListAll(ctx context.Context) ([]model.Event, error)
	GetPhaseTimestamps(ctx context.Context, sessionID uuid.UUID) (map[string]string, error)
}

type StimulusStore interface {
	BulkCreate(ctx context.Context, stimuli []model.Stimulus) error
	ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.Stimulus, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Stimulus, error)
	CountBySession(ctx context.Context, sessionID uuid.UUID) (int, error)
}

type NoteStore interface {
	Create(ctx context.Context, sessionID uuid.UUID, content string) (*model.ResearcherNote, error)
	ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.ResearcherNote, error)
}
