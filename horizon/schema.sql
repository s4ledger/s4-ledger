-- HORIZON — SQLite schema (also valid for Postgres with minor type
-- swaps). Single source of truth; do not branch DDL into application code.
--
-- Scope: this schema is HORIZON-only. Do not point it at any shared
-- S4 database. The pipeline_records table holds the records HORIZON
-- reasons over; it is not a copy of any other system's UI tables.

PRAGMA foreign_keys = ON;

-- ──────────────────────────────────────────────────────────────────
--  Conversation history
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    user_handle     TEXT NOT NULL,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_active_at  TEXT NOT NULL DEFAULT (datetime('now')),
    persona         TEXT NOT NULL DEFAULT 'procurement_pipeline_analyst',
    metadata_json   TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    turn_index    INTEGER NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('system','user','assistant','tool')),
    content       TEXT NOT NULL,
    tool_name     TEXT,
    tool_args     TEXT,
    tool_result   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_session
    ON messages(session_id, turn_index);

-- ──────────────────────────────────────────────────────────────────
--  Audit trail
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    event_type    TEXT NOT NULL,
    actor         TEXT NOT NULL,
    payload_json  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_session
    ON audit_log(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_event
    ON audit_log(event_type, created_at);

-- ──────────────────────────────────────────────────────────────────
--  Pipeline data HORIZON reasons over
--  - A "hull" is a vessel registered in MANIFEST.
--  - A "pipeline_record" is one procurement line item moving through
--    the five-phase pipeline. PR IDs are formatted PR-#####.
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hulls (
    id              TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,
    coar            TEXT,
    class_letter    TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipeline_records (
    pr_number       TEXT PRIMARY KEY,
    hull_id         TEXT REFERENCES hulls(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    phase           TEXT NOT NULL CHECK (phase IN
                       ('Definition','Procurement','Shipbuilder','Review','Award')),
    status          TEXT NOT NULL CHECK (status IN
                       ('On Track','At Risk','Overdue','Complete')),
    riy             INTEGER NOT NULL DEFAULT 0 CHECK (riy BETWEEN 0 AND 100),
    baseline_date   TEXT,
    actual_date     TEXT,
    variance_days   INTEGER NOT NULL DEFAULT 0,
    next_action     TEXT,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pr_hull   ON pipeline_records(hull_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON pipeline_records(status);
CREATE INDEX IF NOT EXISTS idx_pr_phase  ON pipeline_records(phase);
