package handler_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/experiment-controller/backend/internal/handler"
	"github.com/experiment-controller/backend/internal/mocks"
	"github.com/experiment-controller/backend/internal/model"
	"github.com/experiment-controller/backend/internal/service"
)

func TestSessionHandler_GetState(t *testing.T) {
	mockSessions := new(mocks.MockSessionStore)
	mockEvents := new(mocks.MockEventStore)
	mockStimuli := new(mocks.MockStimulusStore)
	gen := service.NewStimulusGenerator()
	svc := service.NewSessionService(mockSessions, mockEvents, mockStimuli, gen)

	mockParticipants := new(mocks.MockParticipantStore)

	h := handler.NewSessionHandler(svc, mockParticipants)

	r := chi.NewRouter()
	r.Get("/sessions/{id}", h.GetState)

	t.Run("success", func(t *testing.T) {
		sessionID := uuid.New()
		expectedSession := &model.Session{
			ID:           sessionID,
			Status:       model.SessionRunning,
			CurrentPhase: model.PhaseRoutine,
			Config:       model.SessionConfig{},
			CreatedAt:    time.Now(),
		}

		// Service calls GetByID
		mockSessions.On("GetByID", mock.Anything, sessionID).Return(expectedSession, nil).Once()
		
		req := httptest.NewRequest(http.MethodGet, "/sessions/"+sessionID.String(), nil)
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		mockSessions.AssertExpectations(t)
	})

	t.Run("not found", func(t *testing.T) {
		sessionID := uuid.New()

		mockSessions.On("GetByID", mock.Anything, sessionID).Return((*model.Session)(nil), errors.New("not found")).Once()
		
		req := httptest.NewRequest(http.MethodGet, "/sessions/"+sessionID.String(), nil)
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		mockSessions.AssertExpectations(t)
	})
}
