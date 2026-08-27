<script setup lang="ts">
import { ArrowLeft, CalendarDays, Clock3, MapPin } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'

const route = useRoute()
const router = useRouter()
const { getEvent, registerEvent } = useAppState()
const event = computed(() => getEvent(String(route.params.id)))

function confirmRegistration() {
  if (!event.value) return
  registerEvent(event.value.id)
  router.push(`/success/${event.value.id}`)
}
</script>

<template>
  <div v-if="event" class="page-view registration-view" id="main-content">
    <header class="subpage-header">
      <button class="icon-button" type="button" aria-label="返回" @click="router.back"><ArrowLeft :size="23" aria-hidden="true" /></button>
      <div><strong>報名確認</strong><small>確認後完成報名</small></div>
      <span class="subpage-header__spacer" aria-hidden="true"></span>
    </header>
    <main class="registration-content" aria-labelledby="registration-title">
      <div class="eyebrow">最後一步</div>
      <h1 id="registration-title">確認活動資訊</h1>
      <p class="page-intro">不用再填寫資料，確認無誤後即可完成報名。</p>
      <section class="summary-card">
        <h2>{{ event.title }}</h2>
        <dl>
          <div><dt>日期</dt><dd><CalendarDays :size="18" aria-hidden="true" />{{ event.dateLabel }}</dd></div>
          <div><dt>時間</dt><dd><Clock3 :size="18" aria-hidden="true" />{{ event.time }}</dd></div>
          <div><dt>地點</dt><dd><MapPin :size="18" aria-hidden="true" /><span>{{ event.park.name }}<small>{{ event.park.meeting }}</small></span></dd></div>
          <div><dt>費用</dt><dd>{{ event.cost }}</dd></div>
          <div><dt>攜帶物品</dt><dd>{{ event.items }}</dd></div>
        </dl>
      </section>
      <aside class="reminder-note"><strong>請提前 10 分鐘抵達</strong><span>若臨時無法參加，可到「我的」查看活動資訊。</span></aside>
    </main>
    <div class="page-actions">
      <button class="button button--primary" type="button" @click="confirmRegistration">確認報名 <span aria-hidden="true">✓</span></button>
      <button class="button button--text" type="button" @click="router.back">返回活動詳情</button>
    </div>
  </div>
  <div v-else class="empty-state page-empty"><h1>找不到這場活動</h1><RouterLink class="button button--primary" to="/explore">回到探索</RouterLink></div>
</template>
