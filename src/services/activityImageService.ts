import { supabase } from './supabase'
import { requireVerifiedLineToken } from './liffService'
import { callLineApi } from './lineApiService'
import type { EventType } from '@/data/events'

export function activityPreset(type: EventType | ''): string {
  if (['太極', '健康活動', '舞蹈', '球類', '伸展'].includes(type)) return '/activity-presets/movement.webp'
  if (['唱歌', '聊天', '棋藝', '手作', '閱讀', '樂器', '讀書'].includes(type)) return '/activity-presets/social.webp'
  return '/activity-presets/walking.webp'
}
export async function compressActivityImage(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('請選擇 JPG、PNG 或 WebP 圖片；HEIC 請先轉成 JPG。')
  if (file.size > 20 * 1024 * 1024) throw new Error('原始圖片請小於 20 MB。')
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = new Image(); img.src = objectUrl
    await img.decode()
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('這個瀏覽器無法處理圖片。')
    context.fillStyle = '#fffdf8'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', .84))
    if (!blob || blob.type !== 'image/webp' || blob.size > 5 * 1024 * 1024) throw new Error('圖片轉換失敗，請選擇其他圖片。')
    return blob
  } finally { URL.revokeObjectURL(objectUrl) }
}
export async function uploadActivityImage(file: File): Promise<string> {
  const token = await requireVerifiedLineToken()
  const blob = await compressActivityImage(file)
  const signed = await callLineApi<{ path: string; token: string; publicUrl: string }>('sign_event_image', { bytes: blob.size, mime: blob.type }, token)
  const { error } = await supabase.storage.from('event-images').uploadToSignedUrl(signed.path, signed.token, blob, { contentType: 'image/webp' })
  if (error) throw new Error('圖片尚未上傳成功，原本的配圖已保留，請重試。')
  return signed.publicUrl
}
