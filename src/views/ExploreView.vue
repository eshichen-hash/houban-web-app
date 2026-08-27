<script setup lang="ts">
import { Bell, ChevronLeft, ChevronRight, MapPin } from 'lucide-vue-next'
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import EventCard from '@/components/EventCard.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import { useAppState } from '@/composables/useAppState'
import type { EventItem } from '@/data/events'

const router = useRouter()
const { events, visibleEvents, state, toggleFavorite, setDateFilter, setCustomDate, setInterest } = useAppState()
const filterOpen = shallowRef(false)
const filterApplied = shallowRef(false)
const statusMessage = shallowRef('')
const recommendationTrack = useTemplateRef<HTMLDivElement>('recommendationTrack')

const recommendedEvents = computed(() => {
  if (state.dateFilter === 'week') return events.value
  if (state.dateFilter === 'custom') return state.customDate ? events.value.filter((event) => event.isoDate === state.customDate) : []
  return events.value.filter((event) => event.dateKey === state.dateFilter)
})
const resultDateLabel = computed(() => {
  if (state.dateFilter === 'custom' && state.customDate) return state.customDate.replaceAll('-', '/')
  if (state.dateFilter === 'tomorrow') return '明天'
  if (state.dateFilter === 'week') return '本週'
  return '今天'
})

function moveCarousel(direction: number) {
  const track = recommendationTrack.value
  if (!track) return
  const slides = Array.from(track.querySelectorAll<HTMLElement>('.recommendation-slide'))
  if (!slides.length) return
  const currentIndex = slides.reduce((closest, slide, index) => {
    const currentDistance = Math.abs(slides[closest].offsetLeft - track.scrollLeft)
    const nextDistance = Math.abs(slide.offsetLeft - track.scrollLeft)
    return nextDistance < currentDistance ? index : closest
  }, 0)
  const nextIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + direction))
  track.scrollTo({ left: slides[nextIndex].offsetLeft, behavior: 'smooth' })
}

function openEvent(event: EventItem) {
  router.push(`/activity/${event.id}`)
}

async function shareEvent(event: EventItem) {
  statusMessage.value = `已準備分享「${event.title}」`
  if ('share' in navigator) {
    try {
      await navigator.share({ title: event.title, text: `${event.title}｜${event.park.name}` })
    } catch {
      // User cancelled the native share sheet; keep the local feedback visible.
    }
  }
}

function onFavorite(event: EventItem) {
  toggleFavorite(event.id)
  statusMessage.value = state.favorites.includes(event.id) ? `已收藏「${event.title}」` : `已取消收藏「${event.title}」`
}

function applyDateFilter(value: Exclude<typeof state.dateFilter, 'custom'>) {
  filterApplied.value = true
  setDateFilter(value)
}

function applyCustomDate(value: string) {
  filterApplied.value = true
  setCustomDate(value)
}

function applyInterest(value: typeof state.interest) {
  filterApplied.value = true
  setInterest(value)
}
</script>

<template>
  <div class="page-view explore-view" id="main-content">
    <header class="topbar topbar--glass">
      <button class="location-button" type="button" aria-label="目前位置：大安區，活動範圍 3 公里內">
        <span class="location-button__icon"><MapPin :size="22" aria-hidden="true" /></span>
        <span><small>目前位置</small><strong>{{ state.location }}⌄</strong></span>
        <span class="radius-chip"><i aria-hidden="true"></i>{{ state.radius }} 公里內</span>
      </button>
      <button class="icon-button" type="button" aria-label="通知"><Bell :size="23" aria-hidden="true" /></button>
    </header>

    <main class="page-content explore-content" aria-labelledby="explore-title">
      <div class="eyebrow">探索活動</div>
      <h1 id="explore-title">今日推薦活動</h1>
      <p class="page-intro">先看今天適合參加的活動。</p>

      <section class="recommendation-carousel" aria-label="今日推薦活動">
        <div v-if="recommendedEvents.length" id="recommendation-track" ref="recommendationTrack" class="recommendation-track" aria-label="推薦活動卡片，可左右滑動">
          <div v-for="event in recommendedEvents" :key="event.id" class="recommendation-slide">
            <EventCard
              :event="event"
              featured
              :favorite="state.favorites.includes(event.id)"
              @open="openEvent"
              @share="shareEvent"
              @toggle-favorite="onFavorite"
            />
          </div>
        </div>
        <div v-else class="empty-state"><h2>今天暫時沒有推薦活動</h2><p>可以展開篩選活動，換一天看看。</p></div>
        <button
          v-if="recommendedEvents.length > 1"
          class="carousel-arrow carousel-arrow--previous"
          type="button"
          aria-label="查看上一張推薦活動"
          @click="moveCarousel(-1)"
        >
          <ChevronLeft :size="24" aria-hidden="true" />
        </button>
        <button
          v-if="recommendedEvents.length > 1"
          class="carousel-arrow carousel-arrow--next"
          type="button"
          aria-label="查看下一張推薦活動"
          @click="moveCarousel(1)"
        >
          <ChevronRight :size="24" aria-hidden="true" />
        </button>
      </section>

      <RouterLink class="park-entry" to="/park/daan-forest">
        <span class="park-entry__copy"><strong>從公園找活動</strong><span>選一個熟悉的公園開始</span></span>
        <span class="park-entry__action">選擇公園 <ChevronRight :size="20" aria-hidden="true" /></span>
      </RouterLink>

      <FilterPanel
        v-model:open="filterOpen"
        :date-filter="state.dateFilter"
        :interest="state.interest"
        :custom-date="state.customDate"
        @update:date-filter="applyDateFilter"
        @update:custom-date="applyCustomDate"
        @update:interest="applyInterest"
      />

      <section v-if="filterApplied" class="result-section" aria-labelledby="result-title">
        <div class="result-section__heading">
          <div>
            <div class="eyebrow">篩選結果</div>
            <h2 id="result-title">找到 {{ visibleEvents.length }} 場活動</h2>
          </div>
          <span class="result-section__context">{{ state.interest }}・{{ resultDateLabel }}</span>
        </div>
        <div v-if="visibleEvents.length" class="result-list">
          <EventCard
            v-for="event in visibleEvents"
            :key="event.id"
            :event="event"
            :favorite="state.favorites.includes(event.id)"
            @open="openEvent"
            @share="shareEvent"
            @toggle-favorite="onFavorite"
          />
        </div>
        <div v-else class="empty-state">
          <h3>目前沒有符合條件的活動</h3>
          <p>試試看換一天，或先選擇「全部」活動。</p>
        </div>
      </section>
    </main>

    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </div>
</template>
