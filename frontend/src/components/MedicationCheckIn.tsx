/**
 * @file MedicationCheckIn.tsx
 * @description Daily medication adherence tracker.
 *
 * Groups today's scheduled medications by time slot (Morning / Afternoon /
 * Evening / Night). Each slot shows a toggle to mark as taken or pending.
 * On toggle, the exact timestamp is written to Supabase `medication_logs`.
 * Missed critical medications show a red alert banner for caregiver handoff.
 */

import { useState } from 'react'
import {
  CheckCircle2, Circle, AlertTriangle, Clock, Pill,
  Utensils, RefreshCw, Bell,
} from 'lucide-react'
import { markMedicationTaken, type MedLogRow } from '../hooks/usePatientData'
import { useNotifications } from '../context/NotificationContext'

// ─── Props ────────────────────────────────────────────────────────────────────

interface MedicationCheckInProps {
  todayLogs: MedLogRow[]
  onRefetch: () => void
}

// ─── Slot config ──────────────────────────────────────────────────────────────

const SLOT_CONFIG: Record<string, { label: string; emoji: string; timeRange: string; colour: string }> = {
  morning:   { label: 'Morning',   emoji: '🌅', timeRange: '6 AM – 10 AM',  colour: 'amber'   },
  afternoon: { label: 'Afternoon', emoji: '☀️',  timeRange: '12 PM – 2 PM',  colour: 'orange'  },
  evening:   { label: 'Evening',   emoji: '🌆', timeRange: '6 PM – 8 PM',   colour: 'violet'  },
  night:     { label: 'Night',     emoji: '🌙', timeRange: '9 PM – 11 PM',  colour: 'indigo'  },
}

const SLOT_ORDER = ['morning', 'afternoon', 'evening', 'night']


// ─── Colour map (Tailwind safe-listed) ───────────────────────────────────────

const SLOT_COLOURS: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  iconBg: 'bg-amber-100'  },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-100' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', iconBg: 'bg-indigo-100' },
}

// ─── Single medication row ────────────────────────────────────────────────────

