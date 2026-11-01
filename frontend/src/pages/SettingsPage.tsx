/**
 * @file SettingsPage.tsx
 * @description Comprehensive settings page for Patient, Caregiver, and Doctor roles.
 * Includes profile management, push notification preferences, medical units,
 * accessibility & theme options, clinical configs, and data export/reset.
 */

import { useState } from 'react'
import {
  User, Bell, Shield, Sun, Save, Volume2, VolumeX,
  Smartphone, Mail, Phone, Heart, Pill, Stethoscope,
  Trash2, Download, Check, AlertTriangle, CheckCircle2,
  Sliders, Lock, LogOut,
} from 'lucide-react'
import { UserRole, type IUser } from '../types/medical'
import { useNotifications } from '../context/NotificationContext'

interface SettingsPageProps {
  currentUser: IUser
  onLogout: () => void
  onUpdateUser?: (updated: Partial<IUser>) => void
}

interface UserPreferences {
  phone: string
  emergencyContactName: string
  emergencyContactPhone: string
  tempUnit: 'C' | 'F'
  glucoseUnit: 'mg/dL' | 'mmol/L'
  weightUnit: 'kg' | 'lbs'
  morningSlotTime: string
  afternoonSlotTime: string
  eveningSlotTime: string
  nightSlotTime: string
  pushMeds: boolean
  pushVitals: boolean
  pushAppointments: boolean
  pushEmergency: boolean
  highContrast: boolean
  doctorLicense: string
  specialization: string
}

const STORAGE_PREFS_KEY = 'medicare_user_settings_v1'

