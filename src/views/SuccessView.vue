<script setup lang="ts">
import { formatEventCost } from '@/utils/eventCost'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  UsersRound,
} from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'

const route = useRoute()
const router = useRouter()
const { getEvent, unregisterEvent } = useAppState()
const event = computed(() => getEvent(String(route.params.id)))
const toastMessage = shallowRef('')
const showCancelModal = shallowRef(false)
const isCancelling = shallowRef(false)

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 2200)
}

function openCancelModal() {
  showCancelModal.value = true
}

async function confirmCancelRegistration() {
  if (!event.value || isCancelling.value) return
  isCancelling.value = true
  try {
    const res = await unregisterEvent(event.value.id)
    showToast(res.message)
    showCancelModal.value = false
    setTimeout(() => {
      router.push('/explore')
    }, 1200)
  } catch (err: any) {
    showToast(err?.message || '取消失敗，請稍後再試')
  } finally {
    isCancelling.value = false
  }
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
              <span class="tag">{{ formatEventCost(event) }}</span>
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
          <div class="summary-row" style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 12px 0; align-items: start;">
            <dt style="color: var(--ink-soft);">攜帶物品</dt>
            <dd style="margin: 0; color: var(--ink); font-weight: 800;">{{ event.items }}</dd>
          </div>
        </dl>
      </article>

      <!-- 主要 CTA 引導與探索按鈕 -->
      <div style="width: 100%; display: grid; gap: 12px; margin-bottom: 20px;">
        <button class="button button--primary success-view__cta" type="button" @click="router.push('/my')">
          查看我的行程 <span aria-hidden="true">→</span>
        </button>
        <p class="success-view__note" style="margin-top: -4px;">集合導航、存入日曆與 LINE 邀請已放在「我的行程」</p>

        <button class="button button--secondary button--full" type="button" @click="router.push('/explore')">
          回到探索首頁
        </button>
      </div>

      <!-- 底部防呆退路：若時間不合，點此取消報名 -->
      <div style="text-align: center; margin-top: 10px; margin-bottom: 24px;">
        <button
          type="button"
          style="background: transparent; border: none; color: #dc2626; font-size: 0.95rem; font-weight: 800; text-decoration: underline; cursor: pointer; padding: 8px 12px;"
          @click="openCancelModal"
        >
          ✕ 若時間不合，點此取消報名
        </button>
      </div>
    </main>

    <!-- 防誤觸取消報名確認彈窗 -->
    <div v-if="showCancelModal" class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="modal-card" style="background: #ffffff; border-radius: 24px; padding: 24px 20px; max-width: 360px; width: 100%; text-align: center; box-shadow: var(--shadow-modal);">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
          <AlertTriangle :size="28" aria-hidden="true" />
        </div>
        <h3 style="margin: 0 0 8px; font-size: 1.3rem; color: var(--ink);">確認取消報名？</h3>
        <p style="margin: 0 0 20px; font-size: 0.95rem; color: var(--ink-soft); line-height: 1.5;">
          確定要取消參加「{{ event.title }}」嗎？取消後名額將自動釋出給其他人喔！
        </p>

        <div style="display: grid; gap: 10px;">
          <button
            class="button button--primary button--full"
            type="button"
            @click="showCancelModal = false"
          >
            繼續參加活動
          </button>
          <button
            class="button button--secondary button--full"
            type="button"
            :disabled="isCancelling"
            style="background: #fff; color: #dc2626; border-color: #fca5a5;"
            @click="confirmCancelRegistration"
          >
            <span v-if="isCancelling">取消中...</span>
            <span v-else>確認取消報名</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="toastMessage" class="toast show" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </div>
  <div v-else class="empty-state page-empty">
    <h1>找不到報名紀錄</h1>
    <RouterLink class="button button--primary" to="/explore">回到探索</RouterLink>
  </div>
</template>

