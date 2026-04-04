-- Enhancement #22: Multi-Contract / Multi-Program Portfolio
-- Tables: programs, contracts
-- Links DRL rows to contracts via contract_id

-- ── Programs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT,
  program_manager TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read programs"
  ON public.programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Demo mode program read"
  ON public.programs FOR SELECT
  TO anon
  USING (true);

-- ── Contracts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES public.programs(id),
  contract_number TEXT NOT NULL,
  title TEXT NOT NULL,
  contractor TEXT,
  shipbuilder TEXT,
  award_date DATE,
  pop_end DATE,
  total_value TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closeout', 'complete')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_program_id ON public.contracts(program_id);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Demo mode contract read"
  ON public.contracts FOR SELECT
  TO anon
  USING (true);

-- ── Add contract_id to change_log for cross-contract auditing ──
-- (Optional: only if change_log table exists)
-- ALTER TABLE public.change_log ADD COLUMN IF NOT EXISTS contract_id TEXT;

-- ── Seed default programs ─────────────────────────────────
INSERT INTO public.programs (id, name, short_name, description, program_manager) VALUES
  ('PGM-001', 'U.S. Navy & FMS Boats and Craft', 'PMS 300', 'Boats & Craft acquisition and sustainment for the U.S. Navy and Foreign Military Sales', 'CAPT J. Richardson'),
  ('PGM-002', 'Coastal Patrol Craft Program', 'CPC', 'Next-generation coastal patrol craft for allied nations under FMS', 'CDR L. Alvarez')
ON CONFLICT (id) DO NOTHING;

-- ── Seed default contracts ────────────────────────────────
INSERT INTO public.contracts (id, program_id, contract_number, title, contractor, shipbuilder, award_date, pop_end, total_value, status) VALUES
  ('CTR-001', 'PGM-001', 'N00024-23-C-6200', 'Patrol Boat & RHIB Multi-Hull Acquisition', 'Maritime Defense Systems, Inc.', 'Gulf Coast Shipyard', '2023-06-15', '2027-12-31', '$45.2M', 'active'),
  ('CTR-002', 'PGM-001', 'N00024-24-C-3100', 'Harbor Tug & Utility Craft Services', 'Atlantic Marine Corp.', 'Chesapeake Shipbuilding', '2024-01-20', '2028-06-30', '$28.7M', 'active'),
  ('CTR-003', 'PGM-002', 'N00024-25-C-1500', 'FMS Coastal Patrol Craft — Phase I', 'Sentinel Maritime LLC', 'Bollinger Shipyards', '2025-03-01', '2029-09-30', '$62.4M', 'active')
ON CONFLICT (id) DO NOTHING;

-- Note: DRL rows in the frontend will reference contract_id via the in-memory data model.
-- A future migration can add a contract_id column to a persistent drl_rows table
-- once DRL row persistence is implemented.
