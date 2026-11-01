/**
 * Web Audio API synthesizer for notification chimes.
 * Plays crisp, pleasant, zero-asset audio alerts.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch (err) {
    console.warn('AudioContext not available:', err)
    return null
  }
}

export function playNotificationChime(severity: 'info' | 'warning' | 'critical' = 'info') {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime

    if (severity === 'critical') {
      // Urgent attention pulse: 880Hz -> 659Hz -> 880Hz
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'triangle'
      osc2.type = 'sine'

      osc1.frequency.setValueAtTime(880, now)
      osc1.frequency.setValueAtTime(659, now + 0.12)
      osc1.frequency.setValueAtTime(880, now + 0.24)

      osc2.frequency.setValueAtTime(440, now)
      osc2.frequency.setValueAtTime(330, now + 0.12)
      osc2.frequency.setValueAtTime(440, now + 0.24)

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.45)
      osc2.stop(now + 0.45)
    } else if (severity === 'warning') {
      // Warm warning tone: 587Hz (D5) -> 740Hz (F#5)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now)
      osc.frequency.setValueAtTime(739.99, now + 0.1)

      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.35)
    } else {
      // Gentle ascending 2-tone melodic chime: C5 (523.25) -> G5 (783.99)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.setValueAtTime(783.99, now + 0.08)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.3)
    }
  } catch (err) {
    console.warn('Failed to play audio alert chime:', err)
  }
}
