import type { DateFilter, EventItem } from '@/data/events'

export const EVENT_TIME_ZONE = 'Asia/Taipei'

export function taipeiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function addCalendarDays(value: string, days: number): string {
  if (!isValidDate(value)) throw new Error('請選擇有效的活動日期')
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function timeMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  return hour < 24 && minute < 60 ? hour * 60 + minute : null
}

export function eventDateTime(isoDate: string, time: string): Date {
  if (!isValidDate(isoDate) || timeMinutes(time) === null) throw new Error('活動日期或時間無效，請重新確認')
  return new Date(`${isoDate}T${time}:00+08:00`)
}

export function formatEventDate(isoDate: string, now = new Date()): string {
  if (!isValidDate(isoDate)) return '請選擇活動日期'
  const label = new Intl.DateTimeFormat('zh-TW', {
    timeZone: EVENT_TIME_ZONE, month: 'long', day: 'numeric',
  }).format(eventDateTime(isoDate, '12:00'))
  const today = taipeiDate(now)
  if (isoDate === today) return `今天・${label}`
  if (isoDate === addCalendarDays(today, 1)) return `明天・${label}`
  return label
}

export function eventDateKey(isoDate: string, now = new Date()): EventItem['dateKey'] {
  const today = taipeiDate(now)
  return isoDate === today ? 'today' : isoDate === addCalendarDays(today, 1) ? 'tomorrow' : 'week'
}

export function matchesEventDate(
  event: Pick<EventItem, 'isoDate'>,
  filter: DateFilter,
  customDate: string | null,
  now = new Date(),
): boolean {
  if (!isValidDate(event.isoDate)) return false
  const today = taipeiDate(now)
  if (filter === 'today') return event.isoDate === today
  if (filter === 'tomorrow') return event.isoDate === addCalendarDays(today, 1)
  if (filter === 'custom') return Boolean(customDate && event.isoDate === customDate)
  // 本週指今天到本週日，而非所有日期或未來七天。
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
  const sunday = addCalendarDays(today, (7 - weekday) % 7)
  return event.isoDate >= today && event.isoDate <= sunday
}

export function formatTimeRange(startTime: string, endTime: string): string {
  const format = (value: string) => {
    const minutes = timeMinutes(value)
    if (minutes === null) return ''
    const hour = Math.floor(minutes / 60)
    return `${hour < 12 ? '上午' : '下午'} ${hour % 12 || 12}:${value.slice(3)}`
  }
  const start = format(startTime)
  const end = format(endTime)
  if (!start || !end) return '請設定活動時間'
  const period = start.split(' ')[0]
  return `${start}－${end.startsWith(`${period} `) ? end.slice(period.length + 1) : end}`
}

type Period = 'am' | 'pm'

function parseTimePart(value: string, inheritedPeriod?: Period) {
  const match = value.trim().match(/^(上午|早上|晨|下午|傍晚|晚上|am|pm)?\s*(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (!match) throw new Error('活動時間格式無法辨識，請先編輯活動時間')
  const label = (match[1] || match[4] || '').toLowerCase()
  const period: Period | undefined = label
    ? /^(下午|傍晚|晚上|pm)$/.test(label) ? 'pm' : 'am'
    : inheritedPeriod
  let hour = Number(match[2])
  const minute = Number(match[3])
  if (minute > 59 || hour > 23 || (period && (hour < 1 || hour > 12))) {
    throw new Error('活動時間無效，請先編輯活動時間')
  }
  if (period === 'am') hour %= 12
  if (period === 'pm') hour = hour % 12 + 12
  return { minutes: hour * 60 + minute, period }
}

/** 舊資料的顯示字串只在這個邊界解析；新表單保留 24 小時制開始／結束值。 */
export function parseStoredTimeRange(value: string): { startTime: string; endTime: string; endDayOffset: number } {
  const parts = value.split(/[－–~～至到-]/)
  if (parts.length > 2) throw new Error('活動時間格式無法辨識，請先編輯活動時間')
  const start = parseTimePart(parts[0])
  const endMinutes = parts.length === 2 ? parseTimePart(parts[1], start.period).minutes : (start.minutes + 60) % 1440
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  return {
    startTime: format(start.minutes), endTime: format(endMinutes),
    endDayOffset: endMinutes < start.minutes ? 1 : 0,
  }
}
