/**
 * @file SectionPages.tsx
 * @description Active page components for every sidebar nav section.
 * Each renders a fully styled page. Sections: vitals, medications,
 * appointments, lab-results, alerts, patients, tasks, diagnostics.
 */

import { useState } from 'react'
import {
  Heart, Activity, Droplets, Thermometer, Wind,
  Pill, CalendarDays, FlaskConical, Bell, Users,
  FileText, Stethoscope, CheckCircle2, AlertCircle,
  Clock, TrendingUp, PlusCircle, ChevronRight, Info,
  AlertTriangle, Trash2, Sparkles, Volume2, VolumeX,
  ShieldAlert, Check,
} from 'lucide-react'
import { type IUser, UserRole } from '../types/medical'
import { AddPatientModal, type NewPatientData } from '../components/AddPatientModal'
import { LogVitalsModal } from '../components/LogVitalsModal'
import { usePatientData } from '../hooks/usePatientData'
import { useNotifications, type AppAlert } from '../context/NotificationContext'
import {
  getStoredPatients,
  CAREGIVER_PATIENTS_STORAGE_KEY,
  type CaregiverPatientItem,
} from '../dashboards/CaregiverDashboard'
import { BACKEND_BASE_URL } from '../services/api'

interface PageProps {
  currentUser: IUser
  onNavigate?: (section: string) => void
}

// ─── Shared empty/coming-soon card ───────────────────────────────────────────

function ComingSoonCard({ icon, title, desc, colour = 'brand' }: {
  icon: React.ReactNode; title: string; desc: string; colour?: string
}) {
  const colours: Record<string, string> = {
    brand:   'bg-brand-50 text-brand-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    violet:  'bg-violet-50 text-violet-500',
    amber:   'bg-amber-50 text-amber-500',
    rose:    'bg-rose-50 text-rose-500',
  }
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${colours[colour]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{desc}</p>
    </div>
  )
}

// ─── Section page wrapper ─────────────────────────────────────────────────────

function PageShell({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto bg-white p-3 sm:p-5 space-y-3 sm:space-y-4 animate-fade-in pb-16 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-800">{title}</h2>
          {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="self-start sm:self-auto">{action}</div>}
      </div>
      {children}
    </div>
  )
}

// ─── VITALS PAGE ──────────────────────────────────────────────────────────────

const COLOUR_MAP: Record<string, { card: string; icon: string; dot: string }> = {
  rose:    { card: 'border-rose-100 bg-rose-50/40',       icon: 'bg-rose-100 text-rose-500',    dot: 'bg-rose-400'    },
  brand:   { card: 'border-brand-100 bg-brand-50/40',     icon: 'bg-brand-100 text-brand-500',  dot: 'bg-brand-400'   },
  emerald: { card: 'border-emerald-100 bg-emerald-50/40', icon: 'bg-emerald-100 text-emerald-500', dot: 'bg-emerald-400' },
  amber:   { card: 'border-amber-100 bg-amber-50/40',     icon: 'bg-amber-100 text-amber-500',  dot: 'bg-amber-400'   },
  violet:  { card: 'border-violet-100 bg-violet-50/40',   icon: 'bg-violet-100 text-violet-500', dot: 'bg-violet-400'  },
}

