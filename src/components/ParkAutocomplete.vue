<script setup lang="ts">
import { Building2, Check, Loader2, MapPin, Search, Sparkles, X } from 'lucide-vue-next'
import { nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { parks } from '@/data/events'

export interface SelectedParkResult {
  name: string
  address: string
  district: string
  lat?: number
  lng?: number
  placeId?: string
}

interface PlaceSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
  fullText: string
  source?: 'google' | 'local'
  lat?: number
  lng?: number
  district?: string
}

const props = withDefaults(
  defineProps<{
    placeholder?: string
    modelValue?: string
    autoFocus?: boolean
  }>(),
  {
    placeholder: '請輸入想搜尋的公園（例：青年公園、大安森林公園、花博）...',
    modelValue: '',
    autoFocus: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [park: SelectedParkResult]
}>()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const query = ref(props.modelValue)
const apiKey = shallowRef(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '')
const isSearching = ref(false)
const suggestions = ref<PlaceSuggestion[]>([])
const showDropdown = ref(false)
const selectedName = ref('')

let autocompleteService: any = null
let placesService: any = null
let sessionToken: any = null

/**
 * 載入 Google Maps JavaScript API (包含 Places 程式庫)
 */
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
  } catch (err) {
    console.warn('Google Maps SDK 載入失敗:', err)
    return false
  }
}

/**
 * 初始化 AutocompleteService 與 SessionToken (計費優化)
 */
async function initServices() {
  const loaded = await loadGoogleMapsSDK()
  if (loaded && window.google?.maps?.places) {
    try {
      autocompleteService = new window.google.maps.places.AutocompleteService()
      const dummyDiv = document.createElement('div')
      placesService = new window.google.maps.places.PlacesService(dummyDiv)
      sessionToken = new window.google.maps.places.AutocompleteSessionToken()
    } catch (e) {
      console.warn('Google Places Services 初始化失敗:', e)
    }
  }
}

/**
 * 執行即時搜尋推薦 (Google Places API + 在地公園資料庫 + 網絡備援)
 */
