import { computed, reactive, shallowRef } from 'vue'
import { useCreateEventDraft } from './useCreateEventDraft'
import type { VoiceExtraction } from '../../supabase/functions/_shared/voiceContract'
import type { SelectedParkResult } from '@/types/places'
import { formatEventCost } from '@/utils/eventCost'

export type DraftField = 'type' | 'date' | 'time' | 'park' | 'meeting' | 'spots' | 'cost' | 'items' | 'copy'
export type FieldStatus = '待確認' | '已辨識' | '已確認' | '系統建議' | '自動產生' | '選填'
export const DRAFT_FIELDS: { key: DraftField; label: string }[] = [
  { key: 'type', label: '活動類型' }, { key: 'date', label: '日期' }, { key: 'time', label: '時間' },
  { key: 'park', label: '公園／地點' }, { key: 'meeting', label: '集合地點' }, { key: 'spots', label: '名額' },
  { key: 'cost', label: '費用' }, { key: 'items', label: '攜帶物品' }, { key: 'copy', label: '活動名稱與介紹' },
]
export const DRAFT_STORAGE_KEY = 'houban:voice-draft:v1'
const TTL = 24 * 60 * 60 * 1000
export type DraftSnapshot = ReturnType<ReturnType<typeof useVoiceActivityDraft>['snapshot']>

