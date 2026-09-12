import { computed, reactive, readonly, ref, shallowRef, watch } from 'vue'
import { activityTypes, eventSeed, parks, type DateFilter, type EventItem, type EventType } from '@/data/events'
import { createEventInSupabase, fetchEventsFromSupabase } from '@/services/eventService'
import {
  addFavoriteInSupabase,
  fetchMyCloudState,
  registerEventInSupabase,
  removeFavoriteInSupabase,
} from '@/services/registrationService'
import { useLiff } from '@/services/liffService'
import type { ExploreLocationMode, ExploreLocationSource, ExploreRadius, ExploreScope } from '@/types/explore'
import { eventDateKey, formatEventDate, matchesEventDate } from '@/utils/eventDateTime'

const STORAGE_KEY = 'park-good-companion-vue-state'
const LAST_SCOPE_KEY = 'park-good-companion-vue-last-scope'
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
  locationSource?: ExploreLocationSource | null
}

const state = reactive({
  location: '',
  radius: 3 as ExploreRadius,
  locationMode: 'current' as ExploreLocationMode,
  selectedParkId: null as string | null,
  centerCoords: null as { lat: number; lng: number } | null,
  locationSource: null as ExploreLocationSource | null,
  dateFilter: 'today' as DateFilter,
  interest: '全部' as EventType | '全部',
  customDate: null as string | null,
  favorites: [] as string[],
  registered: [] as string[],
  createdEvents: [] as EventItem[],
})

const cloudEvents = ref<EventItem[]>([])
const isCloudLoaded = ref(false)
const lastUsedScope = shallowRef<ExploreScope | null>(null)
const { liffState } = useLiff()
// Keep fallback counts reactive without changing the shared fixture data.
const localSeedEvents = ref<EventItem[]>(eventSeed.map((event) => ({ ...event, park: { ...event.park } })))

async function syncPersonalCloudState() {
  const personal = await fetchMyCloudState()
  state.registered = [...personal.registrationIds]
  state.favorites = [...personal.favoriteIds]
  state.createdEvents = personal.organizerEvents
}

async function syncWithCloud() {
  try {
    const remoteEvents = await fetchEventsFromSupabase()
    cloudEvents.value = remoteEvents
    isCloudLoaded.value = true
  } catch (err) {
    console.warn('Sync with Supabase cloud encountered an issue:', err)
  }

  if (liffState.profile) {
    try {
      await syncPersonalCloudState()
    } catch (err) {
      console.warn('Personal cloud sync encountered an issue:', err)
    }
  }
}

function hydrateState() {
  if (typeof window === 'undefined') return
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<StoredState> | null
    if (stored) {
      if (stored.dateFilter === 'today' || stored.dateFilter === 'tomorrow' || stored.dateFilter === 'week' || stored.dateFilter === 'custom') state.dateFilter = stored.dateFilter
      if (stored.interest === '全部' || activityTypes.includes(stored.interest as EventType)) state.interest = stored.interest as EventType | '全部'
      if (typeof stored.customDate === 'string' || stored.customDate === null) state.customDate = stored.customDate
    }

    // A persisted scope is a last-used choice, not proof of the user's current location.
    // Keep it available as an explicit option instead of showing it as live GPS data.
    const dedicatedLastScope = JSON.parse(window.localStorage.getItem(LAST_SCOPE_KEY) ?? 'null') as Partial<StoredState> | null
    const storedScope = parseStoredScope(dedicatedLastScope ?? {})
      ?? parseStoredScope(stored ?? {})
    if (storedScope) {
      lastUsedScope.value = { ...storedScope, locationSource: 'last-used' }
    }
  } catch {
    // 本地資料損壞時回到乾淨狀態，不阻擋使用者重新取得位置。
  }
}

function hasCoordinates(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== 'object') return false
  const coords = value as { lat?: unknown; lng?: unknown }
  return typeof coords.lat === 'number'
    && Number.isFinite(coords.lat)
    && typeof coords.lng === 'number'
    && Number.isFinite(coords.lng)
}

