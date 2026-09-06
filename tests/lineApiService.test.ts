import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/supabase', () => ({
  supabaseUrl: 'https://project.example.supabase.co',
  supabasePublishableKey: 'publishable-test-key',
}))

import { callLineApi } from '@/services/lineApiService'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('LINE 驗證 API client', () => {
  it('只在 Authorization 傳送原始 LINE ID token', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { saved: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(callLineApi('test_action', { eventId: 'event-1' }, 'line-id-token')).resolves.toEqual({ saved: true })
    expect(fetch).toHaveBeenCalledWith(
      'https://project.example.supabase.co/functions/v1/line-api',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer line-id-token',
          apikey: 'publishable-test-key',
        }),
      }),
    )
    const request = vi.mocked(fetch).mock.calls[0][1]
    expect(JSON.parse(String(request?.body))).toEqual({ action: 'test_action', eventId: 'event-1' })
  })

  it('保留伺服器錯誤代碼與訊息', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: { code: 'INVALID_LINE_TOKEN', message: '請重新登入。' },
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }))

    const request = callLineApi('session', {}, 'expired-token')
    await expect(request).rejects.toMatchObject({
      code: 'INVALID_LINE_TOKEN',
      status: 401,
      message: '請重新登入。',
    })
  })
})
