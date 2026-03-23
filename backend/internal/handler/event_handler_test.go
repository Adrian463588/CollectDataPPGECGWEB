// ============================================================
// Event Handler — Unit Tests
// ============================================================
package handler_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/experiment-controller/backend/internal/handler"
	"github.com/experiment-controller/backend/internal/mocks"
	"github.com/experiment-controller/backend/internal/model"
	"github.com/experiment-controller/backend/internal/store"
)

func TestEventHandler_BatchCreate(t *testing.T) {
	mockStore := new(mocks.MockEventStore)
	h := handler.NewEventHandler(mockStore)

	r := chi.NewRouter()
	r.Post("/sessions/{id}/events", h.BatchCreate)

	t.Run("success", func(t *testing.T) {
		sessionID := uuid.New()
		reqBody := `{"events":[{"event_type":"HEARTBEAT","client_time_ms":1700000000000,"idempotency_key":"` + uuid.New().String() + `","payload":{}}]}`

		mockStore.On("BatchCreate", mock.Anything, sessionID, mock.AnythingOfType("[]model.BatchEventItem")).
			Return(1, 0, nil).Once()

		req := httptest.NewRequest(http.MethodPost, "/sessions/"+sessionID.String()+"/events", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("session not found", func(t *testing.T) {
		sessionID := uuid.New()
		reqBody := `{"events":[{"event_type":"HEARTBEAT","client_time_ms":1700000000000,"idempotency_key":"` + uuid.New().String() + `","payload":{}}]}`

		mockStore.On("BatchCreate", mock.Anything, sessionID, mock.AnythingOfType("[]model.BatchEventItem")).
			Return(0, 0, store.ErrSessionNotFound).Once()

		req := httptest.NewRequest(http.MethodPost, "/sessions/"+sessionID.String()+"/events", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("with duplicates", func(t *testing.T) {
		sessionID := uuid.New()
		reqBody := `{"events":[
			{"event_type":"HEARTBEAT","client_time_ms":1700000000000,"idempotency_key":"` + uuid.New().String() + `","payload":{}},
			{"event_type":"HEARTBEAT","client_time_ms":1700000001000,"idempotency_key":"` + uuid.New().String() + `","payload":{}}
		]}`

		mockStore.On("BatchCreate", mock.Anything, sessionID, mock.AnythingOfType("[]model.BatchEventItem")).
			Return(1, 1, nil).Once()

		req := httptest.NewRequest(http.MethodPost, "/sessions/"+sessionID.String()+"/events", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), `"accepted":1`)
		assert.Contains(t, rr.Body.String(), `"duplicates":1`)
		mockStore.AssertExpectations(t)
	})

	t.Run("invalid JSON", func(t *testing.T) {
		sessionID := uuid.New()
		req := httptest.NewRequest(http.MethodPost, "/sessions/"+sessionID.String()+"/events", bytes.NewBufferString(`{invalid`))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("invalid UUID", func(t *testing.T) {
		reqBody := `{"events":[]}`
		req := httptest.NewRequest(http.MethodPost, "/sessions/not-a-uuid/events", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}

// Verify that BatchEventsResponse has the expected structure
func TestBatchEventsResponse_Structure(t *testing.T) {
	resp := model.BatchEventsResponse{Accepted: 5, Duplicates: 2}
	assert.Equal(t, 5, resp.Accepted)
	assert.Equal(t, 2, resp.Duplicates)
}
