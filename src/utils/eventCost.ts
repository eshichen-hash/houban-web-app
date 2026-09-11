import type { EventItem } from '@/data/events'
export function formatEventCost(event: Pick<EventItem, 'cost' | 'costAmount'>): string {
  return event.cost === '免費' ? '免費' : event.costAmount ? `每人 NT$${event.costAmount.toLocaleString('zh-TW')}` : '付費（請洽主辦人）'
}
