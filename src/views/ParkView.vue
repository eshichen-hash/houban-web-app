<script setup lang="ts">
import { ArrowLeft, Bell, CalendarDays, MapPin } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EventCard from '@/components/EventCard.vue'
import { useAppState } from '@/composables/useAppState'
import { parks } from '@/data/events'
import type { EventItem } from '@/data/events'

const route = useRoute()
const router = useRouter()
const { events, state, toggleFavorite } = useAppState()
const statusMessage = shallowRef('')

const selectedPark = computed(() => {
  const parkId = String(route.params.id)
  return parks.find((parkItem) => parkItem.id === parkId)
})
const parkEvents = computed(() => {
  const parkId = String(route.params.id)
  return events.value.filter((event) => event.park.id === parkId)
})

function openEvent(event: EventItem) {
  router.push(`/activity/${event.id}`)
}

async function shareEvent(event: EventItem) {
  statusMessage.value = `已準備分享「${event.title}」`
  if ('share' in navigator) {
    try {
      await navigator.share({ title: event.title, text: `${event.title}｜${event.park.name}` })
    } catch {
      // 使用者關閉系統分享面板時，保留本地提示即可。
    }
  }
}
</script>

<template>
  <div class="page-view park-view" id="main-content">
    <header class="subpage-header">
      <button class="icon-button" type="button" aria-label="返回探索" @click="router.push('/explore')">
        <ArrowLeft :size="23" aria-hidden="true" />
      </button>
      <div>
        <strong>公園活動</strong>
        <small>{{ selectedPark?.name ?? '選擇公園' }}</small>
      </div>
      <button class="icon-button" type="button" aria-label="通知"><Bell :size="22" aria-hidden="true" /></button>
    </header>

    <main v-if="selectedPark" class="page-content" aria-labelledby="park-title">
      <div class="eyebrow">依公園找活動</div>
      <h1 id="park-title">{{ selectedPark.name }}</h1>
      <p class="page-intro"><MapPin :size="18" aria-hidden="true" />{{ selectedPark.address }}</p>

      <section class="park-summary" aria-label="公園資訊">
        <div><CalendarDays :size="20" aria-hidden="true" /><strong>{{ parkEvents.length }} 場活動</strong><span>目前示意資料</span></div>
        <div><MapPin :size="20" aria-hidden="true" /><strong>{{ selectedPark.district }}</strong><span>集合點：{{ selectedPark.meeting }}</span></div>
      </section>

      <section class="result-section" aria-labelledby="park-events-title">
        <div class="result-section__heading">
          <div><div class="eyebrow">符合條件的活動</div><h2 id="park-events-title">近期活動</h2></div>
          <span class="result-section__context">共 {{ parkEvents.length }} 場</span>
        </div>
        <div v-if="parkEvents.length" class="result-list">
          <EventCard
            v-for="event in parkEvents"
            :key="event.id"
            :event="event"
            :favorite="state.favorites.includes(event.id)"
            @open="openEvent"
            @share="shareEvent"
            @toggle-favorite="toggleFavorite(event.id)"
          />
        </div>
        <div v-else class="empty-state"><h2>目前沒有活動</h2><p>可以回到探索，查看其他推薦活動。</p><button class="button button--primary" type="button" @click="router.push('/explore')">回到探索</button></div>
      </section>
    </main>

    <div v-else class="empty-state page-empty"><h1>找不到這個公園</h1><button class="button button--primary" type="button" @click="router.push('/explore')">回到探索</button></div>
    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </div>
</template>
