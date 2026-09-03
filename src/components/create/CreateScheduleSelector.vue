<script setup lang="ts">
import { CalendarDays, ChevronRight, Clock3, History, Map, MapPin, Pencil, Search, UsersRound } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import ParkAutocomplete, { type SelectedParkResult } from '@/components/ParkAutocomplete.vue'
import type { Park } from '@/data/events'

type PickerName = 'park' | 'meeting'
type ParkTab = 'history' | 'search' | 'map'

const props = defineProps<{
  isoDate: string
  time: string
  endTime: string
  parkId: string
  meeting: string
  parks: Park[]
  todayIso: string
  tomorrowIso: string
  dateLabel: string
  timeLabel: string
}>()

const emit = defineEmits<{
  'update:isoDate': [value: string]
  'update:time': [value: string]
  'update:endTime': [value: string]
  'update:parkId': [value: string]
  'update:meeting': [value: string]
}>()

const openPicker = shallowRef<PickerName | null>(null)
const parkTab = shallowRef<ParkTab>('history')
const parkSearchQuery = shallowRef('')
const customMeetingOpen = shallowRef(false)
const customMeeting = shallowRef('')

const selectedPark = computed(() => props.parks.find((park) => park.id === props.parkId) ?? props.parks[0])

function handleGoogleParkSelect(result: SelectedParkResult) {
  const existing = props.parks.find((p) => p.name.includes(result.name) || result.name.includes(p.name))
  if (existing) {
    selectPark(existing.id)
  } else {
    // 若為 Google 地圖新搜尋到的公園，加入現有列表或更新 parkId
    selectPark(result.name)
  }
}

