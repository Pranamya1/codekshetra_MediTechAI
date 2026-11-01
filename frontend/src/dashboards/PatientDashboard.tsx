/**
 * @file PatientDashboard.tsx
 * @description Patient-facing dashboard — real Supabase data, no mock data.
 *
 * Data flow:
 *  1. usePatientData hook fetches: patient profile, medications, today's
 *     medication_logs, recent vitals, upcoming appointments — all scoped to
 *     the logged-in user via RLS (patient_id = auth.uid()).
 *  2. If brand-new user (no records at all) → EmptyState.
 *  3. If no medications yet but profile exists → MedicationCheckIn shows
 *     an empty slot, EmptyState prompt is shown in the medications panel.
 *  4. Vitals chart shows real data if available, else a clean "no data" card.
 */

import { useState } from 'react'
import {
  Heart, Thermometer, Droplets, Activity, Pill, Calendar,
  AlertCircle, TrendingUp, ChevronRight, Clock, Wind,
  Loader2, AlertTriangle, PlusCircle, Plus, Scale, Bluetooth,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import { StatCard } from '../components/StatCard'
import { MedicationCheckIn } from '../components/MedicationCheckIn'
import { EmptyState } from '../components/EmptyState'
import { LogVitalsModal, SUPPORTED_DISEASES } from '../components/LogVitalsModal'
import { ConnectWearableModal } from '../components/ConnectWearableModal'
import { usePatientData, type VitalRow, type AppointmentRow, type MedicationRow } from '../hooks/usePatientData'
import {
  AlertSeverity, VitalTrend,
  type IUser,
} from '../types/medical'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PatientDashboardProps {
  currentUser: IUser
}

// ─── Vitals chart helpers ──────────────────────────────────────────────────────

interface ChartPoint {
  timestamp:        string
  heartRate:        number | null
  systolicBP:       number | null
  diastolicBP:      number | null
  oxygenSaturation: number | null
  temperature:      number | null
  respiratoryRate:  number | null
  bloodGlucose:     number | null
  weight:           number | null
}

function vitalsToChartData(vitals: VitalRow[]): ChartPoint[] {
  return [...vitals]
    .reverse()    // chronological order
    .map((v) => ({
      timestamp:        new Date(v.recorded_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit',
      }),
      heartRate:        v.heart_rate,
      systolicBP:       v.systolic_bp,
      diastolicBP:      v.diastolic_bp,
      oxygenSaturation: v.oxygen_saturation,
      temperature:      v.temperature,
      respiratoryRate:  v.respiratory_rate,
      bloodGlucose:     v.blood_glucose ?? null,
      weight:           v.weight ?? null,
    }))
}

// ─── Latest vital value helper ─────────────────────────────────────────────────

function latest(vitals: VitalRow[], key: keyof VitalRow): number | string {
  const val = vitals[0]?.[key]
  return (val as number | null) ?? '--'
}

// ─── No-data placeholder for chart ────────────────────────────────────────────

function NoVitalsChart({ onLogClick }: { onLogClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] rounded-xl bg-slate-50 border border-dashed border-slate-200 p-4 text-center">
      <Activity className="w-8 h-8 text-slate-300 mb-2" />
      <p className="text-sm text-slate-500 font-medium">No vitals recorded yet</p>
      <p className="text-xs text-slate-400 mt-0.5 mb-3">Vitals will appear here once logged</p>
      {onLogClick && (
        <button
          onClick={onLogClick}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Log First Reading
        </button>
      )}
    </div>
  )
}

// ─── Medication list item ──────────────────────────────────────────────────────

const MEAL_LABELS: Record<string, string> = {
  before_meal: 'Before meal',
  after_meal:  'After meal',
  with_meal:   'With meal',
  any_time:    '',
}

