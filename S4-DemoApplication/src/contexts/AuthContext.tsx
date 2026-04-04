import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { UserRole, Organization } from '../types'

/* ─── Types ──────────────────────────────────────────────────────── */
export interface UserProfile {
  id: string
  email: string
  display_name: string
  role: UserRole
  organization: Organization
  last_login: string
}

interface AuthState {
  /** Supabase session (null if not logged in) */
  session: Session | null
  /** Supabase user object */
  user: User | null
  /** User profile from user_profiles table */
  profile: UserProfile | null
  /** Auth is still initializing */
  loading: boolean
  /** Whether user is in demo mode (no real session) */
  isDemo: boolean
  /** Sign up with email/password */
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  /** Sign in with email/password */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  /** Sign out */
  signOut: () => Promise<void>
  /** Enter demo mode (skip real auth) */
  enterDemo: () => void
  /** Update the user's role/org in their profile */
  updateProfile: (role: UserRole, org: Organization) => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

/* ─── Provider ───────────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  /* ── Fetch or create user profile ───────────────────────── */
  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No profile yet — create one
        const newProfile: UserProfile = {
          id: userId,
          email,
          display_name: email.split('@')[0].replace(/[^a-zA-Z ]/g, ' ').trim(),
          role: 'Program Manager',
          organization: 'Government',
          last_login: new Date().toISOString(),
        }
        const { data: created, error: insertErr } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single()

        if (!insertErr && created) {
          setProfile(created as UserProfile)
        } else {
          // Table may not exist yet — use defaults
          setProfile(newProfile)
        }
        return
      }

      if (data) {
        // Update last_login
        await supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId)

        setProfile(data as UserProfile)
      }
    } catch {
      // Supabase table might not exist yet — graceful fallback
      setProfile({
        id: userId,
        email,
        display_name: email.split('@')[0],
        role: 'Program Manager',
        organization: 'Government',
        last_login: new Date().toISOString(),
      })
    }
  }, [])

  /* ── Initialize auth state ──────────────────────────────── */
  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email ?? '')
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          fetchProfile(s.user.id, s.user.email ?? '')
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  /* ── Auth methods ───────────────────────────────────────── */
  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    setIsDemo(false)
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setIsDemo(false)
  }, [])

  const enterDemo = useCallback(() => {
    setIsDemo(true)
  }, [])

  const updateProfile = useCallback(async (role: UserRole, org: Organization) => {
    if (profile) {
      const updated = { ...profile, role, organization: org }
      setProfile(updated)

      if (user) {
        await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email,
            display_name: profile.display_name,
            role,
            organization: org,
            last_login: profile.last_login,
          })
          .select()
      }
    }
  }, [profile, user])

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      loading,
      isDemo,
      signUp,
      signIn,
      signOut,
      enterDemo,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/* ─── Hook ───────────────────────────────────────────────────────── */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
