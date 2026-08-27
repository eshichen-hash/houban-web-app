<script setup lang="ts">
import { ArrowRight, CalendarDays, Check, MapPin } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'

const route = useRoute()
const router = useRouter()
const { getEvent } = useAppState()
const event = computed(() => getEvent(String(route.params.id)))
</script>

<template>
  <div v-if="event" class="page-view success-view" id="main-content">
    <header class="subpage-header">
      <button class="icon-button" type="button" aria-label="返回探索" @click="router.push('/explore')"><ArrowRight :size="23" class="icon-rotate-180" aria-hidden="true" /></button>
      <div><strong>報名成功</strong><small>已加入活動</small></div>
      <span class="subpage-header__spacer" aria-hidden="true"></span>
    </header>
    <main class="success-content" aria-labelledby="success-title">
      <div class="success-mark"><Check :size="42" stroke-width="3" aria-hidden="true" /></div>
      <div class="eyebrow">報名完成</div>
      <h1 id="success-title">太好了，活動見！</h1>
      <p>你已成功參加「{{ event.title }}」。</p>
      <section class="success-card">
        <strong><CalendarDays :size="19" aria-hidden="true" />{{ event.dateLabel }}</strong>
        <b>{{ event.time }}</b>
        <span><MapPin :size="18" aria-hidden="true" />{{ event.park.name }}・{{ event.park.meeting }}</span>
      </section>
      <button class="button button--primary success-view__cta" type="button" @click="router.push('/my')">查看我的活動 <span aria-hidden="true">→</span></button>
      <p class="success-view__note">報名紀錄已放在「我的」</p>
    </main>
  </div>
  <div v-else class="empty-state page-empty"><h1>找不到報名紀錄</h1><RouterLink class="button button--primary" to="/explore">回到探索</RouterLink></div>
</template>