function MedicationRow({ med }: { med: MedicationRow }) {
  return (
    <li className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
        <Pill className="w-4 h-4 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {med.name} <span className="font-normal text-slate-400">{med.dosage}</span>
        </p>
        <p className="text-xs text-slate-500">
          {med.frequency}
          {med.meal_instruction && med.meal_instruction !== 'any_time'
            ? ` · ${MEAL_LABELS[med.meal_instruction] ?? med.meal_instruction}` : ''}
        </p>
      </div>
      {med.is_critical
        ? <span className="badge-critical shrink-0">Critical</span>
        : <span className="badge-normal shrink-0">Active</span>
      }
    </li>
  )
}

// ─── Appointment item ──────────────────────────────────────────────────────────

function AppointmentRow({ appt }: { appt: AppointmentRow }) {
  const date     = new Date(appt.scheduled_at)
  const isToday  = date.toDateString() === new Date().toDateString()
  const dateLabel = isToday
    ? 'Today'
    : date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  const timeLabel = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <li className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex flex-col items-center justify-center w-12 h-12 shrink-0
                      rounded-xl bg-brand-50 border border-brand-100">
        <span className="text-[10px] font-bold text-brand-400 uppercase">
          {date.toLocaleDateString('en-IN', { weekday: 'short' })}
        </span>
        <span className="text-lg font-extrabold text-brand-700 leading-none">{date.getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {appt.reason ?? appt.type ?? 'Appointment'}
        </p>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {dateLabel} · {timeLabel}
          <span className="badge-info ml-1">{appt.type}</span>
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
    </li>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="h-full bg-white p-5 space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64 rounded-2xl bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
      <div className="flex items-center justify-center gap-2 text-slate-400 py-4">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading your health data…</span>
      </div>
    </div>
  )
}

// ─── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700 mb-1">Couldn't load dashboard</h3>
        <p className="text-sm text-slate-500 mb-4">{message}</p>
        <button
          id="dashboard-retry-btn"
          onClick={onRetry}
          className="btn-primary mx-auto"
        >
          Try again
        </button>
        <p className="text-xs text-slate-400 mt-3">
          Make sure you've run the Supabase SQL migration and that RLS policies are applied.
        </p>
      </div>
    </div>
  )
}

// ─── Adherence % from today logs ───────────────────────────────────────────────

