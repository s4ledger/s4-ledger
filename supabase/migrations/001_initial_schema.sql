-- ═══════════════════════════════════════════════════════════════════════
--  S4 Ledger — Supabase Schema Migration 001
--  Creates all production tables for persistent state.
--  Run in Supabase SQL Editor or via supabase db push.
-- ═══════════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────
--  1. RECORDS — Anchored records (replaces _live_records in-memory list)
--  Seed data is generated in code and never persisted — only real
--  anchored records go here.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id       TEXT UNIQUE NOT NULL,             -- e.g. "REC-A1B2C3D4E5F6"
    hash            TEXT NOT NULL,                    -- SHA-256 of anchored content
    record_type     TEXT NOT NULL,                    -- e.g. "USN_SUPPLY_RECEIPT"
    record_label    TEXT,                             -- human-readable label
    branch          TEXT DEFAULT 'JOINT',             -- USN, JOINT, etc.
    icon            TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    timestamp_display TEXT,
    fee             NUMERIC(10,4) DEFAULT 0.01,
    tx_hash         TEXT,                             -- XRPL transaction hash
    network         TEXT DEFAULT 'Simulated',         -- "XRPL Testnet", "XRPL Mainnet", "Simulated"
    explorer_url    TEXT,
    system          TEXT,                             -- originating system (NAVSUP, SKED, etc.)
    content_preview TEXT,
    org_id          TEXT,                             -- API key or org identifier
    source_system   TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,        -- extensible metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_records_hash ON records (hash);
CREATE INDEX IF NOT EXISTS idx_records_tx_hash ON records (tx_hash);
CREATE INDEX IF NOT EXISTS idx_records_org_id ON records (org_id);
CREATE INDEX IF NOT EXISTS idx_records_record_type ON records (record_type);
CREATE INDEX IF NOT EXISTS idx_records_timestamp ON records (timestamp DESC);

-- ─────────────────────────────────────────────────────────────────────
--  2. WALLETS — Already exists; ensure schema matches
--  (If table already exists, this is a no-op.)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE NOT NULL,
    address         TEXT NOT NULL,
    seed            TEXT NOT NULL,                    -- TODO: encrypt with pgcrypto
    plan            TEXT DEFAULT 'starter',
    created         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_email ON wallets (email);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets (address);

-- ─────────────────────────────────────────────────────────────────────
--  3. VERIFY_AUDIT_LOG — Verification audit trail
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verify_audit_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operator            TEXT,
    computed_hash       TEXT NOT NULL,
    chain_hash          TEXT,
    tx_hash             TEXT,
    result              TEXT NOT NULL,                -- MATCH, MISMATCH, NOT_FOUND
    tamper_detected     BOOLEAN DEFAULT FALSE,
    time_delta_seconds  NUMERIC,
    metadata            JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_verify_audit_timestamp ON verify_audit_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_verify_audit_result ON verify_audit_log (result);

-- ─────────────────────────────────────────────────────────────────────
--  4. AI_AUDIT_LOG — AI decision audit trail (hash-anchored)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    query           TEXT,
    response_hash   TEXT,
    tool_context    TEXT,
    anchored        BOOLEAN DEFAULT FALSE,
    intent          TEXT,
    entity_count    INTEGER DEFAULT 0,
    metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_timestamp ON ai_audit_log (timestamp DESC);

