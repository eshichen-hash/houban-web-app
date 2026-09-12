import { computed, shallowRef } from 'vue'
import { useAppState } from '@/composables/useAppState'
import { hasValidExploreCoordinates } from '@/composables/useCurrentLocation'
import type { DateFilter, EventItem } from '@/data/events'
import type { ExploreFilters, ExploreScope } from '@/types/explore'
import { matchesEventDate } from '@/utils/eventDateTime'

const PAGE_SIZE = 6

function matchesDate(event: EventItem, dateFilter: DateFilter, customDate: string | null) {
  return matchesEventDate(event, dateFilter, customDate)
}

function computeHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球半徑 (公里)
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function matchesScope(event: EventItem, scope: ExploreScope) {
  // 1. 若為選定特定公園名稱且精確符合，優先視為 0 公里直接符合
  if (scope.locationMode === 'park' && scope.selectedParkId) {
    if (event.park.id === scope.selectedParkId || event.park.name === scope.selectedParkId) {
      return true
    }
  }

  // 2. 若有中心點座標 (centerCoords) 且活動公園也有座標 (lat, lng)，使用球面距離精準過濾全台活動
  if (scope.centerCoords && typeof scope.centerCoords.lat === 'number' && typeof scope.centerCoords.lng === 'number') {
    if (typeof event.park.lat === 'number' && typeof event.park.lng === 'number') {
      const dist = computeHaversineDistanceKm(
        scope.centerCoords.lat,
        scope.centerCoords.lng,
        event.park.lat,
        event.park.lng
      )
      return dist <= scope.radius
    }
  }

  // 3. 指定公園但缺少座標時，仍只接受精確的公園 ID／名稱；
  //    不把活動的示意 distanceKm 當成使用者的實際距離。
  if (scope.locationMode === 'park' && scope.selectedParkId) {
    return event.park.id === scope.selectedParkId || event.park.name === scope.selectedParkId
  }

  // 4. 區域／目前位置沒有可信座標時，不顯示距離範圍結果。
  return false
}

function formatCustomDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function useExploreDiscovery() {
  const {
    events,
    state,
    activityTypes,
    parks,
    lastUsedScope,
    toggleFavorite,
    setDateFilter,
    setCustomDate,
    setInterest,
    setExploreScope,
  } = useAppState()

  const visibleLimit = shallowRef(PAGE_SIZE)

  const appliedScope = computed<ExploreScope>(() => ({
    locationMode: state.locationMode,
    location: state.location,
    radius: state.radius,
    selectedParkId: state.selectedParkId,
    centerCoords: state.centerCoords,
    locationSource: state.locationSource,
  }))

  const hasValidScope = computed(() => Boolean(
    appliedScope.value.location.trim()
      && hasValidExploreCoordinates(appliedScope.value)
  ))

  const appliedFilters = computed<ExploreFilters>(() => ({
    dateFilter: state.dateFilter,
    customDate: state.customDate,
    interest: state.interest,
  }))

  const scopedEvents = computed(() => hasValidScope.value
    ? events.value.filter((event) => matchesScope(event, appliedScope.value))
    : [])

  const recommendedEvents = computed(() => scopedEvents.value
    .filter((event) => matchesDate(event, 'today', null))
    .slice(0, 3))

  const filteredEvents = computed(() => scopedEvents.value.filter((event) => {
    const dateMatch = matchesDate(event, state.dateFilter, state.customDate)
    const interestMatch = state.interest === '全部' || event.type === state.interest
    return dateMatch && interestMatch
  }))

  const visibleResults = computed(() => filteredEvents.value.slice(0, visibleLimit.value))
  const hasMoreResults = computed(() => visibleResults.value.length < filteredEvents.value.length)

  const scopeSummary = computed(() => {
    if (!hasValidScope.value) return ''
    if (state.locationMode === 'park' && state.selectedParkId) {
      return parks.find((park) => park.id === state.selectedParkId)?.name ?? state.selectedParkId
    }
    return state.location || ''
  })

  const dateLabel = computed(() => {
    if (state.dateFilter === 'custom' && state.customDate) return formatCustomDate(state.customDate)
    if (state.dateFilter === 'tomorrow') return '明天'
    if (state.dateFilter === 'week') return '本週'
    return '今天'
  })

  const filterSummary = computed(() => `${dateLabel.value}・${state.interest === '全部' ? '全部興趣' : state.interest}`)

  function countForScope(scope: ExploreScope) {
    if (!scope.location.trim() || !hasValidExploreCoordinates(scope)) return 0
    return events.value.filter((event) => {
      const dateMatch = matchesDate(event, state.dateFilter, state.customDate)
      const interestMatch = state.interest === '全部' || event.type === state.interest
      return matchesScope(event, scope) && dateMatch && interestMatch
    }).length
  }

  function countForFilters(filters: ExploreFilters) {
    return scopedEvents.value.filter((event) => {
      const dateMatch = matchesDate(event, filters.dateFilter, filters.customDate)
      const interestMatch = filters.interest === '全部' || event.type === filters.interest
      return dateMatch && interestMatch
    }).length
  }

  function applyScope(scope: ExploreScope) {
    setExploreScope(scope)
    visibleLimit.value = PAGE_SIZE
  }

  function applyFilters(filters: ExploreFilters) {
    if (filters.dateFilter === 'custom' && filters.customDate) setCustomDate(filters.customDate)
    else setDateFilter(filters.dateFilter === 'custom' ? 'today' : filters.dateFilter)
    setInterest(filters.interest)
    visibleLimit.value = PAGE_SIZE
  }

  function showMoreResults() {
    visibleLimit.value = Math.min(visibleLimit.value + PAGE_SIZE, filteredEvents.value.length)
  }

  return {
    state,
    activityTypes,
    parks,
    lastUsedScope,
    appliedScope,
    hasValidScope,
    appliedFilters,
    scopeSummary,
    filterSummary,
    recommendedEvents,
    filteredEvents,
    visibleResults,
    hasMoreResults,
    countForScope,
    countForFilters,
    applyScope,
    applyFilters,
    showMoreResults,
    toggleFavorite,
  }
}
