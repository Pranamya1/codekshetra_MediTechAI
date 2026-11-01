/**
 * @file ConnectWearableModal.tsx
 * @description Modal allowing patients to connect physical Bluetooth wearables
 * (Wear OS Android watches, BLE heart rate straps, pulse oximeters) or run live streaming simulation.
 */

import { useState, useEffect, useRef } from 'react'
import {
  X, Bluetooth, AlertTriangle, RefreshCw, Smartphone, Play, Square,
  Radio, Zap,
} from 'lucide-react'
import {
  WebBluetoothWearableManager,
  simulateWearableStream,
  type VitalsStreamResponse,
} from '../services/api'
import { useNotifications } from '../context/NotificationContext'

interface ConnectWearableModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  onVitalsUpdated?: () => void
}

export function ConnectWearableModal({
  isOpen,
  onClose,
  patientId,
  onVitalsUpdated,
}: ConnectWearableModalProps) {
  const { sendAlert } = useNotifications()
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'simulator'>('bluetooth')
  const [bleStatus, setBleStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [bleError, setBleError] = useState<string | null>(null)
  const [latestResponse, setLatestResponse] = useState<VitalsStreamResponse | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [packetCount, setPacketCount] = useState(0)

  const bleManagerRef = useRef<WebBluetoothWearableManager | null>(null)
  const stopSimRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    bleManagerRef.current = new WebBluetoothWearableManager(patientId)
    return () => {
      bleManagerRef.current?.disconnect()
      if (stopSimRef.current) stopSimRef.current()
    }
  }, [patientId])

  if (!isOpen) return null

  // Handle real Web Bluetooth pairing
  const handleConnectBluetooth = async () => {
    setBleStatus('connecting')
    setBleError(null)

    try {
      if (!bleManagerRef.current) {
        bleManagerRef.current = new WebBluetoothWearableManager(patientId)
      }

      await bleManagerRef.current.connectAndStream({
        onPacketStreamed: (res) => {
          setBleStatus('connected')
          setLatestResponse(res)
          setPacketCount((c) => c + 1)
          onVitalsUpdated?.()

          if (res.alert_triggered && res.alert) {
            void sendAlert({
              title: res.alert.title,
              message: res.alert.message,
              severity: res.alert.severity === 'critical' ? 'critical' : 'warning',
              category: 'vitals',
            })
          }
        },
        onDisconnect: (reason) => {
          setBleStatus('idle')
          setBleError(reason)
        },
        onError: (err) => {
          setBleStatus('error')
          setBleError(err.message || 'Bluetooth connection failed')
        },
      })
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        // NotFoundError means user dismissed picker
        setBleStatus('error')
        setBleError(err.message || 'Bluetooth pairing was cancelled or failed.')
      } else {
        setBleStatus('idle')
      }
    }
  }

  const handleDisconnectBluetooth = () => {
    bleManagerRef.current?.disconnect()
    setBleStatus('idle')
    setLatestResponse(null)
  }

  // Handle Simulated Wearable Stream
  const handleToggleSimulator = () => {
    if (isSimulating) {
      if (stopSimRef.current) stopSimRef.current()
      setIsSimulating(false)
    } else {
      setIsSimulating(true)
      const stop = simulateWearableStream(patientId, 4000, (res) => {
        setLatestResponse(res)
        setPacketCount((c) => c + 1)
        onVitalsUpdated?.()

        if (res.alert_triggered && res.alert) {
          void sendAlert({
            title: res.alert.title,
            message: res.alert.message,
            severity: res.alert.severity === 'critical' ? 'critical' : 'warning',
            category: 'vitals',
          })
        }
      })
      stopSimRef.current = stop
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Smart Wearable Sync</h3>
              <p className="text-[11px] text-slate-400">Stream biometric telemetry directly to AI engine</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (stopSimRef.current) stopSimRef.current()
              bleManagerRef.current?.disconnect()
              onClose()
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-100 bg-white px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'bluetooth'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Bluetooth className="w-4 h-4" /> Live Bluetooth (BLE)
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'simulator'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Zap className="w-4 h-4" /> Demo Stream Simulator
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'bluetooth' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Connection Status:</span>
                  {bleStatus === 'connected' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Streaming Live Telemetry
                    </span>
                  ) : bleStatus === 'connecting' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Pairing Device…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                      Disconnected
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Connect your smartwatch, fitness tracker, or BLE health monitor with <strong>zero downloads</strong>. Chrome communicates directly with your Bluetooth hardware.
                </p>

                {bleStatus === 'connected' ? (
                  <button
                    onClick={handleDisconnectBluetooth}
                    className="w-full btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200 text-xs py-2.5 font-bold"
                  >
                    Disconnect Wearable
                  </button>
                ) : (
                  <button
                    onClick={handleConnectBluetooth}
                    disabled={bleStatus === 'connecting'}
                    className="w-full btn-primary text-xs py-3 justify-center gap-2 shadow-md active:scale-98"
                  >
                    <Bluetooth className="w-4 h-4" /> Connect Bluetooth Device (Zero Downloads)
                  </button>
                )}
              </div>

              {bleError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{bleError}</span>
                </div>
              )}

              {/* Zero-Download Pairing Guide */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" /> How to connect with Zero Downloads:
                </p>
                <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal pl-4">
                  <li>
                    <strong>Turn on Bluetooth</strong> on your computer (and keep your watch/wearable nearby).
                  </li>
                  <li>
                    Tap <strong>"Connect Bluetooth Device (Zero Downloads)"</strong> above.
                  </li>
                  <li>
                    In the browser popup, select your device (Smartwatch, Smartband, or BLE Sensor) and click <strong>"Pair"</strong>.
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-center">
                <p className="text-xs font-bold text-slate-800 mb-1">Interactive Telemetry Stream Simulator</p>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                  Simulates a live Bluetooth smartband streaming continuous biometric readings to our FastAPI AI engine every 4 seconds.
                </p>

                <button
                  onClick={handleToggleSimulator}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                    isSimulating
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isSimulating ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" /> Stop Live Simulation
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Live Wearable Simulation
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Real-Time Live Feed Card */}
          {latestResponse && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Live AI Clinical Stream (Packet #{packetCount})
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    latestResponse.clinical_assessment.risk_level === 'CRITICAL'
                      ? 'bg-red-100 text-red-700'
                      : latestResponse.clinical_assessment.risk_level === 'WARNING'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  Triage: {latestResponse.clinical_assessment.risk_level}
                </span>
              </div>

              {/* Metrics preview */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block">HR</span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {latestResponse.vitals_recorded.heart_rate} <span className="text-[9px] font-normal">bpm</span>
                  </span>
                </div>
                <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block">BP</span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {latestResponse.vitals_recorded.systolic_bp}/{latestResponse.vitals_recorded.diastolic_bp}
                  </span>
                </div>
                <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block">SpO₂</span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {latestResponse.vitals_recorded.oxygen_saturation}%
                  </span>
                </div>
                <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block">Temp</span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {latestResponse.vitals_recorded.temperature}°C
                  </span>
                </div>
              </div>

              {/* AI Clinical Summary */}
              <div className="bg-white rounded-xl p-3 border border-slate-100 text-xs space-y-1">
                <span className="font-semibold text-slate-700 block text-[11px]">AI Assessment:</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {latestResponse.clinical_assessment.assessment_summary}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Engine: OpenAI gpt-4o-mini + Gemini</span>
          <button
            onClick={() => {
              if (stopSimRef.current) stopSimRef.current()
              bleManagerRef.current?.disconnect()
              onClose()
            }}
            className="btn-secondary text-xs px-4 py-1.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