const searchedParks = computed(() => {
  const q = parkSearchQuery.value.trim().toLowerCase()
  if (!q) return props.parks
  return props.parks.filter((p) => p.name.toLowerCase().includes(q) || p.district.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
})

const meetingOptions = computed(() => Array.from(new Set([
  selectedPark.value?.meeting,
  '公園入口',
  '服務中心',
].filter((value): value is string => Boolean(value)))))

function togglePicker(name: PickerName) {
  openPicker.value = openPicker.value === name ? null : name
}

function selectDate(value: string) {
  emit('update:isoDate', value)
}

function addMinutesToTime(value: string, minutes: number) {
  const [hour = '0', minute = '0'] = value.split(':')
  const totalMinutes = Number(hour) * 60 + Number(minute) + minutes
  const normalizedMinutes = totalMinutes % (24 * 60)
  return `${String(Math.floor(normalizedMinutes / 60)).padStart(2, '0')}:${String(normalizedMinutes % 60).padStart(2, '0')}`
}

function updateStartTime(value: string) {
  emit('update:time', value)
  if (props.endTime <= value) emit('update:endTime', addMinutesToTime(value, 60))
}

function updateEndTime(value: string) {
  emit('update:endTime', value > props.time ? value : addMinutesToTime(props.time, 60))
}

function selectPark(value: string) {
  emit('update:parkId', value)
  openPicker.value = null
}

function selectMeeting(value: string) {
  emit('update:meeting', value)
  customMeetingOpen.value = false
  openPicker.value = null
}

function saveCustomMeeting() {
  const value = customMeeting.value.trim()
  if (!value) return
  selectMeeting(value)
}
</script>

<template>
  <div class="schedule-grid" data-testid="create-schedule-selector">
    <!-- 1. 日期選擇 -->
    <div class="schedule-direct-row schedule-direct-row--date" aria-label="選擇活動日期">
      <CalendarDays :size="22" class="schedule-direct-icon" aria-hidden="true" />
      <div class="schedule-direct-body">
        <label class="schedule-direct-label" for="create-direct-date">
          <small>活動日期</small>
        </label>
        <input
          id="create-direct-date"
          :value="isoDate"
          type="date"
          :min="todayIso"
          class="schedule-direct-input"
          @change="selectDate(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- 2. 時間選擇 -->
    <div class="schedule-direct-row schedule-direct-row--time" aria-label="設定活動時間">
      <Clock3 :size="22" class="schedule-direct-icon" aria-hidden="true" />
      <div class="schedule-direct-body">
        <div class="schedule-time-range__fields">
          <label class="schedule-time-field" for="create-custom-start-time">
            <span>活動開始</span>
            <input
              id="create-custom-start-time"
              name="event-start-time"
              :value="time"
              type="time"
              autocomplete="off"
              @change="updateStartTime(($event.target as HTMLInputElement).value)"
            />
          </label>
          <span class="schedule-time-range__separator" aria-hidden="true">～</span>
          <label class="schedule-time-field" for="create-custom-end-time">
            <span>活動結束</span>
            <input
              id="create-custom-end-time"
              name="event-end-time"
              :value="endTime"
              type="time"
              :min="time"
              autocomplete="off"
              @change="updateEndTime(($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>
      </div>
    </div>

    <!-- 3. 公園選擇 (手風琴按鈕) -->
    <button
      class="schedule-field schedule-field--wide"
      type="button"
      aria-label="選擇公園"
      aria-controls="create-park-picker"
      :aria-expanded="openPicker === 'park'"
      @click="togglePicker('park')"
    >
      <MapPin :size="22" aria-hidden="true" />
      <span><small>公園</small><strong>{{ selectedPark?.name }}</strong><em>{{ selectedPark?.district }}</em></span>
      <ChevronRight :size="19" aria-hidden="true" />
    </button>
    <div v-show="openPicker === 'park'" id="create-park-picker" class="schedule-picker-panel" aria-label="選擇公園">
      <!-- 來源切換頁籤：最近／常去、搜尋、地圖 -->
      <div class="place-source-tabs" role="tablist" aria-label="公園切換方式">
        <button
          class="place-source-tab"
          :class="{ 'is-active': parkTab === 'history' }"
          type="button"
          role="tab"
          :aria-selected="parkTab === 'history'"
          @click="parkTab = 'history'"
        >
          <History :size="20" aria-hidden="true" />
          <span>最近／常去</span>
        </button>
        <button
          class="place-source-tab"
          :class="{ 'is-active': parkTab === 'search' }"
          type="button"
          role="tab"
          :aria-selected="parkTab === 'search'"
          @click="parkTab = 'search'"
        >
          <Search :size="20" aria-hidden="true" />
          <span>搜尋</span>
        </button>
        <button
          class="place-source-tab"
          :class="{ 'is-active': parkTab === 'map' }"
          type="button"
          role="tab"
          :aria-selected="parkTab === 'map'"
          @click="parkTab = 'map'"
        >
          <Map :size="20" aria-hidden="true" />
          <span>地圖</span>
        </button>
      </div>

      <!-- 頁籤一：最近／常去公園 -->
      <div v-show="parkTab === 'history'" class="quick-park-history-panel">
        <div class="quick-park-history-list" role="listbox" aria-label="歷史與常去公園">
          <button
            v-for="park in parks"
            :key="park.id"
            class="quick-park-history-item"
            :class="{ 'is-selected': parkId === park.id }"
            type="button"
            role="option"
            :aria-selected="parkId === park.id"
            @click="selectPark(park.id)"
          >
            <History :size="20" class="quick-park-item-icon" aria-hidden="true" />
            <span class="quick-park-item-text">
              <strong>{{ park.name }}</strong>
              <small>{{ park.district }}</small>
            </span>
            <span class="park-saved-tag">已保存</span>
          </button>
        </div>
      </div>

      <!-- 頁籤二：搜尋公園 -->
      <div v-show="parkTab === 'search'" class="quick-park-search-panel">
        <ParkAutocomplete
          placeholder="搜尋全台公園（即時跳出選項）..."
          @select="handleGoogleParkSelect"
        />
        <div class="quick-park-history-list" style="margin-top: 10px;">
          <button
            v-for="park in searchedParks"
            :key="park.id"
            class="quick-park-history-item"
            :class="{ 'is-selected': parkId === park.id }"
            type="button"
            @click="selectPark(park.id)"
          >
            <MapPin :size="20" class="quick-park-item-icon" aria-hidden="true" />
            <span class="quick-park-item-text">
              <strong>{{ park.name }}</strong>
              <small>{{ park.address }}</small>
            </span>
            <span class="park-saved-tag">{{ parkId === park.id ? '已選擇' : '選擇' }}</span>
          </button>
        </div>
      </div>

      <!-- 頁籤三：地圖模式 -->
      <div v-show="parkTab === 'map'" class="quick-park-map-panel">
        <div class="create-map-demo" role="img" aria-label="公園位置示意地圖">
          <span class="create-map-label">地圖找公園・原型示意</span>
          <button
            v-for="park in parks"
            :key="park.id"
            class="create-map-pin"
            :class="{ 'is-active': parkId === park.id }"
            type="button"
            @click="selectPark(park.id)"
          >
            <MapPin :size="18" aria-hidden="true" />
            <span class="create-map-pin-label">{{ park.name }}</span>
          </button>
        </div>
        <p class="create-map-note">點選地圖上的公園即可帶入名稱；正式版可串接 Google Maps。</p>
      </div>
    </div>

    <!-- 4. 集合地點選擇 (手風琴按鈕) -->
    <button
      class="schedule-field schedule-field--wide"
      type="button"
      aria-label="選擇集合地點"
      aria-controls="create-meeting-picker"
      :aria-expanded="openPicker === 'meeting'"
      @click="togglePicker('meeting')"
    >
      <UsersRound :size="22" aria-hidden="true" />
      <span><small>集合地點</small><strong>{{ meeting }}</strong></span>
      <ChevronRight :size="19" aria-hidden="true" />
    </button>
    <div v-show="openPicker === 'meeting'" id="create-meeting-picker" class="schedule-picker-panel" aria-label="選擇集合地點">
      <div class="schedule-choice-grid schedule-choice-grid--three">
        <button v-for="option in meetingOptions" :key="option" class="schedule-choice" :class="{ 'is-selected': meeting === option && !customMeetingOpen }" type="button" :aria-pressed="meeting === option && !customMeetingOpen" @click="selectMeeting(option)">{{ option }}</button>
        <button class="schedule-choice" :class="{ 'is-selected': customMeetingOpen }" type="button" :aria-pressed="customMeetingOpen" @click="customMeetingOpen = !customMeetingOpen"><Pencil :size="18" aria-hidden="true" />自訂</button>
      </div>
      <div v-show="customMeetingOpen" class="schedule-custom-field">
        <label for="create-custom-meeting">自訂集合地點</label>
        <div class="schedule-custom-row">
          <input id="create-custom-meeting" v-model.trim="customMeeting" type="text" placeholder="例如：噴水池旁涼亭" @keyup.enter="saveCustomMeeting" />
          <button class="button button--secondary" type="button" :disabled="!customMeeting.trim()" @click="saveCustomMeeting">套用</button>
        </div>
      </div>
    </div>
  </div>
</template>
