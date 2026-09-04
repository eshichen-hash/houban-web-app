<script setup lang="ts">
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  UsersRound,
} from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'

const route = useRoute()
const router = useRouter()
const { getEvent } = useAppState()
const event = computed(() => getEvent(String(route.params.id)))
const toastMessage = shallowRef('')

import { shareActivityToLine } from '@/services/liffService'

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 2200)
}

function addToCalendar() {
  showToast('已將活動加入您的行事曆')
}

async function inviteFriends() {
  if (!event.value) return
  const res = await shareActivityToLine(event.value)
  showToast(res.message)
}
</script>

<template>
  <div v-if="event" class="page-view success-view" id="main-content">
    <header class="subpage-header">
      <button class="icon-button" type="button" aria-label="返回探索" @click="router.push('/explore')">
        <ArrowRight :size="23" class="icon-rotate-180" aria-hidden="true" />
      </button>
      <div>
        <strong>報名成功</strong>
        <small>已加入活動</small>
      </div>
      <span class="subpage-header__spacer" aria-hidden="true"></span>
    </header>

    <main class="success-content" aria-labelledby="success-title">
      <div class="success-mark"><Check :size="42" stroke-width="3" aria-hidden="true" /></div>
      <div class="eyebrow">報名完成</div>
      <h1 id="success-title">太好了，活動見！</h1>
      <p>你已成功參加「{{ event.title }}」。</p>

      <!-- 完整的活動詳情資訊卡片 -->
      <article class="summary-card" style="width: 100%; text-align: left; margin: 20px 0 24px; padding: 22px 20px; background: rgba(255, 253, 248, 0.96); border: 1px solid var(--line); border-radius: 22px; box-shadow: var(--shadow-card);">
        <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 16px;">
          <img v-if="event.image" :src="event.image" :alt="event.imageAlt" style="width: 88px; height: 88px; border-radius: 16px; object-fit: cover; flex: 0 0 auto;" />
          <div style="flex: 1; min-width: 0;">
            <div class="eyebrow" style="margin-bottom: 4px;">{{ event.type }}・{{ event.difficulty }}</div>
            <h2 style="margin: 0 0 6px; font-size: 1.25rem; color: var(--ink); line-height: 1.35;">{{ event.title }}</h2>
            <div class="tag-row" style="display: flex; flex-wrap: wrap; gap: 6px;">
              <span class="tag tag--success">報名成功</span>
              <span class="tag">{{ event.cost }}</span>
            </div>
          </div>
        </div>

        <dl class="summary-list" style="border-top: 1px solid var(--line); padding-top: 12px; margin: 0; display: grid; gap: 0;">
          <div class="summary-row" style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); align-items: start;">
            <dt style="color: var(--ink-soft); display: flex; align-items: center; gap: 6px;"><CalendarDays :size="18" style="color: #2b5e40;" />日期</dt>
            <dd style="margin: 0; color: var(--ink); font-weight: 800;">{{ event.dateLabel }}</dd>
          </div>
          <div class="summary-row" style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); align-items: start;">
            <dt style="color: var(--ink-soft); display: flex; align-items: center; gap: 6px;"><Clock3 :size="18" style="color: #2b5e40;" />時間</dt>
            <dd style="margin: 0; color: var(--ink); font-weight: 800;">{{ event.time }}</dd>
          </div>
          <div class="summary-row" style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); align-items: start;">
            <dt style="color: var(--ink-soft); display: flex; align-items: center; gap: 6px;"><MapPin :size="18" style="color: #2b5e40;" />地點</dt>
            <dd style="margin: 0; color: var(--ink); font-weight: 800;">
              <div>{{ event.park.name }}</div>
              <small style="display: block; color: var(--ink-soft); font-weight: normal; margin-top: 2px;">{{ event.park.meeting }}</small>
            </dd>
          </div>
          <div class="summary-row" style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); align-items: start;">
            <dt style="color: var(--ink-soft); display: flex; align-items: center; gap: 6px;"><UsersRound :size="18" style="color: #2b5e40;" />發起人</dt>
            <dd style="margin: 0; color: var(--ink); font-weight: 800;">{{ event.organizer.name }}（{{ event.organizer.role }}・評價 {{ event.organizer.rating }}）</dd>
          </div>
          <div class="summary-row" style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); align-items: start;">
            <dt style="color: var(--ink-soft);">適合對象</dt>
            <dd style="margin: 0; color: var(--ink); font-weight: 800;">{{ event.audience }}</dd>
          </div>
          <div class="summary-row" style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); align-items: start;">
            <dt style="color: var(--ink-soft);">攜帶物品</dt>
            <dd style="margin: 0; color: var(--ink); font-weight: 800;">{{ event.items }}</dd>
          </div>
          <div v-if="event.description" class="summary-row" style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 12px 0; align-items: start;">
            <dt style="color: var(--ink-soft);">活動介紹</dt>
            <dd style="margin: 0; font-weight: normal; color: var(--ink-soft); line-height: 1.55;">{{ event.description }}</dd>
          </div>
        </dl>
      </article>

      <button class="button button--primary success-view__cta" type="button" @click="router.push('/my')">
        查看我的活動 <span aria-hidden="true">→</span>
      </button>
      <p class="success-view__note">報名紀錄已放在「我的活動」</p>

      <!-- 也可以：加入行事曆 / LINE 邀請朋友 -->
      <section class="section" style="margin-top: 24px; text-align: left; width: 100%;">
        <div class="section-heading">
          <div>
            <h2>也可以</h2>
            <p>把活動記下來或邀請朋友</p>
          </div>
        </div>
        <div class="action-list">
          <button class="action-card" type="button" @click="addToCalendar">
            <span class="action-icon">
              <CalendarDays :size="24" aria-hidden="true" />
            </span>
            <span class="action-text">
              <strong>加入行事曆</strong>
              <span class="action-sub">把日期與集合地點記下來</span>
            </span>
            <ChevronRight :size="20" class="chevron" aria-hidden="true" />
          </button>

          <button class="action-card" type="button" @click="inviteFriends">
            <span class="action-icon">
              <MessageCircle :size="24" aria-hidden="true" />
            </span>
            <span class="action-text">
              <strong>LINE 邀請朋友</strong>
              <span class="action-sub">把活動資訊分享給朋友</span>
            </span>
            <ChevronRight :size="20" class="chevron" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section class="section" style="margin-top: 14px; width: 100%;">
        <button class="button button--secondary button--full" type="button" @click="router.push('/explore')">
          回到探索首頁
        </button>
      </section>
    </main>

    <div v-if="toastMessage" class="toast show" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </div>
  <div v-else class="empty-state page-empty">
    <h1>找不到報名紀錄</h1>
    <RouterLink class="button button--primary" to="/explore">回到探索</RouterLink>
  </div>
</template>

