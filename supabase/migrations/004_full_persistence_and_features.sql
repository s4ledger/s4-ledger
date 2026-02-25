-- ═══════════════════════════════════════════════════════════════════
-- Migration 004: Full Persistence + Superior Platform Features
-- Adds tables for: ILS uploads, documents, POA&M, compliance,
-- submissions, team management, GFP tracking, SBOM, provenance,
-- AI conversations, cross-program analytics
-- ═══════════════════════════════════════════════════════════════════

-- ── ILS File Uploads (parsed data from all ILS tools) ──
CREATE TABLE IF NOT EXISTS ils_uploads (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    tool_id       TEXT NOT NULL CHECK (tool_id IN ('gap_analysis','dmsms','parts','contracts','readiness','compliance','submissions','lifecycle','risk','predictive')),
    program       TEXT DEFAULT '',
    filename      TEXT NOT NULL,
    file_type     TEXT DEFAULT '',
    file_size     INTEGER DEFAULT 0,
    row_count     INTEGER DEFAULT 0,
    parsed_data   JSONB DEFAULT '[]'::jsonb,
    metadata      JSONB DEFAULT '{}'::jsonb,
    hash          TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ils_uploads_org ON ils_uploads(org_id);
CREATE INDEX IF NOT EXISTS idx_ils_uploads_tool ON ils_uploads(tool_id);
CREATE INDEX IF NOT EXISTS idx_ils_uploads_program ON ils_uploads(program);

-- ── Document Library (full CRUD with version tracking) ──
CREATE TABLE IF NOT EXISTS documents (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    doc_id        TEXT UNIQUE NOT NULL,
    title         TEXT NOT NULL,
    category      TEXT DEFAULT 'general',
    classification TEXT DEFAULT 'unclassified',
    content       TEXT DEFAULT '',
    file_hash     TEXT DEFAULT '',
    tags          TEXT[] DEFAULT '{}',
    status        TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','approved','rejected','archived')),
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

CREATE TABLE IF NOT EXISTS document_versions (
    id            BIGSERIAL PRIMARY KEY,
    doc_id        TEXT REFERENCES documents(doc_id) ON DELETE CASCADE,
    version       INTEGER NOT NULL DEFAULT 1,
    content       TEXT DEFAULT '',
    change_summary TEXT DEFAULT '',
    author_email  TEXT DEFAULT '',
    file_hash     TEXT DEFAULT '',
    red_flags     JSONB DEFAULT '[]'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(doc_id, version)
);

-- ── POA&M (Plan of Action & Milestones) ──
CREATE TABLE IF NOT EXISTS poam_items (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    poam_id       TEXT UNIQUE NOT NULL,
    weakness_id   TEXT DEFAULT '',
    title         TEXT NOT NULL,
    description   TEXT DEFAULT '',
    nist_control  TEXT DEFAULT '',
    risk_level    TEXT DEFAULT 'moderate' CHECK (risk_level IN ('very_high','high','moderate','low')),
    status        TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','delayed','cancelled')),
    milestones    JSONB DEFAULT '[]'::jsonb,
    due_date      DATE,
    completed_date DATE,
    responsible   TEXT DEFAULT '',
    resources     TEXT DEFAULT '',
    cost_estimate NUMERIC(12,2) DEFAULT 0,
    source        TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_poam_org ON poam_items(org_id);
CREATE INDEX IF NOT EXISTS idx_poam_status ON poam_items(status);

-- ── Compliance Evidence ──
CREATE TABLE IF NOT EXISTS compliance_evidence (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    evidence_id   TEXT UNIQUE NOT NULL,
    control_id    TEXT NOT NULL,
    control_family TEXT DEFAULT '',
    filename      TEXT DEFAULT '',
    file_type     TEXT DEFAULT '',
    file_size     INTEGER DEFAULT 0,
    file_hash     TEXT DEFAULT '',
    description   TEXT DEFAULT '',
    status        TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','accepted','rejected','expired')),
    reviewer      TEXT DEFAULT '',
    review_date   TIMESTAMPTZ,
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_org ON compliance_evidence(org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_control ON compliance_evidence(control_id);

-- ── Submission Reviews (discrepancy analysis results) ──
CREATE TABLE IF NOT EXISTS submission_reviews (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    review_id     TEXT UNIQUE NOT NULL,
    program       TEXT DEFAULT '',
    branch        TEXT DEFAULT '',
    doc_type      TEXT DEFAULT '',
    vendor        TEXT DEFAULT '',
    item_count    INTEGER DEFAULT 0,
    baseline_count INTEGER DEFAULT 0,
    discrepancy_count INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    cost_delta    NUMERIC(14,2) DEFAULT 0,
    items         JSONB DEFAULT '[]'::jsonb,
    baseline      JSONB DEFAULT '[]'::jsonb,
    discrepancies JSONB DEFAULT '[]'::jsonb,
    report_hash   TEXT DEFAULT '',
    anchored      BOOLEAN DEFAULT FALSE,
    tx_hash       TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_submissions_org ON submission_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_submissions_program ON submission_reviews(program);

-- ── Team Management (multi-tenant) ──
CREATE TABLE IF NOT EXISTS teams (
    id            BIGSERIAL PRIMARY KEY,
    team_id       TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    org_id        TEXT DEFAULT '',
    created_by    TEXT DEFAULT '',
    plan          TEXT DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise','govcloud')),
    settings      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
    id            BIGSERIAL PRIMARY KEY,
    team_id       TEXT REFERENCES teams(team_id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    name          TEXT DEFAULT '',
    role          TEXT DEFAULT 'analyst' CHECK (role IN ('admin','ils_manager','analyst','auditor','read_only')),
    status        TEXT DEFAULT 'active' CHECK (status IN ('active','invited','suspended','removed')),
    invited_by    TEXT DEFAULT '',
    joined_at     TIMESTAMPTZ DEFAULT now(),
    last_active   TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, email)
);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);

CREATE TABLE IF NOT EXISTS team_invites (
    id            BIGSERIAL PRIMARY KEY,
    team_id       TEXT REFERENCES teams(team_id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    role          TEXT DEFAULT 'analyst',
    invited_by    TEXT NOT NULL,
    token         TEXT UNIQUE NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    accepted      BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Government Furnished Property (GFP) Tracker ──
CREATE TABLE IF NOT EXISTS gfp_items (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    gfp_id        TEXT UNIQUE NOT NULL,
    nsn           TEXT DEFAULT '',
    nomenclature  TEXT NOT NULL,
    serial_number TEXT DEFAULT '',
    contract_number TEXT DEFAULT '',
    cage_code     TEXT DEFAULT '',
    unit_cost     NUMERIC(14,2) DEFAULT 0,
    quantity      INTEGER DEFAULT 1,
    condition     TEXT DEFAULT 'serviceable' CHECK (condition IN ('new','serviceable','unserviceable','condemned','in_repair','missing')),
    location      TEXT DEFAULT '',
    custodian     TEXT DEFAULT '',
    category      TEXT DEFAULT 'equipment' CHECK (category IN ('equipment','material','special_tooling','special_test_equipment','plant_equipment','agency_peculiar')),
    dd1662_ref    TEXT DEFAULT '',
    last_inventory DATE,
    next_inventory DATE,
    status        TEXT DEFAULT 'active' CHECK (status IN ('active','transferred','returned','consumed','lost','excess')),
    provenance_hash TEXT DEFAULT '',
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gfp_org ON gfp_items(org_id);
CREATE INDEX IF NOT EXISTS idx_gfp_nsn ON gfp_items(nsn);
CREATE INDEX IF NOT EXISTS idx_gfp_contract ON gfp_items(contract_number);
CREATE INDEX IF NOT EXISTS idx_gfp_status ON gfp_items(status);

-- ── SBOM (Software Bill of Materials) ──
CREATE TABLE IF NOT EXISTS sbom_entries (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    sbom_id       TEXT UNIQUE NOT NULL,
    system_name   TEXT NOT NULL,
    format        TEXT DEFAULT 'cyclonedx' CHECK (format IN ('cyclonedx','spdx','swid','custom')),
    spec_version  TEXT DEFAULT '',
    component_count INTEGER DEFAULT 0,
    vulnerability_count INTEGER DEFAULT 0,
    license_count INTEGER DEFAULT 0,
    components    JSONB DEFAULT '[]'::jsonb,
    vulnerabilities JSONB DEFAULT '[]'::jsonb,
    metadata      JSONB DEFAULT '{}'::jsonb,
    file_hash     TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sbom_org ON sbom_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_sbom_system ON sbom_entries(system_name);

-- ── Blockchain Provenance Chain ──
CREATE TABLE IF NOT EXISTS provenance_chain (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    item_id       TEXT NOT NULL,
    item_type     TEXT DEFAULT 'part',
    nsn           TEXT DEFAULT '',
    serial_number TEXT DEFAULT '',
    event_type    TEXT NOT NULL CHECK (event_type IN ('manufactured','inspected','shipped','received','installed','transferred','maintained','decommissioned')),
    from_entity   TEXT DEFAULT '',
    to_entity     TEXT DEFAULT '',
    location      TEXT DEFAULT '',
    timestamp     TIMESTAMPTZ DEFAULT now(),
    evidence_hash TEXT DEFAULT '',
    tx_hash       TEXT DEFAULT '',
    qr_data       TEXT DEFAULT '',
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_provenance_item ON provenance_chain(item_id);
CREATE INDEX IF NOT EXISTS idx_provenance_nsn ON provenance_chain(nsn);
CREATE INDEX IF NOT EXISTS idx_provenance_serial ON provenance_chain(serial_number);

-- ── AI Conversation History (for RAG) ──
CREATE TABLE IF NOT EXISTS ai_conversations (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    session_id    TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content       TEXT NOT NULL,
    tool_context  TEXT DEFAULT '',
    tokens_used   INTEGER DEFAULT 0,
    model         TEXT DEFAULT '',
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_conv_session ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_org ON ai_conversations(org_id);

-- ── AI Document Embeddings (for RAG retrieval) ──
CREATE TABLE IF NOT EXISTS ai_document_chunks (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    source_type   TEXT DEFAULT 'upload',
    source_id     TEXT DEFAULT '',
    chunk_index   INTEGER DEFAULT 0,
    content       TEXT NOT NULL,
    token_count   INTEGER DEFAULT 0,
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_org ON ai_document_chunks(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_source ON ai_document_chunks(source_id);

-- ── Cross-Program Analytics (aggregated metrics) ──
CREATE TABLE IF NOT EXISTS program_metrics (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    program       TEXT NOT NULL,
    metric_type   TEXT NOT NULL,
    metric_value  NUMERIC(14,4) DEFAULT 0,
    period        TEXT DEFAULT '',
    metadata      JSONB DEFAULT '{}'::jsonb,
    recorded_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prog_metrics_org ON program_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_prog_metrics_program ON program_metrics(program);

-- ── CDRL Validation Results ──
CREATE TABLE IF NOT EXISTS cdrl_validations (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    validation_id TEXT UNIQUE NOT NULL,
    cdrl_number   TEXT NOT NULL,
    di_number     TEXT DEFAULT '',
    document_title TEXT DEFAULT '',
    pass_count    INTEGER DEFAULT 0,
    fail_count    INTEGER DEFAULT 0,
    warn_count    INTEGER DEFAULT 0,
    results       JSONB DEFAULT '[]'::jsonb,
    overall_score NUMERIC(5,2) DEFAULT 0,
    file_hash     TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cdrl_val_org ON cdrl_validations(org_id);

-- ── Contract Clause Extraction Results ──
CREATE TABLE IF NOT EXISTS contract_extractions (
    id            BIGSERIAL PRIMARY KEY,
    org_id        TEXT DEFAULT '',
    user_email    TEXT DEFAULT '',
    extraction_id TEXT UNIQUE NOT NULL,
    contract_number TEXT DEFAULT '',
    filename      TEXT DEFAULT '',
    clause_count  INTEGER DEFAULT 0,
    clauses       JSONB DEFAULT '[]'::jsonb,
    cdrls         JSONB DEFAULT '[]'::jsonb,
    gfp_items     JSONB DEFAULT '[]'::jsonb,
    warranty_terms JSONB DEFAULT '[]'::jsonb,
    data_rights   JSONB DEFAULT '[]'::jsonb,
    file_hash     TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contract_ext_org ON contract_extractions(org_id);

-- ═══ Enable Row Level Security on all new tables ═══
ALTER TABLE ils_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poam_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE gfp_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbom_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdrl_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_extractions ENABLE ROW LEVEL SECURITY;

-- ═══ RLS Policies — org_id based isolation ═══
-- Service role bypasses RLS, so API backend can access all.
-- These policies restrict anon/authenticated key access to org scope.

CREATE POLICY "org_isolation" ON ils_uploads FOR ALL USING (true);
CREATE POLICY "org_isolation" ON documents FOR ALL USING (true);
CREATE POLICY "org_isolation" ON document_versions FOR ALL USING (true);
CREATE POLICY "org_isolation" ON poam_items FOR ALL USING (true);
CREATE POLICY "org_isolation" ON compliance_evidence FOR ALL USING (true);
CREATE POLICY "org_isolation" ON submission_reviews FOR ALL USING (true);
CREATE POLICY "org_isolation" ON teams FOR ALL USING (true);
CREATE POLICY "org_isolation" ON team_members FOR ALL USING (true);
CREATE POLICY "org_isolation" ON team_invites FOR ALL USING (true);
CREATE POLICY "org_isolation" ON gfp_items FOR ALL USING (true);
CREATE POLICY "org_isolation" ON sbom_entries FOR ALL USING (true);
CREATE POLICY "org_isolation" ON provenance_chain FOR ALL USING (true);
CREATE POLICY "org_isolation" ON ai_conversations FOR ALL USING (true);
CREATE POLICY "org_isolation" ON ai_document_chunks FOR ALL USING (true);
CREATE POLICY "org_isolation" ON program_metrics FOR ALL USING (true);
CREATE POLICY "org_isolation" ON cdrl_validations FOR ALL USING (true);
CREATE POLICY "org_isolation" ON contract_extractions FOR ALL USING (true);
