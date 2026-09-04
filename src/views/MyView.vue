<script setup lang="ts">
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Settings,
  Sparkles,
  Sun,
  Trees,
  UsersRound,
} from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import EventCard from '@/components/EventCard.vue'
import ManageEventCard from '@/components/manage/ManageEventCard.vue'
import { useAppState } from '@/composables/useAppState'
import { parks, type EventItem } from '@/data/events'

type SubView = 'activities' | 'favorites' | 'parks' | 'notifications' | 'settings'
type ActivityTab = '即將開始' | '已報名' | '我發起的' | '已結束'

const router = useRouter()
const { state, favoriteEvents, registeredEvents, toggleFavorite } = useAppState()

const currentSubView = shallowRef<SubView | null>(null)
const currentActivityTab = shallowRef<ActivityTab>('即將開始')
const toastMessage = shallowRef('')
const expandedNotification = shallowRef<string | null>(null)

// 預設展開第一張活動通知
if (registeredEvents.value.length > 0) {
  expandedNotification.value = registeredEvents.value[0].id
}

const activityTabs: ActivityTab[] = ['即將開始', '已報名', '我發起的', '已結束']

// 個人設定表單資料
const userDisplayName = shallowRef('林淑芬')
const fontSizeSetting = shallowRef<'standard' | 'large'>('standard')
const lineReminderSetting = shallowRef(true)

const todayEvent = computed(() => registeredEvents.value[0] ?? null)
const todayDateLabel = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
})

const defaultCreatedSeedEvent: EventItem = {
  id: 'seed-walk-manage',
  title: '樂齡晨間健走',
  type: '健走',
  difficulty: '輕鬆',
  dateKey: 'today',
  isoDate: '2026-08-16',
  dateLabel: '8 月 16 日',
  time: '上午 9:00',
  park: parks[0] || { id: 'daan-forest', name: '大安森林公園', district: '台北市大安區', address: '', meeting: '2 號出口旁廣場' },
  spots: 6,
  maxSpots: 12,
  cost: '免費',
  audience: '適合 50 歲以上長輩與初學者',
  description: '適合長輩的輕鬆健走活動，路線平緩安全，沿途在樹蔭下漫步交流。',
  items: '自備飲用水、遮陽帽、穿著運動鞋',
  distanceKm: 0.8,
  organizer: { name: '我', role: '活動發起人', rating: '5.0', organized: 1, verified: true },
}

const myOrganizedEvents = computed<readonly EventItem[]>(() => {
  return state.createdEvents.length > 0 ? state.createdEvents : [defaultCreatedSeedEvent]
})

function toggleNotificationExpand(id: string) {
  expandedNotification.value = expandedNotification.value === id ? null : id
}

function addToCalendar(event?: EventItem) {
  showToast(`已將${event ? `「${event.title}」` : '活動'}加入您的行事曆`)
}

function openEvent(event: EventItem) {
  router.push(`/activity/${event.id}`)
}

function shareEvent(event: EventItem) {
  showToast(`已準備分享「${event.title}」`)
}

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 2200)
}

function saveSettings() {
  document.body.classList.toggle('font-large', fontSizeSetting.value === 'large')
  showToast('已儲存個人設定')
  currentSubView.value = null
}
</script>