function MedItem({
  log,
  onToggle,
}: {
  log:      MedLogRow
  onToggle: (logId: string, current: string) => Promise<void>
}) {
  const [toggling, setToggling] = useState(false)
  const isTaken  = log.status === 'taken'
  const isMissed = log.status === 'missed'

  const handleToggle = async () => {
    setToggling(true)
    await onToggle(log.id, log.status)
    setToggling(false)
  }

  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-xl border transition-all duration-200
                    ${isTaken
                      ? 'bg-emerald-50 border-emerald-200'
                      : isMissed
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}>
      {/* Toggle button */}
      <button
        id={`med-toggle-${log.id}`}
        onClick={handleToggle}
        disabled={toggling}
        aria-label={isTaken ? `Mark ${log.medication_name} as not taken` : `Mark ${log.medication_name} as taken`}
        className={`shrink-0 transition-all duration-200
                   ${toggling ? 'opacity-50 scale-95' : 'hover:scale-110'}`}
      >
        {isTaken
          ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          : isMissed
            ? <AlertTriangle className="w-6 h-6 text-red-400" />
            : <Circle className="w-6 h-6 text-slate-300 hover:text-brand-400" />
        }
      </button>

      {/* Med info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate
                        ${isTaken ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>
            {log.medication_name}
          </p>
          {log.is_critical && (
            <span className="shrink-0 text-[10px] font-bold bg-red-100 text-red-600
                             px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Critical
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{log.dosage}</p>
      </div>

      {/* Status badge */}
      <div className="shrink-0 text-right">
        {isTaken ? (
          <div>
            <span className="badge-normal text-[10px]">✓ Taken</span>
            {log.taken_at && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {new Date(log.taken_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        ) : isMissed ? (
          <span className="badge-critical text-[10px]">⚠ Missed</span>
        ) : (
          <span className="text-[11px] font-medium text-slate-400">Pending</span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MedicationCheckIn({ todayLogs, onRefetch }: MedicationCheckInProps) {
  const [logs, setLogs] = useState<MedLogRow[]>(todayLogs)
  const [refreshing, setRefreshing] = useState(false)
  const { sendAlert } = useNotifications()

  // Group logs by timing slot
  const grouped: Record<string, MedLogRow[]> = {}
  for (const slot of SLOT_ORDER) {
    const slotLogs = logs.filter((l) => l.timing_slot === slot)
    if (slotLogs.length > 0) grouped[slot] = slotLogs
  }

  // Stats
  const total   = logs.length
  const taken   = logs.filter((l) => l.status === 'taken').length
  const missed  = logs.filter((l) => l.status === 'missed').length
  const pending = total - taken - missed
  const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0

  // Critical missed alerts
  const criticalMissed = logs.filter((l) => l.is_critical && l.status === 'missed')

  // Toggle handler — optimistic update + Supabase write
  const handleToggle = async (logId: string, currentStatus: string) => {
    const isTaken  = currentStatus !== 'taken'
    const now      = new Date().toISOString()

    // Optimistic UI update
    setLogs((prev) =>
      prev.map((l) =>
        l.id === logId
          ? { ...l, status: isTaken ? 'taken' : 'pending', taken_at: isTaken ? now : null }
          : l
      )
    )

    // Supabase write
    const { error } = await markMedicationTaken(logId, isTaken)
    if (error) {
      // Rollback on failure
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId ? { ...l, status: currentStatus, taken_at: null } : l
        )
      )
      console.error('Failed to update medication log:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefetch()
    setRefreshing(false)
  }

  if (total === 0) {
    return (
      <div className="dash-section">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
            <Pill className="w-4 h-4 text-brand-500" />
          </span>
          <h3 className="text-sm font-bold text-slate-700">Today's Medications</h3>
        </div>
        <div className="text-center py-6">
          <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No medications scheduled for today.</p>
          <p className="text-xs text-slate-400 mt-1">Add medications during onboarding or from settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-section space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
            <Pill className="w-4 h-4 text-brand-500" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-700">Today's Medications</h3>
            <p className="text-[11px] text-slate-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <button
          id="med-checkin-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-slate-400 hover:text-brand-600 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Critical missed alert ── */}
      {criticalMissed.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200
                        bg-red-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700">Critical medication missed!</p>
            <p className="text-xs text-red-600 mt-0.5">
              {criticalMissed.map((l) => l.medication_name).join(', ')} —{' '}
              immediate caregiver follow-up recommended.
            </p>
            <button
              id="dispatch-critical-push-btn"
              onClick={() => {
                void sendAlert({
                  title: 'Critical Medication Missed',
                  message: `Missed doses: ${criticalMissed.map((l) => l.medication_name).join(', ')}. Please take or contact caregiver immediately.`,
                  severity: 'critical',
                  category: 'medication',
                })
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-2xs transition-all active:scale-95"
            >
              <Bell className="w-3.5 h-3.5 animate-pulse" />
              Dispatch Push Alert Now
            </button>
          </div>
        </div>
      )}

      {/* ── Progress bar ── */}
      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600">Today's adherence</span>
          <span className={`text-sm font-extrabold
                           ${adherencePct >= 80 ? 'text-emerald-600'
                             : adherencePct >= 50 ? 'text-amber-500'
                             : 'text-red-500'}`}>
            {adherencePct}%
          </span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500
                       ${adherencePct >= 80 ? 'bg-emerald-500'
                         : adherencePct >= 50 ? 'bg-amber-400'
                         : 'bg-red-400'}`}
            style={{ width: `${adherencePct}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-[11px]">
          <span className="text-emerald-600 font-medium">✓ {taken} taken</span>
          <span className="text-slate-400">{pending} pending</span>
          {missed > 0 && <span className="text-red-500 font-medium">⚠ {missed} missed</span>}
        </div>
      </div>

      {/* ── Slots ── */}
      {Object.entries(grouped).map(([slot, slotLogs]) => {
        const cfg    = SLOT_CONFIG[slot]   ?? { label: slot, emoji: '💊', timeRange: '', colour: 'amber' }
        const colour = SLOT_COLOURS[cfg.colour] ?? SLOT_COLOURS.amber
        const allTaken = slotLogs.every((l) => l.status === 'taken')

        return (
          <div key={slot}>
            {/* Slot header */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-2
                            ${allTaken ? 'bg-emerald-50 border-emerald-200' : `${colour.bg} ${colour.border}`}`}>
              <span className="text-base">{cfg.emoji}</span>
              <span className={`text-xs font-bold uppercase tracking-wide
                               ${allTaken ? 'text-emerald-700' : colour.text}`}>
                {cfg.label}
              </span>
              <span className={`text-[10px] font-medium ${allTaken ? 'text-emerald-500' : 'text-slate-400'}`}>
                · {cfg.timeRange}
              </span>
              {allTaken && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
              )}
            </div>

            {/* Med items */}
            <div className="space-y-2">
              {slotLogs.map((log) => (
                <MedItem key={log.id} log={log} onToggle={handleToggle} />
              ))}
            </div>
          </div>
        )
      })}

      {/* ── Meal reminder footer ── */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <Utensils className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="text-[11px] text-slate-400">
          Remember to take medications at the right time relative to meals.
        </p>
      </div>

      {/* Pending reminder */}
      {pending > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200 px-3 py-2">
          <Clock className="w-4 h-4 text-brand-500 shrink-0" />
          <p className="text-xs text-brand-700 font-medium">
            {pending} medication{pending > 1 ? 's' : ''} still pending today.
          </p>
        </div>
      )}
    </div>
  )
}
