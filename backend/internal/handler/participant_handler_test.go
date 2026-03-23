package handler_test

import (
	"bytes"
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
)

func TestParticipantHandler_Create(t *testing.T) {
	mockStore := new(mocks.MockParticipantStore)
	h := handler.NewParticipantHandler(mockStore)

	t.Run("success", func(t *testing.T) {
		reqBody := `{"code": "TEST-123"}`
		req := httptest.NewRequest(http.MethodPost, "/participants", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		expectedReq := model.CreateParticipantRequest{Code: "TEST-123"}
		expectedParticipant := &model.Participant{
			ID:        uuid.New(),
			Code:      "TEST-123",
			CreatedAt: time.Now(),
		}

		mockStore.On("Create", mock.Anything, expectedReq).Return(expectedParticipant, nil).Once()

		h.Create(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("missing code", func(t *testing.T) {
		reqBody := `{"code": ""}`
		req := httptest.NewRequest(http.MethodPost, "/participants", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		h.Create(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("store error conflict", func(t *testing.T) {
		reqBody := `{"code": "DUP-123"}`
		req := httptest.NewRequest(http.MethodPost, "/participants", bytes.NewBufferString(reqBody))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		expectedReq := model.CreateParticipantRequest{Code: "DUP-123"}
		mockStore.On("Create", mock.Anything, expectedReq).Return((*model.Participant)(nil), errors.New("duplicate key")).Once()

		h.Create(rr, req)

		assert.Equal(t, http.StatusConflict, rr.Code)
		mockStore.AssertExpectations(t)
	})
}

func TestParticipantHandler_GetByCode(t *testing.T) {
	mockStore := new(mocks.MockParticipantStore)
	h := handler.NewParticipantHandler(mockStore)

	r := chi.NewRouter()
	r.Get("/participants/{code}", h.GetByCode)

	t.Run("success", func(t *testing.T) {
		expectedParticipant := &model.Participant{
			ID:        uuid.New(),
			Code:      "TEST-123",
			CreatedAt: time.Now(),
		}
		mockStore.On("GetByCode", mock.Anything, "TEST-123").Return(expectedParticipant, nil).Once()

		req := httptest.NewRequest(http.MethodGet, "/participants/TEST-123", nil)
		// Use chi router context for URLParam to work
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("not found", func(t *testing.T) {
		mockStore.On("GetByCode", mock.Anything, "UNKNOWN").Return((*model.Participant)(nil), errors.New("not found")).Once()

		req := httptest.NewRequest(http.MethodGet, "/participants/UNKNOWN", nil)
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		mockStore.AssertExpectations(t)
	})
}
