import { describe, expect, it, vi } from 'vitest'

const { liffMock, callLineApi } = vi.hoisted(() => ({
  callLineApi: vi.fn(),
  liffMock: {
    init: vi.fn().mockResolvedValue(undefined),
    isInClient: vi.fn().mockReturnValue(true),
    isLoggedIn: vi.fn().mockReturnValue(true),
    getIDToken: vi.fn().mockReturnValue('raw-line-id-token'),
    getProfile: vi.fn(),
    login: vi.fn(),
    isApiAvailable: vi.fn().mockReturnValue(false),
    shareTargetPicker: vi.fn(),
  },
}))

vi.mock('@line/liff', () => ({ default: liffMock }))
vi.mock('@/services/lineApiService', () => ({ callLineApi }))

describe('LIFF 身分初始化', () => {
  it('只採用伺服器驗證後的身分，不採用前端 getProfile', async () => {
    vi.stubEnv('VITE_LIFF_ID', '2011461980-test')
    vi.resetModules()
    liffMock.init.mockResolvedValue(undefined)
    liffMock.isInClient.mockReturnValue(true)
    liffMock.isLoggedIn.mockReturnValue(true)
    liffMock.getIDToken.mockReturnValue('raw-line-id-token')
    callLineApi.mockResolvedValue({
      user: { userId: 'verified-line-user', displayName: '已驗證使用者', pictureUrl: 'https://example.com/avatar.png' },
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    })
    const { initLiff, useLiff } = await import('@/services/liffService')

    await initLiff()

    expect(callLineApi).toHaveBeenCalledWith('session', {}, 'raw-line-id-token')
    expect(liffMock.getProfile).not.toHaveBeenCalled()
    expect(useLiff().liffState.profile).toMatchObject({
      userId: 'verified-line-user',
      displayName: '已驗證使用者',
    })
    vi.unstubAllEnvs()
  })
})
