import { computed, shallowRef } from 'vue'
import type { ExploreRadius, ExploreScope } from '@/types/explore'

export type CurrentLocationStatus = 'idle' | 'locating' | 'ready' | 'error'

export interface ResolvedCurrentLocation {
  locationMode: 'current'
  location: string
  radius: ExploreRadius
  selectedParkId: null
  centerCoords: { lat: number; lng: number }
  locationSource: 'current'
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      reject(new Error('LOCATION_INSECURE_CONTEXT'))
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('LOCATION_UNSUPPORTED'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 7_000,
      // 「目前位置」必須由這次定位取得，不沿用瀏覽器的舊快取。
      maximumAge: 0,
    })
  })
}

function locationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'LOCATION_INSECURE_CONTEXT') {
    return '定位需要安全連線。請改用正式 HTTPS 網址；本機測試請使用 localhost，再按一次「使用目前位置」。'
  }
  if (error instanceof Error && error.message === 'LOCATION_UNSUPPORTED') {
    return '此瀏覽器不支援定位功能。請改用手機瀏覽器或正式 HTTPS 網址，或選擇附近區域。'
  }

  const code = typeof error === 'object' && error !== null && 'code' in error
    ? Number((error as { code?: unknown }).code)
    : undefined

  if (code === 1) {
    return '目前無法取得位置。請在瀏覽器網站權限中允許定位，再按一次「使用目前位置」；或改用「選擇附近區域」。'
  }
  if (code === 2) {
    return '位置服務目前沒有回應，請確認手機定位已開啟後再試一次，或改用「選擇附近區域」。'
  }
  if (code === 3) {
    return '定位逾時。請確認瀏覽器網站權限與手機系統定位已開啟；本機測試請使用 localhost 或正式 HTTPS 網址後再試，或改用「選擇附近區域」。'
  }

  return '目前無法取得位置，請再試一次，或改用「選擇附近區域」。'
}

function getDistrictFromAddressComponents(components: any[] | undefined): string {
  if (!components?.length) return ''

  const city = components.find((component) =>
    component.types?.includes('administrative_area_level_1'),
  )?.long_name ?? ''
  const district = components.find((component) =>
    component.types?.includes('sublocality_level_1')
      || component.types?.includes('administrative_area_level_3')
      || component.types?.includes('administrative_area_level_2'),
  )?.long_name ?? ''

  return `${city}${district}`
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder()
      const response = await geocoder.geocode({ location: { lat, lng } })
      const firstResult = response?.results?.[0]
      const district = getDistrictFromAddressComponents(firstResult?.address_components)
      if (district) return district
    } catch {
      // The coordinates remain authoritative even if the readable district is unavailable.
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 3_000)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { signal: controller.signal },
      )

      if (response.ok) {
        const data = await response.json()
        const address = data?.address
        const city = address?.city || address?.county || ''
        const district = address?.suburb || address?.city_district || address?.district || address?.town || ''
        const label = `${city}${district}`
        if (label) return label
      }
    } finally {
      window.clearTimeout(timeoutId)
    }
  } catch {
    // Keep the honest, generic label below when reverse geocoding is unavailable.
  }

  return '目前位置'
}

export function useCurrentLocation() {
  const status = shallowRef<CurrentLocationStatus>('idle')
  const errorMessage = shallowRef('')
  const isLocating = computed(() => status.value === 'locating')

  async function detect(radius: ExploreRadius = 3): Promise<ResolvedCurrentLocation | null> {
    status.value = 'locating'
    errorMessage.value = ''

    try {
      const position = await getCurrentPosition()
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('定位結果缺少有效座標。')
      }

      const location = await reverseGeocode(lat, lng)
      status.value = 'ready'

      return {
        locationMode: 'current',
        location,
        radius,
        selectedParkId: null,
        centerCoords: { lat, lng },
        locationSource: 'current',
      }
    } catch (error) {
      status.value = 'error'
      errorMessage.value = locationErrorMessage(error)
      return null
    }
  }

  function reset() {
    status.value = 'idle'
    errorMessage.value = ''
  }

  return {
    status,
    isLocating,
    errorMessage,
    detect,
    reset,
  }
}

export function hasValidExploreCoordinates(scope: Pick<ExploreScope, 'centerCoords'>): boolean {
  return Boolean(
    scope.centerCoords
      && Number.isFinite(scope.centerCoords.lat)
      && Number.isFinite(scope.centerCoords.lng),
  )
}
