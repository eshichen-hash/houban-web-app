import type { EventItem } from '@/data/events'
import { addCalendarDays, eventDateTime, parseStoredTimeRange } from './eventDateTime'

/**
 * 解析活動的起始與結束時間 Date 物件
 */
export function parseEventDateTimeRange(event: EventItem): { start: Date; end: Date } {
  const range = parseStoredTimeRange(event.time)
  const start = eventDateTime(event.isoDate, range.startTime)
  const end = eventDateTime(addCalendarDays(event.isoDate, range.endDayOffset), range.endTime)
  if (end.getTime() <= start.getTime()) throw new Error('活動結束時間須晚於開始時間')
  return { start, end }
}

/**
 * 格式化為 UTC 格式：YYYYMMDDTHHMMSSZ (RFC 5545 / Google Calendar)
 */
function formatDateToUTCString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

/**
 * 格式化為本地格式：YYYYMMDDTHHMMSS
 */
function formatDateToLocalString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/**
 * 產生 Google Calendar 直接加入連結
 */
export function generateGoogleCalendarUrl(event: EventItem): string {
  const { start, end } = parseEventDateTimeRange(event)
  const startUTC = formatDateToUTCString(start)
  const endUTC = formatDateToUTCString(end)

  const title = `【公園好伴】${event.title}`
  const location = `${event.park.name}（集合點：${event.park.meeting}，地址：${event.park.address}）`
  const details = [
    `活動名稱：${event.title}`,
    `集合地點：${event.park.meeting}`,
    `公園地址：${event.park.address}`,
    `攜帶物品：${event.items || '自備飲用水'}`,
    `活動費用：${event.cost || '免費'}`,
    `活動發起人：${event.organizer.name}`,
    `活動詳情網址：${window.location.origin}/activity/${event.id}`,
    '',
    '💡 提醒您：建議提前 10 分鐘抵達集合地點。',
  ].join('\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUTC}/${endUTC}`,
    details: details,
    location: location,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * 產生標準 iCalendar (.ics) 內容，支援 Apple 日曆、Outlook 與手機日曆直接匯入
 */
export function generateIcsContent(event: EventItem): string {
  const { start, end } = parseEventDateTimeRange(event)
  const startStr = formatDateToUTCString(start)
  const endStr = formatDateToUTCString(end)
  const nowStr = formatDateToUTCString(new Date())

  const uid = `houban-${event.id}-${Date.now()}@houban.app`
  const summary = `【公園好伴】${event.title}`
  const location = `${event.park.name} - ${event.park.meeting} (${event.park.address})`
  const description = [
    `活動名稱：${event.title}`,
    `集合地點：${event.park.meeting}`,
    `公園地址：${event.park.address}`,
    `攜帶物品：${event.items || '自備飲用水'}`,
    `活動費用：${event.cost || '免費'}`,
    `活動發起人：${event.organizer.name}`,
    `活動詳情：${window.location.origin}/activity/${event.id}`,
    '\\n💡 提醒您：建議提前 10 分鐘抵達集合地點。',
  ].join('\\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Houban//Park Good Companion//TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:活動即將在 1 小時後開始，請準備出發！',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * 下載 .ics 檔案觸發手機原生 Apple 日曆 / 系統行事曆加入
 */
export function downloadIcsCalendar(event: EventItem): void {
  const icsContent = generateIcsContent(event)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `houban-${event.title.replace(/\s+/g, '_')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
