/**
 * @file Sidebar.tsx
 * @description Collapsible dark sidebar — matches the auth page brand panel.
 * Floating, rounded, gradient background.
 */

import { useState } from 'react'
import {
  Activity, LayoutDashboard, Pill, CalendarDays, FlaskConical,
  MessageSquare, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  Users, Stethoscope, Heart, FileText, X,
} from 'lucide-react'
import { UserRole, type IUser } from '../types/medical'
import { useNotifications } from '../context/NotificationContext'

interface NavItem { id: string; label: string; icon: React.ReactNode; badge?: number }

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  [UserRole.Patient]: [
    { id: 'overview',     label: 'Overview',     icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'vitals',       label: 'Vitals',        icon: <Heart           className="w-[18px] h-[18px]" /> },
    { id: 'medications',  label: 'Medications',   icon: <Pill            className="w-[18px] h-[18px]" /> },
    { id: 'appointments', label: 'Appointments',  icon: <CalendarDays    className="w-[18px] h-[18px]" /> },
    { id: 'lab-results',  label: 'Lab Results',   icon: <FlaskConical    className="w-[18px] h-[18px]" /> },
    { id: 'ai-assistant', label: 'AI Assistant',  icon: <MessageSquare   className="w-[18px] h-[18px]" /> },
    { id: 'alerts',       label: 'Alerts',        icon: <Bell            className="w-[18px] h-[18px]" />, badge: 3 },
  ],
  [UserRole.Caregiver]: [
    { id: 'overview',     label: 'Overview',      icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'patients',     label: 'My Patients',   icon: <Users           className="w-[18px] h-[18px]" /> },
    { id: 'tasks',        label: 'Care Tasks',    icon: <FileText        className="w-[18px] h-[18px]" /> },
    { id: 'medications',  label: 'Medications',   icon: <Pill            className="w-[18px] h-[18px]" /> },
    { id: 'appointments', label: 'Appointments',  icon: <CalendarDays    className="w-[18px] h-[18px]" /> },
    { id: 'alerts',       label: 'Alerts',        icon: <Bell            className="w-[18px] h-[18px]" />, badge: 2 },
    { id: 'ai-assistant', label: 'AI Assistant',  icon: <MessageSquare   className="w-[18px] h-[18px]" /> },
  ],
  [UserRole.Doctor]: [
    { id: 'overview',     label: 'Overview',      icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { id: 'patients',     label: 'Patients',      icon: <Users           className="w-[18px] h-[18px]" /> },
    { id: 'diagnostics',  label: 'Diagnostics',   icon: <Stethoscope     className="w-[18px] h-[18px]" /> },
    { id: 'appointments', label: 'Schedule',      icon: <CalendarDays    className="w-[18px] h-[18px]" /> },
    { id: 'lab-results',  label: 'Lab Results',   icon: <FlaskConical    className="w-[18px] h-[18px]" /> },
    { id: 'ai-assistant', label: 'AI Diagnosis',  icon: <MessageSquare   className="w-[18px] h-[18px]" /> },
    { id: 'alerts',       label: 'Alerts',        icon: <Bell            className="w-[18px] h-[18px]" />, badge: 5 },
  ],
}

interface SidebarProps {
  currentUser:    IUser
  activeSection:  string
  onSectionChange:(section: string) => void
  onLogout:       () => void
  mobileOpen?:    boolean
  onCloseMobile?: () => void
}

