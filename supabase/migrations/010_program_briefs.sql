-- =========================================================================
--  010 — Program Brief Engine
--  Stores slide-based briefs (Program Status, Milestone Review, POM,
--  PB, ILSMT, ILSMP, IPR) with JSONB slide data, permissions, and
--  version history.  Part of Phase 3 of the Acquisition Planner suite.
-- =========================================================================

-- ── Brief Templates (system-provided slide layouts) ─────────────────────
CREATE TABLE IF NOT EXISTS brief_templates (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,       -- e.g. 'program-status'
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    brief_type      TEXT NOT NULL,              -- POM, PB, ILSMT, ILSMP, IPR, STATUS, MILESTONE
    slides_json     JSONB NOT NULL DEFAULT '[]',
    slide_master    JSONB DEFAULT '{}',         -- default fonts, colors, footer
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Program Briefs (user-created briefs) ────────────────────────────────
CREATE TABLE IF NOT EXISTS program_briefs (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id          TEXT NOT NULL DEFAULT '',
    user_email      TEXT NOT NULL DEFAULT '',

    -- Brief metadata
    title           TEXT NOT NULL DEFAULT 'Untitled Brief',
    brief_type      TEXT NOT NULL DEFAULT 'STATUS',
    template_id     UUID REFERENCES brief_templates(id),
    program_name    TEXT DEFAULT '',

    -- Slide data (array of slide objects)
    slides_json     JSONB NOT NULL DEFAULT '[]',
    slide_master    JSONB DEFAULT '{}',

    -- Permissions
    access_level    TEXT DEFAULT 'private',     -- private, team, org, public
    editors         TEXT[] DEFAULT '{}',         -- emails with edit access
    viewers         TEXT[] DEFAULT '{}',         -- emails with view-only access

    -- Version tracking
    version         INTEGER DEFAULT 1,
    parent_id       UUID REFERENCES program_briefs(id),

    -- Anchor
    anchor_hash     TEXT DEFAULT '',
    anchor_tx       TEXT DEFAULT '',

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Row-Level Security ──────────────────────────────────────────────────
ALTER TABLE brief_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_briefs  ENABLE ROW LEVEL SECURITY;

-- Templates: anyone can read
CREATE POLICY "templates_read" ON brief_templates FOR SELECT USING (true);

-- Briefs: users see own org + shared briefs
CREATE POLICY "briefs_select" ON program_briefs FOR SELECT USING (
    auth.uid()::text = user_email
    OR org_id IN (SELECT org_id FROM program_briefs WHERE user_email = auth.uid()::text)
    OR access_level = 'public'
    OR auth.uid()::text = ANY(viewers)
    OR auth.uid()::text = ANY(editors)
);

CREATE POLICY "briefs_insert" ON program_briefs FOR INSERT WITH CHECK (
    auth.uid()::text = user_email
);

CREATE POLICY "briefs_update" ON program_briefs FOR UPDATE USING (
    auth.uid()::text = user_email
    OR auth.uid()::text = ANY(editors)
);

CREATE POLICY "briefs_delete" ON program_briefs FOR DELETE USING (
    auth.uid()::text = user_email
);

-- ── Index for fast lookups ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_briefs_org    ON program_briefs (org_id);
CREATE INDEX IF NOT EXISTS idx_briefs_user   ON program_briefs (user_email);
CREATE INDEX IF NOT EXISTS idx_briefs_type   ON program_briefs (brief_type);
CREATE INDEX IF NOT EXISTS idx_briefs_parent ON program_briefs (parent_id);
