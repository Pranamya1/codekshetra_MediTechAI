/**
 * @file StatCard.tsx
 * @description Reusable KPI card for displaying a single health metric.
 * Used extensively in all three dashboards.
 *
 * Features:
 * - Trend indicator (up / down / stable) with color coding
 * - Normal/warning/critical status ring
 * - Optional sparkline slot (passed as children)
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { VitalTrend, AlertSeverity } from '../types/medical'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StatCardProps {
  /** Unique ID for accessibility / testing */
  id: string
  /** Card title, e.g. "Heart Rate" */
  label: string
  /** Primary value, e.g. "72" */
  value: string | number
  /** Unit displayed after value, e.g. "bpm" */
  unit?: string
  /** Trend direction */
  trend?: VitalTrend
  /** Percentage or absolute change from previous reading */
  change?: string
  /** Alert severity — controls the accent colour */
  severity?: AlertSeverity
  /** Lucide icon to show top-left */
  icon?: React.ReactNode
  /** Optional sparkline or chart slot */
  children?: React.ReactNode
  /** Extra className for the card wrapper */
  className?: string
}

// ─── Severity accent map ──────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<AlertSeverity, { ring: string; icon: string; bg: string }> = {
  [AlertSeverity.Info]:     { ring: 'ring-brand-400',   icon: 'text-brand-500',   bg: 'bg-brand-50'   },
  [AlertSeverity.Warning]:  { ring: 'ring-amber-400',   icon: 'text-amber-500',   bg: 'bg-amber-50'   },
  [AlertSeverity.Critical]: { ring: 'ring-red-400',     icon: 'text-red-500',     bg: 'bg-red-50'     },
}

// ─── Trend config ─────────────────────────────────────────────────────────────

const TREND_CONFIG: Record<VitalTrend, {
  icon: React.ReactNode
  color: string
  label: string
}> = {
  [VitalTrend.Up]:     { icon: <TrendingUp   className="w-3.5 h-3.5" />, color: 'text-emerald-600', label: 'Rising' },
  [VitalTrend.Down]:   { icon: <TrendingDown className="w-3.5 h-3.5" />, color: 'text-red-500',     label: 'Falling' },
  [VitalTrend.Stable]: { icon: <Minus        className="w-3.5 h-3.5" />, color: 'text-slate-500',   label: 'Stable'  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatCard({
  id,
  label,
  value,
  unit,
  trend = VitalTrend.Stable,
  change,
  severity = AlertSeverity.Info,
  icon,
  children,
  className = '',
}: StatCardProps) {
  const severityStyle = SEVERITY_STYLES[severity]
  const trendConfig   = TREND_CONFIG[trend]

  return (
    <article
      id={id}
      aria-label={`${label}: ${value}${unit ? ' ' + unit : ''}`}
      className={`
        card card-hover group
        relative overflow-hidden
        ring-1 ${severityStyle.ring}/30
        ${className}
      `}
    >
      {/* Subtle top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${severityStyle.ring.replace('ring-', 'bg-')}`} />

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        </div>
        {icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg
                           ${severityStyle.bg} ${severityStyle.icon}
                           shadow-sm group-hover:scale-110 transition-transform duration-200`}>
            {icon}
          </div>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-slate-400 font-medium pb-0.5">{unit}</span>
        )}
      </div>

      {/* Trend & change row */}
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${trendConfig.color}`}>
        {trendConfig.icon}
        <span>{trendConfig.label}</span>
        {change && <span className="text-slate-400 font-normal">· {change}</span>}
      </div>

      {/* Optional sparkline slot */}
      {children && (
        <div className="mt-3 -mx-1">{children}</div>
      )}
    </article>
  )
}
