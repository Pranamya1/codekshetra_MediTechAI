/**
 * @file App.tsx
 * @description Root application component for MediCare AI.
 *
 * Auth gate:
 *   loading          → full-screen spinner
 *   not authenticated → <AuthPage /> (sign in / sign up)
 *   authenticated     → <DashboardShell /> (role-based dashboard)
 *
 * Member assignments:
 *  - Member 3 → useAuth hook & Supabase profile table
 *  - Member 2 → PatientDashboard, Sidebar, Header
 *  - Member 4 → DoctorDashboard, VoiceInput
 */

import { useEffect } from 'react'
import { Activity } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import type { AuthProfile } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { PatientDashboard }   from './dashboards/PatientDashboard'
import { CaregiverDashboard } from './dashboards/CaregiverDashboard'
import { DoctorDashboard }    from './dashboards/DoctorDashboard'
import { UserRole, type IUser } from './types/medical'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert AuthProfile → IUser shape used by components */
function profileToIUser(profile: AuthProfile): IUser {
  return {
    id:         profile.id,
    email:      profile.email,
    fullName:   profile.fullName,
    role:       profile.role,
    avatarUrl:  profile.avatarUrl,
    createdAt:  new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
  }
}

// ─── Full-screen loading spinner ──────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center
                    bg-gradient-to-br from-brand-950 via-[#0d3575] to-brand-700">
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        {/* Pulsing logo */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full
                           bg-brand-400/30 animate-ping" />
          <div className="relative flex h-16 w-16 items-center justify-center
                          rounded-2xl bg-white/15 backdrop-blur border border-white/20 shadow-glass">
            <Activity className="w-8 h-8 text-white" strokeWidth={1.8} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white">MediCare AI</p>
          <p className="text-sm text-white/50 mt-1">Loading your health dashboard…</p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <span key={i}
              className="w-2 h-2 rounded-full bg-white/40 animate-pulse-slow"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────

interface DashboardShellProps {
  currentUser: IUser
  onLogout:    () => void
}

function DashboardShell({ currentUser, onLogout }: DashboardShellProps) {
  // Page title update based on role
  useEffect(() => {
    const roleLabel: Record<UserRole, string> = {
      [UserRole.Patient]:   'Patient Dashboard',
      [UserRole.Caregiver]: 'Caregiver Dashboard',
      [UserRole.Doctor]:    'Clinical Dashboard',
    }
    document.title = `${roleLabel[currentUser.role]} · MediCare AI`
    return () => { document.title = 'MediCare AI' }
  }, [currentUser.role])

  const renderDashboard = () => {
    switch (currentUser.role) {
      case UserRole.Patient:
        return <PatientDashboard   currentUser={currentUser} />
      case UserRole.Caregiver:
        return <CaregiverDashboard currentUser={currentUser} />
      case UserRole.Doctor:
        return <DoctorDashboard    currentUser={currentUser} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-bg)]">
      <Sidebar
        currentUser={currentUser}
        activeSection="overview"
        onSectionChange={() => void 0}   // Member 2: wire to router/state
        onLogout={onLogout}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header currentUser={currentUser} onLogout={onLogout} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-6 animate-fade-in"
          aria-label="Dashboard content"
        >
          {renderDashboard()}
        </main>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { session, profile, loading, signIn, signUp, signOut } = useAuth()

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingScreen />
  }

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!session || !profile) {
    return <AuthPage onSignIn={signIn} onSignUp={signUp} />
  }

  // ── Authenticated ──────────────────────────────────────────────────────────
  const currentUser = profileToIUser(profile)

  return <DashboardShell currentUser={currentUser} onLogout={() => void signOut()} />
}
