-- ═══════════════════════════════════════════════════════════════════
--  019 — DRL Rows: Persistent Deliverable Tracking
--  Stores every DRL row with full field set so data survives across
--  devices and browser sessions. Syncs with IndexedDB offline store.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS drl_rows (
    id               TEXT PRIMARY KEY,                  -- matches DRLRow.id
    contract_id      TEXT,
    title            TEXT NOT NULL,
    di_number        TEXT DEFAULT '',
    contract_due_finish TEXT DEFAULT '',
    calculated_due_date TEXT DEFAULT '',
    submittal_guidance  TEXT DEFAULT '',
    actual_submission_date TEXT DEFAULT '',
    received         TEXT DEFAULT '',
    calendar_days_to_review INTEGER,
    notes            TEXT DEFAULT '',
    status           TEXT DEFAULT 'pending'
        CHECK (status IN ('green', 'yellow', 'red', 'pending')),
    shipbuilder_notes TEXT DEFAULT '',
    gov_notes         TEXT DEFAULT '',
    responsible_party TEXT DEFAULT '',
    workflow_state    JSONB,
    user_id          UUID REFERENCES auth.users(id),
    updated_at       TIMESTAMPTZ DEFAULT now(),
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drl_rows_contract ON drl_rows(contract_id);
CREATE INDEX IF NOT EXISTS idx_drl_rows_status ON drl_rows(status);
CREATE INDEX IF NOT EXISTS idx_drl_rows_user ON drl_rows(user_id);
CREATE INDEX IF NOT EXISTS idx_drl_rows_updated ON drl_rows(updated_at DESC);

-- Enable RLS
ALTER TABLE drl_rows ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all DRL rows (team visibility)
CREATE POLICY "Authenticated users can read drl_rows" ON drl_rows
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert/update their own rows
CREATE POLICY "Users manage own drl_rows" ON drl_rows
    FOR ALL USING (user_id = auth.uid() OR user_id IS NULL)
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Service role full access
CREATE POLICY "Service role full access on drl_rows" ON drl_rows
    FOR ALL USING (
        (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    );

-- Demo mode: allow reads/writes when user_id is null
CREATE POLICY "Demo mode read drl_rows" ON drl_rows
    FOR SELECT USING (user_id IS NULL);

CREATE POLICY "Demo mode insert drl_rows" ON drl_rows
    FOR INSERT WITH CHECK (user_id IS NULL);

CREATE POLICY "Demo mode update drl_rows" ON drl_rows
    FOR UPDATE USING (user_id IS NULL);
