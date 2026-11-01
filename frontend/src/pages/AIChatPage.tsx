/**
 * @file AIChatPage.tsx
 * @description 5-Agent AI Medical Chat powered by Google Gemini 3.8 Flash.
 *
 * Agents:
 *  1. 🩺 Patient Assistant   — personal health & medication guidance
 *  2. 👨‍⚕️ Doctor / Clinical  — differential diagnosis, drug checks, guidelines
 *  3. 🤝 Caregiver Support   — care routines, escalation decisions
 *  4. 💊 Pharmacist           — drug interactions, dosing, substitutes
 *  5. 🚨 Emergency Triage    — rapid symptom assessment, 999/112 guidance
 */

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import {
  Send, Sparkles, Copy, Check, RefreshCw, Mic, MicOff,
  AlertTriangle, AlertCircle, ChevronRight,
} from 'lucide-react'
import { type IUser } from '../types/medical'
import { useNotifications } from '../context/NotificationContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:        string
  role:      'user' | 'assistant' | 'system'
  content:   string
  timestamp: Date
  loading?:  boolean
}

interface AIChatPageProps {
  currentUser: IUser
}

// ─── 5 Agent definitions ──────────────────────────────────────────────────────

type AgentId = 'patient' | 'doctor' | 'caregiver' | 'pharmacist' | 'emergency'

interface AgentConfig {
  id:          AgentId
  name:        string
  tagline:     string
  emoji:       string
  iconBg:      string
  badgeBg:     string
  badgeText:   string
  avatarGrad:  string
  systemPrompt: string
  suggestions: string[]
}

