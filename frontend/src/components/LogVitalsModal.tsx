/**
 * @file LogVitalsModal.tsx
 * @description Disease-adaptive vital signs logging modal for patients and caregivers.
 *
 * Dynamically adjusts highlighted fields, normal target ranges, and clinical
 * validation according to the patient's selected disease (Diabetes, Hypertension,
 * COPD/Asthma, Heart Failure, Kidney Disease, or General Health).
 */

import { useState, useEffect, useRef } from 'react'
import {
  X, Heart, Activity, Droplets, Wind, Thermometer,
  Scale, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { logVitalReading } from '../hooks/usePatientData'
import { useNotifications } from '../context/NotificationContext'

export interface LogVitalsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  patientId: string | null
  currentCondition: string
  onConditionChange?: (condition: string) => void
  onSuccess: () => void
}

export const SUPPORTED_DISEASES = [
  'Type 2 Diabetes',
  'Hypertension',
  'COPD / Asthma',
  'Heart Failure',
  'Chronic Kidney Disease',
  'General Health',
] as const

export function LogVitalsModal({
  isOpen,
  onClose,
  userId,
  patientId,
  currentCondition,
  onConditionChange,
  onSuccess,
}: LogVitalsModalProps) {
  const { sendAlert } = useNotifications()
  const dialogRef = useRef<HTMLDivElement>(null)

  const [condition, setCondition] = useState<string>(currentCondition || 'Type 2 Diabetes')

  // Form fields
  const [bloodGlucose, setBloodGlucose] = useState<string>('')
  const [glucoseContext, setGlucoseContext] = useState<'fasting' | 'post_meal' | 'random'>('fasting')
  const [systolic, setSystolic] = useState<string>('')
  const [diastolic, setDiastolic] = useState<string>('')
  const [heartRate, setHeartRate] = useState<string>('')
  const [spo2, setSpo2] = useState<string>('')
  const [respiratoryRate, setRespiratoryRate] = useState<string>('')
  const [temperature, setTemperature] = useState<string>('')
  const [weight, setWeight] = useState<string>('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentCondition) setCondition(currentCondition)
  }, [currentCondition])

  // Reset or close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Helpers for clinical feedback
  const sysNum = parseFloat(systolic)
  const diaNum = parseFloat(diastolic)
  const bgNum = parseFloat(bloodGlucose)
  const spo2Num = parseFloat(spo2)

  // Disease classification helpers
  const isDiabetes = condition.toLowerCase().includes('diabet')
  const isHypertension = condition.toLowerCase().includes('hyperten') || condition.toLowerCase().includes('bp')
  const isRespiratory = condition.toLowerCase().includes('copd') || condition.toLowerCase().includes('asthma')
  const isHeartFailure = condition.toLowerCase().includes('heart')
  const isKidney = condition.toLowerCase().includes('kidney')

  const handleConditionSelect = (c: string) => {
    setCondition(c)
    onConditionChange?.(c)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Ensure at least one vital metric is filled
    const hasData =
      bloodGlucose.trim() ||
      systolic.trim() ||
      diastolic.trim() ||
      heartRate.trim() ||
      spo2.trim() ||
      respiratoryRate.trim() ||
      temperature.trim() ||
      weight.trim()

    if (!hasData) {
      setError('Please enter at least one vital sign reading.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        heart_rate: heartRate ? parseFloat(heartRate) : null,
        systolic_bp: systolic ? parseFloat(systolic) : null,
        diastolic_bp: diastolic ? parseFloat(diastolic) : null,
        oxygen_saturation: spo2 ? parseFloat(spo2) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        respiratory_rate: respiratoryRate ? parseFloat(respiratoryRate) : null,
        blood_glucose: bloodGlucose ? parseFloat(bloodGlucose) : null,
        weight: weight ? parseFloat(weight) : null,
      }

      await logVitalReading(userId, patientId, payload)

      // Check for clinical anomaly to dispatch automated push notification
      if (payload.systolic_bp && (payload.systolic_bp >= 160 || (payload.diastolic_bp && payload.diastolic_bp >= 100))) {
        void sendAlert({
          title: 'Critical Blood Pressure Alert',
          message: `Logged high BP reading: ${payload.systolic_bp}/${payload.diastolic_bp ?? '--'} mmHg. Sit quietly and retest.`,
          severity: 'critical',
          category: 'vitals',
        })
      } else if (payload.oxygen_saturation && payload.oxygen_saturation <= 90) {
        void sendAlert({
          title: 'Low Oxygen Saturation Alert',
          message: `SpO₂ dropped to ${payload.oxygen_saturation}%. If breathless, contact emergency or your caregiver.`,
          severity: 'critical',
          category: 'vitals',
        })
      } else if (payload.blood_glucose && (payload.blood_glucose >= 250 || payload.blood_glucose <= 65)) {
        void sendAlert({
          title: payload.blood_glucose <= 65 ? 'Hypoglycemia Warning' : 'Hyperglycemia Warning',
          message: `Blood glucose logged at ${payload.blood_glucose} mg/dL. Take recommended corrective action.`,
          severity: payload.blood_glucose <= 55 || payload.blood_glucose >= 300 ? 'critical' : 'warning',
          category: 'vitals',
        })
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vitals')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-vitals-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-3xl border border-blue-200/80 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100 bg-[#f0f8ff]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 id="log-vitals-title" className="text-base font-extrabold text-slate-900 leading-tight">
                Log Vital Signs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Vitals adapt dynamically to your condition
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Condition Selector Chips */}
        <div className="px-5 py-2.5 bg-blue-50/50 border-b border-blue-100/70 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0 mr-1">
            Disease Profile:
          </span>
          {SUPPORTED_DISEASES.map((c) => {
            const isSelected = condition.toLowerCase() === c.toLowerCase()
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleConditionSelect(c)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-xs font-bold'
                    : 'bg-white border border-blue-200 text-slate-600 hover:bg-blue-50'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── 1. DIABETES PRIMARY: BLOOD GLUCOSE ── */}
          {isDiabetes && (
            <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                    Primary Metric: Blood Glucose
                  </span>
                </div>
                {bgNum > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      bgNum < 70
                        ? 'bg-red-100 text-red-700'
                        : bgNum <= 140
                        ? 'bg-emerald-100 text-emerald-700'
                        : bgNum <= 180
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {bgNum < 70 ? 'Low' : bgNum <= 140 ? 'Normal' : bgNum <= 180 ? 'Elevated' : 'High'}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Glucose Reading (mg/dL) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="20"
                    max="600"
                    value={bloodGlucose}
                    onChange={(e) => setBloodGlucose(e.target.value)}
                    placeholder="e.g. 105"
                    className="form-input text-sm font-bold text-slate-900 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <div className="sm:w-48">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Timing Context
                  </label>
                  <select
                    value={glucoseContext}
                    onChange={(e) => setGlucoseContext(e.target.value as any)}
                    className="form-input text-xs"
                  >
                    <option value="fasting">Fasting (Morning)</option>
                    <option value="post_meal">Post-Meal (2h)</option>
                    <option value="random">Random / Bedtime</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Target Fasting: 70–130 mg/dL · Target 2h Post-Meal: &lt; 180 mg/dL
              </p>
            </div>
          )}

          {/* ── 2. HYPERTENSION / CARDIOVASCULAR PRIMARY: BLOOD PRESSURE ── */}
          <div
            className={`p-4 rounded-2xl border ${
              isHypertension
                ? 'border-2 border-brand-400 bg-brand-50/40'
                : 'border-slate-200 bg-white'
            } space-y-3`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-600" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  {isHypertension ? 'Primary Metric: Blood Pressure' : 'Blood Pressure (mmHg)'}
                </span>
              </div>
              {sysNum > 0 && diaNum > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sysNum < 120 && diaNum < 80
                      ? 'bg-emerald-100 text-emerald-700'
                      : sysNum < 130 && diaNum < 80
                      ? 'bg-amber-100 text-amber-700'
                      : sysNum < 140 || diaNum < 90
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {sysNum < 120 && diaNum < 80
                    ? 'Normal'
                    : sysNum < 130
                    ? 'Elevated'
                    : sysNum < 140
                    ? 'Stage 1'
                    : 'Stage 2 / High'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Systolic (Top)
                </label>
                <input
                  type="number"
                  min="50"
                  max="260"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="e.g. 120"
                  className="form-input text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Diastolic (Bottom)
                </label>
                <input
                  type="number"
                  min="30"
                  max="160"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="e.g. 80"
                  className="form-input text-xs font-bold"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Optimal: &lt; 120/80 mmHg · Hypertension threshold: &ge; 130/80 mmHg
            </p>
          </div>

          {/* ── 3. COPD / ASTHMA PRIMARY: PULSE OXIMETRY & RESPIRATORY RATE ── */}
          {isRespiratory && (
            <div className="p-4 rounded-2xl border-2 border-violet-300 bg-violet-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wind className="w-5 h-5 text-violet-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-violet-900">
                    Primary Metric: Oxygen & Respiration
                  </span>
                </div>
                {spo2Num > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      spo2Num >= 95
                        ? 'bg-emerald-100 text-emerald-700'
                        : spo2Num >= 92
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {spo2Num >= 95 ? 'Normal SpO₂' : spo2Num >= 92 ? 'Moderate' : 'Low SpO₂'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Oxygen (SpO₂ %) *
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="e.g. 98"
                    className="form-input text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Respiratory Rate (br/min)
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="60"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    placeholder="e.g. 16"
                    className="form-input text-xs font-bold"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Normal SpO₂: 95–100% · Normal Resting Respiration: 12–20 breaths/min
              </p>
            </div>
          )}

          {/* ── 4. GENERAL VITALS: HEART RATE, SPO2, TEMP, WEIGHT ── */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Additional Physiological Metrics
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-red-500" /> Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  min="30"
                  max="220"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="e.g. 72"
                  className="form-input text-xs font-semibold"
                />
              </div>

              {!isRespiratory && (
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" /> SpO₂ (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="e.g. 98"
                    className="form-input text-xs font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" /> Temp (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="32"
                  max="43"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="e.g. 36.8"
                  className="form-input text-xs font-semibold"
                />
              </div>

              {(isHeartFailure || isKidney || isDiabetes) && (
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-slate-600" /> Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 68.5"
                    className="form-input text-xs font-semibold"
                  />
                </div>
              )}

              {!isDiabetes && (
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-emerald-500" /> Glucose (mg/dL)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="600"
                    value={bloodGlucose}
                    onChange={(e) => setBloodGlucose(e.target.value)}
                    placeholder="e.g. 98"
                    className="form-input text-xs font-semibold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs py-2.5 px-6 shadow-sm flex items-center gap-2"
            >
              {saving ? 'Recording…' : 'Save Vitals Reading'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