function calcAdherence(logs: { status: string }[]): number {
  if (logs.length === 0) return 0
  const taken = logs.filter((l) => l.status === 'taken').length
  return Math.round((taken / logs.length) * 100)
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────

export function PatientDashboard({ currentUser }: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<'vitals' | 'bp' | 'glucose'>('vitals')
  const [showVitalsModal, setShowVitalsModal] = useState(false)
  const [showWearableModal, setShowWearableModal] = useState(false)

  const {
    loading, error,
    patient, medications, todayLogs, vitals, appointments,
    isEmpty, primaryCondition, setPrimaryCondition, refetch,
  } = usePatientData(currentUser.id)

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) return <ErrorBanner message={error} onRetry={refetch} />

  // ── New user or Empty state (no records yet) ──────────────────────────────────
  if (!patient || isEmpty) {
    return (
      <div className="h-full relative">
        <EmptyState
          patientName={currentUser.fullName}
          condition={primaryCondition}
          onAddMedication={() => {
            localStorage.removeItem('medicare_onboarding_done')
            window.location.reload()
          }}
          onLogVitals={() => setShowVitalsModal(true)}
          onConnectWearable={() => setShowWearableModal(true)}
        />
        <LogVitalsModal
          isOpen={showVitalsModal}
          onClose={() => setShowVitalsModal(false)}
          userId={currentUser.id}
          patientId={patient?.id || null}
          currentCondition={primaryCondition}
          onConditionChange={setPrimaryCondition}
          onSuccess={() => {
            refetch()
          }}
        />
        <ConnectWearableModal
          isOpen={showWearableModal}
          onClose={() => setShowWearableModal(false)}
          patientId={currentUser.id}
          onVitalsUpdated={() => {
            refetch()
          }}
        />
      </div>
    )
  }

  // ── Real data ─────────────────────────────────────────────────────────────────
  const chartData      = vitalsToChartData(vitals)
  const hasVitals      = vitals.length > 0
  const hasMeds        = medications.length > 0
  const hasAppts       = appointments.length > 0
  const adherencePct   = calcAdherence(todayLogs)
  const missedCritical = todayLogs.some((l) => l.is_critical && l.status === 'missed')

  // Condition classification helpers
  const isDiabetes = primaryCondition.toLowerCase().includes('diabet')
  const isHypertension = primaryCondition.toLowerCase().includes('hyperten') || primaryCondition.toLowerCase().includes('bp')
  const isRespiratory = primaryCondition.toLowerCase().includes('copd') || primaryCondition.toLowerCase().includes('asthma')
  const isHeartFailure = primaryCondition.toLowerCase().includes('heart')
  const isKidney = primaryCondition.toLowerCase().includes('kidney')

  // Available chart tabs based on active condition
  const availableTabs: { key: 'vitals' | 'bp' | 'glucose'; label: string }[] = isDiabetes
    ? [
        { key: 'glucose', label: 'Blood Glucose' },
        { key: 'bp', label: 'Blood Pressure' },
        { key: 'vitals', label: 'HR / SpO₂' },
      ]
    : [
        { key: 'vitals', label: 'HR / SpO₂' },
        { key: 'bp', label: 'Blood Pressure' },
      ]

  return (
    <div className="h-full overflow-y-auto bg-white p-3 sm:p-5 space-y-3 sm:space-y-4 animate-fade-in pb-16 md:pb-6">

      {/* ── Top Bar: Active Condition & Log Vitals CTA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Care Plan for:</span>
            <select
              id="patient-condition-select"
              value={primaryCondition}
              onChange={(e) => {
                const nextCond = e.target.value
                setPrimaryCondition(nextCond)
                if (nextCond.toLowerCase().includes('diabet')) setActiveTab('glucose')
                else if (nextCond.toLowerCase().includes('hyperten')) setActiveTab('bp')
                else setActiveTab('vitals')
              }}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs cursor-pointer"
            >
              {SUPPORTED_DISEASES.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              (Stats & vitals dynamically adapt to this condition)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="patient-connect-wearable-btn"
            onClick={() => setShowWearableModal(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-brand-400 text-slate-700 hover:text-brand-600 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Bluetooth className="w-4 h-4 text-brand-500" /> Connect Wearable
          </button>
          <button
            id="patient-log-vitals-btn"
            onClick={() => setShowVitalsModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Log Vitals
          </button>
        </div>
      </div>

      {/* ── Critical missed medication alert ── */}
      {missedCritical && (
        <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl
                        bg-red-50 border border-red-200 text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-xs sm:text-sm">Critical medication missed! </span>
            <span className="text-xs sm:text-sm">Your caregiver has been notified. Please take your medication immediately.</span>
          </div>
          <span className="badge-critical shrink-0 text-xs">Urgent</span>
        </div>
      )}

      {/* ── Disease-Adaptive KPI stat cards ── */}
      <section aria-label="Current vitals" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {isDiabetes ? (
          <>
            <StatCard
              id="stat-blood-glucose"
              label="Blood Glucose"
              value={vitals[0]?.blood_glucose ?? '--'}
              unit="mg/dL"
              trend={VitalTrend.Stable}
              change={
                vitals[0]?.blood_glucose
                  ? vitals[0].blood_glucose < 70
                    ? 'Low (Hypoglycemia)'
                    : vitals[0].blood_glucose > 180
                    ? 'Elevated'
                    : 'Target: 70–130'
                  : 'Target: 70–130 mg/dL'
              }
              severity={
                vitals[0]?.blood_glucose
                  ? vitals[0].blood_glucose < 70 || vitals[0].blood_glucose > 250
                    ? AlertSeverity.Critical
                    : vitals[0].blood_glucose > 180
                    ? AlertSeverity.Warning
                    : AlertSeverity.Info
                  : AlertSeverity.Info
              }
              icon={<Droplets className="w-5 h-5 text-amber-500" />}
            />
            <StatCard
              id="stat-blood-pressure"
              label="Blood Pressure"
              value={vitals[0] && vitals[0].systolic_bp ? `${vitals[0].systolic_bp}/${vitals[0].diastolic_bp ?? '--'}` : '--'}
              unit="mmHg"
              trend={VitalTrend.Stable}
              change="Target: <130/80"
              severity={AlertSeverity.Info}
              icon={<Activity className="w-5 h-5 text-brand-500" />}
            />
            <StatCard
              id="stat-heart-rate"
              label="Heart Rate"
              value={latest(vitals, 'heart_rate')}
              unit="bpm"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Heart className="w-5 h-5 text-rose-500" />}
            />
            <StatCard
              id="stat-weight"
              label="Body Weight"
              value={vitals[0]?.weight ?? '--'}
              unit="kg"
              trend={VitalTrend.Stable}
              change="Weight management"
              severity={AlertSeverity.Info}
              icon={<Scale className="w-5 h-5 text-indigo-500" />}
            />
          </>
        ) : isHypertension ? (
          <>
            <StatCard
              id="stat-blood-pressure"
              label="Blood Pressure"
              value={vitals[0] && vitals[0].systolic_bp ? `${vitals[0].systolic_bp}/${vitals[0].diastolic_bp ?? '--'}` : '--'}
              unit="mmHg"
              trend={VitalTrend.Stable}
              change={
                vitals[0]?.systolic_bp && vitals[0].systolic_bp >= 140
                  ? 'Stage 2 Hypertension'
                  : vitals[0]?.systolic_bp && vitals[0].systolic_bp >= 130
                  ? 'Stage 1 Hypertension'
                  : 'Normal: <120/80'
              }
              severity={
                vitals[0]?.systolic_bp && (vitals[0].systolic_bp >= 160 || (vitals[0].diastolic_bp && vitals[0].diastolic_bp >= 100))
                  ? AlertSeverity.Critical
                  : vitals[0]?.systolic_bp && vitals[0].systolic_bp >= 130
                  ? AlertSeverity.Warning
                  : AlertSeverity.Info
              }
              icon={<Activity className="w-5 h-5 text-brand-500" />}
            />
            <StatCard
              id="stat-heart-rate"
              label="Heart Rate"
              value={latest(vitals, 'heart_rate')}
              unit="bpm"
              trend={VitalTrend.Stable}
              change="Normal: 60–100 bpm"
              severity={AlertSeverity.Info}
              icon={<Heart className="w-5 h-5 text-rose-500" />}
            />
            <StatCard
              id="stat-oxygen"
              label="SpO₂"
              value={latest(vitals, 'oxygen_saturation')}
              unit="%"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Droplets className="w-5 h-5 text-teal-500" />}
            />
            <StatCard
              id="stat-temperature"
              label="Temperature"
              value={latest(vitals, 'temperature')}
              unit="°C"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Thermometer className="w-5 h-5 text-amber-500" />}
            />
          </>
        ) : isRespiratory ? (
          <>
            <StatCard
              id="stat-oxygen"
              label="Oxygen (SpO₂)"
              value={latest(vitals, 'oxygen_saturation')}
              unit="%"
              trend={VitalTrend.Stable}
              change={
                vitals[0]?.oxygen_saturation && vitals[0].oxygen_saturation < 92
                  ? 'Low Oxygen (Hypoxemia)'
                  : 'Normal: 95–100%'
              }
              severity={
                vitals[0]?.oxygen_saturation && vitals[0].oxygen_saturation <= 90
                  ? AlertSeverity.Critical
                  : vitals[0]?.oxygen_saturation && vitals[0].oxygen_saturation < 95
                  ? AlertSeverity.Warning
                  : AlertSeverity.Info
              }
              icon={<Droplets className="w-5 h-5 text-emerald-500" />}
            />
            <StatCard
              id="stat-respiratory"
              label="Respiratory Rate"
              value={latest(vitals, 'respiratory_rate')}
              unit="br/min"
              trend={VitalTrend.Stable}
              change="Normal: 12–20"
              severity={AlertSeverity.Info}
              icon={<Wind className="w-5 h-5 text-violet-500" />}
            />
            <StatCard
              id="stat-heart-rate"
              label="Heart Rate"
              value={latest(vitals, 'heart_rate')}
              unit="bpm"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Heart className="w-5 h-5 text-rose-500" />}
            />
            <StatCard
              id="stat-temperature"
              label="Temperature"
              value={latest(vitals, 'temperature')}
              unit="°C"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Thermometer className="w-5 h-5 text-amber-500" />}
            />
          </>
        ) : isHeartFailure ? (
          <>
            <StatCard
              id="stat-weight"
              label="Daily Weight"
              value={vitals[0]?.weight ?? '--'}
              unit="kg"
              trend={VitalTrend.Stable}
              change="Fluid retention tracking"
              severity={AlertSeverity.Info}
              icon={<Scale className="w-5 h-5 text-indigo-500" />}
            />
            <StatCard
              id="stat-blood-pressure"
              label="Blood Pressure"
              value={vitals[0] && vitals[0].systolic_bp ? `${vitals[0].systolic_bp}/${vitals[0].diastolic_bp ?? '--'}` : '--'}
              unit="mmHg"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Activity className="w-5 h-5 text-brand-500" />}
            />
            <StatCard
              id="stat-heart-rate"
              label="Heart Rate"
              value={latest(vitals, 'heart_rate')}
              unit="bpm"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Heart className="w-5 h-5 text-rose-500" />}
            />
            <StatCard
              id="stat-oxygen"
              label="SpO₂"
              value={latest(vitals, 'oxygen_saturation')}
              unit="%"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Droplets className="w-5 h-5 text-teal-500" />}
            />
          </>
        ) : isKidney ? (
          <>
            <StatCard
              id="stat-blood-pressure"
              label="Blood Pressure"
              value={vitals[0] && vitals[0].systolic_bp ? `${vitals[0].systolic_bp}/${vitals[0].diastolic_bp ?? '--'}` : '--'}
              unit="mmHg"
              trend={VitalTrend.Stable}
              change="Target: <130/80"
              severity={AlertSeverity.Info}
              icon={<Activity className="w-5 h-5 text-brand-500" />}
            />
            <StatCard
              id="stat-weight"
              label="Daily Weight"
              value={vitals[0]?.weight ?? '--'}
              unit="kg"
              trend={VitalTrend.Stable}
              change="Fluid balance"
              severity={AlertSeverity.Info}
              icon={<Scale className="w-5 h-5 text-indigo-500" />}
            />
            <StatCard
              id="stat-blood-glucose"
              label="Blood Glucose"
              value={vitals[0]?.blood_glucose ?? '--'}
              unit="mg/dL"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Droplets className="w-5 h-5 text-amber-500" />}
            />
            <StatCard
              id="stat-heart-rate"
              label="Heart Rate"
              value={latest(vitals, 'heart_rate')}
              unit="bpm"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Heart className="w-5 h-5 text-rose-500" />}
            />
          </>
        ) : (
          <>
            <StatCard
              id="stat-heart-rate"
              label="Heart Rate"
              value={latest(vitals, 'heart_rate')}
              unit="bpm"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Heart className="w-5 h-5 text-rose-500" />}
            />
            <StatCard
              id="stat-blood-pressure"
              label="Blood Pressure"
              value={vitals[0] && vitals[0].systolic_bp ? `${vitals[0].systolic_bp}/${vitals[0].diastolic_bp ?? '--'}` : '--'}
              unit="mmHg"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Activity className="w-5 h-5 text-brand-500" />}
            />
            <StatCard
              id="stat-oxygen"
              label="SpO₂"
              value={latest(vitals, 'oxygen_saturation')}
              unit="%"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Droplets className="w-5 h-5 text-teal-500" />}
            />
            <StatCard
              id="stat-temperature"
              label="Temperature"
              value={latest(vitals, 'temperature')}
              unit="°C"
              trend={VitalTrend.Stable}
              severity={AlertSeverity.Info}
              icon={<Thermometer className="w-5 h-5 text-amber-500" />}
            />
          </>
        )}
      </section>

      {/* ── Vitals chart + Medication Check-In ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Vitals chart — 2 cols */}
        <section aria-label="Vitals trend chart" className="dash-section lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Vitals Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasVitals ? `Last ${vitals.length} readings` : 'No readings yet'}
              </p>
            </div>
            {hasVitals && (
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1 self-start sm:self-auto">
                {availableTabs.map((tab) => (
                  <button key={tab.key} id={`chart-tab-${tab.key}`}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors
                      ${activeTab === tab.key
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasVitals ? (
            <ResponsiveContainer width="100%" height={200}>
              {activeTab === 'glucose' ? (
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="bloodGlucose" name="Blood Glucose (mg/dL)" stroke="#f59e0b" fill="url(#glucoseGrad)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              ) : activeTab === 'vitals' ? (
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2aa0ff" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2aa0ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="heartRate"        name="Heart Rate (bpm)" stroke="#2aa0ff" fill="url(#hrGrad)"   strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="oxygenSaturation" name="SpO₂ (%)"          stroke="#10b981" fill="url(#spo2Grad)" strokeWidth={2} dot={false} />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="systolicBP" name="Systolic (mmHg)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="diastolicBP" name="Diastolic (mmHg)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <NoVitalsChart onLogClick={() => setShowVitalsModal(true)} />
          )}
        </section>

        {/* Medication Check-In — today's adherence */}
        <MedicationCheckIn todayLogs={todayLogs} onRefetch={refetch} />
      </div>

      {/* ── Appointments + Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Upcoming appointments */}
        <section aria-label="Upcoming appointments" className="dash-section lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                <Calendar className="w-4 h-4 text-violet-500" />
              </span>
              Upcoming Appointments
            </h3>
            <button
              id="appt-schedule-btn"
              className="text-xs text-brand-600 font-medium hover:text-brand-700"
            >
              Schedule new
            </button>
          </div>
          {hasAppts ? (
            <ul>
              {appointments.map((appt) => (
                <AppointmentRow key={appt.id} appt={appt} />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No upcoming appointments</p>
              <button
                id="appt-add-first-btn"
                className="mt-3 inline-flex items-center gap-1 text-xs text-brand-600 font-medium hover:text-brand-700"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Schedule your first appointment
              </button>
            </div>
          )}
        </section>

        {/* KPI stats column */}
        <div className="space-y-4">
          <StatCard
            id="stat-respiratory"
            label="Respiratory Rate"
            value={latest(vitals, 'respiratory_rate')}
            unit="br/min"
            trend={VitalTrend.Stable}
            severity={AlertSeverity.Info}
            icon={<Wind className="w-5 h-5" />}
          />
          <StatCard
            id="stat-adherence"
            label="Today's Adherence"
            value={todayLogs.length > 0 ? adherencePct : '--'}
            unit={todayLogs.length > 0 ? '%' : ''}
            trend={adherencePct >= 80 ? VitalTrend.Up : VitalTrend.Down}
            change={todayLogs.length > 0
              ? `${todayLogs.filter((l) => l.status === 'taken').length}/${todayLogs.length} doses taken`
              : 'No medications yet'}
            severity={adherencePct >= 80 ? AlertSeverity.Info : AlertSeverity.Warning}
            icon={<TrendingUp className="w-5 h-5" />}
          />

          {/* Medication list summary */}
          {hasMeds && (
            <section aria-label="Medication list" className="dash-section">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                  <Pill className="w-4 h-4 text-brand-500" />
                </span>
                My Medications
              </h3>
              <ul>
                {medications.map((med) => (
                  <MedicationRow key={med.id} med={med} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* ── Log Vitals Modal ── */}
      <LogVitalsModal
        isOpen={showVitalsModal}
        onClose={() => setShowVitalsModal(false)}
        userId={currentUser.id}
        patientId={patient?.id || null}
        currentCondition={primaryCondition}
        onConditionChange={setPrimaryCondition}
        onSuccess={() => {
          refetch()
        }}
      />

      {/* ── Connect Wearable Modal ── */}
      <ConnectWearableModal
        isOpen={showWearableModal}
        onClose={() => setShowWearableModal(false)}
        patientId={currentUser.id}
        onVitalsUpdated={() => {
          refetch()
        }}
      />
    </div>
  )
}
