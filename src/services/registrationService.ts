import type { EventItem } from '@/data/events'
import { mapRowToEvent, type EventRow } from './eventService'
import { callLineApi } from './lineApiService'
import { requireVerifiedLineToken } from './liffService'

export interface RegistrationRow {
  id: string
  event_id: string
  user_id: string
  user_name: string | null
  user_avatar?: string | null
  check_in_status?: 'pending' | 'checked_in' | 'absent' | string
  status: string
  created_at?: string
}

export interface ParticipantItem {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  checkInStatus: 'pending' | 'checked_in' | 'absent' | string
  registeredAt: string
}

export interface PersonalCloudState {
  registrationIds: string[]
  favoriteIds: string[]
  organizerEvents: EventItem[]
}

interface BootstrapResponse {
  registrationIds: string[]
  favoriteIds: string[]
  organizerEvents: EventRow[]
}

interface OperationResult {
  success: boolean
  message: string
  idempotent?: boolean
  spots?: number
  status?: string
}

function mapParticipant(row: RegistrationRow): ParticipantItem {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || 'LINE 使用者',
    userAvatar: row.user_avatar || undefined,
    checkInStatus: row.check_in_status || 'pending',
    registeredAt: row.created_at ? new Date(row.created_at).toLocaleDateString('zh-TW') : '',
  }
}

export async function fetchMyCloudState(): Promise<PersonalCloudState> {
  const idToken = await requireVerifiedLineToken(false)
  const result = await callLineApi<BootstrapResponse>('bootstrap', {}, idToken)
  return {
    registrationIds: result.registrationIds,
    favoriteIds: result.favoriteIds,
    organizerEvents: result.organizerEvents.map(mapRowToEvent),
  }
}

export async function fetchMyRegistrations(): Promise<string[]> {
  return (await fetchMyCloudState()).registrationIds
}

export async function fetchMyFavorites(): Promise<string[]> {
  return (await fetchMyCloudState()).favoriteIds
}

export async function registerEventInSupabase(eventId: string): Promise<OperationResult> {
  try {
    const idToken = await requireVerifiedLineToken()
    return await callLineApi<OperationResult>('register_event', { eventId }, idToken)
  } catch (err) {
    console.error('Failed to register event:', err)
    return { success: false, message: err instanceof Error ? err.message : '報名連線失敗' }
  }
}

export async function unregisterEventInSupabase(eventId: string): Promise<OperationResult> {
  try {
    const idToken = await requireVerifiedLineToken()
    return await callLineApi<OperationResult>('cancel_registration', { eventId }, idToken)
  } catch (err) {
    console.error('Failed to cancel registration:', err)
    return { success: false, message: err instanceof Error ? err.message : '取消連線失敗' }
  }
}

export async function fetchEventParticipants(eventId: string): Promise<ParticipantItem[]> {
  const idToken = await requireVerifiedLineToken()
  const result = await callLineApi<{ participants: RegistrationRow[] }>('participants', { eventId }, idToken)
  return result.participants.map(mapParticipant)
}

export async function checkInParticipantInSupabase(
  eventId: string,
  participantUserId: string,
  status: 'checked_in' | 'absent' | 'pending' = 'checked_in',
): Promise<boolean> {
  try {
    const idToken = await requireVerifiedLineToken()
    const result = await callLineApi<OperationResult>(
      'check_in',
      { eventId, participantUserId, status },
      idToken,
    )
    return result.success
  } catch (err) {
    console.error('Failed to update check-in:', err)
    return false
  }
}

export async function addFavoriteInSupabase(eventId: string): Promise<boolean> {
  try {
    const idToken = await requireVerifiedLineToken()
    await callLineApi('set_favorite', { eventId, favorite: true }, idToken)
    return true
  } catch (err) {
    console.error('Failed to add favorite:', err)
    return false
  }
}

export async function removeFavoriteInSupabase(eventId: string): Promise<boolean> {
  try {
    const idToken = await requireVerifiedLineToken()
    await callLineApi('set_favorite', { eventId, favorite: false }, idToken)
    return true
  } catch (err) {
    console.error('Failed to remove favorite:', err)
    return false
  }
}
