/**
 * @file Header.tsx
 * @description Floating top bar — white card with page title, search, notifications, user menu.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Search, Bell, ChevronDown, LogOut, Menu,
  CheckCircle2, ExternalLink, Volume2, VolumeX, Sparkles, Settings
} from 'lucide-react'
import { UserRole, type IUser } from '../types/medical'
import { useNotifications, type AppAlert } from '../context/NotificationContext'

interface HeaderProps {
  currentUser:            IUser
  activeSection?:         string
  onLogout:               () => void
  onToggleMobileSidebar?: () => void
  onNavigateSection?:     (section: string) => void
}

const PAGE_TITLES: Record<UserRole, string> = {
  [UserRole.Patient]:   'Patient Dashboard',
  [UserRole.Caregiver]: 'Caregiver Dashboard',
  [UserRole.Doctor]:    'Clinical Dashboard',
}

const SECTION_TITLES: Record<string, string> = {
  settings: 'System Settings',
  alerts: 'Alerts & Notifications',
  vitals: 'Vitals Monitor',
  medications: 'Medication Schedule',
  appointments: 'Appointments',
  'lab-results': 'Lab Results',
  patients: 'Patients',
  tasks: 'Care Tasks',
  diagnostics: 'Diagnostics',
  'ai-assistant': 'AI Medical Assistant',
}

export function Header({
  currentUser,
  activeSection,
  onLogout,
  onToggleMobileSidebar,
  onNavigateSection,
}: HeaderProps) {
  const [time, setTime] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const {
    alerts,
    unreadCount,
    permission,
    soundEnabled,
    setSoundEnabled,
    requestPermission,
    sendTestNotification,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Ensure dark mode class is stripped from HTML element
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notifOpen])

  const initials = currentUser.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const formatTimeAgo = (ts: string) => {
    try {
      const diffMs = Date.now() - new Date(ts).getTime()
      const diffSec = Math.floor(diffMs / 1000)
      if (diffSec < 60) return 'Just now'
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin}m ago`
      const diffHr = Math.floor(diffMin / 60)
      if (diffHr < 24) return `${diffHr}h ago`
      const diffDay = Math.floor(diffHr / 24)
      return `${diffDay}d ago`
    } catch {
      return 'Recently'
    }
  }

  const getSeverityPill = (severity: AppAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
      case 'warning':
        return <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
      case 'info':
      default:
        return <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
    }
  }

  return (
    <header
      className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3
                 bg-[#f0f8ff] rounded-2xl border border-blue-200/80 shadow-xs shrink-0"
    >
      {/* Mobile hamburger menu toggle */}
      {onToggleMobileSidebar && (
        <button
          id="header-mobile-menu-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                     bg-white border border-blue-200/60 text-slate-700 hover:bg-blue-50 active:scale-95 transition-all shadow-2xs"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm sm:text-base font-bold text-slate-800 truncate">
          {(activeSection && SECTION_TITLES[activeSection]) || PAGE_TITLES[currentUser.role]}
        </h1>
        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
          <span className="hidden sm:inline">{dateStr} · </span>{timeStr}
        </p>
      </div>

      {/* ── Search bar ── */}
      <div className={`relative transition-all duration-300 ${searchOpen ? 'w-56' : 'w-9'}`}>
        {searchOpen ? (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200
                          bg-white px-3 py-2 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              autoFocus
              onBlur={() => setSearchOpen(false)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none
                         placeholder:text-slate-400 w-full"
            />
          </div>
        ) : (
          <button
            id="header-search-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            className="flex h-9 w-9 items-center justify-center rounded-xl
                       bg-white border border-blue-200/60 text-slate-600 hover:bg-blue-50 transition-colors shadow-2xs"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Notifications Popover */}
      <div className="relative" ref={notifRef}>
        <button
          id="header-notifications-btn"
          onClick={() => setNotifOpen((prev) => !prev)}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
          aria-expanded={notifOpen}
          className={`relative flex h-9 w-9 items-center justify-center rounded-xl
                     border border-blue-200/60 transition-colors shadow-2xs ${
                       notifOpen
                         ? 'bg-blue-100 text-brand-700'
                         : 'bg-white text-slate-600 hover:bg-blue-50'
                     }`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Popover */}
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-blue-200 shadow-2xl z-50 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-4 py-3 bg-[#f0f8ff] border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-800"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Mute alert sounds' : 'Unmute alert sounds'}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-brand-600" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Push Notification Browser Permission Bar */}
            <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {permission === 'granted' ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Web Push Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                    <Bell className="w-3.5 h-3.5 text-brand-500 shrink-0 animate-pulse" />
                    <span className="truncate text-[11px]">Push alerts disabled</span>
                  </div>
                )}
              </div>

              {permission !== 'granted' ? (
                <button
                  onClick={async () => {
                    await requestPermission()
                  }}
                  className="shrink-0 text-[10px] font-bold bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1 rounded-lg shadow-2xs"
                >
                  Enable Push
                </button>
              ) : (
                <button
                  onClick={() => sendTestNotification('warning')}
                  className="shrink-0 text-[10px] font-semibold bg-white border border-blue-200 hover:bg-blue-50 text-brand-700 px-2 py-0.5 rounded-lg flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-brand-500" /> Test
                </button>
              )}
            </div>

            {/* Alert Items List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {alerts.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No alerts right now</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Missed medications and vitals alerts will appear here.
                  </p>
                </div>
              ) : (
                alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      markAsRead(alert.id)
                      if (onNavigateSection) {
                        setNotifOpen(false)
                        onNavigateSection('alerts')
                      }
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-start gap-3 ${
                      !alert.read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-1">{getSeverityPill(alert.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                          {alert.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTimeAgo(alert.timestamp)}
                        </span>
                      </div>
                      <p
                        className={`text-xs ${
                          !alert.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        } line-clamp-1`}
                      >
                        {alert.title}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Popover Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setNotifOpen(false)
                  if (onNavigateSection) onNavigateSection('alerts')
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl font-bold text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <span>Open Alerts & Notification Center</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-7 w-px bg-blue-200/80" />

      {/* User menu */}
      <div className="relative">
        <button
          id="header-user-menu-btn"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5
                     hover:bg-blue-100/50 transition-colors"
        >
          {/* Avatar */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full
                          bg-gradient-to-br from-brand-500 to-brand-700
                          text-xs font-bold text-white shadow-sm shrink-0">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-slate-700 leading-tight">
              {currentUser.fullName}
            </p>
            <p className="text-[10px] text-slate-400 capitalize">{currentUser.role}</p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200
                                    ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl
                          bg-white border border-blue-200/80 shadow-lg py-1.5 z-50
                          animate-fade-in">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">{currentUser.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
            </div>
            <button
              id="header-settings-btn"
              onClick={() => {
                setMenuOpen(false)
                if (onNavigateSection) onNavigateSection('settings')
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Settings
            </button>
            <button
              id="header-logout-btn"
              onClick={() => { setMenuOpen(false); onLogout() }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm
                         text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
