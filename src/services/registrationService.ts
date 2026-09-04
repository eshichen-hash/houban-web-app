import { supabase } from './supabase'

export interface RegistrationRow {
  id: string
  event_id: string
  user_id: string
  user_name: string | null
  status: string
  created_at?: string
}

export interface FavoriteRow {
  id: string
  event_id: string
  user_id: string
  created_at?: string
}

export async function fetchMyRegistrations(userId: string = 'user-me'): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('event_id')
      .eq('user_id', userId)

    if (error) {
      console.warn('Supabase fetch registrations error:', error.message)
      return []
    }

    return (data || []).map((r) => r.event_id)
  } catch (err) {
    console.warn('Failed to fetch registrations from Supabase:', err)
    return []
  }
}

export async function registerEventInSupabase(
  eventId: string,
  userId: string = 'user-me',
  userName: string = '林淑芬'
): Promise<boolean> {
  try {
    const { error } = await supabase.from('registrations').insert({
      event_id: eventId,
      user_id: userId,
      user_name: userName,
      status: 'confirmed',
    })

    if (error) {
      console.error('Supabase register error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to register event in Supabase:', err)
    return false
  }
}

export async function unregisterEventInSupabase(
  eventId: string,
  userId: string = 'user-me'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase unregister error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to unregister event in Supabase:', err)
    return false
  }
}

export async function fetchMyFavorites(userId: string = 'user-me'): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('event_id')
      .eq('user_id', userId)

    if (error) {
      console.warn('Supabase fetch favorites error:', error.message)
      return []
    }

    return (data || []).map((f) => f.event_id)
  } catch (err) {
    console.warn('Failed to fetch favorites from Supabase:', err)
    return []
  }
}

export async function addFavoriteInSupabase(
  eventId: string,
  userId: string = 'user-me'
): Promise<boolean> {
  try {
    const { error } = await supabase.from('favorites').insert({
      event_id: eventId,
      user_id: userId,
    })

    if (error) {
      console.error('Supabase add favorite error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to add favorite in Supabase:', err)
    return false
  }
}

export async function removeFavoriteInSupabase(
  eventId: string,
  userId: string = 'user-me'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase remove favorite error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to remove favorite in Supabase:', err)
    return false
  }
}
