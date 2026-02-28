// ============================================================
// Session Service — Unit Tests
// ============================================================
package service

import (
	"testing"

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
		{model.PhaseRelaxation, model.PhaseStress, true},
		{model.PhaseStress, model.PhaseComplete, true},

		// Invalid
		{model.PhaseIntro, model.PhaseRelaxation, false},
		{model.PhaseStress, model.PhaseRelaxation, false},
		{model.PhaseComplete, model.PhaseIntro, false},
		{model.PhaseIntro, model.PhaseStress, false},
		{model.PhaseRelaxation, model.PhaseDeviceCheck, false},
	}

	for _, tt := range tests {
		got := isValidTransition(tt.from, tt.to)
		if got != tt.want {
			t.Errorf("isValidTransition(%s, %s) = %v, want %v", tt.from, tt.to, got, tt.want)
		}
	}
}
