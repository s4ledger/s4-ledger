-- =========================================================================
--  009 — Program Milestone Tracker
--  Tracks vessel/craft acquisition milestones per program (contract award,
--  construction, trials, delivery, OWLD, etc.)
--  Part of Phase 2 of the Acquisition Planner suite.
-- =========================================================================

CREATE TABLE IF NOT EXISTS program_milestones (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id          TEXT NOT NULL DEFAULT '',
    user_email      TEXT NOT NULL DEFAULT '',

    -- Program & vessel identification
    program_name    TEXT NOT NULL DEFAULT 'PMS 300',
    vessel_type     TEXT NOT NULL,           -- e.g. YRBM, APL, YTB, AFDM
    hull_number     TEXT NOT NULL,           -- e.g. YRBM-44, APL-67

    -- Contract info
    contract_number TEXT DEFAULT '',
    ship_builder    TEXT DEFAULT '',
    fy_appropriation TEXT DEFAULT '',        -- e.g. FY25, FY26
    uic_code        TEXT DEFAULT '',

    -- Milestone dates
    contract_award_date     DATE,
    construction_start_date DATE,
    launch_date             DATE,
    builders_trials_date    DATE,
    acceptance_trials_date  DATE,
    contract_delivery_date  DATE,
    planned_delivery_date   DATE,
    pm_estimated_delivery   DATE,
    sail_away_date          DATE,
    arrival_date            DATE,

    -- Status & variance
    delivery_status TEXT NOT NULL DEFAULT 'On Track'
        CHECK (delivery_status IN ('On Track','At Risk','Delayed','Complete','Cancelled')),
    owld_days       INTEGER DEFAULT 0,      -- days variance from contract delivery
    notes           TEXT DEFAULT '',

    -- Optional link to Phase 1 acquisition_plan record
    acquisition_plan_id UUID REFERENCES acquisition_plan(id) ON DELETE SET NULL,

    -- Metadata
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mil_org        ON program_milestones (org_id);
CREATE INDEX IF NOT EXISTS idx_mil_program    ON program_milestones (program_name);
CREATE INDEX IF NOT EXISTS idx_mil_vessel     ON program_milestones (vessel_type, hull_number);
CREATE INDEX IF NOT EXISTS idx_mil_status     ON program_milestones (delivery_status);

-- Row-level security
ALTER TABLE program_milestones ENABLE ROW LEVEL SECURITY;

-- Vessel types registry (editable list of vessel types per program)
CREATE TABLE IF NOT EXISTS program_vessel_types (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id        TEXT NOT NULL DEFAULT '',
    program_name  TEXT NOT NULL,
    vessel_type   TEXT NOT NULL,
    vessel_desc   TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, program_name, vessel_type)
);

ALTER TABLE program_vessel_types ENABLE ROW LEVEL SECURITY;
