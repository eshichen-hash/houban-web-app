<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useTemplateRef } from 'vue'
import EventCard from '@/components/EventCard.vue'
import { useAppState } from '@/composables/useAppState'
import { useHorizontalCarousel } from '@/composables/useHorizontalCarousel'
import type { EventItem } from '@/data/events'

const props = defineProps<{
  events: readonly EventItem[]
  favorites: readonly string[]
}>()

const emit = defineEmits<{
  open: [event: EventItem]
  share: [event: EventItem]
  toggleFavorite: [event: EventItem]
}>()

const { state } = useAppState()
const track = useTemplateRef<HTMLDivElement>('track')
const { currentIndex, itemCount, canPrevious, canNext, move } = useHorizontalCarousel(track, {
  itemSelector: '.recommendation-slide',
})
</script>

<template>
  <section class="recommendation-carousel" aria-labelledby="recommendation-title">
    <div class="recommendation-heading">
      <div>
        <span class="eyebrow">今日推薦</span>
        <h1 id="recommendation-title">今天適合參加的活動</h1>
      </div>
      <span v-if="props.events.length" class="recommendation-heading__note">精選 {{ props.events.length }} 場</span>
    </div>

    <div v-if="props.events.length" ref="track" class="recommendation-track" aria-label="推薦活動卡片，可左右滑動">
      <div v-for="(event, index) in props.events" :key="event.id" class="recommendation-slide">
        <EventCard
          :event="event"
          featured
          :priority="index === 0"
          :favorite="props.favorites.includes(event.id)"
          :registered="state.registered.includes(event.id)"
          @open="emit('open', $event)"
          @share="emit('share', $event)"
          @toggle-favorite="emit('toggleFavorite', $event)"
        />
      </div>
    </div>

    <div v-else class="empty-state">
      <h2>今天暫時沒有推薦活動</h2>
      <p>可以調整位置範圍，或使用下方篩選查看其他日期。</p>
    </div>

    <template v-if="props.events.length > 1">
      <button class="carousel-arrow carousel-arrow--previous" type="button" aria-label="查看上一張推薦活動" :disabled="!canPrevious" @click="move(-1)">
        <ChevronLeft :size="24" aria-hidden="true" />
      </button>
      <button class="carousel-arrow carousel-arrow--next" type="button" aria-label="查看下一張推薦活動" :disabled="!canNext" @click="move(1)">
        <ChevronRight :size="24" aria-hidden="true" />
      </button>
      <div class="recommendation-dots" aria-hidden="true">
        <span v-for="index in itemCount" :key="index" :class="{ 'is-active': currentIndex === index - 1 }"></span>
      </div>
      <p class="sr-only" aria-live="polite">第 {{ currentIndex + 1 }} 張，共 {{ itemCount }} 張推薦活動</p>
    </template>
  </section>
</template>
