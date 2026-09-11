export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message) }
}
export const productionOrigin = 'https://houban-web-app.vercel.app'
export function allowedOrigin(origin: string): boolean {
  return !origin || origin === productionOrigin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}
export function cors(origin: string) {
  return { 'Access-Control-Allow-Origin': allowedOrigin(origin) && origin ? origin : productionOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
}
export function json(origin: string, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}
export async function verifyLineIdentity(request: Request) {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token || token.length > 10000) throw new ApiError(401, 'LINE_LOGIN_REQUIRED', '請先登入 LINE 後再繼續。')
  const channel = Deno.env.get('LINE_LOGIN_CHANNEL_ID') || '2011461980'
  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST', signal: AbortSignal.timeout(8000),
    body: new URLSearchParams({ id_token: token, client_id: channel }),
  })
  const identity = await response.json()
  if (!response.ok || identity.error || identity.iss !== 'https://access.line.me' || identity.aud !== channel ||
    typeof identity.sub !== 'string' || !identity.sub || typeof identity.exp !== 'number' || identity.exp * 1000 <= Date.now()) {
    throw new ApiError(401, 'INVALID_LINE_TOKEN', 'LINE 登入憑證已失效，請重新登入。')
  }
  return { userId: identity.sub as string }
}
/** Bounded streaming read also handles clients that omit Content-Length. */
export async function boundedBody(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get('Content-Length')) > maxBytes) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '錄音檔案太大，請縮短後重試。')
  const reader = request.body?.getReader()
  if (!reader) throw new ApiError(400, 'EMPTY_BODY', '沒有收到錄音。')
  const parts: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) { await reader.cancel(); throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '錄音檔案太大，請縮短後重試。') }
      parts.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.length }
  return bytes
}