async function fetchSuggestions(input: string) {
  const trimmed = input.trim()
  if (!trimmed) {
    suggestions.value = []
    showDropdown.value = false
    return
  }

  // 1. 本地全台主要公園即時毫秒匹配
  const q = trimmed.toLowerCase()
  const localMatched: PlaceSuggestion[] = parks
    .filter((p) => p.name.toLowerCase().includes(q) || p.district.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
    .map((p) => ({
      placeId: p.id,
      mainText: p.name,
      secondaryText: `${p.district}・${p.address}`,
      fullText: `${p.name} ${p.address}`,
      source: 'local' as const,
      lat: p.lat,
      lng: p.lng,
      district: p.district,
    }))

  suggestions.value = localMatched
  showDropdown.value = true

  // 2. Google Places API 聯網搜尋（若已配置金鑰）
  if (!autocompleteService) {
    await initServices()
  }

  if (autocompleteService) {
    isSearching.value = true
    try {
      const request = {
        input: trimmed,
        componentRestrictions: { country: 'tw' },
        sessionToken,
      }

      autocompleteService.getPlacePredictions(request, (predictions: any[], status: any) => {
        isSearching.value = false
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && predictions?.length) {
          const googleItems: PlaceSuggestion[] = predictions.map((p) => ({
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || p.description,
            fullText: p.description,
            source: 'google' as const,
          }))

          // 優先以 Google Places 即時搜尋結果為主，並整合在地項目
          const merged: PlaceSuggestion[] = [...googleItems]
          for (const l of localMatched) {
            if (!merged.some((m) => m.mainText === l.mainText)) {
              merged.push(l)
            }
          }
          suggestions.value = merged
          showDropdown.value = true
        }
      })
    } catch (err) {
      isSearching.value = false
      console.warn('取得 Google Places 推薦清單時發生錯誤:', err)
    }
  } else {
    // 3. 若尚未能連線 Google SDK，使用網絡即時地理資料補充
    if (localMatched.length === 0) {
      isSearching.value = true
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=tw&q=${encodeURIComponent(trimmed + ' 公園')}&limit=6`)
        const data = await res.json()
        isSearching.value = false
        if (Array.isArray(data) && data.length > 0) {
          suggestions.value = data.map((item: any) => ({
            placeId: String(item.place_id),
            mainText: item.display_name.split(',')[0],
            secondaryText: item.display_name,
            fullText: item.display_name,
            source: 'local' as const,
            lat: Number(item.lat),
            lng: Number(item.lon),
            district: '全台地點',
          }))
          showDropdown.value = true
        }
      } catch {
        isSearching.value = false
      }
    }
  }
}
function handleSelectSuggestion(item: PlaceSuggestion) {
  query.value = item.mainText
  selectedName.value = item.mainText
  showDropdown.value = false
  emit('update:modelValue', item.mainText)

  if (item.source === 'local') {
    emit('select', {
      name: item.mainText,
      address: item.secondaryText,
      district: item.district || '台北市',
      placeId: item.placeId,
      lat: item.lat,
      lng: item.lng,
    })
    return
  }

  if (placesService && item.placeId) {
    placesService.getDetails(
      {
        placeId: item.placeId,
        fields: ['name', 'formatted_address', 'geometry', 'address_components'],
        sessionToken,
      },
      (place: any, status: any) => {
        // 重設 sessionToken 供下次搜尋優化計費
        if (window.google?.maps?.places?.AutocompleteSessionToken) {
          sessionToken = new window.google.maps.places.AutocompleteSessionToken()
        }

        let district = ''
        if (place?.address_components) {
          const sub = place.address_components.find((c: any) =>
            c.types.includes('sublocality_level_1') || c.types.includes('administrative_area_level_3')
          )
          if (sub) district = sub.long_name
        }

        const result: SelectedParkResult = {
          name: place?.name || item.mainText,
          address: place?.formatted_address || item.secondaryText,
          district: district || '台北市',
          placeId: item.placeId,
          lat: place?.geometry?.location?.lat ? place.geometry.location.lat() : undefined,
          lng: place?.geometry?.location?.lng ? place.geometry.location.lng() : undefined,
        }

        emit('select', result)
      }
    )
  } else {
    emit('select', {
      name: item.mainText,
      address: item.secondaryText,
      district: item.district || '台北市',
      placeId: item.placeId,
    })
  }
}

let debounceTimer: any = null
function handleInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  query.value = val
  emit('update:modelValue', val)

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchSuggestions(val)
  }, 220)
}

function clearQuery() {
  query.value = ''
  selectedName.value = ''
  suggestions.value = []
  showDropdown.value = false
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

onMounted(() => {
  nextTick(() => {
    initServices()
    if (props.autoFocus) {
      inputRef.value?.focus()
    }
  })
})

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== query.value) {
      query.value = newVal
    }
  }
)
</script>

<template>
  <div class="park-autocomplete-wrapper">
    <div class="park-autocomplete-input-box" :class="{ 'is-active': showDropdown && suggestions.length > 0 }">
      <Search :size="20" class="search-icon" aria-hidden="true" />
      <input
        id="pac-input"
        ref="inputRef"
        type="text"
        :value="query"
        :placeholder="props.placeholder"
        autocomplete="off"
        class="park-search-input"
        @input="handleInput"
        @focus="fetchSuggestions(query)"
      />
      <Loader2 v-if="isSearching" :size="18" class="animate-spin text-muted" aria-hidden="true" />
      <button
        v-else-if="query"
        class="clear-button"
        type="button"
        aria-label="清除搜尋內容"
        @click="clearQuery"
      >
        <X :size="18" aria-hidden="true" />
      </button>
    </div>

    <!-- 即時 Google Places 推薦下拉卡片（內嵌式、不破壞 Modal 且高層級） -->
    <div v-if="showDropdown && suggestions.length > 0" class="places-dropdown-panel" role="listbox" aria-label="Google 即時地點推薦">
      <div class="places-dropdown-header">
        <Sparkles :size="15" />
        <span>Google 地圖即時推薦</span>
      </div>
      <button
        v-for="item in suggestions"
        :key="item.placeId"
        class="places-dropdown-item"
        :class="{ 'is-selected': selectedName === item.mainText }"
        type="button"
        role="option"
        @click="handleSelectSuggestion(item)"
      >
        <div class="places-item-icon">
          <MapPin :size="18" />
        </div>
        <div class="places-item-content">
          <strong class="places-item-title">{{ item.mainText }}</strong>
          <span class="places-item-desc">{{ item.secondaryText || item.fullText }}</span>
        </div>
        <Check v-if="selectedName === item.mainText" :size="18" class="places-item-check" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.park-autocomplete-wrapper {
  position: relative;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin-bottom: 6px;
}

.park-autocomplete-input-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 48px;
  background: var(--paper, #ffffff);
  border: 1.5px solid var(--line, #b9d0da);
  border-radius: var(--radius-control, 14px);
  padding: 0 10px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.park-autocomplete-input-box:focus-within,
.park-autocomplete-input-box.is-active {
  border-color: #214c69;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(33, 76, 105, 0.15);
}

.search-icon {
  color: var(--color-primary, #214c69);
  flex: 0 0 auto;
  margin-right: 8px;
}

.park-search-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink, #20343b);
  font-size: 0.96rem;
  font-weight: 600;
  padding: 8px 0;
}

.park-search-input::placeholder {
  color: var(--color-text-muted, #7c8f94);
  font-weight: 400;
  font-size: 0.88rem;
}

.clear-button {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  display: grid;
  place-items: center;
  padding: 4px;
  cursor: pointer;
  border-radius: 50%;
  flex: 0 0 auto;
}

.clear-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ink);
}

.places-dropdown-panel {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin-top: 6px;
  background: #ffffff;
  border: 1px solid var(--line, #b9d0da);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(33, 76, 105, 0.14);
  overflow: hidden;
  display: grid;
  gap: 2px;
  padding: 4px 0;
  animation: fadeIn 0.18s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.places-dropdown-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 2px;
  font-size: 0.74rem;
  font-weight: 800;
  color: #214c69;
  letter-spacing: 0.02em;
}

.places-dropdown-item {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.places-dropdown-item:hover,
.places-dropdown-item.is-selected {
  background: rgba(224, 242, 254, 0.6);
}

.places-item-icon {
  width: 28px;
  height: 28px;
  background: rgba(33, 76, 105, 0.08);
  color: #214c69;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.places-item-content {
  flex: 1;
  min-width: 0;
}

.places-item-title {
  display: block;
  font-size: 0.94rem;
  color: #20343b;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.places-item-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.76rem;
  color: #65777a;
  line-height: 1.35;
  margin-top: 1px;
}

.places-item-check {
  color: #15803d;
  flex: 0 0 auto;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .park-autocomplete-input-box {
    padding: 0 8px;
    min-height: 46px;
  }
  .park-search-input {
    font-size: 0.9rem;
  }
  .park-search-input::placeholder {
    font-size: 0.82rem;
  }
  .places-dropdown-item {
    padding: 7px 10px;
    gap: 8px;
  }
}
</style>
