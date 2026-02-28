// ============================================================
// SessionStore — Data access for sessions table
// ============================================================
package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/experiment-controller/backend/internal/model"
)

type SessionStore struct {
	db *pgxpool.Pool
}

func NewSessionStore(db *pgxpool.Pool) *SessionStore {
	return &SessionStore{db: db}
}

func (s *SessionStore) Create(ctx context.Context, participantID uuid.UUID, cfg model.SessionConfig) (*model.Session, error) {
	id := uuid.New()
	configJSON, _ := json.Marshal(cfg)

	var sess model.Session
	var configBytes []byte
	err := s.db.QueryRow(ctx,
		`INSERT INTO sessions (id, participant_id, config)
		 VALUES ($1, $2, $3)
		 RETURNING id, participant_id, status, current_phase, config, started_at, completed_at, created_at, updated_at`,
		id, participantID, configJSON,
	).Scan(&sess.ID, &sess.ParticipantID, &sess.Status, &sess.CurrentPhase, &configBytes,
		&sess.StartedAt, &sess.CompletedAt, &sess.CreatedAt, &sess.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}
	json.Unmarshal(configBytes, &sess.Config)
	return &sess, nil
}

func (s *SessionStore) GetByID(ctx context.Context, id uuid.UUID) (*model.Session, error) {
	var sess model.Session
	var configBytes []byte
	err := s.db.QueryRow(ctx,
		`SELECT id, participant_id, status, current_phase, config, started_at, completed_at, created_at, updated_at
		 FROM sessions WHERE id = $1`,
		id,
	).Scan(&sess.ID, &sess.ParticipantID, &sess.Status, &sess.CurrentPhase, &configBytes,
		&sess.StartedAt, &sess.CompletedAt, &sess.CreatedAt, &sess.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	json.Unmarshal(configBytes, &sess.Config)
	return &sess, nil
}

func (s *SessionStore) UpdatePhase(ctx context.Context, id uuid.UUID, phase model.Phase, status model.SessionStatus) error {
	_, err := s.db.Exec(ctx,
		`UPDATE sessions SET current_phase = $2, status = $3, updated_at = NOW()
		 WHERE id = $1`,
		id, phase, status,
	)
	return err
}

func (s *SessionStore) UpdateStatus(ctx context.Context, id uuid.UUID, status model.SessionStatus) error {
	_, err := s.db.Exec(ctx,
		`UPDATE sessions SET status = $2, updated_at = NOW() WHERE id = $1`,
		id, status,
	)
	return err
}

func (s *SessionStore) Complete(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE sessions SET status = 'COMPLETED', current_phase = 'COMPLETE', completed_at = $2, updated_at = $2
		 WHERE id = $1`,
		id, now,
	)
	return err
}

func (s *SessionStore) ListAll(ctx context.Context) ([]model.Session, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, participant_id, status, current_phase, config, started_at, completed_at, created_at, updated_at
		 FROM sessions ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []model.Session
	for rows.Next() {
		var sess model.Session
		var configBytes []byte
		if err := rows.Scan(&sess.ID, &sess.ParticipantID, &sess.Status, &sess.CurrentPhase, &configBytes,
			&sess.StartedAt, &sess.CompletedAt, &sess.CreatedAt, &sess.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(configBytes, &sess.Config)
		sessions = append(sessions, sess)
	}
	return sessions, nil
}

func (s *SessionStore) ListByParticipant(ctx context.Context, participantID uuid.UUID) ([]model.Session, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, participant_id, status, current_phase, config, started_at, completed_at, created_at, updated_at
		 FROM sessions WHERE participant_id = $1 ORDER BY created_at DESC`,
		participantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list sessions by participant: %w", err)
	}
	defer rows.Close()

	var sessions []model.Session
	for rows.Next() {
		var sess model.Session
		var configBytes []byte
		if err := rows.Scan(&sess.ID, &sess.ParticipantID, &sess.Status, &sess.CurrentPhase, &configBytes,
			&sess.StartedAt, &sess.CompletedAt, &sess.CreatedAt, &sess.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(configBytes, &sess.Config)
		sessions = append(sessions, sess)
	}
	return sessions, nil
}

func (s *SessionStore) UpdateHeartbeat(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.Exec(ctx,
		`UPDATE sessions SET updated_at = NOW() WHERE id = $1`, id)
	return err
}
