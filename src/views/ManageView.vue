<script setup lang="ts">
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  Info,
  MapPin,
  UsersRound,
} from 'lucide-vue-next'
import { shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAppState } from '@/composables/useAppState'
import { parks } from '@/data/events'

type ManageSubView = 'edit' | 'attendees' | 'change' | 'end' | null

const router = useRouter()
const { state } = useAppState()

const activeSubView = shallowRef<ManageSubView>(null)
const toastMessage = shallowRef('')
const eventStatus = shallowRef<'active' | 'ended' | 'cancelled'>('active')

// 編輯活動表單狀態
const editForm = shallowRef({
  title: '樂齡晨間健走',
  type: '健走',
  date: '2026-08-16',
  time: '09:00',
  park: '大安森林公園',
  meeting: '捷運站 2 號出口旁廣場',
  spots: 12,
  level: '輕鬆',
  audience: '適合 50 歲以上長輩與初學者',
  items: '自備飲用水、遮陽帽、穿著運動鞋',
  cost: '免費',
  intro: '適合長輩的輕鬆健走活動，路線平緩安全，沿途在樹蔭下漫步交流。',
})

// 報名名單模擬資料
const attendeeList = [
  { name: '王美華', initial: '王', status: '已報名', tag: '已確認' },
  { name: '陳志明', initial: '陳', status: '已報名', tag: '已確認' },
  { name: '李秀琴', initial: '李', status: '已報名', tag: '已確認' },
  { name: '張國雄', initial: '張', status: '已報名', tag: '已確認' },
  { name: '周玉蘭', initial: '周', status: '已報名', tag: '已確認' },
  { name: '黃建成', initial: '黃', status: '已報名', tag: '已確認' },
]

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 2200)
}

function saveEdit() {
  showToast('已儲存活動變更')
  activeSubView.value = null
}

function saveChange() {
  showToast('已更新活動異動資訊')
  activeSubView.value = null
}

function cancelActivity() {
  eventStatus.value = 'cancelled'
  showToast('已取消這場活動')
  activeSubView.value = null
}

function markActivityEnd() {
  eventStatus.value = 'ended'
  showToast('已將活動標記為結束')
  activeSubView.value = null
}
</script>

