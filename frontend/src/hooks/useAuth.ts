/**
 * @file useAuth.ts
 * @description Custom hook that wraps Supabase auth.
 * Provides session state, current user profile (with role),
 * and convenience signIn / signUp / signOut methods.
 *
 * Member 3 owns this hook — extend with profile fetching, RLS, etc.
 */

import { useEffect, useState, useCallback } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../types/supabase'
import { UserRole } from '../types/medical'

// ─── Shape returned by the hook ───────────────────────────────────────────────

export interface AuthProfile {
  id: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
}

export interface UseAuthReturn {
  session:    Session | null
  profile:    AuthProfile | null
  loading:    boolean
  signIn:     (email: string, password: string) => Promise<AuthError | null>
  signUp:     (email: string, password: string, fullName: string, role: UserRole) => Promise<AuthError | null>
  signOut:    () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): UseAuthReturn {
  const [session,  setSession]  = useState<Session | null>(null)
  const [profile,  setProfile]  = useState<AuthProfile | null>(null)
  const [loading,  setLoading]  = useState<boolean>(true)

  // ── Fetch profile from `profiles` table ──────────────────────────────────
  const fetchProfile = useCallback(async (user: User) => {
    // Type alias for the profile row shape we expect from Supabase.
    // Member 3: replace with the generated Database['public']['Tables']['profiles']['Row']
    type ProfileRow = {
      id: string
      full_name: string
      role: string
      avatar_url: string | null
    }

    try {
      const result = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .eq('id', user.id)
        .single()

      // Cast because the scaffolded DB type has an incomplete Row inference
      const { data, error } = result as unknown as {
        data: ProfileRow | null
        error: unknown
      }

      if (error || !data) {
        // Fallback: build profile from auth metadata (set during signUp)
        const meta = user.user_metadata as { full_name?: string; role?: string } | undefined
        setProfile({
          id:       user.id,
          email:    user.email ?? '',
          fullName: meta?.full_name ?? user.email ?? 'User',
          role:     (meta?.role as UserRole) ?? UserRole.Patient,
        })
        return
      }

      setProfile({
        id:        data.id,
        email:     user.email ?? '',
        fullName:  data.full_name,
        role:      data.role as UserRole,
        avatarUrl: data.avatar_url ?? undefined,
      })
    } catch {
      setProfile(null)
    }
  }, [])


  // ── Listen for auth state changes ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    // Initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      if (s?.user) {
        void fetchProfile(s.user).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    // Realtime auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return
      setSession(s)
      if (s?.user) {
        void fetchProfile(s.user)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string): Promise<AuthError | null> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error
    } catch {
      // Supabase URL not configured — return synthetic error so AuthPage can redirect to demo
      return { message: 'Failed to fetch: Supabase not configured', name: 'NetworkError', status: 0 } as AuthError
    }
  }, [])

  // ── Sign up ────────────────────────────────────────────────────────────────
  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
  ): Promise<AuthError | null> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      })

      if (error || !data.user) return error

      // Upsert profile row regardless of email confirmation status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('profiles').upsert({
        id:         data.user.id,
        full_name:  fullName,
        role:       role as string,
        avatar_url: null,
      } as any)

      // If session is null → Supabase requires email confirmation
      // Return a special marker so AuthPage can show the right screen
      if (!data.session) {
        return {
          message: 'EMAIL_CONFIRMATION_REQUIRED',
          name: 'EmailConfirmation',
          status: 0,
        } as AuthError
      }

      return null
    } catch {
      return { message: 'Failed to fetch: Supabase not configured', name: 'NetworkError', status: 0 } as AuthError
    }
  }, [])


  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }, [])

  return { session, profile, loading, signIn, signUp, signOut }
}
