<script setup lang="ts">
import { Clock3, Heart, MapPin, Share2 } from 'lucide-vue-next'
import type { EventItem } from '@/data/events'

const props = withDefaults(defineProps<{
  event: EventItem
  featured?: boolean
  favorite?: boolean
  priority?: boolean
}>(), { featured: false, favorite: false, priority: false })

const emit = defineEmits<{
  open: [event: EventItem]
  share: [event: EventItem]
  toggleFavorite: [event: EventItem]
}>()
</script>

<template>
  <article class="event-card" :class="{ 'event-card--featured': props.featured }">
    <div class="event-card__media">
      <img
        :src="props.event.image"
        :alt="props.event.imageAlt"
        :loading="props.priority ? 'eager' : 'lazy'"
        :fetchpriority="props.priority ? 'high' : 'auto'"
        width="1200"
        height="675"
      />
      <button
        class="icon-button event-card__favorite"
        type="button"
        :aria-label="props.favorite ? `取消收藏：${props.event.title}` : `收藏：${props.event.title}`"
        :aria-pressed="props.favorite"
        @click="emit('toggleFavorite', props.event)"
      >
        <Heart :size="23" :fill="props.favorite ? 'currentColor' : 'none'" aria-hidden="true" />
      </button>
    </div>

    <div class="event-card__body">
      <div class="event-card__meta-row">
        <div class="event-card__meta-copy">
          <span class="eyebrow">{{ props.event.type }}・{{ props.event.difficulty }}</span>
          <h2 class="event-card__title">{{ props.event.title }}</h2>
        </div>
        <span class="capacity-badge">尚有 {{ props.event.spots }} 個名額</span>
      </div>
      <div class="event-card__facts">
        <span><Clock3 :size="18" aria-hidden="true" />{{ props.event.time }}</span>
        <span><MapPin :size="18" aria-hidden="true" />{{ props.event.park.name }}</span>
      </div>
      <div class="tag-row">
        <span class="tag tag--success">{{ props.event.cost }}</span>
        <span class="tag">{{ props.event.audience }}</span>
      </div>
      <div class="event-card__actions">
        <button class="button button--primary" type="button" @click="emit('open', props.event)">
          查看詳情
          <span aria-hidden="true">→</span>
        </button>
        <button class="button button--secondary button--share" type="button" @click="emit('share', props.event)">
          <Share2 :size="18" aria-hidden="true" />
          分享
        </button>
      </div>
    </div>
  </article>
</template>
