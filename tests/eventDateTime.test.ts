import { describe, expect, it } from 'vitest'
import { eventSeed } from '@/data/events'
import { matchesEventDate, parseStoredTimeRange, taipeiDate, isValidDate } from '@/utils/eventDateTime'
import { parseEventDateTimeRange } from '@/utils/calendarUtils'

describe('活動日期與時間', () => {
  it('以台灣時間判定日期，不受裝置時區影響', () => {
    expect(taipeiDate(new Date('2026-09-06T17:00:00Z'))).toBe('2026-09-07')
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('')).toBe(false)
  })

  it('今天與明天忽略過時的 dateKey，本週只包含今天至週日', () => {
    const now = new Date('2026-09-04T08:00:00+08:00')
    expect(matchesEventDate({ isoDate: '2026-08-27' }, 'today', null, now)).toBe(false)
    expect(matchesEventDate({ isoDate: '2026-09-04' }, 'today', null, now)).toBe(true)
    expect(matchesEventDate({ isoDate: '2026-09-05' }, 'tomorrow', null, now)).toBe(true)
    for (const date of ['2026-09-04', '2026-09-05', '2026-09-06']) {
      expect(matchesEventDate({ isoDate: date }, 'week', null, now)).toBe(true)
    }
    for (const date of ['2026-09-03', '2026-09-07', '2026-12-31']) {
      expect(matchesEventDate({ isoDate: date }, 'week', null, now)).toBe(false)
    }
  })

  it.each([
    ['上午 9:00－10:00', '09:00', '10:00', 0],
    ['上午 11:00－下午 1:30', '11:00', '13:30', 0],
    ['下午 12:00－1:00', '12:00', '13:00', 0],
    ['上午 12:00－1:00', '00:00', '01:00', 0],
    ['晚上 11:00－上午 1:00', '23:00', '01:00', 1],
    ['23:30', '23:30', '00:30', 1],
    ['14:00～15:00', '14:00', '15:00', 0],
  ])('正確解析 %s', (label, startTime, endTime, endDayOffset) => {
    expect(parseStoredTimeRange(label as string)).toEqual({ startTime, endTime, endDayOffset })
  })

  it('跨中午行事曆匯出為正確的 150 分鐘', () => {
    const { start, end } = parseEventDateTimeRange({ ...eventSeed[0], isoDate: '2026-09-06', time: '上午 11:00－下午 1:30' })
    expect(start.toISOString()).toBe('2026-09-06T03:00:00.000Z')
    expect(end.toISOString()).toBe('2026-09-06T05:30:00.000Z')
    expect((end.getTime() - start.getTime()) / 60000).toBe(150)
  })

  it('舊資料跨午夜時結束日期進到隔天，無效資料不假造日期', () => {
    const { end } = parseEventDateTimeRange({ ...eventSeed[0], isoDate: '2026-09-06', time: '晚上 11:00－上午 1:00' })
    expect(end.toISOString()).toBe('2026-09-06T17:00:00.000Z')
    expect(() => parseEventDateTimeRange({ ...eventSeed[0], isoDate: '' })).toThrow()
  })
})
