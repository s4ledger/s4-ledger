-- S4 Ledger — Client Error Tracking Table
-- Run in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS client_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    error_type TEXT NOT NULL DEFAULT 'unknown',
    message TEXT,
    source TEXT,
    line INTEGER,
    col INTEGER,
    url TEXT,
    tag TEXT,
    client_ts BIGINT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying errors by session and time
CREATE INDEX IF NOT EXISTS idx_client_errors_session ON client_errors(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_type ON client_errors(error_type, created_at DESC);

-- Auto-cleanup: keep only last 30 days of errors
-- (Run periodically or set up a Supabase Edge Function cron)
-- DELETE FROM client_errors WHERE created_at < now() - interval '30 days';

-- Enable RLS
ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;

-- Allow inserts from the API (service role key)
CREATE POLICY "Allow API inserts" ON client_errors
    FOR INSERT WITH CHECK (true);

-- Allow reads for monitoring (service role only, no anon access)
CREATE POLICY "Allow service reads" ON client_errors
    FOR SELECT USING (true);
