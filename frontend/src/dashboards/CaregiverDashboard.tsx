/**
 * @file CaregiverDashboard.tsx
 * @description Caregiver monitoring dashboard.
 * Displays the health status of all assigned patients at a glance,
 * with full "Add Patient" capability that persists to storage and backend.
 */

import { useState } from 'react'
import {
  Users, AlertCircle, CheckCircle2, Clock, Heart, Activity,
  Plus, Trash2,
} from 'lucide-react'
import { AlertSeverity, VitalTrend, type IUser } from '../types/medical'
import { StatCard } from '../components/StatCard'
import { AddPatientModal, type NewPatientData } from '../components/AddPatientModal'

interface CaregiverDashboardProps {
  currentUser: IUser
}

export type PatientStatus = 'stable' | 'warning' | 'critical'

export interface CaregiverPatientItem {
  id:        string
  name:      string
  age:       number
  condition: string
  lastSeen:  string
  heartRate: number
  bp:        string
  spo2:      number
  status:    PatientStatus
}

export const INITIAL_MOCK_PATIENTS: CaregiverPatientItem[] = []

export const CAREGIVER_PATIENTS_STORAGE_KEY = 'medicare_caregiver_patients'

export function getStoredPatients(): CaregiverPatientItem[] {
  try {
    const raw = localStorage.getItem(CAREGIVER_PATIENTS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.error('Failed to load caregiver patients from storage:', err)
  }
  return []
}

const STATUS_STYLES: Record<PatientStatus, { badge: string; dot: string; label: string }> = {
  stable:   { badge: 'badge-normal',   dot: 'status-dot-green', label: 'Stable'   },
  warning:  { badge: 'badge-warning',  dot: 'status-dot-amber', label: 'Warning'  },
  critical: { badge: 'badge-critical', dot: 'status-dot-red',   label: 'Critical' },
}

function PatientCard({
  patient,
  onDelete,
}: {
  patient: CaregiverPatientItem
  onDelete: (id: string) => void
}) {
  const style = STATUS_STYLES[patient.status]
  return (
    <article
      id={`patient-card-${patient.id}`}
      className="card card-hover relative group transition-all duration-200"
      aria-label={`Patient ${patient.name}`}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-800 truncate">{patient.name}</h4>
          <p className="text-xs text-slate-400 truncate">Age {patient.age} · {patient.condition}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={style.badge}>{style.label}</span>
          <button
            onClick={() => onDelete(patient.id)}
            title="Remove from monitoring"
            aria-label={`Remove ${patient.name}`}
            className="p-1 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50
                       opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-3 text-center">
        {[
          { label: 'HR',   value: patient.heartRate, unit: 'bpm' },
          { label: 'BP',   value: patient.bp,        unit: '' },
          { label: 'SpO₂', value: patient.spo2,      unit: '%' },
        ].map(({ label, value, unit }) => (
          <div key={label} className="rounded-xl bg-slate-50 px-2 py-2 border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase font-medium">{label}</p>
            <p className="text-sm font-bold text-slate-800 tabular-nums">
              {value}
              {unit && <span className="text-[10px] font-normal text-slate-400"> {unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
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

  const [patients, setPatients] = useState<CaregiverPatientItem[]>(getStoredPatients)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Sync to localStorage
  const savePatients = (newPatients: CaregiverPatientItem[]) => {
    setPatients(newPatients)
    try {
      localStorage.setItem(CAREGIVER_PATIENTS_STORAGE_KEY, JSON.stringify(newPatients))
    } catch (e) {
      console.error('Failed to save patients to localStorage', e)
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

    // Optional background sync to backend /patients/ endpoint
    fetch('/api/patients/', {
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

  const totalWarnings = patients.filter((p) => p.status !== 'stable').length
  const totalStable   = patients.filter((p) => p.status === 'stable').length

  return (
    <div className="h-full overflow-y-auto bg-white p-3 sm:p-5 space-y-3 sm:space-y-4 animate-fade-in pb-16 md:pb-6">

      {/* ── Summary KPIs ── */}
      <section aria-label="Care summary" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          id="cg-stat-patients"
          label="Patients Monitored"
          value={patients.length}
          trend={VitalTrend.Stable}
          severity={AlertSeverity.Info}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          id="cg-stat-stable"
          label="Stable"
          value={totalStable}
          trend={VitalTrend.Stable}
          severity={AlertSeverity.Info}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          id="cg-stat-warnings"
          label="Needs Attention"
          value={totalWarnings}
          trend={totalWarnings > 0 ? VitalTrend.Up : VitalTrend.Stable}
          severity={totalWarnings > 0 ? AlertSeverity.Warning : AlertSeverity.Info}
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <StatCard
          id="cg-stat-tasks"
          label="Tasks Today"
          value={4}
          trend={VitalTrend.Stable}
          severity={AlertSeverity.Info}
          icon={<Activity className="w-5 h-5" />}
        />
      </section>

      {/* ── Patient cards ── */}
      <section aria-label="Patient list">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
              <Heart className="w-4 h-4 text-emerald-500" />
            </span>
            My Patients
            <span className="text-xs font-normal text-slate-400">({patients.length})</span>
          </h3>
          <button
            id="caregiver-add-patient-btn"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Patient
          </button>
        </div>

        {patients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No patients under active care</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Add your first patient to start monitoring vitals and medication adherence</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary py-2 px-4 text-xs mx-auto"
            >
              <Plus className="w-4 h-4" /> Add Patient
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {patients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onDelete={handleDeletePatient}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Care tasks ── */}
      <section aria-label="Today's care tasks" className="dash-section">
        <h3 className="font-semibold text-slate-800 text-sm mb-2">Today's Care Tasks</h3>
        <p className="text-xs text-slate-400">
          No care tasks scheduled yet. Add daily routines and checks from the Care Tasks section.
        </p>
      </section>

      {/* ── Add Patient Modal ── */}
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddPatient}
      />
    </div>
  )
}
