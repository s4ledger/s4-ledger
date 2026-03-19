-- ═══════════════════════════════════════════════════════════════
-- Migration 013: Enterprise Verification System
-- Tier 2: Differential Integrity Analysis — encrypted content storage
-- Tier 3: Chain of Custody — access events + version chain
-- ═══════════════════════════════════════════════════════════════

-- Tier 2: Add encrypted full content column to records table
ALTER TABLE records ADD COLUMN IF NOT EXISTS content_full_encrypted TEXT;
-- Stores AES-256-GCM encrypted full content for server-side diff retrieval

-- Tier 3: Add version chain columns to records table
ALTER TABLE records ADD COLUMN IF NOT EXISTS parent_tx_hash TEXT;
-- Links to previous version's tx_hash. NULL for first version.
ALTER TABLE records ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Tier 3: Access events table for chain of custody tracking
CREATE TABLE IF NOT EXISTS access_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id   TEXT NOT NULL,
    record_hash TEXT NOT NULL,
    event_type  TEXT NOT NULL,  -- 'view', 'export', 'share', 'verify', 'modify', 'anchor', 're_anchor'
    actor       TEXT NOT NULL,
    actor_role  TEXT,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash     TEXT,          -- hashed IP for privacy
    user_agent  TEXT,
    details     JSONB DEFAULT '{}'::jsonb,
    metadata    JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_access_events_record ON access_events (record_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_access_events_actor ON access_events (actor);
CREATE INDEX IF NOT EXISTS idx_access_events_type ON access_events (event_type);

-- RLS policies for access_events
ALTER TABLE access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY access_events_insert ON access_events FOR INSERT WITH CHECK (true);
CREATE POLICY access_events_select ON access_events FOR SELECT USING (true);

-- Index for content_full_encrypted lookups
CREATE INDEX IF NOT EXISTS idx_records_content_full ON records (record_id) WHERE content_full_encrypted IS NOT NULL;

-- Index for version chain lookups
CREATE INDEX IF NOT EXISTS idx_records_parent_tx ON records (parent_tx_hash) WHERE parent_tx_hash IS NOT NULL;