function parseStoredScope(stored: Partial<StoredState>): ExploreScope | null {
  if (typeof stored.location !== 'string' || !stored.location.trim()) return null
  if (!hasCoordinates(stored.centerCoords)) return null

  const locationMode = stored.locationMode === 'current'
    || stored.locationMode === 'district'
    || stored.locationMode === 'park'
    ? stored.locationMode
    : 'district'
  const radius = stored.radius === 1 || stored.radius === 3 || stored.radius === 5 || stored.radius === 10
    ? stored.radius
    : 3
  const selectedParkId = typeof stored.selectedParkId === 'string' ? stored.selectedParkId : null

  return {
    locationMode,
    location: stored.location.trim(),
    radius,
    selectedParkId: locationMode === 'park' ? selectedParkId : null,
    centerCoords: stored.centerCoords,
    locationSource: 'last-used',
  }
}

hydrateState()
syncWithCloud()

watch(() => liffState.profile?.userId, async (userId) => {
  if (!userId) {
    state.favorites = []
    state.registered = []
    state.createdEvents = []
    return
  }

  try {
    await syncPersonalCloudState()
  } catch (err) {
    console.warn('Verified LINE session sync failed:', err)
  }
})

const sourceEvents = computed(() => {
  if (isCloudLoaded.value) {
    // 當有雲端活動時，同時確保使用者本地建立的暫存活動也在清單中
    const remoteIds = new Set(cloudEvents.value.map((e) => e.id))
    const localNew = state.createdEvents.filter((e) => !remoteIds.has(e.id) && (!e.status || e.status === 'active' || e.status === 'full'))
    return [...localNew, ...cloudEvents.value]
  }
  return [...state.createdEvents, ...localSeedEvents.value]
})

const activeEvents = computed(() => sourceEvents.value.map((event) => ({
  ...event, dateKey: eventDateKey(event.isoDate), dateLabel: formatEventDate(event.isoDate),
})))

function eventMatchesDate(event: EventItem, dateFilter: DateFilter, customDate: string | null) {
  return matchesEventDate(event, dateFilter, customDate)
}

