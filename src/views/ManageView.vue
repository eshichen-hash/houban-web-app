<script setup lang="ts">
import { ArrowLeft, CalendarDays, MapPin, UsersRound } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'

const router = useRouter()
const { state } = useAppState()
</script>

<template>
  <div class="page-view manage-view" id="main-content">
    <header class="subpage-header"><button class="icon-button" type="button" aria-label="返回" @click="router.push('/create')"><ArrowLeft :size="23" aria-hidden="true" /></button><div><strong>活動管理</strong><small>我發起的活動</small></div><span class="subpage-header__spacer" aria-hidden="true"></span></header>
    <main class="page-content" aria-labelledby="manage-title">
      <div class="eyebrow">活動管理</div>
      <h1 id="manage-title">我發起的活動</h1>
      <p class="page-intro">查看報名、編輯內容或處理活動異動。</p>
      <section v-if="state.createdEvents.length" class="created-list">
        <article v-for="event in state.createdEvents" :key="event.id" class="manage-card">
          <div class="manage-card__status">草稿示意</div>
          <h2>{{ event.title }}</h2>
          <p><CalendarDays :size="18" aria-hidden="true" />{{ event.dateLabel }}・{{ event.time }}</p>
          <p><MapPin :size="18" aria-hidden="true" />{{ event.park.name }}</p>
          <div class="manage-card__actions"><button class="button button--secondary" type="button"><UsersRound :size="18" aria-hidden="true" />報名名單</button><button class="button button--secondary" type="button">編輯</button></div>
        </article>
      </section>
      <div v-else class="empty-state"><h2>還沒有發起的活動</h2><p>先建立一場想和朋友一起做的事。</p></div>
      <button class="button button--primary button--full" type="button" @click="router.push('/create')">再建立一場活動</button>
    </main>
  </div>
</template>
