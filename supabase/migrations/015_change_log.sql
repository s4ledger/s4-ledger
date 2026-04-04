-- ═══════════════════════════════════════════════════════════════════
--  015 — Change Log: Field-Level Audit Trail
--  Stores every cell edit with old/new values for evidentiary audit.
--  Linked to auth.uid() for user attribution.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS change_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_role TEXT,
    user_org TEXT,
    row_id TEXT NOT NULL,
    row_title TEXT NOT NULL,
    field TEXT NOT NULL,
    field_label TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type TEXT NOT NULL DEFAULT 'edit'
        CHECK (change_type IN ('edit', 'seal', 'reseal', 'verify', 'ai_remark', 'status_change', 'external_sync')),
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_change_log_row ON change_log(row_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_user ON change_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_field ON change_log(field);
CREATE INDEX IF NOT EXISTS idx_change_log_created ON change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_type ON change_log(change_type);

-- Enable RLS
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read change logs (audit transparency)
CREATE POLICY "Authenticated users can read change log" ON change_log
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own change log entries
CREATE POLICY "Users insert own changes" ON change_log
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Service role full access
CREATE POLICY "Service role full access on change_log" ON change_log
    FOR ALL USING (
        (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    );

-- Anonymous/demo mode: allow inserts and reads when user_id is null
CREATE POLICY "Demo mode read" ON change_log
    FOR SELECT USING (user_id IS NULL);

CREATE POLICY "Demo mode insert" ON change_log
    FOR INSERT WITH CHECK (user_id IS NULL);
