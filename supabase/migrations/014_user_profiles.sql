-- ═══════════════════════════════════════════════════════════════════
--  014 — User Profiles for RBAC Persistence
--  Stores user role, organization, and display name.
--  Linked to Supabase Auth via id = auth.uid().
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'Program Manager'
        CHECK (role IN ('Program Manager', 'Contracting Officer', 'Quality Assurance', 'Logistics Specialist')),
    organization TEXT NOT NULL DEFAULT 'Government'
        CHECK (organization IN ('Government', 'Contractor', 'Shipbuilder')),
    last_login TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users read own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Service role can access all profiles (for admin/API use)
CREATE POLICY "Service role full access" ON user_profiles
    FOR ALL USING (
        (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_timestamp();
