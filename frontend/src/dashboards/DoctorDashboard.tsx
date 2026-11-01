/**
 * @file DoctorDashboard.tsx
 * @description Doctor clinical dashboard — dynamic and user-driven.
 * Starts completely empty until patients or clinical records are entered.
 */

import { useState, useRef } from 'react'
import {
  Stethoscope, Brain, Users, CalendarDays, FlaskConical,
  Mic, MicOff, Send, Loader2, AlertCircle, Plus,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { AlertSeverity, VitalTrend, type IUser, type IAIMessage } from '../types/medical'
import { StatCard } from '../components/StatCard'
import { AddPatientModal, type NewPatientData } from '../components/AddPatientModal'
import {
  getStoredPatients,
  CAREGIVER_PATIENTS_STORAGE_KEY,
  type CaregiverPatientItem,
} from './CaregiverDashboard'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DoctorDashboardProps {
  currentUser: IUser
}

// ─── AI Chat Panel ────────────────────────────────────────────────────────────

function AIAssistantPanel() {
  const [messages, setMessages] = useState<IAIMessage[]>([
    {
      id: 'sys-1',
      role: 'assistant',
      content:
        "👋 Hello, Doctor! I'm your Gemini AI clinical assistant. Ask me about differential diagnoses, drug interactions, or patient treatment guidelines.",
      timestamp: new Date().toISOString(),
    },
  ])
  const [inputText, setInputText] = useState<string>('')
  const [isListening, setIsListening] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return
    const text = inputText.trim()
    const userMsg: IAIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          model: 'gemini-3.8-flash',
          system_instruction:
            'You are an advanced Clinical Decision Support AI for licensed medical doctors. Be concise, precise, evidence-based, and highlight pertinent differential diagnoses and drug contraindications.',
        }),
      })

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }

      const data = await res.json()
      const aiReply: IAIMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply || 'No response received from clinical model.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiReply])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed'
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `⚠️ Could not reach AI service: ${errorMsg}. Ensure backend is active at port 8000.`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in this browser.')
      return
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRec()
    recognition.lang = 'en-US'
    recognition.interimResults = false

    if (!isListening) {
      setIsListening(true)
      recognition.start()
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript
        setInputText(transcript)
        setIsListening(false)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)
    } else {
      setIsListening(false)
      recognition.stop()
    }
  }

  return (
    <div className="dash-section flex flex-col h-[320px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
            <Brain className="w-4 h-4 text-brand-500" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Clinical AI Assistant</h3>
            <p className="text-[10px] text-slate-400">Gemini 3.8 Flash · Decision Support</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Ready
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-xs'
                  : 'bg-slate-100 text-slate-800 rounded-bl-xs'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-xs px-3.5 py-2 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
              Analyzing clinical query…
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
        <button
          onClick={handleVoiceToggle}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
            isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title={isListening ? 'Stop listening' : 'Voice input'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
          placeholder="Ask diagnosis, drug interaction, dosage…"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500"
        />

        <button
          onClick={() => void handleSend()}
          disabled={!inputText.trim() || isLoading}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white disabled:opacity-40 hover:bg-brand-700 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Doctor Dashboard ────────────────────────────────────────────────────

export function DoctorDashboard({ currentUser }: DoctorDashboardProps) {
  void currentUser
  const [patients, setPatients] = useState<CaregiverPatientItem[]>(getStoredPatients)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleAddPatient = (data: NewPatientData) => {
    const newPatient: CaregiverPatientItem = {
      id: data.id || `pat-${Date.now()}`,
      name: data.name,
      age: data.age,
      condition: data.condition,
      lastSeen: data.lastSeen || 'Just now',
      heartRate: data.heartRate,
      bp: data.bp,
      spo2: data.spo2,
      status: data.status,
    }
    const updated = [newPatient, ...patients]
    setPatients(updated)
    try {
      localStorage.setItem(CAREGIVER_PATIENTS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Could not save patient to localStorage:', e)
    }
  }

  const criticalCount = patients.filter((p) => p.status === 'critical').length

  // Build condition cohorts dynamically from entered patients
  const cohortMap: Record<string, number> = {}
  for (const p of patients) {
    const cond = p.condition.split('+')[0].trim() || 'General'
    cohortMap[cond] = (cohortMap[cond] || 0) + 1
  }
  const COHORT_COLORS = ['#2aa0ff', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  const cohortData = Object.entries(cohortMap).map(([condition, count], idx) => ({
    condition,
    count,
    color: COHORT_COLORS[idx % COHORT_COLORS.length],
  }))

  return (
    <div className="h-full overflow-y-auto bg-white p-3 sm:p-5 space-y-3 sm:space-y-4 animate-fade-in pb-16 md:pb-6">
      {/* ── KPI row ── */}
      <section aria-label="Practice summary" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          id="doc-stat-patients"
          label="Total Patients"
          value={patients.length}
          trend={VitalTrend.Stable}
          severity={AlertSeverity.Info}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          id="doc-stat-appointments"
          label="Today's Appts"
          value={0}
          trend={VitalTrend.Stable}
          severity={AlertSeverity.Info}
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <StatCard
          id="doc-stat-labs"
          label="Pending Labs"
          value={0}
          trend={VitalTrend.Stable}
          severity={AlertSeverity.Info}
          icon={<FlaskConical className="w-5 h-5" />}
        />
        <StatCard
          id="doc-stat-alerts"
          label="Critical Alerts"
          value={criticalCount}
          trend={criticalCount > 0 ? VitalTrend.Up : VitalTrend.Stable}
          severity={criticalCount > 0 ? AlertSeverity.Critical : AlertSeverity.Info}
          icon={<AlertCircle className="w-5 h-5" />}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Patient cohort chart */}
        <section aria-label="Patient cohort by condition" className="dash-section lg:col-span-1">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
              <Stethoscope className="w-4 h-4 text-brand-500" />
            </span>
            Cohort by Condition
          </h3>

          {cohortData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
              <Stethoscope className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No condition cohorts yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cohort distribution will render here once patient records are registered.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cohortData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="condition" width={90} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="count" name="Patients" radius={[0, 4, 4, 0]}>
                  {cohortData.map((entry) => (
                    <Cell key={entry.condition} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* AI Assistant panel */}
        <div className="lg:col-span-2">
          <AIAssistantPanel />
        </div>
      </div>

      {/* ── Recent patients table ── */}
      <section aria-label="Recent patients" className="dash-section">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
              <Users className="w-4 h-4 text-violet-500" />
            </span>
            Clinical Patient Records
            <span className="text-xs font-normal text-slate-400">({patients.length})</span>
          </h3>
          <button
            id="doc-add-patient-btn"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Patient
          </button>
        </div>

        {patients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No patient records registered</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Add your first patient to begin tracking clinical charts, vitals, and diagnoses.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary py-2 px-4 text-xs mx-auto"
            >
              <Plus className="w-4 h-4" /> Add Patient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Recent patient list">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 pr-4">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 pr-4">
                    Age
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 pr-4">
                    Condition
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 pr-4">
                    Vitals
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 pr-4 font-semibold text-slate-800">{p.name}</td>
                    <td className="py-3 pr-4 text-slate-500">{p.age}</td>
                    <td className="py-3 pr-4 text-slate-600">{p.condition}</td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">
                      HR {p.heartRate} · BP {p.bp} · SpO₂ {p.spo2}%
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : p.status === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddPatient}
      />
    </div>
  )
}
