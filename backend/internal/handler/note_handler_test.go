// ============================================================
// Note Handler — Unit Tests
// ============================================================
package handler_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/experiment-controller/backend/internal/handler"
	"github.com/experiment-controller/backend/internal/mocks"
	"github.com/experiment-controller/backend/internal/model"
)

func TestNoteHandler_SaveNote(t *testing.T) {
	mockStore := new(mocks.MockNoteStore)
	h := handler.NewNoteHandler(mockStore)

	r := chi.NewRouter()
	r.Post("/sessions/{id}/notes", h.SaveNote)

	t.Run("success", func(t *testing.T) {
		sessionID := uuid.New()
		noteID := uuid.New()
		reqBody := `{"content":"This is a test note","client_time_ms":1700000000000,"idempotency_key":"` + uuid.New().String() + `"}`

		expectedNote := &model.ResearcherNote{
			ID:         noteID,
			SessionID:  sessionID,
			CharLength: 19,
			CreatedAt:  "2025-01-01T00:00:00.000+07:00",
		}
		mockStore.On("Create", mock.Anything, sessionID, "This is a test note").Return(expectedNote, nil).Once()

		req := httptest.NewRequest(http.MethodPost, "/sessions/"+sessionID.String()+"/notes", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code)
		assert.Contains(t, rr.Body.String(), noteID.String())
		mockStore.AssertExpectations(t)
	})

	t.Run("empty content", func(t *testing.T) {
		sessionID := uuid.New()
		reqBody := `{"content":"","client_time_ms":1700000000000,"idempotency_key":"` + uuid.New().String() + `"}`

		req := httptest.NewRequest(http.MethodPost, "/sessions/"+sessionID.String()+"/notes", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "empty")
	})

	t.Run("exceeds 2000 chars", func(t *testing.T) {
		sessionID := uuid.New()
		longContent := strings.Repeat("a", 2001)
		reqBody := `{"content":"` + longContent + `","client_time_ms":1700000000000,"idempotency_key":"` + uuid.New().String() + `"}`

		req := httptest.NewRequest(http.MethodPost, "/sessions/"+sessionID.String()+"/notes", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "2000")
	})

	t.Run("invalid JSON", func(t *testing.T) {
		sessionID := uuid.New()
		req := httptest.NewRequest(http.MethodPost, "/sessions/"+sessionID.String()+"/notes", bytes.NewBufferString(`{invalid`))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})

	t.Run("invalid UUID", func(t *testing.T) {
		reqBody := `{"content":"test"}`
		req := httptest.NewRequest(http.MethodPost, "/sessions/not-a-uuid/notes", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
	})
}
