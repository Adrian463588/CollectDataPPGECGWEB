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
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/experiment-controller/backend/internal/model"
	"github.com/experiment-controller/backend/internal/store"
	"github.com/experiment-controller/backend/internal/wib"
)

type CSVExporter struct {
	sessions     store.SessionStore
	events       store.EventStore
	participants store.ParticipantStore
}

func NewCSVExporter(
	sessions store.SessionStore,
	events store.EventStore,
	participants store.ParticipantStore,
) *CSVExporter {
	return &CSVExporter{
		sessions:     sessions,
		events:       events,
		participants: participants,
	}
}

// formatOptionalTime formats an optional time pointer in WIB ISO format.
// Returns an empty string if the time is nil.
func formatOptionalTime(t *time.Time) string {
	if t == nil {
		return ""
	}
	return wib.FormatISO(*t)
}

// formatEventCSVRow converts an Event into a CSV-ready string slice.
func formatEventCSVRow(ev model.Event, includeSessionID bool) []string {
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

	row := []string{}
	if includeSessionID {
		row = append(row, ev.SessionID.String())
	}
	return append(row,
		ev.ID.String(),
		ev.EventType,
		wib.Format(ev.ServerTime),
		clientMs,
		offsetMs,
		ev.IdempotencyKey.String(),
		payloadStr,
	)
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
		writer.Write(formatEventCSVRow(ev, false))
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

	startedAt := formatOptionalTime(sess.StartedAt)
	completedAt := formatOptionalTime(sess.CompletedAt)

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
		writer.Write([]string{
			sess.ID.String(),
			sess.ParticipantID.String(),
			string(sess.Status),
			string(sess.CurrentPhase),
			formatOptionalTime(sess.StartedAt),
			formatOptionalTime(sess.CompletedAt),
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
		writer.Write(formatEventCSVRow(ev, true))
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
		writer.Write([]string{
			sess.ID.String(),
			participant.Code,
			string(sess.Status),
			string(sess.CurrentPhase),
			formatOptionalTime(sess.StartedAt),
			formatOptionalTime(sess.CompletedAt),
			wib.FormatISO(sess.CreatedAt),
		})
	}

	return writer.Error()
}

// ---- Phase Timeline Export (5-column: participant_code, phase, start_timestamp, end_timestamp, date) ----

// phaseDisplayName maps internal phase enums to client-facing display names.
var phaseDisplayName = map[string]string{
	"RELAXATION": "Relax",
	"ROUTINE":    "Routine",
	"STRESS":     "Task",
}

// wibTimestampFormat is full ISO 8601 with milliseconds and WIB offset.
const wibTimestampFormat = "2006-01-02T15:04:05.000+07:00"

// wibDateFormat is dd/MM/yyyy in Go layout.
const wibDateFormat = "02/01/2006"

// ParticipantScore holds aggregated quiz scores per participant.
type ParticipantScore struct {
	// Arithmetic (TSST) scores
	Correct        int `json:"correct"`
	Incorrect      int `json:"incorrect"`
	TotalQuestions int `json:"total_questions"`
	// Stroop Color Word Test scores
	SCWTCorrect   int `json:"scwt_correct"`
	SCWTIncorrect int `json:"scwt_incorrect"`
	SCWTTotal     int `json:"scwt_total"`
}

// PhaseTimelineRow is a single row in the phase timeline export.
type PhaseTimelineRow struct {
	ParticipantCode string `json:"participant_code"`
	Phase           string `json:"phase"`
	StartTimestamp  string `json:"start_timestamp"`
	EndTimestamp    string `json:"end_timestamp"` // empty if phase not yet ended
	Date            string `json:"date"`
}

// PhaseTimelinePreview is the JSON preview response.
type PhaseTimelinePreview struct {
	Participants []string                      `json:"participants"`
	Data         map[string][]PhaseTimelineRow `json:"data"`
	Scores       map[string]ParticipantScore   `json:"scores"`
}

// getPhaseTimelineRows queries phase transitions and returns sorted rows.
//
// INTEGRITY GUARANTEE: end(phase_A) == start(phase_B) because both are derived
// from the SAME transition event row ({from: A, to: B, server_time: T}).
// A single "transitions" CTE captures each to_phase event (earliest per session).
// End time for phase X is the transition_time of the event where from_phase=X.
func (e *CSVExporter) getPhaseTimelineRows(ctx context.Context) ([]PhaseTimelineRow, error) {
	query := `
		WITH transitions AS (
			SELECT DISTINCT ON (s.id, ev.payload->>'to_phase')
				s.id AS session_id, p.code,
				ev.payload->>'from_phase' AS from_phase,
				ev.payload->>'to_phase' AS to_phase,
				ev.server_time AS transition_time
			FROM events ev
			JOIN sessions s ON s.id = ev.session_id
			JOIN participants p ON p.id = s.participant_id
			WHERE ev.event_type = 'PHASE_TRANSITION'
			  AND ev.payload->>'to_phase' IN ('RELAXATION', 'ROUTINE', 'STRESS', 'COMPLETE')
			ORDER BY s.id, ev.payload->>'to_phase', ev.server_time ASC
		)
		SELECT
			t_start.code,
			t_start.to_phase AS phase,
			t_start.transition_time AS start_time,
			t_end.transition_time AS end_time
		FROM transitions t_start
		LEFT JOIN transitions t_end
			ON t_end.session_id = t_start.session_id
			AND t_end.from_phase = t_start.to_phase
		WHERE t_start.to_phase IN ('RELAXATION', 'ROUTINE', 'STRESS')
		ORDER BY t_start.code ASC, t_start.transition_time ASC
	`

	rows, err := e.sessions.DB().Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query phase timeline: %w", err)
	}
	defer rows.Close()

	loc := wib.Location()

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

		startWIB := startTime.In(loc)
		row := PhaseTimelineRow{
			ParticipantCode: code,
			Phase:           displayName,
			StartTimestamp:  startWIB.Format(wibTimestampFormat),
			Date:            startWIB.Format(wibDateFormat),
		}
		if endTime != nil {
			row.EndTimestamp = endTime.In(loc).Format(wibTimestampFormat)
		}

		result = append(result, row)
	}

	return result, rows.Err()
}

