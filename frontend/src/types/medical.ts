/**
 * @file medical.ts
 * @description Core TypeScript interfaces and types for the MediCare AI application.
 *
 * These types are shared across the Patient, Caregiver, and Doctor dashboards.
 * They mirror the Pydantic models in the FastAPI backend and the Supabase
 * PostgreSQL schema (maintained by Member 3).
 *
 * Naming convention:
 *   - Interfaces for data models: prefixed with `I` (e.g. IPatient)
 *   - Enums for constrained values (e.g. UserRole, BloodType)
 *   - Type aliases for unions / utility types
 */

// ─── Enumerations ────────────────────────────────────────────────────────────

export enum UserRole {
  Patient   = 'patient',
  Caregiver = 'caregiver',
  Doctor    = 'doctor',
}

export enum BloodType {
  APos  = 'A+',
  ANeg  = 'A-',
  BPos  = 'B+',
  BNeg  = 'B-',
  ABPos = 'AB+',
  ABNeg = 'AB-',
  OPos  = 'O+',
  ONeg  = 'O-',
}

export enum AlertSeverity {
  Info     = 'info',
  Warning  = 'warning',
  Critical = 'critical',
}

export enum MedicationStatus {
  Active      = 'active',
  Discontinued = 'discontinued',
  OnHold      = 'on_hold',
}

export enum AppointmentStatus {
  Scheduled  = 'scheduled',
  Completed  = 'completed',
  Cancelled  = 'cancelled',
  NoShow     = 'no_show',
}

export enum VitalTrend {
  Up     = 'up',
  Down   = 'down',
  Stable = 'stable',
}

// ─── Base / Utility Types ────────────────────────────────────────────────────

/** ISO 8601 timestamp string (e.g. "2026-10-31T22:51:15+05:30") */
export type ISOTimestamp = string

/** UUID v4 string */
export type UUID = string

/** A numeric range with an optional unit label */
export interface IRange {
  min: number
  max: number
  unit?: string
}

// ─── User & Auth ─────────────────────────────────────────────────────────────

/**
 * Represents an authenticated user (maps to Supabase `auth.users` + `profiles` table).
 */
export interface IUser {
  id: UUID
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

// ─── Patient ─────────────────────────────────────────────────────────────────

/**
 * Full patient record as stored in the `patients` table.
 */
export interface IPatient {
  id: UUID
  userId: UUID                // FK → IUser.id
  fullName: string
  dateOfBirth: string         // ISO date "YYYY-MM-DD"
  age: number
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  bloodType: BloodType
  height: number              // centimeters
  weight: number              // kilograms
  bmi: number                 // derived: weight(kg) / height(m)²
  emergencyContact: IEmergencyContact
  primaryDoctorId?: UUID      // FK → IDoctor.id
  caregiverId?: UUID          // FK → ICaregiver.id
  medicalHistory: string[]    // list of condition names
  allergies: string[]
  insuranceId?: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

export interface IEmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

// ─── Vitals ──────────────────────────────────────────────────────────────────

/**
 * A single vitals reading snapshot.
 * Maps to the `vitals` table (time-series, one row per measurement event).
 */
export interface IVitals {
  id: UUID
  patientId: UUID
  recordedAt: ISOTimestamp
  recordedBy?: UUID           // userId of recorder (nurse / device / patient self)

