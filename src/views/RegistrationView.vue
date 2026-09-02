<script setup lang="ts">
import { ArrowLeft, CalendarDays, Clock3, MapPin } from 'lucide-vue-next'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'

const route = useRoute()
const router = useRouter()
const { getEvent, registerEvent, state } = useAppState()
const event = computed(() => getEvent(String(route.params.id)))
const isAlreadyRegistered = computed(() => Boolean(event.value && state.registered.includes(event.value.id)))

onMounted(() => {
  if (isAlreadyRegistered.value && event.value) {
    router.replace(`/success/${event.value.id}`)
  }
})

function confirmRegistration() {
  if (!event.value) return
  if (!isAlreadyRegistered.value) {
    registerEvent(event.value.id)
  }
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
      <aside class="reminder-note" style="display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 16px; background: #fef9c3; border: 1px solid #fde047; color: #854d0e; margin-top: 18px;">
        <Clock3 :size="22" style="flex: 0 0 auto; margin-top: 2px; color: #854d0e;" aria-hidden="true" />
        <div>
          <strong style="color: #854d0e; font-size: 1.05rem;">請提前 10 分鐘抵達</strong>
          <p style="margin: 2px 0 0; font-size: 0.88rem; color: #854d0e;">若臨時無法參加，可到「我的活動」查看活動資訊。</p>
        </div>
      </aside>
    </main>
    <div class="page-actions" style="margin-top: 24px; padding: 16px; background: rgba(255, 253, 248, 0.88); border: 1px solid var(--line); border-radius: 18px; display: grid; gap: 10px;">
      <button class="button button--primary button--full" type="button" style="background: #4a7c59; border-color: #4a7c59;" @click="confirmRegistration">確認報名 <span aria-hidden="true">✓</span></button>
      <button class="button button--text button--full" type="button" @click="router.back">返回活動詳情</button>
    </div>
  </div>
  <div v-else class="empty-state page-empty"><h1>找不到這場活動</h1><RouterLink class="button button--primary" to="/explore">回到探索</RouterLink></div>
</template>
