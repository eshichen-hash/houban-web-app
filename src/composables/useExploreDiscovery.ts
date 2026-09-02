import { computed, shallowRef } from 'vue'
import { useAppState } from '@/composables/useAppState'
import type { DateFilter, EventItem } from '@/data/events'
import type { ExploreFilters, ExploreScope } from '@/types/explore'

const PAGE_SIZE = 6

function matchesDate(event: EventItem, dateFilter: DateFilter, customDate: string | null) {
  if (dateFilter === 'week') return true
  if (dateFilter === 'custom') return Boolean(customDate && event.isoDate === customDate)
  return event.dateKey === dateFilter
}

function matchesScope(event: EventItem, scope: ExploreScope) {
  if (scope.locationMode === 'park' && scope.selectedParkId) {
    return event.park.id === scope.selectedParkId
  }

  if (scope.locationMode === 'district') {
    return event.park.district.endsWith(scope.location) && (event.distanceKm ?? 0) <= scope.radius
  }

  return (event.distanceKm ?? 0) <= scope.radius
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
  }))

  const appliedFilters = computed<ExploreFilters>(() => ({
    dateFilter: state.dateFilter,
    customDate: state.customDate,
    interest: state.interest,
  }))

  const scopedEvents = computed(() => events.value.filter((event) => matchesScope(event, appliedScope.value)))

  const recommendedEvents = computed(() => scopedEvents.value
    .filter((event) => event.dateKey === 'today')
    .slice(0, 3))

  const filteredEvents = computed(() => scopedEvents.value.filter((event) => {
    const dateMatch = matchesDate(event, state.dateFilter, state.customDate)
    const interestMatch = state.interest === '全部' || event.type === state.interest
    return dateMatch && interestMatch
  }))

  const visibleResults = computed(() => filteredEvents.value.slice(0, visibleLimit.value))
  const hasMoreResults = computed(() => visibleResults.value.length < filteredEvents.value.length)

  const scopeSummary = computed(() => {
    if (state.locationMode === 'park' && state.selectedParkId) {
      return parks.find((park) => park.id === state.selectedParkId)?.name ?? state.location
    }
    return state.location
  })

  const dateLabel = computed(() => {
    if (state.dateFilter === 'custom' && state.customDate) return formatCustomDate(state.customDate)
    if (state.dateFilter === 'tomorrow') return '明天'
    if (state.dateFilter === 'week') return '本週'
    return '今天'
  })

  const filterSummary = computed(() => `${dateLabel.value}・${state.interest === '全部' ? '全部興趣' : state.interest}`)

  function countForScope(scope: ExploreScope) {
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
    appliedScope,
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