  heartRate: number           // bpm
  systolicBP: number          // mmHg
  diastolicBP: number         // mmHg
  respiratoryRate: number     // breaths/min
  oxygenSaturation: number    // SpO₂ percentage (0–100)
  temperature: number         // °C
  bloodGlucose?: number       // mg/dL (optional / only for diabetic patients)
  weight?: number             // kg (optional snapshot)
}

/**
 * Aggregated vitals summary with trend metadata — used for dashboard KPI cards.
 */
export interface IVitalsSummary {
  current: IVitals
  previous?: IVitals
  trends: {
    heartRate: VitalTrend
    systolicBP: VitalTrend
    oxygenSaturation: VitalTrend
    temperature: VitalTrend
  }
  normalRanges: {
    heartRate: IRange
    systolicBP: IRange
    diastolicBP: IRange
    oxygenSaturation: IRange
    temperature: IRange
  }
}

/**
 * A single time-series data point for Recharts line/area charts.
 */
export interface IVitalsChartPoint {
  timestamp: string           // formatted label, e.g. "10:30 AM"
  heartRate?: number
  systolicBP?: number
  diastolicBP?: number
  oxygenSaturation?: number
  temperature?: number
}

// ─── Medications ─────────────────────────────────────────────────────────────

/**
 * A medication prescription entry.
 * Maps to the `medications` table.
 */
export interface IMedication {
  id: UUID
  patientId: UUID
  prescribedById: UUID        // FK → IDoctor.id
  name: string                // generic name
  brandName?: string
  dosage: string              // e.g. "500mg"
  frequency: string           // e.g. "Twice daily"
  route: 'oral' | 'IV' | 'IM' | 'topical' | 'inhaled' | 'sublingual' | 'other'
  startDate: string           // "YYYY-MM-DD"
  endDate?: string            // undefined = ongoing
  status: MedicationStatus
  instructions?: string       // "Take with food", etc.
  sideEffects?: string[]
  refillsRemaining?: number
  nextRefillDate?: string
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

/**
 * Medication adherence record for a given day.
 */
export interface IMedicationAdherence {
  medicationId: UUID
  date: string                // "YYYY-MM-DD"
  scheduled: number           // doses scheduled
  taken: number               // doses actually taken
  adherenceRate: number       // percentage (0–100)
}

// ─── Appointments ────────────────────────────────────────────────────────────

export interface IAppointment {
  id: UUID
  patientId: UUID
  doctorId: UUID
  scheduledAt: ISOTimestamp
  durationMinutes: number
  type: 'in-person' | 'telemedicine' | 'follow-up' | 'emergency'
  status: AppointmentStatus
  reasonForVisit: string
  notes?: string              // populated after visit
  diagnosis?: string
  followUpRequired: boolean
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

// ─── Medical Alerts ───────────────────────────────────────────────────────────

export interface IMedicalAlert {
  id: UUID
  patientId: UUID
  triggeredAt: ISOTimestamp
  severity: AlertSeverity
  category: 'vitals' | 'medication' | 'appointment' | 'lab' | 'ai'
  title: string
  message: string
  acknowledged: boolean
  acknowledgedBy?: UUID
  acknowledgedAt?: ISOTimestamp
}

// ─── Doctor ──────────────────────────────────────────────────────────────────

export interface IDoctor {
  id: UUID
  userId: UUID
  fullName: string
  specialization: string
  licenseNumber: string
  hospital?: string
  department?: string
  yearsOfExperience: number
  patientIds: UUID[]
  availabilitySchedule?: IDoctorAvailability[]
  createdAt: ISOTimestamp
}

export interface IDoctorAvailability {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0 = Sunday
  startTime: string                         // "HH:MM" 24-hr
  endTime: string
}

// ─── Caregiver ───────────────────────────────────────────────────────────────

export interface ICaregiver {
  id: UUID
  userId: UUID
  fullName: string
  relationship: string        // e.g. "Spouse", "Child", "Nurse"
  patientIds: UUID[]
  certifications?: string[]
  createdAt: ISOTimestamp
}

// ─── AI / Gemini ─────────────────────────────────────────────────────────────

/**
 * A single message in the AI chat conversation.
 */
export interface IAIMessage {
  id: UUID
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: ISOTimestamp
  isVoiceInput?: boolean
  audioUrl?: string           // TTS audio blob URL
}

/**
 * Request body sent to the FastAPI /ai/chat endpoint.
 */
export interface IAIChatRequest {
  patientId: UUID
  messages: Pick<IAIMessage, 'role' | 'content'>[]
  context?: {
    recentVitals?: IVitals
    medications?: IMedication[]
  }
}

/**
 * Response from FastAPI /ai/chat endpoint.
 */
export interface IAIChatResponse {
  reply: string
  confidence?: number
  disclaimers: string[]
  suggestedActions?: string[]
}

// ─── Lab Results ─────────────────────────────────────────────────────────────

export interface ILabResult {
  id: UUID
  patientId: UUID
  orderedById: UUID           // FK → IDoctor.id
  testName: string
  testCode?: string           // LOINC code
  collectedAt: ISOTimestamp
  resultAt: ISOTimestamp
  value: number | string
  unit?: string
  normalRange?: IRange
  status: 'normal' | 'abnormal' | 'critical' | 'pending'
  notes?: string
}

// ─── Dashboard Page Props ─────────────────────────────────────────────────────

/** Shared props injected into every dashboard page */
export interface IDashboardProps {
  currentUser: IUser
  patient?: IPatient          // undefined for Doctor overview (multi-patient)
}
