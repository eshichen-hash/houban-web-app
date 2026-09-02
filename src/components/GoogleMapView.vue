<script setup lang="ts">
import { MapPin, Navigation, Sparkles } from 'lucide-vue-next'
import { onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { openGoogleMapsDirections, type MapCoordinates } from '@/utils/mapUtils'

const props = withDefaults(
  defineProps<{
    destinationName: string
    address?: string
    meetingPoint?: string
    coordinates?: MapCoordinates
    zoom?: number
    height?: string
  }>(),
  {
    address: '',
    meetingPoint: '',
    zoom: 16,
    height: '240px',
  }
)

const mapContainer = useTemplateRef<HTMLDivElement>('mapContainer')
const apiKey = shallowRef(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '')
const mapId = shallowRef(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID')
const isMapLoaded = shallowRef(false)
const loadError = shallowRef(false)

function handleNavigate() {
  const dest = props.meetingPoint
    ? `${props.destinationName} ${props.meetingPoint}`
    : props.destinationName
  openGoogleMapsDirections(dest, props.coordinates)
}

declare global {
  interface Window {
    google?: any
    __googleMapsLoadingPromise?: Promise<void>
  }
}

async function initMap() {
  if (!apiKey.value || !mapContainer.value) return

  try {
    if (!window.google?.maps) {
      if (!window.__googleMapsLoadingPromise) {
        window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.value}&v=weekly&libraries=maps,marker`
          script.async = true
          script.defer = true
          script.onload = () => resolve()
          script.onerror = (e) => reject(e)
          document.head.appendChild(script)
        })
      }
      await window.__googleMapsLoadingPromise
    }

    const { Map } = (await window.google.maps.importLibrary('maps')) as any
    const { AdvancedMarkerElement, PinElement } = (await window.google.maps.importLibrary('marker')) as any

    const center = props.coordinates || { lat: 25.0331, lng: 121.5354 }

    const map = new Map(mapContainer.value, {
      center,
      zoom: props.zoom,
      mapId: mapId.value,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    const pin = new PinElement({
      background: '#214c69',
      borderColor: '#fff',
      glyphColor: '#fff',
    })

    const marker = new AdvancedMarkerElement({
      map,
      position: center,
      title: props.destinationName,
      content: pin.element,
    })

    if (props.meetingPoint || props.address) {
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 6px 8px; font-family: sans-serif; color: #20343b;">
            <strong style="font-size: 1rem; color: #214c69; display: block; margin-bottom: 2px;">${props.destinationName}</strong>
            ${props.meetingPoint ? `<span style="font-size: 0.85rem; color: #5c8666; font-weight: 700; display: block;">📍 ${props.meetingPoint}</span>` : ''}
            ${props.address ? `<small style="font-size: 0.78rem; color: #65777a;">${props.address}</small>` : ''}
          </div>
        `,
      })

      marker.addListener('click', () => {
        infoWindow.open({
          anchor: marker,
          map,
        })
      })
    }

    isMapLoaded.value = true
  } catch (err) {
    console.warn('Google Maps interactive rendering fallback:', err)
    loadError.value = true
  }
}

onMounted(() => {
  if (apiKey.value) {
    initMap()
  }
})

watch(
  () => props.coordinates,
  () => {
    if (apiKey.value && !isMapLoaded.value) {
      initMap()
    }
  }
)
</script>

<template>
  <section class="google-map-widget" aria-label="活動地點地圖與導航">
    <!-- 互動地圖容器 -->
    <div
      v-if="apiKey && !loadError"
      ref="mapContainer"
      class="google-map-container"
      :style="{ height: props.height }"
    ></div>

    <!-- 靜態優雅預覽卡片（未填 API Key 或載入中之安全備援） -->
    <div
      v-else
      class="google-map-fallback"
      :style="{ minHeight: props.height }"
      @click="handleNavigate"
    >
      <div class="google-map-fallback__bg" aria-hidden="true"></div>
      <div class="google-map-fallback__content">
        <div class="google-map-pin-badge">
          <MapPin :size="28" style="color: #214c69;" />
        </div>
        <strong>{{ props.destinationName }}</strong>
        <p v-if="props.meetingPoint" class="meeting-highlight">
          📍 集合點：{{ props.meetingPoint }}
        </p>
        <span v-if="props.address" class="address-text">{{ props.address }}</span>
        <span class="tap-hint">點擊直接啟動 Google 地圖導航 →</span>
      </div>
    </div>

    <!-- 底部一鍵導航動作條 -->
    <div class="google-map-action-bar">
      <div class="location-summary">
        <MapPin :size="20" style="color: #214c69; flex: 0 0 auto;" />
        <div class="location-summary__text">
          <strong>{{ props.destinationName }}</strong>
          <span v-if="props.meetingPoint">{{ props.meetingPoint }}</span>
        </div>
      </div>
      <button class="button button--primary map-nav-btn" type="button" @click="handleNavigate">
        <Navigation :size="18" aria-hidden="true" />
        開啟導航
      </button>
    </div>
  </section>
</template>

<style scoped>
.google-map-widget {
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  background: var(--paper);
  box-shadow: var(--shadow-card);
  margin: 16px 0;
}

.google-map-container {
  width: 100%;
  background: #e8eff2;
}

.google-map-fallback {
  position: relative;
  width: 100%;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: linear-gradient(135deg, #e8eff2 0%, #d8e0d8 100%);
  cursor: pointer;
  overflow: hidden;
}

.google-map-fallback__bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#214c69 1px, transparent 1px);
  background-size: 16px 16px;
  opacity: 0.15;
}

.google-map-fallback__content {
  position: relative;
  z-index: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.google-map-pin-badge {
  width: 52px;
  height: 52px;
  background: #ffffff;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 14px rgba(33, 76, 105, 0.15);
  margin-bottom: 6px;
}

.google-map-fallback__content strong {
  font-size: 1.15rem;
  color: var(--color-primary);
  font-weight: 800;
}

.meeting-highlight {
  margin: 0;
  font-size: 0.92rem;
  color: var(--color-success-strong);
  font-weight: 800;
}

.address-text {
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.tap-hint {
  display: inline-block;
  margin-top: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 12px;
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
}

.google-map-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 253, 248, 0.98);
  border-top: 1px solid var(--line);
}

.location-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.location-summary__text {
  min-width: 0;
}

.location-summary__text strong {
  display: block;
  font-size: 0.96rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-summary__text span {
  display: block;
  font-size: 0.8rem;
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-nav-btn {
  min-height: 44px;
  padding: 8px 16px;
  font-size: 0.92rem;
  flex: 0 0 auto;
  gap: 6px;
  background: #214c69;
}
</style>
