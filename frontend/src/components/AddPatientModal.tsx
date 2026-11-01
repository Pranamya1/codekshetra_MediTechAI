/**
 * @file AddPatientModal.tsx
 * @description Accessible modal dialog for caregivers and doctors to add a new patient under care.
 * Compliant with modern web dialog standards (native <dialog>, showModal, overscroll containment, autofocus).
 */

import { useState, useRef, useEffect, type FormEvent } from 'react'
import {
  X, UserPlus, Heart, Activity, Droplets, AlertCircle,
} from 'lucide-react'

export interface NewPatientData {
  id:        string
  name:      string
  age:       number
  gender:    'male' | 'female' | 'other'
  condition: string
  status:    'stable' | 'warning' | 'critical'
  heartRate: number
  bp:        string
  spo2:      number
  lastSeen:  string
  notes?:    string
}

interface AddPatientModalProps {
  isOpen:   boolean
  onClose:  () => void
  onAdd:    (patient: NewPatientData) => void
}

const COMMON_CONDITIONS = [
  'Type 2 Diabetes',
  'Hypertension',
  'Chronic Heart Failure',
  'COPD / Asthma',
  'Dementia / Alzheimer’s',
  'Post-Stroke Recovery',
  'Chronic Kidney Disease',
  'Arthritis & Mobility',
]

export function AddPatientModal({ isOpen, onClose, onAdd }: AddPatientModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [name, setName]           = useState('')
  const [age, setAge]             = useState('')
  const [gender, setGender]       = useState<'male' | 'female' | 'other'>('female')
  const [condition, setCondition] = useState('')
  const [status, setStatus]       = useState<'stable' | 'warning' | 'critical'>('stable')
  const [heartRate, setHeartRate] = useState('75')
  const [bp, setBp]               = useState('120/80')
  const [spo2, setSpo2]           = useState('98')
  const [notes, setNotes]         = useState('')
  const [error, setError]         = useState<string | null>(null)

  // Sync <dialog> open/close via native showModal()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  // Handle native ESC cancellation
  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
    e.preventDefault()
    onClose()
  }

  // Backdrop click dismissal (checking pointer coordinates)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    if (!isInDialog) {
      onClose()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter the patient’s full name.')
      return
    }
    const parsedAge = parseInt(age, 10)
    if (!age || isNaN(parsedAge) || parsedAge < 0 || parsedAge > 125) {
      setError('Please enter a valid age between 0 and 125.')
      return
    }
    if (!condition.trim()) {
      setError('Please select or specify the primary condition.')
      return
    }

    const newPatient: NewPatientData = {
      id:        `pat-${Date.now()}`,
      name:      name.trim(),
      age:       parsedAge,
      gender,
      condition: condition.trim(),
      status,
      heartRate: parseInt(heartRate, 10) || 75,
      bp:        bp.trim() || '120/80',
      spo2:      parseInt(spo2, 10) || 98,
      lastSeen:  'Just now',
      notes:     notes.trim() || undefined,
    }

    onAdd(newPatient)
    // Reset form
    setName('')
    setAge('')
    setCondition('')
    setStatus('stable')
    setHeartRate('75')
    setBp('120/80')
    setSpo2('98')
    setNotes('')
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      id="add-patient-dialog"
      aria-labelledby="add-patient-title"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm
                 p-0 rounded-3xl bg-white shadow-2xl border border-slate-200
                 w-full max-w-lg m-auto overflow-hidden
                 overscroll-contain animate-fade-in"
    >
      <div className="flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-patient-title" className="text-base font-bold text-slate-800">
                Add New Patient
              </h2>
              <p className="text-xs text-slate-400">Enroll a patient to monitor vitals and care routines</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500
                       hover:bg-slate-200 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="patient-name-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="patient-name-input"
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dorothy Chen"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm
                           focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all"
              />
            </div>
            <div>
              <label htmlFor="patient-age-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                id="patient-age-input"
                type="number"
                min="0"
                max="125"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="68"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm
                           focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all"
              />
            </div>
          </div>

          {/* Gender & Monitoring Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="patient-gender-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                id="patient-gender-select"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white
                           focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other / Non-binary</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Care Status
              </label>
              <div className="flex gap-1.5">
                {[
                  { key: 'stable',   label: 'Stable',   color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
                  { key: 'warning',  label: 'Warning',  color: 'border-amber-300 bg-amber-50 text-amber-700' },
                  { key: 'critical', label: 'Critical', color: 'border-red-300 bg-red-50 text-red-700' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatus(s.key as any)}
                    className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                      status === s.key ? s.color + ' ring-2 ring-offset-1 ring-slate-400' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Condition */}
          <div>
            <label htmlFor="patient-condition-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Primary Medical Condition <span className="text-red-500">*</span>
            </label>
            <input
              id="patient-condition-input"
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. Type 2 Diabetes + Hypertension"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm
                         focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all mb-2"
            />
            {/* Quick condition chips */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    condition === c
                      ? 'bg-brand-50 border-brand-300 text-brand-700 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Vitals Row */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Baseline Vitals (Optional)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                  <Heart className="w-3 h-3 text-red-500" /> HR (bpm)
                </span>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="75"
                  className="w-full mt-1 bg-transparent text-sm font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                  <Activity className="w-3 h-3 text-brand-500" /> BP (mmHg)
                </span>
                <input
                  type="text"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  placeholder="120/80"
                  className="w-full mt-1 bg-transparent text-sm font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                  <Droplets className="w-3 h-3 text-emerald-500" /> SpO₂ (%)
                </span>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  placeholder="98"
                  className="w-full mt-1 bg-transparent text-sm font-bold text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Care Notes */}
          <div>
            <label htmlFor="patient-notes-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Care Instructions / Notes
            </label>
            <textarea
              id="patient-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Needs morning insulin assistance; check blood glucose before breakfast."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm resize-none
                         focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600
                         hover:bg-slate-100 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              id="submit-add-patient-btn"
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-sm font-semibold text-white
                         hover:bg-brand-700 shadow-md shadow-brand-500/20 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Save Patient
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