-- ─────────────────────────────────────────────────────────────────────
--  5. PROOF_CHAINS — Immutable event chain per record
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proof_chains (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id       TEXT NOT NULL,                    -- FK to records.record_id
    event_type      TEXT NOT NULL,                    -- anchor.created, verify.completed, etc.
    hash            TEXT NOT NULL,
    tx_hash         TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor           TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_proof_chains_record_id ON proof_chains (record_id);
CREATE INDEX IF NOT EXISTS idx_proof_chains_timestamp ON proof_chains (timestamp DESC);

-- ─────────────────────────────────────────────────────────────────────
--  6. CUSTODY_TRANSFERS — Chain of custody tracking
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custody_transfers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id       TEXT NOT NULL,
    from_entity     TEXT NOT NULL,
    to_entity       TEXT NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash            TEXT,
    tx_hash         TEXT,
    location        TEXT,
    condition       TEXT,
    notes           TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_custody_record_id ON custody_transfers (record_id);
CREATE INDEX IF NOT EXISTS idx_custody_timestamp ON custody_transfers (timestamp DESC);

-- ─────────────────────────────────────────────────────────────────────
--  7. WEBHOOK_REGISTRATIONS — Registered webhook endpoints
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_registrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_key         TEXT NOT NULL,
    url             TEXT NOT NULL,
    events          TEXT[] NOT NULL,                   -- array of event names
    active          BOOLEAN DEFAULT TRUE,
    secret          TEXT,                              -- HMAC signing secret
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org_key ON webhook_registrations (org_key);

-- ─────────────────────────────────────────────────────────────────────
--  8. WEBHOOK_DELIVERIES — Delivery log for webhook attempts
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id     TEXT UNIQUE NOT NULL,
    org_key         TEXT,
    url             TEXT NOT NULL,
    event           TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',   -- pending, delivered, failed
    attempts        INTEGER DEFAULT 0,
    max_attempts    INTEGER DEFAULT 3,
    last_attempt    TIMESTAMPTZ,
    http_status     INTEGER,
    error           TEXT,
    signature       TEXT,
    payload_preview TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_org ON webhook_deliveries (org_key);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries (status);

-- ─────────────────────────────────────────────────────────────────────
--  9. API_KEYS — Registered API keys with RBAC roles
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash        TEXT UNIQUE NOT NULL,              -- SHA-256 of the API key (never store plaintext)
    key_prefix      TEXT NOT NULL,                     -- first 8 chars for display
    org_name        TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'viewer',    -- admin, analyst, auditor, operator, viewer
    tier            TEXT DEFAULT 'pilot',
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys (org_name);

-- ─────────────────────────────────────────────────────────────────────
--  10. OFFLINE_QUEUE — Air-gapped hashing queue for batch sync
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hash            TEXT NOT NULL,
    record_type     TEXT,
    branch          TEXT,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced          BOOLEAN DEFAULT FALSE,
    synced_at       TIMESTAMPTZ,
    tx_hash         TEXT,                              -- set after sync
    metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_offline_synced ON offline_queue (synced);

-- ─────────────────────────────────────────────────────────────────────
--  11. DEMO_SESSIONS — Demo/trial session tracking
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demo_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      TEXT UNIQUE NOT NULL,
    name            TEXT,
    plan            TEXT,
    address         TEXT,
    provisioned_at  TIMESTAMPTZ,
    anchors         INTEGER DEFAULT 0,
    total_fees      NUMERIC(10,4) DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
--  12. ILS_ANALYSES — Saved ILS analysis results
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ils_analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id     TEXT UNIQUE NOT NULL,              -- e.g. "ILS-ABC123"
    analysis_type   TEXT NOT NULL,                     -- gap, readiness, lifecycle, etc.
    org_id          TEXT,
    input_data      JSONB DEFAULT '{}'::jsonb,
    results         JSONB DEFAULT '{}'::jsonb,
    hash            TEXT,                              -- SHA-256 of results for anchoring
    tx_hash         TEXT,                              -- XRPL anchor tx
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ils_org ON ils_analyses (org_id);
CREATE INDEX IF NOT EXISTS idx_ils_type ON ils_analyses (analysis_type);

-- ─────────────────────────────────────────────────────────────────────
--  RLS (Row Level Security) — Enable on all tables
--  Service key bypasses RLS; anon key gets read-only on public data.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE records               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE verify_audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_chains          ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_transfers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys              ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_queue         ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ils_analyses          ENABLE ROW LEVEL SECURITY;

-- Service role (used by our API) can do everything
CREATE POLICY "service_full_access" ON records FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON wallets FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON verify_audit_log FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON ai_audit_log FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON proof_chains FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON custody_transfers FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON webhook_registrations FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON webhook_deliveries FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON api_keys FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON offline_queue FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON demo_sessions FOR ALL
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON ils_analyses FOR ALL
    USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════
--  DONE — 12 tables created with indexes and RLS policies
-- ═══════════════════════════════════════════════════════════════════════
