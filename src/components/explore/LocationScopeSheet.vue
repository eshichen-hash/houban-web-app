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

async function fetchOverlaySuggestions(val: string) {
  const text = val.trim()
  if (!text) {
    overlaySuggestions.value = []
    isSearchingPlaces.value = false
    return
  }

  isSearchingPlaces.value = true

  const isReady = await initPlacesServices()
  if (!isReady || !autocompleteService) {
    overlaySuggestions.value = props.parks
      .filter((p) => p.name.includes(text) || p.district.includes(text) || p.address.includes(text))
      .map((p) => ({
        placeId: p.id,
        mainText: p.name,
        secondaryText: p.address,
        fullText: `${p.district} ${p.name}`,
      }))
    isSearchingPlaces.value = false
    return
  }

  const request = {
    input: text,
    componentRestrictions: { country: 'tw' },
    sessionToken,
    language: 'zh-TW',
  }

  autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
    isSearchingPlaces.value = false
    if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
      overlaySuggestions.value = predictions.map((p: any) => ({
        placeId: p.place_id,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || '',
        fullText: p.description,
      }))
    } else {
      overlaySuggestions.value = props.parks
        .filter((p) => p.name.includes(text) || p.district.includes(text) || p.address.includes(text))
        .map((p) => ({
          placeId: p.id,
          mainText: p.name,
          secondaryText: p.address,
          fullText: `${p.district} ${p.name}`,
        }))
    }
  })
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
  if (!placesService || !item.placeId) {
    const existing = props.parks.find((p) => p.id === item.placeId || p.name === item.mainText)
    const result: SelectedParkResult = {
      name: item.mainText,
      address: item.secondaryText || existing?.address || '',
      district: existing?.district || '台北市',
      lat: existing?.lat,
      lng: existing?.lng,
    }
    handleGoogleParkSelect(result)
    closeDedicatedSearch()
    return
  }

  placesService.getDetails(
    { placeId: item.placeId, fields: ['name', 'formatted_address', 'geometry', 'address_components'], sessionToken },
    (place: any, status: any) => {
      let district = ''
      if (place?.address_components) {
        const sub = place.address_components.find((c: any) =>
          c.types.includes('administrative_area_level_3') || c.types.includes('sublocality_level_1')
        )
        if (sub) district = sub.long_name
      }

      const result: SelectedParkResult = {
        name: place?.name || item.mainText,
        address: place?.formatted_address || item.secondaryText,
        district: district || '台北市',
        lat: place?.geometry?.location?.lat ? place.geometry.location.lat() : undefined,
        lng: place?.geometry?.location?.lng ? place.geometry.location.lng() : undefined,
      }

      handleGoogleParkSelect(result)
      closeDedicatedSearch()
    }
  )
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
    draft.location = '大安區'
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
            const sublocality = response.results[0].address_components.find((c: any) =>
              c.types.includes('sublocality_level_1') || c.types.includes('administrative_area_level_3')
            )
            if (sublocality) {
              foundDistrict = sublocality.long_name.replace('台北市', '')
            }
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
            foundDistrict = data.address.suburb || data.address.district || data.address.city_district || '大安區'
          }
        } catch {
          foundDistrict = '大安區'
        }
      }

      draft.location = foundDistrict || '大安區'
      draft.locationMode = 'current'
      draft.selectedParkId = null
      selectedParkData.value = null
      isLocating.value = false
    },
    (error) => {
      console.warn('瀏覽器 GPS 定位失敗:', error)
      isLocating.value = false
      draft.location = '大安區'
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
  draft.location = result.district ? result.district.replace('台北市', '') : result.name
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
          <!-- 1. 中心搜尋地點 -->
          <fieldset class="scope-sheet__group">
            <legend>搜尋中心地點</legend>

            <!-- 已選定指定公園/地點資訊卡片 -->
            <div v-if="selectedParkData || draft.selectedParkId" class="selected-google-park-card">
              <div class="selected-google-park-card__header">
                <span class="tag tag--success">✓ 已選定地點</span>
                <button class="text-link" type="button" @click="clearSelectedGooglePark">重新搜尋其他地點</button>
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

            <!-- 預設：搜尋觸發框 ＋ GPS 快捷按鈕 -->
            <div v-else class="scope-search-block">
              <div
                class="search-trigger-box"
                role="button"
                tabindex="0"
                aria-label="點擊開啟全螢幕搜尋"
                @click="openDedicatedSearch"
                @keydown.enter="openDedicatedSearch"
                @keydown.space.prevent="openDedicatedSearch"
              >
                <Search :size="18" class="search-trigger-icon" aria-hidden="true" />
                <span class="search-trigger-placeholder">輸入地點或公園名稱</span>
              </div>
              <button class="btn-gps-shortcut" type="button" @click="useCurrentLocation">
                <LocateFixed :size="16" :class="{ 'animate-spin': isLocating }" aria-hidden="true" />
                <span>{{ isLocating ? '正在取得 GPS 定位...' : `使用我目前的 GPS 位置（已定位：${draft.location || '大安區'}）` }}</span>
              </button>
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
              <small>已定位：{{ draft.location || '大安區' }}</small>
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
