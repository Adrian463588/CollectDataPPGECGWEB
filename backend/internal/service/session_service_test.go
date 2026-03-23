// ============================================================
// Session Service — Unit Tests
// ============================================================
package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/experiment-controller/backend/internal/mocks"
	"github.com/experiment-controller/backend/internal/model"
)

func TestIsValidTransition(t *testing.T) {
	tests := []struct {
		from, to model.Phase
		want     bool
	}{
		{model.PhaseIntro, model.PhaseDeviceCheck, true},
		{model.PhaseDeviceCheck, model.PhaseCountdown, true},
		{model.PhaseCountdown, model.PhaseRelaxation, true},
		{model.PhaseRelaxation, model.PhaseRoutine, true},
		{model.PhaseRoutine, model.PhaseStress, true},
		{model.PhaseStress, model.PhaseComplete, true},

		// Invalid
		{model.PhaseIntro, model.PhaseRelaxation, false},
		{model.PhaseStress, model.PhaseRelaxation, false},
		{model.PhaseComplete, model.PhaseIntro, false},
		{model.PhaseIntro, model.PhaseStress, false},
		{model.PhaseRelaxation, model.PhaseDeviceCheck, false},
		{model.PhaseRelaxation, model.PhaseStress, false}, // must go via ROUTINE
	}

	for _, tt := range tests {
		got := isValidTransition(tt.from, tt.to)
		if got != tt.want {
			t.Errorf("isValidTransition(%s, %s) = %v, want %v", tt.from, tt.to, got, tt.want)
		}
	}
}

func TestSessionService_CreateSession(t *testing.T) {
	mockSessions := new(mocks.MockSessionStore)
	mockEvents := new(mocks.MockEventStore)
	mockStimuli := new(mocks.MockStimulusStore)
	gen := NewStimulusGenerator()

	svc := NewSessionService(mockSessions, mockEvents, mockStimuli, gen)

	t.Run("success", func(t *testing.T) {
		participantID := uuid.New()
		cfg := model.SessionConfig{
			RelaxationDurationMs: 5000,
			StressDurationMs:     10000,
			QuestionTimeoutMs:    5000,
		}

		sessionID := uuid.New()
		expectedSession := &model.Session{
			ID:            sessionID,
			ParticipantID: participantID,
			Status:        model.SessionCreated,
			CurrentPhase:  model.PhaseIntro,
			Config:        cfg,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		mockSessions.On("Create", mock.Anything, participantID, cfg).Return(expectedSession, nil).Once()
		mockStimuli.On("BulkCreate", mock.Anything, mock.AnythingOfType("[]model.Stimulus")).Return(nil).Once()
		mockEvents.On("Create", mock.Anything, sessionID, mock.AnythingOfType("model.BatchEventItem")).Return(&model.Event{}, false, nil).Once()

		sess, err := svc.CreateSession(context.Background(), participantID, cfg)

		assert.NoError(t, err)
		assert.Equal(t, sessionID, sess.ID)
		assert.Equal(t, model.SessionCreated, sess.Status)

		mockSessions.AssertExpectations(t)
		mockStimuli.AssertExpectations(t)
		mockEvents.AssertExpectations(t)
	})

	t.Run("session store error", func(t *testing.T) {
		participantID := uuid.New()
		cfg := model.SessionConfig{}

		mockSessions.On("Create", mock.Anything, participantID, cfg).Return((*model.Session)(nil), errors.New("db error")).Once()

		sess, err := svc.CreateSession(context.Background(), participantID, cfg)

		assert.Error(t, err)
		assert.Nil(t, sess)
		mockSessions.AssertExpectations(t)
	})
}
