<script setup lang="ts">
import { Clock3, MapPin } from 'lucide-vue-next'
import type { EventItem } from '@/data/events'

const props = defineProps<{
  event: EventItem
}>()
</script>

<template>
  <article class="compact-event-card">
    <RouterLink class="compact-event-card__link" :to="`/activity/${props.event.id}`" :aria-label="`查看活動詳情：${props.event.title}`">
      <div class="compact-event-card__media">
        <img :src="props.event.image" :alt="props.event.imageAlt" loading="lazy" width="480" height="320" />
      </div>
      <div class="compact-event-card__body">
        <div class="compact-event-card__topline">
          <span>{{ props.event.type }}・{{ props.event.difficulty }}</span>
          <span>剩 {{ props.event.spots }} 位</span>
        </div>
        <h3>{{ props.event.title }}</h3>
        <div class="compact-event-card__facts">
          <span><Clock3 :size="17" aria-hidden="true" />{{ props.event.dateLabel }}・{{ props.event.time }}</span>
          <span>
            <MapPin :size="17" aria-hidden="true" />
            {{ props.event.park.name }}・{{ props.event.distanceKm != null ? `${props.event.distanceKm} 公里` : '距離待確認' }}
          </span>
        </div>
        <div class="compact-event-card__footer">
          <span class="tag tag--success">{{ props.event.cost }}</span>
          <strong>查看詳情 <span aria-hidden="true">→</span></strong>
        </div>
      </div>
    </RouterLink>
  </article>
</template>
