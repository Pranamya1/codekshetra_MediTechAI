/**
 * @file OnboardingFlow.tsx
 * @description Multi-step onboarding form shown to new users after first sign-up.
 * Collects health profile + medication schedule, saves to Supabase.
 *
 * Steps:
 *  1 - Health Profile  (conditions, DOB, blood type, height, weight, allergies)
 *  2 - Medications     (name, dosage, timing, meal instruction, frequency)
 *  3 - Done / summary
 */

import { useState, type FormEvent } from 'react'
import {
  Activity, ChevronRight, ChevronLeft, Plus, Trash2,
  User, Pill, CheckCircle, Clock, Utensils,
} from 'lucide-react'
import { supabase } from '../types/supabase'
import type { IUser } from '../types/medical'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HealthProfile {
  dateOfBirth:  string
  gender:       string
  bloodType:    string
  heightCm:     string
  weightKg:     string
  conditions:   string[]  // free-text tags
  allergies:    string[]  // free-text tags
}

type MealInstruction = 'before_meal' | 'after_meal' | 'with_meal' | 'any_time'
type MedTiming = 'morning' | 'afternoon' | 'evening' | 'night'

interface MedicationEntry {
  id:              string  // local UUID
  name:            string
  dosage:          string  // e.g. "500mg"
  timings:         MedTiming[]
  mealInstruction: MealInstruction
  frequency:       string  // "Once daily" | "Twice daily" | "Three times daily" | "As needed"
  startDate:       string
  notes:           string
}

