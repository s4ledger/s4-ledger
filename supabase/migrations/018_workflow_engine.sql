-- Enhancement #23: Configurable Workflow Engine
-- Tables: workflow_templates, workflow_states, workflow_transitions
-- Supports custom approval chains with SLA tracking

-- ── Workflow Templates ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]',
  transitions JSONB NOT NULL DEFAULT '[]',
  initial_stage TEXT NOT NULL DEFAULT 'draft',
  terminal_stages TEXT[] NOT NULL DEFAULT ARRAY['accepted', 'rejected'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workflow templates"
  ON public.workflow_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Demo mode workflow template read"
  ON public.workflow_templates FOR SELECT
  TO anon
  USING (true);

-- ── Workflow States (per DRL row) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES public.workflow_templates(id),
  current_stage TEXT NOT NULL DEFAULT 'draft',
  entered_stage_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_states_row_id ON public.workflow_states(row_id);

ALTER TABLE public.workflow_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workflow states"
  ON public.workflow_states FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert workflow states"
  ON public.workflow_states FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update workflow states"
  ON public.workflow_states FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Demo mode workflow state read"
  ON public.workflow_states FOR SELECT
  TO anon
  USING (true);

-- ── Workflow Transition Log ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.workflow_transition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id TEXT NOT NULL,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT,
  performed_by_org TEXT,
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_row_id ON public.workflow_transition_log(row_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_created ON public.workflow_transition_log(created_at DESC);

ALTER TABLE public.workflow_transition_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workflow transitions"
  ON public.workflow_transition_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert workflow transitions"
  ON public.workflow_transition_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Demo mode workflow transition read"
  ON public.workflow_transition_log FOR SELECT
  TO anon
  USING (true);

-- ── Seed default templates ────────────────────────────────
INSERT INTO public.workflow_templates (id, name, description, stages, transitions, initial_stage, terminal_stages) VALUES
  (
    'standard-drl',
    'Standard DRL Review',
    'Default 5-stage workflow: Submit → Review → Disposition → Accept/Revise',
    '[{"id":"draft","label":"Draft / Preparation","responsible":"Shipbuilder","slaDays":null,"order":0},{"id":"submitted","label":"Submitted","responsible":"Shipbuilder","slaDays":null,"order":1},{"id":"under_review","label":"Under Review","responsible":"Contractor","slaDays":30,"order":2},{"id":"disposition","label":"Final Disposition","responsible":"Government","slaDays":14,"order":3},{"id":"revision_required","label":"Revision Required","responsible":"Shipbuilder","slaDays":21,"order":2.5},{"id":"resubmitted","label":"Resubmitted","responsible":"Shipbuilder","slaDays":null,"order":2.7},{"id":"accepted","label":"Accepted","responsible":"Government","slaDays":null,"order":4},{"id":"rejected","label":"Rejected","responsible":"Government","slaDays":null,"order":5}]',
    '[{"from":"draft","to":"submitted","action":"Submit Deliverable","allowedOrgs":["Shipbuilder"],"variant":"primary","requiresComment":false},{"from":"submitted","to":"under_review","action":"Begin Review","allowedOrgs":["Contractor","Government"],"variant":"primary","requiresComment":false},{"from":"under_review","to":"disposition","action":"Forward to PM","allowedOrgs":["Contractor","Government"],"variant":"primary","requiresComment":true},{"from":"under_review","to":"revision_required","action":"Return for Revision","allowedOrgs":["Contractor","Government"],"variant":"warning","requiresComment":true},{"from":"disposition","to":"accepted","action":"Accept Deliverable","allowedOrgs":["Government"],"variant":"success","requiresComment":false},{"from":"disposition","to":"revision_required","action":"Return for Revision","allowedOrgs":["Government"],"variant":"warning","requiresComment":true},{"from":"disposition","to":"rejected","action":"Reject Deliverable","allowedOrgs":["Government"],"variant":"danger","requiresComment":true},{"from":"revision_required","to":"resubmitted","action":"Resubmit Deliverable","allowedOrgs":["Shipbuilder"],"variant":"primary","requiresComment":true},{"from":"resubmitted","to":"under_review","action":"Begin Re-Review","allowedOrgs":["Contractor","Government"],"variant":"primary","requiresComment":false}]',
    'draft',
    ARRAY['accepted', 'rejected']
  ),
  (
    'expedited',
    'Expedited Review',
    'Simplified 3-stage workflow for low-risk or time-critical deliverables',
    '[{"id":"draft","label":"Draft / Preparation","responsible":"Shipbuilder","slaDays":null,"order":0},{"id":"submitted","label":"Submitted for Approval","responsible":"Shipbuilder","slaDays":null,"order":1},{"id":"disposition","label":"Government Review","responsible":"Government","slaDays":7,"order":2},{"id":"accepted","label":"Accepted","responsible":"Government","slaDays":null,"order":3},{"id":"rejected","label":"Rejected","responsible":"Government","slaDays":null,"order":4}]',
    '[{"from":"draft","to":"submitted","action":"Submit Deliverable","allowedOrgs":["Shipbuilder"],"variant":"primary","requiresComment":false},{"from":"submitted","to":"disposition","action":"Begin Review","allowedOrgs":["Government"],"variant":"primary","requiresComment":false},{"from":"disposition","to":"accepted","action":"Accept","allowedOrgs":["Government"],"variant":"success","requiresComment":false},{"from":"disposition","to":"rejected","action":"Reject","allowedOrgs":["Government"],"variant":"danger","requiresComment":true}]',
    'draft',
    ARRAY['accepted', 'rejected']
  )
ON CONFLICT (id) DO NOTHING;
