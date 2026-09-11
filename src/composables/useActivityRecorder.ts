import { computed, onScopeDispose, shallowRef } from 'vue'

export const MAX_RECORD_SECONDS = 90
const MAX_AUDIO_BYTES = 8 * 1024 * 1024
export function useActivityRecorder(onFinished: (audio: Blob) => void) {
  const state = shallowRef<'idle' | 'requesting' | 'recording' | 'stopped' | 'error'>('idle')
  const elapsed = shallowRef(0)
  const error = shallowRef('')
  const unavailable = shallowRef(false)
  const audio = shallowRef<Blob | null>(null)
  const canRetry = computed(() => !!audio.value)
  let stream: MediaStream | null = null, recorder: MediaRecorder | null = null
  let timer: ReturnType<typeof setInterval> | undefined, expiry: ReturnType<typeof setTimeout> | undefined
  let chunks: Blob[] = [], started = 0, generation = 0, bytes = 0
  function releaseTracks() { stream?.getTracks().forEach((track) => track.stop()); stream = null; clearInterval(timer) }
  function clearAudio() { clearTimeout(expiry); audio.value = null; chunks = []; bytes = 0 }
  function cancel() {
    generation++; if (recorder?.state === 'recording') recorder.stop()
    recorder = null; releaseTracks(); clearAudio(); state.value = 'idle'; elapsed.value = 0
  }
  function supported() {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext !== false
  }
  async function start() {
    cancel(); error.value = ''; unavailable.value = false
    if (!supported()) { unavailable.value = true; error.value = '這個瀏覽器無法使用麥克風，可改用文字完成草稿。'; state.value = 'error'; return }
    const run = generation
    state.value = 'requesting'
    try {
      const incoming = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (run !== generation) { incoming.getTracks().forEach((track) => track.stop()); return }
      stream = incoming
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((mime) => MediaRecorder.isTypeSupported(mime))
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined)
      recorder.ondataavailable = (event) => {
        if (run !== generation) return
        bytes += event.data.size
        if (bytes > MAX_AUDIO_BYTES) { cancel(); error.value = '錄音檔案太大，請縮短說明後重錄。'; state.value = 'error'; return }
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => { cancel(); error.value = '錄音中斷，請重新錄音。'; state.value = 'error' }
      recorder.onstop = () => {
        if (run !== generation) return
        const blob = new Blob(chunks, { type: recorder?.mimeType || mimeType || 'audio/webm' })
        releaseTracks(); recorder = null; chunks = []
        if (!blob.size) { error.value = '沒有收到錄音，請再試一次。'; state.value = 'error'; return }
        audio.value = blob; state.value = 'stopped'
        expiry = setTimeout(() => { clearAudio(); error.value = '錄音已超過 5 分鐘並清除，請重新錄音。' }, 5 * 60 * 1000)
        onFinished(blob)
      }
      started = performance.now(); state.value = 'recording'; recorder.start(500)
      timer = setInterval(() => {
        elapsed.value = Math.min(MAX_RECORD_SECONDS, Math.floor((performance.now() - started) / 1000))
        if (elapsed.value >= MAX_RECORD_SECONDS) stop()
      }, 200)
    } catch (err) {
      if (run !== generation) return
      releaseTracks(); state.value = 'error'; unavailable.value = true
      error.value = err instanceof DOMException && err.name === 'NotAllowedError' ? '麥克風權限未開啟，可調整權限後重試，或改用文字輸入。' : '目前無法使用麥克風，可重新嘗試或改用文字輸入。'
    }
  }
  function stop() { if (recorder?.state === 'recording') { recorder.stop(); releaseTracks() } }
  // A backgrounded or closed recording is discarded rather than recording the user unintentionally.
  const onHidden = () => { if (document.hidden && ['recording', 'requesting'].includes(state.value)) { cancel(); error.value = '錄音已暫停並清除，回到頁面後可重新錄音。' } }
  document.addEventListener('visibilitychange', onHidden)
  window.addEventListener('pagehide', cancel)
  onScopeDispose(() => { cancel(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', cancel) })
  return { state, elapsed, error, unavailable, audio, canRetry, supported, start, stop, cancel, clearAudio }
}
