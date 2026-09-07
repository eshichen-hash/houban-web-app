import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LocationScopeSheet from '@/components/explore/LocationScopeSheet.vue'
import type { Park } from '@/data/events'

const daanPark: Park = {
  id: 'daan-forest-park',
  name: '大安森林公園',
  district: '台北市大安區',
  address: '台北市大安區新生南路二段 1 號',
  meeting: '捷運站出口',
  lat: 25.0297,
  lng: 121.5356,
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = ''
  ;(window as any).__googleMapsLoadingPromise = undefined
  ;(window as any).google = {
    maps: {
      places: {
        AutocompleteService: class {
          getPlacePredictions() {
            // Reproduces an authorized-script failure where Google never calls back.
          }
        },
        PlacesService: class {},
        AutocompleteSessionToken: class {},
        PlacesServiceStatus: { OK: 'OK' },
      },
    },
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  }))
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  delete (window as any).google
  delete (window as any).__googleMapsLoadingPromise
  vi.unstubAllGlobals()
})

describe('探索頁地點搜尋', () => {
  it('Google Places 沒有回應時仍立即顯示符合的本地公園，且不會永久停在載入中', async () => {
    const wrapper = mount(LocationScopeSheet, {
      attachTo: document.body,
      props: {
        open: true,
        scope: {
          location: '',
          locationMode: 'current',
          radius: 3,
          selectedParkId: null,
          centerCoords: null,
        },
        parks: [daanPark],
        resultCount: 0,
      },
    })

    await flushPromises()
    const trigger = document.body.querySelector<HTMLElement>('.search-trigger-box')
    expect(trigger).not.toBeNull()
    trigger!.click()
    await flushPromises()

    const input = document.body.querySelector<HTMLInputElement>('.search-overlay-input')
    expect(input).not.toBeNull()
    input!.value = '大安森林公園'
    input!.dispatchEvent(new Event('input', { bubbles: true }))

    await vi.advanceTimersByTimeAsync(150)
    await flushPromises()

    expect(document.body.textContent).toContain('大安森林公園')
    expect(document.body.textContent).not.toContain('正在連線 Google 地圖搜尋全台')

    await vi.advanceTimersByTimeAsync(1_600)
    await flushPromises()
    expect(document.body.textContent).not.toContain('正在補充更多地點')

    wrapper.unmount()
  })
})