export function useVoiceActivityDraft() {
  const base = useCreateEventDraft()
  const { form } = base
  const creationId = shallowRef(`created-${crypto.randomUUID()}`)
  const parkQuery = shallowRef('')
  const parkConfirmed = shallowRef(false)
  const meetingConfirmed = shallowRef(false)
  const status = reactive<Partial<Record<DraftField, FieldStatus>>>({})
  const imageSource = shallowRef<'preset' | 'upload'>('preset')
  function blank() {
    Object.assign(form, { type: '', name: '', intro: '', isoDate: '', time: '', endTime: '', parkId: '', meeting: '', spots: 12, cost: '免費', costAmount: null, items: '', image: '' })
    base.selectPark(''); base.resetGeneratedName(); base.resetGeneratedIntro()
    parkQuery.value = ''; parkConfirmed.value = false; meetingConfirmed.value = false
    for (const key of DRAFT_FIELDS) status[key.key] = key.key === 'spots' || key.key === 'cost' ? '系統建議' : key.key === 'items' ? '選填' : key.key === 'copy' ? '自動產生' : '待確認'
    imageSource.value = 'preset'; creationId.value = `created-${crypto.randomUUID()}`
  }
  blank()
  function applyExtraction(extracted: VoiceExtraction) {
    blank()
    Object.assign(form, {
      type: extracted.type || '', isoDate: extracted.isoDate || '', time: extracted.startTime || '', endTime: extracted.endTime || '',
      meeting: extracted.meeting || '', spots: extracted.spots ?? 12, cost: extracted.cost || '免費', costAmount: extracted.costAmount,
      items: extracted.items || '',
    })
    parkQuery.value = extracted.parkQuery || ''
    for (const [key, value] of Object.entries({ type: extracted.type, date: extracted.isoDate, time: extracted.startTime && extracted.endTime, spots: extracted.spots, cost: extracted.cost, items: extracted.items })) {
      if (value !== null && value !== '') status[key as DraftField] = '已辨識'
    }
    base.resetGeneratedName(); base.resetGeneratedIntro()
  }
  function confirmPark(place: SelectedParkResult) {
    const changed = base.selectedPark.value?.id !== place.placeId || base.selectedPark.value?.address !== place.address
    const spokenMeeting = form.meeting
    base.selectPlace(place)
    if (base.selectedPark.value && !base.parks.some((park) => park.id === place.placeId || park.name === place.name && park.address === place.address)) {
      base.selectedPark.value.meeting = ''
    }
    // A spoken meeting point is a suggestion only; never invent an entrance as a confirmed location.
    form.meeting = changed && parkConfirmed.value ? '' : spokenMeeting
    parkQuery.value = place.name; parkConfirmed.value = true; status.park = '已確認'
    if (changed) { meetingConfirmed.value = false; status.meeting = '待確認' }
  }
  function fieldError(field: DraftField): string {
    const errors = base.validate()
    const map = { type: errors.type, date: errors.isoDate, time: errors.time || errors.endTime, spots: errors.spots, cost: errors.cost }
    if (field in map) return map[field as keyof typeof map] || ''
    if (field === 'park') return !parkConfirmed.value || errors.park ? '請搜尋並確認活動公園／地點' : ''
    if (field === 'meeting') return !meetingConfirmed.value || errors.meeting ? '請確認集合地點，讓參加者找得到你' : ''
    return ''
  }
  const values = computed<Record<DraftField, string>>(() => ({
    type: form.type || '想一起做什麼？', date: base.dateLabel.value, time: base.timeLabel.value,
    park: base.selectedPark.value?.name || parkQuery.value || '搜尋活動公園／地點', meeting: form.meeting || '在哪裡碰面？',
    spots: `${form.spots} 人`, cost: formatEventCost(form), items: form.items || '可補充飲用水、帽子等',
    copy: base.displayName.value || '選好活動後自動產生',
  }))
  // Does not mutate reactive time while rendering; submission always validates again with the real clock.
  const rows = computed(() => {
    const errors = base.validationErrors.value
    return DRAFT_FIELDS.map(({ key, label }) => {
      const invalid = key === 'park' ? !parkConfirmed.value || !!errors.park : key === 'meeting' ? !meetingConfirmed.value || !!errors.meeting :
        key === 'date' ? !!errors.isoDate : key === 'time' ? !!(errors.time || errors.endTime) : key in errors ? !!errors[key as keyof typeof errors] : false
      return { key, label, value: values.value[key], status: invalid ? '待確認' as const : status[key] || '已確認' }
    })
  })
  function firstIssue(): DraftField | undefined { return DRAFT_FIELDS.find(({ key }) => fieldError(key))?.key }
  function snapshot() {
    return { version: 1, creationId: creationId.value, form: { ...form }, park: base.selectedPark.value ? { ...base.selectedPark.value } : null,
      parkQuery: parkQuery.value, parkConfirmed: parkConfirmed.value, meetingConfirmed: meetingConfirmed.value, status: { ...status }, imageSource: imageSource.value }
  }
  function restore(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false
    const v = value as ReturnType<typeof snapshot>
    if (v.version !== 1 || !/^created-[a-f0-9-]+$/.test(v.creationId) || !v.form || typeof v.form !== 'object') return false
    // Local storage is untrusted too; ignore unknown keys, long strings, and nonprimitive form values.
    blank()
    for (const key of Object.keys(form) as (keyof typeof form)[]) {
      const item = v.form[key]
      const valid = key === 'spots' ? typeof item === 'number' && Number.isSafeInteger(item) : key === 'costAmount' ? item === null || typeof item === 'number' && Number.isSafeInteger(item) : typeof item === 'string' && item.length <= 4000
      if (valid) {
        Object.assign(form, { [key]: item })
      }
    }
    if (v.park && typeof v.park.name === 'string' && typeof v.park.address === 'string' && typeof v.park.id === 'string') {
      base.selectPlace({ ...v.park, placeId: v.park.id })
      form.meeting = typeof v.form.meeting === 'string' ? v.form.meeting : ''
    }
    base.updateName(form.name); base.updateIntro(form.intro)
    creationId.value = v.creationId; parkQuery.value = typeof v.parkQuery === 'string' ? v.parkQuery.slice(0, 300) : ''
    parkConfirmed.value = v.parkConfirmed === true && !!base.selectedPark.value
    meetingConfirmed.value = v.meetingConfirmed === true && parkConfirmed.value
    for (const { key } of DRAFT_FIELDS) if (['待確認', '已辨識', '已確認', '系統建議', '自動產生', '選填'].includes(v.status?.[key] || '')) status[key] = v.status[key]
    imageSource.value = v.imageSource === 'upload' ? 'upload' : 'preset'
    if (form.image.startsWith('data:') || form.image.startsWith('blob:')) { form.image = ''; imageSource.value = 'preset' }
    return true
  }
  return { ...base, creationId, parkQuery, parkConfirmed, meetingConfirmed, imageSource, status, blank, applyExtraction, confirmPark, fieldError, firstIssue, rows, snapshot, restore }
}

export function readSavedDraft(storage: Storage, owner: string, now = Date.now()): unknown | null {
  try {
    const raw = storage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Number.isFinite(data.expiresAt) || data.expiresAt <= now || data.expiresAt > now + TTL) { storage.removeItem(DRAFT_STORAGE_KEY); return null }
    return data.owner === owner ? data.draft : null
  } catch { return null }
}
export function saveDraft(storage: Storage, owner: string, draft: unknown, expiresAt = Date.now() + TTL): boolean {
  try { storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ owner, expiresAt, draft })); return true } catch { return false }
}
