export type VoiceFeedbackKind = 'start' | 'stop' | 'cancel'

type WebkitAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

const vibrationPatterns: Record<VoiceFeedbackKind, number | number[]> = {
  start: 12,
  stop: [10, 32, 10],
  cancel: 8,
}

const toneSettings: Record<VoiceFeedbackKind, { frequency: number; duration: number }> = {
  start: { frequency: 620, duration: 0.05 },
  stop: { frequency: 440, duration: 0.065 },
  cancel: { frequency: 260, duration: 0.075 },
}

function tryHaptic(kind: VoiceFeedbackKind) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try { return navigator.vibrate(vibrationPatterns[kind]) }
  catch { return false }
}

async function playTone(kind: VoiceFeedbackKind) {
  if (typeof window === 'undefined') return false
  const AudioContextClass = window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext
  if (!AudioContextClass) return false
  let context: AudioContext | null = null
  try {
    context = new AudioContextClass()
    const resumePromise = context.state === 'suspended' ? context.resume().catch(() => {}) : Promise.resolve()
    const oscillator = context.createOscillator(), gain = context.createGain()
    const { frequency, duration } = toneSettings[kind], start = context.currentTime
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain); gain.connect(context.destination)
    oscillator.addEventListener('ended', () => { void context?.close().catch(() => {}) }, { once: true })
    oscillator.start(start); oscillator.stop(start + duration + 0.01)
    await resumePromise
    return true
  } catch {
    if (context) void context.close().catch(() => {})
    return false
  }
}

/** Haptics are preferred; a short tone is used only when vibration is unavailable. */
export async function triggerVoiceFeedback(kind: VoiceFeedbackKind): Promise<'haptic' | 'sound' | 'visual'> {
  if (tryHaptic(kind)) return 'haptic'
  return await playTone(kind) ? 'sound' : 'visual'
}
