import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { DRAFT_STORAGE_KEY, readSavedDraft, saveDraft, useVoiceActivityDraft } from '@/composables/useVoiceActivityDraft'
import { normalizeExtraction, type VoiceExtraction } from '../supabase/functions/_shared/voiceContract'
import { imageOwnerFolder, normalizedCost, validateEventImage, validateNewSchedule } from '../supabase/functions/_shared/eventRules'
const scopes: ReturnType<typeof effectScope>[] = []
function draft() { const scope = effectScope(); scopes.push(scope); return scope.run(useVoiceActivityDraft)! }
afterEach(() => { scopes.forEach((scope) => scope.stop()); localStorage.clear(); vi.useRealTimers() })
const extraction: VoiceExtraction = { type: '健走', isoDate: '2099-09-12', startTime: '15:00', endTime: '16:00', parkQuery: '大安森林公園', meeting: '二號出口', spots: null, cost: null, costAmount: null, items: '飲用水', evidence: { type: '健走', date: '明天', time: '三點到四點', park: '大安森林公園', meeting: '二號出口' } }
describe('語音草稿規則', () => {
  it('空草稿不猜日期與時間；預設名額與費用標示系統建議', () => {
    const d = draft()
    expect([d.form.isoDate, d.form.time, d.form.endTime]).toEqual(['', '', ''])
    expect(d.form.spots).toBe(12); expect(d.form.cost).toBe('免費')
    expect(d.status.spots).toBe('系統建議'); expect(d.status.cost).toBe('系統建議')
  })
  it('辨識到公園、集合地點仍必須逐一確認；更換公園撤銷集合確認', () => {
    const d = draft(); d.applyExtraction(extraction)
    expect(d.firstIssue()).toBe('park')
    d.confirmPark({ name: '大安森林公園', placeId: 'a', address: '台北市', district: '大安區' })
    expect(d.form.meeting).toBe('二號出口'); expect(d.firstIssue()).toBe('meeting')
    d.meetingConfirmed.value = true; expect(d.firstIssue()).toBeUndefined()
    d.confirmPark({ name: '另一座公園', placeId: 'b', address: '台中市', district: '西區' })
    expect(d.form.meeting).toBe(''); expect(d.firstIssue()).toBe('meeting')
  })
  it('下午不命名為晨間；手動編輯文案不被自動產生覆蓋', async () => {
    const d = draft(); d.applyExtraction(extraction); await nextTick()
    expect(d.generatedName.value).not.toContain('晨間')
    d.updateName('好伴小聚'); d.updateIntro('我們一起慢慢走')
    d.form.type = '聊天'; await nextTick()
    expect(d.form.name).toBe('好伴小聚'); expect(d.form.intro).toBe('我們一起慢慢走')
  })
  it('不合理的辨識名額與付費金額保留待確認，不能直接送出', () => {
    const d = draft(); d.applyExtraction({ ...extraction, spots: 100, cost: '付費', costAmount: null })
    expect(d.fieldError('spots')).toContain('3–50'); expect(d.fieldError('cost')).toContain('NT$')
    d.form.spots = 12; d.form.costAmount = 150
    expect(d.buildEventInput).toBeTypeOf('function')
  })
  it('缺少逐字依據的 AI 日期與地點不可成為已辨識資料', () => {
    const result = normalizeExtraction(extraction, '我想健走')
    expect(result.type).toBe('健走'); expect(result.isoDate).toBeNull(); expect(result.parkQuery).toBeNull()
  })
  it('提交時重新檢查時間，持續開頁不允許發布已開始活動', () => {
    vi.useFakeTimers(); vi.setSystemTime('2099-09-12T06:00:00Z')
    const d = draft(); d.applyExtraction(extraction)
    expect(d.fieldError('time')).toBe('')
    vi.setSystemTime('2099-09-12T08:00:00Z')
    expect(d.fieldError('time')).toContain('已過')
  })
})
describe('本地草稿保存', () => {
  it('24 小時到期、帳號不同、损壞資料不可恢復', () => {
    const d = draft(); const now = Date.now()
    expect(saveDraft(localStorage, 'user-a', d.snapshot(), now + 86400000)).toBe(true)
    expect(readSavedDraft(localStorage, 'user-b', now)).toBeNull()
    expect(readSavedDraft(localStorage, 'user-a', now)).not.toBeNull()
    expect(readSavedDraft(localStorage, 'user-a', now + 86400000)).toBeNull()
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    localStorage.setItem(DRAFT_STORAGE_KEY, '{bad'); expect(readSavedDraft(localStorage, 'user-a')).toBeNull()
  })
  it('恢復結構、確認狀態及建立 ID，不保存原始錄音', () => {
    const d = draft(); d.applyExtraction(extraction)
    d.confirmPark({ name: '測試公園', placeId: 'p', address: '台北市', district: '大安區' }); d.meetingConfirmed.value = true
    const raw = d.snapshot(); const next = draft()
    expect(next.restore(raw)).toBe(true); expect(next.creationId.value).toBe(d.creationId.value)
    expect(next.form.meeting).toBe('二號出口'); expect(next.parkConfirmed.value).toBe(true)
    expect(JSON.stringify(raw)).not.toContain('audio'); expect(JSON.stringify(raw)).not.toContain('transcript')
  })
})
describe('伺服器活動邊界', () => {
  it('免費一律為 0，付費必須是有效每人金額', () => {
    expect(normalizedCost('免費', 999)).toEqual({ cost: '免費', cost_amount: 0 })
    for (const amount of [null, 0, -1, 10000, 1.5, '100']) expect(() => normalizedCost('付費', amount)).toThrow()
    expect(normalizedCost('付費', 100).cost_amount).toBe(100)
  })
  it('拒絕非法日曆日期、缺少結束、倒置時間及過去活動', () => {
    const now = Date.parse('2099-09-12T06:00:00Z')
    for (const [date, time] of [['2099-02-30', '下午 3:00－4:00'], ['2099-09-12', '09:00'], ['2099-09-12', '下午 4:00－3:00'], ['2099-09-12', '上午 9:00－10:00']]) expect(() => validateNewSchedule(date, time, now)).toThrow()
    expect(() => validateNewSchedule('2099-09-12', '下午 3:00－4:00', now)).not.toThrow()
  })
  it('只能引用自己的上傳路徑或系統配圖，拒絕 Base64 與其他人的圖片', async () => {
    const owner = await imageOwnerFolder('line-user-a'), base = 'https://test.supabase.co'
    expect(owner).not.toContain('line-user-a')
    await expect(validateEventImage(`${base}/storage/v1/object/public/event-images/${owner}/abc-123.webp`, 'line-user-a', base)).resolves.toBeUndefined()
    await expect(validateEventImage(`${base}/storage/v1/object/public/event-images/${owner}/abc-123.webp`, 'line-user-b', base)).rejects.toThrow()
    await expect(validateEventImage('data:image/png;base64,AAA', 'line-user-a', base)).rejects.toThrow()
  })
})
