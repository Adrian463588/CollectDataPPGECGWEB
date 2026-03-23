-- ============================================================
-- All Migrations — Run this file to set up a fresh database.
-- Usage: psql -U postgres -d expctrl -f backend/migrations/all.sql
-- ============================================================

-- ---- Migration 000001: Initial Schema ----

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata        JSONB DEFAULT '{}'
);
CREATE INDEX idx_participants_code ON participants(code);

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id  UUID NOT NULL REFERENCES participants(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    current_phase   VARCHAR(30) NOT NULL DEFAULT 'INTRO',
    config          JSONB NOT NULL DEFAULT '{}',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_participant ON sessions(participant_id);
CREATE INDEX idx_sessions_status ON sessions(status);

CREATE TABLE events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID NOT NULL REFERENCES sessions(id),
    event_type       VARCHAR(50) NOT NULL,
    server_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_time_ms   BIGINT,
    client_offset_ms BIGINT,
    idempotency_key  UUID NOT NULL UNIQUE,
    payload          JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_session_type ON events(session_id, event_type);
CREATE INDEX idx_events_server_time ON events(server_time);
CREATE INDEX idx_events_idempotency ON events(idempotency_key);

CREATE TABLE stimuli (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES sessions(id),
    sequence_nr     INT NOT NULL,
    problem_text    VARCHAR(100) NOT NULL,
    correct_answer  INT NOT NULL,
    difficulty      VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stimuli_session ON stimuli(session_id);
CREATE UNIQUE INDEX idx_stimuli_session_seq ON stimuli(session_id, sequence_nr);

CREATE TABLE responses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID NOT NULL REFERENCES sessions(id),
    stimulus_id        UUID NOT NULL REFERENCES stimuli(id),
    participant_answer INT,
    is_correct         BOOLEAN NOT NULL,
    reaction_time_ms   INT,
    timed_out          BOOLEAN NOT NULL DEFAULT FALSE,
    server_time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_responses_session ON responses(session_id);
CREATE INDEX idx_responses_stimulus ON responses(stimulus_id);

-- ---- Migration 003: Researcher Notes ----

CREATE TABLE IF NOT EXISTS researcher_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES sessions(id),
    content     TEXT NOT NULL,
    char_length INT  NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_researcher_notes_session ON researcher_notes(session_id);

-- ---- Migration 004: Phase Transition Index ----

CREATE INDEX IF NOT EXISTS idx_events_phase_transition
    ON events(session_id, server_time ASC)
    WHERE event_type = 'PHASE_TRANSITION';
