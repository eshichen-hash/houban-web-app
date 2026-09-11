export function normalizedCost(cost: unknown, amount: unknown): { cost: '免費' | '付費'; cost_amount: number } {
  if (cost === '免費') return { cost, cost_amount: 0 }
  if (cost !== '付費' || typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1 || amount > 9999) throw new Error('付費活動請填寫每人費用 NT$1–9,999。')
  return { cost, cost_amount: amount }
}
export function validateNewSchedule(isoDate: unknown, value: unknown, now = Date.now()) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !Number.isFinite(Date.parse(`${isoDate}T00:00:00Z`)) || new Date(`${isoDate}T00:00:00Z`).toISOString().slice(0, 10) !== isoDate) throw new Error('請確認活動日期。')
  if (typeof value !== 'string') throw new Error('請確認活動開始與結束時間。')
  const parts = value.split(/[－–~～至到-]/)
  if (parts.length !== 2) throw new Error('請設定開始與結束時間。')
  const parse = (part: string, inherited = '') => {
    const match = part.trim().match(/^(上午|下午)?\s*(\d{1,2}):(\d{2})$/)
    if (!match) throw new Error('活動時間格式不正確。')
    const period = match[1] || inherited; let hour = Number(match[2]); const minute = Number(match[3])
    if (minute > 59 || hour > 23 || period && (hour < 1 || hour > 12)) throw new Error('活動時間不正確。')
    if (period) hour = hour % 12 + (period === '下午' ? 12 : 0)
    return { minutes: hour * 60 + minute, period, time: `${String(hour).padStart(2, '0')}:${match[3]}` }
  }
  const start = parse(parts[0]), end = parse(parts[1], start.period)
  if (end.minutes <= start.minutes) throw new Error('結束時間須晚於開始時間；目前僅支援當日活動。')
  if (Date.parse(`${isoDate}T${start.time}:00+08:00`) <= now) throw new Error('活動開始時間已過，請重新設定。')
}
export async function imageOwnerFolder(userId: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`event-images:${userId}`))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
export async function validateEventImage(image: unknown, userId: string, supabaseUrl: string): Promise<void> {
  if (image === null || image === undefined || image === '') return
  if (typeof image !== 'string') throw new Error('活動圖片格式不正確。')
  if (['/create-bench-grass-v1.png', '/onboarding-hero-v1.png', '/activity-presets/walking.webp', '/activity-presets/social.webp', '/activity-presets/movement.webp'].includes(image)) return
  const base = `${supabaseUrl}/storage/v1/object/public/event-images/${await imageOwnerFolder(userId)}/`
  if (!image.startsWith(base) || !/^[a-f0-9-]+\.webp$/.test(image.slice(base.length))) throw new Error('請使用系統配圖或重新上傳自己的活動圖片。')
}
