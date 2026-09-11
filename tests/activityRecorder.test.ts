import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useActivityRecorder } from '@/composables/useActivityRecorder'
let recorder: FakeRecorder
class FakeRecorder {
  static isTypeSupported(mime: string) { return mime === 'audio/webm;codecs=opus' }
  state = 'inactive'; mimeType = 'audio/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor() { recorder = this }
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['test-audio'], { type: this.mimeType }) }); this.onstop?.() }) }
}
const stopTrack = vi.fn(), getUserMedia = vi.fn()
let scope: ReturnType<typeof effectScope>
beforeEach(() => {
  vi.useFakeTimers(); stopTrack.mockReset()
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] })
  scope = effectScope()
})
afterEach(() => { scope.stop(); vi.useRealTimers(); vi.unstubAllGlobals() })
describe('錄音生命週期', () => {
  it('90 秒自動停止、關閉麥克風，五分鐘後清除暫存', async () => {
    const finished = vi.fn(), r = scope.run(() => useActivityRecorder(finished))!
    await r.start(); expect(r.state.value).toBe('recording')
    await vi.advanceTimersByTimeAsync(90000)
    expect(stopTrack).toHaveBeenCalledOnce(); expect(finished).toHaveBeenCalledOnce()
    expect(r.canRetry.value).toBe(true)
    await vi.advanceTimersByTimeAsync(300000)
    expect(r.audio.value).toBeNull(); expect(r.error.value).toContain('清除')
  })
  it('權限被拒絕時才開啟文字替代', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'))
    const r = scope.run(() => useActivityRecorder(vi.fn()))!
    expect(r.unavailable.value).toBe(false)
    await r.start(); expect(r.unavailable.value).toBe(true); expect(r.error.value).toContain('權限')
  })
  it('取消等待授權後，較晚回來的麥克風串流仍關閉', async () => {
    let resolve!: (value: unknown) => void
    getUserMedia.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const finished = vi.fn(), r = scope.run(() => useActivityRecorder(finished))!
    const starting = r.start(); r.cancel()
    resolve({ getTracks: () => [{ stop: stopTrack }] }); await starting
    expect(stopTrack).toHaveBeenCalledOnce(); expect(finished).not.toHaveBeenCalled()
    expect(r.state.value).toBe('idle')
  })
  it('取消／離開頁面不處理晚到的錄音事件', async () => {
    const finished = vi.fn(), r = scope.run(() => useActivityRecorder(finished))!
    await r.start(); r.cancel(); await vi.advanceTimersByTimeAsync(1)
    expect(finished).not.toHaveBeenCalled(); expect(r.audio.value).toBeNull()
    await r.start(); scope.stop(); await vi.advanceTimersByTimeAsync(1)
    expect(stopTrack).toHaveBeenCalledTimes(2); expect(finished).not.toHaveBeenCalled()
  })
})
