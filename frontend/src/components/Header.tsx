/**
 * @file Header.tsx
 * @description Top navigation bar for the MediCare AI dashboard.
 * Shows current date/time, user avatar, notifications, and search.
 *
 * Member 2 owns this component.
 */

import { useState, useEffect } from 'react'
import { Search, Bell, Moon, Sun, LogOut, User } from 'lucide-react'
import { UserRole, type IUser } from '../types/medical'

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  currentUser: IUser
  onLogout: () => void
}

// ─── Role color helper ────────────────────────────────────────────────────────

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.Patient]:   'bg-brand-100  text-brand-700',
  [UserRole.Caregiver]: 'bg-violet-100 text-violet-700',
  [UserRole.Doctor]:    'bg-emerald-100 text-emerald-700',
}

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Patient]:   'Patient',
  [UserRole.Caregiver]: 'Caregiver',
  [UserRole.Doctor]:    'Doctor',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Header({ currentUser, onLogout }: HeaderProps) {
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false)

  // Live clock
  useEffect(() => {
    const tick = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      )
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const initials = currentUser.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })

  return (
    <header
      id="main-header"
      className="flex items-center justify-between gap-4
                 border-b border-slate-100 bg-white/80 backdrop-blur-md
                 px-6 py-3 shadow-sm shrink-0"
      role="banner"
    >
      {/* Left: date & greeting */}
      <div>
        <p className="text-xs text-slate-400 font-medium">{today}</p>
        <h2 className="text-sm font-semibold text-slate-800">
          Good {getGreeting()}, {currentUser.fullName.split(' ')[0]} 👋
        </h2>
      </div>

      {/* Center: search */}
      <div className="flex-1 max-w-sm hidden md:block">
        <label htmlFor="global-search" className="sr-only">Search patients or records</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="global-search"
            type="search"
            placeholder="Search…"
            className="input-field pl-9 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Current time badge */}
        <span className="hidden sm:block text-xs font-mono text-slate-500
                         bg-slate-100 px-2.5 py-1 rounded-full">
          {currentTime}
        </span>

        {/* Dark mode */}
        <button
          id="toggle-dark-mode"
          onClick={() => setDarkMode((d) => !d)}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="btn-ghost p-2"
        >
          {darkMode
            ? <Sun  className="w-4 h-4 text-amber-500" />
            : <Moon className="w-4 h-4 text-slate-500" />
          }
        </button>

        {/* Notifications */}
        <button
          id="notifications-btn"
          aria-label="View notifications"
          className="btn-ghost p-2 relative"
        >
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* User avatar / menu */}
        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setUserMenuOpen((o) => !o)}
            aria-label="Open user menu"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full
                       border border-slate-200 bg-white shadow-sm
                       hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full
                            bg-brand-600 text-white text-xs font-bold shadow-inner">
              {currentUser.avatarUrl
                ? <img src={currentUser.avatarUrl} alt={currentUser.fullName}
                       className="h-8 w-8 rounded-full object-cover" />
                : initials
              }
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {currentUser.fullName}
              </p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full
                               ${ROLE_COLORS[currentUser.role]}`}>
                {ROLE_LABELS[currentUser.role]}
              </span>
            </div>
          </button>

          {/* Dropdown menu */}
          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-48
                         rounded-xl bg-white border border-slate-100 shadow-xl
                         py-1 z-50 animate-fade-in"
            >
              <button role="menuitem"
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <User className="w-4 h-4" /> Profile
              </button>
              <hr className="my-1 border-slate-100" />
              <button role="menuitem" onClick={onLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
