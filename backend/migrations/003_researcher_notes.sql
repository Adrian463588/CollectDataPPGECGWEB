-- Migration 003: Add researcher_notes table for routine gap
-- Used to store researcher observations between relaxation and stress phases

CREATE TABLE IF NOT EXISTS researcher_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES sessions(id),
    content     TEXT NOT NULL,
    char_length INT  NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_researcher_notes_session ON researcher_notes(session_id);
