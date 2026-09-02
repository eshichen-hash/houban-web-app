import { computed, reactive, shallowRef, watch } from 'vue'
import { parks, type Cost, type Difficulty, type EventItem, type EventType } from '@/data/events'

export type CreateEventInput = Omit<EventItem, 'id' | 'organizer'>

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatCalendarDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

function formatTime(time: string) {
  const [rawHour = '0', minute = '00'] = time.split(':')
  const hour = Number(rawHour)
  const period = hour < 12 ? '上午' : '下午'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${period} ${displayHour}:${minute}`
}

function formatTimeRange(startTime: string, endTime: string) {
  const start = formatTime(startTime)
  const end = formatTime(endTime)
  const [startPeriod = ''] = start.split(' ')
  const compactEnd = end.startsWith(`${startPeriod} `) ? end.slice(startPeriod.length + 1) : end
  return `${start}－${compactEnd}`
}

export function useCreateEventDraft() {
  const today = new Date()
  const todayIso = toIsoDate(today)
  const tomorrowIso = toIsoDate(addDays(today, 1))
  const nameIsCustom = shallowRef(false)
  const introIsCustom = shallowRef(false)

  const form = reactive({
    type: '' as EventType | '',
    name: '',
    spots: 12,
    difficulty: '輕鬆' as Difficulty,
    cost: '免費' as Cost,
    intro: '',
    isoDate: todayIso,
    time: '09:00',
    endTime: '10:00',
    parkId: parks[0]?.id ?? '',
    meeting: parks[0]?.meeting ?? '公園入口',
    audience: '',
    items: '',
    image: '',
  })

  const selectedPark = computed(() => parks.find((park) => park.id === form.parkId) ?? parks[0])
  const dateLabel = computed(() => {
    const date = formatCalendarDate(form.isoDate)
    if (form.isoDate === todayIso) return `今天・${date}`
    if (form.isoDate === tomorrowIso) return `明天・${date}`
    return date
  })
  const timeLabel = computed(() => formatTimeRange(form.time, form.endTime))
  const generatedName = computed(() => {
    if (!form.type || !selectedPark.value) return ''
    const activityName = form.type === '健走' ? '晨間健走' : `一起${form.type}`
    return `${selectedPark.value.name}・${activityName}`
  })
  const generatedIntro = computed(() => {
    if (!form.type || !selectedPark.value) return ''
    return `在${selectedPark.value.name}進行${form.difficulty}${form.type}，歡迎一起參加。`
  })
  const displayName = computed(() => form.name.trim() || generatedName.value)
  const canCreate = computed(() => Boolean(form.type && displayName.value && selectedPark.value && form.meeting.trim()))

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
  }

  function changeSpots(delta: number) {
    form.spots = Math.min(50, Math.max(3, form.spots + delta))
  }

  function normaliseSpots() {
    form.spots = Math.min(50, Math.max(3, Math.round(Number(form.spots) || 3)))
  }

  function buildEventInput(): CreateEventInput {
    const park = selectedPark.value ?? parks[0]
    if (!park) throw new Error('找不到可用的公園資料')

    const dateKey = form.isoDate === todayIso
      ? 'today'
      : form.isoDate === tomorrowIso
        ? 'tomorrow'
        : 'week'

    return {
      title: displayName.value,
      type: form.type as EventType,
      difficulty: form.difficulty,
      dateKey,
      isoDate: form.isoDate,
      dateLabel: dateLabel.value,
      time: timeLabel.value,
      park,
      spots: form.spots,
      maxSpots: form.spots,
      cost: form.cost,
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
    nameIsCustom,
    introIsCustom,
    updateName,
    resetGeneratedName,
    updateIntro,
    resetGeneratedIntro,
    selectPark,
    changeSpots,
    normaliseSpots,
    buildEventInput,
  }
}
