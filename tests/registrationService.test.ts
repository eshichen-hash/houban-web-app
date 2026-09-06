import { beforeEach, describe, expect, it, vi } from 'vitest'

const { callLineApi, requireVerifiedLineToken } = vi.hoisted(() => ({
  callLineApi: vi.fn(),
  requireVerifiedLineToken: vi.fn().mockResolvedValue('verified-line-token'),
}))

vi.mock('@/services/lineApiService', () => ({ callLineApi }))
vi.mock('@/services/liffService', () => ({ requireVerifiedLineToken }))
vi.mock('@/services/eventService', () => ({ mapRowToEvent: vi.fn((event) => event) }))

import {
  addFavoriteInSupabase,
  fetchEventParticipants,
  fetchMyCloudState,
  registerEventInSupabase,
  unregisterEventInSupabase,
} from '@/services/registrationService'

beforeEach(() => {
  callLineApi.mockReset()
  requireVerifiedLineToken.mockResolvedValue('verified-line-token')
})

describe('個人資料與報名服務', () => {
  it('空的雲端清單維持為空，不注入示意資料', async () => {
    callLineApi.mockResolvedValue({ registrationIds: [], favoriteIds: [], organizerEvents: [] })
    await expect(fetchMyCloudState()).resolves.toEqual({ registrationIds: [], favoriteIds: [], organizerEvents: [] })
  })

  it('報名與取消不接受前端 user id，只傳活動 ID', async () => {
    callLineApi.mockResolvedValue({ success: true, message: '完成' })
    await registerEventInSupabase('event-1')
    await unregisterEventInSupabase('event-1')

    expect(callLineApi).toHaveBeenNthCalledWith(1, 'register_event', { eventId: 'event-1' }, 'verified-line-token')
    expect(callLineApi).toHaveBeenNthCalledWith(2, 'cancel_registration', { eventId: 'event-1' }, 'verified-line-token')
  })

  it('收藏與名單查詢都經過受驗證入口', async () => {
    callLineApi.mockResolvedValueOnce({ favorite: true }).mockResolvedValueOnce({ participants: [] })
    await expect(addFavoriteInSupabase('event-2')).resolves.toBe(true)
    await expect(fetchEventParticipants('event-2')).resolves.toEqual([])
    expect(callLineApi).toHaveBeenNthCalledWith(1, 'set_favorite', { eventId: 'event-2', favorite: true }, 'verified-line-token')
    expect(callLineApi).toHaveBeenNthCalledWith(2, 'participants', { eventId: 'event-2' }, 'verified-line-token')
  })
})
