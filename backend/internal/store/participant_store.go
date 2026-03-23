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
