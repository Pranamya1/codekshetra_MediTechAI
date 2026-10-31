/**
 * @file PatientDashboard.tsx
 * @description Patient-facing dashboard — Owned by Member 2.
 *
 * Milestone 1: Structured scaffold with mock data, ready for Supabase integration.
 * Uses Recharts for vitals charts and StatCard for KPI metrics.
 *
 * TODO (Member 2):
 *  - Replace MOCK_VITALS with real-time Supabase subscription
 *  - Wire up medication adherence from IMedicationAdherence[]
 *  - Implement appointment list with live data
 *  - Add AI assistant chat panel (coordinate with Member 4 for voice input)
 */

import { useState } from 'react'
import {
  Heart, Thermometer, Droplets, Wind, Activity, Pill, Calendar,
  AlertCircle, TrendingUp, ChevronRight, Clock,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import { StatCard } from '../components/StatCard'
import {
  UserRole, AlertSeverity, VitalTrend, MedicationStatus, AppointmentStatus,
  type IUser, type IVitalsChartPoint, type IMedication, type IAppointment, type IMedicalAlert,
} from '../types/medical'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientDashboardProps {
  currentUser: IUser
}

// ─── Mock data (replace with Supabase hooks in Milestone 2) ──────────────────

const MOCK_VITALS_HISTORY: IVitalsChartPoint[] = [
  { timestamp: '06:00', heartRate: 68, systolicBP: 118, oxygenSaturation: 98, temperature: 36.5 },
  { timestamp: '08:00', heartRate: 72, systolicBP: 122, oxygenSaturation: 97, temperature: 36.6 },
  { timestamp: '10:00', heartRate: 75, systolicBP: 125, oxygenSaturation: 98, temperature: 36.8 },
  { timestamp: '12:00', heartRate: 80, systolicBP: 128, oxygenSaturation: 96, temperature: 37.0 },
  { timestamp: '14:00', heartRate: 76, systolicBP: 124, oxygenSaturation: 97, temperature: 36.9 },
  { timestamp: '16:00', heartRate: 73, systolicBP: 120, oxygenSaturation: 98, temperature: 36.7 },
  { timestamp: '18:00', heartRate: 71, systolicBP: 119, oxygenSaturation: 99, temperature: 36.5 },
  { timestamp: '20:00', heartRate: 69, systolicBP: 117, oxygenSaturation: 99, temperature: 36.4 },
]

const MOCK_MEDICATIONS: IMedication[] = [
  {
    id: 'med-001', patientId: 'pat-001', prescribedById: 'doc-001',
    name: 'Metformin', dosage: '500mg', frequency: 'Twice daily',
    route: 'oral', startDate: '2026-01-15', status: MedicationStatus.Active,
    instructions: 'Take with meals', refillsRemaining: 2,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'med-002', patientId: 'pat-001', prescribedById: 'doc-001',
    name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily',
    route: 'oral', startDate: '2026-03-01', status: MedicationStatus.Active,
    instructions: 'Take in the morning', refillsRemaining: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'med-003', patientId: 'pat-001', prescribedById: 'doc-001',
    name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime',
    route: 'oral', startDate: '2026-02-10', status: MedicationStatus.Active,
    refillsRemaining: 3,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const MOCK_APPOINTMENTS: IAppointment[] = [
  {
    id: 'apt-001', patientId: 'pat-001', doctorId: 'doc-001',
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 30, type: 'follow-up', status: AppointmentStatus.Scheduled,
    reasonForVisit: 'Quarterly diabetes check-up', followUpRequired: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'apt-002', patientId: 'pat-001', doctorId: 'doc-002',
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 20, type: 'telemedicine', status: AppointmentStatus.Scheduled,
    reasonForVisit: 'Blood pressure medication review', followUpRequired: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const MOCK_ALERTS: IMedicalAlert[] = [
  {
    id: 'alert-001', patientId: 'pat-001',
    triggeredAt: new Date().toISOString(),
    severity: AlertSeverity.Warning, category: 'medication',
    title: 'Refill Required', message: 'Lisinopril refills are at 0. Contact your doctor.',
    acknowledged: false,
  },
  {
    id: 'alert-002', patientId: 'pat-001',
    triggeredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    severity: AlertSeverity.Info, category: 'vitals',
    title: 'Vitals Recorded', message: 'Evening vitals successfully logged.',
    acknowledged: false,
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function MedicationRow({ med }: { med: IMedication }) {
  const needsRefill = (med.refillsRemaining ?? 1) === 0
  return (
    <li className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
        <Pill className="w-4 h-4 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{med.name} <span className="font-normal text-slate-400">{med.dosage}</span></p>
        <p className="text-xs text-slate-500">{med.frequency}</p>
      </div>
      {needsRefill
        ? <span className="badge-warning shrink-0">Refill</span>
        : <span className="badge-normal shrink-0">Active</span>
      }
    </li>
  )
}

function AppointmentRow({ appt }: { appt: IAppointment }) {
  const date = new Date(appt.scheduledAt)
  const isToday = date.toDateString() === new Date().toDateString()
  const dateLabel = isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <li className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex flex-col items-center justify-center w-12 h-12 shrink-0
                      rounded-xl bg-brand-50 border border-brand-100">
        <span className="text-[10px] font-bold text-brand-400 uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
        <span className="text-lg font-extrabold text-brand-700 leading-none">{date.getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{appt.reasonForVisit}</p>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {dateLabel} · {timeLabel}
          <span className="badge-info ml-1">{appt.type}</span>
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
    </li>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function PatientDashboard({ currentUser }: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<'vitals' | 'bp'>('vitals')
  const latest = MOCK_VITALS_HISTORY[MOCK_VITALS_HISTORY.length - 1]

  // Unused in Milestone 1 — suppress TS lint
  void (currentUser satisfies IUser)
  void (UserRole.Patient)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Alert banner */}
      {MOCK_ALERTS.filter((a) => !a.acknowledged && a.severity !== AlertSeverity.Info).map((alert) => (
        <div key={alert.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl
                     bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <span className="font-semibold text-sm">{alert.title}: </span>
            <span className="text-sm">{alert.message}</span>
          </div>
          <span className="badge-warning shrink-0">{alert.severity}</span>
        </div>
      ))}

      {/* KPI stats row */}
      <section aria-label="Current vitals" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-heart-rate"
          label="Heart Rate"
          value={latest.heartRate ?? '--'}
          unit="bpm"
          trend={VitalTrend.Stable}
          change="±2 bpm today"
          severity={AlertSeverity.Info}
          icon={<Heart className="w-5 h-5" />}
        />
        <StatCard
          id="stat-blood-pressure"
          label="Blood Pressure"
          value={`${latest.systolicBP ?? '--'}/82`}
          unit="mmHg"
          trend={VitalTrend.Down}
          change="-3 since morning"
          severity={AlertSeverity.Info}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          id="stat-oxygen"
          label="SpO₂"
          value={latest.oxygenSaturation ?? '--'}
          unit="%"
          trend={VitalTrend.Stable}
          severity={AlertSeverity.Info}
          icon={<Droplets className="w-5 h-5" />}
        />
        <StatCard
          id="stat-temperature"
          label="Temperature"
          value={latest.temperature ?? '--'}
          unit="°C"
          trend={VitalTrend.Up}
          change="+0.3°C"
          severity={AlertSeverity.Info}
          icon={<Thermometer className="w-5 h-5" />}
        />
      </section>

      {/* Charts + sidebar panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Vitals chart — spans 2 cols */}
        <section aria-label="Vitals trend chart" className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Vitals Trend</h3>
              <p className="text-xs text-slate-400">Today · 6 AM – 8 PM</p>
            </div>
            <div className="flex gap-1">
              {(['vitals', 'bp'] as const).map((tab) => (
                <button key={tab} id={`chart-tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                    ${activeTab === tab
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100'
                    }`}>
                  {tab === 'vitals' ? 'Heart Rate / SpO₂' : 'Blood Pressure'}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            {activeTab === 'vitals' ? (
              <AreaChart data={MOCK_VITALS_HISTORY} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="heartRate"        name="Heart Rate (bpm)" stroke="#2aa0ff" fill="url(#hrGrad)"   strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="oxygenSaturation" name="SpO₂ (%)"          stroke="#10b981" fill="url(#spo2Grad)" strokeWidth={2} dot={false} />
              </AreaChart>
            ) : (
              <LineChart data={MOCK_VITALS_HISTORY} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="systolicBP" name="Systolic (mmHg)" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </section>

        {/* Medications panel */}
        <section aria-label="Current medications" className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Pill className="w-4 h-4 text-brand-500" /> Medications
            </h3>
            <button className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</button>
          </div>
          <ul>
            {MOCK_MEDICATIONS.map((med) => (
              <MedicationRow key={med.id} med={med} />
            ))}
          </ul>
        </section>
      </div>

      {/* Appointments + Respiratory Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming appointments */}
        <section aria-label="Upcoming appointments" className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" /> Upcoming Appointments
            </h3>
            <button className="text-xs text-brand-600 font-medium hover:text-brand-700">Schedule new</button>
          </div>
          <ul>
            {MOCK_APPOINTMENTS.map((appt) => (
              <AppointmentRow key={appt.id} appt={appt} />
            ))}
          </ul>
        </section>

        {/* Respiratory rate KPI */}
        <div className="space-y-4">
          <StatCard
            id="stat-respiratory"
            label="Respiratory Rate"
            value="16"
            unit="br/min"
            trend={VitalTrend.Stable}
            severity={AlertSeverity.Info}
            icon={<Wind className="w-5 h-5" />}
          />
          <StatCard
            id="stat-adherence"
            label="Med Adherence"
            value="87"
            unit="%"
            trend={VitalTrend.Up}
            change="+4% this week"
            severity={AlertSeverity.Info}
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>
      </div>

    </div>
  )
}
