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
import { computed, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import ManageEventCard from '@/components/manage/ManageEventCard.vue'
import { useAppState } from '@/composables/useAppState'
import { parks, type EventItem } from '@/data/events'
import { updateEventInSupabase, updateEventStatusInSupabase } from '@/services/eventService'
import type { ParticipantItem } from '@/services/registrationService'

type ManageSubView = 'edit' | 'attendees' | 'change' | 'end' | null

const router = useRouter()
const { state, getEventParticipants, checkInAttendee } = useAppState()

const activeSubView = shallowRef<ManageSubView>(null)
const toastMessage = shallowRef('')
const eventStatuses = ref<Record<string, 'active' | 'ended' | 'cancelled'>>({})
const participants = ref<ParticipantItem[]>([])
const isLoadingParticipants = shallowRef(false)
const isSaving = shallowRef(false)

const allManagedEvents = computed<EventItem[]>(() => [...state.createdEvents])

const selectedEvent = shallowRef<EventItem | null>(null)

// 編輯活動表單狀態
const editForm = ref({
  title: '',
  type: '健走',
  date: '',
  time: '09:00',
  park: '',
  meeting: '',
  spots: 12,
  level: '輕鬆',
  audience: '',
  items: '',
  cost: '免費',
  intro: '',
})

function loadEditForm(event: EventItem) {
  editForm.value = {
    title: event.title,
    type: event.type,
    date: event.isoDate,
    time: event.time.includes('－') ? event.time.split('－')[0].replace(/[^0-9:]/g, '') : event.time.replace(/[^0-9:]/g, '') || '09:00',
    park: event.park.name,
    meeting: event.park.meeting || '',
    spots: event.maxSpots,
    level: event.difficulty,
    audience: event.audience,
    items: event.items,
    cost: event.cost,
    intro: event.description,
  }
}

function onOpenEdit(event: EventItem) {
  selectedEvent.value = event
  loadEditForm(event)
  activeSubView.value = 'edit'
}

async function onOpenAttendees(event: EventItem) {
  selectedEvent.value = event
  activeSubView.value = 'attendees'
  isLoadingParticipants.value = true
  try {
    const list = await getEventParticipants(event.id)
    participants.value = list
  } catch {
    participants.value = []
  } finally {
    isLoadingParticipants.value = false
  }
}

async function toggleCheckIn(person: ParticipantItem) {
  if (!selectedEvent.value) return
  const nextStatus = person.checkInStatus === 'checked_in' ? 'pending' : 'checked_in'
  const saved = await checkInAttendee(selectedEvent.value.id, person.userId, nextStatus)
  if (!saved) {
    showToast('簽到狀態尚未儲存，請稍後重試')
    return
  }
  person.checkInStatus = nextStatus
  showToast(nextStatus === 'checked_in' ? `已完成 ${person.userName} 簽到` : `已取消 ${person.userName} 簽到`)
}

function onOpenChange(event: EventItem) {
  selectedEvent.value = event
  loadEditForm(event)
  activeSubView.value = 'change'
}

function onOpenEnd(event: EventItem) {
  selectedEvent.value = event
  loadEditForm(event)
  activeSubView.value = 'end'
}

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 2200)
}

async function saveEdit() {
  if (!selectedEvent.value || isSaving.value) return
  isSaving.value = true
  try {
    const saved = await updateEventInSupabase(selectedEvent.value.id, {
      title: editForm.value.title,
      iso_date: editForm.value.date,
      time: editForm.value.time,
      park_name: editForm.value.park,
      park_meeting: editForm.value.meeting,
      max_spots: editForm.value.spots,
      difficulty: editForm.value.level,
      cost: editForm.value.cost,
      description: editForm.value.intro,
      items: editForm.value.items,
      audience: editForm.value.audience,
    })
    if (!saved) {
      showToast('活動變更尚未儲存，請稍後重試')
      return
    }
    selectedEvent.value.title = editForm.value.title
    selectedEvent.value.description = editForm.value.intro
    selectedEvent.value.items = editForm.value.items
    selectedEvent.value.audience = editForm.value.audience
    showToast('已儲存活動變更')
    activeSubView.value = null
  } finally {
    isSaving.value = false
  }
}

async function saveChange() {
  if (!selectedEvent.value || isSaving.value) return
  isSaving.value = true
  try {
    const saved = await updateEventInSupabase(selectedEvent.value.id, {
      iso_date: editForm.value.date,
      time: editForm.value.time,
      park_meeting: editForm.value.meeting,
    })
    if (!saved) {
      showToast('活動異動尚未儲存，請稍後重試')
      return
    }
    showToast('已更新活動異動資訊')
    activeSubView.value = null
  } finally {
    isSaving.value = false
  }
}

async function cancelActivity() {
  if (!selectedEvent.value || isSaving.value) return
  isSaving.value = true
  try {
    const saved = await updateEventStatusInSupabase(selectedEvent.value.id, 'cancelled')
    if (!saved) {
      showToast('取消狀態尚未儲存，請稍後重試')
      return
    }
    eventStatuses.value[selectedEvent.value.id] = 'cancelled'
    selectedEvent.value.status = 'cancelled'
    showToast('已取消這場活動')
    activeSubView.value = null
  } finally {
    isSaving.value = false
  }
}

