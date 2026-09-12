import { Bell, CalendarDays, Compass, PlusCircle } from 'lucide-vue-next'
import type { Component } from 'vue'

export type LineMenuSlot = 'a' | 'b' | 'c' | 'd'
export type LineMenuTone = 'primary' | 'green' | 'sun' | 'wordmark'

export interface LineMenuItem {
  slot: LineMenuSlot
  label: string
  detail: string
  path: string
  tone: LineMenuTone
  icon: Component
}

/**
 * LINE 圖文選單只保留最高頻、可直接理解的入口；活動詳情與報名流程
 * 由活動卡片／通知帶入，避免把圖文選單變成流程清單。
 */
export const lineMenuItems: LineMenuItem[] = [
  {
    slot: 'a',
    label: '找活動',
    detail: '探索附近適合的活動',
    path: '/explore',
    tone: 'primary',
    icon: Compass,
  },
  {
    slot: 'b',
    label: '我的行程',
    detail: '查看已報名與收藏',
    path: '/my',
    tone: 'green',
    icon: CalendarDays,
  },
  {
    slot: 'c',
    label: '發起活動',
    detail: '邀請鄰里一起出門',
    path: '/create',
    tone: 'sun',
    icon: PlusCircle,
  },
  {
    slot: 'd',
    label: '活動通知',
    detail: '掌握時間與集合提醒',
    path: '/notifications',
    tone: 'wordmark',
    icon: Bell,
  },
]

export interface LineMenuPageOption {
  label: string
  path: string
  reason: string
  kind: 'menu' | 'deep-link' | 'secondary'
}

export interface LineMenuFormat {
  size: '大' | '小'
  dimensions: string[]
  usage: string
}

export const lineMenuFormats: LineMenuFormat[] = [
  {
    size: '大',
    dimensions: ['2500 × 1686 px', '1200 × 810 px', '800 × 540 px'],
    usage: '適合目前的 4 個入口與較完整的圖示／文字層級。',
  },
  {
    size: '小',
    dimensions: ['2500 × 843 px', '1200 × 405 px', '800 × 270 px'],
    usage: '適合只保留少數入口，或需要讓聊天內容露出更多的版本。',
  },
]

export const lineMenuPageOptions: LineMenuPageOption[] = [
  { label: '探索活動', path: '/explore', reason: '所有人最常用的第一入口', kind: 'menu' },
  { label: '我的行程', path: '/my', reason: '回看已報名活動與收藏', kind: 'menu' },
  { label: '發起活動', path: '/create', reason: '讓使用者邀請鄰里一起參加', kind: 'menu' },
  { label: '活動通知', path: '/notifications', reason: '查看活動時間、集合點與提醒', kind: 'menu' },
  { label: '公園活動', path: '/park/:id', reason: '從探索結果或公園卡片進入', kind: 'deep-link' },
  { label: '活動詳情', path: '/activity/:id', reason: '從活動卡片、通知或分享連結進入', kind: 'deep-link' },
  { label: '報名確認／成功', path: '/registration/:id → /success/:id', reason: '只在報名流程中出現', kind: 'deep-link' },
  { label: '活動管理', path: '/manage', reason: '僅對已發起活動的使用者提供', kind: 'secondary' },
]
