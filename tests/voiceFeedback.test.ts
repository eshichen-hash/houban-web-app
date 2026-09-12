import { afterEach, describe, expect, it, vi } from 'vitest'
import { triggerVoiceFeedback } from '@/services/voiceFeedback'

const originalVibrate = Object.getOwnPropertyDescriptor(navigator, 'vibrate')
const originalAudioContext = Object.getOwnPropertyDescriptor(window, 'AudioContext')

function setVibrate(value: ((pattern: number | number[]) => boolean) | undefined) {
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value })
}

function setAudioContext(value: unknown) {
  Object.defineProperty(window, 'AudioContext', { configurable: true, value })
}

function restore(object: object, key: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(object, key, descriptor)
  else delete (object as Record<string, unknown>)[key]
}

afterEach(() => {
  restore(navigator, 'vibrate', originalVibrate)
  restore(window, 'AudioContext', originalAudioContext)
})

describe('語音操作的多感官回饋', () => {
  it('裝置支援震動時優先使用觸覺，不播放聲音', async () => {
    const vibrate = vi.fn().mockReturnValue(true)
    const audioContext = vi.fn()
    setVibrate(vibrate)
    setAudioContext(audioContext)

    await expect(triggerVoiceFeedback('stop')).resolves.toBe('haptic')
    expect(vibrate).toHaveBeenCalledWith([10, 32, 10])
    expect(audioContext).not.toHaveBeenCalled()
  })

  it('震動不支援時才播放短提示音', async () => {
    let ended: (() => void) | undefined
    const close = vi.fn().mockResolvedValue(undefined)
    const oscillator = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      addEventListener: vi.fn((_event: string, callback: () => void) => { ended = callback }),
      start: vi.fn(),
      stop: vi.fn(() => ended?.()),
    }
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
    const AudioContextMock = vi.fn(function AudioContextMock(this: Record<string, unknown>) {
      Object.assign(this, {
        state: 'running', currentTime: 0, destination: {}, close,
        createOscillator: () => oscillator, createGain: () => gain,
      })
    })
    setVibrate(vi.fn().mockReturnValue(false))
    setAudioContext(AudioContextMock)

    await expect(triggerVoiceFeedback('start')).resolves.toBe('sound')
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(620, 0)
    expect(oscillator.start).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
  })

  it('震動和音效都不可用時無例外，交由畫面狀態回饋', async () => {
    setVibrate(undefined)
    setAudioContext(undefined)
    await expect(triggerVoiceFeedback('cancel')).resolves.toBe('visual')
  })
})
