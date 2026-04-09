// ============================================================
// Server — HTTP server setup
// ============================================================
package server

import (
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/experiment-controller/backend/internal/config"
	"github.com/experiment-controller/backend/internal/handler"
	"github.com/experiment-controller/backend/internal/service"
	"github.com/experiment-controller/backend/internal/store"
)

type Server struct {
	cfg *config.Config
	db  *pgxpool.Pool
}

func New(cfg *config.Config, db *pgxpool.Pool) *Server {
	return &Server{cfg: cfg, db: db}
}

func (s *Server) Router() *chi.Mux {
	r := chi.NewRouter()

	// ---- Middleware ----
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.Compress(5))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-Id", "X-Admin-Key"},
		ExposedHeaders:   []string{"X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// ---- Stores ----
	participantStore := store.NewParticipantStore(s.db)
	sessionStore := store.NewSessionStore(s.db)
	eventStore := store.NewEventStore(s.db)
	stimulusStore := store.NewStimulusStore(s.db)
	noteStore := store.NewNoteStore(s.db)

	// ---- Services ----
	stimulusGen := service.NewStimulusGenerator()
	sessionSvc := service.NewSessionService(sessionStore, eventStore, stimulusStore, stimulusGen)
	csvExporter := service.NewCSVExporter(sessionStore, eventStore, participantStore)

	// ---- Handlers ----
	participantH := handler.NewParticipantHandler(participantStore)
	sessionH := handler.NewSessionHandler(sessionSvc, participantStore)
	eventH := handler.NewEventHandler(eventStore)
	exportH := handler.NewExportHandler(csvExporter)
	adminH := handler.NewAdminHandler(sessionStore, s.cfg.AdminAPIKey)
	noteH := handler.NewNoteHandler(noteStore)

	// ---- Routes ----
	r.Route("/api", func(r chi.Router) {
		// Health check
		r.Get("/health", handler.HealthCheck)

		// Participants
		r.Post("/participants", participantH.Create)
		r.Get("/participants/{code}", participantH.GetByCode)

		// Sessions
		r.Post("/sessions", sessionH.Create)
		r.Get("/sessions/{id}", sessionH.GetState)
		r.Post("/sessions/{id}/transition", sessionH.Transition)
		r.Post("/sessions/{id}/heartbeat", sessionH.Heartbeat)
		r.Post("/sessions/{id}/events", eventH.BatchCreate)
		r.Post("/sessions/{id}/responses", sessionH.SubmitResponse)
		r.Get("/sessions/{id}/stimuli", sessionH.GetStimuli)
		r.Post("/sessions/{id}/notes", noteH.SaveNote)

		// Dev controls (protected by feature flag)
		r.Group(func(r chi.Router) {
			r.Use(DevControlsGuard(s.cfg.EnableDevControls))
			r.Post("/sessions/{id}/skip", sessionH.SkipPhase)
		})

		// Admin (protected)
		r.Route("/admin", func(r chi.Router) {
			r.Use(AdminAuth(s.cfg.AdminAPIKey))

			r.Get("/sessions", adminH.ListSessions)
			r.Post("/sessions/{id}/pause", adminH.PauseSession)
			r.Post("/sessions/{id}/resume", adminH.ResumeSession)

			// Export
			r.Get("/export/sessions/{id}/events.csv", exportH.SessionEvents)
			r.Get("/export/sessions/{id}/summary.csv", exportH.SessionSummary)
			r.Get("/export/participants/{code}/sessions.csv", exportH.ParticipantSessions)
			r.Get("/export/all/sessions.csv", exportH.AllSessions)
			r.Get("/export/all/events.csv", exportH.AllEvents)
			r.Get("/export/participants.csv", exportH.PhaseTimelineCSV)
			r.Get("/export/preview", exportH.PhaseTimelinePreview)
		})
	})

	return r
}
