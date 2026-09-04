<script setup lang="ts">
import { ArrowLeft, Check, Loader2, LocateFixed, MapPin, Search, Sparkles, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'
import type { SelectedParkResult } from '@/components/ParkAutocomplete.vue'
import type { Park } from '@/data/events'
import type { ExploreRadius, ExploreScope } from '@/types/explore'

interface PlaceSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
  fullText: string
  lat?: number
  lng?: number
}

const props = defineProps<{
  open: boolean
  scope: ExploreScope
  parks: readonly Park[]
  resultCount: number
}>()

const emit = defineEmits<{
  close: []
  apply: [scope: ExploreScope]
  preview: [scope: ExploreScope]
}>()

const panel = useTemplateRef<HTMLElement>('panel')
const overlayInputRef = useTemplateRef<HTMLInputElement>('overlayInputRef')
const radiusOptions: ExploreRadius[] = [1, 3, 5, 10]
const draft = reactive<ExploreScope>({ ...props.scope })
const canApply = computed(() => true)

let previousFocus: HTMLElement | null = null
let previousBodyOverflow = ''

const selectedParkData = ref<SelectedParkResult | null>(null)
const isLocating = ref(false)
const userGpsCityDistrict = ref(props.scope.location && props.scope.location !== '目前位置' && props.scope.location !== '大安區' ? props.scope.location : '台中市西區')

// 專屬全螢幕搜尋視圖狀態
const isDedicatedSearchOpen = ref(false)
const overlayQuery = ref('')
const overlaySuggestions = ref<PlaceSuggestion[]>([])
const isSearchingPlaces = ref(false)
const apiKey = shallowRef(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '')

let autocompleteService: any = null
let placesService: any = null
let sessionToken: any = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function syncDraft() {
  Object.assign(draft, props.scope)
  if (draft.location && draft.location !== '目前位置' && draft.location !== '大安區' && draft.locationMode === 'current') {
    userGpsCityDistrict.value = draft.location
  }
  if (draft.selectedParkId) {
    const existing = props.parks.find((p) => p.id === draft.selectedParkId || p.name === draft.selectedParkId)
    if (existing) {
      selectedParkData.value = {
        name: existing.name,
        address: existing.address,
        district: existing.district,
        lat: existing.lat,
        lng: existing.lng,
      }
    } else {
      selectedParkData.value = {
        name: draft.selectedParkId,
        address: draft.location,
        district: draft.location,
      }
    }
  } else {
    selectedParkData.value = null
  }
}

