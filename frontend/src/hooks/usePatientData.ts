/**
 * @file usePatientData.ts
 * @description Custom hook that fetches all patient-specific data from Supabase.
 *
 * Data fetched (all scoped to logged-in user via RLS):
 *  - patient profile row
 *  - medications list
 *  - today's medication logs (check-in status)
 *  - recent vitals (last 20)
 *  - upcoming appointments (next 5)
 *
 * Returns empty arrays for new users — no mock data.
 * Automatically generates today's log slots for any medication that
 * doesn't have a log entry yet (so new users see pending slots immediately
 * after onboarding).
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../types/supabase'

// ─── Shape of data returned ───────────────────────────────────────────────────

export interface PatientRow {
  id:            string
  user_id:       string
  full_name:     string
  gender:        string | null
  date_of_birth: string | null
  blood_type:    string | null
  height_cm:     number | null
  weight_kg:     number | null
  allergies:     string[]
}

export interface MedicationRow {
  id:               string
  patient_id:       string
  name:             string
  dosage:           string
  frequency:        string
  status:           string
  start_date:       string | null
  timings:          string[]          // ['morning', 'evening', ...]
  meal_instruction: string            // 'before_meal' | 'after_meal' | 'with_meal' | 'any_time'
  notes:            string | null
  is_critical:      boolean
}

export interface MedLogRow {
  id:              string
  patient_id:      string
  medication_id:   string
  medication_name: string
  dosage:          string | null
  timing_slot:     string            // 'morning' | 'afternoon' | 'evening' | 'night'
  scheduled_date:  string
  taken_at:        string | null
  status:          string            // 'pending' | 'taken' | 'missed'
  is_critical:     boolean
}

export interface VitalRow {
  id:                 string
  patient_id:         string
  recorded_at:        string
  heart_rate:         number | null
  systolic_bp:        number | null
  diastolic_bp:       number | null
  oxygen_saturation:  number | null
  temperature:        number | null
  respiratory_rate:   number | null
  blood_glucose?:     number | null
  weight?:            number | null
}

export interface AppointmentRow {
  id:               string
  patient_id:       string
  scheduled_at:     string
  duration_minutes: number
  type:             string
  status:           string
  reason:           string | null
}

export interface PatientDataState {
  loading:             boolean
  error:               string | null
  patient:             PatientRow | null
  medications:         MedicationRow[]
  todayLogs:           MedLogRow[]
  vitals:              VitalRow[]
  appointments:        AppointmentRow[]
  isEmpty:             boolean          // true if brand-new user with no records
  primaryCondition:    string
  setPrimaryCondition: (condition: string) => void
  refetch:             () => void
}

// ─── Today's date (YYYY-MM-DD) ────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Determine if a timing slot is overdue ────────────────────────────────────

const SLOT_CUTOFF_HOURS: Record<string, number> = {
  morning:   10,  // missed if not taken by 10am
  afternoon: 14,  // missed if not taken by 2pm
  evening:   20,  // missed if not taken by 8pm
  night:     23,  // missed if not taken by 11pm
}

function isSlotMissed(timingSlot: string): boolean {
  const cutoff = SLOT_CUTOFF_HOURS[timingSlot]
  if (!cutoff) return false
  return new Date().getHours() > cutoff
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePatientData(userId: string | undefined): PatientDataState {
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [patient,      setPatient]      = useState<PatientRow | null>(null)
  const [medications,  setMedications]  = useState<MedicationRow[]>([])
  const [todayLogs,    setTodayLogs]    = useState<MedLogRow[]>([])
  const [vitals,       setVitals]       = useState<VitalRow[]>([])
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])

  const [primaryCondition, setPrimaryConditionState] = useState<string>(() => {
    if (!userId) return 'Type 2 Diabetes'
    const stored = localStorage.getItem(`medicare_patient_primary_condition_${userId}`)
    if (stored) return stored
    try {
      const conds = JSON.parse(localStorage.getItem('medicare_patient_conditions') || '[]')
      if (Array.isArray(conds) && conds.length > 0 && conds[0]) return conds[0]
    } catch {}
    return 'Type 2 Diabetes'
  })

  const setPrimaryCondition = useCallback((condition: string) => {
    setPrimaryConditionState(condition)
    if (userId) {
      localStorage.setItem(`medicare_patient_primary_condition_${userId}`, condition)
    }
  }, [userId])

  const fetchAll = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      // ── 1. Patient profile ─────────────────────────────────────────────────
      let { data: patientData, error: patientErr } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle() as any

      if (patientErr) {
        console.warn('Patient fetch warning:', patientErr.message)
      }

      if (!patientData) {
        const localProfile = localStorage.getItem(`medicare_patient_profile_${userId}`)
        if (localProfile) {
          try {
            patientData = JSON.parse(localProfile)
          } catch {}
        }
      }

      if (!patientData && localStorage.getItem('medicare_onboarding_done')) {
        patientData = {
          id: `pat_${userId}`,
          user_id: userId,
          full_name: '',
          gender: null,
          date_of_birth: null,
          blood_type: null,
          height_cm: null,
          weight_kg: null,
          allergies: [],
        }
      }

      if (!patientData) {
        // Brand-new user — no profile row yet (onboarding incomplete)
        setPatient(null)
        setLoading(false)
        return
      }

      setPatient(patientData as PatientRow)

      const patientId = patientData.id

      // ── 2. Medications ─────────────────────────────────────────────────────
      const { data: medsData, error: medsErr } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active') as any

      if (medsErr) {
        console.warn('Medications query warning:', medsErr.message)
      }
      const meds: MedicationRow[] = (medsData ?? []).map((m: any) => ({
        ...m,
        timings:          m.timings          ?? ['morning'],
        meal_instruction: m.meal_instruction ?? 'any_time',
        is_critical:      m.is_critical      ?? false,
      }))
      setMedications(meds)

      // ── 3. Today's medication logs ─────────────────────────────────────────
      const today = todayDate()
      let { data: logsData, error: logsErr } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('patient_id', patientId)
        .eq('scheduled_date', today) as any

      if (logsErr) {
        // medication_logs table may not exist yet (migration not run)
        console.warn('medication_logs table not found — run the SQL migration.', logsErr.message)
        logsData = []
      }

      // Generate missing log slots for today (for any med/timing combo that
      // doesn't have a log row yet). Insert them so the UI shows pending slots.
      const existingKeys = new Set(
        (logsData ?? []).map((l: any) => `${l.medication_id}__${l.timing_slot}`)
      )

      const slotsToInsert: Omit<MedLogRow, 'id'>[] = []
      for (const med of meds) {
        for (const slot of med.timings) {
          const key = `${med.id}__${slot}`
          if (!existingKeys.has(key)) {
            const missed = isSlotMissed(slot)
            slotsToInsert.push({
              patient_id:      patientId,
              medication_id:   med.id,
              medication_name: med.name,
              dosage:          med.dosage,
              timing_slot:     slot,
              scheduled_date:  today,
              taken_at:        null,
              status:          missed ? 'missed' : 'pending',
              is_critical:     med.is_critical,
            })
          }
        }
      }

      if (slotsToInsert.length > 0) {
        const { data: inserted, error: insertErr } = await supabase
          .from('medication_logs')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(slotsToInsert as unknown as never[])
          .select() as any

        if (!insertErr && inserted) {
          logsData = [...(logsData ?? []), ...inserted]
        }
      }

      setTodayLogs(logsData ?? [])

      // ── 4. Recent vitals (last 20 readings) ───────────────────────────────
      const { data: vitalsData } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(20) as any

      // Combine with local vitals (instant sync)
      let combinedVitals: VitalRow[] = vitalsData ? [...vitalsData] : []
      try {
        const localRaw = localStorage.getItem(`medicare_local_vitals_${userId}`)
        if (localRaw) {
          const localList: VitalRow[] = JSON.parse(localRaw)
          const existingIds = new Set(combinedVitals.map(v => v.id))
          for (const item of localList) {
            if (!existingIds.has(item.id)) {
              combinedVitals.push(item)
            }
          }
          combinedVitals.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
        }
      } catch (err) {
        console.warn('Error reading local vitals:', err)
      }

      setVitals(combinedVitals)

      // ── 5. Upcoming appointments ──────────────────────────────────────────
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5) as any

      setAppointments(apptData ?? [])

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data'
      setError(msg)
      console.error('[usePatientData]', msg)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { void fetchAll() }, [fetchAll])

  const isEmpty =
    !loading &&
    medications.length === 0 &&
    vitals.length === 0

  return {
    loading,
    error,
    patient,
    medications,
    todayLogs,
    vitals,
    appointments,
    isEmpty,
    primaryCondition,
    setPrimaryCondition,
    refetch: fetchAll,
  }
}

// ─── Log a new vital reading ──────────────────────────────────────────────────

export async function logVitalReading(
  userId: string,
  patientId: string | null,
  reading: {
    heart_rate?: number | null
    systolic_bp?: number | null
    diastolic_bp?: number | null
    oxygen_saturation?: number | null
    temperature?: number | null
    respiratory_rate?: number | null
    blood_glucose?: number | null
    weight?: number | null
    condition?: string
  }
): Promise<{ success: boolean; error: string | null }> {
  const localId = `vital_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const newRow: VitalRow = {
    id: localId,
    patient_id: patientId || userId,
    recorded_at: new Date().toISOString(),
    heart_rate: reading.heart_rate ?? null,
    systolic_bp: reading.systolic_bp ?? null,
    diastolic_bp: reading.diastolic_bp ?? null,
    oxygen_saturation: reading.oxygen_saturation ?? null,
    temperature: reading.temperature ?? null,
    respiratory_rate: reading.respiratory_rate ?? null,
    blood_glucose: reading.blood_glucose ?? null,
    weight: reading.weight ?? null,
  }

  // 1. Immediately store in localStorage so patient & caregiver instantly see it
  try {
    const key = `medicare_local_vitals_${userId}`
    const existing: VitalRow[] = JSON.parse(localStorage.getItem(key) || '[]')
    localStorage.setItem(key, JSON.stringify([newRow, ...existing]))
  } catch (err) {
    console.warn('Failed saving vitals to localStorage:', err)
  }

  // 2. Persist to Supabase if patientId is present
  if (patientId) {
    try {
      const payload: Record<string, any> = {
        patient_id: patientId,
        recorded_at: newRow.recorded_at,
        heart_rate: newRow.heart_rate,
        systolic_bp: newRow.systolic_bp,
        diastolic_bp: newRow.diastolic_bp,
        oxygen_saturation: newRow.oxygen_saturation,
        temperature: newRow.temperature,
        respiratory_rate: newRow.respiratory_rate,
      }
      if (newRow.blood_glucose !== null && newRow.blood_glucose !== undefined) {
        payload.blood_glucose = newRow.blood_glucose
      }
      if (newRow.weight !== null && newRow.weight !== undefined) {
        payload.weight = newRow.weight
      }
      await (supabase.from('vitals') as any).insert([payload])
    } catch (err) {
      console.warn('Supabase vitals insert skipped or failed:', err)
    }
  }

  return { success: true, error: null }
}

// ─── Mark a log as taken ──────────────────────────────────────────────────────

export async function markMedicationTaken(
  logId: string,
  isTaken: boolean,
): Promise<{ error: string | null }> {
  const { error } = await (supabase
    .from('medication_logs')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(({ status: isTaken ? 'taken' : 'pending', taken_at: isTaken ? new Date().toISOString() : null }) as unknown as never)
    .eq('id', logId) as any)

  return { error: error?.message ?? null }
}
