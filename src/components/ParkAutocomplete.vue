<script setup lang="ts">
import { Building2, Check, Loader2, MapPin, Search, Sparkles, X } from 'lucide-vue-next'
import { nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

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
}

const props = withDefaults(
  defineProps<{
    placeholder?: string
    modelValue?: string
    autoFocus?: boolean
  }>(),
  {
    placeholder: '請輸入想搜尋的公園（例：大安森林公園、青年公園）...',
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
 * 執行即時搜尋推薦
 */
async function fetchSuggestions(input: string) {
  const trimmed = input.trim()
  if (!trimmed) {
    suggestions.value = []
    showDropdown.value = false
    return
  }

  if (!autocompleteService) {
    await initServices()
  }

  if (!autocompleteService) {
    return
  }

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
        suggestions.value = predictions.map((p) => ({
          placeId: p.place_id,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
          fullText: p.description,
        }))
        showDropdown.value = true
      } else {
        suggestions.value = []
      }
    })
  } catch (err) {
    isSearching.value = false
    console.warn('取得 Places 推薦清單時發生錯誤:', err)
  }
}

/**
 * 使用者點選推薦項目
 */
function handleSelectSuggestion(item: PlaceSuggestion) {
  query.value = item.mainText
  selectedName.value = item.mainText
  showDropdown.value = false
  emit('update:modelValue', item.mainText)

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
      district: '台北市',
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
  margin-bottom: 12px;
}

.park-autocomplete-input-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 52px;
  background: var(--paper);
  border: 2px solid var(--line);
  border-radius: var(--radius-control);
  padding: 0 14px;
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
  color: var(--color-primary);
  flex: 0 0 auto;
  margin-right: 10px;
}

.park-search-input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-size: 1.02rem;
  font-weight: 600;
  padding: 10px 0;
}

.park-search-input::placeholder {
  color: var(--color-text-muted);
  font-weight: 400;
}

.clear-button {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  display: grid;
  place-items: center;
  padding: 6px;
  cursor: pointer;
  border-radius: 50%;
  flex: 0 0 auto;
}

.clear-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--ink);
}

.places-dropdown-panel {
  margin-top: 6px;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(33, 76, 105, 0.16);
  overflow: hidden;
  display: grid;
  gap: 2px;
  padding: 6px 0;
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
  padding: 6px 14px 4px;
  font-size: 0.76rem;
  font-weight: 800;
  color: #214c69;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.places-dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
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
  width: 32px;
  height: 32px;
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
  font-size: 0.98rem;
  color: #20343b;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.places-item-desc {
  display: block;
  font-size: 0.8rem;
  color: #65777a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