export function VitalsPage({ currentUser }: PageProps) {
  const [showModal, setShowModal] = useState(false)
  const { vitals, patient, primaryCondition, setPrimaryCondition, refetch } = usePatientData(currentUser?.id)

  const hasVitals = vitals.length > 0
  const latestV = vitals[0]

  const metrics = [
    {
      id: 'hr',
      label: 'Heart Rate',
      value: latestV?.heart_rate ?? '--',
      unit: 'bpm',
      icon: <Heart className="w-5 h-5" />,
      colour: 'rose',
      normal: '60–100',
    },
    {
      id: 'bp',
      label: 'Blood Pressure',
      value: latestV && latestV.systolic_bp ? `${latestV.systolic_bp}/${latestV.diastolic_bp ?? '--'}` : '--',
      unit: 'mmHg',
      icon: <Activity className="w-5 h-5" />,
      colour: 'brand',
      normal: '<120/80',
    },
    {
      id: 'spo2',
      label: 'Oxygen (SpO₂)',
      value: latestV?.oxygen_saturation ?? '--',
      unit: '%',
      icon: <Droplets className="w-5 h-5" />,
      colour: 'emerald',
      normal: '95–100',
    },
    {
      id: 'temp',
      label: 'Temperature',
      value: latestV?.temperature ?? '--',
      unit: '°C',
      icon: <Thermometer className="w-5 h-5" />,
      colour: 'amber',
      normal: '36–37.5',
    },
    {
      id: 'rr',
      label: 'Respiratory Rate',
      value: latestV?.respiratory_rate ?? '--',
      unit: 'br/min',
      icon: <Wind className="w-5 h-5" />,
      colour: 'violet',
      normal: '12–20',
    },
    {
      id: 'glucose',
      label: 'Blood Glucose',
      value: latestV?.blood_glucose ?? '--',
      unit: 'mg/dL',
      icon: <Droplets className="w-5 h-5 text-amber-500" />,
      colour: 'amber',
      normal: '70–130',
    },
  ]

  return (
    <PageShell
      title="Vitals Monitor"
      subtitle={`Track and log your vital metrics · Care plan: ${primaryCondition}`}
      action={
        <button
          id="vitals-log-btn"
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <PlusCircle className="w-4 h-4" /> Log vitals
        </button>
      }
    >
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const c = COLOUR_MAP[m.colour] || COLOUR_MAP.brand
          return (
            <div key={m.id}
              className={`dash-section border ${c.card} flex items-center gap-4`}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.icon}`}>
                {m.icon}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{m.label}</p>
                <p className="text-2xl font-extrabold text-slate-800 leading-tight">
                  {m.value}
                </p>
                <p className="text-[10px] text-slate-400">Normal: {m.normal} {m.unit}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* History table or empty prompt */}
      {hasVitals ? (
        <div className="dash-section">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Recent Vital Readings</h3>
            <span className="text-xs text-slate-400">{vitals.length} recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-2 px-3">Date & Time</th>
                  <th className="py-2 px-3">Blood Pressure</th>
                  <th className="py-2 px-3">Heart Rate</th>
                  <th className="py-2 px-3">SpO₂</th>
                  <th className="py-2 px-3">Glucose</th>
                  <th className="py-2 px-3">Temp</th>
                </tr>
              </thead>
              <tbody>
                {vitals.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {new Date(v.recorded_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}{' '}
                      <span className="text-slate-400">
                        {new Date(v.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-semibold">
                      {v.systolic_bp ? `${v.systolic_bp}/${v.diastolic_bp ?? '--'} mmHg` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {v.heart_rate ? `${v.heart_rate} bpm` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {v.oxygen_saturation ? `${v.oxygen_saturation}%` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {v.blood_glucose ? `${v.blood_glucose} mg/dL` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {v.temperature ? `${v.temperature}°C` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="dash-section">
          <ComingSoonCard
            icon={<TrendingUp className="w-7 h-7" />}
            title="No vitals recorded yet"
            desc="Tap 'Log vitals' above to record your first reading. Your readings will appear here."
            colour="brand"
          />
        </div>
      )}

      {/* Info tip */}
      <div className="flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Record vitals consistently at the same time each day for accurate trends.
          Connect a wearable or smart device to auto-sync readings.
        </p>
      </div>

      <LogVitalsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userId={currentUser?.id || ''}
        patientId={patient?.id || null}
        currentCondition={primaryCondition}
        onConditionChange={setPrimaryCondition}
        onSuccess={refetch}
      />
    </PageShell>
  )
}

// ─── MEDICATIONS PAGE ─────────────────────────────────────────────────────────

export function MedicationsPage({ currentUser: _ }: PageProps) {
  return (
    <PageShell
      title="Medications"
      subtitle="Your active prescriptions and schedule"
      action={
        <button id="meds-add-btn" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> Add medication
        </button>
      }
    >
      <div className="dash-section">
        <ComingSoonCard
          icon={<Pill className="w-7 h-7" />}
          title="Medications will appear here"
          desc="Add your prescriptions using the button above. Set timings, meal instructions, and dosage for each one."
          colour="brand"
        />
      </div>

      {/* Adherence tip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { emoji: '🌅', label: 'Morning dose', sub: 'Take before/after breakfast' },
          { emoji: '🌆', label: 'Evening dose', sub: 'Take before/after dinner' },
          { emoji: '🌙', label: 'Night dose',   sub: 'Take before sleep' },
        ].map((s) => (
          <div key={s.label} className="dash-section text-center">
            <div className="text-3xl mb-2">{s.emoji}</div>
            <p className="text-sm font-semibold text-slate-700">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

// ─── APPOINTMENTS PAGE ────────────────────────────────────────────────────────

export function AppointmentsPage({ currentUser: _ }: PageProps) {
  return (
    <PageShell
      title="Appointments"
      subtitle="Upcoming and past consultations"
      action={
        <button id="appt-schedule-new-btn" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> Schedule
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <CalendarDays className="w-5 h-5" />, label: 'Upcoming', value: '0', colour: 'bg-brand-50 text-brand-600' },
          { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Completed', value: '0', colour: 'bg-emerald-50 text-emerald-600' },
          { icon: <Clock        className="w-5 h-5" />, label: 'Today',     value: '0', colour: 'bg-amber-50 text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="dash-section flex items-center gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.colour}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-extrabold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-section">
        <ComingSoonCard
          icon={<CalendarDays className="w-7 h-7" />}
          title="No appointments scheduled"
          desc="Book your next consultation with your doctor. You'll get reminders and can join telemedicine calls directly from here."
          colour="violet"
        />
      </div>
    </PageShell>
  )
}

// ─── LAB RESULTS PAGE ────────────────────────────────────────────────────────

export function LabResultsPage({ currentUser: _ }: PageProps) {
  const SAMPLE_TESTS = [
    { name: 'Complete Blood Count (CBC)',    date: '--', status: 'pending' },
    { name: 'HbA1c (Glycated Haemoglobin)', date: '--', status: 'pending' },
    { name: 'Lipid Profile',                date: '--', status: 'pending' },
    { name: 'Kidney Function Test (KFT)',   date: '--', status: 'pending' },
    { name: 'Thyroid Panel (TSH/T3/T4)',    date: '--', status: 'pending' },
  ]

  return (
    <PageShell
      title="Lab Results"
      subtitle="Blood tests, reports and diagnostics"
      action={
        <button id="lab-upload-btn" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> Upload report
        </button>
      }
    >
      <div className="dash-section">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
            <FlaskConical className="w-4 h-4 text-violet-500" />
          </span>
          Common Tests
        </h3>
        <ul className="space-y-2">
          {SAMPLE_TESTS.map((t) => (
            <li key={t.name}
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-slate-100 bg-slate-50">
              <FlaskConical className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="flex-1 text-sm text-slate-700 font-medium">{t.name}</span>
              <span className="text-xs text-slate-400">No results yet</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
        <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-700 leading-relaxed">
          Upload your lab reports as PDF or image. The AI can help you understand your results and flag any values outside normal range.
        </p>
      </div>
    </PageShell>
  )
}

// ─── ALERTS PAGE ─────────────────────────────────────────────────────────────

export function AlertsPage({ currentUser: _, onNavigate }: PageProps) {
  const {
    alerts,
    unreadCount,
    permission,
    soundEnabled,
    setSoundEnabled,
    requestPermission,
    sendTestNotification,
    markAsRead,
    markAllAsRead,
    deleteAlert,
    clearAll,
  } = useNotifications()

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'critical' | 'warning' | 'info'>('all')

  const formatTimeAgo = (ts: string) => {
    try {
      const diffMs = Date.now() - new Date(ts).getTime()
      const diffSec = Math.floor(diffMs / 1000)
      if (diffSec < 60) return 'Just now'
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin}m ago`
      const diffHr = Math.floor(diffMin / 60)
      if (diffHr < 24) return `${diffHr}h ago`
      const diffDay = Math.floor(diffHr / 24)
      return `${diffDay}d ago`
    } catch {
      return 'Recently'
    }
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length
  const infoCount = alerts.filter((a) => a.severity === 'info').length

  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === 'unread') return !alert.read
    if (activeFilter === 'critical') return alert.severity === 'critical'
    if (activeFilter === 'warning') return alert.severity === 'warning'
    if (activeFilter === 'info') return alert.severity === 'info'
    return true
  })

  const getCategoryIcon = (category: AppAlert['category']) => {
    switch (category) {
      case 'medication':
        return <Pill className="w-4 h-4 text-emerald-600" />
      case 'vitals':
        return <Heart className="w-4 h-4 text-red-600" />
      case 'emergency':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'appointment':
        return <CalendarDays className="w-4 h-4 text-blue-600" />
      case 'system':
      default:
        return <Bell className="w-4 h-4 text-brand-600" />
    }
  }

  const getSeverityStyle = (severity: AppAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          card: 'border-red-200 bg-red-50/50 hover:bg-red-50/80',
          badge: 'bg-red-600 text-white',
          title: 'text-red-950 font-bold',
          icon: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />,
        }
      case 'warning':
        return {
          card: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50/80',
          badge: 'bg-amber-500 text-white',
          title: 'text-amber-950 font-bold',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
        }
      case 'info':
      default:
        return {
          card: 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/70',
          badge: 'bg-brand-600 text-white',
          title: 'text-slate-900 font-bold',
          icon: <Info className="w-4 h-4 text-brand-600 shrink-0" />,
        }
    }
  }

  return (
    <PageShell
      title="Alerts & Push Notifications"
      subtitle="Real-time web push alerts, device notifications, and patient safety events"
    >
      {/* ── 1. Device Push Notifications Control Deck ── */}
      <div className="dash-section border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/30 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shrink-0">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Browser Web Push Notifications
                </h3>
                {permission === 'granted' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Web Push Active
                  </span>
                ) : permission === 'denied' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Notifications Blocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Permission Needed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                {permission === 'granted'
                  ? 'Push notifications are enabled on this device. You will receive instantaneous alerts when critical doses are missed or vitals are abnormal.'
                  : permission === 'denied'
                  ? 'Browser notifications are currently blocked. To receive desktop / lock-screen alerts, please allow notifications in your browser address bar settings.'
                  : 'Grant notification permission so MediCare AI can immediately alert you and your caregivers for time-critical medical events.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {permission !== 'granted' && (
              <button
                id="enable-push-perm-btn"
                onClick={async () => {
                  await requestPermission()
                }}
                className="btn-primary text-xs py-2 px-3.5"
              >
                <Bell className="w-3.5 h-3.5" />
                Enable Push Notifications
              </button>
            )}

            <button
              id="toggle-chime-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Toggle audio alert chime"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Audio Chime: On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Audio Chime: Muted</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Push Notifications Trigger Strip */}
        <div className="mt-4 pt-3.5 border-t border-blue-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span>Test Real-Time Push Triggers:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="test-push-critical"
              onClick={() => sendTestNotification('critical')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-100 hover:bg-red-200 text-red-800 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              Critical Push
            </button>
            <button
              id="test-push-warning"
              onClick={() => sendTestNotification('warning')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Warning Push
            </button>
            <button
              id="test-push-info"
              onClick={() => sendTestNotification('info')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <Info className="w-3.5 h-3.5 text-brand-600" />
              Info Push
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Filters & Batch Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All', count: alerts.length },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { id: 'critical', label: 'Critical', count: criticalCount },
              { id: 'warning', label: 'Warnings', count: warningCount },
              { id: 'info', label: 'Info', count: infoCount },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.id
            return (
              <button
                key={tab.id}
                id={`alert-filter-${tab.id}`}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[34px] ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Batch actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          {alerts.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear your alert history?')) {
                  clearAll()
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear history
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Alerts Feed List ── */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="dash-section text-center py-12">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No alerts in this view</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              New push alerts will automatically appear here when events are triggered.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const style = getSeverityStyle(alert.severity)
            return (
              <div
                key={alert.id}
                className={`relative rounded-2xl border p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  style.card
                } ${!alert.read ? 'ring-1 ring-brand-300 shadow-xs' : 'opacity-90'}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-2xs shrink-0 mt-0.5">
                    {getCategoryIcon(alert.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.badge}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {alert.category}
                      </span>
                      {!alert.read && (
                        <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" title="Unread" />
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto sm:ml-0">
                        {formatTimeAgo(alert.timestamp)}
                      </span>
                    </div>

                    <h4 className={`text-sm ${style.title} leading-snug`}>{alert.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>

                    {/* Category Navigation Shortcut */}
                    {onNavigate && alert.category === 'medication' && (
                      <button
                        onClick={() => onNavigate('medications')}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900"
                      >
                        Check Medication Schedule <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onNavigate && alert.category === 'vitals' && (
                      <button
                        onClick={() => onNavigate('vitals')}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900"
                      >
                        View Vitals Graph <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onNavigate && alert.category === 'appointment' && (
                      <button
                        onClick={() => onNavigate('appointments')}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900"
                      >
                        View Appointment Details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Item Controls */}
                <div className="flex items-center gap-1 self-end sm:self-start shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200/60 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => markAsRead(alert.id)}
                    title={alert.read ? 'Mark as read' : 'Mark as read'}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                      alert.read
                        ? 'text-slate-400 hover:text-slate-600 hover:bg-white/80'
                        : 'text-brand-700 bg-white font-bold hover:bg-brand-50 shadow-2xs'
                    }`}
                  >
                    {alert.read ? 'Read' : 'Mark as read'}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    title="Delete alert"
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── 4. Automated Push Notification Rules Explainer ── */}
      <div className="dash-section border border-blue-100 bg-white p-4 sm:p-5">
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-brand-600" />
          Automated Health & Safety Push Rules
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
              <Pill className="w-3.5 h-3.5" /> Missed Medications
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dispatches push notifications if critical doses are overdue by 30+ minutes, notifying caregivers.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2 text-red-700 font-bold text-xs mb-1">
              <Heart className="w-3.5 h-3.5" /> Vital Anomalies
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sends urgent notifications when BP &gt; 140/90, HR &gt; 100 bpm, or SpO2 &lt; 95% is logged.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2 text-red-700 font-bold text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Emergency AI Triage
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Triggers lock-screen push and audio chime if the AI assistant identifies emergency red-flags.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1">
              <CalendarDays className="w-3.5 h-3.5" /> Clinical Reminders
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pushes timely reminders 24 hours and 2 hours prior to scheduled doctor visits and tests.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

// ─── PATIENTS PAGE (Caregiver / Doctor) ──────────────────────────────────────

export function PatientsPage({ currentUser }: PageProps) {
  const isDoctor = currentUser.role === UserRole.Doctor
  const [patients, setPatients] = useState<CaregiverPatientItem[]>(getStoredPatients)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const savePatients = (updated: CaregiverPatientItem[]) => {
    setPatients(updated)
    try {
      localStorage.setItem(CAREGIVER_PATIENTS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }

  const handleAddPatient = (data: NewPatientData) => {
    const newItem: CaregiverPatientItem = {
      id:        data.id,
      name:      data.name,
      age:       data.age,
      condition: data.condition,
      lastSeen:  data.lastSeen,
      heartRate: data.heartRate,
      bp:        data.bp,
      spo2:      data.spo2,
      status:    data.status,
    }
    const updated = [newItem, ...patients]
    savePatients(updated)

    fetch(`${BACKEND_BASE_URL}/patients/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name:     data.name,
        date_of_birth: new Date(Date.now() - data.age * 365.25 * 86400000).toISOString().split('T')[0],
        gender:        data.gender,
        blood_type:    'O+',
        height_cm:     170,
        weight_kg:     70,
      }),
    }).catch(() => {})
  }

  const handleDeletePatient = (id: string) => {
    const updated = patients.filter((p) => p.id !== id)
    savePatients(updated)
  }

  const totalCritical = patients.filter((p) => p.status === 'critical').length
  const totalStable   = patients.filter((p) => p.status === 'stable').length

  return (
    <PageShell
      title={isDoctor ? 'My Patients' : 'Patients Under Care'}
      subtitle={isDoctor ? 'View clinical records and diagnostics' : 'Track health status for each patient'}
      action={
        <button
          id="patients-add-btn"
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" /> Add patient
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total Patients', value: String(patients.length), icon: <Users className="w-5 h-5" />,        colour: 'bg-brand-50 text-brand-600' },
          { label: 'Critical',       value: String(totalCritical),   icon: <AlertCircle className="w-5 h-5" />,   colour: 'bg-red-50 text-red-500' },
          { label: 'Stable',         value: String(totalStable),     icon: <CheckCircle2 className="w-5 h-5" />, colour: 'bg-emerald-50 text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="dash-section flex items-center gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.colour}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {patients.length === 0 ? (
        <div className="dash-section text-center py-10">
          <ComingSoonCard
            icon={<Users className="w-7 h-7" />}
            title="No patients linked yet"
            desc="Add a patient to start monitoring their daily vitals, adherence, and care routines."
            colour="brand"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary py-2 px-5 text-sm mx-auto mt-2"
          >
            <PlusCircle className="w-4 h-4" /> Add First Patient
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {patients.map((p) => {
            const isCritical = p.status === 'critical'
            const isWarning  = p.status === 'warning'
            return (
              <div
                key={p.id}
                className="dash-section relative group flex flex-col justify-between hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{p.name}</h4>
                      <p className="text-xs text-slate-400 truncate">Age {p.age} · {p.condition}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCritical
                          ? 'bg-red-100 text-red-700'
                          : isWarning
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleDeletePatient(p.id)}
                        title="Remove patient"
                        className="p-1 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 text-center">
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-medium">HR</p>
                      <p className="text-xs font-bold text-slate-800">{p.heartRate} bpm</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-medium">BP</p>
                      <p className="text-xs font-bold text-slate-800">{p.bp}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-medium">SpO₂</p>
                      <p className="text-xs font-bold text-slate-800">{p.spo2}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {p.lastSeen}
                  </span>
                  <span className="text-brand-600 font-medium hover:underline cursor-pointer">
                    View Chart →
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddPatient}
      />
    </PageShell>
  )
}

// ─── CARE TASKS PAGE (Caregiver) ─────────────────────────────────────────────

interface CareTaskItem {
  id: string
  label: string
  done: boolean
  priority: 'low' | 'medium' | 'high'
}

const CARE_TASKS_STORAGE_KEY = 'medicare_caregiver_tasks_v1'

export function CareTasksPage({ currentUser: _ }: PageProps) {
  const [tasks, setTasks] = useState<CareTaskItem[]>(() => {
    try {
      const stored = localStorage.getItem(CARE_TASKS_STORAGE_KEY)
      if (stored) return JSON.parse(stored) as CareTaskItem[]
    } catch (e) {
      console.warn(e)
    }
    return []
  })

  const [newTaskText, setNewTaskText] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [showInput, setShowInput] = useState(false)

  const saveTasks = (updated: CareTaskItem[]) => {
    setTasks(updated)
    try {
      localStorage.setItem(CARE_TASKS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn(e)
    }
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskText.trim()) return
    const item: CareTaskItem = {
      id: `task-${Date.now()}`,
      label: newTaskText.trim(),
      done: false,
      priority: newPriority,
    }
    saveTasks([...tasks, item])
    setNewTaskText('')
    setShowInput(false)
  }

  const handleToggle = (id: string) => {
    saveTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const handleDelete = (id: string) => {
    saveTasks(tasks.filter((t) => t.id !== id))
  }

  return (
    <PageShell
      title="Care Tasks"
      subtitle="Daily to-do list for patient care routines"
      action={
        <button
          id="tasks-add-btn"
          onClick={() => setShowInput((prev) => !prev)}
          className="btn-primary"
        >
          <PlusCircle className="w-4 h-4" /> {showInput ? 'Cancel' : 'Add task'}
        </button>
      }
    >
      {showInput && (
        <form onSubmit={handleAddTask} className="dash-section border border-brand-200 bg-brand-50/30 p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-800">Add New Care Task</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="e.g. Assist with afternoon walk, check blood glucose…"
              className="flex-1 form-input text-xs"
              autoFocus
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as any)}
              className="form-input text-xs w-full sm:w-32"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" className="btn-primary text-xs py-2 px-4 shrink-0">
              Save Task
            </button>
          </div>
        </form>
      )}

      <div className="dash-section space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
              <FileText className="w-4 h-4 text-emerald-500" />
            </span>
            Today's Tasks ({tasks.filter((t) => t.done).length}/{tasks.length})
          </h3>
          {tasks.length > 0 && (
            <span className="text-[11px] text-slate-400">
              {Math.round((tasks.filter((t) => t.done).length / (tasks.length || 1)) * 100)}% complete
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No care tasks created</p>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Add daily care tasks for medications, checks, and patient routines.
            </p>
            <button
              onClick={() => setShowInput(true)}
              className="btn-primary text-xs py-1.5 px-3 mx-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Create First Task
            </button>
          </div>
        ) : (
          tasks.map((t) => {
            const pColour =
              t.priority === 'high'
                ? 'bg-red-100 text-red-600'
                : t.priority === 'medium'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-slate-100 text-slate-500'
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-colors ${
                  t.done ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => handleToggle(t.id)}
                  className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                />
                <span className={`flex-1 text-sm ${t.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {t.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pColour}`}>
                  {t.priority}
                </span>
                <button
                  onClick={() => handleDelete(t.id)}
                  title="Delete task"
                  className="p-1 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </PageShell>
  )
}

// ─── DIAGNOSTICS PAGE (Doctor) ───────────────────────────────────────────────

export function DiagnosticsPage({ currentUser: _ }: PageProps) {
  return (
    <PageShell
      title="Diagnostics"
      subtitle="AI-assisted clinical decision support"
    >
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: <Stethoscope  className="w-6 h-6" />, label: 'Differential Diagnosis', desc: 'Enter symptoms and get ranked differentials with evidence.',        colour: 'bg-violet-50 text-violet-600' },
          { icon: <FlaskConical className="w-6 h-6" />, label: 'Lab Interpretation',     desc: 'Upload lab results for AI-powered clinical interpretation.',         colour: 'bg-emerald-50 text-emerald-600' },
          { icon: <Pill         className="w-6 h-6" />, label: 'Drug Interaction Check', desc: 'Check for contraindications in multi-drug regimens.',              colour: 'bg-amber-50 text-amber-600' },
          { icon: <FileText     className="w-6 h-6" />, label: 'Patient Summary',        desc: 'Generate a concise clinical summary from patient data.',           colour: 'bg-brand-50 text-brand-600' },
        ].map((t) => (
          <button key={t.label}
            className="dash-section text-left hover:border-brand-300 hover:shadow-md transition-all group">
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${t.colour} mb-3`}>
              {t.icon}
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-brand-600 transition-colors">
              {t.label}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
        <Stethoscope className="w-5 h-5 text-violet-500 shrink-0" />
        <p className="text-xs text-violet-700">
          <strong>Tip:</strong> Use the <strong>AI Diagnosis</strong> chat for free-form clinical queries — differential diagnosis, drug interactions, guideline lookups, and more.
        </p>
      </div>
    </PageShell>
  )
}
