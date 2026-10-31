/**
 * @file CaregiverDashboard.tsx
 * @description Caregiver monitoring dashboard.
 * Displays the health status of all assigned patients at a glance.
 *
 * TODO (Team Lead / Member 3):
 *  - Replace mock patient list with Supabase query:
 *    `supabase.from('patients').select('*').in('id', caregiver.patientIds)`
 *  - Add real-time alert subscriptions via Supabase Realtime
 */

import { Users, AlertCircle, CheckCircle2, Clock, Heart, Activity } from 'lucide-react'
import { AlertSeverity, VitalTrend, type IUser } from '../types/medical'
import { StatCard } from '../components/StatCard'

interface CaregiverDashboardProps {
  currentUser: IUser
}

// ─── Mock patient list ────────────────────────────────────────────────────────

const MOCK_PATIENTS = [
  {
    id: 'pat-001', name: 'Alex Johnson', age: 54, condition: 'Type 2 Diabetes + Hypertension',
    lastSeen: '2 hrs ago', heartRate: 72, bp: '122/80', spo2: 97, status: 'stable' as const,
  },
  {
    id: 'pat-002', name: 'Dorothy Chen', age: 78, condition: 'Chronic Heart Failure',
    lastSeen: '30 min ago', heartRate: 88, bp: '138/90', spo2: 94, status: 'warning' as const,
  },
  {
    id: 'pat-003', name: 'Marcus Williams', age: 66, condition: 'COPD + Asthma',
    lastSeen: '1 hr ago', heartRate: 76, bp: '119/76', spo2: 96, status: 'stable' as const,
  },
]

type PatientStatus = 'stable' | 'warning' | 'critical'

const STATUS_STYLES: Record<PatientStatus, { badge: string; dot: string; label: string }> = {
  stable:   { badge: 'badge-normal',   dot: 'status-dot-green', label: 'Stable'   },
  warning:  { badge: 'badge-warning',  dot: 'status-dot-amber', label: 'Warning'  },
  critical: { badge: 'badge-critical', dot: 'status-dot-red',   label: 'Critical' },
}

function PatientCard({ patient }: { patient: typeof MOCK_PATIENTS[0] }) {
  const style = STATUS_STYLES[patient.status]
  return (
    <article
      id={`patient-card-${patient.id}`}
      className="card card-hover"
      aria-label={`Patient ${patient.name}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-800">{patient.name}</h4>
          <p className="text-xs text-slate-400">Age {patient.age} · {patient.condition}</p>
        </div>
        <span className={style.badge}>{style.label}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
        {[
          { label: 'HR', value: patient.heartRate, unit: 'bpm' },
          { label: 'BP', value: patient.bp, unit: '' },
          { label: 'SpO₂', value: patient.spo2, unit: '%' },
        ].map(({ label, value, unit }) => (
          <div key={label} className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-[10px] text-slate-400 uppercase font-medium">{label}</p>
            <p className="text-sm font-bold text-slate-800 tabular-nums">{value}<span className="text-[10px] font-normal text-slate-400"> {unit}</span></p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className={`status-dot ${style.dot}`} />
          {style.label}
        </span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {patient.lastSeen}</span>
      </div>
    </article>
  )
}

export function CaregiverDashboard({ currentUser }: CaregiverDashboardProps) {
  void currentUser
  const totalWarnings = MOCK_PATIENTS.filter((p) => p.status !== 'stable').length

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Summary KPIs */}
      <section aria-label="Care summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard id="cg-stat-patients"  label="Patients Monitored" value={MOCK_PATIENTS.length} trend={VitalTrend.Stable} severity={AlertSeverity.Info} icon={<Users className="w-5 h-5" />} />
        <StatCard id="cg-stat-stable"    label="Stable"    value={MOCK_PATIENTS.filter((p) => p.status === 'stable').length}   trend={VitalTrend.Stable} severity={AlertSeverity.Info}    icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatCard id="cg-stat-warnings"  label="Needs Attention" value={totalWarnings}   trend={totalWarnings > 0 ? VitalTrend.Up : VitalTrend.Stable} severity={totalWarnings > 0 ? AlertSeverity.Warning : AlertSeverity.Info}  icon={<AlertCircle className="w-5 h-5" />} />
        <StatCard id="cg-stat-tasks"     label="Tasks Today" value={4}   trend={VitalTrend.Stable} severity={AlertSeverity.Info}    icon={<Activity className="w-5 h-5" />} />
      </section>

      {/* Patient cards */}
      <section aria-label="Patient list">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Heart className="w-4 h-4 text-brand-500" /> My Patients
          </h3>
          <button className="btn-secondary py-1.5 text-xs">Add Patient</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_PATIENTS.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      </section>

      {/* Placeholder for care task list — Member 3 to wire Supabase */}
      <section aria-label="Today's care tasks" className="card">
        <h3 className="font-semibold text-slate-800 mb-3">Today's Care Tasks</h3>
        <p className="text-sm text-slate-400 italic">
          🔧 Member 3 — connect <code className="bg-slate-100 px-1 rounded">care_tasks</code> table from Supabase here.
        </p>
      </section>
    </div>
  )
}