interface OnboardingFlowProps {
  currentUser: IUser
  onComplete:  () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', "Don't know"]

const COMMON_CONDITIONS = [
  'Type 2 Diabetes', 'Type 1 Diabetes', 'Hypertension', 'Heart Disease',
  'Asthma', 'COPD', 'Arthritis', 'Chronic Kidney Disease',
  'Hypothyroidism', 'Hyperthyroidism', 'Depression', 'Anxiety',
  'Osteoporosis', 'High Cholesterol', 'Obesity', 'Sleep Apnea',
]

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed', 'Weekly']

const TIMING_OPTIONS: { key: MedTiming; label: string; emoji: string }[] = [
  { key: 'morning',   label: 'Morning',   emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { key: 'evening',   label: 'Evening',   emoji: '🌆' },
  { key: 'night',     label: 'Night',     emoji: '🌙' },
]

const MEAL_OPTIONS: { key: MealInstruction; label: string; icon: string }[] = [
  { key: 'before_meal', label: 'Before meal', icon: '🍽️' },
  { key: 'after_meal',  label: 'After meal',  icon: '✅' },
  { key: 'with_meal',   label: 'With meal',   icon: '🥗' },
  { key: 'any_time',    label: 'Any time',    icon: '🕐' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyMed(): MedicationEntry {
  return {
    id:              uid(),
    name:            '',
    dosage:          '',
    timings:         ['morning'],
    mealInstruction: 'after_meal',
    frequency:       'Once daily',
    startDate:       new Date().toISOString().split('T')[0],
    notes:           '',
  }
}

// ─── Tag input (conditions / allergies) ──────────────────────────────────────

function TagInput({
  label, tags, onAdd, onRemove, suggestions, placeholder,
}: {
  label:       string
  tags:        string[]
  onAdd:       (tag: string) => void
  onRemove:    (tag: string) => void
  suggestions: string[]
  placeholder: string
}) {
  const [input, setInput] = useState('')
  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  )

  const add = (tag: string) => {
    const t = tag.trim()
    if (t && !tags.includes(t)) { onAdd(t); setInput('') }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>

      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span key={tag}
            className="flex items-center gap-1 bg-brand-100 text-brand-700
                       text-xs font-medium px-2.5 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => onRemove(tag)}
              className="ml-1 text-brand-400 hover:text-brand-700">✕</button>
          </span>
        ))}
      </div>

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(input) } }}
        placeholder={placeholder}
        className="form-input w-full"
      />

      {/* Suggestions dropdown */}
      {input.length > 0 && filtered.length > 0 && (
        <div className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto z-10">
          {filtered.slice(0, 6).map((s) => (
            <button key={s} type="button"
              onMouseDown={() => add(s)}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700
                         hover:bg-brand-50 hover:text-brand-700 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Quick-add suggestions when empty */}
      {tags.length === 0 && input === '' && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.slice(0, 6).map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-200
                         text-slate-500 hover:border-brand-400 hover:text-brand-600
                         hover:bg-brand-50 transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Medication Card ──────────────────────────────────────────────────────────

function MedicationCard({
  med, onChange, onRemove, index,
}: {
  med:      MedicationEntry
  onChange: (updated: MedicationEntry) => void
  onRemove: () => void
  index:    number
}) {
  const set = <K extends keyof MedicationEntry>(key: K, val: MedicationEntry[K]) =>
    onChange({ ...med, [key]: val })

  const toggleTiming = (t: MedTiming) => {
    const existing = med.timings.includes(t)
    if (existing && med.timings.length === 1) return  // keep at least one
    set('timings', existing ? med.timings.filter((x) => x !== t) : [...med.timings, t])
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-600">
          Medication #{index + 1}
        </span>
        <button type="button" onClick={onRemove}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600
                     transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>

      {/* Name + Dosage */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Medicine name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={med.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Metformin"
            className="form-input w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Dosage <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={med.dosage}
            onChange={(e) => set('dosage', e.target.value)}
            placeholder="e.g. 500mg, 10ml"
            className="form-input w-full text-sm"
          />
        </div>
      </div>

      {/* Frequency + Start date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Frequency
          </label>
          <select
            value={med.frequency}
            onChange={(e) => set('frequency', e.target.value)}
            className="form-input w-full text-sm"
          >
            {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Start date
          </label>
          <input
            type="date"
            value={med.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            className="form-input w-full text-sm"
          />
        </div>
      </div>

      {/* Timing of day */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
          <Clock className="w-3.5 h-3.5" /> When to take (select all that apply)
        </label>
        <div className="flex gap-2 flex-wrap">
          {TIMING_OPTIONS.map(({ key, label, emoji }) => {
            const active = med.timings.includes(key)
            return (
              <button
                key={key} type="button"
                onClick={() => toggleTiming(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                            border-2 transition-all duration-150
                            ${active
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                            }`}
              >
                <span>{emoji}</span> {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Meal instruction */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
          <Utensils className="w-3.5 h-3.5" /> Meal instruction
        </label>
        <div className="flex gap-2 flex-wrap">
          {MEAL_OPTIONS.map(({ key, label, icon }) => (
            <button
              key={key} type="button"
              onClick={() => set('mealInstruction', key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                          border-2 transition-all duration-150
                          ${med.mealInstruction === key
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Special instructions (optional)
        </label>
        <input
          type="text"
          value={med.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="e.g. Take with plenty of water"
          className="form-input w-full text-sm"
        />
      </div>
    </div>
  )
}

// ─── Step Progress ────────────────────────────────────────────────────────────

function StepProgress({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Profile', fullLabel: 'Health Profile', icon: <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
    { n: 2, label: 'Meds', fullLabel: 'Medications', icon: <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
    { n: 3, label: 'Done', fullLabel: 'All set!', icon: <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  ]
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1.5 sm:gap-2">
          <div className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold
                          transition-all duration-300
                          ${step === s.n
                            ? 'bg-brand-600 text-white shadow-md'
                            : step > s.n
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-white/20 text-white/60'
                          }`}>
            {step > s.n ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : s.icon}
            <span className="hidden sm:inline">{s.fullLabel}</span>
            <span className="sm:hidden">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-3 sm:w-6 transition-colors ${step > s.n + 1 ? 'bg-emerald-400' : 'bg-white/20'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Onboarding Component ────────────────────────────────────────────────

export function OnboardingFlow({ currentUser, onComplete }: OnboardingFlowProps) {
  const [step,    setStep]    = useState<1 | 2 | 3>(1)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [profile, setProfile] = useState<HealthProfile>({
    dateOfBirth: '',
    gender:      '',
    bloodType:   '',
    heightCm:    '',
    weightKg:    '',
    conditions:  [],
    allergies:   [],
  })

  const [medications, setMedications] = useState<MedicationEntry[]>([emptyMed()])

  // ── Profile field helpers ─────────────────────────────────────────────────
  const setP = <K extends keyof HealthProfile>(key: K, val: HealthProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: val }))

  // ── Med list helpers ──────────────────────────────────────────────────────
  const addMed    = () => setMedications((m) => [...m, emptyMed()])
  const removeMed = (id: string) => setMedications((m) => m.filter((x) => x.id !== id))
  const updateMed = (updated: MedicationEntry) =>
    setMedications((m) => m.map((x) => (x.id === updated.id ? updated : x)))

  // ── Helper to save patient profile locally and in Supabase ─────────────────
  const savePatientProfile = async () => {
    const profileRow = {
      id: `pat_${currentUser.id}`,
      user_id:       currentUser.id,
      full_name:     currentUser.fullName,
      gender:        profile.gender || null,
      date_of_birth: profile.dateOfBirth,
      blood_type:    profile.bloodType || null,
      height_cm:     profile.heightCm ? parseFloat(profile.heightCm) : null,
      weight_kg:     profile.weightKg ? parseFloat(profile.weightKg) : null,
      allergies:     profile.allergies,
    }

    // Cache locally
    localStorage.setItem(`medicare_patient_profile_${currentUser.id}`, JSON.stringify(profileRow))
    if (profile.conditions.length > 0) {
      localStorage.setItem('medicare_patient_conditions', JSON.stringify(profile.conditions))
      const first = profile.conditions.find(c => c !== 'None / Healthy') || profile.conditions[0]
      localStorage.setItem(`medicare_patient_primary_condition_${currentUser.id}`, first)
    }

    try {
      await supabase.from('patients').upsert({
        user_id:       currentUser.id,
        full_name:     currentUser.fullName,
        gender:        profile.gender || null,
        date_of_birth: profile.dateOfBirth,
        blood_type:    profile.bloodType || null,
        height_cm:     profile.heightCm ? parseFloat(profile.heightCm) : null,
        weight_kg:     profile.weightKg ? parseFloat(profile.weightKg) : null,
        allergies:     profile.allergies,
      } as any)
    } catch (e) {
      console.warn('Supabase patient upsert error:', e)
    }
  }

  // ── Step 1 → Step 2 (or Step 3 if healthy + no allergies) ───────────────────
  const handleStep1Next = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!profile.dateOfBirth) return setError('Please enter your date of birth.')
    if (!profile.gender)      return setError('Please select your gender.')
    if (profile.conditions.length === 0)
      return setError('Please add at least one condition, or tap "I have no conditions".')

    // Persist conditions immediately
    if (profile.conditions.length > 0) {
      localStorage.setItem('medicare_patient_conditions', JSON.stringify(profile.conditions))
      const first = profile.conditions.find(c => c !== 'None / Healthy') || profile.conditions[0]
      localStorage.setItem(`medicare_patient_primary_condition_${currentUser.id}`, first)
    }

    // If healthy with no known allergies → no medications → skip to Done
    const isHealthy = profile.conditions.length === 1 &&
      profile.conditions[0] === 'None / Healthy'
    const hasAllergies = profile.allergies.length > 0
    if (isHealthy && !hasAllergies) {
      await savePatientProfile()
      setStep(3)   // skip medication step
    } else {
      setStep(2)
    }
  }

  // ── Step 2 → Save → Step 3 ────────────────────────────────────────────────
  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const invalid = medications.find((m) => !m.name.trim() || !m.dosage.trim())
    if (invalid) return setError('Please fill in the name and dosage for all medications.')

    setSaving(true)
    try {
      // 1. Upsert into patients table + localStorage
      await savePatientProfile()

      // 2. Get the patient row's id
      const { data: patientData } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', currentUser.id)
        .single() as any

      if (patientData?.id) {
        // 3. Insert medications with full timing + meal instruction data
        const medRows = medications.map((m) => ({
          patient_id:       patientData.id,
          prescribed_by:    null,
          name:             m.name.trim(),
          dosage:           m.dosage.trim(),
          frequency:        m.frequency,
          timings:          m.timings,          // ['morning', 'evening', ...]
          meal_instruction: m.mealInstruction,  // 'before_meal' | 'after_meal' | etc.
          notes:            m.notes?.trim() || null,
          is_critical:      false,
          status:           'active',
          start_date:       m.startDate,
          end_date:         null,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('medications').insert(medRows as any)
      }

      setStep(3)
    } catch (err) {
      // If Supabase is not fully configured, still let user proceed
      console.warn('Onboarding save skipped (Supabase not configured):', err)
      setStep(3)
    } finally {
      setSaving(false)
    }
  }

  // ── Skip onboarding (no medications yet) ─────────────────────────────────
  const handleSkip = () => onComplete()

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#0c1e3d] via-[#0d3575] to-[#1a56a0]
                    flex items-start justify-center py-6 sm:py-10 px-3 sm:px-4">
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-6 sm:mb-8">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl
                          bg-white/15 border border-white/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-extrabold text-white">MediCare AI</span>
        </div>

        {/* Step progress */}
        <StepProgress step={step} />

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* ── STEP 1: Health Profile ── */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} className="p-5 sm:p-8 space-y-5 sm:space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800">Your Health Profile</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Tell us about yourself so we can personalise your dashboard.
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3
                                text-sm text-red-700">{error}</div>
              )}

              {/* DOB + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Date of birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(e) => setP('dateOfBirth', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setP('gender', e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Blood type + Height + Weight */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Blood type
                  </label>
                  <select
                    value={profile.bloodType}
                    onChange={(e) => setP('bloodType', e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="">Select…</option>
                    {BLOOD_TYPES.map((bt) => <option key={bt}>{bt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={profile.heightCm}
                    onChange={(e) => setP('heightCm', e.target.value)}
                    placeholder="e.g. 170"
                    min={50} max={250}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={profile.weightKg}
                    onChange={(e) => setP('weightKg', e.target.value)}
                    placeholder="e.g. 72"
                    min={10} max={300}
                    className="form-input w-full"
                  />
                </div>
              </div>

              {/* Conditions */}
              <TagInput
                label="Health conditions / Diseases *"
                tags={profile.conditions}
                onAdd={(t) => setP('conditions', [...profile.conditions, t])}
                onRemove={(t) => setP('conditions', profile.conditions.filter((c) => c !== t))}
                suggestions={COMMON_CONDITIONS}
                placeholder='Type a condition and press Enter, or pick from suggestions…'
              />
              <button
                type="button"
                onClick={() => setP('conditions', [...profile.conditions, 'None / Healthy']
                  .filter((v, i, a) => a.indexOf(v) === i))}
                className="text-xs text-slate-400 hover:text-brand-600 underline -mt-4"
              >
                I have no conditions (healthy)
              </button>

              {/* Allergies */}
              <TagInput
                label="Known allergies (optional)"
                tags={profile.allergies}
                onAdd={(t) => setP('allergies', [...profile.allergies, t])}
                onRemove={(t) => setP('allergies', profile.allergies.filter((a) => a !== t))}
                suggestions={['Penicillin', 'Aspirin', 'Sulfa drugs', 'Ibuprofen', 'Latex', 'Peanuts', 'Shellfish', 'Dairy']}
                placeholder='Type an allergy and press Enter…'
              />

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={handleSkip}
                  className="text-sm text-slate-400 hover:text-slate-600 underline">
                  Skip onboarding
                </button>
                <button type="submit" className="btn-primary px-8 py-3">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: Medications ── */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="p-5 sm:p-8 space-y-4 sm:space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800">Your Medications</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Add all medicines you currently take. You can add or edit more later.
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3
                                text-sm text-red-700">{error}</div>
              )}

              {/* Medication list */}
              <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
                {medications.map((med, i) => (
                  <MedicationCard
                    key={med.id}
                    med={med}
                    index={i}
                    onChange={updateMed}
                    onRemove={() => removeMed(med.id)}
                  />
                ))}
              </div>

              {/* Add medication */}
              <button
                type="button"
                onClick={addMed}
                className="flex items-center gap-2 w-full justify-center rounded-2xl border-2
                           border-dashed border-brand-300 py-3 text-sm font-medium text-brand-600
                           hover:border-brand-500 hover:bg-brand-50 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add another medication
              </button>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={async () => {
                    await savePatientProfile()
                    setStep(3)
                  }}
                    className="btn-secondary px-6 py-3 text-sm">
                    No medications
                  </button>
                  <button type="submit" disabled={saving}
                    className="btn-primary px-8 py-3 disabled:opacity-60">
                    {saving ? 'Saving…' : <>Save & Continue <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── STEP 3: All set ── */}
          {step === 3 && (
            <div className="p-10 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center
                              rounded-2xl bg-emerald-100">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
                You're all set, {currentUser.fullName.split(' ')[0]}!
              </h2>
              <p className="text-slate-500 text-sm mb-2">
                Your health profile has been saved. Your dashboard is ready.
              </p>
              {profile.conditions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 my-4">
                  {profile.conditions.map((c) => (
                    <span key={c} className="badge-info">{c}</span>
                  ))}
                </div>
              )}
              {medications.filter((m) => m.name).length > 0 && (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-left mt-4 mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                    Medication Schedule
                  </p>
                  {medications.filter((m) => m.name).map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2
                                               border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{m.name} · {m.dosage}</p>
                        <p className="text-xs text-slate-500">
                          {m.frequency} · {m.timings.join(', ')} · {MEAL_OPTIONS.find(x => x.key === m.mealInstruction)?.label}
                        </p>
                      </div>
                      <span className="badge-normal text-xs">Active</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                id="onboarding-go-to-dashboard-btn"
                onClick={onComplete}
                className="btn-primary px-10 py-3 text-base"
              >
                Go to my Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
