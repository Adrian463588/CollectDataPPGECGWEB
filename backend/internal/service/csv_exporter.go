// ============================================================
// CSVExporter — Generates CSV exports for sessions/events
// ============================================================
package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/experiment-controller/backend/internal/store"
	"github.com/experiment-controller/backend/internal/wib"
)

type CSVExporter struct {
	sessions     *store.SessionStore
	events       *store.EventStore
	participants *store.ParticipantStore
}

func NewCSVExporter(
	sessions *store.SessionStore,
	events *store.EventStore,
	participants *store.ParticipantStore,
) *CSVExporter {
	return &CSVExporter{
		sessions:     sessions,
		events:       events,
		participants: participants,
	}
}

// ExportSessionEvents writes all events for a session as CSV.
func (e *CSVExporter) ExportSessionEvents(ctx context.Context, w io.Writer, sessionID uuid.UUID) error {
	events, err := e.events.ListBySession(ctx, sessionID)
	if err != nil {
		return err
	}

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Header
	writer.Write([]string{
		"event_id", "event_type", "server_time_wib", "client_time_ms",
		"client_offset_ms", "idempotency_key", "payload_json",
	})

	for _, ev := range events {
		clientMs := ""
		if ev.ClientTimeMs != nil {
			clientMs = fmt.Sprintf("%d", *ev.ClientTimeMs)
		}
		offsetMs := ""
		if ev.ClientOffsetMs != nil {
			offsetMs = fmt.Sprintf("%d", *ev.ClientOffsetMs)
		}
		payloadStr := "{}"
		if ev.Payload != nil {
			payloadStr = fmt.Sprintf("%v", ev.Payload)
		}

		writer.Write([]string{
			ev.ID.String(),
			ev.EventType,
			wib.Format(ev.ServerTime),
			clientMs,
			offsetMs,
			ev.IdempotencyKey.String(),
			payloadStr,
		})
	}

	return writer.Error()
}

// ExportSessionSummary writes a single-row summary CSV for a session.
func (e *CSVExporter) ExportSessionSummary(ctx context.Context, w io.Writer, sessionID uuid.UUID) error {
	sess, err := e.sessions.GetByID(ctx, sessionID)
	if err != nil {
		return err
	}

	// Get participant code
	participant, err := e.participants.GetByID(ctx, sess.ParticipantID)
	if err != nil {
		return err
	}

	// Get phase timestamps
	timestamps, err := e.events.GetPhaseTimestamps(ctx, sessionID)
	if err != nil {
		return err
	}

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{
		"session_id", "participant_code", "status",
		"started_at_wib", "completed_at_wib",
		"relaxation_start_wib", "relaxation_end_wib",
		"stress_start_wib", "stress_end_wib",
	})

	startedAt := ""
	if sess.StartedAt != nil {
		startedAt = wib.FormatISO(*sess.StartedAt)
	}
	completedAt := ""
	if sess.CompletedAt != nil {
		completedAt = wib.FormatISO(*sess.CompletedAt)
	}

	writer.Write([]string{
		sess.ID.String(),
		participant.Code,
		string(sess.Status),
		startedAt,
		completedAt,
		timestamps["RELAXATION_START"],
		timestamps["RELAXATION_END"],
		timestamps["STRESS_START"],
		timestamps["STRESS_END"],
	})

	return writer.Error()
}

// ExportAllSessions writes summary rows for all sessions.
func (e *CSVExporter) ExportAllSessions(ctx context.Context, w io.Writer) error {
	sessions, err := e.sessions.ListAll(ctx)
	if err != nil {
		return err
	}

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{
		"session_id", "participant_id", "status", "current_phase",
		"started_at_wib", "completed_at_wib", "created_at_wib",
	})

	for _, sess := range sessions {
		startedAt := ""
		if sess.StartedAt != nil {
			startedAt = wib.FormatISO(*sess.StartedAt)
		}
		completedAt := ""
		if sess.CompletedAt != nil {
			completedAt = wib.FormatISO(*sess.CompletedAt)
		}

		writer.Write([]string{
			sess.ID.String(),
			sess.ParticipantID.String(),
			string(sess.Status),
			string(sess.CurrentPhase),
			startedAt,
			completedAt,
			wib.FormatISO(sess.CreatedAt),
		})
	}

	return writer.Error()
}

// ExportAllEvents writes all events across all sessions as CSV.
func (e *CSVExporter) ExportAllEvents(ctx context.Context, w io.Writer) error {
	events, err := e.events.ListAll(ctx)
	if err != nil {
		return err
	}

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{
		"session_id", "event_id", "event_type", "server_time_wib",
		"client_time_ms", "client_offset_ms", "idempotency_key", "payload_json",
	})

	for _, ev := range events {
		clientMs := ""
		if ev.ClientTimeMs != nil {
			clientMs = fmt.Sprintf("%d", *ev.ClientTimeMs)
		}
		offsetMs := ""
		if ev.ClientOffsetMs != nil {
			offsetMs = fmt.Sprintf("%d", *ev.ClientOffsetMs)
		}
		payloadStr := "{}"
		if ev.Payload != nil {
			payloadStr = fmt.Sprintf("%v", ev.Payload)
		}

		writer.Write([]string{
			ev.SessionID.String(),
			ev.ID.String(),
			ev.EventType,
			wib.Format(ev.ServerTime),
			clientMs,
			offsetMs,
			ev.IdempotencyKey.String(),
			payloadStr,
		})
	}

	return writer.Error()
}

