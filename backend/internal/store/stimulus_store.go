// ============================================================
// StimulusStore — Data access for stimuli table
// ============================================================
package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/experiment-controller/backend/internal/model"
)

type stimulusStoreImpl struct {
	db *pgxpool.Pool
}

func NewStimulusStore(db *pgxpool.Pool) StimulusStore {
	return &stimulusStoreImpl{db: db}
}

func (s *stimulusStoreImpl) BulkCreate(ctx context.Context, stimuli []model.Stimulus) error {
	for _, st := range stimuli {
		_, err := s.db.Exec(ctx,
			`INSERT INTO stimuli (id, session_id, sequence_nr, problem_text, correct_answer, difficulty)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			st.ID, st.SessionID, st.SequenceNr, st.ProblemText, st.CorrectAnswer, st.Difficulty,
		)
		if err != nil {
			return fmt.Errorf("create stimulus %d: %w", st.SequenceNr, err)
		}
	}
	return nil
}

func (s *stimulusStoreImpl) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.Stimulus, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, session_id, sequence_nr, problem_text, correct_answer, difficulty, created_at
		 FROM stimuli WHERE session_id = $1 ORDER BY sequence_nr ASC`,
		sessionID,
	)
	if err != nil {
		return nil, fmt.Errorf("list stimuli: %w", err)
	}
	defer rows.Close()

	var stimuli []model.Stimulus
	for rows.Next() {
		var st model.Stimulus
		if err := rows.Scan(&st.ID, &st.SessionID, &st.SequenceNr, &st.ProblemText, &st.CorrectAnswer, &st.Difficulty, &st.CreatedAt); err != nil {
			return nil, err
		}
		stimuli = append(stimuli, st)
	}
	return stimuli, nil
}

func (s *stimulusStoreImpl) GetByID(ctx context.Context, id uuid.UUID) (*model.Stimulus, error) {
	var st model.Stimulus
	err := s.db.QueryRow(ctx,
		`SELECT id, session_id, sequence_nr, problem_text, correct_answer, difficulty, created_at
		 FROM stimuli WHERE id = $1`,
		id,
	).Scan(&st.ID, &st.SessionID, &st.SequenceNr, &st.ProblemText, &st.CorrectAnswer, &st.Difficulty, &st.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get stimulus: %w", err)
	}
	return &st, nil
}

func (s *stimulusStoreImpl) CountBySession(ctx context.Context, sessionID uuid.UUID) (int, error) {
	var count int
	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM stimuli WHERE session_id = $1`, sessionID,
	).Scan(&count)
	return count, err
}
