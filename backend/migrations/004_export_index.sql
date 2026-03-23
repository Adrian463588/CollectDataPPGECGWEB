-- ============================================================
-- Migration 004: Partial index for phase timeline export CTE
-- Sprint 2.1 — improves performance of PHASE_TRANSITION queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_events_phase_transition
    ON events(session_id, server_time ASC)
    WHERE event_type = 'PHASE_TRANSITION';
