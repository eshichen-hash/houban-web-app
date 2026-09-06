import { supabasePublishableKey, supabaseUrl } from './supabase'

interface LineApiSuccess<T> {
  ok: true
  data: T
}

interface LineApiFailure {
  ok: false
  error: {
    code: string
    message: string
  }
}

type LineApiResponse<T> = LineApiSuccess<T> | LineApiFailure

export class LineApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code = 'LINE_API_ERROR', status = 500) {
    super(message)
    this.name = 'LineApiError'
    this.code = code
    this.status = status
  }
}

export async function callLineApi<T>(
  action: string,
  payload: Record<string, unknown>,
  idToken: string,
): Promise<T> {
  const response = await fetch(`${supabaseUrl}/functions/v1/line-api`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      apikey: supabasePublishableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  })

  let body: LineApiResponse<T> | null = null
  try {
    body = await response.json() as LineApiResponse<T>
  } catch {
    throw new LineApiError('伺服器回應格式不正確，請稍後再試。', 'INVALID_RESPONSE', response.status)
  }

  if (!response.ok || !body.ok) {
    const error = body && !body.ok ? body.error : null
    throw new LineApiError(
      error?.message || '連線暫時失敗，請稍後再試。',
      error?.code || 'REQUEST_FAILED',
      response.status,
    )
  }

  return body.data
}
