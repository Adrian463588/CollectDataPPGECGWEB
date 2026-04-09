// ============================================================
// ParticipantStore — Data access for participants table
// ============================================================
package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/experiment-controller/backend/internal/model"
)

type participantStoreImpl struct {
	db *pgxpool.Pool
}

func NewParticipantStore(db *pgxpool.Pool) ParticipantStore {
	return &participantStoreImpl{db: db}
}

func (s *participantStoreImpl) Create(ctx context.Context, req model.CreateParticipantRequest) (*model.Participant, error) {
	id := uuid.New()
	metadata, _ := json.Marshal(req.Metadata)
	if req.Metadata == nil {
		metadata = []byte("{}")
	}

	var p model.Participant
	err := s.db.QueryRow(ctx,
		`INSERT INTO participants (id, code, metadata) VALUES ($1, $2, $3)
		 RETURNING id, code, created_at, metadata`,
		id, req.Code, metadata,
	).Scan(&p.ID, &p.Code, &p.CreatedAt, &p.Metadata)
	if err != nil {
		return nil, fmt.Errorf("create participant: %w", err)
	}
	return &p, nil
}

func (s *participantStoreImpl) GetByCode(ctx context.Context, code string) (*model.Participant, error) {
	var p model.Participant
	err := s.db.QueryRow(ctx,
		`SELECT id, code, created_at, metadata FROM participants WHERE code = $1`,
		code,
	).Scan(&p.ID, &p.Code, &p.CreatedAt, &p.Metadata)
	if err != nil {
		return nil, fmt.Errorf("get participant by code: %w", err)
	}
	return &p, nil
}

func (s *participantStoreImpl) GetByID(ctx context.Context, id uuid.UUID) (*model.Participant, error) {
	var p model.Participant
	err := s.db.QueryRow(ctx,
		`SELECT id, code, created_at, metadata FROM participants WHERE id = $1`,
		id,
	).Scan(&p.ID, &p.Code, &p.CreatedAt, &p.Metadata)
	if err != nil {
		return nil, fmt.Errorf("get participant by id: %w", err)
	}
	return &p, nil
}

// DeleteByCode removes all data for a participant in cascade order:
// responses → stimuli → events → researcher_notes → sessions → participant.
// This is intended for researcher use when a data collection run is invalid.
// NOTE: Uses individual parameterized queries — DO $$ blocks cannot use $1 bind params.
func (s *participantStoreImpl) DeleteByCode(ctx context.Context, code string) error {
	// First verify the participant exists and grab their ID
	var pid uuid.UUID
	err := s.db.QueryRow(ctx,
		`SELECT id FROM participants WHERE code = $1`, code,
	).Scan(&pid)
	if err != nil {
		return fmt.Errorf("participant not found: %w", err)
	}

	// Delete child rows in foreign-key order inside a transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	steps := []string{
		// responses references both sessions AND stimuli → must go first
		`DELETE FROM responses WHERE session_id IN (SELECT id FROM sessions WHERE participant_id = $1)`,
		// stimuli references sessions
		`DELETE FROM stimuli WHERE session_id IN (SELECT id FROM sessions WHERE participant_id = $1)`,
		// events references sessions
		`DELETE FROM events WHERE session_id IN (SELECT id FROM sessions WHERE participant_id = $1)`,
		// researcher_notes references sessions
		`DELETE FROM researcher_notes WHERE session_id IN (SELECT id FROM sessions WHERE participant_id = $1)`,
		// sessions references participant
		`DELETE FROM sessions WHERE participant_id = $1`,
		// finally the participant itself
		`DELETE FROM participants WHERE id = $1`,
	}

	for _, q := range steps {
		if _, err := tx.Exec(ctx, q, pid); err != nil {
			return fmt.Errorf("delete step failed (%s): %w", q[:40], err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit delete transaction: %w", err)
	}
	return nil
}


