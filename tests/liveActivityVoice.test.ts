import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useLiveActivityVoice } from '@/composables/useLiveActivityVoice'
import { appendVoiceTranscript } from '@/services/voiceTranscript'
import { createVoiceSegmenter } from '@/services/voicePcm'
import { requireVerifiedLineToken } from '@/services/liffService'
import { encodeVoiceWave, validateVoiceWave } from '../supabase/functions/_shared/voiceAudio'

const { createSocket, capturePcm } = vi.hoisted(() => ({ createSocket: vi.fn(), capturePcm: vi.fn() }))
vi.mock('@/services/voiceDraftService', () => ({ createVoiceSocket: createSocket }))
vi.mock('@/services/liffService', () => ({ requireVerifiedLineToken: vi.fn().mockResolvedValue('test-token') }))
vi.mock('@/services/voicePcm', async (original) => ({ ...await original<typeof import('@/services/voicePcm')>(), captureVoicePcm: capturePcm }))
class FakeSocket {
  static OPEN = 1
  readyState = 1
  bufferedAmount = 0
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((e: { data: string }) => Promise<void>) | null = null
  close = vi.fn()
  send = vi.fn()
  async emit(event: Record<string, unknown>) { await this.onmessage?.({ data: JSON.stringify(event) }) }
}
const track = { stop: vi.fn(), enabled: true }, getUserMedia = vi.fn()
let scope: ReturnType<typeof effectScope>, socket: FakeSocket
const audio = { finish: vi.fn().mockResolvedValue(undefined), close: vi.fn() }
beforeEach(() => {
  vi.useFakeTimers(); track.stop.mockClear(); track.enabled = true
  vi.mocked(requireVerifiedLineToken).mockResolvedValue('test-token')
  vi.stubGlobal('WebSocket', FakeSocket); vi.stubGlobal('AudioContext', class {}); vi.stubGlobal('AudioWorkletNode', class {}); vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [track], getAudioTracks: () => [track] })
  socket = new FakeSocket(); createSocket.mockReset().mockReturnValue(socket)
  capturePcm.mockReset().mockResolvedValue(audio); audio.finish.mockClear(); audio.close.mockClear()
  scope = effectScope()
})
afterEach(() => { scope.stop(); vi.useRealTimers(); vi.unstubAllGlobals() })
async function start(finished = vi.fn()) {
  const voice = scope.run(() => useLiveActivityVoice(finished))!
  await voice.start(); socket.onopen?.()
  expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'authenticate', token: 'test-token' }))
  await socket.emit({ type: 'ready' })
  return voice
}
describe('OpenRouter 逐句辨識的生命週期（傳輸邊界替身）', () => {
  it('錄音中顯示文字，完成最後一段才整理且關閉麥克風', async () => {
    const finished = vi.fn(), voice = await start(finished)
    await socket.emit({ type: 'transcript', seq: 0, text: '大安森林公園，' })
    expect(voice.transcript.value).toBe('大安森林公園，')
    expect(voice.state.value).toBe('recording')
    await voice.stop()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(audio.finish).toHaveBeenCalledOnce()
    expect(finished).not.toHaveBeenCalled()
    await socket.emit({ type: 'transcript', seq: 1, text: '明天下午健走。' })
    await socket.emit({ type: 'done' })
    expect(finished).toHaveBeenCalledExactlyOnceWith('大安森林公園，明天下午健走。')
  })
  it('取消後晚到的音訊初始化不會重新打開麥克風', async () => {
    let resolve!: (value: typeof audio) => void
    capturePcm.mockImplementation(() => new Promise((done) => { resolve = done }))
    const voice = scope.run(() => useLiveActivityVoice(vi.fn()))!
    await voice.start()
    const ready = socket.emit({ type: 'ready' })
    voice.cancel(); resolve(audio); await ready
    expect(voice.state.value).toBe('idle')
    expect(track.stop).toHaveBeenCalledOnce()
    expect(audio.close).toHaveBeenCalledOnce()
  })
  it('OpenRouter 無額度時停止麥克風並保留已辨識文字', async () => {
    const voice = await start()
    await socket.emit({ type: 'transcript', seq: 0, text: '明天健走' })
    await socket.emit({ type: 'error', code: 'VOICE_BILLING_REQUIRED', message: 'OpenRouter 額度不足' })
    expect(voice.state.value).toBe('error')
    expect(voice.errorCode.value).toBe('VOICE_BILLING_REQUIRED')
    expect(voice.transcript.value).toBe('明天健走')
    expect(track.stop).toHaveBeenCalledOnce()
  })
  it('90 秒停止收音；最後一段逾時不假裝已完成草稿', async () => {
    const finished = vi.fn(), voice = await start(finished)
    await socket.emit({ type: 'transcript', seq: 0, text: '明天健走' })
    await vi.advanceTimersByTimeAsync(90000)
    expect(voice.state.value).toBe('stopping')
    await vi.advanceTimersByTimeAsync(40000)
    expect(voice.state.value).toBe('error')
    expect(voice.transcript.value).toBe('明天健走')
    expect(finished).not.toHaveBeenCalled()
  })
  it('連線中斷保留文字，離開元件會清理音訊與連線', async () => {
    const voice = await start()
    await socket.emit({ type: 'transcript', seq: 0, text: '下午三點' })
    socket.onclose?.()
    expect(voice.state.value).toBe('error')
    expect(voice.transcript.value).toBe('下午三點')
    expect(audio.close).toHaveBeenCalledOnce()
  })
})
it('短重疊只移除段落邊界重複，不產生示範文字', () => {
  expect(appendVoiceTranscript('明天在大安森林', '大安森林公園健走')).toBe('明天在大安森林公園健走')
  expect(appendVoiceTranscript('', '')).toBe('')
})
it('真實樣本轉成完整 WAV，每段維持 16kHz，不將 MP4 片段直接送出', () => {
  const chunks: ArrayBuffer[] = [], segmenter = createVoiceSegmenter(48000, wave => chunks.push(wave))
  for (let i = 0; i < 40; i++) segmenter.push(new Float32Array(4800).fill(0.1))
  expect(chunks).toHaveLength(1)
  expect(validateVoiceWave(chunks[0]!)).toEqual({ samples: 64000, silent: false })
  expect(new DataView(chunks[0]!).getUint32(24,true)).toBe(16000)
})
it('安靜時不假造辨識請求，最後短句也會送出，異常 WAV 被擋下', () => {
  const chunks: ArrayBuffer[] = [], segmenter = createVoiceSegmenter(16000, wave => chunks.push(wave))
  for (let i = 0; i < 8; i++) segmenter.push(new Float32Array(8000))
  expect(chunks).toHaveLength(0)
  segmenter.push(new Float32Array(8000).fill(0.1)); segmenter.flush()
  expect(chunks).toHaveLength(1)
  const invalid = encodeVoiceWave(new Float32Array(3200)); new DataView(invalid).setUint32(24, 48000, true)
  expect(() => validateVoiceWave(invalid)).toThrow('Invalid audio frame format')
})
