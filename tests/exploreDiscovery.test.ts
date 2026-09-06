import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { eventSeed, type DateFilter, type EventItem, type EventType } from '@/data/events'
import type { ExploreScope } from '@/types/explore'
import { useExploreDiscovery } from '@/composables/useExploreDiscovery'

const mockEvents = ref<EventItem[]>([])
const mockState = reactive<ExploreScope & { dateFilter: DateFilter; interest: EventType | '全部'; customDate: string | null }>({
  location: '', locationMode: 'current', radius: 3, selectedParkId: null, centerCoords: null,
  dateFilter: 'today', interest: '全部', customDate: null,
})
vi.mock('@/composables/useAppState', () => ({ useAppState: () => ({
  events: mockEvents, state: mockState, activityTypes: [], parks: [],
  toggleFavorite: vi.fn(), setDateFilter: vi.fn(), setCustomDate: vi.fn(), setInterest: vi.fn(), setExploreScope: vi.fn(),
}) }))

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-06T08:00:00+08:00'))
  Object.assign(mockState, { location: '', locationMode: 'current', radius: 3, selectedParkId: null, centerCoords: null, dateFilter: 'today', interest: '全部', customDate: null })
  mockEvents.value = [
    { ...eventSeed[0], id: 'yesterday', isoDate: '2026-09-05', dateKey: 'today' },
    { ...eventSeed[0], id: 'today', isoDate: '2026-09-06', dateKey: 'tomorrow' },
    { ...eventSeed[1], id: 'tomorrow', isoDate: '2026-09-07', dateKey: 'today' },
  ]
})
afterEach(() => vi.useRealTimers())

describe('探索頁日期與範圍整合', () => {
  it('今日推薦與列表以實際日期為準，忽略資料庫過時的 today 標記', () => {
    const discovery = useExploreDiscovery()
    expect(discovery.recommendedEvents.value.map((event) => event.id)).toEqual(['today'])
    expect(discovery.filteredEvents.value.map((event) => event.id)).toEqual(['today'])
  })

  it('週日的本週只包含當日，不把下週活動一併列入', () => {
    mockState.dateFilter = 'week'
    expect(useExploreDiscovery().filteredEvents.value.map((event) => event.id)).toEqual(['today'])
  })

  it('窄篩選只影響結果列表，不壓縮今日推薦', () => {
    mockState.dateFilter = 'tomorrow'; mockState.interest = eventSeed[1].type
    const discovery = useExploreDiscovery()
    expect(discovery.recommendedEvents.value.map((event) => event.id)).toEqual(['today'])
    expect(discovery.filteredEvents.value.map((event) => event.id)).toEqual(['tomorrow'])
  })

  it('有範圍設定時，不把缺少座標與距離的活動當作 0 公里', () => {
    mockState.location = '測試搜尋中心'; mockState.centerCoords = { lat: 25, lng: 121 }
    mockEvents.value = [
      { ...eventSeed[0], id: 'unknown', isoDate: '2026-09-06', distanceKm: undefined, park: { ...eventSeed[0].park, lat: undefined, lng: undefined } },
      { ...eventSeed[0], id: 'nearby', isoDate: '2026-09-06', park: { ...eventSeed[0].park, lat: 25, lng: 121 } },
    ]
    expect(useExploreDiscovery().filteredEvents.value.map((event) => event.id)).toEqual(['nearby'])
  })
})
