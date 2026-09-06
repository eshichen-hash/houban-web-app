import { supabase } from './supabase'

export interface RegistrationRow {
  id: string
  event_id: string
  user_id: string
  user_name: string | null
  user_avatar?: string | null
  check_in_status?: 'pending' | 'checked_in' | 'absent' | string
  status: string
  created_at?: string
}

export interface FavoriteRow {
  id: string
  event_id: string
  user_id: string
  created_at?: string
}

export interface ParticipantItem {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  checkInStatus: 'pending' | 'checked_in' | 'absent' | string
  registeredAt: string
}

export async function fetchMyRegistrations(userId: string = 'user-me'): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('event_id')
      .eq('user_id', userId)
      .eq('status', 'confirmed')

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

/**
 * 探索參加者：使用原子交易 (RPC) 報名活動，自動鎖定名額並扣減
 */
export async function registerEventInSupabase(
  eventId: string,
  userId: string = 'user-me',
  userName: string = '林淑芬',
  userAvatar?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('register_event_atomic', {
      p_event_id: eventId,
      p_user_id: userId,
      p_user_name: userName,
      p_user_avatar: userAvatar || null,
    })

    if (error) {
      console.error('Supabase register atomic RPC error:', error)
      return { success: false, message: error.message || '報名失敗，請稍後再試' }
    }

    const res = data as { success: boolean; message: string }
    return res || { success: true, message: '報名成功' }
  } catch (err: any) {
    console.error('Failed to register event in Supabase:', err)
    return { success: false, message: err?.message || '報名連線失敗' }
  }
}

/**
 * 探索參加者：使用原子交易 (RPC) 取消報名，自動回補活動名額
 */
export async function unregisterEventInSupabase(
  eventId: string,
  userId: string = 'user-me'
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('cancel_event_atomic', {
      p_event_id: eventId,
      p_user_id: userId,
    })

    if (error) {
      console.error('Supabase unregister atomic RPC error:', error)
      return { success: false, message: error.message || '取消報名失敗' }
    }

    const res = data as { success: boolean; message: string }
    return res || { success: true, message: '已取消報名' }
  } catch (err: any) {
    console.error('Failed to unregister event in Supabase:', err)
    return { success: false, message: err?.message || '取消連線失敗' }
  }
}

/**
 * 活動發起人：查閱特定活動的報名名冊與簽到狀態
 */
export async function fetchEventParticipants(eventId: string): Promise<ParticipantItem[]> {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('id, user_id, user_name, user_avatar, check_in_status, created_at')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase fetch participants error:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || '熱心夥伴',
      userAvatar: row.user_avatar || undefined,
      checkInStatus: row.check_in_status || 'pending',
      registeredAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
    }))
  } catch (err) {
    console.error('Failed to fetch participants from Supabase:', err)
    return []
  }
}

/**
 * 活動發起人：更新參加者現場簽到狀態 (checked_in / absent / pending)
 */
export async function checkInParticipantInSupabase(
  eventId: string,
  userId: string,
  status: 'checked_in' | 'absent' | 'pending' = 'checked_in'
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('check_in_participant', {
      p_event_id: eventId,
      p_user_id: userId,
      p_status: status,
    })

    if (error) {
      console.error('Supabase check-in error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to check in participant in Supabase:', err)
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
    const { error } = await supabase.from('favorites').upsert(
      {
        event_id: eventId,
        user_id: userId,
      },
      { onConflict: 'user_id,event_id' }
    )

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

