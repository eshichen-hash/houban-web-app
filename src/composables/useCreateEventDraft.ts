import { computed, reactive, shallowRef, watch } from 'vue'
import { parks, type Park, type Cost, type Difficulty, type EventItem, type EventType } from '@/data/events'
import type { SelectedParkResult } from '@/types/places'
import { addCalendarDays, eventDateKey, eventDateTime, formatEventDate, formatTimeRange, isValidDate, taipeiDate, timeMinutes } from '@/utils/eventDateTime'

export type CreateEventInput = Omit<EventItem, 'id' | 'organizer'>

export type CreateValidationErrors = Partial<Record<'type' | 'isoDate' | 'time' | 'endTime' | 'park' | 'meeting' | 'spots' | 'cost', string>>

export function useCreateEventDraft() {
  const today = new Date()
  const validationNow = shallowRef(today)
  const todayIso = taipeiDate(today)
  const tomorrowIso = addCalendarDays(todayIso, 1)
  const nameIsCustom = shallowRef(false)
  const introIsCustom = shallowRef(false)
  const externalPark = shallowRef<Park | null>(null)

  const form = reactive({
    type: '' as EventType | '',
    name: '',
    spots: 12,
    difficulty: '輕鬆' as Difficulty,
    cost: '免費' as Cost,
    costAmount: null as number | null,
    intro: '',
    isoDate: todayIso,
    time: '09:00',
    endTime: '10:00',
    parkId: '',
    meeting: '',
    audience: '',
    items: '',
    image: '',
  })

  const selectedPark = computed(() => {
    if (!form.parkId) return null
    if (externalPark.value?.id === form.parkId) return externalPark.value
    return parks.find((park) => park.id === form.parkId || park.name === form.parkId) ?? null
  })
  const dateLabel = computed(() => formatEventDate(form.isoDate))
  const timeLabel = computed(() => formatTimeRange(form.time, form.endTime))
  const generatedName = computed(() => {
    if (!form.type) return ''
    const locationName = selectedPark.value?.name || ''
    const activityName = `一起${form.type}`
    return locationName ? `${locationName}・${activityName}` : activityName
  })
  const generatedIntro = computed(() => {
    if (!form.type) return ''
    const locationName = selectedPark.value?.name || '公園'
    return `在${locationName}進行${form.difficulty}${form.type}，歡迎一起參加。`
  })
  const displayName = computed(() => form.name.trim() || generatedName.value)
  function validateFields(now: Date): CreateValidationErrors {
    const errors: CreateValidationErrors = {}
    if (!form.type || !displayName.value) errors.type = '請先選擇一種活動類型'
    if (!isValidDate(form.isoDate)) errors.isoDate = '請選擇有效的活動日期'
    else if (form.isoDate < taipeiDate(now)) errors.isoDate = '活動日期不能早於今天'
    const start = timeMinutes(form.time)
    const end = timeMinutes(form.endTime)
    if (start === null) errors.time = '請設定活動開始時間'
    else if (!errors.isoDate && eventDateTime(form.isoDate, form.time).getTime() <= now.getTime()) {
      errors.time = '開始時間已過，請選擇之後的時間或其他日期'
    }
    if (end === null) errors.endTime = '請設定活動結束時間'
    else if (start !== null && end <= start) errors.endTime = '結束時間須晚於開始時間；目前僅支援當日活動'
    if (!selectedPark.value) errors.park = '請從搜尋結果選擇活動地點'
    if (!form.meeting.trim()) errors.meeting = '請選擇或輸入集合地點'
    if (!Number.isInteger(form.spots) || form.spots < 3 || form.spots > 50) errors.spots = '活動名額須為 3–50 人的整數'
    if (form.cost === '付費' && (!Number.isInteger(form.costAmount) || Number(form.costAmount) < 1 || Number(form.costAmount) > 9999)) errors.cost = '請填寫每人費用 NT$1–9,999'
    return errors
  }
  const validationErrors = computed(() => validateFields(validationNow.value))
  const canCreate = computed(() => Object.keys(validationErrors.value).length === 0)

  function validate(now = new Date()): CreateValidationErrors {
    // Refresh the reactive error summary as well as the submit-time guard.
    validationNow.value = now
    return validationErrors.value
  }

  watch([() => form.type, () => form.parkId], () => {
    if (!nameIsCustom.value) form.name = generatedName.value
  })

  watch(generatedIntro, (value) => {
    if (!introIsCustom.value) form.intro = value
  }, { immediate: true })

  function updateName(value: string) {
    nameIsCustom.value = value.trim() !== generatedName.value.trim()
    form.name = value
  }

  function resetGeneratedName() {
    nameIsCustom.value = false
    form.name = generatedName.value
  }

  function updateIntro(value: string) {
    introIsCustom.value = value.trim() !== generatedIntro.value.trim()
    form.intro = value
  }

  function resetGeneratedIntro() {
    introIsCustom.value = false
    form.intro = generatedIntro.value
  }

  function selectPark(parkId: string) {
    const previousDefaultMeeting = selectedPark.value?.meeting
    form.parkId = parkId
    const nextPark = parks.find((park) => park.id === parkId)
    if (nextPark && (!form.meeting || form.meeting === previousDefaultMeeting)) form.meeting = nextPark.meeting
    if (!parkId) { externalPark.value = null; form.meeting = '' }
  }

  function selectPlace(result: SelectedParkResult) {
    const knownPark = parks.find((park) => park.id === result.placeId || (
      park.name === result.name && park.address === result.address
    ))
    externalPark.value = {
      id: result.placeId || knownPark?.id || result.name,
      name: result.name,
      address: result.address || knownPark?.address || '',
      district: result.district || knownPark?.district || '',
      lat: result.lat ?? knownPark?.lat,
      lng: result.lng ?? knownPark?.lng,
      meeting: knownPark?.meeting || `${result.name}入口廣場`,
    }
    form.parkId = externalPark.value.id
    form.meeting = externalPark.value.meeting
  }

  function changeSpots(delta: number) {
    form.spots = Math.min(50, Math.max(3, form.spots + delta))
  }

  function normaliseSpots() {
    form.spots = Math.min(50, Math.max(3, Math.round(Number(form.spots) || 3)))
  }

  function buildEventInput(): CreateEventInput {
    const errors = validate()
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])
    const park = selectedPark.value
    if (!park) throw new Error('請選擇活動地點')

    return {
      title: displayName.value,
      type: form.type as EventType,
      difficulty: form.difficulty,
      dateKey: eventDateKey(form.isoDate),
      isoDate: form.isoDate,
      dateLabel: formatEventDate(form.isoDate),
      time: timeLabel.value,
      park: { ...park, meeting: form.meeting.trim() },
      spots: form.spots,
      maxSpots: form.spots,
      cost: form.cost,
      costAmount: form.cost === '免費' ? 0 : form.costAmount,
      audience: form.audience.trim() || (form.difficulty === '輕鬆' ? '初學者也可以參加' : '適合喜歡持續活動者'),
      description: form.intro.trim() || generatedIntro.value,
      items: form.items.trim() || '飲用水、帽子（可選）',
      image: form.image || '/create-bench-grass-v1.png',
      imageAlt: form.image ? '活動發起人選擇的活動圖片' : '公園長椅與小草插圖',
    }
  }

  return {
    form,
    parks,
    todayIso,
    tomorrowIso,
    selectedPark,
    dateLabel,
    timeLabel,
    generatedName,
    generatedIntro,
    displayName,
    canCreate,
    validationErrors,
    validate,
    nameIsCustom,
    introIsCustom,
    updateName,
    resetGeneratedName,
    updateIntro,
    resetGeneratedIntro,
    selectPark,
    selectPlace,
    changeSpots,
    normaliseSpots,
    buildEventInput,
  }
}