async function markActivityEnd() {
  if (!selectedEvent.value || isSaving.value) return
  isSaving.value = true
  try {
    const saved = await updateEventStatusInSupabase(selectedEvent.value.id, 'ended')
    if (!saved) {
      showToast('活動結束狀態尚未儲存，請稍後重試')
      return
    }
    eventStatuses.value[selectedEvent.value.id] = 'ended'
    selectedEvent.value.status = 'ended'
    showToast('已將活動標記為結束')
    activeSubView.value = null
  } finally {
    isSaving.value = false
  }
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
        <small v-else-if="activeSubView === 'edit'">{{ selectedEvent?.title }}</small>
        <small v-else-if="activeSubView === 'attendees'">{{ selectedEvent?.spots ?? 0 }}／{{ selectedEvent?.maxSpots ?? 0 }} 人</small>
        <small v-else-if="activeSubView === 'change'">{{ selectedEvent?.title }}</small>
        <small v-else-if="activeSubView === 'end'">完成活動管理</small>
      </div>
      <span class="subpage-header__spacer" aria-hidden="true"></span>
    </header>

    <!-- 1. 活動管理主畫面 -->
    <main v-if="!activeSubView" class="page-content" aria-labelledby="manage-title">
      <div class="eyebrow">活動管理</div>
      <h1 id="manage-title">我發起的活動</h1>
      <p class="page-intro">查看報名、編輯內容或處理活動異動。</p>

      <section v-if="allManagedEvents.length" class="manage-grid" style="margin-bottom: 24px;">
        <ManageEventCard
          v-for="event in allManagedEvents"
          :key="event.id"
          :event="event"
          :status="eventStatuses[event.id] || event.status || 'active'"
          @edit="onOpenEdit"
          @attendees="onOpenAttendees"
          @change="onOpenChange"
          @end="onOpenEnd"
        />
      </section>

      <section v-else class="empty-state card" style="margin-bottom: 24px; padding: 28px 20px; text-align: center;">
        <h2 style="margin-top: 0;">目前還沒有你發起的活動</h2>
        <p>登入 LINE 後建立的活動會顯示在這裡。</p>
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

        <button class="button button--primary button--full" type="submit" style="margin-top: 8px;" :disabled="isSaving" :aria-busy="isSaving">
          {{ isSaving ? '正在儲存…' : '儲存變更' }} <span v-if="!isSaving" aria-hidden="true">✓</span>
        </button>
        <p class="helper-text" style="text-align: center; margin: 4px 0 0;">儲存後仍可在活動管理中繼續編輯。</p>
      </form>
    </main>

    <!-- 3. 子頁面：報名名單 (attendees) -->
    <main v-else-if="activeSubView === 'attendees'" class="page-content">
      <div class="eyebrow">報名名單與簽到</div>
      <h1>已有 {{ participants.length }} 人參加</h1>
      <p class="page-intro">{{ selectedEvent?.title }}・上限 {{ selectedEvent?.maxSpots ?? 0 }} 人</p>

      <div v-if="isLoadingParticipants" style="text-align: center; padding: 30px; color: var(--ink-soft);">
        正在載入名冊中...
      </div>

      <div v-else-if="participants.length > 0" class="attendee-list" style="margin-bottom: 24px; display: grid; gap: 10px;">
        <div
          v-for="person in participants"
          :key="person.id"
          class="attendee-card"
          style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-radius: 14px; border: 1px solid var(--line);"
        >
          <div style="display: flex; align-items: center; gap: 12px;">
            <img v-if="person.userAvatar" :src="person.userAvatar" alt="" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
            <div v-else class="attendee-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: #2b5e40; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800;">
              {{ person.userName.charAt(0) }}
            </div>
            <div class="attendee-info">
              <strong style="font-size: 1.05rem; display: block;">{{ person.userName }}</strong>
              <small style="color: var(--ink-soft);">報名時間：{{ person.registeredAt }}</small>
            </div>
          </div>

          <button
            class="button button--small"
            :class="person.checkInStatus === 'checked_in' ? 'button--primary' : 'button--secondary'"
            type="button"
            style="padding: 6px 14px; font-size: 0.85rem;"
            @click="toggleCheckIn(person)"
          >
            {{ person.checkInStatus === 'checked_in' ? '✓ 已簽到' : '點擊簽到' }}
          </button>
        </div>
      </div>

      <div v-else class="empty-state" style="text-align: center; padding: 32px 16px;">
        <p>目前尚無參加者報名</p>
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

        <button class="button button--primary button--full" type="submit" style="margin-top: 8px;" :disabled="isSaving" :aria-busy="isSaving">
          {{ isSaving ? '正在儲存…' : '儲存異動' }}
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

      <button class="button button--full" type="button" style="margin-top: 12px; background: #dc2626; color: #ffffff; border-color: #dc2626;" :disabled="isSaving" :aria-busy="isSaving" @click="cancelActivity">
        {{ isSaving ? '正在儲存…' : '取消這場活動' }}
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

      <button class="button button--primary button--full" type="button" :disabled="isSaving" :aria-busy="isSaving" @click="markActivityEnd">
        {{ isSaving ? '正在儲存…' : '標記活動結束' }} <span v-if="!isSaving" aria-hidden="true">✓</span>
      </button>
    </main>

    <!-- Toast 提示訊息 -->
    <div v-if="toastMessage" class="toast show" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </div>
</template>
