<script setup lang="ts">
import { CalendarDays, ChevronRight, Clock3, History, Map, MapPin, Pencil, RotateCcw, Search, UsersRound } from 'lucide-vue-next'
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

const selectedGooglePark = shallowRef<SelectedParkResult | null>(
  props.parkId
    ? {
        name: props.parks.find((p) => p.id === props.parkId || p.name === props.parkId)?.name || props.parkId,
        address: props.parks.find((p) => p.id === props.parkId || p.name === props.parkId)?.address || '',
        district: props.parks.find((p) => p.id === props.parkId || p.name === props.parkId)?.district || '台北市',
      }
    : null
)

const selectedPark = computed(() => {
  if (selectedGooglePark.value) {
    return {
      id: selectedGooglePark.value.name,
      name: selectedGooglePark.value.name,
      district: selectedGooglePark.value.district,
      address: selectedGooglePark.value.address,
      meeting: '公園主要入口處',
    }
  }
  return props.parks.find((park) => park.id === props.parkId || park.name === props.parkId) ?? props.parks[0]
})

function handleGoogleParkSelect(result: SelectedParkResult) {
  selectedGooglePark.value = result
  emit('update:parkId', result.name)
  emit('update:meeting', `${result.name}入口廣場`)
}

function clearSelectedPark() {
  selectedGooglePark.value = null
  emit('update:parkId', '')
}

const meetingOptions = computed(() => Array.from(new Set([
  selectedPark.value?.meeting,
  '公園入口處',
  '捷運站出口旁',
  '服務中心前',
  '涼亭前廣場',
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
        <label class="schedule-field-label" for="create-direct-date">
          活動日期
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
            <span class="schedule-field-label">活動開始</span>
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
            <span class="schedule-field-label">活動結束</span>
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

    <!-- 3. 活動地點選擇 (直接顯示於介面，自動適應 RWD Auto Layout) -->
    <div class="schedule-direct-row schedule-direct-row--location" aria-label="選擇活動地點">
      <MapPin :size="22" class="schedule-direct-icon" aria-hidden="true" />
      <div class="schedule-direct-body">
        <div class="schedule-field-label-group">
          <span class="schedule-field-label">活動地點</span>
          <small>連線 Google 地圖搜尋全台</small>
        </div>

        <!-- 已選定活動地點資訊卡片 -->
        <div v-if="selectedGooglePark" class="selected-google-park-card">
          <div class="selected-google-park-card__header">
            <span class="tag tag--success">✓ 已選定活動地點</span>
            <button class="btn-re-search" type="button" @click="clearSelectedPark">
              <RotateCcw :size="14" aria-hidden="true" />
              <span>重新搜尋其他地點</span>
            </button>
          </div>
          <div class="selected-google-park-card__body">
            <div class="selected-google-park-icon">
              <MapPin :size="22" />
            </div>
            <div class="selected-google-park-text">
              <strong>{{ selectedGooglePark.name }}</strong>
              <span v-if="selectedGooglePark.address">{{ selectedGooglePark.address }}</span>
              <small v-if="selectedGooglePark.district">{{ selectedGooglePark.district }}</small>
            </div>
          </div>
        </div>

        <!-- 預設未選定時：直接呈現空白 Google Places 搜尋框 -->
        <div v-else class="direct-park-search-panel">
          <ParkAutocomplete
            placeholder="請輸入想舉辦活動的地點（例：青年公園、大安森林公園）..."
            :auto-focus="false"
            @select="handleGoogleParkSelect"
          />
          <p class="google-places-helper">
            💡 輸入地點或公園名稱，系統將連線 Google Places API 即時為您搜尋全台灣所有地點。
          </p>
        </div>
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
      <span><span class="schedule-field-label">集合地點</span><strong>{{ meeting || '請先選擇活動地點或自訂集合處' }}</strong></span>
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
