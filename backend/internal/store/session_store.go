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
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/experiment-controller/backend/internal/model"
)

type sessionStoreImpl struct {
	db *pgxpool.Pool
}

// DB returns the underlying database pool for direct queries.
func (s *sessionStoreImpl) DB() *pgxpool.Pool {
	return s.db
}

func NewSessionStore(db *pgxpool.Pool) SessionStore {
	return &sessionStoreImpl{db: db}
}

// sessionColumns is the standard column list for all session queries.
const sessionColumns = `id, participant_id, status, current_phase, config, started_at, completed_at, created_at, updated_at`

// scanSession scans a single row into a Session model, handling JSON config deserialization.
func scanSession(row pgx.Row) (*model.Session, error) {
	var sess model.Session
	var configBytes []byte
	err := row.Scan(
		&sess.ID, &sess.ParticipantID, &sess.Status, &sess.CurrentPhase, &configBytes,
		&sess.StartedAt, &sess.CompletedAt, &sess.CreatedAt, &sess.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(configBytes, &sess.Config)
	return &sess, nil
}

// scanSessionRows scans multiple rows into a slice of Sessions.
func scanSessionRows(rows pgx.Rows) ([]model.Session, error) {
	var sessions []model.Session
	for rows.Next() {
		var sess model.Session
		var configBytes []byte
		if err := rows.Scan(
			&sess.ID, &sess.ParticipantID, &sess.Status, &sess.CurrentPhase, &configBytes,
			&sess.StartedAt, &sess.CompletedAt, &sess.CreatedAt, &sess.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(configBytes, &sess.Config)
		sessions = append(sessions, sess)
	}
	return sessions, rows.Err()
}

func (s *sessionStoreImpl) Create(ctx context.Context, participantID uuid.UUID, cfg model.SessionConfig) (*model.Session, error) {
	id := uuid.New()
	configJSON, _ := json.Marshal(cfg)

	row := s.db.QueryRow(ctx,
		`INSERT INTO sessions (id, participant_id, config)
		 VALUES ($1, $2, $3)
		 RETURNING `+sessionColumns,
		id, participantID, configJSON,
	)
	sess, err := scanSession(row)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}
	return sess, nil
}

func (s *sessionStoreImpl) GetByID(ctx context.Context, id uuid.UUID) (*model.Session, error) {
	row := s.db.QueryRow(ctx,
		`SELECT `+sessionColumns+` FROM sessions WHERE id = $1`, id,
	)
	sess, err := scanSession(row)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	return sess, nil
}

func (s *sessionStoreImpl) UpdatePhase(ctx context.Context, id uuid.UUID, phase model.Phase, status model.SessionStatus) error {
	_, err := s.db.Exec(ctx,
		`UPDATE sessions SET current_phase = $2, status = $3, updated_at = NOW()
		 WHERE id = $1`,
		id, phase, status,
	)
	return err
}

func (s *sessionStoreImpl) UpdateStatus(ctx context.Context, id uuid.UUID, status model.SessionStatus) error {
	_, err := s.db.Exec(ctx,
		`UPDATE sessions SET status = $2, updated_at = NOW() WHERE id = $1`,
		id, status,
	)
	return err
}

func (s *sessionStoreImpl) Complete(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	_, err := s.db.Exec(ctx,
		`UPDATE sessions SET status = 'COMPLETED', current_phase = 'COMPLETE', completed_at = $2, updated_at = $2
		 WHERE id = $1`,
		id, now,
	)
	return err
}

func (s *sessionStoreImpl) ListAll(ctx context.Context) ([]model.Session, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+sessionColumns+` FROM sessions ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()
	return scanSessionRows(rows)
}

func (s *sessionStoreImpl) ListByParticipant(ctx context.Context, participantID uuid.UUID) ([]model.Session, error) {
	rows, err := s.db.Query(ctx,
		`SELECT `+sessionColumns+` FROM sessions WHERE participant_id = $1 ORDER BY created_at DESC`,
		participantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list sessions by participant: %w", err)
	}
	defer rows.Close()
	return scanSessionRows(rows)
}

func (s *sessionStoreImpl) UpdateHeartbeat(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.Exec(ctx,
		`UPDATE sessions SET updated_at = NOW() WHERE id = $1`, id)
	return err
}

