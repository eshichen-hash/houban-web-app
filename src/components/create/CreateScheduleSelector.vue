<script setup lang="ts">
import { CalendarDays, ChevronRight, Clock3, MapPin, Pencil, UsersRound } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import type { Park } from '@/data/events'

type PickerName = 'date' | 'time' | 'park' | 'meeting'

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
const customDateOpen = shallowRef(false)
const customMeetingOpen = shallowRef(false)
const customMeeting = shallowRef('')

const selectedPark = computed(() => props.parks.find((park) => park.id === props.parkId) ?? props.parks[0])
const timeOptions = [
  { start: '09:00', end: '10:00', label: '上午 9:00' },
  { start: '10:30', end: '11:30', label: '上午 10:30' },
  { start: '14:00', end: '15:00', label: '下午 2:00' },
]
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
  customDateOpen.value = false
  openPicker.value = null
}

function addMinutesToTime(value: string, minutes: number) {
  const [hour = '0', minute = '0'] = value.split(':')
  const totalMinutes = Number(hour) * 60 + Number(minute) + minutes
  const normalizedMinutes = totalMinutes % (24 * 60)
  return `${String(Math.floor(normalizedMinutes / 60)).padStart(2, '0')}:${String(normalizedMinutes % 60).padStart(2, '0')}`
}

function selectPresetTime(start: string, end: string) {
  emit('update:time', start)
  emit('update:endTime', end)
  openPicker.value = null
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
    <div class="schedule-row schedule-row--two">
      <button
        class="schedule-field schedule-field--date"
        type="button"
        aria-label="選擇日期"
        aria-controls="create-date-picker"
        :aria-expanded="openPicker === 'date'"
        @click="togglePicker('date')"
      >
        <CalendarDays :size="22" aria-hidden="true" />
        <span><small>日期</small><strong>{{ dateLabel }}</strong></span>
        <ChevronRight :size="19" aria-hidden="true" />
      </button>
      <button
        class="schedule-field schedule-field--time"
        type="button"
        aria-label="選擇時間"
        aria-controls="create-time-picker"
        :aria-expanded="openPicker === 'time'"
        @click="togglePicker('time')"
      >
        <Clock3 :size="22" aria-hidden="true" />
        <span><small>時間</small><strong>{{ timeLabel }}</strong></span>
        <ChevronRight :size="19" aria-hidden="true" />
      </button>
    </div>

    <div v-show="openPicker === 'date'" id="create-date-picker" class="schedule-picker-panel" aria-label="選擇活動日期">
      <div class="schedule-choice-grid schedule-choice-grid--three">
        <button class="schedule-choice" :class="{ 'is-selected': isoDate === todayIso }" type="button" :aria-pressed="isoDate === todayIso" @click="selectDate(todayIso)">今天</button>
        <button class="schedule-choice" :class="{ 'is-selected': isoDate === tomorrowIso }" type="button" :aria-pressed="isoDate === tomorrowIso" @click="selectDate(tomorrowIso)">明天</button>
        <button class="schedule-choice" :class="{ 'is-selected': customDateOpen }" type="button" :aria-pressed="customDateOpen" @click="customDateOpen = !customDateOpen"><CalendarDays :size="18" aria-hidden="true" />選日期</button>
      </div>
      <label v-show="customDateOpen" class="schedule-custom-field" for="create-custom-date">
        <span>選擇活動日期</span>
        <input id="create-custom-date" :value="isoDate" type="date" :min="todayIso" @change="selectDate(($event.target as HTMLInputElement).value)" />
      </label>
    </div>

    <div v-show="openPicker === 'time'" id="create-time-picker" class="schedule-picker-panel" aria-label="選擇活動時間區間">
      <div class="schedule-choice-grid schedule-choice-grid--time" aria-label="快速選擇開始時間">
        <button
          v-for="option in timeOptions"
          :key="option.start"
          class="schedule-choice"
          :class="{ 'is-selected': time === option.start && endTime === option.end }"
          type="button"
          :aria-pressed="time === option.start && endTime === option.end"
          @click="selectPresetTime(option.start, option.end)"
        >
          {{ option.label }}
        </button>
      </div>
      <fieldset class="schedule-time-range">
        <legend>自訂活動時間</legend>
        <div class="schedule-time-range__fields">
          <label class="schedule-time-field" for="create-custom-start-time">
            <span>活動開始</span>
            <input id="create-custom-start-time" name="event-start-time" :value="time" type="time" autocomplete="off" @change="updateStartTime(($event.target as HTMLInputElement).value)" />
          </label>
          <span class="schedule-time-range__separator" aria-hidden="true">～</span>
          <label class="schedule-time-field" for="create-custom-end-time">
            <span>活動結束</span>
            <input id="create-custom-end-time" name="event-end-time" :value="endTime" type="time" :min="time" autocomplete="off" @change="updateEndTime(($event.target as HTMLInputElement).value)" />
          </label>
        </div>
      </fieldset>
    </div>

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
      <p class="schedule-picker-heading">最近／常去公園</p>
      <div class="park-choice-list" role="listbox" aria-label="可選擇的公園">
        <button v-for="park in parks" :key="park.id" class="park-choice" :class="{ 'is-selected': parkId === park.id }" type="button" role="option" :aria-selected="parkId === park.id" @click="selectPark(park.id)">
          <MapPin :size="20" aria-hidden="true" />
          <span><strong>{{ park.name }}</strong><small>{{ park.address }}</small></span>
          <span class="park-choice__status">{{ parkId === park.id ? '已選擇' : '選擇' }}</span>
        </button>
      </div>
      <p class="schedule-picker-note">目前使用本地公園資料；Google 地圖搜尋將在核心流程穩定後串接。</p>
    </div>

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
