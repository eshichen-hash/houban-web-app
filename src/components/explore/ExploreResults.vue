<script setup lang="ts">
import { useTemplateRef } from 'vue'
import CompactEventCard from '@/components/explore/CompactEventCard.vue'
import type { EventItem } from '@/data/events'

const props = defineProps<{
  events: readonly EventItem[]
  totalCount: number
  filterSummary: string
  hasMore: boolean
}>()

const emit = defineEmits<{
  showMore: []
}>()

const heading = useTemplateRef<HTMLHeadingElement>('heading')

function focusHeading() {
  heading.value?.focus({ preventScroll: true })
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  heading.value?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

defineExpose({ focusHeading })
</script>

<template>
  <section class="result-section" aria-labelledby="explore-results-title">
    <div class="result-section__heading">
      <div>
        <span class="eyebrow">附近活動</span>
        <h2 id="explore-results-title" ref="heading" tabindex="-1">找到 {{ props.totalCount }} 場活動</h2>
      </div>
      <span class="result-section__context">{{ props.filterSummary }}</span>
    </div>

    <div v-if="props.events.length" class="result-list">
      <CompactEventCard v-for="event in props.events" :key="event.id" :event="event" />
    </div>
    <div v-else class="empty-state">
      <h3>目前沒有符合條件的活動</h3>
      <p>請調整日期、興趣或活動搜尋範圍。</p>
    </div>

    <div v-if="props.events.length" class="result-section__footer">
      <p>已顯示 {{ props.events.length }}／{{ props.totalCount }} 場</p>
      <button v-if="props.hasMore" class="button button--secondary" type="button" @click="emit('showMore')">
        顯示更多活動
      </button>
    </div>
  </section>
</template>
