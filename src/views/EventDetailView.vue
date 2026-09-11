<script setup lang="ts">
import { formatEventCost } from '@/utils/eventCost'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  UsersRound,
} from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CalendarChoiceDialog from '@/components/CalendarChoiceDialog.vue'
import GoogleMapView from '@/components/GoogleMapView.vue'
import { useAppState } from '@/composables/useAppState'
import { shareActivityToLine } from '@/services/liffService'
import { openGoogleMapsDirections } from '@/utils/mapUtils'

const route = useRoute()
const router = useRouter()
const { getEvent, state } = useAppState()
const statusMessage = shallowRef('')
const showCalendarDialog = shallowRef(false)
const event = computed(() => getEvent(String(route.params.id)))
const isRegistered = computed(() => Boolean(event.value && state.registered.includes(event.value.id)))

function goBack() {
  router.back()
}

function navigateToMeetingPoint() {
  if (!event.value) return
  const p = event.value.park
  openGoogleMapsDirections(`${p.name} ${p.meeting}`, p.lat && p.lng ? { lat: p.lat, lng: p.lng } : undefined)
}

function addToCalendar() {
  showCalendarDialog.value = true
}

function onCalendarAdded(type: 'google' | 'apple') {
  statusMessage.value = type === 'google' ? '已為您開啟 Google 日曆！' : '已下載行事曆檔，請確認加入！'
}

async function share() {
  if (!event.value) return
  const res = await shareActivityToLine(event.value)
  statusMessage.value = res.message
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
          <span v-if="isRegistered" class="tag tag--success">✓ 已報名此活動</span>
          <span v-else class="tag tag--success">尚有 {{ event.spots }} 個名額</span>
          <span class="tag">{{ formatEventCost(event) }}</span>
        </div>

        <!-- 已報名提示區塊 -->
        <aside v-if="isRegistered" class="notice notice--success" style="background: rgba(220, 252, 231, 0.9); border: 1px solid #86efac; color: #166534; padding: 14px 16px; border-radius: 16px; display: flex; flex-direction: column; gap: 10px; margin: 12px 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <CheckCircle2 :size="20" style="color: #15803d; flex: 0 0 auto;" />
            <span style="font-size: 0.95rem; font-weight: 800;">你已成功報名此活動，可在「我的」查看行程。</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <button class="button button--secondary" type="button" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 999px; background: #fff;" @click="addToCalendar">
              📅 加入行事曆
            </button>
            <button class="button button--secondary" type="button" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 999px; background: #fff;" @click="navigateToMeetingPoint">
              🧭 集合點導航
            </button>
          </div>
        </aside>

        <div class="detail-facts">
          <div><CalendarDays :size="21" aria-hidden="true" /><strong>{{ event.dateLabel }}</strong><span>{{ event.time }}</span></div>
          <div style="cursor: pointer;" @click="navigateToMeetingPoint">
            <MapPin :size="21" aria-hidden="true" />
            <strong>{{ event.park.name }}</strong>
            <span>{{ event.park.meeting }} <small style="color: #0284c7; text-decoration: underline;">(導航)</small></span>
          </div>
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
            <div><dt>費用</dt><dd>{{ formatEventCost(event) }}</dd></div>
            <div><dt>攜帶物品</dt><dd>{{ event.items }}</dd></div>
          </dl>
        </section>

        <aside class="reminder-note">
          <strong>集合提醒</strong>
          <span>請提前 10 分鐘抵達，發起人會在集合地點等候。</span>
        </aside>

        <!-- Google 地圖與導航區塊 -->
        <GoogleMapView
          :destination-name="event.park.name"
          :meeting-point="event.park.meeting"
          :address="event.park.address"
          :coordinates="event.park.lat && event.park.lng ? { lat: event.park.lat, lng: event.park.lng } : undefined"
          height="220px"
        />
      </article>
    </main>

    <!-- 底部操作按鈕：已報名時不提供再次報名按鈕，僅能查看我的行程或分享 -->
    <div class="detail-actions">
      <template v-if="isRegistered">
        <button class="button button--primary" type="button" @click="router.push('/my')">
          查看我的行程 <span aria-hidden="true">→</span>
        </button>
        <button class="button button--secondary" type="button" @click="share">
          <MessageCircle :size="18" aria-hidden="true" />
          LINE 邀請朋友
        </button>
      </template>
      <template v-else>
        <button class="button button--primary" type="button" @click="router.push(`/registration/${event.id}`)">
          我要參加 <span aria-hidden="true">→</span>
        </button>
        <button class="button button--secondary" type="button" @click="share">
          <MessageCircle :size="18" aria-hidden="true" />
          LINE 邀請朋友
        </button>
      </template>
    </div>

    <!-- 行事曆彈窗 -->
    <CalendarChoiceDialog
      :show="showCalendarDialog"
      :event="event"
      @close="showCalendarDialog = false"
      @added="onCalendarAdded"
    />

    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </div>
  <div v-else class="empty-state page-empty"><h1>找不到這場活動</h1><RouterLink class="button button--primary" to="/explore">回到探索</RouterLink></div>
</template>
