import type { DateFilter, EventType } from '@/data/events'

export type ExploreRadius = 1 | 3 | 5 | 10
export type ExploreLocationMode = 'current' | 'district' | 'park'

export interface ExploreScope {
  locationMode: ExploreLocationMode
  location: string
  radius: ExploreRadius
  selectedParkId: string | null
  centerCoords?: { lat: number; lng: number } | null
}

export interface ExploreFilters {
  dateFilter: DateFilter
  customDate: string | null
  interest: EventType | '全部'
}
