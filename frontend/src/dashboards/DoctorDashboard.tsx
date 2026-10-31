/**
 * @file DoctorDashboard.tsx
 * @description Doctor clinical dashboard — Owned by Member 4.
 *
 * Milestone 1: Scaffold with mock patient cohort, AI diagnostic panel placeholder,
 * and voice input placeholder.
 *
 * TODO (Member 4):
 *  - Implement AI chat panel with Gemini via POST /api/ai/chat
 *  - Add VoiceInput component using Browser Web Speech API (SpeechRecognition)
 *  - Add TTS response readback using SpeechSynthesis
 *  - Connect patient list from Supabase: `supabase.from('patients').select(...)`
 */

import { useState, useRef } from 'react'
import {
  Stethoscope, Brain, Users, CalendarDays, FlaskConical,
  Mic, MicOff, Send, Loader2, AlertCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { AlertSeverity, VitalTrend, type IUser, type IAIMessage } from '../types/medical'
import { StatCard } from '../components/StatCard'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DoctorDashboardProps {
  currentUser: IUser
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_COHORT_SUMMARY = [
  { condition: 'Diabetes',     count: 12, color: '#2aa0ff' },
  { condition: 'Hypertension', count: 18, color: '#8b5cf6' },
  { condition: 'Heart Failure',count: 7,  color: '#ef4444' },
  { condition: 'COPD',         count: 9,  color: '#f59e0b' },
  { condition: 'Asthma',       count: 5,  color: '#10b981' },
]

const MOCK_RECENT_PATIENTS = [
  { id: 'p1', name: 'Alex Johnson',   age: 54, lastVisit: 'Today',      alert: true  },
  { id: 'p2', name: 'Dorothy Chen',   age: 78, lastVisit: 'Yesterday',  alert: false },
  { id: 'p3', name: 'Marcus Williams',age: 66, lastVisit: '3 days ago', alert: false },
  { id: 'p4', name: 'Linda Torres',   age: 45, lastVisit: '1 week ago', alert: false },
]

// ─── AI Chat Panel (placeholder — Member 4 will fully implement) ──────────────

function AIAssistantPanel() {
  const [messages, setMessages] = useState<IAIMessage[]>([
    {
      id: 'sys-1', role: 'assistant',
      content: '👋 Hello, Doctor! I\'m your Gemini AI clinical assistant. Ask me about differential diagnoses, drug interactions, or patient summaries.',
      timestamp: new Date().toISOString(),
    },
  ])
  const [inputText, setInputText] = useState<string>('')
  const [isListening, setIsListening] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // TODO (Member 4): Wire to POST /api/ai/chat with patient context
  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return
    const userMsg: IAIMessage = {
      id: `msg-${Date.now()}`, role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)

    // Simulated response — replace with real API call
    await new Promise((r) => setTimeout(r, 1200))
    const aiMsg: IAIMessage = {
      id: `msg-${Date.now() + 1}`, role: 'assistant',
      content: '⚠️ This is a placeholder response. Member 4: implement `POST /api/ai/chat` call here and handle TTS readback via `window.speechSynthesis`.',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, aiMsg])
    setIsLoading(false)
  }

  // TODO (Member 4): Implement Web Speech API SpeechRecognition
  const handleVoiceToggle = () => {
    setIsListening((l) => !l)
    // Placeholder — Member 4 implements real SpeechRecognition here
    if (!isListening) {
      setTimeout(() => {
        setInputText('What are the side effects of Metformin?')
        setIsListening(false)
      }, 2000)
    }
  }

  return (
    <section aria-label="AI Clinical Assistant" className="card flex flex-col h-96">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-brand-500" />
        <h3 className="font-semibold text-slate-800">Gemini AI Assistant</h3>
        <span className="badge-info ml-auto">Beta</span>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-br-sm'
                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gemini is thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2">
        <button
          id="voice-input-btn"
          onClick={handleVoiceToggle}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors
            ${isListening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <input
          id="ai-chat-input"
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
          placeholder="Ask about diagnoses, drug interactions…"
          className="input-field flex-1 text-sm"
        />
        <button
          id="ai-send-btn"
          onClick={() => void handleSend()}
          disabled={!inputText.trim() || isLoading}
          aria-label="Send message"
          className="btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-2 text-[10px] text-slate-400 text-center">
        ⚕️ AI suggestions are for informational purposes only. Always apply clinical judgment.
      </p>
    </section>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DoctorDashboard({ currentUser }: DoctorDashboardProps) {
  void currentUser

  return (
    <div className="space-y-6 animate-fade-in">

      {/* KPI row */}
      <section aria-label="Practice summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard id="doc-stat-patients"     label="Total Patients"    value={51}  trend={VitalTrend.Up}     severity={AlertSeverity.Info}    icon={<Users className="w-5 h-5" />} change="+3 this month" />
        <StatCard id="doc-stat-appointments" label="Today's Appts"     value={8}   trend={VitalTrend.Stable} severity={AlertSeverity.Info}    icon={<CalendarDays className="w-5 h-5" />} />
        <StatCard id="doc-stat-labs"         label="Pending Labs"      value={5}   trend={VitalTrend.Up}     severity={AlertSeverity.Warning} icon={<FlaskConical className="w-5 h-5" />} />
        <StatCard id="doc-stat-alerts"       label="Critical Alerts"   value={2}   trend={VitalTrend.Up}     severity={AlertSeverity.Critical} icon={<AlertCircle className="w-5 h-5" />} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Patient cohort chart */}
        <section aria-label="Patient cohort by condition" className="card lg:col-span-1">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Stethoscope className="w-4 h-4 text-brand-500" /> Cohort by Condition
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_COHORT_SUMMARY} layout="vertical"
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="condition" width={80} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" name="Patients" radius={[0, 4, 4, 0]}>
                {MOCK_COHORT_SUMMARY.map((entry) => (
                  <Cell key={entry.condition} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* AI Assistant panel */}
        <div className="lg:col-span-2">
          <AIAssistantPanel />
        </div>
      </div>

      {/* Recent patients table */}
      <section aria-label="Recent patients" className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-500" /> Recent Patients
          </h3>
          <button className="btn-primary py-1.5 text-xs">View All Patients</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Recent patient list">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 pr-4">Name</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 pr-4">Age</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2 pr-4">Last Visit</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECENT_PATIENTS.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="py-3 pr-4 font-medium text-slate-800">{p.name}</td>
                  <td className="py-3 pr-4 text-slate-500">{p.age}</td>
                  <td className="py-3 pr-4 text-slate-500">{p.lastVisit}</td>
                  <td className="py-3">
                    {p.alert
                      ? <span className="badge-warning">Needs Review</span>
                      : <span className="badge-normal">Stable</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
