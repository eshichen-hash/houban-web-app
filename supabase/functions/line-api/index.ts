import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.115.0'
import { imageOwnerFolder, normalizedCost, validateEventImage, validateNewSchedule } from '../_shared/eventRules.ts'

const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'
const LINE_CHANNEL_ID = Deno.env.get('LINE_LOGIN_CHANNEL_ID') || '2011461980'
const PRODUCTION_ORIGIN = 'https://houban-web-app.vercel.app'
const TRANSITION_ORIGIN = 'https://houban-web-app-5asd.vercel.app'
const MAX_REQUEST_BYTES = 1_000_000

const allowedProductionOrigins = new Set([PRODUCTION_ORIGIN, TRANSITION_ORIGIN])
const allowedCheckInStatuses = new Set(['pending', 'checked_in', 'absent'])
const allowedEventStatuses = new Set(['active', 'cancelled', 'ended'])

interface LineIdentity {
  userId: string
  displayName: string
  pictureUrl?: string
  expiresAt: number
}

interface LineVerifyResponse {
  iss?: string
  sub?: string
  aud?: string
  exp?: number
  name?: string
  picture?: string
  error?: string
}

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function isAllowedOrigin(origin: string): boolean {
  return !origin || allowedProductionOrigins.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && isAllowedOrigin(origin) ? origin : PRODUCTION_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function jsonResponse(origin: string, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function success(origin: string, data: unknown, status = 200): Response {
  return jsonResponse(origin, status, { ok: true, data })
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'INVALID_INPUT', `${field} 格式不正確。`)
  }
  return value as Record<string, unknown>
}

function requireText(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new ApiError(400, 'INVALID_INPUT', `${field} 格式不正確。`)
  }
  return value.trim()
}

function requireEventId(value: unknown): string {
  const id = requireText(value, '活動 ID', 128)
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new ApiError(400, 'INVALID_INPUT', '活動 ID 格式不正確。')
  return id
}

function requireInteger(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new ApiError(400, 'INVALID_INPUT', `${field} 必須介於 ${min} 到 ${max}。`)
  }
  return Number(value)
}

function bearerToken(request: Request): string {
  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)
  if (!match?.[1] || match[1].length > 10000) {
    throw new ApiError(401, 'LINE_LOGIN_REQUIRED', '請先登入 LINE 後再繼續。')
  }
  return match[1]
}

async function verifyLineIdToken(idToken: string): Promise<LineIdentity> {
  const response = await fetch(LINE_VERIFY_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: LINE_CHANNEL_ID }),
  })
  const verified = await response.json() as LineVerifyResponse
  if (!response.ok || verified.error || !verified.sub || verified.aud !== LINE_CHANNEL_ID
    || verified.iss !== 'https://access.line.me' || !verified.exp || verified.exp * 1000 <= Date.now()) {
    throw new ApiError(401, 'INVALID_LINE_TOKEN', 'LINE 登入憑證無效或已過期，請重新登入。')
  }
  return {
    userId: verified.sub,
    displayName: verified.name?.trim() || 'LINE 使用者',
    pictureUrl: verified.picture,
    expiresAt: verified.exp,
  }
}

function createAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) throw new ApiError(500, 'SERVER_CONFIG_ERROR', '伺服器設定不完整。')
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

async function requireOwnedEvent(admin: SupabaseClient, eventId: string, userId: string) {
  const { data, error } = await admin.from('events').select('*').eq('id', eventId).maybeSingle()
  if (error) throw new ApiError(500, 'DATABASE_ERROR', '活動資料讀取失敗。')
  if (!data || data.organizer_id !== userId) throw new ApiError(403, 'FORBIDDEN', '你沒有管理這場活動的權限。')
  return data
}

