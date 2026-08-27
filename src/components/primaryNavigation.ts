import { Compass, Plus, UserRound } from 'lucide-vue-next'
import type { Component } from 'vue'

export interface PrimaryNavigationItem {
  to: string
  key: 'explore' | 'create' | 'my'
  label: string
  icon: Component
}

export const primaryNavigationItems: PrimaryNavigationItem[] = [
  { to: '/explore', key: 'explore', label: '探索', icon: Compass },
  { to: '/create', key: 'create', label: '發起', icon: Plus },
  { to: '/my', key: 'my', label: '我的', icon: UserRound },
]
