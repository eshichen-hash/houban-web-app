import type { Park } from '@/data/events'

export interface PlaceSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
  fullText: string
  source: 'google' | 'local' | 'open-data'
  lat?: number
  lng?: number
}

interface LegacyAutocompleteService {
  getPlacePredictions: (
    request: Record<string, unknown>,
    callback: (predictions: any[] | null, status: unknown) => void,
  ) => void
}

function normalized(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('zh-TW').replace(/\s+/g, '')
}

export function findLocalPlaceSuggestions(parks: readonly Park[], query: string): PlaceSuggestion[] {
  const keyword = normalized(query)
  if (!keyword) return []

  return parks
    .filter((park) => normalized(`${park.name}${park.district}${park.address}`).includes(keyword))
    .map((park) => ({
      placeId: park.id,
      mainText: park.name,
      secondaryText: [park.district, park.address].filter(Boolean).join('・'),
      fullText: `${park.name} ${park.address}`.trim(),
      source: 'local' as const,
      lat: park.lat,
      lng: park.lng,
    }))
}

export function mergePlaceSuggestions(
  primary: readonly PlaceSuggestion[],
  fallback: readonly PlaceSuggestion[],
): PlaceSuggestion[] {
  const merged: PlaceSuggestion[] = []
  const seen = new Set<string>()

  for (const suggestion of [...primary, ...fallback]) {
    const key = normalized(`${suggestion.mainText}|${suggestion.secondaryText}`)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(suggestion)
  }

  return merged.slice(0, 15)
}

export function requestLegacyGooglePredictions(
  service: LegacyAutocompleteService,
  request: Record<string, unknown>,
  okStatus: unknown,
  timeoutMs = 1_500,
): Promise<PlaceSuggestion[]> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (suggestions: PlaceSuggestion[]) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      resolve(suggestions)
    }
    const timeoutId = setTimeout(() => finish([]), timeoutMs)

    try {
      service.getPlacePredictions(request, (predictions, status) => {
        if (status !== okStatus || !predictions?.length) {
          finish([])
          return
        }

        finish(predictions.map((prediction: any) => ({
          placeId: prediction.place_id,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || '',
          fullText: prediction.description,
          source: 'google' as const,
        })))
      })
    } catch {
      finish([])
    }
  })
}

async function fetchJson(url: string, timeoutMs = 2_500): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function searchTaiwanPlacesLive(text: string): Promise<PlaceSuggestion[]> {
  const encoded = encodeURIComponent(text)
  const photon = await fetchJson(`https://photon.komoot.io/api/?q=${encoded}&limit=15&lat=23.7&lon=120.9&lang=default`)

  if (Array.isArray(photon?.features) && photon.features.length > 0) {
    return photon.features
      .filter((feature: any) => feature.properties?.name)
      .map((feature: any, index: number) => {
        const properties = feature.properties
        const city = properties.city || properties.county || properties.state || ''
        const district = properties.district || properties.suburb || properties.town || ''
        const street = properties.street || ''
        const address = [city, district, street].filter(Boolean).join('') || '台灣'
        return {
          placeId: `live-photon-${properties.osm_type || 'place'}-${properties.osm_id || index}`,
          mainText: properties.name,
          secondaryText: address,
          fullText: `${address} ${properties.name}`,
          source: 'open-data' as const,
          lat: feature.geometry?.coordinates?.[1],
          lng: feature.geometry?.coordinates?.[0],
        }
      })
  }

  const nominatim = await fetchJson(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=tw&addressdetails=1&limit=12`)
  if (!Array.isArray(nominatim)) return []

  return nominatim.map((item: any) => {
    const address = item.address || {}
    const city = address.city || address.county || ''
    const district = address.suburb || address.district || address.town || address.village || ''
    const road = address.road || ''
    const fullAddress = [city, district, road].filter(Boolean).join('') || item.display_name
    return {
      placeId: `live-osm-${item.place_id}`,
      mainText: item.name || (item.display_name ? item.display_name.split(',')[0] : text),
      secondaryText: fullAddress,
      fullText: item.display_name,
      source: 'open-data' as const,
      lat: Number(item.lat),
      lng: Number(item.lon),
    }
  })
}
