import { supabasePublishableKey, supabaseUrl } from './supabase'
import { requireVerifiedLineToken } from './liffService'
import { normalizeExtraction, type VoiceExtraction } from '../../supabase/functions/_shared/voiceContract'

export async function processActivityAudio(audio: Blob, signal: AbortSignal): Promise<{ extraction: VoiceExtraction; transcript: string }> {
  const idToken = await requireVerifiedLineToken(false)
  const form = new FormData()
  form.set('audio', audio, audio.type.includes('mp4') ? 'activity.mp4' : 'activity.webm')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()
  const timer = setTimeout(abort, 85000)
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/voice-draft`, {
      method: 'POST', signal: controller.signal, body: form,
      headers: { Authorization: `Bearer ${idToken}`, apikey: supabasePublishableKey },
    })
    let body
    try { body = await response.json() } catch { throw new Error('語音服務未能回應，請稍後重試。') }
    if (!response.ok || !body.ok) throw new Error(body.error?.message || '語音整理暫時失敗，請重試。')
    if (typeof body.data?.transcript !== 'string') throw new Error('語音整理格式不正確，請重試。')
    return { transcript: body.data.transcript, extraction: normalizeExtraction(body.data.extraction, body.data.transcript) }
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort) }
}
