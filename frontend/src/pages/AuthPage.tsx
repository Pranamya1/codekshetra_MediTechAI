/**
 * @file AuthPage.tsx
 * @description Premium Sign In / Sign Up page for MediCare AI.
 *
 * Layout: Split-screen
 *   Left  → animated brand panel (gradient + feature highlights)
 *   Right → glassmorphism form card with tab-switch animation
 *
 * Sign Up flow:
 *   Step 1 — Enter name, email, password
 *   Step 2 — Pick your role (Patient / Caregiver / Doctor)
 *
 * Sign In flow:
 *   Single step — email + password → Supabase auth
 */

import { useState, useId, type FormEvent } from 'react'
import {
  Activity, Eye, EyeOff, Mail, Lock, User, ArrowRight,
  CheckCircle2, Stethoscope, Users, Heart, Brain,
  Shield, Zap, ChevronLeft, Loader2,
} from 'lucide-react'
import { UserRole } from '../types/medical'
import type { UseAuthReturn } from '../hooks/useAuth'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuthPageProps {
  onSignIn:    UseAuthReturn['signIn']
  onSignUp:    UseAuthReturn['signUp']
  onDemoMode:  (role: UserRole) => void
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthTab  = 'signin' | 'signup'
type SignupStep = 1 | 2

interface SignupForm {
  fullName: string
  email:    string
  password: string
  confirm:  string
  role:     UserRole | null
}

interface SigninForm {
  email:    string
  password: string
}

// ─── Role picker config ───────────────────────────────────────────────────────

const ROLES: {
  role:        UserRole
  label:       string
  subtitle:    string
  icon:        React.ReactNode
  gradient:    string
  activeRing:  string
}[] = [
  {
    role:      UserRole.Patient,
    label:     'Patient',
    subtitle:  'Track my health & vitals',
    icon:      <Heart className="w-6 h-6" />,
    gradient:  'from-brand-500 to-brand-700',
    activeRing:'ring-brand-500',
  },
  {
    role:      UserRole.Caregiver,
    label:     'Caregiver',
    subtitle:  'Monitor loved ones',
    icon:      <Users className="w-6 h-6" />,
    gradient:  'from-violet-500 to-purple-700',
    activeRing:'ring-violet-500',
  },
  {
    role:      UserRole.Doctor,
    label:     'Doctor',
    subtitle:  'Manage my patients',
    icon:      <Stethoscope className="w-6 h-6" />,
    gradient:  'from-emerald-500 to-teal-700',
    activeRing:'ring-emerald-500',
  },
]

// ─── Left Brand Panel ─────────────────────────────────────────────────────────

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full
                    bg-gradient-to-br from-brand-950 via-[#0d3575] to-brand-700
                    p-12 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full
                        bg-brand-500/20 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full
                        bg-brand-300/15 blur-3xl animate-pulse-slow"
             style={{ animationDelay: '2s' }} />
        {/* Grid dots pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]"
             xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl
                        bg-white/15 backdrop-blur border border-white/20 shadow-glass">
          <Activity className="w-6 h-6 text-white" strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-xl font-extrabold text-white tracking-tight">MediCare AI</p>
          <p className="text-[11px] text-white/50 uppercase tracking-widest">Intelligent Health Platform</p>
        </div>
      </div>

      {/* Hero text */}
      <div className="relative z-10">
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
          Your health,<br />
          <span className="text-brand-300">intelligently</span><br />
          monitored.
        </h1>
        <p className="text-white/65 text-base leading-relaxed mb-10 max-w-xs">
          Real-time vitals, AI-powered diagnostics, and seamless care coordination
          — all in one secure platform.
        </p>

        {/* Feature list */}
        <ul className="space-y-4">
          {[
            { icon: <Brain className="w-4 h-4" />,  text: 'Gemini AI diagnostic assistant' },
            { icon: <Zap   className="w-4 h-4" />,  text: 'Real-time vitals monitoring'    },
            { icon: <Shield className="w-4 h-4" />, text: 'HIPAA-ready & encrypted data'   },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center
                               rounded-lg bg-white/10 text-brand-300">
                {icon}
              </span>
              <span className="text-sm text-white/75 font-medium">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom trust badge */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        bg-white/10 border border-white/15 text-xs text-white/60">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Trusted by 10,000+ healthcare professionals
        </div>
      </div>
    </div>
  )
}

// ─── Shared Input ─────────────────────────────────────────────────────────────

interface InputFieldProps {
  id:          string
  label:       string
  type:        string
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
  icon:        React.ReactNode
  rightSlot?:  React.ReactNode
  autoComplete?: string
  required?:   boolean
}

function InputField({ id, label, type, value, onChange, placeholder, icon,
                      rightSlot, autoComplete, required }: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2
                         text-slate-400">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full rounded-xl border border-slate-200 bg-white/80
                     pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400
                     shadow-sm ring-0 transition-all duration-150
                     focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20
                     hover:border-slate-300"
        />
        {rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
    </div>
  )
}

// ─── Password Field wrapper ───────────────────────────────────────────────────

function PasswordInput({ id, label, value, onChange, autoComplete }: {
  id: string; label: string; value: string
  onChange: (v: string) => void; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <InputField
      id={id} label={label} type={show ? 'text' : 'password'}
      value={value} onChange={onChange}
      placeholder="••••••••" autoComplete={autoComplete}
      icon={<Lock className="w-4 h-4" />}
      rightSlot={
        <button type="button" onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="text-slate-400 hover:text-slate-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  )
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-200
                 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in">
      <span className="mt-0.5 text-red-400">⚠</span>
      <span>{message}</span>
    </div>
  )
}

// ─── Sign In Form ─────────────────────────────────────────────────────────────

function SignInForm({ onSignIn, onDemoMode }: {
  onSignIn:   UseAuthReturn['signIn']
  onDemoMode: (role: UserRole) => void
}) {
  const uid = useId()
  const [form, setForm] = useState<SigninForm>({ email: '', password: '' })
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (key: keyof SigninForm) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const err = await onSignIn(form.email.trim(), form.password)
      if (err) {
        // If Supabase isn't configured yet, auto-enter demo mode
        if (err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network')) {
          onDemoMode(UserRole.Doctor) // default demo role for sign-in
          return
        }
        setError(err.message ?? 'Sign in failed. Please try again.')
      }
    } catch {
      // Network error — Supabase not configured, use demo
      onDemoMode(UserRole.Doctor)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
      {error && <ErrorBanner message={error} />}

      <InputField
        id={`${uid}-email`} label="Email address"
        type="email" value={form.email} onChange={set('email')}
        placeholder="you@example.com" autoComplete="email"
        icon={<Mail className="w-4 h-4" />}
      />

      <PasswordInput
        id={`${uid}-password`} label="Password"
        value={form.password} onChange={set('password')}
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 rounded border-slate-300
                                            text-brand-600 focus:ring-brand-500" />
          Remember me
        </label>
        <button type="button"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
          Forgot password?
        </button>
      </div>

      <button id="signin-submit-btn" type="submit" disabled={loading}
        className="btn-primary w-full justify-center py-3 text-base
                   disabled:opacity-60 disabled:cursor-not-allowed">
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
          : <><ArrowRight className="w-4 h-4" /> Sign in to MediCare AI</>
        }
      </button>
    </form>
  )
}

// ─── Sign Up Form — Step 1 ────────────────────────────────────────────────────

function SignUpStep1({
  form, setForm, onNext, error,
}: {
  form: SignupForm
  setForm: React.Dispatch<React.SetStateAction<SignupForm>>
  onNext: () => void
  error: string | null
}) {
  const uid = useId()
  const set = (key: keyof SignupForm) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }))

  const handleNext = (e: FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleNext} className="space-y-5" noValidate>
      {error && <ErrorBanner message={error} />}

      <InputField
        id={`${uid}-name`} label="Full name"
        type="text" value={form.fullName} onChange={set('fullName')}
        placeholder="Alex Johnson" autoComplete="name"
        icon={<User className="w-4 h-4" />}
      />
      <InputField
        id={`${uid}-email`} label="Email address"
        type="email" value={form.email} onChange={set('email')}
        placeholder="you@example.com" autoComplete="email"
        icon={<Mail className="w-4 h-4" />}
      />
      <PasswordInput
        id={`${uid}-pass`} label="Password"
        value={form.password} onChange={set('password')}
        autoComplete="new-password"
      />
      <PasswordInput
        id={`${uid}-confirm`} label="Confirm password"
        value={form.confirm} onChange={set('confirm')}
        autoComplete="new-password"
      />

      <button id="signup-next-btn" type="submit"
        className="btn-primary w-full justify-center py-3 text-base">
        Continue <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-center text-xs text-slate-400">
        By creating an account you agree to our{' '}
        <button type="button" className="text-brand-600 hover:underline">Terms</button>
        {' '}and{' '}
        <button type="button" className="text-brand-600 hover:underline">Privacy Policy</button>.
      </p>
    </form>
  )
}