import {
  checkInParticipantInSupabase,
  fetchEventParticipants,
  unregisterEventInSupabase,
  type ParticipantItem,
} from '@/services/registrationService'

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

  async function toggleFavorite(id: string) {
    const index = state.favorites.indexOf(id)
    if (index >= 0) {
      state.favorites.splice(index, 1)
      if (!await removeFavoriteInSupabase(id)) state.favorites.splice(index, 0, id)
    } else {
      state.favorites.push(id)
      if (!await addFavoriteInSupabase(id)) {
        const addedIndex = state.favorites.indexOf(id)
        if (addedIndex >= 0) state.favorites.splice(addedIndex, 1)
      }
    }
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
    const locationSource = scope.locationSource
      ?? (scope.locationMode === 'current' ? 'current' : 'manual')
    const nextScope: ExploreScope = {
      ...scope,
      location: scope.location.trim(),
      centerCoords: scope.centerCoords ?? null,
      locationSource,
    }

    state.locationMode = nextScope.locationMode
    state.location = nextScope.location
    state.radius = scope.radius
    state.selectedParkId = nextScope.locationMode === 'park' ? nextScope.selectedParkId : null
    state.centerCoords = nextScope.centerCoords ?? null
    state.locationSource = nextScope.locationSource ?? null

    if (hasCoordinates(nextScope.centerCoords) && nextScope.location.trim()) {
      lastUsedScope.value = { ...nextScope, locationSource: 'last-used' }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_SCOPE_KEY, JSON.stringify(lastUsedScope.value))
      }
    }
  }

  /**
   * 探索參加者：報名活動 (原子鎖定名額扣減 + 樂觀更新)
   */
  async function registerEvent(id: string, participantName?: string): Promise<{ success: boolean; message: string }> {
    void participantName

    const targetEvent = sourceEvents.value.find((event) => event.id === id)
    if (targetEvent && targetEvent.spots <= 0) {
      return { success: false, message: '很抱歉，此活動名額已額滿！' }
    }

    // 樂觀更新前端狀態
    const wasRegistered = state.registered.includes(id)
    if (!wasRegistered) {
      state.registered.push(id)
      if (targetEvent && targetEvent.spots > 0) {
        targetEvent.spots = Math.max(0, targetEvent.spots - 1)
      }
    }

    const res = await registerEventInSupabase(id)
    if (!res.success) {
      // 伺服器拒絕時回滾前端狀態
      const idx = state.registered.indexOf(id)
      if (idx >= 0 && !wasRegistered) {
        state.registered.splice(idx, 1)
      }
      if (targetEvent && !wasRegistered) {
        targetEvent.spots += 1
      }
      return res
    }

    if (targetEvent && typeof res.spots === 'number') targetEvent.spots = res.spots

    return { success: true, message: res.message || '報名成功！' }
  }

  /**
   * 探索參加者：取消報名 (原子回補名額 + 樂觀更新)
   */
  async function unregisterEvent(id: string): Promise<{ success: boolean; message: string }> {
    const targetEvent = sourceEvents.value.find((event) => event.id === id)
    const idx = state.registered.indexOf(id)
    if (idx >= 0) {
      state.registered.splice(idx, 1)
      if (targetEvent) {
        targetEvent.spots = Math.min(targetEvent.maxSpots, targetEvent.spots + 1)
      }
    }

    const res = await unregisterEventInSupabase(id)
    if (!res.success) {
      // 回滾
      if (idx >= 0 && !state.registered.includes(id)) {
        state.registered.push(id)
      }
      if (targetEvent && idx >= 0) {
        targetEvent.spots = Math.max(0, targetEvent.spots - 1)
      }
      return res
    }

    if (targetEvent && typeof res.spots === 'number') targetEvent.spots = res.spots

    return { success: true, message: res.message || '已取消報名，名額已釋出。' }
  }

  /**
   * 活動發起人：發布新活動
   */
  async function createEvent(input: Omit<EventItem, 'id' | 'organizer'>, id = `created-${crypto.randomUUID()}`) {
    const liffUser = liffState.profile
    const created: EventItem = {
      ...input,
      id,
      organizer: {
        id: liffUser?.userId,
        name: liffUser?.displayName || 'LINE 使用者',
        role: '活動發起人',
        rating: '5.0',
        organized: 1,
        verified: false,
      },
    }
    const saved = await createEventInSupabase(created)
    if (!state.createdEvents.some((event) => event.id === saved.id)) state.createdEvents.unshift(saved)
    const index = cloudEvents.value.findIndex((event) => event.id === saved.id)
    if (index >= 0) cloudEvents.value[index] = saved
    else if (isCloudLoaded.value) cloudEvents.value.unshift(saved)
    return saved
  }

  /**
   * 活動發起人：取得指定活動之報名名冊
   */
  async function getEventParticipants(eventId: string): Promise<ParticipantItem[]> {
    return await fetchEventParticipants(eventId)
  }

  /**
   * 活動發起人：現場簽到
   */
  async function checkInAttendee(
    eventId: string,
    userId: string,
    status: 'checked_in' | 'absent' | 'pending' = 'checked_in'
  ): Promise<boolean> {
    return await checkInParticipantInSupabase(eventId, userId, status)
  }

  return {
    state: readonly(state),
    events: activeEvents,
    visibleEvents,
    favoriteEvents,
    registeredEvents,
    activityTypes,
    parks,
    isCloudLoaded,
    liffProfile: computed(() => liffState.profile),
    getEvent,
    toggleFavorite,
    setDateFilter,
    setCustomDate,
    setInterest,
    setExploreScope,
    lastUsedScope: readonly(lastUsedScope),
    registerEvent,
    unregisterEvent,
    createEvent,
    getEventParticipants,
    checkInAttendee,
    syncWithCloud,
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
    dateFilter: value.dateFilter,
    interest: value.interest,
    customDate: value.customDate,
    location: value.location,
    radius: value.radius,
    locationMode: value.locationMode,
    selectedParkId: value.selectedParkId,
    centerCoords: value.centerCoords,
    locationSource: value.locationSource,
  }))
}, { deep: true })
