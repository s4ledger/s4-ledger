-- =========================================================================
--  011 — Living Program Ledger, Impact Simulator, Secure Collaboration
--  Tables for the three new feature endpoints added in v5.12.37.
-- =========================================================================

-- ── LPL Snapshots — versioned AI-generated program summaries ────────────
CREATE TABLE IF NOT EXISTS lpl_snapshots (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id          TEXT NOT NULL DEFAULT '',
    program_name    TEXT NOT NULL DEFAULT '',
    period          TEXT NOT NULL DEFAULT '',
    version_num     INT NOT NULL DEFAULT 1,
    executive_overview TEXT DEFAULT '',
    sections_json   JSONB NOT NULL DEFAULT '{}',
    ai_provider     TEXT DEFAULT '',
    analysis_data   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lpl_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lpl_service_full_access" ON lpl_snapshots
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lpl_snapshots_program
    ON lpl_snapshots (program_name, created_at DESC);

-- ── Impact Simulations — stored cascade risk analyses ───────────────────
CREATE TABLE IF NOT EXISTS impact_simulations (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id          TEXT NOT NULL DEFAULT '',
    program_name    TEXT DEFAULT '',
    risk_label      TEXT NOT NULL DEFAULT '',
    severity        TEXT DEFAULT '',
    schedule_delay  INT DEFAULT 0,
    cost_impact     NUMERIC DEFAULT 0,
    readiness_drop  NUMERIC DEFAULT 0,
    downstream_programs INT DEFAULT 0,
    source_tool     TEXT DEFAULT '',
    explanation     TEXT DEFAULT '',
    mitigations     JSONB DEFAULT '[]',
    ai_provider     TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE impact_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pis_service_full_access" ON impact_simulations
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_impact_simulations_program
    ON impact_simulations (program_name, created_at DESC);

-- ── SCN Participants — collaboration members + permissions ──────────────
CREATE TABLE IF NOT EXISTS scn_participants (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id          TEXT NOT NULL DEFAULT '',
    view_id         TEXT NOT NULL DEFAULT '',     -- e.g. 'drl-main', 'drl-sub'
    email           TEXT NOT NULL DEFAULT '',
    name            TEXT DEFAULT '',
    org             TEXT DEFAULT 'External',
    permission      TEXT DEFAULT 'View',          -- View, Comment, Edit
    invite_token    TEXT DEFAULT '',
    invite_expires  TIMESTAMPTZ,
    accepted_at     TIMESTAMPTZ,
    active          BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scn_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scn_participants_service_full_access" ON scn_participants
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scn_participants_view
    ON scn_participants (view_id, active);
CREATE INDEX IF NOT EXISTS idx_scn_participants_email
    ON scn_participants (email);

-- ── SCN Share Links — cryptographic share tokens with expiry ────────────
CREATE TABLE IF NOT EXISTS scn_share_links (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id          TEXT NOT NULL DEFAULT '',
    view_name       TEXT NOT NULL DEFAULT '',
    token           TEXT NOT NULL DEFAULT '',
    hmac_signature  TEXT NOT NULL DEFAULT '',
    expires_at      TIMESTAMPTZ NOT NULL,
    created_by      TEXT DEFAULT '',
    revoked         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scn_share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scn_share_links_service_full_access" ON scn_share_links
    FOR ALL USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scn_share_links_token
    ON scn_share_links (token) WHERE NOT revoked;

-- ── SCN Collaboration State — per-program collaboration on/off ──────────
CREATE TABLE IF NOT EXISTS scn_collaboration_state (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id          TEXT NOT NULL DEFAULT '',
    view_id         TEXT NOT NULL DEFAULT '',
    enabled         BOOLEAN DEFAULT false,
    signed_by       TEXT DEFAULT '',
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scn_collaboration_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scn_collab_state_service_full_access" ON scn_collaboration_state
    FOR ALL USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scn_collab_state_view
    ON scn_collaboration_state (org_id, view_id);
