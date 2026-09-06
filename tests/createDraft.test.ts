import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parks } from '@/data/events'
import { useCreateEventDraft } from '@/composables/useCreateEventDraft'

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-06T08:00:00+08:00')) })
afterEach(() => vi.useRealTimers())

function validDraft() {
  const draft = useCreateEventDraft()
  draft.form.type = '健走'
  draft.selectPark(parks[0].id)
  draft.form.meeting = '第三號門旁的涼亭'
  return draft
}

describe('建立活動資料完整性', () => {
  it('保留外部搜尋地點的識別碼、地址與座標；未知座標不使用台北預設值', () => {
    const draft = validDraft()
    draft.selectPlace({ name: '高雄測試公園', address: '高雄市測試路 1 號', district: '高雄市', lat: 22.63, lng: 120.30, placeId: 'test-place' })
    draft.form.meeting = '南側入口'
    expect(draft.buildEventInput().park).toEqual({ id: 'test-place', name: '高雄測試公園', address: '高雄市測試路 1 號', district: '高雄市', lat: 22.63, lng: 120.30, meeting: '南側入口' })
    draft.selectPlace({ name: '沒有座標的公園', address: '指定地址', district: '' })
    expect(draft.buildEventInput().park.lat).toBeUndefined()
    expect(draft.buildEventInput().park.lng).toBeUndefined()
    draft.selectPlace({ name: parks[0].name, address: '另一個縣市的同名地點', district: '高雄市', placeId: 'different-place' })
    expect(draft.buildEventInput().park.lat).toBeUndefined()
    expect(draft.buildEventInput().park.lng).toBeUndefined()
  })

  it('清除地點時同步清除集合點；未選定的自由文字不能建立活動', () => {
    const draft = validDraft()
    draft.selectPark('')
    expect(draft.form.meeting).toBe('')
    draft.form.parkId = '尚未選取的文字'
    expect(draft.selectedPark.value).toBeNull()
    expect(draft.canCreate.value).toBe(false)
  })

  it('送出時重新驗證時間，防止表單開啟太久後建立已過期活動', () => {
    const draft = validDraft()
    expect(draft.canCreate.value).toBe(true)
    vi.setSystemTime(new Date('2026-09-06T10:00:00+08:00'))
    expect(() => draft.buildEventInput()).toThrow('開始時間已過')
    expect(draft.canCreate.value).toBe(false)
    expect(draft.validationErrors.value.time).toContain('開始時間已過')
  })
  it('保留自訂集合地點，不修改共用的公園資料', () => {
    const original = parks[0].meeting
    const draft = validDraft()
    expect(draft.buildEventInput().park.meeting).toBe('第三號門旁的涼亭')
    expect(parks[0].meeting).toBe(original)
  })

  it.each([
    ['isoDate', ''], ['isoDate', '2026-02-30'], ['isoDate', '2026-09-05'],
    ['time', ''], ['time', '07:00'], ['endTime', '08:30'], ['endTime', '09:00'], ['endTime', '00:30'],
    ['meeting', '   '], ['spots', 2], ['spots', 51],
  ])('拒絕無效欄位 %s=%s', (field, value) => {
    const draft = validDraft()
    Object.assign(draft.form, { [field]: value })
    expect(draft.canCreate.value).toBe(false)
    expect(() => draft.buildEventInput()).toThrow()
  })
})
