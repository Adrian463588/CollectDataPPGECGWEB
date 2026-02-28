// ============================================================
// Stimulus Generator — Unit Tests
// ============================================================
package service

import (
	"testing"

	"github.com/google/uuid"

	"github.com/experiment-controller/backend/internal/model"
)

func TestGenerateForSession(t *testing.T) {
	gen := NewStimulusGenerator()
	sessionID := uuid.MustParse("12345678-1234-1234-1234-123456789012")

	cfg := model.SessionConfig{
		StressDurationMs:  300000,
		QuestionTimeoutMs: 8000,
		Difficulty:        "MEDIUM",
	}

	stimuli := gen.GenerateForSession(sessionID, cfg)

	if len(stimuli) == 0 {
		t.Fatal("expected stimuli to be generated")
	}

	t.Logf("Generated %d stimuli", len(stimuli))

	// Check all have correct session ID
	for _, s := range stimuli {
		if s.SessionID != sessionID {
			t.Errorf("stimulus session ID mismatch: got %s, want %s", s.SessionID, sessionID)
		}
		if s.Difficulty != "MEDIUM" {
			t.Errorf("stimulus difficulty mismatch: got %s, want MEDIUM", s.Difficulty)
		}
		if s.CorrectAnswer <= 0 {
			t.Errorf("stimulus has invalid answer: %d", s.CorrectAnswer)
		}
	}

	// Check sequence numbers are sequential
	for i, s := range stimuli {
		if s.SequenceNr != i+1 {
			t.Errorf("sequence_nr mismatch: got %d, want %d", s.SequenceNr, i+1)
		}
	}
}

func TestDeterministicGeneration(t *testing.T) {
	gen := NewStimulusGenerator()
	sessionID := uuid.MustParse("12345678-1234-1234-1234-123456789012")

	cfg := model.SessionConfig{
		StressDurationMs:  300000,
		QuestionTimeoutMs: 8000,
		Difficulty:        "MEDIUM",
	}

	run1 := gen.GenerateForSession(sessionID, cfg)
	run2 := gen.GenerateForSession(sessionID, cfg)

	if len(run1) != len(run2) {
		t.Fatalf("non-deterministic count: %d vs %d", len(run1), len(run2))
	}

	for i := range run1 {
		if run1[i].ProblemText != run2[i].ProblemText {
			t.Errorf("non-deterministic problem at %d: %s vs %s", i, run1[i].ProblemText, run2[i].ProblemText)
		}
		if run1[i].CorrectAnswer != run2[i].CorrectAnswer {
			t.Errorf("non-deterministic answer at %d: %d vs %d", i, run1[i].CorrectAnswer, run2[i].CorrectAnswer)
		}
	}
}

func TestDifficultyTiers(t *testing.T) {
	gen := NewStimulusGenerator()
	sessionID := uuid.MustParse("12345678-1234-1234-1234-123456789012")

	difficulties := []string{"EASY", "MEDIUM", "HARD"}
	for _, diff := range difficulties {
		cfg := model.SessionConfig{
			StressDurationMs:  300000,
			QuestionTimeoutMs: 8000,
			Difficulty:        diff,
		}

		stimuli := gen.GenerateForSession(sessionID, cfg)
		for _, s := range stimuli {
			if s.Difficulty != diff {
				t.Errorf("expected difficulty %s, got %s", diff, s.Difficulty)
			}
		}
	}
}