<template>
  <div class="page-view manage-view" id="main-content">
    <!-- 主導覽列 -->
    <header class="subpage-header">
      <button class="icon-button" type="button" aria-label="返回" @click="activeSubView ? activeSubView = null : router.push('/create')">
        <ArrowLeft :size="23" aria-hidden="true" />
      </button>
      <div>
        <strong v-if="!activeSubView">活動管理</strong>
        <strong v-else-if="activeSubView === 'edit'">編輯活動</strong>
        <strong v-else-if="activeSubView === 'attendees'">查看報名名單</strong>
        <strong v-else-if="activeSubView === 'change'">活動異動／取消</strong>
        <strong v-else-if="activeSubView === 'end'">活動結束</strong>

        <small v-if="!activeSubView">我發起的活動</small>
        <small v-else-if="activeSubView === 'edit'">尚在報名中</small>
        <small v-else-if="activeSubView === 'attendees'">6／12 人</small>
        <small v-else-if="activeSubView === 'change'">{{ editForm.title }}</small>
        <small v-else-if="activeSubView === 'end'">完成活動管理</small>
      </div>
      <span class="subpage-header__spacer" aria-hidden="true"></span>
    </header>

    <!-- 1. 活動管理主畫面 -->
    <main v-if="!activeSubView" class="page-content" aria-labelledby="manage-title">
      <div class="eyebrow">活動管理</div>
      <h1 id="manage-title">我發起的活動</h1>
      <p class="page-intro">查看報名、編輯內容或處理活動異動。</p>

      <section class="manage-grid" style="margin-bottom: 24px;">
        <!-- 活動卡片 -->
        <article class="card" style="padding: 20px; background: rgba(255, 253, 248, 0.95); border: 1px solid var(--line); border-radius: 20px;">
          <!-- 頂部標籤 -->
          <div class="manage-card-topline">
            <span v-if="eventStatus === 'active'" class="tag tag--success">報名中</span>
            <span v-else-if="eventStatus === 'ended'" class="tag">已結束</span>
            <span v-else-if="eventStatus === 'cancelled'" class="tag" style="background: #fee2e2; color: #b91c1c;">已取消</span>

            <span class="tag tag--info">6／12 人</span>
          </div>

          <h2 style="margin: 8px 0 12px; font-size: 1.35rem; color: var(--ink);">{{ editForm.title }}</h2>

          <div style="display: grid; gap: 6px; margin-bottom: 16px; color: var(--ink-soft); font-size: 0.95rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <CalendarDays :size="18" style="color: #2b5e40;" aria-hidden="true" />
              <span>8 月 16 日・上午 9:00</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <MapPin :size="18" style="color: #2b5e40;" aria-hidden="true" />
              <span>{{ editForm.park }}</span>
            </div>
          </div>

          <!-- 2x2 操作按鈕群 -->
          <div class="manage-actions-grid">
            <button class="manage-action-btn" type="button" @click="activeSubView = 'edit'">
              <Edit3 :size="18" aria-hidden="true" />
              <span>編輯</span>
            </button>
            <button class="manage-action-btn" type="button" @click="activeSubView = 'attendees'">
              <UsersRound :size="18" aria-hidden="true" />
              <span>報名名單</span>
            </button>
            <button class="manage-action-btn" type="button" @click="activeSubView = 'change'">
              <AlertTriangle :size="18" aria-hidden="true" />
              <span>異動／取消</span>
            </button>
            <button class="manage-action-btn" type="button" @click="activeSubView = 'end'">
              <Check :size="18" aria-hidden="true" />
              <span>活動結束</span>
            </button>
          </div>
        </article>

        <!-- 若有新增的活動也列出 -->
        <article v-for="event in state.createdEvents" :key="event.id" class="card" style="padding: 20px; background: rgba(255, 253, 248, 0.95); border: 1px solid var(--line); border-radius: 20px;">
          <div class="manage-card-topline">
            <span class="tag tag--success">進行中</span>
            <span class="tag tag--info">{{ event.spots }} 人</span>
          </div>
          <h2 style="margin: 8px 0 12px; font-size: 1.35rem; color: var(--ink);">{{ event.title }}</h2>
          <div style="display: grid; gap: 6px; margin-bottom: 16px; color: var(--ink-soft); font-size: 0.95rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <CalendarDays :size="18" style="color: #2b5e40;" aria-hidden="true" />
              <span>{{ event.dateLabel }}・{{ event.time }}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <MapPin :size="18" style="color: #2b5e40;" aria-hidden="true" />
              <span>{{ event.park.name }}</span>
            </div>
          </div>
        </article>
      </section>

      <button class="button button--primary button--full" type="button" @click="router.push('/create')">
        再建立一場活動
      </button>
    </main>

    <!-- 2. 子頁面：編輯活動 (edit) -->
    <main v-else-if="activeSubView === 'edit'" class="page-content">
      <div class="eyebrow">編輯活動</div>
      <h1>{{ editForm.title }}</h1>
      <p class="page-intro">更新後，請確認時間、地點與參加資訊仍正確。</p>

      <form class="card" style="padding: 20px; display: grid; gap: 18px;" @submit.prevent="saveEdit">
        <div class="field">
          <label for="edit-title">活動名稱</label>
          <input id="edit-title" v-model="editForm.title" class="input" required />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="field">
            <label for="edit-date">日期</label>
            <input id="edit-date" v-model="editForm.date" type="date" class="input" required />
          </div>
          <div class="field">
            <label for="edit-time">開始時間</label>
            <input id="edit-time" v-model="editForm.time" type="time" class="input" required />
          </div>
        </div>

        <div class="field">
          <label for="edit-park">公園</label>
          <select id="edit-park" v-model="editForm.park" class="select">
            <option v-for="p in parks" :key="p.id" :value="p.name">{{ p.name }}</option>
          </select>
        </div>

        <div class="field">
          <label for="edit-meeting">集合地點</label>
          <input id="edit-meeting" v-model="editForm.meeting" class="input" required />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="field">
            <label for="edit-spots">名額</label>
            <input id="edit-spots" v-model.number="editForm.spots" type="number" min="3" max="50" class="input" required />
          </div>
          <div class="field">
            <label for="edit-level">活動難度</label>
            <select id="edit-level" v-model="editForm.level" class="select">
              <option value="輕鬆">輕鬆</option>
              <option value="一般">一般</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="edit-intro">活動介紹</label>
          <textarea id="edit-intro" v-model="editForm.intro" class="textarea" rows="3"></textarea>
        </div>

        <button class="button button--primary button--full" type="submit" style="margin-top: 8px;">
          儲存變更 <span aria-hidden="true">✓</span>
        </button>
        <p class="helper-text" style="text-align: center; margin: 4px 0 0;">儲存後仍可在活動管理中繼續編輯。</p>
      </form>
    </main>

    <!-- 3. 子頁面：報名名單 (attendees) -->
    <main v-else-if="activeSubView === 'attendees'" class="page-content">
      <div class="eyebrow">報名名單</div>
      <h1>已有 6 人參加</h1>
      <p class="page-intro">{{ editForm.title }}・名額 12 人</p>

      <div class="attendee-list" style="margin-bottom: 24px;">
        <div v-for="person in attendeeList" :key="person.name" class="attendee-card">
          <div class="attendee-avatar">{{ person.initial }}</div>
          <div class="attendee-info">
            <strong>{{ person.name }}</strong>
            <span>{{ person.status }}</span>
          </div>
          <span class="tag tag--success">{{ person.tag }}</span>
        </div>
      </div>

      <button class="button button--secondary button--full" type="button" @click="activeSubView = null">
        返回活動管理
      </button>
    </main>

    <!-- 4. 子頁面：活動異動／取消 (change) -->
    <main v-else-if="activeSubView === 'change'" class="page-content">
      <div class="eyebrow">活動異動</div>
      <h1>更新活動資訊</h1>
      <p class="page-intro">若時間或集合地點改變，請在這裡更新。</p>

      <form class="card" style="padding: 20px; display: grid; gap: 16px; margin-bottom: 24px;" @submit.prevent="saveChange">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="field">
            <label for="change-date">日期</label>
            <input id="change-date" v-model="editForm.date" type="date" class="input" required />
          </div>
          <div class="field">
            <label for="change-time">開始時間</label>
            <input id="change-time" v-model="editForm.time" type="time" class="input" required />
          </div>
        </div>

        <div class="field">
          <label for="change-meeting">集合地點</label>
          <input id="change-meeting" v-model="editForm.meeting" class="input" required />
        </div>

        <button class="button button--primary button--full" type="submit" style="margin-top: 8px;">
          儲存異動
        </button>
      </form>

      <!-- 取消活動提示與按鈕 -->
      <div class="notice" style="background: #fee2e2; border-color: #fecaca; color: #b91c1c;">
        <AlertTriangle :size="22" style="color: #dc2626;" aria-hidden="true" />
        <div>
          <strong style="color: #991b1b;">需要取消活動？</strong>
          <p style="margin: 2px 0 0; font-size: 0.85rem; color: #b91c1c;">取消前請再次確認，避免影響已報名參加者。</p>
        </div>
      </div>

      <button class="button button--full" type="button" style="margin-top: 12px; background: #dc2626; color: #ffffff; border-color: #dc2626;" @click="cancelActivity">
        取消這場活動
      </button>
    </main>

    <!-- 5. 子頁面：活動結束 (end) -->
    <main v-else-if="activeSubView === 'end'" class="page-content">
      <div class="eyebrow">活動結束</div>
      <h1>確認活動已完成</h1>
      <p class="page-intro">標記後，活動會移到「已結束」分類。</p>

      <section class="card" style="padding: 20px; background: #ffffff; border: 1px solid var(--line); border-radius: 18px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px; font-size: 1.25rem;">{{ editForm.title }}</h2>
        <div style="display: grid; gap: 8px; color: var(--ink-soft); font-size: 0.95rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <CalendarDays :size="18" style="color: #2b5e40;" />
            <span>8 月 16 日・上午 9:00－10:00</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <MapPin :size="18" style="color: #2b5e40;" />
            <span>{{ editForm.park }}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <UsersRound :size="18" style="color: #2b5e40;" />
            <span>6 人報名</span>
          </div>
        </div>
      </section>

      <div class="notice" style="background: #fef3c7; border-color: #fde68a; color: #92400e; margin-bottom: 24px;">
        <Info :size="22" style="color: #d97706;" aria-hidden="true" />
        <div>
          <strong style="color: #78350f;">請確認活動確實已完成</strong>
          <p style="margin: 2px 0 0; font-size: 0.85rem; color: #92400e;">確認標記後，參加者將可為活動留下評價。</p>
        </div>
      </div>

      <button class="button button--primary button--full" type="button" @click="markActivityEnd">
        標記活動結束 <span aria-hidden="true">✓</span>
      </button>
    </main>

    <!-- Toast 提示訊息 -->
    <div v-if="toastMessage" class="toast show" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </div>
</template>

