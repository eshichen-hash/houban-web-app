/**
 * Google Maps Universal Navigation 與地圖輔助工具
 * 符合 Google Maps Platform 官方 Universal URL 規範
 */

export interface MapCoordinates {
  lat: number
  lng: number
}

/**
 * 產生 Google Maps 官方 Universal Navigation URL
 * 官方規格：https://www.google.com/maps/dir/?api=1&destination=...
 * 可在 Android、iOS 手機直接喚起 Google Maps App 或在桌面開啟 Google 地圖
 */
export function getGoogleMapsDirectionsUrl(
  destinationName: string,
  coordinates?: MapCoordinates,
  travelMode: 'walking' | 'transit' | 'driving' = 'transit'
): string {
  const params = new URLSearchParams({
    api: '1',
    travelmode: travelMode,
  })

  if (coordinates && coordinates.lat && coordinates.lng) {
    params.set('destination', `${coordinates.lat},${coordinates.lng}`)
  } else {
    params.set('destination', destinationName)
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * 開啟 Google 地圖導航
 */
export function openGoogleMapsDirections(
  destinationName: string,
  coordinates?: MapCoordinates,
  travelMode: 'walking' | 'transit' | 'driving' = 'transit'
): void {
  const url = getGoogleMapsDirectionsUrl(destinationName, coordinates, travelMode)
  window.open(url, '_blank', 'noopener,noreferrer')
}