export function Sidebar({
  currentUser,
  activeSection,
  onSectionChange,
  onLogout,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { unreadCount } = useNotifications()
  const baseItems = NAV_ITEMS[currentUser.role]
  const navItems = baseItems.map((item) =>
    item.id === 'alerts' ? { ...item, badge: unreadCount } : item
  )

  const roleLabel: Record<UserRole, string> = {
    [UserRole.Patient]:   'Patient Portal',
    [UserRole.Caregiver]: 'Caregiver Portal',
    [UserRole.Doctor]:    'Clinical Portal',
  }

  // Avatar initials
  const initials = currentUser.fullName
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  const handleNavClick = (sectionId: string) => {
    onSectionChange(sectionId)
    onCloseMobile?.()
  }

  const renderNavList = (isMobile: boolean, isCollapsed: boolean) => (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" role="navigation">
      {navItems.map((item) => {
        const isActive = activeSection === item.id
        return (
          <button
            key={item.id}
            id={`${isMobile ? 'mobile-' : ''}nav-${item.id}`}
            onClick={() => handleNavClick(item.id)}
            title={isCollapsed ? item.label : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`
              relative flex items-center w-full gap-3 rounded-xl px-3 py-2.5
              text-sm font-medium transition-all duration-150 min-h-[44px] touch-manipulation
              ${isActive
                ? 'bg-brand-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:bg-white hover:text-brand-600 hover:shadow-xs'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <span className="shrink-0">{item.icon}</span>
            {!isCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}

            {/* Badge — expanded */}
            {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
              <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center
                               rounded-full px-1.5 text-[10px] font-bold shadow-xs
                               ${isActive ? 'bg-white text-brand-600' : 'bg-red-500 text-white'}`}>
                {item.badge}
              </span>
            )}
            {/* Badge dot — collapsed */}
            {isCollapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        )
      })}
    </nav>
  )

  const renderBottomSection = (isMobile: boolean, isCollapsed: boolean) => (
    <div className="border-t border-blue-200/60 px-2 pt-2 pb-3 space-y-1">
      {/* Settings */}
      <button
        id={`${isMobile ? 'mobile-' : ''}nav-settings`}
        onClick={() => {
          onCloseMobile?.()
          onSectionChange('settings')
        }}
        title={isCollapsed ? 'Settings' : undefined}
        className={`flex items-center w-full gap-3 rounded-xl px-3 py-2.5 min-h-[44px] touch-manipulation
                    text-sm font-medium transition-all duration-150
                    ${activeSection === 'settings'
                      ? 'bg-brand-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-white hover:text-brand-600'
                    }
                    ${isCollapsed ? 'justify-center' : ''}`}
      >
        <Settings className="w-[18px] h-[18px] shrink-0" />
        {!isCollapsed && <span className="flex-1 text-left">Settings</span>}
      </button>

      {/* User row */}
      {!isCollapsed && (
        <div className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-xl bg-white/70 border border-blue-200/50 shadow-xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center
                          rounded-full bg-brand-500 text-xs font-bold text-white shadow-xs">
            {initials}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.fullName}</p>
            <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        id={`${isMobile ? 'mobile-' : ''}nav-logout`}
        onClick={() => {
          onCloseMobile?.()
          onLogout()
        }}
        title={isCollapsed ? 'Log out' : undefined}
        className={`flex items-center w-full gap-3 rounded-xl px-3 py-2.5 min-h-[44px] touch-manipulation
                    text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700
                    transition-all duration-150
                    ${isCollapsed ? 'justify-center' : ''}`}
      >
        <LogOut className="w-[18px] h-[18px] shrink-0" />
        {!isCollapsed && <span className="flex-1 text-left">Log out</span>}
      </button>
    </div>
  )

  return (
    <>
      {/* ── MOBILE / TABLET OVERLAY BACKDROP ── */}
      {mobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden animate-fade-in"
        />
      )}

      {/* ── MOBILE / TABLET SLIDE-OVER DRAWER ── */}
      <aside
        id="sidebar-mobile-drawer"
        aria-label="Mobile navigation"
        className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col
          border-r border-blue-200/80 shadow-2xl
          bg-[#f0f8ff]
          transform transition-transform duration-300 ease-in-out lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-blue-200/60 bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center w-9 h-9
                            rounded-xl bg-brand-500 text-white shadow-sm">
              <Activity className="w-[18px] h-[18px] text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="font-extrabold text-sm text-slate-900 leading-tight">MediCare AI</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                {roleLabel[currentUser.role]}
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-blue-200/60 text-slate-600
                       hover:bg-blue-50 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderNavList(true, false)}
        {renderBottomSection(true, false)}
      </aside>

      {/* ── DESKTOP DOCKED SIDEBAR ── */}
      <aside
        id="sidebar"
        aria-label="Main navigation"
        className={`
          relative hidden lg:flex flex-col h-full shrink-0 rounded-2xl overflow-hidden
          border border-blue-200/80 shadow-xs
          bg-[#f0f8ff]
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[68px]' : 'w-[220px]'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-3 py-4 border-b border-blue-200/60
                         ${collapsed ? 'justify-center' : ''}`}>
          <div className="shrink-0 flex items-center justify-center w-9 h-9
                          rounded-xl bg-brand-500 text-white shadow-sm">
            <Activity className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-extrabold text-sm text-slate-900 leading-tight tracking-tight">
                MediCare AI
              </p>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                {roleLabel[currentUser.role]}
              </p>
            </div>
          )}
        </div>

        {renderNavList(false, collapsed)}
        {renderBottomSection(false, collapsed)}

        {/* Collapse toggle */}
        <button
          id="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-[72px] z-30
                     flex h-6 w-6 items-center justify-center rounded-full
                     bg-white border border-blue-200 text-slate-600 shadow-md
                     hover:bg-blue-50 transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft  className="w-3 h-3" />
          }
        </button>
      </aside>
    </>
  )
}

