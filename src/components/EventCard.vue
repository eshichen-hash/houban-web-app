<script setup lang="ts">
import { CalendarDays, Clock3, Heart, MapPin, MessageCircle, Navigation, Share2, XCircle } from 'lucide-vue-next'
import type { EventItem } from '@/data/events'

const props = withDefaults(defineProps<{
  event: EventItem
  featured?: boolean
  favorite?: boolean
  priority?: boolean
  registered?: boolean
}>(), { featured: false, favorite: false, priority: false, registered: false })

const emit = defineEmits<{
  open: [event: EventItem]
  share: [event: EventItem]
  toggleFavorite: [event: EventItem]
  navigate: [event: EventItem]
  calendar: [event: EventItem]
  cancel: [event: EventItem]
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
        <span v-if="props.registered" class="capacity-badge" style="background: rgba(220, 252, 231, 0.95); color: #166534; border: 1px solid #86efac;">✓ 已報名</span>
        <span v-else class="capacity-badge">尚有 {{ props.event.spots }} 個名額</span>
      </div>
      <div class="event-card__facts">
        <span><Clock3 :size="18" aria-hidden="true" />{{ props.event.dateLabel ? `${props.event.dateLabel}・${props.event.time}` : props.event.time }}</span>
        <span><MapPin :size="18" aria-hidden="true" />{{ props.event.park.name }}</span>
      </div>
      <div class="tag-row">
        <span class="tag tag--success">{{ props.event.cost }}</span>
        <span class="tag">{{ props.event.audience }}</span>
      </div>

      <!-- 已報名專屬：出門與提醒快捷工具組 -->
      <div v-if="props.registered" class="event-card__quick-tools" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); display: flex; flex-wrap: wrap; gap: 8px;">
        <button
          class="pill-tool-btn"
          type="button"
          style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 800; font-size: 0.85rem; border-radius: 999px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;"
          @click="emit('navigate', props.event)"
        >
          <Navigation :size="15" aria-hidden="true" />
          <span>集合導航</span>
        </button>

        <button
          class="pill-tool-btn"
          type="button"
          style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; font-weight: 800; font-size: 0.85rem; border-radius: 999px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;"
          @click="emit('calendar', props.event)"
        >
          <CalendarDays :size="15" aria-hidden="true" />
          <span>存入日曆</span>
        </button>

        <button
          class="pill-tool-btn"
          type="button"
          style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; font-weight: 800; font-size: 0.85rem; border-radius: 999px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;"
          @click="emit('share', props.event)"
        >
          <MessageCircle :size="15" aria-hidden="true" />
          <span>LINE 邀請</span>
        </button>
      </div>

      <!-- 底部操作按鈕 -->
      <div class="event-card__actions" style="margin-top: 12px;">
        <button class="button button--primary" type="button" @click="emit('open', props.event)">
          查看詳情
          <span aria-hidden="true">→</span>
        </button>

        <button
          v-if="props.registered"
          class="button button--secondary"
          type="button"
          style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-weight: 800;"
          @click="emit('cancel', props.event)"
        >
          <XCircle :size="17" aria-hidden="true" />
          取消報名
        </button>

        <button
          v-else
          class="button button--secondary button--share"
          type="button"
          @click="emit('share', props.event)"
        >
          <Share2 :size="18" aria-hidden="true" />
          分享
        </button>
      </div>
    </div>
  </article>
</template>

