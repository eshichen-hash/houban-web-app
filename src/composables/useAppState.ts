import { computed, reactive, readonly, shallowRef, watch } from 'vue'
import { activityTypes, eventSeed, parks, type DateFilter, type EventItem, type EventType } from '@/data/events'
import type { ExploreLocationMode, ExploreRadius, ExploreScope } from '@/types/explore'

const STORAGE_KEY = 'park-good-companion-vue-state'
interface StoredState {
  favorites: string[]
  registered: string[]
  createdEvents: EventItem[]
  dateFilter: DateFilter
  interest: EventType | '全部'
  customDate: string | null
  location: string
  radius: ExploreRadius
  locationMode: ExploreLocationMode
  selectedParkId: string | null
  centerCoords?: { lat: number; lng: number } | null
}

const state = reactive({
  location: '',
  radius: 3 as ExploreRadius,
  locationMode: 'current' as ExploreLocationMode,
  selectedParkId: null as string | null,
  centerCoords: null as { lat: number; lng: number } | null,
  dateFilter: 'today' as DateFilter,
  interest: '全部' as EventType | '全部',
  customDate: null as string | null,
  favorites: [] as string[],
  registered: [] as string[],
  createdEvents: [] as EventItem[],
})

function hydrateState() {
  if (typeof window === 'undefined') return
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<StoredState> | null
    if (!stored) return
    if (Array.isArray(stored.favorites)) state.favorites = stored.favorites.filter((id): id is string => typeof id === 'string')
    if (Array.isArray(stored.registered)) state.registered = stored.registered.filter((id): id is string => typeof id === 'string')
    if (Array.isArray(stored.createdEvents)) state.createdEvents = stored.createdEvents as EventItem[]
    if (stored.dateFilter === 'today' || stored.dateFilter === 'tomorrow' || stored.dateFilter === 'week' || stored.dateFilter === 'custom') state.dateFilter = stored.dateFilter
    if (stored.interest === '全部' || activityTypes.includes(stored.interest as EventType)) state.interest = stored.interest as EventType | '全部'
    if (typeof stored.customDate === 'string' || stored.customDate === null) state.customDate = stored.customDate
    if (typeof stored.location === 'string' && stored.location.trim() && stored.location !== '大安區' && stored.location !== '目前位置') {
      state.location = stored.location
    } else {
      state.location = ''
    }
    if (stored.radius === 1 || stored.radius === 3 || stored.radius === 5 || stored.radius === 10) state.radius = stored.radius
    if (stored.locationMode === 'current' || stored.locationMode === 'district' || stored.locationMode === 'park') state.locationMode = stored.locationMode
    if (typeof stored.selectedParkId === 'string' || stored.selectedParkId === null) state.selectedParkId = stored.selectedParkId
    if (stored.centerCoords && typeof stored.centerCoords.lat === 'number' && typeof stored.centerCoords.lng === 'number') {
      state.centerCoords = stored.centerCoords
    } else {
      state.centerCoords = null
    }
  } catch {
    // 本地資料損壞時回到乾淨的示意狀態，不阻擋使用者繼續操作。
  }
}

hydrateState()

const activeEvents = computed(() => [...eventSeed, ...state.createdEvents])

function eventMatchesDate(event: EventItem, dateFilter: DateFilter, customDate: string | null) {
  if (dateFilter === 'week') return true
  if (dateFilter === 'custom') return Boolean(customDate && event.isoDate === customDate)
  return event.dateKey === dateFilter
}

export function useAppState() {
  const visibleEvents = computed(() => activeEvents.value.filter((event) => {
    const dateMatch = eventMatchesDate(event, state.dateFilter, state.customDate)
    const interestMatch = state.interest === '全部' || event.type === state.interest
    return dateMatch && interestMatch
  }))

  const favoriteEvents = computed(() => activeEvents.value.filter((event) => state.favorites.includes(event.id)))
  const registeredEvents = computed(() => activeEvents.value.filter((event) => state.registered.includes(event.id)))

  function getEvent(id: string) {
    return activeEvents.value.find((event) => event.id === id)
  }

  function toggleFavorite(id: string) {
    const index = state.favorites.indexOf(id)
    if (index >= 0) state.favorites.splice(index, 1)
    else state.favorites.push(id)
  }

  function setDateFilter(value: Exclude<DateFilter, 'custom'>) {
    state.dateFilter = value
    state.customDate = null
  }

  function setCustomDate(value: string) {
    state.customDate = value
    state.dateFilter = 'custom'
  }

  function setInterest(value: EventType | '全部') {
    state.interest = value
  }

  function setExploreScope(scope: ExploreScope) {
    state.locationMode = scope.locationMode
    state.location = scope.location
    state.radius = scope.radius
    state.selectedParkId = scope.locationMode === 'park' ? scope.selectedParkId : null
    state.centerCoords = scope.centerCoords ?? null
  }

  function registerEvent(id: string) {
    if (!state.registered.includes(id)) state.registered.push(id)
  }

  function createEvent(input: Omit<EventItem, 'id' | 'organizer'>) {
    const created: EventItem = {
      ...input,
      id: `created-${Date.now()}`,
      organizer: { name: '我', role: '活動發起人', rating: '新加入', organized: 0, verified: false },
    }
    state.createdEvents.push(created)
    return created
  }

  return {
    state: readonly(state),
    events: activeEvents,
    visibleEvents,
    favoriteEvents,
    registeredEvents,
    activityTypes,
    parks,
    getEvent,
    toggleFavorite,
    setDateFilter,
    setCustomDate,
    setInterest,
    setExploreScope,
    registerEvent,
    createEvent,
  }
}

export function useOnboarding() {
  const seen = shallowRef(false)

  function complete() {
    seen.value = true
    if (typeof window !== 'undefined') window.localStorage.setItem('park-good-companion-vue-onboarding', 'seen')
  }

  return { seen, complete }
}

watch(state, (value) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    favorites: value.favorites,
    registered: value.registered,
    createdEvents: value.createdEvents,
    dateFilter: value.dateFilter,
    interest: value.interest,
    customDate: value.customDate,
    location: value.location,
    radius: value.radius,
    locationMode: value.locationMode,
    selectedParkId: value.selectedParkId,
    centerCoords: value.centerCoords,
  }))
}, { deep: true })