<template>
  <div class="page-view my-view" id="main-content">
    <!-- 主頁頂部列 -->
    <header v-if="!currentSubView" class="topbar topbar--glass topbar--brand">
      <BrandLogo />
      <button class="icon-button" type="button" aria-label="設定" @click="currentSubView = 'settings'">
        <Settings :size="22" aria-hidden="true" />
      </button>
    </header>

    <!-- 子頁面頂部導覽列 (帶返回按鈕) -->
    <header v-else class="subpage-header">
      <button class="icon-button" type="button" aria-label="返回我的頁面" @click="currentSubView = null">
        <ArrowLeft :size="23" aria-hidden="true" />
      </button>
      <div>
        <strong v-if="currentSubView === 'activities'">我的活動</strong>
        <strong v-else-if="currentSubView === 'favorites'">收藏活動</strong>
        <strong v-else-if="currentSubView === 'parks'">我的公園</strong>
        <strong v-else-if="currentSubView === 'notifications'">通知與提醒</strong>
        <strong v-else-if="currentSubView === 'settings'">個人資料與設定</strong>

        <small v-if="currentSubView === 'activities'">{{ currentActivityTab }}</small>
        <small v-else-if="currentSubView === 'favorites'">{{ favoriteEvents.length }} 個活動</small>
        <small v-else-if="currentSubView === 'parks'">收藏與常去公園</small>
        <small v-else-if="currentSubView === 'notifications'">2 則近期通知</small>
        <small v-else-if="currentSubView === 'settings'">字級與提醒</small>
      </div>
      <span class="subpage-header__spacer" aria-hidden="true"></span>
    </header>

    <!-- 1. 主畫面 (#my) -->
    <main v-if="!currentSubView" class="page-content my-content" aria-label="我的個人專區">
      <!-- 今日行程 (Timeline) -->
      <section class="section" style="margin-bottom: 26px;">
        <div class="section-heading">
          <div>
            <h2>今日行程</h2>
            <p>{{ todayDateLabel }}</p>
          </div>
        </div>
        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-time">{{ todayEvent ? todayEvent.time : '09:00' }}</div>
            <button class="timeline-card" type="button" @click="todayEvent ? openEvent(todayEvent) : router.push('/activity/morning-walk')">
              <h3>{{ todayEvent ? todayEvent.title : '樂齡晨間健走' }}</h3>
              <p>{{ todayEvent ? todayEvent.park.name + '・' + todayEvent.park.meeting : '大安森林公園・2 號出口旁廣場' }}</p>
              <div style="margin-top: 4px;">
                <span class="tag tag--success">已報名</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      <!-- 我的功能 (Action List) -->
      <section class="section">
        <div class="section-heading">
          <div>
            <h2>我的功能</h2>
            <p>快速查看常用資訊</p>
          </div>
        </div>
        <div class="action-list">
          <button class="action-card" type="button" @click="currentSubView = 'activities'">
            <span class="action-icon"><CalendarDays :size="24" aria-hidden="true" /></span>
            <span class="action-text">
              <strong>我的活動</strong>
              <span class="action-sub">已報名、我發起與已結束</span>
            </span>
            <ChevronRight :size="20" class="chevron" aria-hidden="true" />
          </button>

          <button class="action-card" type="button" @click="currentSubView = 'favorites'">
            <span class="action-icon"><Heart :size="24" aria-hidden="true" /></span>
            <span class="action-text">
              <strong>收藏活動</strong>
              <span class="action-sub">下次直接查看，不用重新尋找</span>
            </span>
            <ChevronRight :size="20" class="chevron" aria-hidden="true" />
          </button>

          <button class="action-card" type="button" @click="currentSubView = 'parks'">
            <span class="action-icon"><Trees :size="24" aria-hidden="true" /></span>
            <span class="action-text">
              <strong>我的公園</strong>
              <span class="action-sub">查看收藏與常去公園</span>
            </span>
            <ChevronRight :size="20" class="chevron" aria-hidden="true" />
          </button>

          <button class="action-card" type="button" @click="currentSubView = 'notifications'">
            <span class="action-icon"><Bell :size="24" aria-hidden="true" /></span>
            <span class="action-text">
              <strong>通知與提醒</strong>
              <span class="action-sub">查看活動提醒與異動</span>
            </span>
            <ChevronRight :size="20" class="chevron" aria-hidden="true" />
          </button>

          <button class="action-card" type="button" @click="currentSubView = 'settings'">
            <span class="action-icon"><Settings :size="24" aria-hidden="true" /></span>
            <span class="action-text">
              <strong>個人資料與設定</strong>
              <span class="action-sub">字級與 LINE 通知設定</span>
            </span>
            <ChevronRight :size="20" class="chevron" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>

    <!-- 2. 子頁面：我的活動 (my-activities) -->
    <main v-else-if="currentSubView === 'activities'" class="page-content my-content">
      <div class="eyebrow">我的活動</div>
      <h1>活動安排</h1>
      <p class="page-intro">查看參加、發起與已結束的活動。</p>

      <div class="tablist" role="tablist" aria-label="活動分類">
        <button
          v-for="tab in activityTabs"
          :key="tab"
          class="tab"
          :class="{ 'is-active': currentActivityTab === tab }"
          type="button"
          role="tab"
          :aria-selected="currentActivityTab === tab"
          @click="currentActivityTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Tab 內容 -->
      <div v-if="currentActivityTab === '即將開始' || currentActivityTab === '已報名'" class="result-list">
        <EventCard
          v-for="event in registeredEvents"
          :key="event.id"
          :event="event"
          :favorite="state.favorites.includes(event.id)"
          @open="openEvent"
          @share="shareEvent"
          @toggle-favorite="toggleFavorite(event.id)"
        />
        <div v-if="!registeredEvents.length" class="empty-state">
          <h3>目前沒有已報名的活動</h3>
          <p>先到探索看看適合你的公園活動。</p>
          <button class="button button--primary" type="button" @click="router.push('/explore')">去探索活動</button>
        </div>
      </div>

      <div v-else-if="currentActivityTab === '我發起的'" class="result-list">
        <ManageEventCard
          v-for="event in myOrganizedEvents"
          :key="event.id"
          :event="event"
          @edit="router.push('/manage')"
          @attendees="router.push('/manage')"
          @change="router.push('/manage')"
          @end="router.push('/manage')"
        />
      </div>

      <div v-else-if="currentActivityTab === '已結束'" class="result-list">
        <ManageEventCard
          :event="{
            id: 'ended-walk-archive',
            title: '公園午後散步',
            type: '散步',
            difficulty: '輕鬆',
            dateKey: 'today',
            isoDate: '2026-08-02',
            dateLabel: '8 月 2 日',
            time: '下午 3:00',
            park: parks[1] || { id: 'cksm', name: '中正紀念堂園區', district: '台北市中正區', address: '', meeting: '大門階梯前' },
            spots: 8,
            maxSpots: 8,
            cost: '免費',
            audience: '全年齡皆宜',
            description: '午後散步交流。',
            items: '水壺、遮陽傘',
            distanceKm: 1.2,
            organizer: { name: '我', role: '活動發起人', rating: '5.0', organized: 1, verified: true },
          }"
          status="ended"
          @edit="router.push('/manage')"
          @attendees="router.push('/manage')"
          @change="router.push('/manage')"
          @end="router.push('/manage')"
        />
      </div>
    </main>

    <!-- 3. 子頁面：收藏活動 (favorites) -->
    <main v-else-if="currentSubView === 'favorites'" class="page-content my-content">
      <div class="eyebrow">我的</div>
      <h1>收藏活動</h1>
      <p class="page-intro">把想參加的活動先留下，不用下次重新尋找。</p>

      <div v-if="favoriteEvents.length" class="result-list">
        <EventCard
          v-for="event in favoriteEvents"
          :key="event.id"
          :event="event"
          favorite
          @open="openEvent"
          @share="shareEvent"
          @toggle-favorite="toggleFavorite(event.id)"
        />
      </div>
      <div v-else class="card favorite-empty">
        <div class="favorite-empty-park" aria-hidden="true">
          <Trees :size="48" />
          <UsersRound :size="36" />
        </div>
        <Heart :size="28" style="color: #ea580c; margin: 0 auto 8px;" />
        <h2>還沒有收藏活動</h2>
        <p class="page-intro" style="margin-bottom: 16px;">在推薦活動或活動卡右上角點選愛心，下次就能直接回來查看。</p>
        <button class="button button--primary" type="button" @click="router.push('/explore')">去探索活動</button>
      </div>
    </main>

    <!-- 4. 子頁面：我的公園 (parks) -->
    <main v-else-if="currentSubView === 'parks'" class="page-content my-content">
      <div class="eyebrow">我的公園</div>
      <h1>收藏與常去公園</h1>
      <p class="page-intro">快速查看熟悉公園的近期活動。</p>

      <div class="result-list">
        <article v-for="park in parks" :key="park.id" class="park-visual-card" @click="router.push(`/park/${park.id}`)">
          <span class="tag tag--info" style="margin-bottom: 6px; display: inline-block;">常去的公園</span>
          <h3>{{ park.name }}</h3>
          <p><MapPin :size="15" style="display: inline-block; vertical-align: -2px;" /> {{ park.address }}</p>
          <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.85rem; font-weight: 800;">查看近期活動</span>
            <ChevronRight :size="18" />
          </div>
        </article>
      </div>
    </main>

    <!-- 5. 子頁面：通知與提醒 (notifications) -->
    <main v-else-if="currentSubView === 'notifications'" class="page-content my-content">
      <div class="eyebrow">通知與提醒</div>
      <h1>近期提醒</h1>
      <p class="page-intro">掌握已報名活動的開始時間、出門準備與最新異動。</p>

      <div v-if="registeredEvents.length > 0" class="action-list">
        <article
          v-for="(event, index) in registeredEvents"
          :key="event.id"
          class="expandable-notification"
          :class="{ 'is-expanded': expandedNotification === event.id }"
        >
          <!-- 1. 第一則（最接近的活動）：出發／明日提醒 -->
          <template v-if="index === 0">
            <button
              class="expandable-notification__header"
              type="button"
              :aria-expanded="expandedNotification === event.id"
              @click="toggleNotificationExpand(event.id)"
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

            <div v-if="expandedNotification === event.id" class="expandable-notification__body">
              <div class="notification-detail-item">
                <MapPin :size="18" />
                <div>
                  <strong>集合地點與導航</strong>
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
                <button class="button button--primary button--small" type="button" @click="router.push(`/activity/${event.id}`)">
                  查看活動詳情 <span aria-hidden="true">→</span>
                </button>
                <button class="button button--secondary button--small" type="button" @click="addToCalendar(event)">
                  <CalendarDays :size="16" aria-hidden="true" />
                  加入行事曆
                </button>
                <button class="button button--secondary button--small" type="button" @click="shareEvent(event)">
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
              :aria-expanded="expandedNotification === event.id"
              @click="toggleNotificationExpand(event.id)"
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

            <div v-if="expandedNotification === event.id" class="expandable-notification__body">
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
                <button class="button button--primary button--small" type="button" @click="currentSubView = 'activities'">
                  查看我的行程 <span aria-hidden="true">→</span>
                </button>
                <button class="button button--secondary button--small" type="button" @click="shareEvent(event)">
                  <MessageCircle :size="16" aria-hidden="true" />
                  LINE 邀請朋友
                </button>
                <button class="button button--secondary button--small" type="button" @click="router.push(`/activity/${event.id}`)">
                  活動詳情
                </button>
              </div>
            </div>
          </template>
        </article>
      </div>

      <!-- 空狀態 -->
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
          <p style="margin: 2px 0 0; font-size: 0.85rem; color: var(--ink-soft);">目前設定為開啟，可到個人設定調整。</p>
        </div>
      </div>
    </main>

    <!-- 6. 子頁面：個人資料與設定 (settings) -->
    <main v-else-if="currentSubView === 'settings'" class="page-content my-content">
      <div class="eyebrow">個人資料與設定</div>
      <h1>讓畫面更適合你</h1>
      <p class="page-intro">調整字級與活動提醒方式。</p>

      <form class="card" style="padding: 20px; display: grid; gap: 20px;" @submit.prevent="saveSettings">
        <section class="form-section" style="padding: 0; margin: 0; border: 0;">
          <h2>個人資料</h2>
          <div class="field" style="margin-top: 8px;">
            <label for="display-name">顯示名稱</label>
            <input id="display-name" v-model="userDisplayName" class="input" autocomplete="name" />
          </div>
        </section>

        <section class="form-section" style="padding: 0; margin: 0; border: 0;">
          <h2>閱讀設定</h2>
          <div class="segmented-control" style="margin-top: 8px;">
            <button type="button" :class="{ 'is-selected': fontSizeSetting === 'standard' }" @click="fontSizeSetting = 'standard'">標準</button>
            <button type="button" :class="{ 'is-selected': fontSizeSetting === 'large' }" @click="fontSizeSetting = 'large'">大字</button>
          </div>
        </section>

        <section class="form-section" style="padding: 0; margin: 0; border: 0;">
          <h2>提醒設定</h2>
          <label class="action-card" style="cursor: pointer; margin-top: 8px;">
            <input v-model="lineReminderSetting" type="checkbox" style="width: 22px; height: 22px; accent-color: #0284c7;" />
            <span class="action-text">
              <strong>接收 LINE 活動提醒</strong>
              <span class="action-sub">在活動前 1 天與當天發送通知</span>
            </span>
          </label>
        </section>

        <button class="button button--primary button--full" type="submit">儲存設定</button>
      </form>
    </main>

    <!-- Toast 提示訊息 -->
    <div v-if="toastMessage" class="toast show" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </div>
</template>

