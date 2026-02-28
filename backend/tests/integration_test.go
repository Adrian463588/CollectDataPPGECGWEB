// ============================================================
// Integration Test — Outline
// Tests full session lifecycle against a real database.
// Run with: go test -tags=integration ./tests/
// ============================================================
//go:build integration

package tests

import (
	"testing"
)

// TestFullSessionLifecycle tests the complete flow:
// 1. Create participant
// 2. Create session
// 3. Transition through all phases
// 4. Submit events at each phase
// 5. Export CSV
//
// Requires a running PostgreSQL instance at DATABASE_URL.
func TestFullSessionLifecycle(t *testing.T) {
	t.Skip("Integration test — requires database. Set DATABASE_URL and run with -tags=integration")

	// TODO: Implementation outline:
	//
	// 1. Setup: Connect to test database, run migrations
	//    db := store.NewPostgresPool(ctx, os.Getenv("DATABASE_URL"))
	//    defer db.Close()
	//
	// 2. Create participant
	//    ps := store.NewParticipantStore(db)
	//    p, _ := ps.Create(ctx, model.CreateParticipantRequest{Code: "TEST001"})
	//
	// 3. Create session
	//    ss := store.NewSessionStore(db)
	//    es := store.NewEventStore(db)
	//    sts := store.NewStimulusStore(db)
	//    gen := service.NewStimulusGenerator()
	//    svc := service.NewSessionService(ss, es, sts, gen)
	//    sess, _ := svc.CreateSession(ctx, p.ID, model.SessionConfig{...})
	//
	// 4. Transition phases
	//    svc.TransitionPhase(ctx, sess.ID, model.PhaseDeviceCheck, time.Now().UnixMilli())
	//    svc.TransitionPhase(ctx, sess.ID, model.PhaseCountdown, time.Now().UnixMilli())
	//    svc.TransitionPhase(ctx, sess.ID, model.PhaseRelaxation, time.Now().UnixMilli())
	//    svc.TransitionPhase(ctx, sess.ID, model.PhaseStress, time.Now().UnixMilli())
	//    svc.TransitionPhase(ctx, sess.ID, model.PhaseComplete, time.Now().UnixMilli())
	//
	// 5. Verify events were recorded
	//    events, _ := es.ListBySession(ctx, sess.ID)
	//    assert(len(events) > 0)
	//
	// 6. Export CSV
	//    var buf bytes.Buffer
	//    exp := service.NewCSVExporter(ss, es, ps)
	//    exp.ExportSessionEvents(ctx, &buf, sess.ID)
	//    assert(buf.Len() > 0)
	//
	// 7. Cleanup: Drop test data
}
