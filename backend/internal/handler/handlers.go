// ============================================================
// Handlers — HTTP request handlers
// ============================================================
package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"

	"github.com/experiment-controller/backend/internal/model"
	"github.com/experiment-controller/backend/internal/service"
	"github.com/experiment-controller/backend/internal/store"
	"github.com/experiment-controller/backend/internal/wib"
)

// ---- Helpers ----

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	reqID := chiMiddleware.GetReqID(r.Context())
	writeJSON(w, status, model.APIError{
		Error: struct {
			Code      string `json:"code"`
			Message   string `json:"message"`
			RequestID string `json:"request_id"`
		}{
			Code:      code,
			Message:   message,
			RequestID: reqID,
		},
	})
}

func parseUUID(w http.ResponseWriter, r *http.Request, param string) (uuid.UUID, bool) {
	raw := chi.URLParam(r, param)
	id, err := uuid.Parse(raw)
	if err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_UUID", "Invalid UUID: "+param)
		return uuid.Nil, false
	}
	return id, true
}

// ---- Health ----

func HealthCheck(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":    "ok",
		"timestamp": wib.FormatISO(wib.Now()),
	})
}

// ---- Participant Handler ----

type ParticipantHandler struct {
	store *store.ParticipantStore
}

func NewParticipantHandler(s *store.ParticipantStore) *ParticipantHandler {
	return &ParticipantHandler{store: s}
}