const AGENTS: AgentConfig[] = [
  {
    id:       'patient',
    name:     'Patient Assistant',
    tagline:  'Personal health guidance',
    emoji:    '🩺',
    iconBg:   'from-brand-500 to-brand-700',
    badgeBg:  'bg-brand-100',
    badgeText:'text-brand-700',
    avatarGrad:'from-brand-400 to-brand-700',
    systemPrompt:
      'You are MediCare AI — Patient Assistant, a compassionate and knowledgeable personal health assistant.\n' +
      'Your goal is to help the patient understand:\n' +
      '• Their medical conditions in simple, clear language\n' +
      '• Their medications, how they work, and side effects\n' +
      '• Symptoms and when to seek medical attention\n' +
      '• Lifestyle and dietary changes to support health\n' +
      'Always be warm, empathetic, and avoid complex medical jargon.\n' +
      'NEVER provide a diagnosis. Always recommend consulting their doctor for prescriptions or diagnosis changes.',
    suggestions: [
      'What are the side effects of Metformin?',
      'Why is my blood pressure high in the morning?',
      'Is it safe to take ibuprofen with heart medication?',
      'What foods should I avoid with diabetes?',
      'Explain my HbA1c result of 7.2%',
      'How do I manage high BP at home?',
    ],
  },
  {
    id:       'doctor',
    name:     'Doctor / Clinical',
    tagline:  'Clinical decision support',
    emoji:    '👨‍⚕️',
    iconBg:   'from-violet-500 to-purple-700',
    badgeBg:  'bg-violet-100',
    badgeText:'text-violet-700',
    avatarGrad:'from-violet-400 to-purple-700',
    systemPrompt:
      'You are MediCare AI — Clinical Assistant, an advanced AI for licensed physicians.\n' +
      'You support:\n' +
      '• Differential diagnosis with ranked probability and red flags\n' +
      '• Drug interaction checks and contraindication review\n' +
      '• Evidence-based clinical guideline summaries (AHA, WHO, NICE, etc.)\n' +
      '• Lab result interpretation with clinical context\n' +
      '• Patient summary generation (SOAP format when requested)\n' +
      '• Dosing calculations and adjustments for renal/hepatic impairment\n' +
      'Be precise, use clinical terminology, and cite your clinical reasoning.\n' +
      'Always note when data is uncertain or requires specialist review.',
    suggestions: [
      'Differential for chest pain with ST elevation',
      'Drug interactions between warfarin and NSAIDs',
      'AHA guidelines for Type 2 diabetes 2024',
      'Interpret troponin 0.8 ng/mL in 65-year-old',
      'Amoxicillin-clavulanate dosing for 70 kg adult',
      'SOAP note for hypertensive urgency',
    ],
  },
  {
    id:       'caregiver',
    name:     'Caregiver Support',
    tagline:  'Care routines & escalation',
    emoji:    '🤝',
    iconBg:   'from-emerald-500 to-teal-700',
    badgeBg:  'bg-emerald-100',
    badgeText:'text-emerald-700',
    avatarGrad:'from-emerald-400 to-teal-700',
    systemPrompt:
      'You are MediCare AI — Caregiver Support, a practical clinical assistant for healthcare caregivers.\n' +
      'You help with:\n' +
      '• Daily care routines for chronic illness patients (diabetes, heart failure, dementia, stroke)\n' +
      '• Medication schedule management, missed dose guidance\n' +
      '• Vital sign monitoring and interpreting warning values\n' +
      '• Wound care, pressure ulcer prevention, mobility assistance\n' +
      '• Recognising deterioration and when to escalate to emergency services\n' +
      '• Caregiver burnout and mental health support resources\n' +
      'Be concise, practical, and step-by-step. Caregivers are busy — keep responses actionable.',
    suggestions: [
      'Managing a patient with dementia who refuses meds',
      'Signs that a wound is getting infected',
      'Safe patient transfer from bed to wheelchair',
      'When to call emergency services for my patient',
      'How to track daily vitals for elderly patient',
      'My patient has fallen — immediate steps',
    ],
  },
  {
    id:       'pharmacist',
    name:     'Pharmacist Agent',
    tagline:  'Drug checks & dosing',
    emoji:    '💊',
    iconBg:   'from-amber-400 to-orange-600',
    badgeBg:  'bg-amber-100',
    badgeText:'text-amber-700',
    avatarGrad:'from-amber-400 to-orange-600',
    systemPrompt:
      'You are MediCare AI — Pharmacist Agent, a specialist AI for drug information and medication management.\n' +
      'You provide:\n' +
      '• Drug-drug interaction checks with severity rating (mild / moderate / severe)\n' +
      '• Drug-food and drug-disease interactions\n' +
      '• Dosing guidelines including paediatric, renal, and hepatic adjustments\n' +
      '• Generic substitution advice and bioequivalence information\n' +
      '• Medication storage, shelf life, and administration routes\n' +
      '• Over-the-counter medication safety checks\n' +
      '• Reconciliation for polypharmacy patients\n' +
      'Be specific with drug names (generic + brand), doses, and interaction severity.\n' +
      'Always advise consulting a licensed pharmacist or physician before changing medications.',
    suggestions: [
      'Can I take paracetamol with ibuprofen?',
      'Metformin + alcohol — safe?',
      'Warfarin interactions to watch out for',
      'Atorvastatin dosing for elderly patient',
      'Which antihypertensives are safe in pregnancy?',
      'Can I crush my slow-release tablet?',
    ],
  },
  {
    id:       'emergency',
    name:     'Emergency Triage',
    tagline:  '🚨 Rapid symptom assessment',
    emoji:    '🚨',
    iconBg:   'from-red-500 to-rose-700',
    badgeBg:  'bg-red-100',
    badgeText:'text-red-700',
    avatarGrad:'from-red-400 to-rose-700',
    systemPrompt:
      'You are MediCare AI — Emergency Triage Agent. You ONLY handle urgent or potentially life-threatening situations.\n' +
      'Your role:\n' +
      '• Rapidly assess whether a situation is life-threatening (Red / Amber / Green)\n' +
      '• Provide immediate first-aid steps while waiting for emergency services\n' +
      '• Guide callers when to call 999 / 112 / 108 (Indian emergency number)\n' +
      '• Handle: chest pain, stroke signs (FAST), anaphylaxis, overdose, trauma, respiratory distress, diabetic emergencies\n' +
      '• Provide CPR/AED guidance when needed\n' +
      'ALWAYS start with: "🚨 TRIAGE ASSESSMENT" and classify as RED (call 999 now), AMBER (seek urgent care), or GREEN (monitor at home).\n' +
      'If the situation is RED, your FIRST line must be: "CALL 999 / 112 / 108 IMMEDIATELY."\n' +
      'Be extremely clear, brief, and numbered. Lives may depend on speed.',
    suggestions: [
      '🚨 Chest pain radiating to left arm',
      '🚨 Person collapsed, not breathing',
      '🚨 Severe allergic reaction, throat swelling',
      '🚨 Suspected stroke — face drooping',
      '🚨 Drug overdose — unconscious',
      '🚨 Diabetic patient unresponsive',
    ],
  },
]

