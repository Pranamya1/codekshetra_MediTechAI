/**
 * @file MobileBottomNav.tsx
 * @description Thumb-friendly mobile navigation bar for smartphones (< md breakpoint).
 * Provides fast 1-tap switching between top destinations and opens the full drawer.
 */

import {
  LayoutDashboard, Heart, Pill, MessageSquare, Bell, Menu, Users,
} from 'lucide-react'
import { UserRole, type IUser } from '../types/medical'
import { useNotifications } from '../context/NotificationContext'

interface MobileBottomNavProps {
  currentUser:    IUser
  activeSection:  string
  onSectionChange:(section: string) => void
  onOpenDrawer:   () => void
}

interface BottomTab {
  id:    string
  label: string
  icon:  React.ReactNode
  badge?: number
}

export function MobileBottomNav({
  currentUser,
  activeSection,
  onSectionChange,
  onOpenDrawer,
}: MobileBottomNavProps) {
  const { unreadCount } = useNotifications()

  // Role-specific primary tabs (4 tabs + Menu button)
  const tabs: BottomTab[] = (() => {
    switch (currentUser.role) {
      case UserRole.Patient:
        return [
          { id: 'overview',     label: 'Home',       icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'vitals',       label: 'Vitals',     icon: <Heart           className="w-5 h-5" /> },
          { id: 'medications',  label: 'Meds',       icon: <Pill            className="w-5 h-5" /> },
          { id: 'ai-assistant', label: 'AI Health',  icon: <MessageSquare   className="w-5 h-5" /> },
        ]
      case UserRole.Caregiver:
        return [
          { id: 'overview',     label: 'Home',       icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'patients',     label: 'Patients',   icon: <Users           className="w-5 h-5" /> },
          { id: 'medications',  label: 'Meds',       icon: <Pill            className="w-5 h-5" /> },
          { id: 'ai-assistant', label: 'AI Health',  icon: <MessageSquare   className="w-5 h-5" /> },
        ]
      case UserRole.Doctor:
        return [
          { id: 'overview',     label: 'Clinical',   icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'patients',     label: 'Patients',   icon: <Users           className="w-5 h-5" /> },
          { id: 'alerts',       label: 'Alerts',     icon: <Bell            className="w-5 h-5" />, badge: unreadCount },
          { id: 'ai-assistant', label: 'AI Clinical',icon: <MessageSquare   className="w-5 h-5" /> },
        ]
    }
  })()

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile primary navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40
                 bg-[#f0f8ff]/95 backdrop-blur-md border-t border-blue-200/80
                 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]
                 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id
          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              onClick={() => onSectionChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative flex flex-col items-center justify-center
                flex-1 py-1 px-1 rounded-xl transition-all duration-150
                min-h-[46px] touch-manipulation
                ${isActive
                  ? 'text-brand-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
                }
              `}
            >
              <div className="relative">
                <span className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
                  {tab.icon}
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center
                                   rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[64px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-brand-600" />
              )}
            </button>
          )
        })}

        {/* 5th button: More drawer */}
        <button
          id="mobile-tab-menu"
          onClick={onOpenDrawer}
          aria-label="Open full menu"
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl
                     text-slate-500 hover:text-slate-800 transition-all duration-150
                     min-h-[46px] touch-manipulation"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium tracking-tight">More</span>
        </button>
      </div>
    </nav>
  )
}
