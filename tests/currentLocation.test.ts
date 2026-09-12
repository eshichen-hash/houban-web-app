import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentLocation } from '@/composables/useCurrentLocation'

const originalGeolocation = Object.getOwnPropertyDescriptor(Navigator.prototype, 'geolocation')

function setGeolocation(getCurrentPosition: Navigator['geolocation']['getCurrentPosition']) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  })
}

beforeEach(() => {
  delete (window as any).google
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ address: { city: '台北市', suburb: '大安區' } }),
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete (navigator as any).geolocation
  if (originalGeolocation) {
    Object.defineProperty(Navigator.prototype, 'geolocation', originalGeolocation)
  }
})

describe('目前位置解析', () => {
  it('只用這次瀏覽器定位取得的座標建立目前位置，不使用示意地區', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 25.0331,
          longitude: 121.5354,
        } as GeolocationCoordinates,
        timestamp: Date.now(),
      } as GeolocationPosition)
    })
    setGeolocation(getCurrentPosition)

    const location = useCurrentLocation()
    const resolved = await location.detect(3)

    expect(resolved).toMatchObject({
      locationMode: 'current',
      location: '台北市大安區',
      radius: 3,
      centerCoords: { lat: 25.0331, lng: 121.5354 },
      locationSource: 'current',
    })
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ maximumAge: 0 }),
    )
    expect(location.status.value).toBe('ready')
  })

  it('定位權限被拒絕時不產生位置，並提供可理解的替代路徑', async () => {
    const getCurrentPosition = vi.fn((_: PositionCallback, reject: PositionErrorCallback) => {
      reject({ code: 1, message: 'permission denied' } as GeolocationPositionError)
    })
    setGeolocation(getCurrentPosition)

    const location = useCurrentLocation()
    const resolved = await location.detect()

    expect(resolved).toBeNull()
    expect(location.status.value).toBe('error')
    expect(location.errorMessage.value).toContain('網站權限中允許定位')
  })

  it('本機頁面不是安全來源時，清楚提示改用 HTTPS 或 localhost', async () => {
    vi.stubGlobal('isSecureContext', false)
    setGeolocation({ getCurrentPosition: vi.fn() } as unknown as Navigator['geolocation']['getCurrentPosition'])

    const location = useCurrentLocation()
    const resolved = await location.detect()

    expect(resolved).toBeNull()
    expect(location.errorMessage.value).toContain('安全連線')
    expect(location.errorMessage.value).toContain('HTTPS')
  })

  it('定位逾時時指出瀏覽器與手機定位設定，而不是建立替代位置', async () => {
    const getCurrentPosition = vi.fn((_: PositionCallback, reject: PositionErrorCallback) => {
      reject({ code: 3, message: 'timeout' } as GeolocationPositionError)
    })
    setGeolocation(getCurrentPosition)

    const location = useCurrentLocation()
    const resolved = await location.detect()

    expect(resolved).toBeNull()
    expect(location.errorMessage.value).toContain('定位逾時')
    expect(location.errorMessage.value).toContain('手機系統定位')
  })
})
