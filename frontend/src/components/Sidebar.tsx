/**
 * @file Sidebar.tsx
 * @description Collapsible sidebar navigation for MediCare AI.
 * Renders role-specific nav items with active state highlighting.
 *
 * Member 2 owns the overall navigation structure and UX.
 */

import { useState } from 'react'
import {
  Activity,
  LayoutDashboard,
  Pill,
  CalendarDays,
  FlaskConical,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  Stethoscope,
  Heart,
  FileText,
} from 'lucide-react'
import { UserRole, type IUser } from '../types/medical'

// ─── Nav item definitions ─────────────────────────────────────────────────────

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  [UserRole.Patient]: [
    { id: 'overview',      label: 'Overview',        icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'vitals',        label: 'Vitals',           icon: <Heart className="w-5 h-5" /> },
    { id: 'medications',   label: 'Medications',      icon: <Pill className="w-5 h-5" /> },
    { id: 'appointments',  label: 'Appointments',     icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'lab-results',   label: 'Lab Results',      icon: <FlaskConical className="w-5 h-5" /> },
    { id: 'ai-assistant',  label: 'AI Assistant',     icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'alerts',        label: 'Alerts',           icon: <Bell className="w-5 h-5" />, badge: 3 },
  ],
  [UserRole.Caregiver]: [
    { id: 'overview',      label: 'Overview',         icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'patients',      label: 'My Patients',      icon: <Users className="w-5 h-5" /> },
    { id: 'tasks',         label: 'Care Tasks',       icon: <FileText className="w-5 h-5" /> },
    { id: 'medications',   label: 'Medications',      icon: <Pill className="w-5 h-5" /> },
    { id: 'appointments',  label: 'Appointments',     icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'alerts',        label: 'Alerts',           icon: <Bell className="w-5 h-5" />, badge: 2 },
    { id: 'ai-assistant',  label: 'AI Assistant',     icon: <MessageSquare className="w-5 h-5" /> },
  ],
  [UserRole.Doctor]: [
    { id: 'overview',      label: 'Overview',         icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'patients',      label: 'Patients',         icon: <Users className="w-5 h-5" /> },
    { id: 'diagnostics',   label: 'Diagnostics',      icon: <Stethoscope className="w-5 h-5" /> },
    { id: 'appointments',  label: 'Schedule',         icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'lab-results',   label: 'Lab Results',      icon: <FlaskConical className="w-5 h-5" /> },
    { id: 'ai-assistant',  label: 'AI Diagnosis',     icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'alerts',        label: 'Alerts',           icon: <Bell className="w-5 h-5" />, badge: 5 },
  ],
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  currentUser: IUser
  activeSection: string
  onSectionChange: (section: string) => void
  onLogout: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({ currentUser, activeSection, onSectionChange, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false)

  const navItems = NAV_ITEMS[currentUser.role]

  const roleLabel: Record<UserRole, string> = {
    [UserRole.Patient]:   'Patient Portal',
    [UserRole.Caregiver]: 'Caregiver Portal',
    [UserRole.Doctor]:    'Clinical Portal',
  }

  return (
    <aside
      id="sidebar"
      aria-label="Main navigation"
      className={`
        relative flex flex-col h-full shrink-0
        bg-[var(--surface-sidebar)] text-white
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10
                       ${collapsed ? 'justify-center' : ''}`}>
        <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg
                        bg-brand-500 shadow-lg">
          <Activity className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-base leading-tight">MediCare AI</p>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">
              {roleLabel[currentUser.role]}
            </p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5" role="navigation">
        {navItems.map((item) => {
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSectionChange(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`
                nav-item w-full
                ${isActive ? 'nav-item-active' : ''}
                ${collapsed ? 'justify-center px-0' : ''}
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center
                                 rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom section: settings & logout */}
      <div className="border-t border-white/10 px-2 py-3 space-y-0.5">
        <button
          id="nav-settings"
          title={collapsed ? 'Settings' : undefined}
          className={`nav-item w-full ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="flex-1 text-left">Settings</span>}
        </button>
        <button
          id="nav-logout"
          onClick={onLogout}
          title={collapsed ? 'Log out' : undefined}
          className={`nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10
                       ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="flex-1 text-left">Log out</span>}
        </button>
      </div>

      {/* Collapse toggle button */}
      <button
        id="sidebar-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-20 z-50
                   flex h-6 w-6 items-center justify-center rounded-full
                   border border-brand-200 bg-white text-brand-700 shadow-md
                   transition-colors hover:bg-brand-50"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft  className="w-3.5 h-3.5" />
        }
      </button>
    </aside>
  )
}
