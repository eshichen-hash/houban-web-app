<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import FilterPanel from '@/components/FilterPanel.vue'
import ExploreHeader from '@/components/explore/ExploreHeader.vue'
import ExploreResults from '@/components/explore/ExploreResults.vue'
import LocationScopeSheet from '@/components/explore/LocationScopeSheet.vue'
import RecommendationCarousel from '@/components/explore/RecommendationCarousel.vue'
import { useExploreDiscovery } from '@/composables/useExploreDiscovery'
import type { EventItem } from '@/data/events'
import type { ExploreFilters, ExploreScope } from '@/types/explore'

const router = useRouter()
const {
  state,
  parks,
  appliedScope,
  scopeSummary,
  filterSummary,
  recommendedEvents,
  filteredEvents,
  visibleResults,
  hasMoreResults,
  countForScope,
  countForFilters,
  applyScope,
  applyFilters,
  showMoreResults,
  toggleFavorite,
} = useExploreDiscovery()

const scopeOpen = shallowRef(false)
const filterOpen = shallowRef(false)
const statusMessage = shallowRef('')
const scopePreview = shallowRef<ExploreScope>({ ...appliedScope.value })
const filterPreview = shallowRef<ExploreFilters>({
  dateFilter: state.dateFilter,
  customDate: state.customDate,
  interest: state.interest,
})
const results = useTemplateRef<InstanceType<typeof ExploreResults>>('results')

const scopePreviewCount = computed(() => countForScope(scopePreview.value))
const filterPreviewCount = computed(() => countForFilters(filterPreview.value))

function openScopeSettings() {
  scopePreview.value = { ...appliedScope.value }
  scopeOpen.value = true
}

function previewScope(scope: ExploreScope) {
  scopePreview.value = scope
}

async function confirmScope(scope: ExploreScope) {
  applyScope(scope)
  scopeOpen.value = false
  statusMessage.value = `已更新活動範圍，共找到 ${filteredEvents.value.length} 場活動`
  await nextTick()
  results.value?.focusHeading()
}

function previewFilters(filters: ExploreFilters) {
  filterPreview.value = filters
}

async function confirmFilters(filters: ExploreFilters) {
  applyFilters(filters)
  statusMessage.value = `已套用篩選，共找到 ${countForFilters(filters)} 場活動`
  await nextTick()
  results.value?.focusHeading()
}

function openEvent(event: EventItem) {
  router.push(`/activity/${event.id}`)
}

async function shareEvent(event: EventItem) {
  statusMessage.value = `已準備分享「${event.title}」`
  if (!('share' in navigator)) return
  try {
    await navigator.share({
      title: event.title,
      text: `${event.title}｜${event.park.name}`,
      url: new URL(`/activity/${event.id}`, window.location.origin).toString(),
    })
  } catch {
    // 使用者取消系統分享面板時，不顯示錯誤。
  }
}

function onFavorite(event: EventItem) {
  toggleFavorite(event.id)
  statusMessage.value = state.favorites.includes(event.id)
    ? `已收藏「${event.title}」`
    : `已取消收藏「${event.title}」`
}

function showNotificationStatus() {
  statusMessage.value = '目前沒有新的活動通知'
}
</script>

<template>
  <div id="main-content" class="page-view explore-view">
    <ExploreHeader
      :scope-summary="scopeSummary"
      :radius="state.radius"
      @open-scope="openScopeSettings"
      @open-notifications="showNotificationStatus"
    />

    <main class="page-content explore-content">
      <RecommendationCarousel
        :events="recommendedEvents"
        :favorites="state.favorites"
        @open="openEvent"
        @share="shareEvent"
        @toggle-favorite="onFavorite"
      />

      <FilterPanel
        v-model:open="filterOpen"
        :date-filter="state.dateFilter"
        :interest="state.interest"
        :custom-date="state.customDate"
        :result-count="filterPreviewCount"
        @preview="previewFilters"
        @apply="confirmFilters"
      />

      <ExploreResults
        ref="results"
        :events="visibleResults"
        :total-count="filteredEvents.length"
        :filter-summary="filterSummary"
        :has-more="hasMoreResults"
        @show-more="showMoreResults"
      />
    </main>

    <LocationScopeSheet
      :open="scopeOpen"
      :scope="appliedScope"
      :parks="parks"
      :result-count="scopePreviewCount"
      @close="scopeOpen = false"
      @preview="previewScope"
      @apply="confirmScope"
    />

    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </div>
</template>