func (h *ParticipantHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateParticipantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}
	if req.Code == "" {
		writeError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "participant code is required")
		return
	}

	p, err := h.store.Create(r.Context(), req)
	if err != nil {
		slog.Error("create participant failed", "error", err)
		writeError(w, r, http.StatusConflict, "CONFLICT", "Participant code already exists")
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (h *ParticipantHandler) GetByCode(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	p, err := h.store.GetByCode(r.Context(), code)
	if err != nil {
		writeError(w, r, http.StatusNotFound, "NOT_FOUND", "Participant not found")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// ---- Session Handler ----

type SessionHandler struct {
	service      *service.SessionService
	participants *store.ParticipantStore
}

func NewSessionHandler(svc *service.SessionService, ps *store.ParticipantStore) *SessionHandler {
	return &SessionHandler{service: svc, participants: ps}
}

func (h *SessionHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}
	if req.ParticipantCode == "" {
		writeError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "participant_code is required")
		return
	}

	// Look up participant
	participant, err := h.participants.GetByCode(r.Context(), req.ParticipantCode)
	if err != nil {
		// Auto-create participant if not exists
		participant, err = h.participants.Create(r.Context(), model.CreateParticipantRequest{
			Code: req.ParticipantCode,
		})
		if err != nil {
			slog.Error("create participant failed", "error", err)
			writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create participant")
			return
		}
	}

	sess, err := h.service.CreateSession(r.Context(), participant.ID, req.Config)
	if err != nil {
		slog.Error("create session failed", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create session")
		return
	}
	writeJSON(w, http.StatusCreated, sess)
}

func (h *SessionHandler) GetState(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}

	sess, err := h.service.GetSession(r.Context(), id)
	if err != nil {
		writeError(w, r, http.StatusNotFound, "NOT_FOUND", "Session not found")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (h *SessionHandler) Transition(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}

	var req model.TransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	resp, err := h.service.TransitionPhase(r.Context(), id, req.ToPhase, req.ClientTimeMs)
	if err != nil {
		slog.Error("transition failed", "error", err)
		writeError(w, r, http.StatusBadRequest, "TRANSITION_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *SessionHandler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}

	var req model.HeartbeatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	if err := h.service.Heartbeat(r.Context(), id); err != nil {
		slog.Error("heartbeat failed", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Heartbeat failed")
		return
	}

	writeJSON(w, http.StatusOK, model.HeartbeatResponse{
		ServerTimeWIB: wib.FormatISO(wib.Now()),
		Status:        "ok",
	})
}

func (h *SessionHandler) SubmitResponse(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}

	var req model.SubmitResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	// For now, store as an event — full response table support can be added
	_, _, err := store.NewEventStore(nil).Create(r.Context(), id, model.BatchEventItem{
		EventType:      "RESPONSE_SUBMITTED",
		ClientTimeMs:   req.ClientTimeMs,
		IdempotencyKey: req.IdempotencyKey,
		Payload: map[string]interface{}{
			"stimulus_id":        req.StimulusID.String(),
			"participant_answer": req.ParticipantAnswer,
			"reaction_time_ms":   req.ReactionTimeMs,
		},
	})
	if err != nil {
		slog.Error("submit response failed", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to submit response")
		return
	}

	writeJSON(w, http.StatusCreated, model.SubmitResponseResult{
		ID: uuid.New(),
	})
}

func (h *SessionHandler) GetStimuli(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}

	stimuli, err := h.service.GetStimuli(r.Context(), id)
	if err != nil {
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get stimuli")
		return
	}
	writeJSON(w, http.StatusOK, stimuli)
}

func (h *SessionHandler) SkipPhase(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}

	var req model.SkipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}
	if req.CurrentPhase == "" {
		writeError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "current_phase is required")
		return
	}

	resp, err := h.service.SkipPhase(r.Context(), id, req.CurrentPhase, req.ClientTimeMs, req.IdempotencyKey)
	if err != nil {
		errMsg := err.Error()
		switch {
		case len(errMsg) > 14 && errMsg[:14] == "PHASE_MISMATCH":
			writeError(w, r, http.StatusConflict, "PHASE_MISMATCH", errMsg)
		case len(errMsg) > 17 && errMsg[:17] == "SESSION_COMPLETED":
			writeError(w, r, http.StatusConflict, "SESSION_COMPLETED", errMsg)
		case errMsg == "session not found":
			writeError(w, r, http.StatusNotFound, "NOT_FOUND", "Session not found")
		default:
			slog.Error("skip phase failed", "error", err)
			writeError(w, r, http.StatusBadRequest, "SKIP_ERROR", errMsg)
		}
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// ---- Event Handler ----

type EventHandler struct {
	store *store.EventStore
}

func NewEventHandler(s *store.EventStore) *EventHandler {
	return &EventHandler{store: s}
}

func (h *EventHandler) BatchCreate(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}

	var req model.BatchEventsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	accepted, duplicates, err := h.store.BatchCreate(r.Context(), id, req.Events)
	if err != nil {
		slog.Error("batch create events failed", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create events")
		return
	}

	writeJSON(w, http.StatusOK, model.BatchEventsResponse{
		Accepted:   accepted,
		Duplicates: duplicates,
	})
}

// ---- Export Handler ----

type ExportHandler struct {
	exporter *service.CSVExporter
}

func NewExportHandler(e *service.CSVExporter) *ExportHandler {
	return &ExportHandler{exporter: e}
}

func (h *ExportHandler) SessionEvents(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=session_events.csv")
	if err := h.exporter.ExportSessionEvents(r.Context(), w, id); err != nil {
		slog.Error("export session events failed", "error", err)
	}
}

func (h *ExportHandler) SessionSummary(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=session_summary.csv")
	if err := h.exporter.ExportSessionSummary(r.Context(), w, id); err != nil {
		slog.Error("export session summary failed", "error", err)
	}
}

func (h *ExportHandler) ParticipantSessions(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=participant_sessions.csv")
	if err := h.exporter.ExportParticipantSessions(r.Context(), w, code); err != nil {
		slog.Error("export participant sessions failed", "error", err)
	}
}

func (h *ExportHandler) AllSessions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=all_sessions.csv")
	if err := h.exporter.ExportAllSessions(r.Context(), w); err != nil {
		slog.Error("export all sessions failed", "error", err)
	}
}

func (h *ExportHandler) AllEvents(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=all_events.csv")
	if err := h.exporter.ExportAllEvents(r.Context(), w); err != nil {
		slog.Error("export all events failed", "error", err)
	}
}

func (h *ExportHandler) PhaseTimelineCSV(w http.ResponseWriter, r *http.Request) {
	filename := fmt.Sprintf("participants_%s_WIB.csv", wib.Now().Format("2006-01-02_15-04"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	if err := h.exporter.ExportPhaseTimeline(r.Context(), w); err != nil {
		slog.Error("export phase timeline failed", "error", err)
	}
}

func (h *ExportHandler) PhaseTimelinePreview(w http.ResponseWriter, r *http.Request) {
	preview, err := h.exporter.GetPhaseTimelinePreview(r.Context())
	if err != nil {
		slog.Error("phase timeline preview failed", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to load preview")
		return
	}
	writeJSON(w, http.StatusOK, preview)
}

// ---- Admin Handler ----

type AdminHandler struct {
	sessions *store.SessionStore
	adminKey string
}

func NewAdminHandler(s *store.SessionStore, adminKey string) *AdminHandler {
	return &AdminHandler{sessions: s, adminKey: adminKey}
}

func (h *AdminHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := h.sessions.ListAll(r.Context())
	if err != nil {
		slog.Error("list sessions failed", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list sessions")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"sessions": sessions,
		"total":    len(sessions),
	})
}

func (h *AdminHandler) PauseSession(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}
	if err := h.sessions.UpdateStatus(r.Context(), id, model.SessionPaused); err != nil {
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to pause session")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "paused"})
}

func (h *AdminHandler) ResumeSession(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}
	if err := h.sessions.UpdateStatus(r.Context(), id, model.SessionRunning); err != nil {
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to resume session")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "running"})
}

// ---- Note Handler ----

type NoteHandler struct {
	notes *store.NoteStore
}

func NewNoteHandler(notes *store.NoteStore) *NoteHandler {
	return &NoteHandler{notes: notes}
}

func (h *NoteHandler) SaveNote(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(w, r, "id")
	if !ok {
		return
	}

	var req model.SaveNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	content := req.Content
	if len([]rune(content)) == 0 {
		writeError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Note content cannot be empty")
		return
	}
	if len([]rune(content)) > 2000 {
		writeError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Note content exceeds 2000 characters")
		return
	}

	note, err := h.notes.Create(r.Context(), id, content)
	if err != nil {
		slog.Error("save note failed", "error", err)
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save note")
		return
	}

	writeJSON(w, http.StatusCreated, note)
}
