// ============================================================
// EventStore — Data access for events table
// ============================================================
package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/experiment-controller/backend/internal/model"
	"github.com/experiment-controller/backend/internal/wib"
)

type EventStore struct {
	db *pgxpool.Pool
}

func NewEventStore(db *pgxpool.Pool) *EventStore {
	return &EventStore{db: db}
}

func (s *EventStore) Create(ctx context.Context, sessionID uuid.UUID, item model.BatchEventItem) (*model.Event, bool, error) {
	serverTime := wib.Now()
	offset := wib.ComputeOffset(serverTime, item.ClientTimeMs)

	var event model.Event
	err := s.db.QueryRow(ctx,
		`INSERT INTO events (id, session_id, event_type, server_time, client_time_ms, client_offset_ms, idempotency_key, payload)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (idempotency_key) DO NOTHING
		 RETURNING id, session_id, event_type, server_time, client_time_ms, client_offset_ms, idempotency_key, payload, created_at`,
		uuid.New(), sessionID, item.EventType, serverTime, item.ClientTimeMs, offset, item.IdempotencyKey, item.Payload,
	).Scan(&event.ID, &event.SessionID, &event.EventType, &event.ServerTime,
		&event.ClientTimeMs, &event.ClientOffsetMs, &event.IdempotencyKey, &event.Payload, &event.CreatedAt)

	if err != nil {
		// Check if it was a duplicate (ON CONFLICT DO NOTHING returns no rows)
		if err.Error() == "no rows in result set" {
			return nil, true, nil // duplicate
		}
		return nil, false, fmt.Errorf("create event: %w", err)
	}
	return &event, false, nil
}

func (s *EventStore) BatchCreate(ctx context.Context, sessionID uuid.UUID, items []model.BatchEventItem) (accepted, duplicates int, err error) {
	for _, item := range items {
		_, isDup, e := s.Create(ctx, sessionID, item)
		if e != nil {
			return accepted, duplicates, e
		}
		if isDup {
			duplicates++
		} else {
			accepted++
		}
	}
	return accepted, duplicates, nil
}

func (s *EventStore) ListBySession(ctx context.Context, sessionID uuid.UUID) ([]model.Event, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, session_id, event_type, server_time, client_time_ms, client_offset_ms, idempotency_key, payload, created_at
		 FROM events WHERE session_id = $1 ORDER BY server_time ASC`,
		sessionID,
	)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	defer rows.Close()

	var events []model.Event
	for rows.Next() {
		var e model.Event
		if err := rows.Scan(&e.ID, &e.SessionID, &e.EventType, &e.ServerTime,
			&e.ClientTimeMs, &e.ClientOffsetMs, &e.IdempotencyKey, &e.Payload, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

// ListAll returns all events across all sessions ordered by server_time.
func (s *EventStore) ListAll(ctx context.Context) ([]model.Event, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, session_id, event_type, server_time, client_time_ms, client_offset_ms, idempotency_key, payload, created_at
		 FROM events ORDER BY server_time ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list all events: %w", err)
	}
	defer rows.Close()

	var events []model.Event
	for rows.Next() {
		var e model.Event
		if err := rows.Scan(&e.ID, &e.SessionID, &e.EventType, &e.ServerTime,
			&e.ClientTimeMs, &e.ClientOffsetMs, &e.IdempotencyKey, &e.Payload, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

func (s *EventStore) GetPhaseTimestamps(ctx context.Context, sessionID uuid.UUID) (map[string]string, error) {
	rows, err := s.db.Query(ctx,
		`SELECT event_type, server_time, payload
		 FROM events
		 WHERE session_id = $1 AND event_type = 'PHASE_TRANSITION'
		 ORDER BY server_time ASC`,
		sessionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	timestamps := make(map[string]string)
	for rows.Next() {
		var e model.Event
		if err := rows.Scan(&e.EventType, &e.ServerTime, &e.Payload); err != nil {
			return nil, err
		}
		if toPhase, ok := e.Payload["to_phase"].(string); ok {
			timestamps[toPhase+"_START"] = wib.FormatISO(e.ServerTime)
		}
		if fromPhase, ok := e.Payload["from_phase"].(string); ok {
			timestamps[fromPhase+"_END"] = wib.FormatISO(e.ServerTime)
		}
	}
	return timestamps, nil
}
