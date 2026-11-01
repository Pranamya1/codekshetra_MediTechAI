/**
 * @file NotificationToast.tsx
 * @description Floating push notification toast banner displayed at the top of the viewport.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, AlertCircle, Info, X, Bell, ExternalLink } from 'lucide-react'
import { useNotifications, type AppAlert } from '../context/NotificationContext'

interface NotificationToastProps {
  onNavigateToAlerts?: () => void
}

export function NotificationToast({ onNavigateToAlerts }: NotificationToastProps) {
  const { activeToast, dismissToast } = useNotifications()
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!activeToast) {
      setProgress(100)
      return
    }

    const duration = activeToast.severity === 'critical' ? 9000 : 6000
    const stepTime = 50
    const decrement = (stepTime / duration) * 100

    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - decrement))
    }, stepTime)

    return () => clearInterval(timer)
  }, [activeToast])

  if (!activeToast) return null

  const getSeverityConfig = (alert: AppAlert) => {
    switch (alert.severity) {
      case 'critical':
        return {
          border: 'border-red-300',
          bg: 'bg-red-50/95',
          text: 'text-red-900',
          subtext: 'text-red-700',
          badge: 'bg-red-600 text-white',
          icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0 animate-bounce" />,
          progress: 'bg-red-500',
        }
      case 'warning':
        return {
          border: 'border-amber-300',
          bg: 'bg-amber-50/95',
          text: 'text-amber-900',
          subtext: 'text-amber-700',
          badge: 'bg-amber-500 text-white',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          progress: 'bg-amber-500',
        }
      case 'info':
      default:
        return {
          border: 'border-blue-300',
          bg: 'bg-blue-50/95',
          text: 'text-blue-900',
          subtext: 'text-blue-700',
          badge: 'bg-brand-600 text-white',
          icon: <Info className="w-5 h-5 text-brand-600 shrink-0" />,
          progress: 'bg-brand-500',
        }
    }
  }

  const config = getSeverityConfig(activeToast)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-3 sm:top-4 right-3 sm:right-5 z-50 max-w-sm sm:max-w-md w-[calc(100vw-1.5rem)] sm:w-full animate-slide-in pointer-events-auto"
    >
      <div
        className={`rounded-2xl border ${config.border} ${config.bg} backdrop-blur-md shadow-xl overflow-hidden`}
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{config.icon}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.badge}`}
                >
                  {activeToast.severity}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 capitalize">
                  {activeToast.category}
                </span>
                <span className="text-[9px] text-slate-400 ml-auto flex items-center gap-1">
                  <Bell className="w-2.5 h-2.5" /> Push alert
                </span>
              </div>

              <h4 className={`text-sm font-bold ${config.text} leading-tight`}>
                {activeToast.title}
              </h4>
              <p className={`text-xs mt-1 ${config.subtext} leading-relaxed line-clamp-2`}>
                {activeToast.message}
              </p>

              {onNavigateToAlerts && (
                <button
                  onClick={() => {
                    dismissToast()
                    onNavigateToAlerts()
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900 underline underline-offset-2"
                >
                  View in Alerts Center
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              id="dismiss-push-toast-btn"
              onClick={dismissToast}
              aria-label="Dismiss alert notification"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Linear progress timer */}
        <div className="h-1 w-full bg-slate-200/60 overflow-hidden">
          <div
            className={`h-full ${config.progress} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