function normalizedCreateEvent(rawValue: unknown, identity: LineIdentity): Record<string, unknown> {
  const raw = requireObject(rawValue, '活動資料')
  const maxSpots = requireInteger(raw.max_spots, '活動名額', 3, 50)
  const spots = requireInteger(raw.spots, '剩餘名額', 0, maxSpots)
  const isoDate = requireText(raw.iso_date, '活動日期', 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new ApiError(400, 'INVALID_INPUT', '活動日期格式不正確。')
  try { validateNewSchedule(isoDate, raw.time) } catch (error) { throw new ApiError(400, 'INVALID_INPUT', (error as Error).message) }
  let cost: ReturnType<typeof normalizedCost>
  try { cost = normalizedCost(raw.cost || '免費', raw.cost_amount) } catch (error) { throw new ApiError(400, 'INVALID_INPUT', (error as Error).message) }

  const optionalText = (value: unknown, maxLength = 1000) => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value !== 'string' || value.length > maxLength) throw new ApiError(400, 'INVALID_INPUT', '活動文字欄位格式不正確。')
    return value.trim()
  }

  return {
    id: requireEventId(raw.id),
    title: requireText(raw.title, '活動名稱', 100),
    type: requireText(raw.type, '活動類型', 30),
    difficulty: optionalText(raw.difficulty, 20) || '輕鬆',
    date_key: optionalText(raw.date_key, 20) || 'today',
    iso_date: isoDate,
    date_label: requireText(raw.date_label, '日期標籤', 50),
    time: requireText(raw.time, '活動時間', 80),
    park_id: optionalText(raw.park_id, 128),
    park_name: requireText(raw.park_name, '活動地點', 150),
    park_district: optionalText(raw.park_district, 100),
    park_address: optionalText(raw.park_address, 300),
    park_meeting: requireText(raw.park_meeting, '集合地點', 300),
    park_lat: typeof raw.park_lat === 'number' && Number.isFinite(raw.park_lat) ? raw.park_lat : null,
    park_lng: typeof raw.park_lng === 'number' && Number.isFinite(raw.park_lng) ? raw.park_lng : null,
    spots,
    max_spots: maxSpots,
    ...cost,
    audience: optionalText(raw.audience, 1000),
    description: optionalText(raw.description, 5000),
    items: optionalText(raw.items, 2000),
    image: optionalText(raw.image, 200000),
    image_alt: optionalText(raw.image_alt, 300),
    organizer_id: identity.userId,
    organizer_name: identity.displayName,
    organizer_role: '活動發起人',
    organizer_rating: '5.0',
    organizer_verified: true,
    status: spots === 0 ? 'full' : 'active',
  }
}

const updateTextLimits: Record<string, number> = {
  title: 100, type: 30, difficulty: 20, iso_date: 10, date_label: 50, time: 80,
  park_id: 128, park_name: 150, park_district: 100, park_address: 300, park_meeting: 300,
  cost: 20, audience: 1000, description: 5000, items: 2000, image: 200000, image_alt: 300,
}

function normalizedUpdates(rawValue: unknown): Record<string, unknown> {
  const raw = requireObject(rawValue, '更新資料')
  const updates: Record<string, unknown> = {}
  for (const [field, limit] of Object.entries(updateTextLimits)) {
    if (!(field in raw)) continue
    const value = raw[field]
    if (value === null || value === '') updates[field] = null
    else if (typeof value === 'string' && value.length <= limit) updates[field] = value.trim()
    else throw new ApiError(400, 'INVALID_INPUT', `${field} 格式不正確。`)
  }
  if ('park_lat' in raw) updates.park_lat = typeof raw.park_lat === 'number' && Number.isFinite(raw.park_lat) ? raw.park_lat : null
  if ('park_lng' in raw) updates.park_lng = typeof raw.park_lng === 'number' && Number.isFinite(raw.park_lng) ? raw.park_lng : null
  if ('max_spots' in raw) updates.max_spots = requireInteger(raw.max_spots, '活動名額', 3, 50)
  if ('cost_amount' in raw) updates.cost_amount = requireInteger(raw.cost_amount, '每人費用', 0, 9999)
  if (!Object.keys(updates).length) throw new ApiError(400, 'INVALID_INPUT', '沒有可儲存的活動變更。')
  if (typeof updates.iso_date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(updates.iso_date)) {
    throw new ApiError(400, 'INVALID_INPUT', '活動日期格式不正確。')
  }
  return updates
}

