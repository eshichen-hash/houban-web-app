<script setup lang="ts">
import { MapPin, Search, X } from 'lucide-vue-next'
import { nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

export interface SelectedParkResult {
  name: string
  address: string
  district: string
  lat?: number
  lng?: number
  placeId?: string
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
const query = shallowRef(props.modelValue)
const apiKey = shallowRef(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '')
let autocompleteInstance: any = null

function handleInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  query.value = val
  emit('update:modelValue', val)
}

function clearQuery() {
  query.value = ''
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

/**
 * 依據 Google Maps Places Autocomplete 官方 3 步驟實作
 */
async function initGooglePlacesAutocomplete() {
  if (!inputRef.value) return

  // 1. 若環境有 API Key 且尚未載入 Google Maps SDK，則動態載入包含 libraries=places
  if (apiKey.value && !window.google?.maps?.places) {
    if (!window.__googleMapsLoadingPromise) {
      window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.value}&libraries=places,marker&v=weekly`
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = (err) => reject(err)
        document.head.appendChild(script)
      })
    }
    try {
      await window.__googleMapsLoadingPromise
    } catch (e) {
      console.warn('Google Places API script load error:', e)
      return
    }
  }

  // 2. 綁定 Autocomplete 並限制為台灣境內公園 (types: ['park'], country: 'tw')
  if (window.google?.maps?.places?.Autocomplete && inputRef.value) {
    try {
      const options = {
        types: ['park'], // 限制搜尋類型為公園
        componentRestrictions: { country: 'tw' }, // 限制只搜尋台灣境內地點
        fields: ['place_id', 'geometry', 'name', 'formatted_address', 'address_components'], // 指定欄位以優化計費
      }

      autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.value, options)

      // 3. 監聽 place_changed 使用者選取事件
      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace()
        if (!place || !place.name) return

        let district = ''
        if (place.address_components) {
          const sublocality = place.address_components.find((c: any) =>
            c.types.includes('sublocality_level_1') || c.types.includes('administrative_area_level_3')
          )
          if (sublocality) district = sublocality.long_name
        }

        const result: SelectedParkResult = {
          name: place.name,
          address: place.formatted_address || '',
          district: district || '台北市',
          placeId: place.place_id,
          lat: place.geometry?.location?.lat ? place.geometry.location.lat() : undefined,
          lng: place.geometry?.location?.lng ? place.geometry.location.lng() : undefined,
        }

        query.value = place.name
        emit('update:modelValue', place.name)
        emit('select', result)
      })
    } catch (err) {
      console.warn('Autocomplete init error:', err)
    }
  }
}

onMounted(() => {
  nextTick(() => {
    initGooglePlacesAutocomplete()
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
    <div class="park-autocomplete-input-box">
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
      />
      <button
        v-if="query"
        class="clear-button"
        type="button"
        aria-label="清除搜尋內容"
        @click="clearQuery"
      >
        <X :size="18" aria-hidden="true" />
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

.park-autocomplete-input-box:focus-within {
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
</style>
