<script setup lang="ts">
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, MessageCircle, UsersRound } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'

const route = useRoute()
const router = useRouter()
const { getEvent } = useAppState()
const statusMessage = shallowRef('')
const event = computed(() => getEvent(String(route.params.id)))

function goBack() {
  router.back()
}

function share() {
  if (!event.value) return
  statusMessage.value = `已準備分享「${event.value.title}」`
}
</script>

<template>
  <div v-if="event" class="page-view detail-view" id="main-content">
    <header class="subpage-header">
      <button class="icon-button" type="button" aria-label="返回" @click="goBack"><ArrowLeft :size="23" aria-hidden="true" /></button>
      <div><strong>活動詳情</strong><small>{{ event.park.name }}</small></div>
      <span class="subpage-header__spacer" aria-hidden="true"></span>
    </header>

    <main class="detail-content" aria-labelledby="detail-title">
      <img class="detail-hero" :src="event.image" :alt="event.imageAlt" />
      <article class="detail-card">
        <div class="eyebrow">{{ event.type }}・{{ event.difficulty }}</div>
        <h1 id="detail-title">{{ event.title }}</h1>
        <p class="detail-card__park">{{ event.park.name }}</p>
        <div class="tag-row">
          <span class="tag tag--success">尚有 {{ event.spots }} 個名額</span>
          <span class="tag">{{ event.cost }}</span>
        </div>

        <div class="detail-facts">
          <div><CalendarDays :size="21" aria-hidden="true" /><strong>{{ event.dateLabel }}</strong><span>{{ event.time }}</span></div>
          <div><MapPin :size="21" aria-hidden="true" /><strong>{{ event.park.name }}</strong><span>{{ event.park.meeting }}</span></div>
        </div>

        <section class="trust-card" aria-labelledby="trust-title">
          <div class="trust-card__mark"><CheckCircle2 :size="20" aria-hidden="true" /></div>
          <div>
            <h2 id="trust-title">發起人{{ event.organizer.verified ? '已驗證' : '資料建立中' }}</h2>
            <strong>{{ event.organizer.name }}・評價 {{ event.organizer.rating }}</strong>
            <p>{{ event.organizer.role }}・已發起 {{ event.organizer.organized }} 場</p>
          </div>
        </section>

        <div class="detail-grid">
          <div><UsersRound :size="21" aria-hidden="true" /><strong>尚有 {{ event.spots }} 個名額</strong><span>額滿後無法報名</span></div>
          <div><Clock3 :size="21" aria-hidden="true" /><strong>活動難度：{{ event.difficulty }}</strong><span>{{ event.audience }}</span></div>
        </div>

        <section class="detail-description">
          <h2>活動介紹</h2>
          <p>{{ event.description }}</p>
          <dl>
            <div><dt>適合對象</dt><dd>{{ event.audience }}</dd></div>
            <div><dt>費用</dt><dd>{{ event.cost }}</dd></div>
            <div><dt>攜帶物品</dt><dd>{{ event.items }}</dd></div>
          </dl>
        </section>

        <aside class="reminder-note"><strong>集合提醒</strong><span>請提前 10 分鐘抵達，發起人會在集合地點等候。</span></aside>
      </article>
    </main>

    <div class="detail-actions">
      <button class="button button--primary" type="button" @click="router.push(`/registration/${event.id}`)">我要參加 <span aria-hidden="true">→</span></button>
      <button class="button button--secondary" type="button" @click="share"><MessageCircle :size="18" aria-hidden="true" />LINE 邀請朋友</button>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </div>
  <div v-else class="empty-state page-empty"><h1>找不到這場活動</h1><RouterLink class="button button--primary" to="/explore">回到探索</RouterLink></div>
</template>