// ─── Sign Up Form — Step 2 (Role picker) ─────────────────────────────────────

function SignUpStep2({
  form, setForm, onBack, onSubmit, error, loading,
}: {
  form:      SignupForm
  setForm:   React.Dispatch<React.SetStateAction<SignupForm>>
  onBack:    () => void
  onSubmit:  (e: FormEvent) => void
  error:     string | null
  loading:   boolean
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <ErrorBanner message={error} />}

      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">
          I am a… <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          {ROLES.map(({ role, label, subtitle, icon, gradient, activeRing }) => {
            const isActive = form.role === role
            return (
              <button
                key={role}
                type="button"
                id={`role-btn-${role}`}
                onClick={() => setForm((f) => ({ ...f, role }))}
                aria-pressed={isActive}
                className={`
                  relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4
                  transition-all duration-200 cursor-pointer select-none
                  ${isActive
                    ? `border-transparent ring-2 ${activeRing} shadow-lg bg-gradient-to-br ${gradient} text-white`
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm hover:bg-slate-50'
                  }
                `}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl
                  ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {icon}
                </span>
                <span className="font-semibold text-sm">{label}</span>
                <span className={`text-[10px] text-center leading-tight
                  ${isActive ? 'text-white/75' : 'text-slate-400'}`}>
                  {subtitle}
                </span>
                {isActive && (
                  <span className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-white/90" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack}
          className="btn-secondary flex-1 justify-center py-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button id="signup-submit-btn" type="submit"
          disabled={!form.role || loading}
          className="btn-primary flex-[2] justify-center py-3 text-base
                     disabled:opacity-60 disabled:cursor-not-allowed">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
            : <>Create Account <ArrowRight className="w-4 h-4" /></>
          }
        </button>
      </div>
    </form>
  )
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────

export function AuthPage({ onSignIn, onSignUp, onDemoMode }: AuthPageProps) {
  const [tab,         setTab]       = useState<AuthTab>('signin')
  const [signupStep,  setSignupStep] = useState<SignupStep>(1)
  const [error,       setError]     = useState<string | null>(null)
  const [loading,     setLoading]   = useState(false)
  const [emailSent,   setEmailSent] = useState<string | null>(null)  // email address if confirmation pending

  const [signupForm, setSignupForm] = useState<SignupForm>({
    fullName: '', email: '', password: '', confirm: '', role: null,
  })

  // ── Tab switch resets ─────────────────────────────────────────────────────
  const switchTab = (t: AuthTab) => {
    setTab(t)
    setError(null)
    setSignupStep(1)
  }

  // ── Sign-up Step 1 validation ─────────────────────────────────────────────
  const handleStep1Next = () => {
    setError(null)
    const { fullName, email, password, confirm } = signupForm
    if (!fullName.trim())                       return setError('Please enter your full name.')
    if (!email.includes('@'))                   return setError('Please enter a valid email address.')
    if (password.length < 8)                    return setError('Password must be at least 8 characters.')
    if (password !== confirm)                   return setError('Passwords do not match.')
    setSignupStep(2)
  }

  // ── Sign-up Step 2 submit ─────────────────────────────────────────────────
  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!signupForm.role) return setError('Please select your role to continue.')
    setLoading(true)
    try {
      const err = await onSignUp(
        signupForm.email.trim(),
        signupForm.password,
        signupForm.fullName.trim(),
        signupForm.role,
      )
      if (err) {
        // Email confirmation required → show confirmation screen
        if (err.message === 'EMAIL_CONFIRMATION_REQUIRED') {
          setEmailSent(signupForm.email.trim())
          return
        }
        // Supabase not configured → auto demo
        if (err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('url')) {
          onDemoMode(signupForm.role)
          return
        }
        setError(err.message ?? 'Sign up failed. Please try again.')
      }
    } catch {
      if (signupForm.role) onDemoMode(signupForm.role)
    } finally {
      setLoading(false)
    }
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  const stepLabel = tab === 'signup'
    ? (signupStep === 1 ? 'Step 1 of 2 · Your details' : 'Step 2 of 2 · Choose your role')
    : null

  // ── Email confirmation screen ─────────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="flex h-screen w-full items-center justify-center
                      bg-gradient-to-br from-brand-950 via-[#0d3575] to-brand-700">
        <div className="mx-4 w-full max-w-md rounded-3xl bg-white/10 backdrop-blur
                        border border-white/20 shadow-glass p-10 text-center animate-fade-in">
          {/* Envelope icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center
                          rounded-2xl bg-brand-500/20 border border-brand-400/30">
            <Mail className="w-10 h-10 text-brand-300" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Check your inbox!</h2>
          <p className="text-white/65 text-sm leading-relaxed mb-2">
            We sent a confirmation link to:
          </p>
          <p className="text-brand-300 font-semibold text-base mb-6">{emailSent}</p>
          <p className="text-white/50 text-xs mb-8">
            Click the link in the email to activate your account,
            then come back here and sign in.
          </p>
          <button
            id="goto-signin-btn"
            type="button"
            onClick={() => { setEmailSent(null); setTab('signin'); setSignupStep(1) }}
            className="btn-primary w-full justify-center py-3"
          >
            Go to Sign In <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-4 text-xs text-white/30">
            Didn't receive it? Check your spam folder or wait a minute.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] w-full overflow-y-auto lg:overflow-hidden bg-slate-50">

      {/* ── Left brand panel (visible on desktop) ── */}
      <div className="hidden lg:block lg:w-[45%] shrink-0">
        <BrandPanel />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center
                      overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 bg-gradient-to-br from-white to-slate-50">

        {/* Mobile logo (only visible < lg) */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-800">MediCare AI</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="mb-7">
            <h2 className="text-2xl font-extrabold text-slate-900">
              {tab === 'signin' ? 'Welcome back 👋' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tab === 'signin'
                ? 'Sign in to access your MediCare AI dashboard.'
                : 'Join MediCare AI — it takes less than 2 minutes.'
              }
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                id={`auth-tab-${t}`}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200
                  ${tab === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Step indicator for signup */}
          {stepLabel && (
            <div className="flex items-center gap-2 mb-5 animate-fade-in">
              <div className="flex gap-1.5">
                {([1, 2] as const).map((s) => (
                  <span key={s}
                    className={`h-1.5 rounded-full transition-all duration-300
                      ${signupStep >= s ? 'w-8 bg-brand-500' : 'w-4 bg-slate-200'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400 font-medium">{stepLabel}</span>
            </div>
          )}

          {/* ── Form content ── */}
          <div className="animate-fade-in" key={`${tab}-${signupStep}`}>
            {tab === 'signin' && (
              <SignInForm onSignIn={onSignIn} onDemoMode={onDemoMode} />
            )}

            {tab === 'signup' && signupStep === 1 && (
              <SignUpStep1
                form={signupForm} setForm={setSignupForm}
                onNext={handleStep1Next} error={error}
              />
            )}

            {tab === 'signup' && signupStep === 2 && (
              <SignUpStep2
                form={signupForm} setForm={setSignupForm}
                onBack={() => { setSignupStep(1); setError(null) }}
                onSubmit={(e) => void handleSignUpSubmit(e)}
                error={error} loading={loading}
              />
            )}
          </div>

          {/* Bottom toggle */}
          <p className="mt-6 text-center text-sm text-slate-500">
            {tab === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button
              id={`auth-switch-${tab === 'signin' ? 'signup' : 'signin'}`}
              type="button"
              onClick={() => switchTab(tab === 'signin' ? 'signup' : 'signin')}
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              {tab === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </p>

          {/* ── Demo Mode divider ── */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
                or preview without account
              </span>
            </div>
          </div>

          {/* Demo role pills */}
          <div className="space-y-2">
            <p className="text-center text-xs text-slate-400 mb-3">Try Demo — no sign-up needed</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: UserRole.Patient,   label: 'Patient',   icon: <Heart className="w-4 h-4" />,       color: 'hover:bg-brand-50  hover:border-brand-300  hover:text-brand-700'  },
                { role: UserRole.Caregiver, label: 'Caregiver', icon: <Users className="w-4 h-4" />,       color: 'hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700' },
                { role: UserRole.Doctor,    label: 'Doctor',    icon: <Stethoscope className="w-4 h-4" />, color: 'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700' },
              ].map(({ role, label, icon, color }) => (
                <button
                  key={role}
                  id={`demo-btn-${role}`}
                  type="button"
                  onClick={() => onDemoMode(role)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-slate-200
                              bg-white px-2 py-3 text-slate-500 text-xs font-semibold
                              transition-all duration-150 ${color}`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-slate-300 text-center">
          © {new Date().getFullYear()} MediCare AI · For demo only · Not medical advice
        </p>
      </div>
    </div>
  )
}
