-- ═══════════════════════════════════════════════════════════════════
--  020 — Chat Messages: Persistent Team & DM Messaging
--  Stores all chat messages so history survives page reload,
--  new devices, and browser clears. Realtime broadcast remains
--  the delivery mechanism; this table is the source of truth.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chat_messages (
    id               TEXT PRIMARY KEY,                  -- matches ChatMessage.id
    channel_id       TEXT NOT NULL,
    sender_id        TEXT NOT NULL,
    sender_name      TEXT NOT NULL,
    sender_role      TEXT NOT NULL,
    sender_org       TEXT NOT NULL,
    text             TEXT NOT NULL,
    priority         TEXT DEFAULT 'normal'
        CHECK (priority IN ('normal', 'urgent', 'critical')),
    mentions         TEXT[] DEFAULT '{}',
    read_by          TEXT[] DEFAULT '{}',
    row_ref          JSONB,                             -- optional { rowId, title }
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_priority ON chat_messages(priority)
    WHERE priority != 'normal';
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all messages (team transparency)
CREATE POLICY "Authenticated users can read chat_messages" ON chat_messages
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Any authenticated user can insert messages
CREATE POLICY "Authenticated users can send messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Service role full access
CREATE POLICY "Service role full access on chat_messages" ON chat_messages
    FOR ALL USING (
        (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    );

-- Demo mode: allow reads/writes when not authenticated
CREATE POLICY "Demo mode read chat_messages" ON chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Demo mode insert chat_messages" ON chat_messages
    FOR INSERT WITH CHECK (true);
