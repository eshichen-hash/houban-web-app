import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eventSeed } from '@/data/events'

const { callLineApi, requireVerifiedLineToken, from, select, order } = vi.hoisted(() => ({
  callLineApi: vi.fn(),
  requireVerifiedLineToken: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
}))

vi.mock('@/services/lineApiService', () => ({ callLineApi }))
vi.mock('@/services/liffService', () => ({
  requireVerifiedLineToken,
  LineAuthRequiredError: class LineAuthRequiredError extends Error {},
}))
vi.mock('@/services/supabase', () => ({ supabase: { from } }))

import { createEventInSupabase, fetchEventsFromSupabase, mapEventToRow, mapRowToEvent } from '@/services/eventService'

beforeEach(() => {
  requireVerifiedLineToken.mockResolvedValue('verified-line-token')
  from.mockReturnValue({ select })
  select.mockReturnValue({ order })
  order.mockResolvedValue({ data: [], error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('活動儲存服務', () => {
  it('保留完整地點資料與零座標', () => {
    const event = { ...eventSeed[0], organizer: { ...eventSeed[0].organizer, id: 'line-test-user' }, park: { ...eventSeed[0].park, lat: 0, lng: 0, meeting: '北門' } }
    const row = mapEventToRow(event)
    expect(row.park_meeting).toBe('北門')
    expect(mapRowToEvent(row).park.lat).toBe(0)
  })

  it('只把 LINE token 與活動資料送到受驗證的伺服器入口', async () => {
    const row = mapEventToRow(eventSeed[0])
    callLineApi.mockResolvedValue({ event: row })

    await expect(createEventInSupabase(eventSeed[0])).resolves.toMatchObject({ id: row.id, title: row.title })
    expect(callLineApi).toHaveBeenCalledWith('create_event', { event: row }, 'verified-line-token')
  })

  it('相同 ID 重試採用伺服器確認結果，不在前端覆寫名額', async () => {
    const row = { ...mapEventToRow(eventSeed[0]), spots: 2 }
    callLineApi.mockResolvedValue({ event: row, idempotent: true })
    await expect(createEventInSupabase(eventSeed[0])).resolves.toMatchObject({ spots: 2 })
    expect(callLineApi).toHaveBeenCalledTimes(1)
  })

  it('伺服器拒絕時回報可重試錯誤', async () => {
    callLineApi.mockRejectedValue(new Error('permission denied'))
    await expect(createEventInSupabase(eventSeed[0])).rejects.toThrow('表單內容已保留')
  })

  it('成功取得空活動清單時保留空清單語意', async () => {
    await expect(fetchEventsFromSupabase()).resolves.toEqual([])
  })
})
