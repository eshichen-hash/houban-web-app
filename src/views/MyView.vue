<script setup lang="ts">
import { Bell, Heart, MapPin } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import EventCard from '@/components/EventCard.vue'
import { useAppState } from '@/composables/useAppState'
import type { EventItem } from '@/data/events'

const router = useRouter()
const { state, favoriteEvents, registeredEvents, toggleFavorite } = useAppState()

function openEvent(event: EventItem) {
  router.push(`/activity/${event.id}`)
}

function shareEvent() {
  // Sharing is intentionally a lightweight local prototype interaction in this phase.
}
</script>

<template>
  <div class="page-view my-view" id="main-content">
    <header class="topbar topbar--glass topbar--brand"><BrandLogo /><button class="icon-button" type="button" aria-label="通知"><Bell :size="23" aria-hidden="true" /></button></header>
    <main class="page-content" aria-labelledby="my-title">
      <div class="eyebrow">我的行程</div>
      <h1 id="my-title">我的</h1>
      <p class="page-intro">把喜歡的活動與已報名行程放在一起。</p>
      <section class="my-summary"><div><strong>{{ registeredEvents.length }}</strong><span>已報名</span></div><div><strong>{{ favoriteEvents.length }}</strong><span>已收藏</span></div><div><MapPin :size="19" aria-hidden="true" /><span>{{ state.location }}</span></div></section>
      <section class="my-section" aria-labelledby="registered-title"><div class="section-heading"><h2 id="registered-title">已報名活動</h2></div><div v-if="registeredEvents.length" class="result-list"><EventCard v-for="event in registeredEvents" :key="event.id" :event="event" :favorite="state.favorites.includes(event.id)" @open="openEvent" @share="shareEvent" @toggle-favorite="toggleFavorite(event.id)" /></div><div v-else class="empty-state"><h3>還沒有報名活動</h3><p>先到探索看看今天適合你的活動。</p><button class="button button--secondary" type="button" @click="router.push('/explore')">去探索活動</button></div></section>
      <section class="my-section" aria-labelledby="favorite-title"><div class="section-heading"><h2 id="favorite-title"><Heart :size="20" aria-hidden="true" />收藏活動</h2></div><div v-if="favoriteEvents.length" class="result-list"><EventCard v-for="event in favoriteEvents" :key="event.id" :event="event" favorite @open="openEvent" @share="shareEvent" @toggle-favorite="toggleFavorite(event.id)" /></div><div v-else class="empty-state"><h3>先收藏一場活動</h3><p>下次就不用再重新尋找。</p></div></section>
    </main>
  </div>
</template>