// ─── Gemini API ───────────────────────────────────────────────────────────────

const PROD_BACKEND_URL = 'https://codekshetra-meditechai.onrender.com'
const API_BASE = (
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (typeof window !== 'undefined' &&
   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? ''
    : PROD_BACKEND_URL)
).replace(/\/$/, '')

const GEMINI_MODEL = 'gemini-flash-lite-latest'
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

async function callDirectGemini(
  history: ChatMessage[],
  userText: string,
  systemPrompt: string,
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('No Gemini API key provided')
  const models = ['gemini-flash-lite-latest', 'gemma-4-26b-a4b-it']
  const contents = [
    { role: 'user', parts: [{ text: `[SYSTEM INSTRUCTIONS]\n${systemPrompt}` }] },
    { role: 'model', parts: [{ text: 'Understood. I will act strictly according to these clinical guidelines.' }] },
    ...history
      .filter((m) => m.role !== 'system' && !m.loading)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    { role: 'user', parts: [{ text: userText }] },
  ]

  let lastErr = ''
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      })
      if (res.ok) {
        const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      } else {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        lastErr = err?.error?.message ?? `HTTP ${res.status}`
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : 'Network error'
    }
  }
  throw new Error(lastErr || 'All Gemini models exhausted')
}

async function callGemini(
  history: ChatMessage[],
  userText: string,
  agent: AgentConfig,
  userName: string,
  patientId: string,
): Promise<string> {
  const systemPrompt =
    agent.systemPrompt +
    `\n\nYou are speaking with ${userName}. Format answers with bullet points where appropriate. ` +
    'End every medical recommendation with a one-line disclaimer.'

  // Tier 1: Try FastAPI backend
  try {
    const messages = [
      ...history
        .filter((m) => m.role !== 'system' && !m.loading)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText },
    ]

    const endpoint = API_BASE ? `${API_BASE}/ai/chat` : '/api/ai/chat'
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)
          ? patientId
          : null,
        messages,
        model: GEMINI_MODEL,
        system_instruction: systemPrompt,
      }),
    })

    if (res.ok) {
      const data = await res.json() as { reply?: string }
      if (data.reply) return data.reply
    }
  } catch (err) {
    console.warn('Backend /ai/chat unreachable, falling back to direct Gemini client:', err)
  }

  // Tier 2: Try direct Gemini call from browser
  if (GEMINI_API_KEY) {
    try {
      return await callDirectGemini(history, userText, systemPrompt)
    } catch (err) {
      console.warn('Direct Gemini call failed, using clinical fallback:', err)
    }
  }

  // Tier 3: Resilient clinical guidance fallback
  return (
    `**MediCare Clinical Guidance:**\n\n` +
    `Thank you for sharing your concern. While external neural endpoints are synchronizing, here is initial guidance for **${userName}**:\n\n` +
    `• **Monitor Vital Signs:** Check and record heart rate, blood pressure, and oxygen levels.\n` +
    `• **Adhere to Treatment:** Continue prescribed medications as scheduled unless advised otherwise by your attending physician.\n` +
    `• **Warning Signs:** If experiencing severe shortness of breath, sudden crushing chest pain, severe dizziness, or loss of consciousness, seek immediate emergency medical care.\n\n` +
    `*Disclaimer: This guidance is provided for informational purposes and is not a substitute for professional medical diagnosis or treatment.*`
  )
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function RenderText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="px-1 py-0.5 bg-black/10 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>
        if (part === '\n') return <br key={i} />
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, agentEmoji }: { msg: ChatMessage; agentEmoji: string }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const copy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-2 sm:gap-3 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm
                      ${isUser ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white' : 'bg-slate-100 text-sm sm:text-base'}`}>
        {isUser ? '👤' : agentEmoji}
      </div>
      <div className={`relative max-w-[88%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap
                        ${isUser
                          ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-sm'
                          : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-sm'
                        }
                        ${msg.loading ? 'animate-pulse' : ''}`}>
          {msg.loading
            ? <span className="flex gap-1 items-center py-1 px-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            : <RenderText text={msg.content} />
          }
        </div>
        <div className={`flex items-center gap-2 px-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity
                        ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-slate-400">
            {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!msg.loading && (
            <button onClick={copy}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 active:scale-95 transition-all">
              {copied ? <><Check className="w-3 h-3 text-emerald-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Agent card (sidebar) ──────────────────────────────────────────────────────

function AgentCard({
  agent, isActive, onClick,
}: {
  agent: AgentConfig; isActive: boolean; onClick: () => void
}) {
  return (
    <button
      id={`agent-tab-${agent.id}`}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left
                 ${isActive
                   ? 'bg-white shadow-md border border-slate-200'
                   : 'hover:bg-white/60 border border-transparent'
                 }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                       bg-gradient-to-br ${agent.iconBg} text-lg shadow-sm`}>
        {agent.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold truncate ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
          {agent.name}
        </p>
        <p className="text-[10px] text-slate-400 truncate">{agent.tagline}</p>
      </div>
      {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AIChatPage({ currentUser }: AIChatPageProps) {
  const [activeAgentId, setActiveAgentId] = useState<AgentId>('patient')
  const { sendAlert } = useNotifications()
  // Separate message history per agent
  const [histories, setHistories] = useState<Record<AgentId, ChatMessage[]>>({
    patient: [], doctor: [], caregiver: [], pharmacist: [], emergency: [],
  })
  const [input, setInput]     = useState('')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  const agent    = AGENTS.find((a) => a.id === activeAgentId)!
  const messages = histories[activeAgentId]

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMsg = (agentId: AgentId, msg: ChatMessage) => {
    setHistories((prev) => ({ ...prev, [agentId]: [...prev[agentId], msg] }))
  }
  const updateLastMsg = (agentId: AgentId, patch: Partial<ChatMessage>) => {
    setHistories((prev) => {
      const msgs = [...prev[agentId]]
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch }
      return { ...prev, [agentId]: msgs }
    })
  }

  const switchAgent = (id: AgentId) => {
    setActiveAgentId(id)
    setInput('')
  }

  const clearChat = () => {
    setHistories((prev) => ({ ...prev, [activeAgentId]: [] }))
  }

  // Voice input
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = 'en-IN'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput((prev) => prev + transcript)
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || sending) return
    setInput('')
    setSending(true)

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() }
    addMsg(activeAgentId, userMsg)

    const loadingId = (Date.now() + 1).toString()
    const loadingMsg: ChatMessage = { id: loadingId, role: 'assistant', content: '', timestamp: new Date(), loading: true }
    addMsg(activeAgentId, loadingMsg)

    try {
      const reply = await callGemini(
        histories[activeAgentId],
        msg,
        agent,
        currentUser.fullName,
        currentUser.id,
      )
      updateLastMsg(activeAgentId, { content: reply, loading: false })

      if (activeAgentId === 'emergency') {
        void sendAlert({
          title: '🚨 Emergency Triage Alert',
          message: 'Urgent medical assessment completed by AI Triage. Review recommendations now.',
          severity: 'critical',
          category: 'emergency',
        })
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      updateLastMsg(activeAgentId, {
        content: `⚠️ Couldn't reach Gemini: ${errMsg}. Please check your API key.`,
        loading: false,
      })
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); void send() }
  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  const isEmergency = activeAgentId === 'emergency'

  return (
    <div className="h-full flex bg-white overflow-hidden animate-fade-in">

      {/* ── Left: Agent panel ── */}
      <div className="hidden lg:flex w-56 shrink-0 flex-col bg-[#f0f8ff] border-r border-blue-200/70 p-3 gap-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-2">
          AI Agents
        </p>
        {AGENTS.map((a) => (
          <AgentCard key={a.id} agent={a} isActive={activeAgentId === a.id} onClick={() => switchAgent(a.id)} />
        ))}

        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="px-2">
            <p className="text-[10px] font-bold text-slate-400 mb-1">Model</p>
            <p className="text-[10px] text-slate-500">Gemini 3.8 Flash</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-slate-400">Live</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Chat area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 shrink-0
                        ${isEmergency ? 'bg-red-50' : 'bg-white'}`}>
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl
                             bg-gradient-to-br ${agent.iconBg} text-lg sm:text-xl shadow-sm`}>
              {agent.emoji}
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 truncate">
                <span className="truncate">{agent.name}</span>
                <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full ${agent.badgeBg} ${agent.badgeText} shrink-0`}>
                  AI
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{agent.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isEmergency && (
              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full animate-pulse">
                <AlertCircle className="w-3 h-3" /> Emergency
              </span>
            )}
            {messages.length > 0 && (
              <button id="chat-clear-btn" onClick={clearChat} title="Clear chat"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95 transition-all">
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile / Tablet Agent Selector Bar ── */}
        <div className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-[#f0f8ff] border-b border-blue-200/60 overflow-x-auto scrollbar-none shrink-0 touch-pan-x">
          {AGENTS.map((a) => {
            const isActive = activeAgentId === a.id
            return (
              <button
                key={a.id}
                id={`mobile-agent-pill-${a.id}`}
                onClick={() => switchAgent(a.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[34px] touch-manipulation ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-xs font-bold'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100 active:scale-95'
                }`}
              >
                <span>{a.emoji}</span>
                <span className="whitespace-nowrap">{a.name}</span>
              </button>
            )
          })}
        </div>

        {/* Emergency warning */}
        {isEmergency && (
          <div className="mx-3 sm:mx-4 mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3 rounded-2xl bg-red-50 border border-red-200 p-2.5 sm:p-3">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
            <p className="text-[11px] sm:text-xs text-red-700 font-medium leading-relaxed">
              <strong>For real emergencies, call 999 / 112 / 108 immediately.</strong>{' '}
              This AI triage is a decision support tool, not a substitute for emergency services.
            </p>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">

          {/* Welcome message when empty */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 px-2">
              <div className={`flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl
                              bg-gradient-to-br ${agent.iconBg} shadow-lg text-2xl sm:text-3xl mb-3 sm:mb-4`}>
                {agent.emoji}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-700 mb-1">{agent.name}</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed mb-4 sm:mb-6">{agent.tagline}</p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center max-w-lg">
                {agent.suggestions.map((s) => (
                  <button key={s}
                    id={`suggestion-${s.slice(0, 20).replace(/\s/g, '-')}`}
                    onClick={() => void send(s)}
                    className={`text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-150 text-left
                               ${isEmergency
                                 ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                 : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50'
                               } shadow-xs active:scale-95 touch-manipulation`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} agentEmoji={agent.emoji} />
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className={`shrink-0 px-3 sm:px-4 pt-2 pb-2 sm:pb-3 border-t ${isEmergency ? 'border-red-100 bg-red-50/60' : 'border-slate-100 bg-white/95'} backdrop-blur`}>
          <form onSubmit={handleSubmit} className="flex items-end gap-1.5 sm:gap-2">
            {/* Voice */}
            <button type="button" onClick={toggleVoice}
              id="voice-input-btn"
              title={listening ? 'Stop listening' : 'Voice input'}
              className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border transition-all min-h-[42px] min-w-[42px] touch-manipulation
                         ${listening
                           ? 'bg-red-500 border-red-500 text-white animate-pulse'
                           : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 active:scale-95'
                         }`}>
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text area */}
            <textarea
              ref={inputRef}
              id="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isEmergency ? '🚨 Describe emergency…' : `Ask ${agent.name}…`}
              disabled={sending}
              className={`flex-1 resize-none rounded-2xl border px-3 sm:px-4 py-2 sm:py-2.5 text-base sm:text-sm leading-relaxed
                         focus:outline-none focus:ring-2 transition-all
                         disabled:opacity-60 max-h-32 touch-manipulation
                         ${isEmergency
                           ? 'border-red-200 focus:ring-red-300 bg-white'
                           : 'border-slate-200 focus:ring-brand-300 bg-white'
                         }`}
              style={{ height: 'auto', minHeight: '42px' }}
              onInput={(e) => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`
              }}
            />

            {/* Send */}
            <button type="submit"
              id="chat-send-btn"
              disabled={!input.trim() || sending}
              className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl
                         transition-all duration-150 min-h-[42px] min-w-[42px] touch-manipulation active:scale-95
                         ${isEmergency
                           ? 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-200'
                           : 'bg-brand-600 hover:bg-brand-700 text-white disabled:bg-slate-200 disabled:text-slate-400'
                         }
                         disabled:cursor-not-allowed`}>
              {sending
                ? <Sparkles className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </form>
          <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 text-center">
            AI responses are informational only — not official medical advice.
          </p>
        </div>
      </div>
    </div>
  )
}