export function SettingsPage({ currentUser, onLogout, onUpdateUser }: SettingsPageProps) {
  const {
    permission,
    requestPermission,
    soundEnabled,
    setSoundEnabled,
    sendTestNotification,
    clearAll: clearAllAlerts,
  } = useNotifications()

  // Active settings tab
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'medical' | 'appearance' | 'privacy'>('profile')

  // Profile fields
  const [fullName, setFullName] = useState(currentUser.fullName)
  const [email] = useState(currentUser.email)

  // Loaded preferences
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    const defaults: UserPreferences = {
      phone: '+91 98765 43210',
      emergencyContactName: 'Dr. Anita Desai',
      emergencyContactPhone: '+91 98765 12345',
      tempUnit: 'C',
      glucoseUnit: 'mg/dL',
      weightUnit: 'kg',
      morningSlotTime: '08:00',
      afternoonSlotTime: '13:00',
      eveningSlotTime: '19:00',
      nightSlotTime: '22:00',
      pushMeds: true,
      pushVitals: true,
      pushAppointments: true,
      pushEmergency: true,
      highContrast: false,
      doctorLicense: 'MCI-2018-84729',
      specialization: 'Internal Medicine / Endocrinology',
    }

    try {
      const stored = localStorage.getItem(STORAGE_PREFS_KEY)
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn('Could not load preferences from localStorage:', e)
    }
    return defaults
  })

  const [savedToast, setSavedToast] = useState(false)

  // Persist preferences
  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: value }
      try {
        localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(updated))
      } catch (e) {
        console.warn(e)
      }
      return updated
    })
  }

  // Save all changes
  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs))
      if (onUpdateUser && fullName.trim() !== currentUser.fullName) {
        onUpdateUser({ fullName: fullName.trim() })
      }
    } catch (err) {
      console.error(err)
    }
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 3000)
  }

  // Clear demo cache & patient storage
  const handleClearData = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all locally cached patients, tasks, and notifications? This will reset the app to fresh empty state.'
      )
    ) {
      clearAllAlerts()
      localStorage.removeItem('medicare_caregiver_patients')
      localStorage.removeItem('medicare_caregiver_tasks_v1')
      localStorage.removeItem('medicare_alerts_v1')
      localStorage.removeItem('medicare_onboarding_done')
      window.location.reload()
    }
  }

  // Export JSON health profile
  const handleExportData = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: currentUser.id,
        fullName,
        email,
        role: currentUser.role,
      },
      preferences: prefs,
      notificationsStatus: permission,
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medicare-health-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const roleBadge = () => {
    switch (currentUser.role) {
      case UserRole.Doctor:
        return <span className="badge-info text-xs">Physician / Doctor</span>
      case UserRole.Caregiver:
        return <span className="badge-warning text-xs">Caregiver / Family</span>
      case UserRole.Patient:
      default:
        return <span className="badge-normal text-xs">Patient</span>
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-white p-3 sm:p-5 space-y-4 animate-fade-in pb-16 md:pb-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-600" />
            System Settings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your account, medical preferences, push alerts, and privacy
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {savedToast && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl animate-fade-in">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            onClick={() => handleSaveAll()}
            className="btn-primary text-xs py-2 px-4 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </div>

      {/* ── Main Layout (Sidebar tabs + Settings Content) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Navigation Tabs */}
        <div className="lg:col-span-1 flex lg:flex-col gap-1 overflow-x-auto scrollbar-none pb-1 lg:pb-0 shrink-0">
          {[
            { id: 'profile', label: 'User Profile', icon: <User className="w-4 h-4" /> },
            { id: 'notifications', label: 'Push Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'medical', label: 'Clinical & Schedules', icon: <Heart className="w-4 h-4" /> },
            { id: 'appearance', label: 'Appearance & A11y', icon: <Sun className="w-4 h-4" /> },
            { id: 'privacy', label: 'Data & Privacy', icon: <Shield className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left whitespace-nowrap lg:whitespace-normal ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs font-bold'
                    : 'bg-slate-50 lg:bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="lg:col-span-3 space-y-4">
          {/* ── TAB 1: Profile ── */}
          {activeTab === 'profile' && (
            <div className="dash-section space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-500" /> Account Profile
                </h3>
                {roleBadge()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-input text-xs"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Email Address <span className="text-[10px] text-slate-400 font-normal">(Account ID)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="form-input text-xs bg-slate-50 text-slate-500 cursor-not-allowed pl-8"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={prefs.phone}
                      onChange={(e) => updatePref('phone', e.target.value)}
                      className="form-input text-xs pl-8"
                      placeholder="+91..."
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Role / Persona</label>
                  <input
                    type="text"
                    value={currentUser.role.toUpperCase()}
                    disabled
                    className="form-input text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-500" /> Designated Emergency Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={prefs.emergencyContactName}
                      onChange={(e) => updatePref('emergencyContactName', e.target.value)}
                      className="form-input text-xs"
                      placeholder="Doctor or relative name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={prefs.emergencyContactPhone}
                      onChange={(e) => updatePref('emergencyContactPhone', e.target.value)}
                      className="form-input text-xs"
                      placeholder="+91..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Push Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="dash-section space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-500" /> Push Notifications & Sound Alerts
                </h3>
                {permission === 'granted' ? (
                  <span className="badge-normal text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                  </span>
                ) : (
                  <span className="badge-warning text-xs">Permission Needed</span>
                )}
              </div>

              {/* Browser Permission Card */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-xs shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Browser Device Web Push</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {permission === 'granted'
                        ? 'Authorized for desktop and background push alerts'
                        : 'Allow notifications to receive immediate critical medication alerts'}
                    </p>
                  </div>
                </div>

                {permission !== 'granted' ? (
                  <button
                    onClick={async () => {
                      await requestPermission()
                    }}
                    className="btn-primary text-xs py-1.5 px-3 shrink-0"
                  >
                    Enable Push
                  </button>
                ) : (
                  <button
                    onClick={() => sendTestNotification('info')}
                    className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                  >
                    Send Test Alert
                  </button>
                )}
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-brand-500" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">Synthesized Audio Chimes</p>
                      <p className="text-[11px] text-slate-400">Play tone when alerts arrive</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Pill className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Critical Medication Overdue Push</p>
                      <p className="text-[11px] text-slate-400">Alert immediately when critical doses are missed</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.pushMeds}
                    onChange={(e) => updatePref('pushMeds', e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Vital Anomaly Warnings</p>
                      <p className="text-[11px] text-slate-400">Notify when BP or HR exceeds threshold</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.pushVitals}
                    onChange={(e) => updatePref('pushVitals', e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Emergency AI Triage Alerts</p>
                      <p className="text-[11px] text-slate-400">Lock-screen alert for high-urgency symptoms</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.pushEmergency}
                    onChange={(e) => updatePref('pushEmergency', e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: Medical Units & Schedules ── */}
          {activeTab === 'medical' && (
            <div className="dash-section space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-brand-500" /> Medical Units & Schedule Timings
                </h3>
              </div>

              {/* Preferred Units */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2.5">Measurement Units</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Temperature Unit</label>
                    <select
                      value={prefs.tempUnit}
                      onChange={(e) => updatePref('tempUnit', e.target.value as any)}
                      className="form-input text-xs"
                    >
                      <option value="C">Celsius (°C)</option>
                      <option value="F">Fahrenheit (°F)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Blood Glucose</label>
                    <select
                      value={prefs.glucoseUnit}
                      onChange={(e) => updatePref('glucoseUnit', e.target.value as any)}
                      className="form-input text-xs"
                    >
                      <option value="mg/dL">mg/dL (Standard)</option>
                      <option value="mmol/L">mmol/L (International)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Body Weight</label>
                    <select
                      value={prefs.weightUnit}
                      onChange={(e) => updatePref('weightUnit', e.target.value as any)}
                      className="form-input text-xs"
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="lbs">Pounds (lbs)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Medication Slot Reminder Times */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-2.5">
                  Daily Medication Slot Reminder Times
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">🌅 Morning</label>
                    <input
                      type="time"
                      value={prefs.morningSlotTime}
                      onChange={(e) => updatePref('morningSlotTime', e.target.value)}
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">☀️ Afternoon</label>
                    <input
                      type="time"
                      value={prefs.afternoonSlotTime}
                      onChange={(e) => updatePref('afternoonSlotTime', e.target.value)}
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">🌆 Evening</label>
                    <input
                      type="time"
                      value={prefs.eveningSlotTime}
                      onChange={(e) => updatePref('eveningSlotTime', e.target.value)}
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">🌙 Night</label>
                    <input
                      type="time"
                      value={prefs.nightSlotTime}
                      onChange={(e) => updatePref('nightSlotTime', e.target.value)}
                      className="form-input text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Doctor Specific Config */}
              {currentUser.role === UserRole.Doctor && (
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-brand-600" /> Clinical Practice Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">License / Reg Number</label>
                      <input
                        type="text"
                        value={prefs.doctorLicense}
                        onChange={(e) => updatePref('doctorLicense', e.target.value)}
                        className="form-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Primary Specialty</label>
                      <input
                        type="text"
                        value={prefs.specialization}
                        onChange={(e) => updatePref('specialization', e.target.value)}
                        className="form-input text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: Appearance ── */}
          {activeTab === 'appearance' && (
            <div className="dash-section space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4 text-brand-500" /> Interface & Theme Specifications
                </h3>
                <span className="badge-normal text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Clinical Standard
                </span>
              </div>

              {/* Active Theme Card */}
              <div className="p-4 rounded-2xl border border-brand-200 bg-blue-50/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <Sun className="w-4 h-4 text-amber-500" /> Clean Medical Light Theme
                  </div>
                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                    Active System Theme
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Standardized clean theme designed for maximum legibility in daylight and hospital clinic environments.
                </p>

                {/* Color Scheme Palette Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-blue-100 shadow-2xs">
                    <span className="w-8 h-8 rounded-xl bg-[#f0f8ff] border border-blue-200 shadow-xs shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Navigation Bar</p>
                      <p className="text-[10px] text-slate-400">Alice Blue (#f0f8ff)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Main Content Canvas</p>
                      <p className="text-[10px] text-slate-400">Pure White (#ffffff)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accessibility & Visual Comfort */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-brand-600" /> WCAG 2.1 Accessibility Compliance
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  The clinical interface enforces strict AAA color contrast ratios across typography, buttons, and alert badges to ensure clear readability for elderly patients and individuals with visual impairments.
                </p>
              </div>
            </div>
          )}

          {/* ── TAB 5: Privacy & Data ── */}
          {activeTab === 'privacy' && (
            <div className="dash-section space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-500" /> Data Governance & Security
                </h3>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Client-Side Encryption & Supabase RLS</p>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">
                      All clinical records and medication logs are protected via Row Level Security (RLS). Only authenticated accounts with verified patient-doctor roles can query health logs.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleExportData}
                    className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2.5 px-4"
                  >
                    <Download className="w-4 h-4" /> Export Personal Health Archive (JSON)
                  </button>

                  <button
                    onClick={handleClearData}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-semibold text-xs hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Clear Local Cache & Reset
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Session Management</p>
                    <p className="text-[11px] text-slate-400">Sign out of this browser session</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-xs font-bold text-slate-600 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Log Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
