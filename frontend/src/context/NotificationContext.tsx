/**
 * @file NotificationContext.tsx
 * @description Provides app-wide Push Notifications, browser Web Notification integration,
 * audio chime alerts, and unread alert badge management.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { playNotificationChime } from '../services/notificationAudio'

export type AlertSeverityType = 'info' | 'warning' | 'critical'
export type AlertCategoryType = 'medication' | 'vitals' | 'appointment' | 'emergency' | 'system'

export interface AppAlert {
  id: string
  title: string
  message: string
  severity: AlertSeverityType
  category: AlertCategoryType
  timestamp: string // ISO string
  read: boolean
  actionUrl?: string
}

interface NotificationContextValue {
  alerts: AppAlert[]
  unreadCount: number
  permission: NotificationPermission | 'unsupported'
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>
  sendAlert: (alert: Omit<AppAlert, 'id' | 'timestamp' | 'read'>) => Promise<void>
  sendTestNotification: (severity?: AlertSeverityType) => Promise<void>
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteAlert: (id: string) => void
  clearAll: () => void
  activeToast: AppAlert | null
  dismissToast: () => void
}

const STORAGE_KEY_ALERTS = 'medicare_alerts_v1'
const STORAGE_KEY_SOUND = 'medicare_alerts_sound_v1'

const DEFAULT_ALERTS: AppAlert[] = []

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AppAlert[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ALERTS)
      if (stored) {
        return JSON.parse(stored) as AppAlert[]
      }
    } catch (e) {
      console.warn('Could not load alerts from localStorage:', e)
    }
    return DEFAULT_ALERTS
  })

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SOUND)
      return stored !== null ? JSON.parse(stored) : true
    } catch {
      return true
    }
  })

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [activeToast, setActiveToast] = useState<AppAlert | null>(null)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)

  // Save alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts))
    } catch (e) {
      console.warn('Could not persist alerts:', e)
    }
  }, [alerts])

  // Save sound pref
  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val)
    try {
      localStorage.setItem(STORAGE_KEY_SOUND, JSON.stringify(val))
    } catch (e) {
      console.warn(e)
    }
  }

  // Register service worker and inspect browser Notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    } else {
      setPermission('unsupported')
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setSwRegistration(reg)
        })
        .catch((err) => {
          console.debug('ServiceWorker registration skipped or failed:', err)
        })
    }
  }, [])

  // Auto-dismiss in-app toast
  useEffect(() => {
    if (!activeToast) return
    const timer = setTimeout(() => {
      setActiveToast(null)
    }, activeToast.severity === 'critical' ? 9000 : 6000)
    return () => clearTimeout(timer)
  }, [activeToast])

  // Request browser push notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported')
      return 'unsupported'
    }

    try {
      const res = await Notification.requestPermission()
      setPermission(res)
      return res
    } catch (err) {
      console.error('Error requesting notification permission:', err)
      return 'denied'
    }
  }, [])

  // Send an alert
  const sendAlert = useCallback(
    async (alertData: Omit<AppAlert, 'id' | 'timestamp' | 'read'>) => {
      const newAlert: AppAlert = {
        ...alertData,
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        read: false,
      }

      // 1. Update in-memory state
      setAlerts((prev) => [newAlert, ...prev])

      // 2. In-app toast banner
      setActiveToast(newAlert)

      // 3. Audio chime
      if (soundEnabled) {
        playNotificationChime(newAlert.severity)
      }

      // 4. Browser Web Push Notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            const titlePrefix =
              newAlert.severity === 'critical'
                ? '🚨 URGENT: '
                : newAlert.severity === 'warning'
                ? '⚠️ Alert: '
                : 'ℹ️ '

            const title = `${titlePrefix}${newAlert.title}`
            const options: NotificationOptions = {
              body: newAlert.message,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              tag: newAlert.id,
              requireInteraction: newAlert.severity === 'critical',
            }

            if (swRegistration && 'showNotification' in swRegistration) {
              await swRegistration.showNotification(title, options)
            } else {
              new Notification(title, options)
            }
          } catch (e) {
            console.warn('Could not dispatch browser push notification:', e)
          }
        }
      }
    },
    [soundEnabled, swRegistration]
  )

  // Send test push notification helper
  const sendTestNotification = useCallback(
    async (severity: AlertSeverityType = 'info') => {
      if (permission !== 'granted') {
        const perm = await requestPermission()
        if (perm !== 'granted') {
          // If browser permission denied/dismissed, still show rich in-app toast
          console.info('Browser notification not granted, falling back to in-app notification.')
        }
      }

      const templates: Record<AlertSeverityType, { title: string; message: string; category: AlertCategoryType }> = {
        critical: {
          title: 'Critical Medication Overdue',
          message: 'Atorvastatin 20mg dose was missed at 8:00 AM. Immediate action required.',
          category: 'medication',
        },
        warning: {
          title: 'Heart Rate Spike Alert',
          message: 'Resting pulse reached 108 bpm while sedentary.',
          category: 'vitals',
        },
        info: {
          title: 'MediCare AI Push Active',
          message: 'Push notifications are configured and functioning in real time.',
          category: 'system',
        },
      }

      const item = templates[severity]
      await sendAlert({
        title: item.title,
        message: item.message,
        severity,
        category: item.category,
      })
    },
    [permission, requestPermission, sendAlert]
  )

  const markAsRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
  }, [])

  const deleteAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setAlerts([])
  }, [])

  const dismissToast = useCallback(() => {
    setActiveToast(null)
  }, [])

  const unreadCount = alerts.filter((a) => !a.read).length

  return (
    <NotificationContext.Provider
      value={{
        alerts,
        unreadCount,
        permission,
        soundEnabled,
        setSoundEnabled,
        requestPermission,
        sendAlert,
        sendTestNotification,
        markAsRead,
        markAllAsRead,
        deleteAlert,
        clearAll,
        activeToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}
