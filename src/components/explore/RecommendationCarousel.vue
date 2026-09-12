<script setup lang="ts">
import EventCard from '@/components/EventCard.vue'
import { useAppState } from '@/composables/useAppState'
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

    <div v-if="props.events.length" class="recommendation-track" aria-label="今日推薦活動">
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
  </section>
</template>
