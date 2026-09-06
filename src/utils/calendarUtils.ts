import type { EventItem } from '@/data/events'

/**
 * 解析活動的起始與結束時間 Date 物件
 */
export function parseEventDateTimeRange(event: EventItem): { start: Date; end: Date } {
  // 1. 取得日期基準
  const today = new Date()
  let dateStr = event.isoDate

  if (!dateStr) {
    if (event.dateKey === 'tomorrow') {
      const tm = new Date(today)
      tm.setDate(tm.getDate() + 1)
      dateStr = tm.toISOString().split('T')[0]
    } else {
      dateStr = today.toISOString().split('T')[0]
    }
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = parseInt(yearStr, 10) || today.getFullYear()
  const month = (parseInt(monthStr, 10) || (today.getMonth() + 1)) - 1
  const day = parseInt(dayStr, 10) || today.getDate()

  // 2. 解析時間（處理「上午 9:00－10:00」、「下午 2:00－3:30」、「09:00」等格式）
  let startHour = 9
  let startMin = 0
  let endHour = 10
  let endMin = 0

  const rawTime = event.time || '上午 9:00－10:00'
  const isPM = rawTime.includes('下午') || rawTime.includes('傍晚') || rawTime.includes('晚上') || rawTime.includes('PM') || rawTime.includes('pm')
  const isAM = rawTime.includes('上午') || rawTime.includes('早上') || rawTime.includes('晨') || rawTime.includes('AM') || rawTime.includes('am')

  // 抽取所有 HH:MM 或數字
  const timeParts = rawTime.split(/[－–~至到-]/)
  if (timeParts.length > 0) {
    const startMatch = timeParts[0].match(/(\d{1,2}):(\d{2})/) || timeParts[0].match(/(\d{1,2})/)
    if (startMatch) {
      startHour = parseInt(startMatch[1], 10)
      startMin = startMatch[2] ? parseInt(startMatch[2], 10) : 0
      if (isPM && startHour < 12) startHour += 12
      if (isAM && startHour === 12) startHour = 0
    }
  }

  if (timeParts.length > 1) {
    const endMatch = timeParts[1].match(/(\d{1,2}):(\d{2})/) || timeParts[1].match(/(\d{1,2})/)
    if (endMatch) {
      endHour = parseInt(endMatch[1], 10)
      endMin = endMatch[2] ? parseInt(endMatch[2], 10) : 0
      const isEndPM = timeParts[1].includes('下午') || timeParts[1].includes('傍晚') || timeParts[1].includes('晚上') || isPM
      if (isEndPM && endHour < 12) endHour += 12
    }
  } else {
    // 預設活動長度 1 小時
    endHour = (startHour + 1) % 24
    endMin = startMin
  }

  const startDate = new Date(year, month, day, startHour, startMin, 0)
  const endDate = new Date(year, month, day, endHour, endMin, 0)

  return { start: startDate, end: endDate }
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
