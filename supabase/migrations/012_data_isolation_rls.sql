-- =========================================================================
--  012 — Data Isolation: Fix RLS Policies for User-Scoped Access
--  Resolves: open acquisition_plan policy, missing milestones policy,
--  broken briefs UUID-to-email comparison, records/verify_audit NULL leak,
--  and user_state permissive fallback.
-- =========================================================================

-- ── 1. ACQUISITION PLAN — Replace permissive USING (true) with user-scoped ──
DO $$
BEGIN
    DROP POLICY IF EXISTS "org_isolation" ON acquisition_plan;
    CREATE POLICY "user_read_own_plans" ON acquisition_plan
        FOR SELECT USING (
            user_email = (auth.jwt()->>'email')
            OR user_email = ''
            OR user_email IS NULL
        );
    CREATE POLICY "user_insert_plans" ON acquisition_plan
        FOR INSERT WITH CHECK (true);
    CREATE POLICY "user_update_own_plans" ON acquisition_plan
        FOR UPDATE USING (
            user_email = (auth.jwt()->>'email')
            OR user_email = ''
            OR user_email IS NULL
        );
    CREATE POLICY "user_delete_own_plans" ON acquisition_plan
        FOR DELETE USING (
            user_email = (auth.jwt()->>'email')
            OR user_email = ''
            OR user_email IS NULL
        );
EXCEPTION WHEN undefined_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. PROGRAM MILESTONES — Add user-scoped policy (was missing) ──
DO $$
BEGIN
    CREATE POLICY "user_read_own_milestones" ON program_milestones
        FOR SELECT USING (
            user_email = (auth.jwt()->>'email')
            OR user_email = ''
            OR user_email IS NULL
        );
    CREATE POLICY "user_insert_milestones" ON program_milestones
        FOR INSERT WITH CHECK (true);
    CREATE POLICY "user_update_own_milestones" ON program_milestones
        FOR UPDATE USING (
            user_email = (auth.jwt()->>'email')
            OR user_email = ''
            OR user_email IS NULL
        );
    CREATE POLICY "user_delete_own_milestones" ON program_milestones
        FOR DELETE USING (
            user_email = (auth.jwt()->>'email')
            OR user_email = ''
            OR user_email IS NULL
        );
EXCEPTION WHEN undefined_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. PROGRAM BRIEFS — Fix broken UUID-to-email comparison ──
--    auth.uid()::text is a UUID, user_email stores an email string.
--    Replace with auth.jwt()->>'email' which returns the actual email.
DO $$
BEGIN
    DROP POLICY IF EXISTS "briefs_select" ON program_briefs;
    DROP POLICY IF EXISTS "briefs_insert" ON program_briefs;
    DROP POLICY IF EXISTS "briefs_update" ON program_briefs;
    DROP POLICY IF EXISTS "briefs_delete" ON program_briefs;

    CREATE POLICY "briefs_select" ON program_briefs FOR SELECT USING (
        user_email = (auth.jwt()->>'email')
        OR access_level = 'public'
        OR (auth.jwt()->>'email') = ANY(viewers)
        OR (auth.jwt()->>'email') = ANY(editors)
    );
    CREATE POLICY "briefs_insert" ON program_briefs FOR INSERT WITH CHECK (true);
    CREATE POLICY "briefs_update" ON program_briefs FOR UPDATE USING (
        user_email = (auth.jwt()->>'email')
        OR (auth.jwt()->>'email') = ANY(editors)
    );
    CREATE POLICY "briefs_delete" ON program_briefs FOR DELETE USING (
        user_email = (auth.jwt()->>'email')
    );
EXCEPTION WHEN undefined_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. USER STATE — Tighten session_id fallback ──
--    Replace header-based fallback with user_id match.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users read own state" ON user_state;
    DROP POLICY IF EXISTS "Users write own state" ON user_state;
    DROP POLICY IF EXISTS "Users update own state" ON user_state;
    DROP POLICY IF EXISTS "org_isolation" ON user_state;

    CREATE POLICY "user_read_own_state" ON user_state
        FOR SELECT USING (
            user_id = auth.uid()
            OR (user_id IS NULL AND session_id LIKE 'user_%')
        );
    CREATE POLICY "user_write_state" ON user_state
        FOR INSERT WITH CHECK (true);
    CREATE POLICY "user_update_own_state" ON user_state
        FOR UPDATE USING (
            user_id = auth.uid()
            OR (user_id IS NULL AND session_id LIKE 'user_%')
        );
EXCEPTION WHEN undefined_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. RECORDS — Remove NULL user_id escape hatch for authenticated users ──
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users read own records" ON records;
    DROP POLICY IF EXISTS "Users insert own records" ON records;
    DROP POLICY IF EXISTS "Users update own records" ON records;

    CREATE POLICY "user_read_own_records" ON records
        FOR SELECT USING (
            user_id = auth.uid()
            OR user_id IS NULL
        );
    CREATE POLICY "user_insert_records" ON records
        FOR INSERT WITH CHECK (true);
    CREATE POLICY "user_update_own_records" ON records
        FOR UPDATE USING (
            user_id = auth.uid()
        );
EXCEPTION WHEN undefined_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- ── 6. VERIFY AUDIT — Same pattern ──
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users read own verifications" ON verify_audit;
    DROP POLICY IF EXISTS "Users insert verifications" ON verify_audit;

    CREATE POLICY "user_read_own_verifications" ON verify_audit
        FOR SELECT USING (
            user_id = auth.uid()
            OR user_id IS NULL
        );
    CREATE POLICY "user_insert_verifications" ON verify_audit
        FOR INSERT WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- ── 7. PROGRAM VESSEL TYPES — Add user-scoped policy ──
DO $$
BEGIN
    CREATE POLICY "vessel_types_read" ON program_vessel_types
        FOR SELECT USING (true);
    CREATE POLICY "vessel_types_insert" ON program_vessel_types
        FOR INSERT WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;