async function loadGoogleMapsSDK(): Promise<boolean> {
  if (window.google?.maps?.places) return true
  if (!apiKey.value) return false

  if (!window.__googleMapsLoadingPromise) {
    window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.value}&libraries=places,marker&language=zh-TW&region=TW&v=weekly`
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = (err) => reject(err)
      document.head.appendChild(script)
    })
  }

  try {
    await window.__googleMapsLoadingPromise
    return Boolean(window.google?.maps?.places)
  } catch {
    return false
  }
}

async function initPlacesServices(): Promise<boolean> {
  const loaded = await loadGoogleMapsSDK()
  if (!loaded || !window.google?.maps?.places) return false

  if (!autocompleteService) {
    autocompleteService = new window.google.maps.places.AutocompleteService()
  }
  if (!placesService) {
    const dummyDiv = document.createElement('div')
    placesService = new window.google.maps.places.PlacesService(dummyDiv)
  }
  if (!sessionToken && window.google?.maps?.places?.AutocompleteSessionToken) {
    sessionToken = new window.google.maps.places.AutocompleteSessionToken()
  }
  return true
}

/**
 * 全台灣即時地理位置連線搜尋（覆蓋全台 368 鄉鎮市區所有公園、綠地、地標與景點）
 */
async function searchTaiwanPlacesLive(text: string): Promise<PlaceSuggestion[]> {
  try {
    const encoded = encodeURIComponent(text)
    const res = await fetch(`https://photon.komoot.io/api/?q=${encoded}&limit=15&lat=23.7&lon=120.9&lang=default`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.features) && data.features.length > 0) {
        return data.features
          .filter((f: any) => f.properties?.name)
          .map((f: any, idx: number) => {
            const props = f.properties
            const city = props.city || props.county || props.state || ''
            const district = props.district || props.suburb || props.town || ''
            const street = props.street || ''
            const fullAddress = [city, district, street].filter(Boolean).join('') || '台灣'
            return {
              placeId: `live-photon-${idx}-${props.osm_id || Date.now()}`,
              mainText: props.name,
              secondaryText: fullAddress,
              fullText: `${fullAddress} ${props.name}`,
              lat: f.geometry?.coordinates?.[1],
              lng: f.geometry?.coordinates?.[0],
            }
          })
      }
    }
  } catch (err) {
    console.warn('即時地點連線搜尋失敗:', err)
  }

  try {
    const encoded = encodeURIComponent(text)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=tw&addressdetails=1&limit=12`)
    if (res.ok) {
      const list = await res.json()
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any) => {
          const addr = item.address || {}
          const city = addr.city || addr.county || ''
          const sub = addr.suburb || addr.district || addr.town || addr.village || ''
          const road = addr.road || ''
          const fullAddress = [city, sub, road].filter(Boolean).join('') || item.display_name
          return {
            placeId: `live-osm-${item.place_id}`,
            mainText: item.name || (item.display_name ? item.display_name.split(',')[0] : text),
            secondaryText: fullAddress,
            fullText: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }
        })
      }
    }
  } catch (err) {
    console.warn('Nominatim 即時搜尋失敗:', err)
  }

  return []
}

async function fetchOverlaySuggestions(val: string) {
  const text = val.trim()
  if (!text) {
    overlaySuggestions.value = []
    isSearchingPlaces.value = false
    return
  }

  isSearchingPlaces.value = true

  const isReady = await initPlacesServices()

  // 1. 若 Google Places SDK 就緒，透過 Google Places API 搜尋全台
  if (isReady && autocompleteService) {
    const request = {
      input: text,
      componentRestrictions: { country: 'tw' },
      sessionToken,
      language: 'zh-TW',
    }

    autocompleteService.getPlacePredictions(request, async (predictions: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
        isSearchingPlaces.value = false
        overlaySuggestions.value = predictions.map((p: any) => ({
          placeId: p.place_id,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
          fullText: p.description,
        }))
      } else {
        // 若 Google Places 無精確回傳，連線全台即時地理搜尋引擎
        const liveResults = await searchTaiwanPlacesLive(text)
        isSearchingPlaces.value = false
        overlaySuggestions.value = liveResults
      }
    })
    return
  }

  // 2. 若 Google Places SDK 尚未載入，直接連線全台即時地理搜尋引擎
  const liveResults = await searchTaiwanPlacesLive(text)
  isSearchingPlaces.value = false
  overlaySuggestions.value = liveResults
}

function handleOverlayInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  overlayQuery.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchOverlaySuggestions(val)
  }, 120)
}

function handleOverlaySelect(item: PlaceSuggestion) {
  // 1. 若已經有即時座標 (例如來自全台即時地理搜尋)
  if (typeof item.lat === 'number' && typeof item.lng === 'number') {
    const result: SelectedParkResult = {
      name: item.mainText,
      address: item.secondaryText,
      district: item.secondaryText,
      lat: item.lat,
      lng: item.lng,
    }
    handleGoogleParkSelect(result)
    closeDedicatedSearch()
    return
  }

  // 2. 若為 Google Places placeId，請求詳細資料取得經緯度與行政區
  if (placesService && item.placeId) {
    placesService.getDetails(
      { placeId: item.placeId, fields: ['name', 'formatted_address', 'geometry', 'address_components'], sessionToken },
      (place: any, status: any) => {
        let city = ''
        let sublocality = ''
        if (place?.address_components) {
          const cityComp = place.address_components.find((c: any) =>
            c.types.includes('administrative_area_level_1')
          )
          const subComp = place.address_components.find((c: any) =>
            c.types.includes('administrative_area_level_3') || c.types.includes('sublocality_level_1')
          )
          if (cityComp) city = cityComp.long_name
          if (subComp) sublocality = subComp.long_name
        }

        const displayDistrict = (city + sublocality) || sublocality || city || place?.formatted_address || item.mainText

        const result: SelectedParkResult = {
          name: place?.name || item.mainText,
          address: place?.formatted_address || item.secondaryText,
          district: displayDistrict,
          lat: place?.geometry?.location?.lat ? place.geometry.location.lat() : undefined,
          lng: place?.geometry?.location?.lng ? place.geometry.location.lng() : undefined,
        }

        handleGoogleParkSelect(result)
        closeDedicatedSearch()
      }
    )
    return
  }

  // 3. 一般回退
  const result: SelectedParkResult = {
    name: item.mainText,
    address: item.secondaryText,
    district: item.secondaryText,
  }
  handleGoogleParkSelect(result)
  closeDedicatedSearch()
}

async function openDedicatedSearch() {
  isDedicatedSearchOpen.value = true
  overlayQuery.value = ''
  overlaySuggestions.value = []
  await nextTick()
  overlayInputRef.value?.focus()
  initPlacesServices()
}

function closeDedicatedSearch() {
  isDedicatedSearchOpen.value = false
  overlayQuery.value = ''
  overlaySuggestions.value = []
}

function selectGpsAndClose() {
  useCurrentLocation()
  closeDedicatedSearch()
}

async function detectCurrentLocation() {
  if (!navigator.geolocation) {
    if (!draft.location || draft.location === '大安區') draft.location = '目前位置'
    return
  }

  isLocating.value = true

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      let foundDistrict = ''

      if (window.google?.maps?.Geocoder) {
        try {
          const geocoder = new window.google.maps.Geocoder()
          const response = await geocoder.geocode({ location: { lat, lng } })
          if (response?.results?.[0]?.address_components) {
            const comps = response.results[0].address_components
            const cityComp = comps.find((c: any) => c.types.includes('administrative_area_level_1'))
            const subComp = comps.find((c: any) =>
              c.types.includes('sublocality_level_1') || c.types.includes('administrative_area_level_3')
            )
            const city = cityComp ? cityComp.long_name : ''
            const sub = subComp ? subComp.long_name : ''
            foundDistrict = (city + sub) || sub || city
          }
        } catch (err) {
          console.warn('Google Geocoder 反向編碼失敗:', err)
        }
      }

      if (!foundDistrict) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`)
          const data = await res.json()
          if (data?.address) {
            const city = data.address.city || data.address.county || ''
            const sub = data.address.suburb || data.address.district || data.address.city_district || data.address.town || ''
            foundDistrict = (city + sub) || sub || city || '目前位置'
          }
        } catch {
          foundDistrict = '目前位置'
        }
      }

      if (foundDistrict && foundDistrict !== '目前位置') {
        userGpsCityDistrict.value = foundDistrict
      }
      draft.location = foundDistrict || '目前位置'
      draft.locationMode = 'current'
      draft.selectedParkId = null
      draft.centerCoords = { lat, lng }
      selectedParkData.value = null
      isLocating.value = false
    },
    (error) => {
      console.warn('瀏覽器 GPS 定位失敗:', error)
      isLocating.value = false
      if (!draft.location || draft.location === '大安區') draft.location = '目前位置'
      draft.locationMode = 'current'
      draft.selectedParkId = null
      selectedParkData.value = null
    },
    { enableHighAccuracy: true, timeout: 7000 }
  )
}

