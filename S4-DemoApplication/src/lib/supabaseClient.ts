import { createClient } from '@supabase/supabase-js'

/* ── Demo-mode fallback credentials ────────────────────────────
 * These are the Supabase *anon* key (public by design) for the
 * demo project.  In production builds (VITE_APP_MODE=production)
 * the VITE_SUPABASE_* env vars MUST be set — the validate-env
 * script enforces this at build time.
 * ────────────────────────────────────────────────────────────── */
const DEMO_URL = 'https://ysmwkkdpjgjokukxolel.supabase.co'
const DEMO_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbXdra2Rwamdqb2t1a3hvbGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzA3NDQsImV4cCI6MjA4NzYwNjc0NH0.4u56RJ61Q5cqnqMqIEWwg50q6MlV8bEvueA45enQgxE'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEMO_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEMO_KEY

if (import.meta.env.VITE_APP_MODE === 'production' && SUPABASE_URL === DEMO_URL) {
  console.warn('[S4 Ledger] Running in production mode with demo Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
