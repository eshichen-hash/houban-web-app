<script setup lang="ts">
import { ArrowLeft, Check, Loader2, LocateFixed, MapPin, Search, Sparkles, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'
import type { SelectedParkResult } from '@/components/ParkAutocomplete.vue'
import type { Park } from '@/data/events'
import { hasValidExploreCoordinates, useCurrentLocation } from '@/composables/useCurrentLocation'
import {
  findLocalPlaceSuggestions,
  mergePlaceSuggestions,
  requestLegacyGooglePredictions,
  searchTaiwanPlacesLive,
  type PlaceSuggestion,
} from '@/services/placeSearchService'
import type { ExploreRadius, ExploreScope } from '@/types/explore'

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
const canApply = computed(() => Boolean(
  draft.location.trim() && hasValidExploreCoordinates(draft),
))

let previousFocus: HTMLElement | null = null
let previousBodyOverflow = ''

const selectedParkData = ref<SelectedParkResult | null>(null)
const {
  isLocating,
  errorMessage: locationError,
  detect: resolveCurrentLocation,
  reset: resetLocationStatus,
} = useCurrentLocation()

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
let activeSearchId = 0

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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.value}&libraries=places,marker&language=zh-TW&region=TW&v=weekly&loading=async`
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
  const searchId = ++activeSearchId
  if (!text) {
    overlaySuggestions.value = []
    isSearchingPlaces.value = false
    return
  }

  const localSuggestions = findLocalPlaceSuggestions(props.parks, text)
  overlaySuggestions.value = localSuggestions
  isSearchingPlaces.value = true

  try {
    const isReady = await initPlacesServices()
    if (searchId !== activeSearchId) return

    let remoteSuggestions: PlaceSuggestion[] = []
    if (isReady && autocompleteService) {
      remoteSuggestions = await requestLegacyGooglePredictions(
        autocompleteService,
        {
          input: text,
          componentRestrictions: { country: 'tw' },
          sessionToken,
          language: 'zh-TW',
        },
        window.google.maps.places.PlacesServiceStatus.OK,
      )
    }

    if (searchId !== activeSearchId) return
    if (!remoteSuggestions.length) remoteSuggestions = await searchTaiwanPlacesLive(text)
    if (searchId !== activeSearchId) return

    overlaySuggestions.value = mergePlaceSuggestions(remoteSuggestions, localSuggestions)
  } finally {
    if (searchId === activeSearchId) isSearchingPlaces.value = false
  }
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
  activeSearchId += 1
  if (debounceTimer) clearTimeout(debounceTimer)
  isDedicatedSearchOpen.value = false
  overlayQuery.value = ''
  overlaySuggestions.value = []
  isSearchingPlaces.value = false
}

async function selectGpsAndClose() {
  const resolved = await resolveCurrentLocation(draft.radius)
  if (!resolved) return

  Object.assign(draft, resolved)
  selectedParkData.value = null
  closeDedicatedSearch()
}

async function selectCurrentLocation() {
  const resolved = await resolveCurrentLocation(draft.radius)
  if (!resolved) return

  Object.assign(draft, resolved)
  selectedParkData.value = null
}

function clearSelectedGooglePark() {
  draft.selectedParkId = null
  selectedParkData.value = null
  draft.locationMode = 'current'
  draft.location = ''
  draft.centerCoords = null
  draft.locationSource = null
}

function handleGoogleParkSelect(result: SelectedParkResult) {
  resetLocationStatus()
  selectedParkData.value = result
  draft.locationMode = 'park'
  draft.locationSource = 'manual'
  draft.selectedParkId = result.name
  draft.location = result.district || result.name
  if (typeof result.lat === 'number' && typeof result.lng === 'number') {
    draft.centerCoords = { lat: result.lat, lng: result.lng }
  } else {
    draft.centerCoords = null
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
  activeSearchId += 1
  if (debounceTimer) clearTimeout(debounceTimer)
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
                <span class="tag tag--success">✓ 已選搜尋中心</span>
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

              <button class="btn-gps-shortcut" type="button" :disabled="isLocating" @click="selectCurrentLocation">
                <LocateFixed :size="16" :class="{ 'animate-spin': isLocating }" aria-hidden="true" />
                <span>{{ isLocating ? '正在取得 GPS 定位...' : '改用我目前的 GPS 位置' }}</span>
              </button>
            </div>

            <!-- B. 已定位 GPS 位置模式 -->
            <div v-else-if="draft.location && hasValidExploreCoordinates(draft)" class="scope-search-block">
              <div class="current-gps-location-card">
                <div class="current-gps-icon">
                  <LocateFixed :size="22" :class="{ 'animate-spin': isLocating }" aria-hidden="true" />
                </div>
                <div class="current-gps-text">
                  <div class="current-gps-tag-row">
                    <span class="tag">📍 目前 GPS 位置</span>
                    <button class="btn-re-locate" type="button" :disabled="isLocating" @click="selectCurrentLocation">
                      {{ isLocating ? '定位中...' : '重新定位' }}
                    </button>
                  </div>
                  <strong>{{ draft.location }}</strong>
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

            <!-- C. 預設空值：尚未選擇位置時的引導選擇卡片 -->
            <div v-else class="scope-empty-guidance-card">
              <div class="scope-empty-guidance-header">
                <div class="current-gps-icon">
                  <MapPin :size="22" aria-hidden="true" />
                </div>
                <div>
                  <strong>請選擇您的活動搜尋中心</strong>
                  <small>設定位置後，將為您精準探索周邊半徑內的公園活動</small>
                </div>
              </div>
              <div class="scope-empty-guidance-actions">
                <button class="button button--primary button--full" type="button" :disabled="isLocating" @click="selectCurrentLocation">
                  <LocateFixed :size="18" :class="{ 'animate-spin': isLocating }" aria-hidden="true" />
                  <span>{{ isLocating ? '正在取得 GPS 定位...' : '使用我目前的 GPS 即時位置' }}</span>
                </button>
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
                  <span class="search-trigger-placeholder">搜尋全台灣地點或公園...</span>
                </div>
              </div>
            </div>
          </fieldset>

          <p v-if="locationError" class="scope-location-error" role="alert">
            <MapPin :size="18" aria-hidden="true" />
            <span>{{ locationError }}</span>
          </p>

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
            <button class="search-overlay-gps-btn" type="button" :disabled="isLocating" @click="selectGpsAndClose">
            <div class="search-overlay-gps-icon">
              <LocateFixed :size="18" :class="{ 'animate-spin': isLocating }" aria-hidden="true" />
            </div>
            <div class="search-overlay-gps-text">
              <strong>使用我目前的 GPS 位置</strong>
              <small>{{ isLocating ? '正在取得 GPS 定位...' : '只會使用這次取得的實際座標' }}</small>
            </div>
          </button>
        </div>

        <!-- 即時搜尋結果捲動清單 (100% 滿版無阻礙) -->
        <div class="search-overlay-results">
          <div v-if="overlaySuggestions.length > 0" class="search-overlay-list">
            <div class="search-overlay-list-header">
              <Loader2 v-if="isSearchingPlaces" :size="14" class="animate-spin" aria-hidden="true" />
              <Sparkles v-else :size="14" aria-hidden="true" />
              <span>{{ isSearchingPlaces ? '正在補充更多地點…' : '地點搜尋結果' }}</span>
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

          <div v-else-if="isSearchingPlaces" class="search-overlay-status">
            <Loader2 :size="20" class="animate-spin" aria-hidden="true" />
            <span>正在搜尋全台地點...</span>
          </div>

          <div v-else-if="overlayQuery.trim()" class="search-overlay-empty">
            <p>找不到符合「{{ overlayQuery }}」的地點，請嘗試其他關鍵字</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