function useCurrentLocation() {
  detectCurrentLocation()
}

function clearSelectedGooglePark() {
  draft.selectedParkId = null
  selectedParkData.value = null
  draft.locationMode = 'current'
}

function handleGoogleParkSelect(result: SelectedParkResult) {
  selectedParkData.value = result
  draft.locationMode = 'park'
  draft.selectedParkId = result.name
  draft.location = result.district || result.name
  if (typeof result.lat === 'number' && typeof result.lng === 'number') {
    draft.centerCoords = { lat: result.lat, lng: result.lng }
  }
}

function applyScope() {
  if (!canApply.value) return
  emit('apply', { ...draft })
}

function focusableElements() {
  return panel.value
    ? Array.from(panel.value.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
    : []
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (isDedicatedSearchOpen.value) {
      closeDedicatedSearch()
      return
    }
    emit('close')
    return
  }
  if (event.key !== 'Tab') return

  const focusable = focusableElements()
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(draft, (value) => {
  if (props.open) emit('preview', { ...value })
}, { deep: true })

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    isDedicatedSearchOpen.value = false
    syncDraft()
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    panel.value?.focus()
    emit('preview', { ...draft })
    return
  }

  isDedicatedSearchOpen.value = false
  document.body.style.overflow = previousBodyOverflow
  await nextTick()
  previousFocus?.focus()
}, { immediate: true })

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="responsive-dialog" role="presentation">
      <div class="responsive-dialog__backdrop" aria-hidden="true" @click="emit('close')"></div>
      <section
        id="explore-scope-dialog"
        ref="panel"
        class="responsive-dialog__panel scope-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scope-sheet-title"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <div class="responsive-dialog__handle" aria-hidden="true"></div>
        <header class="responsive-dialog__header">
          <div>
            <span class="eyebrow">活動搜尋中心</span>
            <h2 id="scope-sheet-title">位置與活動範圍</h2>
          </div>
          <button class="icon-button responsive-dialog__close" type="button" aria-label="關閉位置設定" @click="emit('close')">
            <X :size="22" aria-hidden="true" />
          </button>
        </header>

        <div class="scope-sheet__body">
          <!-- 1. 中心搜尋地點 (Location-First 架構) -->
          <fieldset class="scope-sheet__group">
            <legend>搜尋中心地點</legend>

            <!-- A. 已選定指定公園/地點模式 -->
            <div v-if="draft.locationMode === 'park' && (selectedParkData || draft.selectedParkId)" class="scope-search-block">
              <div class="selected-google-park-card">
                <div class="selected-google-park-card__header">
                  <span class="tag tag--success">✓ 已指定地點</span>
                  <button class="btn-re-search" type="button" @click="openDedicatedSearch">
                    <Search :size="14" aria-hidden="true" />
                    <span>更換地點</span>
                  </button>
                </div>
                <div class="selected-google-park-card__body">
                  <div class="selected-google-park-icon">
                    <MapPin :size="22" />
                  </div>
                  <div class="selected-google-park-text">
                    <strong>{{ selectedParkData?.name || draft.selectedParkId }}</strong>
                    <span v-if="selectedParkData?.address">{{ selectedParkData.address }}</span>
                    <small v-if="selectedParkData?.district">{{ selectedParkData.district }}</small>
                  </div>
                </div>
              </div>

              <button class="btn-gps-shortcut" type="button" @click="useCurrentLocation">
                <LocateFixed :size="16" :class="{ 'animate-spin': isLocating }" aria-hidden="true" />
                <span>{{ isLocating ? '正在取得 GPS 定位...' : `切換回我目前的 GPS 位置（${userGpsCityDistrict || '台中市西區'}）` }}</span>
              </button>
            </div>

            <!-- B. 預設：目前 GPS 位置為主卡片 + 搜尋其他地點按鈕 -->
            <div v-else class="scope-search-block">
              <div class="current-gps-location-card">
                <div class="current-gps-icon">
                  <LocateFixed :size="22" :class="{ 'animate-spin': isLocating }" aria-hidden="true" />
                </div>
                <div class="current-gps-text">
                  <div class="current-gps-tag-row">
                    <span class="tag">📍 目前 GPS 位置</span>
                    <button class="btn-re-locate" type="button" :disabled="isLocating" @click="detectCurrentLocation">
                      {{ isLocating ? '定位中...' : '重新定位' }}
                    </button>
                  </div>
                  <strong>{{ draft.location && draft.location !== '目前位置' && draft.location !== '大安區' ? draft.location : '台中市西區' }}</strong>
                  <small>以此處為中心，搜尋周邊半徑內的公園活動</small>
                </div>
              </div>

              <div
                class="search-trigger-box"
                role="button"
                tabindex="0"
                aria-label="點擊搜尋全台公園或地點"
                @click="openDedicatedSearch"
                @keydown.enter="openDedicatedSearch"
                @keydown.space.prevent="openDedicatedSearch"
              >
                <Search :size="18" class="search-trigger-icon" aria-hidden="true" />
                <span class="search-trigger-placeholder">想找其他地點？點此搜尋全台公園...</span>
              </div>
            </div>
          </fieldset>

          <!-- 2. 活動搜尋範圍 -->
          <fieldset class="scope-sheet__group">
            <legend>活動搜尋半徑</legend>
            <div class="radius-options" role="group" aria-label="選擇活動搜尋範圍">
              <button
                v-for="radius in radiusOptions"
                :key="radius"
                class="radius-option"
                :class="{ 'is-selected': draft.radius === radius }"
                type="button"
                :aria-pressed="draft.radius === radius"
                @click="draft.radius = radius"
              >
                <strong>{{ radius }} 公里</strong>
                <small>{{ radius === 1 ? '步行附近' : radius === 3 ? '推薦範圍' : radius === 5 ? '短程交通' : '生活圈' }}</small>
              </button>
            </div>
          </fieldset>
        </div>

        <footer class="responsive-dialog__footer">
          <p class="scope-sheet__count" aria-live="polite">目前條件有 {{ resultCount }} 場活動</p>
          <button class="button button--primary button--full" type="button" :disabled="!canApply" @click="applyScope">
            顯示 {{ resultCount }} 場附近活動
          </button>
        </footer>
      </section>
      </div>
    </Transition>

    <!-- App 級專屬全螢幕搜尋視圖 (Dedicated Full-Screen Search View) -->
    <Transition name="search-overlay-fade">
      <div v-if="isDedicatedSearchOpen" class="search-fullscreen-overlay" role="dialog" aria-modal="true" aria-label="搜尋地點或公園">
        <!-- 頂部搜尋列 -->
        <header class="search-overlay-topbar">
          <button class="search-overlay-back" type="button" aria-label="返回上一頁" @click="closeDedicatedSearch">
            <ArrowLeft :size="22" aria-hidden="true" />
          </button>
          <div class="search-overlay-input-wrap">
            <Search :size="18" class="search-overlay-input-icon" aria-hidden="true" />
            <input
              ref="overlayInputRef"
              :value="overlayQuery"
              type="text"
              placeholder="輸入地點或公園名稱..."
              autocomplete="off"
              class="search-overlay-input"
              @input="handleOverlayInput"
            />
            <button v-if="overlayQuery" class="search-overlay-clear" type="button" aria-label="清除文字" @click="overlayQuery = ''; overlaySuggestions = []">
              <X :size="18" aria-hidden="true" />
            </button>
          </div>
        </header>

        <!-- 快速定位動作列 -->
        <div class="search-overlay-shortcuts">
          <button class="search-overlay-gps-btn" type="button" @click="selectGpsAndClose">
            <div class="search-overlay-gps-icon">
              <LocateFixed :size="18" :class="{ 'animate-spin': isLocating }" aria-hidden="true" />
            </div>
            <div class="search-overlay-gps-text">
              <strong>使用我目前的 GPS 位置</strong>
              <small>{{ isLocating ? '正在取得 GPS 定位...' : (draft.location && draft.location !== '目前位置' && draft.location !== '大安區' ? `已定位：${draft.location}` : '點擊取得當前所在位置') }}</small>
            </div>
          </button>
        </div>

        <!-- 即時搜尋結果捲動清單 (100% 滿版無阻礙) -->
        <div class="search-overlay-results">
          <div v-if="isSearchingPlaces" class="search-overlay-status">
            <Loader2 :size="20" class="animate-spin" aria-hidden="true" />
            <span>正在連線 Google 地圖搜尋全台...</span>
          </div>

          <div v-else-if="overlaySuggestions.length > 0" class="search-overlay-list">
            <div class="search-overlay-list-header">
              <Sparkles :size="14" aria-hidden="true" />
              <span>Google 地圖即時推薦</span>
            </div>
            <button
              v-for="item in overlaySuggestions"
              :key="item.placeId"
              class="search-overlay-item"
              type="button"
              @click="handleOverlaySelect(item)"
            >
              <div class="search-overlay-item-pin">
                <MapPin :size="20" aria-hidden="true" />
              </div>
              <div class="search-overlay-item-info">
                <strong>{{ item.mainText }}</strong>
                <span>{{ item.secondaryText || item.fullText }}</span>
              </div>
            </button>
          </div>

          <div v-else-if="overlayQuery.trim()" class="search-overlay-empty">
            <p>找不到符合「{{ overlayQuery }}」的地點，請嘗試其他關鍵字</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
