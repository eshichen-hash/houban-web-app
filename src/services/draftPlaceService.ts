import { parks } from '@/data/events'
import { findLocalPlaceSuggestions, type PlaceSuggestion } from './placeSearchService'
import type { SelectedParkResult } from '@/types/places'

function deadline<T>(promise: Promise<T>, ms = 7000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Google 地圖連線逾時，請重試。')), ms)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}
export async function loadDraftPlaces() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('Google 地圖尚未設定，目前僅顯示已收錄公園。')
  if (!window.google?.maps && !window.__googleMapsLoadingPromise) {
    window.__googleMapsLoadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places&language=zh-TW&region=TW&loading=async`
      script.async = true
      script.onload = () => resolve(); script.onerror = () => { script.remove(); window.__googleMapsLoadingPromise = undefined; reject(new Error('Google 地圖無法連線。')) }
      document.head.append(script)
    })
  }
  if (window.__googleMapsLoadingPromise) await deadline(window.__googleMapsLoadingPromise)
  if (!window.google?.maps?.importLibrary) throw new Error('Google 地圖載入失敗，請重新整理後再試。')
  return deadline(window.google.maps.importLibrary('places')) as Promise<any>
}
export function createDraftPlaceSearch() {
  let session: any = null
  const predicted = new Map<string, any>()
  async function search(query: string): Promise<{ results: PlaceSuggestion[]; warning: string }> {
    const local = findLocalPlaceSuggestions(parks, query)
    if (!query.trim()) return { results: [], warning: '' }
    try {
      const library = await loadDraftPlaces()
      session ||= new library.AutocompleteSessionToken()
      const response = await deadline<any>(library.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query, includedRegionCodes: ['tw'], language: 'zh-TW', region: 'tw', sessionToken: session }))
      const results: PlaceSuggestion[] = []
      for (const suggestion of response.suggestions || []) {
        const p = suggestion.placePrediction
        if (!p?.placeId) continue
        predicted.set(p.placeId, p)
        results.push({ placeId: p.placeId, mainText: p.mainText?.toString() || p.text.toString(), secondaryText: p.secondaryText?.toString() || '', fullText: p.text.toString(), source: 'google' })
      }
      return { results: results.length ? results : local, warning: !results.length && local.length ? 'Google 沒有找到地點；下方為符合的已收錄公園。' : '' }
    } catch (error) { return { results: local, warning: error instanceof Error ? `${error.message} 可先選擇已收錄公園。` : 'Google 搜尋暫時無法使用。' } }
  }
  async function select(suggestion: PlaceSuggestion): Promise<SelectedParkResult> {
    if (suggestion.source === 'local') {
      const park = parks.find((p) => p.id === suggestion.placeId)
      if (!park) throw new Error('公園資料已更新，請重新搜尋。')
      return { ...park, placeId: park.id }
    }
    const prediction = predicted.get(suggestion.placeId)
    if (!prediction) throw new Error('搜尋結果已過期，請重新搜尋。')
    const place = prediction.toPlace()
    await deadline(place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'] }))
    session = null
    if (!place.location) throw new Error('這個地點沒有可用座標，請選擇其他結果。')
    return { name: place.displayName || suggestion.mainText, address: place.formattedAddress || suggestion.secondaryText,
      district: place.addressComponents?.find((item: any) => item.types.includes('administrative_area_level_3'))?.longText || '',
      placeId: place.id, lat: place.location.lat(), lng: place.location.lng() }
  }
  return { search, select }
}
