import { createClient } from 'npm:@supabase/supabase-js@2.115.0'
import { ApiError, verifyLineIdentity } from './lineIdentity.ts'
import { imageOwnerFolder } from './eventRules.ts'
import { openRouterKey, transcribeAudio } from './voiceProvider.ts'
import { validateVoiceWave, VOICE_SAMPLE_RATE } from './voiceAudio.ts'

export interface VoiceSessionDependencies {
  authorize: (token: string) => Promise<void>
  refund: () => Promise<void>
  transcribe: (wave: ArrayBuffer, signal: AbortSignal) => Promise<string>
}

/** Audio and transcript live only in this bounded socket, never in a table or log. */
export function startVoiceSession(socket: WebSocket, deps: VoiceSessionDependencies) {
  let state: 'awaiting-auth' | 'authorizing' | 'ready' | 'ending' | 'closed' = 'awaiting-auth'
  let processing = false, accepted = 0, completed = 0, totalSamples = 0, successfulCalls = 0
  const queue: Array<{ wave: ArrayBuffer; seq: number; silent: boolean }> = []
  const abort = new AbortController()
  let resolveClosed!: () => void
  const closed = new Promise<void>((resolve) => { resolveClosed = resolve })
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(closed)
  const send = (data: unknown) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)) }
  async function cleanup() {
    if (state === 'closed') return
    state = 'closed'; clearTimeout(authTimer); clearTimeout(deadline); queue.length = 0; abort.abort()
    if (!successfulCalls) {
      try { await deps.refund() } catch { console.error(JSON.stringify({ service: 'voice', stage: 'quota_refund', code: 'refund_failed' })) }
    }
    resolveClosed()
  }
  function fail(error: unknown) {
    if (state === 'closed') return
    const problem = error instanceof ApiError ? error : new ApiError(503, 'VOICE_UNAVAILABLE', '語音連線暫時失敗，已辨識文字會保留，請檢查後再整理。')
    console.error(JSON.stringify({ service: 'voice', stage: 'live', code: problem.code, status: problem.status }))
    send({ type: 'error', code: problem.code, message: problem.message })
    socket.close(1000, 'Voice session ended'); void cleanup()
  }
  const authTimer = setTimeout(() => fail(new ApiError(401,'LINE_LOGIN_REQUIRED','請先登入 LINE 後開始錄音。')), 12000)
  // Below the Free plan's 150-second worker lifetime. Includes auth, 90s capture and final result.
  const deadline = setTimeout(() => fail(new ApiError(408,'VOICE_TIMEOUT','語音連線已到時限，已保留文字，請檢查後再整理。')), 135000)
  function finish() {
    if (state !== 'ending' || processing || queue.length) return
    send({ type: 'done', segments: completed }); socket.close(1000, 'Complete'); void cleanup()
  }
  async function drain() {
    if (processing || state === 'closed') return
    processing = true
    try {
      while (queue.length && !abort.signal.aborted) {
        const item = queue.shift()!
        const text = item.silent ? '' : await deps.transcribe(item.wave, abort.signal)
        if (abort.signal.aborted) return
        if (!item.silent) successfulCalls++
        if (text.length > 5000) throw new Error('Oversized transcription')
        completed++; send({ type: 'transcript', seq: item.seq, text })
      }
    } catch (error) { if (!abort.signal.aborted) fail(error) }
    finally { processing = false; finish() }
  }
  socket.binaryType = 'arraybuffer'
  socket.onmessage = async ({ data }) => {
    try {
      if (state === 'closed') return
      if (state === 'awaiting-auth') {
        if (typeof data !== 'string' || data.length > 11000) throw new ApiError(401,'LINE_LOGIN_REQUIRED','請先登入 LINE。')
        const message = JSON.parse(data)
        if (message.type !== 'authenticate' || typeof message.token !== 'string' || message.token.length > 10000) throw new ApiError(401,'LINE_LOGIN_REQUIRED','請先登入 LINE。')
        state = 'authorizing'
        await deps.authorize(message.token)
        if (abort.signal.aborted) { await deps.refund(); return }
        clearTimeout(authTimer); state = 'ready'; send({ type: 'ready', maxSeconds: 90 }); return
      }
      if (state !== 'ready') throw new ApiError(400,'VOICE_PROTOCOL_ERROR','語音連線尚未就緒，請重試。')
      if (typeof data === 'string') {
        if (data.length > 100 || JSON.parse(data).type !== 'finish') throw new Error('Invalid control message')
        state = 'ending'; finish(); return
      }
      if (!(data instanceof ArrayBuffer)) throw new Error('Invalid audio frame')
      const frame = validateVoiceWave(data)
      totalSamples += frame.samples
      if (++accepted > 45 || totalSamples > VOICE_SAMPLE_RATE * 100 || queue.length >= 3) throw new ApiError(429,'VOICE_BUFFER_LIMIT','辨識速度暫時跟不上，已保留文字。請稍後分段說明或直接修改文字。')
      queue.push({ wave: data, seq: accepted - 1, silent: frame.silent }); void drain()
    } catch (error) { fail(error) }
  }
  socket.onclose = () => { void cleanup() }
  socket.onerror = () => fail(new Error('Socket transport failed'))
  return closed
}

export function openVoiceSocket(request: Request) {
  const { socket, response } = Deno.upgradeWebSocket(request)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  let actor = '', quotaDay: string | null = null, key = ''
  startVoiceSession(socket, {
    async authorize(token) {
      // Authenticate in the first encrypted frame: no credentials in URL or browser-accessible key.
      const identity = await verifyLineIdentity(new Request(request.url, { headers: { Authorization: `Bearer ${token}` } }))
      key = openRouterKey(); actor = await imageOwnerFolder(identity.userId)
      const { data, error } = await admin.rpc('reserve_voice_quota', { p_actor_hash: actor, p_kind: 'voice_live' })
      if (error) throw new ApiError(503,'VOICE_UNAVAILABLE','語音服務暫時無法使用。')
      if (!data) throw new ApiError(429,'VOICE_DAILY_LIMIT','今天已達 10 次語音輸入上限，可改用文字完成草稿。')
      quotaDay = data as string
    },
    async refund() {
      if (!quotaDay) return
      const day = quotaDay; quotaDay = null
      const { error } = await admin.rpc('refund_creation_quota', { p_actor_hash: actor, p_kind: 'voice_live', p_day: day })
      if (error) throw error
    },
    transcribe: (wave, signal) => transcribeAudio(new Blob([wave], { type: 'audio/wav' }), key, signal),
  })
  return response
}

declare const EdgeRuntime: { waitUntil(task: Promise<unknown>): void }
