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

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import type { AuthProfile } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'
import { OnboardingFlow } from './pages/OnboardingFlow'
import { AIChatPage } from './pages/AIChatPage'
import { SettingsPage } from './pages/SettingsPage'
import {
  VitalsPage, MedicationsPage, AppointmentsPage,
  LabResultsPage, AlertsPage, PatientsPage,
  CareTasksPage, DiagnosticsPage,
} from './pages/SectionPages'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { MobileBottomNav } from './components/MobileBottomNav'
import { NotificationToast } from './components/NotificationToast'
import { NotificationProvider } from './context/NotificationContext'
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
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Page title update based on section
  useEffect(() => {
    const roleLabel: Record<UserRole, string> = {
      [UserRole.Patient]:   'Patient Dashboard',
      [UserRole.Caregiver]: 'Caregiver Dashboard',
      [UserRole.Doctor]:    'Clinical Dashboard',
    }
    const sectionLabel = activeSection === 'ai-assistant' ? 'AI Assistant' : roleLabel[currentUser.role]
    document.title = `${sectionLabel} · MediCare AI`
    return () => { document.title = 'MediCare AI' }
  }, [currentUser.role, activeSection])

  const renderContent = () => {
    const u = currentUser
    // ── Shared across all roles ──────────────────────────────────────────────
    if (activeSection === 'ai-assistant')  return <AIChatPage        currentUser={u} />
    if (activeSection === 'vitals')        return <VitalsPage        currentUser={u} />
    if (activeSection === 'medications')   return <MedicationsPage   currentUser={u} />
    if (activeSection === 'appointments')  return <AppointmentsPage  currentUser={u} />
    if (activeSection === 'lab-results')   return <LabResultsPage    currentUser={u} />
    if (activeSection === 'alerts')        return <AlertsPage        currentUser={u} onNavigate={setActiveSection} />
    if (activeSection === 'settings')      return <SettingsPage      currentUser={u} onLogout={onLogout} />
    // ── Multi-role ────────────────────────────────────────────────────────────
    if (activeSection === 'patients')      return <PatientsPage      currentUser={u} />
    if (activeSection === 'tasks')         return <CareTasksPage     currentUser={u} />
    if (activeSection === 'diagnostics')   return <DiagnosticsPage   currentUser={u} />
    // ── Overview (default) ────────────────────────────────────────────────────
    switch (u.role) {
      case UserRole.Patient:   return <PatientDashboard   currentUser={u} />
      case UserRole.Caregiver: return <CaregiverDashboard currentUser={u} />
      case UserRole.Doctor:    return <DoctorDashboard    currentUser={u} />
    }
  }

  return (
    <div className="flex h-[100dvh] bg-white p-1 sm:p-1.5 md:p-2 gap-1 sm:gap-2 overflow-hidden">
      <NotificationToast onNavigateToAlerts={() => setActiveSection('alerts')} />
      <Sidebar
        currentUser={currentUser}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={onLogout}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col gap-1 sm:gap-1.5 md:gap-2 overflow-hidden min-w-0">
        <Header
          currentUser={currentUser}
          activeSection={activeSection}
          onLogout={onLogout}
          onToggleMobileSidebar={() => setMobileSidebarOpen((o) => !o)}
          onNavigateSection={setActiveSection}
        />
        <main
          id="main-content"
          className="flex-1 overflow-hidden rounded-2xl animate-fade-in relative pb-14 md:pb-0"
          aria-label="Dashboard content"
        >
          {renderContent()}
        </main>
      </div>

      <MobileBottomNav
        currentUser={currentUser}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onOpenDrawer={() => setMobileSidebarOpen(true)}
      />
    </div>
  )
}

// ─── Demo users (no Supabase needed) ────────────────────────────────────────

const DEMO_PROFILES: Record<UserRole, AuthProfile> = {
  [UserRole.Patient]: {
    id: 'demo-patient-001',
    email: 'alex@demo.com',
    fullName: 'Alex Johnson',
    role: UserRole.Patient,
  },
  [UserRole.Caregiver]: {
    id: 'demo-caregiver-001',
    email: 'sarah@demo.com',
    fullName: 'Sarah Mitchell',
    role: UserRole.Caregiver,
  },
  [UserRole.Doctor]: {
    id: 'demo-doctor-001',
    email: 'dr.patel@demo.com',
    fullName: 'Dr. Priya Patel',
    role: UserRole.Doctor,
  },
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { session, profile, loading, signIn, signUp, signOut } = useAuth()
  const [demoProfile, setDemoProfile] = useState<AuthProfile | null>(null)

  // Track per-user onboarding completion in localStorage
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() =>
    localStorage.getItem('medicare_onboarding_done') === 'true'
  )
  const completeOnboarding = () => {
    localStorage.setItem('medicare_onboarding_done', 'true')
    setOnboardingDone(true)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingScreen />
  }

  // ── Demo mode (bypasses Supabase entirely) ─────────────────────────────────
  if (demoProfile) {
    const currentUser = profileToIUser(demoProfile)
    return (
      <NotificationProvider>
        <DashboardShell
          currentUser={currentUser}
          onLogout={() => setDemoProfile(null)}
        />
      </NotificationProvider>
    )
  }

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!session || !profile) {
    return (
      <AuthPage
        onSignIn={signIn}
        onSignUp={signUp}
        onDemoMode={(role) => setDemoProfile(DEMO_PROFILES[role])}
      />
    )
  }

  // ── Authenticated via Supabase ─────────────────────────────────────────────
  const currentUser = profileToIUser(profile)

  // New Patient users → show onboarding before dashboard
  if (!onboardingDone && profile.role === UserRole.Patient) {
    return (
      <OnboardingFlow
        currentUser={currentUser}
        onComplete={completeOnboarding}
      />
    )
  }

  return (
    <NotificationProvider>
      <DashboardShell currentUser={currentUser} onLogout={() => void signOut()} />
    </NotificationProvider>
  )
}
