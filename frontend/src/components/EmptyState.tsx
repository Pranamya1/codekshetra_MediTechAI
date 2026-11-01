/**
 * @file EmptyState.tsx
 * @description Clean "Getting Started" screen for new users with no data yet.
 * Shown when a patient has completed onboarding but has no medication/vitals records.
 */

import { Activity, Pill, Heart, CalendarDays, ArrowRight, Sparkles, Plus, Bluetooth } from 'lucide-react'

interface EmptyStateProps {
  patientName: string
  condition?: string
  onAddMedication?: () => void
  onLogVitals?: () => void
  onConnectWearable?: () => void
}

const FEATURE_CARDS = [
  {
    id:    'vitals',
    icon:  <Heart      className="w-5 h-5" />,
    title: 'Vitals Monitor',
    desc:  'Track your blood glucose, blood pressure, SpO₂, and heart rate tailored to your condition.',
    colour: 'bg-rose-50 text-rose-500',
    actionText: 'Log vitals now',
  },
  {
    id:    'medications',
    icon:  <Pill       className="w-5 h-5" />,
    title: 'Medication Tracker',
    desc:  'Log morning, afternoon, evening and night doses. Never miss a pill.',
    colour: 'bg-brand-50 text-brand-600',
    actionText: 'Add medication',
  },
  {
    id:    'appointments',
    icon:  <CalendarDays className="w-5 h-5" />,
    title: 'Appointment Reminders',
    desc:  'Never forget a doctor visit. Sync your upcoming consultations.',
    colour: 'bg-violet-50 text-violet-600',
    actionText: '',
  },
  {
    id:    'ai',
    icon:  <Sparkles   className="w-5 h-5" />,
    title: 'AI Health Assistant',
    desc:  'Ask anything — symptoms, side effects, medication interactions.',
    colour: 'bg-emerald-50 text-emerald-600',
    actionText: '',
  },
]

export function EmptyState({ patientName, condition, onAddMedication, onLogVitals, onConnectWearable }: EmptyStateProps) {
  const firstName = patientName.split(' ')[0]

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Hero */}
        <div className="text-center mb-8">
          {/* Animated logo */}
          <div className="mx-auto mb-4 relative w-fit">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl
                            bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl mx-auto">
              <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.8} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center
                             rounded-full bg-emerald-400 border-2 border-white text-[10px] font-bold text-white">
              ✓
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 mb-2">
            Welcome, {firstName}! 👋
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
            {condition ? (
              <>
                Your personal health dashboard for <strong className="text-slate-700">{condition}</strong> is ready.
                Record your baseline vitals or setup your daily prescriptions.
              </>
            ) : (
              'Your health dashboard is ready. Start by logging your baseline vitals or adding your medications.'
            )}
          </p>
        </div>

        {/* Dual Primary Actions (Vitals + Meds) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Action 1: Log Vitals */}
          <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700
                          p-5 sm:p-6 text-white text-center shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 mx-auto mb-3">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-base sm:text-lg font-bold mb-1">Log Vital Signs</h2>
              <p className="text-white/80 text-xs mb-4 min-h-[32px]">
                {condition?.toLowerCase().includes('diabet')
                  ? 'Record blood glucose (fasting/post-meal), blood pressure, and weight.'
                  : condition?.toLowerCase().includes('hyperten')
                  ? 'Record systolic and diastolic blood pressure, pulse, and SpO₂.'
                  : condition?.toLowerCase().includes('copd') || condition?.toLowerCase().includes('asthma')
                  ? 'Record oxygen saturation (SpO₂), respiratory rate, and heart rate.'
                  : 'Record blood pressure, heart rate, oxygen levels, and temperature.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                id="empty-state-log-vitals-btn"
                onClick={onLogVitals}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white text-brand-700
                           font-bold text-xs sm:text-sm px-3.5 py-3 rounded-2xl
                           hover:bg-brand-50 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" /> Log Manually
              </button>
              {onConnectWearable && (
                <button
                  id="empty-state-connect-wearable-btn"
                  onClick={onConnectWearable}
                  className="inline-flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 text-white
                             font-bold text-xs sm:text-sm px-3.5 py-3 rounded-2xl border border-white/30
                             transition-all active:scale-95"
                >
                  <Bluetooth className="w-4 h-4" /> Connect Watch
                </button>
              )}
            </div>
          </div>

          {/* Action 2: Add Medication */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0c1e3d] to-[#1a56a0]
                          p-5 sm:p-6 text-white text-center shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 mx-auto mb-3">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-base sm:text-lg font-bold mb-1">Add Medication</h2>
              <p className="text-white/80 text-xs mb-4 min-h-[32px]">
                Tell us what medicines you take and when — we'll remind you every single day.
              </p>
            </div>
            <button
              id="empty-state-add-medication-btn"
              onClick={onAddMedication}
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700
                         font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl
                         hover:bg-brand-50 transition-all shadow-md active:scale-95"
            >
              Add Medication <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feature cards */}
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 px-1">
          Explore MediCare AI Features
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.title}
              onClick={() => {
                if (card.id === 'vitals' && onLogVitals) onLogVitals()
                else if (card.id === 'medications' && onAddMedication) onAddMedication()
              }}
              className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 transition-all ${
                (card.id === 'vitals' && onLogVitals) || (card.id === 'medications' && onAddMedication)
                  ? 'cursor-pointer hover:border-brand-200 hover:shadow-md'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.colour}`}>
                  {card.icon}
                </div>
                {card.actionText && (
                  <span className="text-[11px] font-semibold text-brand-600 hover:underline">
                    {card.actionText} →
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">{card.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick tip */}
        <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3
                        flex items-start gap-3">
          <span className="text-lg shrink-0">💡</span>
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Tip:</strong> You can also use the{' '}
            <strong>AI Assistant</strong> in the sidebar to ask about your symptoms,
            check drug interactions, or get dietary guidance tailored to your condition.
          </p>
        </div>
      </div>
    </div>
  )
}