async function handleAction(origin: string, body: Record<string, unknown>, identity: LineIdentity, admin: SupabaseClient): Promise<Response> {
  const action = requireText(body.action, 'action', 50)

  if (action === 'sign_event_image') {
    requireInteger(body.bytes, '圖片大小', 1, 5 * 1024 * 1024)
    if (body.mime !== 'image/webp') throw new ApiError(400, 'INVALID_IMAGE', '請先將圖片轉為 WebP。')
    const owner = await imageOwnerFolder(identity.userId)
    const quota = await admin.rpc('consume_creation_quota', { p_actor_hash: owner, p_kind: 'image' })
    if (quota.error) throw new ApiError(503, 'IMAGE_UNAVAILABLE', '圖片服務暫時無法使用。')
    if (!quota.data) throw new ApiError(429, 'IMAGE_DAILY_LIMIT', '今天的圖片上傳次數已達上限，可先使用系統配圖。')
    const path = `${owner}/${crypto.randomUUID()}.webp`
    const { data, error } = await admin.storage.from('event-images').createSignedUploadUrl(path)
    if (error || !data) throw new ApiError(503, 'IMAGE_UPLOAD_FAILED', '圖片上傳尚未就緒，請稍後重試。')
    const publicUrl = admin.storage.from('event-images').getPublicUrl(path).data.publicUrl
    return success(origin, { path, token: data.token, publicUrl })
  }

  if (action === 'session') {
    return success(origin, { user: { userId: identity.userId, displayName: identity.displayName, pictureUrl: identity.pictureUrl }, expiresAt: identity.expiresAt })
  }

  if (action === 'bootstrap') {
    const [registrations, favorites, organizerEvents] = await Promise.all([
      admin.from('registrations').select('event_id').eq('user_id', identity.userId).eq('status', 'confirmed'),
      admin.from('favorites').select('event_id').eq('user_id', identity.userId),
      admin.from('events').select('*').eq('organizer_id', identity.userId).order('created_at', { ascending: false }),
    ])
    if (registrations.error || favorites.error || organizerEvents.error) throw new ApiError(500, 'DATABASE_ERROR', '個人資料同步失敗。')
    return success(origin, {
      registrationIds: (registrations.data || []).map((item) => item.event_id),
      favoriteIds: (favorites.data || []).map((item) => item.event_id),
      organizerEvents: organizerEvents.data || [],
    })
  }

  if (action === 'organizer_events') {
    const { data, error } = await admin.from('events').select('*').eq('organizer_id', identity.userId).order('created_at', { ascending: false })
    if (error) throw new ApiError(500, 'DATABASE_ERROR', '主辦活動讀取失敗。')
    return success(origin, { events: data || [] })
  }

  if (action === 'create_event') {
    const raw = requireObject(body.event, '活動資料')
    const eventId = requireEventId(raw.id)
    const { data: existing, error: existingError } = await admin.from('events').select('*').eq('id', eventId).maybeSingle()
    if (existingError) throw new ApiError(500, 'DATABASE_ERROR', '活動儲存狀態確認失敗。')
    if (existing) {
      if (existing.organizer_id !== identity.userId) throw new ApiError(409, 'EVENT_ID_CONFLICT', '活動識別碼已被使用。')
      return success(origin, { event: existing, idempotent: true })
    }
    const event = normalizedCreateEvent(raw, identity)
    try { await validateEventImage(event.image, identity.userId, Deno.env.get('SUPABASE_URL')!) } catch (error) { throw new ApiError(400, 'INVALID_IMAGE', (error as Error).message) }
    const { data, error } = await admin.from('events').insert(event).select('*').single()
    if (error || !data) throw new ApiError(500, 'DATABASE_ERROR', '活動尚未完成儲存，請重試。')
    return success(origin, { event: data, idempotent: false }, 201)
  }

  if (action === 'update_event') {
    const eventId = requireEventId(body.eventId)
    const existing = await requireOwnedEvent(admin, eventId, identity.userId)
    const updates = normalizedUpdates(body.updates)
    const rawUpdates = requireObject(body.updates, '更新資料')
    if ('cost' in updates || 'cost_amount' in rawUpdates) {
      try { Object.assign(updates, normalizedCost(updates.cost ?? existing.cost, rawUpdates.cost_amount ?? existing.cost_amount)) } catch (error) { throw new ApiError(400, 'INVALID_INPUT', (error as Error).message) }
    }
    if ('image' in updates && updates.image !== existing.image) {
      try { await validateEventImage(updates.image, identity.userId, Deno.env.get('SUPABASE_URL')!) } catch (error) { throw new ApiError(400, 'INVALID_IMAGE', (error as Error).message) }
    }
    if (typeof updates.max_spots === 'number') {
      const { count, error: countError } = await admin.from('registrations').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'confirmed')
      if (countError) throw new ApiError(500, 'DATABASE_ERROR', '活動名額確認失敗。')
      const confirmedCount = count || 0
      if (updates.max_spots < confirmedCount) throw new ApiError(409, 'CAPACITY_TOO_SMALL', `活動名額不可少於目前 ${confirmedCount} 位報名者。`)
      updates.spots = updates.max_spots - confirmedCount
      if (existing.status === 'active' || existing.status === 'full') updates.status = updates.spots === 0 ? 'full' : 'active'
    }
    const { data, error } = await admin.from('events').update(updates).eq('id', eventId).eq('organizer_id', identity.userId).select('*').single()
    if (error || !data) throw new ApiError(500, 'DATABASE_ERROR', '活動變更尚未完成儲存。')
    return success(origin, { event: data })
  }

  if (action === 'update_event_status') {
    const eventId = requireEventId(body.eventId)
    const status = requireText(body.status, '活動狀態', 20)
    if (!allowedEventStatuses.has(status)) throw new ApiError(400, 'INVALID_INPUT', '活動狀態不正確。')
    await requireOwnedEvent(admin, eventId, identity.userId)
    const { data, error } = await admin.from('events').update({ status }).eq('id', eventId).eq('organizer_id', identity.userId).select('id,status').single()
    if (error || !data) throw new ApiError(500, 'DATABASE_ERROR', '活動狀態尚未完成儲存。')
    return success(origin, data)
  }

  if (action === 'delete_event') {
    const eventId = requireEventId(body.eventId)
    await requireOwnedEvent(admin, eventId, identity.userId)
    const { error } = await admin.from('events').delete().eq('id', eventId).eq('organizer_id', identity.userId)
    if (error) throw new ApiError(500, 'DATABASE_ERROR', '活動刪除失敗。')
    return success(origin, { deleted: true })
  }

  if (action === 'register_event') {
    const { data, error } = await admin.rpc('register_event_atomic', {
      p_event_id: requireEventId(body.eventId), p_user_id: identity.userId,
      p_user_name: identity.displayName, p_user_avatar: identity.pictureUrl || null,
    })
    if (error) throw new ApiError(500, 'DATABASE_ERROR', '報名交易失敗，請稍後再試。')
    return success(origin, data)
  }

  if (action === 'cancel_registration') {
    const { data, error } = await admin.rpc('cancel_event_atomic', { p_event_id: requireEventId(body.eventId), p_user_id: identity.userId })
    if (error) throw new ApiError(500, 'DATABASE_ERROR', '取消報名交易失敗，請稍後再試。')
    return success(origin, data)
  }

  if (action === 'set_favorite') {
    const eventId = requireEventId(body.eventId)
    if (typeof body.favorite !== 'boolean') throw new ApiError(400, 'INVALID_INPUT', '收藏狀態不正確。')
    if (body.favorite) {
      const { error } = await admin.from('favorites').upsert({ event_id: eventId, user_id: identity.userId }, { onConflict: 'user_id,event_id' })
      if (error) throw new ApiError(500, 'DATABASE_ERROR', '收藏尚未完成儲存。')
    } else {
      const { error } = await admin.from('favorites').delete().eq('event_id', eventId).eq('user_id', identity.userId)
      if (error) throw new ApiError(500, 'DATABASE_ERROR', '取消收藏尚未完成儲存。')
    }
    return success(origin, { favorite: body.favorite })
  }

  if (action === 'participants') {
    const eventId = requireEventId(body.eventId)
    await requireOwnedEvent(admin, eventId, identity.userId)
    const { data, error } = await admin.from('registrations').select('id,event_id,user_id,user_name,user_avatar,check_in_status,status,created_at').eq('event_id', eventId).eq('status', 'confirmed').order('created_at', { ascending: true })
    if (error) throw new ApiError(500, 'DATABASE_ERROR', '報名名單讀取失敗。')
    return success(origin, { participants: data || [] })
  }

  if (action === 'check_in') {
    const status = requireText(body.status, '簽到狀態', 20)
    if (!allowedCheckInStatuses.has(status)) throw new ApiError(400, 'INVALID_INPUT', '簽到狀態不正確。')
    const { data, error } = await admin.rpc('check_in_participant', {
      p_event_id: requireEventId(body.eventId),
      p_participant_user_id: requireText(body.participantUserId, '參加者 ID', 128),
      p_status: status,
      p_actor_user_id: identity.userId,
    })
    if (error) throw new ApiError(500, 'DATABASE_ERROR', '簽到狀態尚未完成儲存。')
    return success(origin, data)
  }

  throw new ApiError(404, 'UNKNOWN_ACTION', '找不到這個操作。')
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin') || ''
  if (!isAllowedOrigin(origin)) return jsonResponse(origin, 403, { ok: false, error: { code: 'ORIGIN_NOT_ALLOWED', message: '不允許的來源。' } })
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (request.method !== 'POST') return jsonResponse(origin, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '只接受 POST 請求。' } })

  try {
    const contentLength = Number(request.headers.get('Content-Length') || '0')
    if (contentLength > MAX_REQUEST_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '請求內容過大。')
    const identity = await verifyLineIdToken(bearerToken(request))
    const body = requireObject(await request.json(), '請求內容')
    return await handleAction(origin, body, identity, createAdminClient())
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse(origin, error.status, { ok: false, error: { code: error.code, message: error.message } })
    console.error('Unhandled line-api error:', error instanceof Error ? error.message : String(error))
    return jsonResponse(origin, 500, { ok: false, error: { code: 'INTERNAL_ERROR', message: '伺服器暫時無法完成操作。' } })
  }
})
