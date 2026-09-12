import { computed, onScopeDispose, shallowRef } from 'vue'
import { createVoiceSocket } from '@/services/voiceDraftService'
import { requireVerifiedLineToken } from '@/services/liffService'
import { appendVoiceTranscript } from '@/services/voiceTranscript'
import { captureVoicePcm } from '@/services/voicePcm'

export function useLiveActivityVoice(onFinished: (text: string) => void) {
  const state = shallowRef<'idle' | 'requesting' | 'connecting' | 'recording' | 'stopping' | 'stopped' | 'error'>('idle')
  const transcript = shallowRef(''), error = shallowRef(''), errorCode = shallowRef(''), elapsed = shallowRef(0), level = shallowRef(0), unavailable = shallowRef(false)
  const liveStatus = computed(() => state.value === 'recording' ? 'listening' : state.value === 'connecting' ? 'connecting' : state.value === 'stopping' ? 'finishing' : 'idle')
  let stream: MediaStream | null = null, socket: WebSocket | null = null, capture: Awaited<ReturnType<typeof captureVoicePcm>> | null = null
  let controller: AbortController | null = null, generation = 0, startedAt = 0, expectedSequence = 0
  let tick: ReturnType<typeof setInterval> | undefined, stopTimer: ReturnType<typeof setTimeout> | undefined, connectTimer: ReturnType<typeof setTimeout> | undefined
  function supported() { return typeof WebSocket !== 'undefined' && typeof AudioContext !== 'undefined' && typeof AudioWorkletNode !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext !== false }
  function release() {
    controller?.abort(); controller = null
    clearInterval(tick); clearTimeout(stopTimer); clearTimeout(connectTimer)
    capture?.close(); capture = null
    stream?.getTracks().forEach((track) => track.stop()); stream = null
    if (socket) { socket.onopen = null; socket.onmessage = null; socket.onclose = null; socket.onerror = null; socket.close(); socket = null }
    level.value = 0
  }
  function cancel() { generation++; release(); state.value = 'idle'; elapsed.value = 0; transcript.value = ''; expectedSequence = 0; error.value = ''; errorCode.value = '' }
  function fail(message: string, code = '') { generation++; release(); error.value = message; errorCode.value = code; state.value = 'error' }
  function finish() {
    const text = transcript.value.trim()
    generation++; release(); state.value = 'stopped'
    if (text.length < 2) { error.value = '沒有辨識到完整說明，請確認麥克風後重試，或改用文字輸入。'; return }
    onFinished(text)
  }
  async function stop() {
    if (state.value !== 'recording') return
    state.value = 'stopping'; clearInterval(tick)
    const run = generation
    stopTimer = setTimeout(() => { if (run === generation) fail('最後一句尚未辨識完成，已保留目前文字。請檢查後再整理草稿。') }, 40000)
    await capture?.finish()
    if (run !== generation) return
    capture = null; stream?.getTracks().forEach((track) => track.stop()); stream = null
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'finish' }))
    else fail('語音連線中斷，已保留文字，請檢查後再整理。')
  }
  async function start() {
    cancel(); unavailable.value = false
    if (!supported()) { unavailable.value = true; state.value = 'error'; error.value = '此瀏覽器無法逐句語音辨識，可改用文字輸入。'; return }
    const run = generation
    controller = new AbortController()
    state.value = 'requesting'
    try {
      const incoming = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      if (run !== generation) { incoming.getTracks().forEach((track) => track.stop()); return }
      stream = incoming; incoming.getTracks().forEach((track) => { track.enabled = false })
      const token = await requireVerifiedLineToken(false)
      if (run !== generation) return
      state.value = 'connecting'
      const ws = createVoiceSocket(); socket = ws
      connectTimer = setTimeout(() => { if (run === generation) fail('語音連線逾時，請稍後再試或改用文字輸入。') }, 25000)
      ws.onopen = () => { if (run === generation) ws.send(JSON.stringify({ type: 'authenticate', token })) }
      ws.onmessage = async ({ data }) => {
        if (run !== generation || typeof data !== 'string') return
        try {
          const event = JSON.parse(data)
          if (event.type === 'error') { fail(event.message || '語音服務暫時失敗，文字已保留。', event.code); return }
          if (event.type === 'ready' && state.value === 'connecting') {
            const audio = await captureVoicePcm(incoming, {
              signal: controller!.signal,
              onSegment(wave) {
                if (run !== generation || !['recording','stopping'].includes(state.value)) return
                if (ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > 512000) { fail('網路傳輸較慢，已保留文字，請稍後重試。'); return }
                ws.send(wave)
              },
              onLevel(value) { if (run === generation && state.value === 'recording') level.value = value },
            })
            if (run !== generation) { audio.close(); return }
            capture = audio; clearTimeout(connectTimer)
            incoming.getTracks().forEach((track) => { track.enabled = true })
            state.value = 'recording'; startedAt = performance.now()
            tick = setInterval(() => { elapsed.value = Math.min(90, Math.floor((performance.now() - startedAt) / 1000)); if (elapsed.value >= 90) void stop() }, 200)
          } else if (event.type === 'transcript') {
            if (!Number.isInteger(event.seq) || event.seq !== expectedSequence || typeof event.text !== 'string' || event.text.length > 5000) throw new Error('Invalid transcript sequence')
            expectedSequence++; transcript.value = appendVoiceTranscript(transcript.value, event.text)
          } else if (event.type === 'done' && state.value === 'stopping') finish()
        } catch {
          if (run === generation) fail('語音連線未能完成，已保留文字。請確認瀏覽器麥克風權限後重試。')
        }
      }
      ws.onclose = () => { if (run === generation) fail('語音連線已中斷，已辨識文字會保留，請檢查後再整理。') }
      ws.onerror = () => { if (run === generation) fail('無法連接語音服務，請確認網路後重試，或改用文字輸入。') }
    } catch (err) {
      if (run !== generation) return
      unavailable.value = err instanceof DOMException && ['NotAllowedError', 'NotFoundError', 'NotReadableError'].includes(err.name)
      fail(unavailable.value ? '麥克風無法使用或權限未開啟，可調整權限後重試，或改用文字輸入。' : err instanceof Error && err.name !== 'AbortError' ? err.message : '語音連線未完成，請稍後重試。')
    }
  }
  const onHidden = () => {
    if (document.hidden && ['requesting','connecting','recording','stopping'].includes(state.value)) fail('離開畫面後已關閉麥克風，已辨識文字會保留。')
  }
  document.addEventListener('visibilitychange', onHidden)
  window.addEventListener('pagehide', cancel)
  onScopeDispose(() => { cancel(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', cancel) })
  return { state, transcript, error, errorCode, elapsed, level, liveStatus, unavailable, supported, start, stop, cancel }
}
