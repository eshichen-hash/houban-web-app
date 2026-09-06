import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eventSeed } from '@/data/events'

const { save, fetchEvents, fetchPersonal, register, unregister } = vi.hoisted(() => ({
  save: vi.fn(), fetchEvents: vi.fn(), fetchPersonal: vi.fn(), register: vi.fn(), unregister: vi.fn(),
}))
vi.mock('@/services/eventService', () => ({
  createEventInSupabase: save, fetchEventsFromSupabase: fetchEvents,
}))
vi.mock('@/services/registrationService', () => ({
  fetchMyCloudState: fetchPersonal,
  fetchMyFavorites: vi.fn().mockResolvedValue([]), fetchMyRegistrations: vi.fn().mockResolvedValue([]),
  addFavoriteInSupabase: vi.fn(), removeFavoriteInSupabase: vi.fn(), registerEventInSupabase: register,
  checkInParticipantInSupabase: vi.fn(), fetchEventParticipants: vi.fn(), unregisterEventInSupabase: unregister,
}))
vi.mock('@/services/liffService', () => ({ useLiff: () => ({ liffState: { profile: { userId: 'test-user', displayName: '測試建立者' } } }) }))

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
  fetchEvents.mockResolvedValue(eventSeed.map((event) => ({ ...event, park: { ...event.park } })))
  fetchPersonal.mockResolvedValue({ registrationIds: [], favoriteIds: [], organizerEvents: [] })
  save.mockReset()
  register.mockReset()
  unregister.mockReset()
})

describe('建立活動狀態', () => {
  it('失敗不加入本地清單，成功後才加入且重試不重複', async () => {
    const { useAppState } = await import('@/composables/useAppState')
    const app = useAppState()
    await app.syncWithCloud()
    const count = app.state.createdEvents.length
    save.mockRejectedValueOnce(new Error('測試斷線'))
    await expect(app.createEvent(eventSeed[0], 'test-created')).rejects.toThrow('測試斷線')
    expect(app.state.createdEvents).toHaveLength(count)
    save.mockImplementation(async (event) => event)
    const saved = await app.createEvent(eventSeed[0], 'test-created')
    expect(saved.organizer.id).toBe('test-user')
    expect(app.state.createdEvents).toHaveLength(count + 1)
    await app.createEvent(eventSeed[0], 'test-created')
    expect(app.state.createdEvents).toHaveLength(count + 1)
  })

  it('日期顯示轉換後，報名與取消仍會更新卡片名額且不改寫假資料', async () => {
    const { useAppState } = await import('@/composables/useAppState')
    const app = useAppState()
    await app.syncWithCloud()
    const seed = eventSeed[0]
    const spots = seed.spots
    expect(app.getEvent(seed.id)?.spots).toBe(spots)
    register.mockResolvedValue({ success: true, message: '報名成功' })
    unregister.mockResolvedValue({ success: true, message: '已取消' })
    await app.registerEvent(seed.id)
    expect(app.getEvent(seed.id)?.spots).toBe(spots - 1)
    expect(seed.spots).toBe(spots)
    await app.unregisterEvent(seed.id)
    expect(app.getEvent(seed.id)?.spots).toBe(spots)
  })
})