// getParticipantScores computes per-participant scores.
// Arithmetic score is read from the `responses` table (authoritative is_correct boolean).
// SCWT score is read from SCWT_RESPONSE events (client-side only, no DB responses row).
func (e *CSVExporter) getParticipantScores(ctx context.Context) (map[string]ParticipantScore, error) {
	// --- Arithmetic score from responses table ---
	arithmeticQuery := `
		SELECT
			p.code,
			COUNT(*) AS total,
			COUNT(CASE WHEN (ev.payload->>'is_correct')::boolean THEN 1 END) AS correct
		FROM events ev
		JOIN sessions s ON s.id = ev.session_id
		JOIN participants p ON p.id = s.participant_id
		WHERE ev.event_type = 'RESPONSE_SUBMITTED'
		GROUP BY p.code
		ORDER BY p.code
	`

	aRows, err := e.sessions.DB().Query(ctx, arithmeticQuery)
	if err != nil {
		return nil, fmt.Errorf("query arithmetic scores: %w", err)
	}
	defer aRows.Close()

	scores := make(map[string]ParticipantScore)
	for aRows.Next() {
		var code string
		var total, correct int
		if err := aRows.Scan(&code, &total, &correct); err != nil {
			return nil, fmt.Errorf("scan arithmetic score row: %w", err)
		}
		scores[code] = ParticipantScore{
			Correct:        correct,
			Incorrect:      total - correct,
			TotalQuestions: total,
		}
	}
	if err := aRows.Err(); err != nil {
		return nil, err
	}

	// --- SCWT score from events table ---
	scwtQuery := `
		SELECT
			p.code,
			COUNT(*) AS total,
			COUNT(CASE WHEN (ev.payload->>'is_correct')::boolean THEN 1 END) AS correct
		FROM events ev
		JOIN sessions s ON s.id = ev.session_id
		JOIN participants p ON p.id = s.participant_id
		WHERE ev.event_type = 'SCWT_RESPONSE'
		GROUP BY p.code
	`

	sRows, err := e.sessions.DB().Query(ctx, scwtQuery)
	if err != nil {
		// SCWT data may not exist yet — degrade gracefully
		slog.Warn("failed to load SCWT scores (may not exist yet)", "error", err)
		return scores, nil
	}
	defer sRows.Close()

	for sRows.Next() {
		var code string
		var total, correct int
		if err := sRows.Scan(&code, &total, &correct); err != nil {
			slog.Warn("scan SCWT score row failed", "error", err)
			continue
		}
		existing := scores[code]
		existing.SCWTCorrect = correct
		existing.SCWTIncorrect = total - correct
		existing.SCWTTotal = total
		scores[code] = existing
	}

	return scores, sRows.Err()
}


// ExportPhaseTimeline writes the 8-column CSV (phase timeline + scores).
func (e *CSVExporter) ExportPhaseTimeline(ctx context.Context, w io.Writer) error {
	rows, err := e.getPhaseTimelineRows(ctx)
	if err != nil {
		return err
	}

	scores, err := e.getParticipantScores(ctx)
	if err != nil {
		slog.Warn("failed to load participant scores for CSV", "error", err)
		// Continue without scores — degrade gracefully
		scores = make(map[string]ParticipantScore)
	}

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{
		"participant_code", "phase", "start_timestamp", "end_timestamp", "date",
		"arithmetic_correct", "arithmetic_incorrect", "arithmetic_total",
		"scwt_correct", "scwt_incorrect", "scwt_total",
	})

	for _, row := range rows {
		score := scores[row.ParticipantCode]
		writer.Write([]string{
			row.ParticipantCode,
			row.Phase,
			row.StartTimestamp,
			row.EndTimestamp,
			row.Date,
			strconv.Itoa(score.Correct),
			strconv.Itoa(score.Incorrect),
			strconv.Itoa(score.TotalQuestions),
			strconv.Itoa(score.SCWTCorrect),
			strconv.Itoa(score.SCWTIncorrect),
			strconv.Itoa(score.SCWTTotal),
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

	scores, err := e.getParticipantScores(ctx)
	if err != nil {
		slog.Warn("failed to load participant scores for preview", "error", err)
		scores = make(map[string]ParticipantScore)
	}

	preview := &PhaseTimelinePreview{
		Participants: []string{},
		Data:         make(map[string][]PhaseTimelineRow),
		Scores:       scores,
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
