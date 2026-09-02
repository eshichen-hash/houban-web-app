<script setup lang="ts">
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircle,
  Package,
  Sun,
} from 'lucide-vue-next'
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'
import type { EventItem } from '@/data/events'
import { openGoogleMapsDirections } from '@/utils/mapUtils'

const router = useRouter()
const { state, registeredEvents } = useAppState()
const toastMessage = ref('')
const expandedNotificationId = ref<string | null>(null)

function navigateToPark(event: EventItem) {
  const p = event.park
  openGoogleMapsDirections(`${p.name} ${p.meeting}`, p.lat && p.lng ? { lat: p.lat, lng: p.lng } : undefined)
}

// 預設展開第一張最近的活動通知
watchEffect(() => {
  if (registeredEvents.value.length > 0 && expandedNotificationId.value === null) {
    expandedNotificationId.value = registeredEvents.value[0].id
  }
})

const notificationCountLabel = computed(() => {
  const count = registeredEvents.value.length
  return count > 0 ? `${count} 則近期通知` : '目前無新通知'
})

function toggleExpand(id: string) {
  expandedNotificationId.value = expandedNotificationId.value === id ? null : id
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/explore')
  }
}

function openActivity(eventId: string) {
  router.push(`/activity/${eventId}`)
}

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 2200)
}

function addToCalendar(event: EventItem) {
  showToast(`已將「${event.title}」加入您的行事曆`)
}

async function inviteFriends(event: EventItem) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: event.title,
        text: `邀請你一起去${event.park.name}參加「${event.title}」！`,
        url: `${window.location.origin}/activity/${event.id}`,
      })
      return
    } catch {
      // 使用者取消分享
    }
  }
  showToast('已複製 LINE 邀請連結')
}
</script>

