import { ApiError } from './lineIdentity.ts'
import OpenCC from 'npm:opencc-js@1.4.2'

const traditional = OpenCC.Converter({ from: 'cn', to: 'tw' })

export function openRouterKey() {
  // Compatibility only: this existing secret is read exclusively inside the Edge Function.
  const key = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('VITE_OPENROUTER_API_KEY')
  if (!key) throw new ApiError(503, 'VOICE_NOT_CONFIGURED', 'OpenRouter 語音服務尚未設定，請聯絡管理員。')
  return key
}

/** Never log provider messages, keys, audio, transcripts, or LINE credentials. */
export async function checkVoiceProvider(response: Response, stage: string) {
  if (response.ok) return
  const body = await response.json().catch(() => ({}))
  const raw = body?.error?.code
  const code = typeof raw === 'number' ? String(raw) : typeof raw === 'string' && /^[a-z_]{1,80}$/.test(raw) ? raw : 'unknown'
  console.error(JSON.stringify({ service: 'voice', provider: 'openrouter', stage, status: response.status, code }))
  if (response.status === 402 || code === 'insufficient_quota') throw new ApiError(503, 'VOICE_BILLING_REQUIRED', 'OpenRouter 額度不足，請管理員補足額度或調整金鑰的使用上限。已辨識文字會保留。')
  if ([400,401,403,404].includes(response.status)) throw new ApiError(503, 'VOICE_CONFIGURATION_ERROR', 'OpenRouter 金鑰、模型或權限設定尚未就緒，請聯絡管理員；不需要重新錄音。')
  if (response.status === 429) throw new ApiError(503, 'VOICE_BUSY', 'OpenRouter 目前忙碌，請稍後再試，已辨識文字會保留。')
  throw new ApiError(503, 'VOICE_PROVIDER_ERROR', '語音服務暫時無法完成，已辨識文字會保留，可稍後重試。')
}

export async function providerJson(path: 'audio/transcriptions' | 'chat/completions', key: string, body: FormData | string, timeout: number, signal?: AbortSignal) {
  const response = await fetch(`https://openrouter.ai/api/v1/${path}`, {
    method: 'POST', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout), body,
    headers: { Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://houban-web-app.vercel.app', 'X-OpenRouter-Title': 'Houban', ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}) },
  })
  await checkVoiceProvider(response, path)
  const result = await response.json()
  if (result?.error) throw new ApiError(503, 'VOICE_PROVIDER_ERROR', 'OpenRouter 未能完成辨識，已辨識文字會保留。')
  return result
}

export async function transcribeAudio(audio: Blob, key: string, signal?: AbortSignal) {
  const form = new FormData()
  const extension = audio.type.includes('mp4') || audio.type.includes('m4a') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : audio.type.includes('wav') ? 'wav' : audio.type.includes('mpeg') ? 'mp3' : 'webm'
  form.set('file', audio, `recording.${extension}`)
  form.set('model', Deno.env.get('OPENROUTER_TRANSCRIPTION_MODEL') || 'qwen/qwen3-asr-1.7b')
  form.set('language', 'zh'); form.set('response_format', 'json')
  const result = await providerJson('audio/transcriptions', key, form, 22000, signal)
  if (typeof result.text !== 'string' || result.text.length > 5000) throw new ApiError(503, 'VOICE_PROVIDER_ERROR', '語音辨識回應格式不正確，請稍後再試。')
  return traditional(result.text.trim())
}
