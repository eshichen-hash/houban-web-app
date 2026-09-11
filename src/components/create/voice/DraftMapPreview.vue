<script setup lang="ts">
import { onMounted, onScopeDispose, shallowRef, useTemplateRef } from 'vue'
import type { SelectedParkResult } from '@/types/places'
import { loadDraftPlaces } from '@/services/draftPlaceService'
const props = defineProps<{ place: SelectedParkResult }>()
const canvas = useTemplateRef<HTMLDivElement>('canvas'), error = shallowRef(false)
let active = true, map: any
onMounted(async () => {
  try {
    await loadDraftPlaces()
    const library = await window.google.maps.importLibrary('maps')
    if (!active || !canvas.value || props.place.lat === undefined || props.place.lng === undefined) return
    const center = { lat: props.place.lat, lng: props.place.lng }
    map = new library.Map(canvas.value, { center, zoom: 16, disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative', mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID' })
    const markerLibrary = await window.google.maps.importLibrary('marker')
    if (active) new markerLibrary.AdvancedMarkerElement({ map, position: center, title: props.place.name })
  } catch { if (active) error.value = true }
})
onScopeDispose(() => { active = false; if (map) window.google?.maps?.event?.clearInstanceListeners(map) })
</script>
<template><p v-if="error" class="vd-muted">地圖預覽暫時無法載入，可依名稱、地址確認，或另開 Google 地圖核對。</p><div v-else ref="canvas" class="vd-map" role="region" :aria-label="`${place.name}的 Google 地圖`"></div></template>
