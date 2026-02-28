// ============================================================
// NoteStore — CRUD for researcher notes
// ============================================================
package store

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/experiment-controller/backend/internal/model"
	"github.com/experiment-controller/backend/internal/wib"
)

type NoteStore struct {
	db *pgxpool.Pool
}

func NewNoteStore(db *pgxpool.Pool) *NoteStore {
	return &NoteStore{db: db}
}

// Create inserts a researcher note and returns the created note.
func (s *NoteStore) Create(ctx context.Context, sessionID uuid.UUID, content string) (*model.ResearcherNote, error) {
	id := uuid.New()
	now := time.Now()
	charLen := len([]rune(content))

	_, err := s.db.Exec(ctx,
		`INSERT INTO researcher_notes (id, session_id, content, char_length, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		id, sessionID, content, charLen, now,
	)
	if err != nil {
		return nil, fmt.Errorf("create note: %w", err)
	}

	return &model.ResearcherNote{
		ID:         id,
		SessionID:  sessionID,
		CharLength: charLen,
		CreatedAt:  wib.FormatISO(now),
	}, nil
}

// ListBySession returns all notes for a session (metadata only, no content).
func (s *NoteStore) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.ResearcherNote, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, session_id, char_length, created_at
		 FROM researcher_notes
		 WHERE session_id = $1
		 ORDER BY created_at ASC`,
		sessionID,
	)
	if err != nil {
		return nil, fmt.Errorf("list notes: %w", err)
	}
	defer rows.Close()

	var notes []model.ResearcherNote
	for rows.Next() {
		var n model.ResearcherNote
		var createdAt time.Time
		if err := rows.Scan(&n.ID, &n.SessionID, &n.CharLength, &createdAt); err != nil {
			return nil, err
		}
		n.CreatedAt = wib.FormatISO(createdAt)
		notes = append(notes, n)
	}
	return notes, rows.Err()
}
