import { supabase } from './supabase'
import type { EventItem, Park, Difficulty, Cost, EventType } from '@/data/events'

export interface EventRow {
  id: string
  title: string
  type: string
  difficulty: string
  date_key: string
  iso_date: string
  date_label: string
  time: string
  park_id: string | null
  park_name: string | null
  park_district: string | null
  park_address: string | null
  park_meeting: string | null
  park_lat: number | null
  park_lng: number | null
  spots: number
  max_spots: number
  cost: string
  audience: string | null
  description: string | null
  items: string | null
  image: string | null
  image_alt: string | null
  organizer_id: string | null
  organizer_name: string | null
  organizer_role: string | null
  organizer_rating: string | null
  organizer_verified: boolean | null
  status: string | null
  created_at?: string
}

export function mapRowToEvent(row: EventRow): EventItem {
  const park: Park = {
    id: row.park_id || 'custom-park',
    name: row.park_name || '探索公園',
    district: row.park_district || '',
    address: row.park_address || '',
    meeting: row.park_meeting || '入口處',
    lat: row.park_lat || undefined,
    lng: row.park_lng || undefined,
  }

  return {
    id: row.id,
    title: row.title,
    type: (row.type || '健走') as EventType,
    difficulty: (row.difficulty || '輕鬆') as Difficulty,
    dateKey: (row.date_key || 'today') as 'today' | 'tomorrow' | 'week',
    isoDate: row.iso_date,
    dateLabel: row.date_label || '今天',
    time: row.time,
    park,
    spots: Number(row.spots ?? 6),
    maxSpots: Number(row.max_spots ?? 12),
    cost: (row.cost || '免費') as Cost,
    audience: row.audience || '一般長輩與社區居民',
    description: row.description || '',
    items: row.items || '自備飲用水',
    image: row.image || undefined,
    imageAlt: row.image_alt || row.title,
    organizer: {
      name: row.organizer_name || '活動發起人',
      role: row.organizer_role || '發起人',
      rating: row.organizer_rating || '5.0',
      organized: 1,
      verified: Boolean(row.organizer_verified),
    },
  }
}

export function mapEventToRow(event: EventItem, status: string = 'active'): EventRow {
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    difficulty: event.difficulty,
    date_key: event.dateKey,
    iso_date: event.isoDate || new Date().toISOString().split('T')[0],
    date_label: event.dateLabel || '今天',
    time: event.time,
    park_id: event.park.id,
    park_name: event.park.name,
    park_district: event.park.district,
    park_address: event.park.address,
    park_meeting: event.park.meeting,
    park_lat: event.park.lat || null,
    park_lng: event.park.lng || null,
    spots: event.spots ?? 6,
    max_spots: event.maxSpots ?? 12,
    cost: event.cost || '免費',
    audience: event.audience,
    description: event.description,
    items: event.items,
    image: event.image || null,
    image_alt: event.imageAlt || null,
    organizer_id: 'user-me',
    organizer_name: event.organizer?.name || '我',
    organizer_role: event.organizer?.role || '活動發起人',
    organizer_rating: event.organizer?.rating || '5.0',
    organizer_verified: event.organizer?.verified ?? true,
    status,
  }
}

export async function fetchEventsFromSupabase(): Promise<EventItem[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase fetch events error:', error.message)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return (data as EventRow[]).map(mapRowToEvent)
  } catch (err) {
    console.warn('Failed to fetch events from Supabase:', err)
    return []
  }
}

export async function createEventInSupabase(event: EventItem): Promise<boolean> {
  try {
    const row = mapEventToRow(event, 'active')
    const { error } = await supabase.from('events').upsert(row)
    if (error) {
      console.error('Supabase create event error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to create event in Supabase:', err)
    return false
  }
}

export async function updateEventStatusInSupabase(id: string, status: 'active' | 'ended' | 'cancelled'): Promise<boolean> {
  try {
    const { error } = await supabase.from('events').update({ status }).eq('id', id)
    if (error) {
      console.error('Supabase update event status error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to update event status in Supabase:', err)
    return false
  }
}

export async function updateEventInSupabase(id: string, updates: Partial<EventRow>): Promise<boolean> {
  try {
    const { error } = await supabase.from('events').update(updates).eq('id', id)
    if (error) {
      console.error('Supabase update event error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to update event in Supabase:', err)
    return false
  }
}