<template>
  <div class="page-view notifications-view" id="main-content">
    <header class="subpage-header">
      <button class="icon-button" type="button" aria-label="返回" @click="goBack">
        <ArrowLeft :size="23" aria-hidden="true" />
      </button>
      <div>
        <strong>通知與提醒</strong>
        <small>{{ notificationCountLabel }}</small>
      </div>
      <span class="subpage-header__spacer" aria-hidden="true"></span>
    </header>

    <main class="page-content notifications-content" aria-labelledby="notifications-title">
      <div class="eyebrow">通知與提醒</div>
      <h1 id="notifications-title">近期提醒</h1>
      <p class="page-intro">掌握已報名活動的開始時間、出門準備與最新異動。</p>

      <!-- 動態通知列表 -->
      <div v-if="registeredEvents.length > 0" class="action-list">
        <article
          v-for="(event, index) in registeredEvents"
          :key="event.id"
          class="expandable-notification"
          :class="{ 'is-expanded': expandedNotificationId === event.id }"
        >
          <!-- 1. 第一則（最接近的活動）：出發／明日提醒 -->
          <template v-if="index === 0">
            <button
              class="expandable-notification__header"
              type="button"
              :aria-expanded="expandedNotificationId === event.id"
              @click="toggleExpand(event.id)"
            >
              <span class="action-icon" style="background: rgba(224, 242, 254, 0.9); color: #0284c7;">
                <Clock3 :size="24" aria-hidden="true" />
              </span>
              <span class="action-text">
                <strong>活動將在 {{ event.dateLabel }}開始</strong>
                <span class="action-sub">{{ event.title }}・{{ event.time }}</span>
              </span>
              <span class="tag tag--info" style="margin-right: 4px; font-size: 0.78rem;">⏰ 即將開始</span>
              <ChevronDown :size="20" class="expandable-notification__chevron" aria-hidden="true" />
            </button>

            <!-- 展開內容 -->
            <div v-if="expandedNotificationId === event.id" class="expandable-notification__body">
              <div class="notification-detail-item" style="cursor: pointer;" @click="navigateToPark(event)">
                <MapPin :size="18" />
                <div>
                  <strong>集合地點與導航 <small style="color: #0284c7; text-decoration: underline; font-weight: normal;">(點擊導航)</small></strong>
                  <p>{{ event.park.name }}・{{ event.park.meeting }}</p>
                  <p style="color: #2b5e40; font-weight: 800; margin-top: 2px;">
                    💡 建議提前 10 分鐘抵達集合點，發起人（{{ event.organizer.name }}）會在現場等候。
                  </p>
                </div>
              </div>

              <div class="notification-detail-item">
                <Package :size="18" />
                <div>
                  <strong>必備物品清單</strong>
                  <p>{{ event.items || '自備飲用水壺、遮陽帽、小毛巾、穿著防滑好走運動鞋。' }}</p>
                </div>
              </div>

              <div class="notification-detail-item">
                <Sun :size="18" />
                <div>
                  <strong>天氣與出門建議</strong>
                  <p>活動時間氣候舒適，請適時補充水分並做好防曬。</p>
                </div>
              </div>

              <div class="notification-action-row">
                <button class="button button--primary button--small" type="button" @click="openActivity(event.id)">
                  查看活動詳情 <span aria-hidden="true">→</span>
                </button>
                <button class="button button--secondary button--small" type="button" @click="addToCalendar(event)">
                  <CalendarDays :size="16" aria-hidden="true" />
                  加入行事曆
                </button>
                <button class="button button--secondary button--small" type="button" @click="inviteFriends(event)">
                  <MessageCircle :size="16" aria-hidden="true" />
                  LINE 邀請朋友
                </button>
              </div>
            </div>
          </template>

          <!-- 2. 其他已報名活動：報名成功確認卡片 -->
          <template v-else>
            <button
              class="expandable-notification__header"
              type="button"
              :aria-expanded="expandedNotificationId === event.id"
              @click="toggleExpand(event.id)"
            >
              <span class="action-icon" style="background: rgba(220, 252, 231, 0.95); color: #166534;">
                <Check :size="24" aria-hidden="true" />
              </span>
              <span class="action-text">
                <strong>報名成功</strong>
                <span class="action-sub">你已加入「{{ event.title }}」</span>
              </span>
              <span class="tag tag--success" style="margin-right: 4px; font-size: 0.78rem;">✓ 已確認 1 位</span>
              <ChevronDown :size="20" class="expandable-notification__chevron" aria-hidden="true" />
            </button>

            <!-- 展開內容 -->
            <div v-if="expandedNotificationId === event.id" class="expandable-notification__body">
              <div class="notification-detail-item">
                <CalendarDays :size="18" />
                <div>
                  <strong>活動時間與地點</strong>
                  <p>{{ event.dateLabel }} {{ event.time }}・{{ event.park.name }}</p>
                </div>
              </div>

              <div class="notification-detail-item">
                <Check :size="18" />
                <div>
                  <strong>費用與報到須知</strong>
                  <p>費用：{{ event.cost }}。免出示票券，活動當天直接至集合點（{{ event.park.meeting }}）向發起人報到即可。</p>
                </div>
              </div>

              <div class="notification-detail-item">
                <AlertCircle :size="18" />
                <div>
                  <strong>行程連動提醒</strong>
                  <p>此行程已自動排入「我的活動」，活動開始前 1 天將發送出發提醒通知。</p>
                </div>
              </div>

              <div class="notification-action-row">
                <button class="button button--primary button--small" type="button" @click="router.push('/my')">
                  查看我的行程 <span aria-hidden="true">→</span>
                </button>
                <button class="button button--secondary button--small" type="button" @click="inviteFriends(event)">
                  <MessageCircle :size="16" aria-hidden="true" />
                  LINE 邀請朋友一起去
                </button>
                <button class="button button--secondary button--small" type="button" @click="openActivity(event.id)">
                  活動詳情
                </button>
              </div>
            </div>
          </template>
        </article>
      </div>

      <!-- 空狀態：尚未報名任何活動 -->
      <div v-else class="empty-state" style="padding: 42px 20px; text-align: center; background: rgba(255, 253, 248, 0.92); border: 1px dashed var(--line); border-radius: 20px;">
        <Bell :size="48" style="color: var(--ink-soft); margin: 0 auto 12px; display: block;" aria-hidden="true" />
        <h2 style="font-size: 1.25rem; color: var(--ink); margin-bottom: 8px;">目前沒有新的活動通知</h2>
        <p style="color: var(--ink-soft); font-size: 0.95rem; margin-bottom: 20px; max-width: 320px; margin-inline: auto;">
          當你報名活動後，系統會在此自動顯示出發提醒、集合地點與必備物品。
        </p>
        <button class="button button--primary" type="button" @click="router.push('/explore')">
          去探索活動
        </button>
      </div>

      <div class="notice" style="margin-top: 20px;">
        <MessageCircle :size="22" aria-hidden="true" />
        <div>
          <strong>LINE 活動提醒</strong>
          <p style="margin: 2px 0 0; font-size: 0.86rem; color: var(--ink-soft);">目前設定為開啟，可到個人設定調整。</p>
        </div>
      </div>
    </main>

    <div v-if="toastMessage" class="toast show" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </div>
</template>


