<script setup lang="ts">
import { LocateFixed, MapPin, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, reactive, ref, useTemplateRef, watch } from 'vue'
import ParkAutocomplete, { type SelectedParkResult } from '@/components/ParkAutocomplete.vue'
import type { Park } from '@/data/events'
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
const radiusOptions: ExploreRadius[] = [1, 3, 5, 10]
const draft = reactive<ExploreScope>({ ...props.scope })
const searchQuery = ref('')
const canApply = computed(() => true)

let previousFocus: HTMLElement | null = null
let previousBodyOverflow = ''

const selectedParkData = ref<SelectedParkResult | null>(null)
const isLocating = ref(false)

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

      // 1. 若 Google Maps SDK 已就緒，使用 Google Geocoder 進行反向地理編碼
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

      // 2. 網絡備援反向編碼
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
  searchQuery.value = ''
  draft.locationMode = 'current'
}

function handleGoogleParkSelect(result: SelectedParkResult) {
  searchQuery.value = result.name
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
    syncDraft()
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    panel.value?.focus()
    emit('preview', { ...draft })
    return
  }

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
      <div class="responsive-dialog__backdrop" aria-hidden="true"></div>
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

            <!-- 預設：即時搜尋框 ＋ GPS 快捷按鈕 -->
            <div v-else class="scope-search-block">
              <ParkAutocomplete
                v-model="searchQuery"
                placeholder="輸入地點或公園名稱"
                :auto-focus="false"
                @select="handleGoogleParkSelect"
              />
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
  </Teleport>
</template>