// ExportParticipantSessions writes all sessions for a participant.
func (e *CSVExporter) ExportParticipantSessions(ctx context.Context, w io.Writer, participantCode string) error {
	participant, err := e.participants.GetByCode(ctx, participantCode)
	if err != nil {
		return err
	}

	sessions, err := e.sessions.ListByParticipant(ctx, participant.ID)
	if err != nil {
		return err
	}

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{
		"session_id", "participant_code", "status", "current_phase",
		"started_at_wib", "completed_at_wib", "created_at_wib",
	})

	for _, sess := range sessions {
		startedAt := ""
		if sess.StartedAt != nil {
			startedAt = wib.FormatISO(*sess.StartedAt)
		}
		completedAt := ""
		if sess.CompletedAt != nil {
			completedAt = wib.FormatISO(*sess.CompletedAt)
		}

		writer.Write([]string{
			sess.ID.String(),
			participant.Code,
			string(sess.Status),
			string(sess.CurrentPhase),
			startedAt,
			completedAt,
			wib.FormatISO(sess.CreatedAt),
		})
	}

	return writer.Error()
}

// ---- Phase Timeline Export (4-column: participant_code, phase, start_ts_ms, end_ts_ms) ----

// phaseDisplayName maps internal phase enums to client-facing display names.
var phaseDisplayName = map[string]string{
	"RELAXATION": "Relax",
	"ROUTINE":    "Routine",
	"STRESS":     "Task",
}

// PhaseTimelineRow is a single row in the phase timeline export.
type PhaseTimelineRow struct {
	ParticipantCode string `json:"participant_code"`
	Phase           string `json:"phase"`
	StartTsMs       int64  `json:"start_ts_ms"`
	EndTsMs         *int64 `json:"end_ts_ms"` // nil if phase not yet ended
}

// PhaseTimelinePreview is the JSON preview response.
type PhaseTimelinePreview struct {
	Participants []string                      `json:"participants"`
	Data         map[string][]PhaseTimelineRow `json:"data"`
}

// getPhaseTimelineRows queries phase start/end events and returns sorted rows.
func (e *CSVExporter) getPhaseTimelineRows(ctx context.Context) ([]PhaseTimelineRow, error) {
	query := `
		WITH phase_starts AS (
			SELECT s.id AS session_id, p.code,
			       ev.payload->>'to_phase' AS phase,
			       ev.server_time AS start_time
			FROM events ev
			JOIN sessions s ON s.id = ev.session_id
			JOIN participants p ON p.id = s.participant_id
			WHERE ev.event_type = 'PHASE_TRANSITION'
			  AND ev.payload->>'to_phase' IN ('RELAXATION', 'ROUTINE', 'STRESS')
		),
		phase_ends AS (
			SELECT s.id AS session_id,
			       ev.payload->>'from_phase' AS phase,
			       ev.server_time AS end_time
			FROM events ev
			JOIN sessions s ON s.id = ev.session_id
			WHERE ev.event_type = 'PHASE_TRANSITION'
			  AND ev.payload->>'from_phase' IN ('RELAXATION', 'ROUTINE', 'STRESS')
		)
		SELECT ps.code, ps.phase, ps.start_time, pe.end_time
		FROM phase_starts ps
		LEFT JOIN phase_ends pe ON pe.session_id = ps.session_id AND pe.phase = ps.phase
		ORDER BY ps.code ASC, ps.start_time ASC
	`

	rows, err := e.sessions.DB().Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query phase timeline: %w", err)
	}
	defer rows.Close()

	var result []PhaseTimelineRow
	for rows.Next() {
		var code, internalPhase string
		var startTime time.Time
		var endTime *time.Time
		if err := rows.Scan(&code, &internalPhase, &startTime, &endTime); err != nil {
			return nil, fmt.Errorf("scan phase timeline row: %w", err)
		}

		displayName, ok := phaseDisplayName[internalPhase]
		if !ok {
			continue
		}

		if code == "" {
			slog.Warn("participant code is empty for phase timeline row", "phase", internalPhase)
		}

		row := PhaseTimelineRow{
			ParticipantCode: code,
			Phase:           displayName,
			StartTsMs:       startTime.UnixMilli(),
		}
		if endTime != nil {
			ms := endTime.UnixMilli()
			row.EndTsMs = &ms
		}

		result = append(result, row)
	}

	return result, rows.Err()
}

// ExportPhaseTimeline writes the 4-column CSV.
func (e *CSVExporter) ExportPhaseTimeline(ctx context.Context, w io.Writer) error {
	rows, err := e.getPhaseTimelineRows(ctx)
	if err != nil {
		return err
	}

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{"participant_code", "phase", "start_ts_ms", "end_ts_ms"})

	for _, row := range rows {
		endStr := ""
		if row.EndTsMs != nil {
			endStr = fmt.Sprintf("%d", *row.EndTsMs)
		}
		writer.Write([]string{
			row.ParticipantCode,
			row.Phase,
			fmt.Sprintf("%d", row.StartTsMs),
			endStr,
		})
	}

	return writer.Error()
}

// GetPhaseTimelinePreview returns the structured preview data for the frontend.
func (e *CSVExporter) GetPhaseTimelinePreview(ctx context.Context) (*PhaseTimelinePreview, error) {
	rows, err := e.getPhaseTimelineRows(ctx)
	if err != nil {
		return nil, err
	}

	preview := &PhaseTimelinePreview{
		Participants: []string{},
		Data:         make(map[string][]PhaseTimelineRow),
	}

	seen := make(map[string]bool)
	for _, row := range rows {
		if !seen[row.ParticipantCode] {
			seen[row.ParticipantCode] = true
			preview.Participants = append(preview.Participants, row.ParticipantCode)
		}
		preview.Data[row.ParticipantCode] = append(preview.Data[row.ParticipantCode], row)
	}

	return preview, nil
}
