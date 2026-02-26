-- ═══════════════════════════════════════════════════════════════════
--  005: User State Persistence Table
--  Stores localStorage key/value pairs for cross-session persistence
--  Synced via /api/state/save and /api/state/load endpoints
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT 'default',
    session_id TEXT NOT NULL DEFAULT 'default',
    state_key TEXT NOT NULL,
    state_value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, session_id, state_key)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_state_session ON user_state(org_id, session_id);
CREATE INDEX IF NOT EXISTS idx_user_state_key ON user_state(state_key);
CREATE INDEX IF NOT EXISTS idx_user_state_updated ON user_state(updated_at DESC);

-- Enable RLS
ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON user_state FOR ALL USING (true);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_user_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_state_updated_at
    BEFORE UPDATE ON user_state
    FOR EACH ROW
    EXECUTE FUNCTION update_user_state_timestamp();
