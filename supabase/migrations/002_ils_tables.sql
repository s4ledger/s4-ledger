-- ═══════════════════════════════════════════════════════════════════════
--  S4 Ledger — Migration 002: ILS Tool Tables
--  Creates persistent storage for all ILS tools that previously
--  returned hardcoded/static data.
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
--  1. DMSMS_ITEMS — Diminishing Manufacturing Sources tracker
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dmsms_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    program         TEXT NOT NULL DEFAULT 'ddg51',
    nsn             TEXT,
    part_name       TEXT NOT NULL,
    cage_code       TEXT,
    manufacturer    TEXT,
    status          TEXT NOT NULL DEFAULT 'Active',       -- Active, At Risk, Watch, Obsolete, End of Life
    severity        TEXT DEFAULT 'None',                  -- Critical, High, Medium, Low, None
    replacement_nsn TEXT,
    mitigation      TEXT,
    notes           TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dmsms_org ON dmsms_items (org_id);
CREATE INDEX IF NOT EXISTS idx_dmsms_program ON dmsms_items (program);
CREATE INDEX IF NOT EXISTS idx_dmsms_status ON dmsms_items (status);

-- ─────────────────────────────────────────────────────────────────────
--  2. PARTS_CATALOG — Cross-reference parts database
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts_catalog (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    nsn             TEXT NOT NULL,
    part_name       TEXT NOT NULL,
    cage_code       TEXT,
    manufacturer    TEXT,
    status          TEXT NOT NULL DEFAULT 'Available',    -- Available, Low Stock, Backordered, Discontinued
    unit_price      NUMERIC(12,2),
    lead_time_days  INTEGER,
    alternates      JSONB DEFAULT '[]'::jsonb,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parts_org ON parts_catalog (org_id);
CREATE INDEX IF NOT EXISTS idx_parts_nsn ON parts_catalog (nsn);
CREATE INDEX IF NOT EXISTS idx_parts_name ON parts_catalog (part_name);

-- ─────────────────────────────────────────────────────────────────────
--  3. WARRANTY_ITEMS — Warranty & service contract tracker
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warranty_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    program         TEXT NOT NULL DEFAULT 'ddg51',
    system_name     TEXT NOT NULL,
    contract_type   TEXT DEFAULT 'OEM Warranty',
    status          TEXT NOT NULL DEFAULT 'Active',       -- Active, Expiring, Expired
    start_date      DATE,
    end_date        DATE,
    days_left       INTEGER,
    value           NUMERIC(12,2) DEFAULT 0,
    vendor          TEXT,
    notes           TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warranty_org ON warranty_items (org_id);
CREATE INDEX IF NOT EXISTS idx_warranty_program ON warranty_items (program);
CREATE INDEX IF NOT EXISTS idx_warranty_status ON warranty_items (status);

-- ─────────────────────────────────────────────────────────────────────
--  4. SUPPLY_CHAIN_RISKS — Supply chain risk assessments
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supply_chain_risks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    program         TEXT NOT NULL DEFAULT 'ddg51',
    part_name       TEXT NOT NULL,
    nsn             TEXT,
    supplier        TEXT,
    risk_score      INTEGER DEFAULT 0,                    -- 0-100
    risk_level      TEXT DEFAULT 'low',                   -- critical, high, medium, low
    factors         JSONB DEFAULT '[]'::jsonb,
    eta_impact      TEXT,
    mitigation      TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scr_org ON supply_chain_risks (org_id);
CREATE INDEX IF NOT EXISTS idx_scr_program ON supply_chain_risks (program);
CREATE INDEX IF NOT EXISTS idx_scr_level ON supply_chain_risks (risk_level);

-- ─────────────────────────────────────────────────────────────────────
--  5. CONTRACT_ITEMS — CDRL, mods, and deliverable tracking
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    contract_id     TEXT NOT NULL DEFAULT 'N00024-25-C-5501',
    item_id         TEXT NOT NULL,                        -- e.g. A001, MOD-P00001
    description     TEXT NOT NULL,
    item_type       TEXT DEFAULT 'cdrl',                  -- cdrl, mod, deliverable
    di_number       TEXT,                                 -- DI reference
    due_date        DATE,
    status          TEXT DEFAULT 'on_track',              -- on_track, delivered, overdue, cancelled
    anchored        BOOLEAN DEFAULT FALSE,
    anchor_hash     TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contract_org ON contract_items (org_id);
CREATE INDEX IF NOT EXISTS idx_contract_id ON contract_items (contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_status ON contract_items (status);

-- ─────────────────────────────────────────────────────────────────────
--  6. DIGITAL_THREAD_ITEMS — ECPs, BOMs, config changes
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS digital_thread_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    platform        TEXT NOT NULL DEFAULT 'ddg51',
    item_id         TEXT NOT NULL,                        -- e.g. ECP-DDG51-2024001
    description     TEXT NOT NULL,
    item_type       TEXT DEFAULT 'Class I',               -- Class I, Class II, Rev letter
    status          TEXT DEFAULT 'pending',               -- pending, approved, implemented, rejected
    anchored        BOOLEAN DEFAULT FALSE,
    anchor_hash     TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dt_org ON digital_thread_items (org_id);
CREATE INDEX IF NOT EXISTS idx_dt_platform ON digital_thread_items (platform);

-- ─────────────────────────────────────────────────────────────────────
--  7. PREDICTIVE_MAINT — Predictive maintenance predictions
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictive_maint (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    platform        TEXT NOT NULL DEFAULT 'ddg51',
    system_name     TEXT NOT NULL,
    component       TEXT NOT NULL,
    failure_mode    TEXT,
    confidence      INTEGER DEFAULT 0,                    -- 0-100
    eta_days        INTEGER,
    cost_unplanned  NUMERIC(12,2) DEFAULT 0,
    urgent          BOOLEAN DEFAULT FALSE,
    model_version   TEXT DEFAULT '1.0',
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_org ON predictive_maint (org_id);
CREATE INDEX IF NOT EXISTS idx_pm_platform ON predictive_maint (platform);
CREATE INDEX IF NOT EXISTS idx_pm_urgent ON predictive_maint (urgent);

-- ─────────────────────────────────────────────────────────────────────
--  8. ACTION_ITEMS — Cross-tool action item tracker
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    item_id         TEXT NOT NULL,                        -- e.g. AI-001
    title           TEXT NOT NULL,
    severity        TEXT DEFAULT 'warning',               -- critical, warning, info
    source_tool     TEXT,                                 -- dmsms, warranty, readiness, etc.
    estimated_cost  NUMERIC(12,2) DEFAULT 0,
    schedule        TEXT,
    done            BOOLEAN DEFAULT FALSE,
    assigned_to     TEXT,
    notes           TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_org ON action_items (org_id);
CREATE INDEX IF NOT EXISTS idx_ai_done ON action_items (done);
CREATE INDEX IF NOT EXISTS idx_ai_severity ON action_items (severity);

-- ─────────────────────────────────────────────────────────────────────
--  9. CALENDAR_EVENTS — ILS milestone / event calendar
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    event_id        TEXT NOT NULL,
    title           TEXT NOT NULL,
    event_date      DATE NOT NULL,
    event_time      TIME,
    event_type      TEXT DEFAULT 'info',                  -- critical, warning, info
    source_tool     TEXT,
    description     TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cal_org ON calendar_events (org_id);
CREATE INDEX IF NOT EXISTS idx_cal_date ON calendar_events (event_date);

-- ─────────────────────────────────────────────────────────────────────
--  10. AUDIT_VAULT — Secure document/report storage
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_vault (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    doc_id          TEXT NOT NULL,
    title           TEXT NOT NULL,
    doc_type        TEXT DEFAULT 'audit_report',          -- audit_report, compliance_cert, inspection
    classification  TEXT DEFAULT 'unclassified',
    hash            TEXT,
    anchored        BOOLEAN DEFAULT FALSE,
    anchor_tx       TEXT,
    file_size_bytes INTEGER,
    uploaded_by     TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vault_org ON audit_vault (org_id);
CREATE INDEX IF NOT EXISTS idx_vault_type ON audit_vault (doc_type);

-- ─────────────────────────────────────────────────────────────────────
--  11. DOC_LIBRARY — Technical document library
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doc_library (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    doc_id          TEXT NOT NULL,
    title           TEXT NOT NULL,
    doc_type        TEXT DEFAULT 'technical_manual',      -- technical_manual, drawing, spec, sow, cdrl
    di_number       TEXT,
    revision        TEXT,
    status          TEXT DEFAULT 'current',               -- current, superseded, draft
    hash            TEXT,
    anchored        BOOLEAN DEFAULT FALSE,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doc_org ON doc_library (org_id);
CREATE INDEX IF NOT EXISTS idx_doc_type ON doc_library (doc_type);

-- ─────────────────────────────────────────────────────────────────────
--  12. COMPLIANCE_SCORES — Compliance scorecard tracking
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          TEXT NOT NULL DEFAULT '',
    program         TEXT NOT NULL DEFAULT 'ddg51',
    framework       TEXT NOT NULL,                        -- NIST-800-171, CMMC, DFARS, ITAR
    score           NUMERIC(5,2) DEFAULT 0,               -- 0-100
    max_score       NUMERIC(5,2) DEFAULT 100,
    level           TEXT,                                 -- e.g. CMMC Level 2
    findings        INTEGER DEFAULT 0,
    critical_gaps   INTEGER DEFAULT 0,
    assessment_date DATE,
    assessor        TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_org ON compliance_scores (org_id);
CREATE INDEX IF NOT EXISTS idx_comp_framework ON compliance_scores (framework);

-- ─────────────────────────────────────────────────────────────────────
--  RLS + Policies for all new tables
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE dmsms_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_catalog        ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_risks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_thread_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_maint     ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_vault          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_library          ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_scores    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_access" ON dmsms_items          FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON parts_catalog        FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON warranty_items       FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON supply_chain_risks   FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON contract_items       FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON digital_thread_items FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON predictive_maint     FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON action_items         FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON calendar_events      FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON audit_vault          FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON doc_library          FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_full_access" ON compliance_scores    FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════
--  DONE — 12 ILS tables created with indexes and RLS policies
-- ═══════════════════════════════════════════════════════════════════════
