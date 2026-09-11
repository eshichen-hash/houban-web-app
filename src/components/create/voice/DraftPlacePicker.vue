<script setup lang="ts">
import { MapPin, Search, LoaderCircle } from 'lucide-vue-next'
import { onScopeDispose, shallowRef, watch } from 'vue'
import { createDraftPlaceSearch } from '@/services/draftPlaceService'
import type { PlaceSuggestion } from '@/services/placeSearchService'
import type { SelectedParkResult } from '@/types/places'
import DraftMapPreview from './DraftMapPreview.vue'
const props = defineProps<{ initialQuery: string }>()
const emit = defineEmits<{ select: [place: SelectedParkResult] }>()
const service = createDraftPlaceSearch()
const query = shallowRef(props.initialQuery), results = shallowRef<PlaceSuggestion[]>([])
const loading = shallowRef(false), warning = shallowRef(''), selected = shallowRef<SelectedParkResult | null>(null)
let timer: ReturnType<typeof setTimeout>, run = 0
async function search() {
  const current = ++run; selected.value = null; results.value = []
  if (!query.value.trim()) { loading.value = false; warning.value = ''; return }
  loading.value = true; warning.value = ''
  const response = await service.search(query.value.trim())
  if (current !== run) return
  results.value = response.results; warning.value = response.warning; loading.value = false
}
watch(query, () => { ++run; clearTimeout(timer); selected.value = null; emit('select', { name: '', address: '', district: '' }); timer = setTimeout(search, 350) }, { immediate: true })
async function choose(item: PlaceSuggestion) {
  const current = ++run; loading.value = true
  try { const place = await service.select(item); if (current === run) { selected.value = place; emit('select', place); warning.value = ''; results.value = [] } }
  catch (error) { if (current === run) warning.value = error instanceof Error ? error.message : '地點載入失敗，請重試。' }
  finally { if (current === run) loading.value = false }
}
onScopeDispose(() => { ++run; clearTimeout(timer) })
</script>
<template>
  <div class="vd-place-picker">
    <label class="vd-input-label" for="draft-park-search">搜尋公園或地點</label>
    <div class="vd-search-box"><Search :size="20" aria-hidden="true" /><input id="draft-park-search" v-model="query" type="search" autocomplete="off" placeholder="例如：大安森林公園" /></div>
    <p class="vd-muted">確認名稱與地址後，再按下方「確認此地點」。</p>
    <p v-if="loading" role="status" class="vd-inline"><LoaderCircle class="vd-spin" :size="20" />正在搜尋地點…</p>
    <p v-if="warning" role="status" class="vd-warning">{{ warning }} <button class="vd-text-button" @click="search">重新搜尋</button></p>
    <ul v-if="results.length" class="vd-place-results" aria-label="地點搜尋結果">
      <li v-for="item in results" :key="item.placeId"><button type="button" @click="choose(item)"><MapPin :size="22" aria-hidden="true" /><span><strong>{{ item.mainText }}</strong><small>{{ item.secondaryText }}</small><small>{{ item.source === 'google' ? 'Google 地圖' : '已收錄公園' }}</small></span></button></li>
    </ul>
    <div v-else-if="selected" class="vd-selected-place"><MapPin aria-hidden="true" /><strong>{{ selected.name }}</strong><p>{{ selected.address }}</p><a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.name + ' ' + selected.address)}${selected.placeId?.startsWith('ChIJ') ? '&query_place_id=' + encodeURIComponent(selected.placeId) : ''}`" target="_blank" rel="noopener noreferrer">在 Google 地圖核對地點（另開分頁）</a></div>
    <p v-else-if="query && !loading && !warning" role="status">找不到符合的地點，試試公園全名或加上縣市。</p>
    <DraftMapPreview v-if="selected && selected.lat !== undefined && selected.lng !== undefined" :key="selected.placeId" :place="selected" />
    <p v-if="results.some(item => item.source === 'google')" class="vd-google-attribution" translate="no">Google Maps</p>
  </div>
</template>
