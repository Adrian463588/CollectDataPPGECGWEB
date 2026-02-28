// ============================================================
// StimulusGenerator — Generates math problems for sessions
// ============================================================
package service

import (
	"fmt"
	"math/rand"

	"github.com/google/uuid"

	"github.com/experiment-controller/backend/internal/model"
)

type StimulusGenerator struct{}

func NewStimulusGenerator() *StimulusGenerator {
	return &StimulusGenerator{}
}

// GenerateForSession creates a sequence of math problems based on the session config.
// Uses session ID as seed for reproducibility.
func (g *StimulusGenerator) GenerateForSession(sessionID uuid.UUID, cfg model.SessionConfig) []model.Stimulus {
	// Seed from session ID for reproducibility
	seed := int64(sessionID[0])<<56 | int64(sessionID[1])<<48 | int64(sessionID[2])<<40 |
		int64(sessionID[3])<<32 | int64(sessionID[4])<<24 | int64(sessionID[5])<<16 |
		int64(sessionID[6])<<8 | int64(sessionID[7])
	rng := rand.New(rand.NewSource(seed))

	// Calculate expected number of problems
	// stress_duration_ms / question_timeout_ms (approximate upper bound)
	count := cfg.StressDurationMs / cfg.QuestionTimeoutMs
	if count < 10 {
		count = 10
	}
	// Add 50% buffer since some questions are answered quickly
	count = count + count/2

	stimuli := make([]model.Stimulus, 0, count)
	for i := 0; i < count; i++ {
		st := g.generateProblem(rng, sessionID, i+1, cfg.Difficulty)
		stimuli = append(stimuli, st)
	}
	return stimuli
}

func (g *StimulusGenerator) generateProblem(rng *rand.Rand, sessionID uuid.UUID, seq int, difficulty string) model.Stimulus {
	a := rng.Intn(9000) + 1000 // 1000-9999

	var b int
	var diff string
	switch difficulty {
	case "EASY":
		b = rng.Intn(8) + 2 // 2-9
		diff = "EASY"
	case "HARD":
		b = rng.Intn(50) + 50 // 50-99
		diff = "HARD"
	default: // MEDIUM
		b = rng.Intn(40) + 10 // 10-49
		diff = "MEDIUM"
	}

	return model.Stimulus{
		ID:            uuid.New(),
		SessionID:     sessionID,
		SequenceNr:    seq,
		ProblemText:   fmt.Sprintf("%d − %d", a, b),
		CorrectAnswer: a - b,
		Difficulty:    diff,
	}
}
