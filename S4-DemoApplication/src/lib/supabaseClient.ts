import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ysmwkkdpjgjokukxolel.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbXdra2Rwamdqb2t1a3hvbGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzA3NDQsImV4cCI6MjA4NzYwNjc0NH0.4u56RJ61Q5cqnqMqIEWwg50q6MlV8bEvueA45enQgxE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
