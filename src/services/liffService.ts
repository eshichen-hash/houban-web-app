import liff from '@line/liff'
import { reactive, readonly } from 'vue'
import type { EventItem } from '@/data/events'

export interface LiffUserProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

interface LiffState {
  isInitialized: boolean
  isInClient: boolean
  isLoggedIn: boolean
  profile: LiffUserProfile | null
  error: string | null
}

const state = reactive<LiffState>({
  isInitialized: false,
  isInClient: false,
  isLoggedIn: false,
  profile: {
    userId: 'user-me',
    displayName: '林淑芬',
    pictureUrl: '',
  },
  error: null,
})

export async function initLiff(): Promise<void> {
  const liffId = import.meta.env.VITE_LIFF_ID as string | undefined

  if (!liffId || !liffId.trim()) {
    state.isInitialized = true
    state.isInClient = false
    state.isLoggedIn = false
    return
  }

  try {
    await liff.init({ liffId })
    state.isInitialized = true
    state.isInClient = liff.isInClient()

    if (liff.isLoggedIn()) {
      state.isLoggedIn = true
      try {
        const profile = await liff.getProfile()
        state.profile = {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
        }
      } catch (err) {
        console.warn('Failed to get LIFF profile:', err)
      }
    } else if (liff.isInClient()) {
      // 在 LINE 內部環境若未登入，可自動觸發
    }
  } catch (err) {
    state.isInitialized = true
    state.error = err instanceof Error ? err.message : String(err)
    console.warn('LIFF init failed (running in fallback web mode):', err)
  }
}

export async function shareActivityToLine(event: EventItem): Promise<{ success: boolean; message: string }> {
  const activityUrl = `${window.location.origin}/activity/${event.id}`

  // 1. 嘗試使用 LINE ShareTargetPicker (LINE 官方原生好友/群組發送)
  if (state.isInitialized && liff.isApiAvailable('shareTargetPicker')) {
    try {
      const res = await liff.shareTargetPicker([
        {
          type: 'flex',
          altText: `【公園好伴】邀您一起參加：${event.title}`,
          contents: {
            type: 'bubble',
            hero: event.image
              ? {
                  type: 'image',
                  url: event.image,
                  size: 'full',
                  aspectRatio: '16:9',
                  aspectMode: 'cover',
                }
              : undefined,
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '公園好伴・邀您一起運動',
                  size: 'xs',
                  color: '#2b5e40',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: event.title,
                  weight: 'bold',
                  size: 'lg',
                  margin: 'md',
                  wrap: true,
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'lg',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: `⏰ 時間：${event.dateLabel}・${event.time}`,
                      size: 'sm',
                      color: '#475569',
                      wrap: true,
                    },
                    {
                      type: 'text',
                      text: `📍 地點：${event.park.name}`,
                      size: 'sm',
                      color: '#475569',
                      wrap: true,
                    },
                    {
                      type: 'text',
                      text: `👥 名額：尚有 ${event.spots} 個名額（${event.cost}）`,
                      size: 'sm',
                      color: '#475569',
                      wrap: true,
                    },
                  ],
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#2b5e40',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: '查看活動詳情與報名',
                    uri: activityUrl,
                  },
                },
              ],
            },
          } as any,
        },
      ])

      if (res) {
        return { success: true, message: '已成功分享給 LINE 好友！' }
      }
    } catch (pickerErr) {
      console.warn('shareTargetPicker cancelled or failed:', pickerErr)
    }
  }

  // 2. Fallback: 使用瀏覽器原生 Web Share API
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `【公園好伴】${event.title}`,
        text: `邀你一起參加「${event.title}」！\n時間：${event.dateLabel}・${event.time}\n地點：${event.park.name}`,
        url: activityUrl,
      })
      return { success: true, message: '已開啟分享面板' }
    } catch {
      // 使用者手動取消分享
    }
  }

  // 3. Fallback: 複製連結至剪貼簿
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(activityUrl)
      return { success: true, message: '已複製活動連結，可直接貼到 LINE 聊天室！' }
    }
  } catch (clipErr) {
    console.warn('Clipboard write failed:', clipErr)
  }

  return { success: true, message: `活動連結：${activityUrl}` }
}

export function useLiff() {
  return {
    liffState: readonly(state),
    initLiff,
    shareActivityToLine,
  }
}
