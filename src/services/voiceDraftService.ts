import { supabasePublishableKey, supabaseUrl } from './supabase'
import { requireVerifiedLineToken } from './liffService'
import { normalizeExtraction, type VoiceExtraction } from '../../supabase/functions/_shared/voiceContract'

export class VoiceServiceError extends Error {
  constructor(message: string, readonly code = '', readonly transcript = '') { super(message) }
}

async function voiceRequest(payload: FormData | Record<string, string>, signal: AbortSignal, timeout = 85000) {
  const idToken = await requireVerifiedLineToken(false)
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()
  const timer = setTimeout(abort, timeout)
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/voice-draft`, {
      method: 'POST', signal: controller.signal, body: payload instanceof FormData ? payload : JSON.stringify(payload),
      headers: { Authorization: `Bearer ${idToken}`, apikey: supabasePublishableKey, ...(payload instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
    })
    let body
    try { body = await response.json() } catch { throw new Error('語音服務未能回應，請稍後重試。') }
    if (!response.ok || !body.ok) throw new VoiceServiceError(body.error?.message || '語音整理暫時失敗，請重試。', body.error?.code, typeof body.transcript === 'string' ? body.transcript : '')
    return body.data
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort) }
}

function extractionResult(data: { transcript: string; extraction: VoiceExtraction }) {
  if (typeof data?.transcript !== 'string') throw new Error('語音整理格式不正確，請重試。')
  return { transcript: data.transcript, extraction: normalizeExtraction(data.extraction, data.transcript) }
}

export async function processActivityAudio(audio: Blob, signal: AbortSignal) {
  const form = new FormData()
  form.set('audio', audio, audio.type.includes('mp4') ? 'activity.mp4' : 'activity.webm')
  return extractionResult(await voiceRequest(form, signal))
}

export async function processActivityTranscript(transcript: string, signal: AbortSignal) {
  return extractionResult(await voiceRequest({ action: 'extract', transcript }, signal, 40000))
}

export function createVoiceSocket() {
  const url = new URL(`${supabaseUrl}/functions/v1/voice-draft`)
  url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
  // LINE credentials are sent in the first encrypted message, never in URL query parameters.
  return new WebSocket(url)
}
