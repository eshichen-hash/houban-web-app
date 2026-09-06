<script setup lang="ts">
import { CalendarDays, ChevronRight, Clock3, MapPin, Pencil, RotateCcw, UsersRound } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import ParkAutocomplete from '@/components/ParkAutocomplete.vue'
import type { Park } from '@/data/events'
import type { SelectedParkResult } from '@/types/places'
import type { CreateValidationErrors } from '@/composables/useCreateEventDraft'

const props = defineProps<{
  isoDate: string
  time: string
  endTime: string
  meeting: string
  selectedPark: Park | null
  todayIso: string
  errors?: CreateValidationErrors
}>()

const emit = defineEmits<{
  'update:isoDate': [value: string]
  'update:time': [value: string]
  'update:endTime': [value: string]
  'update:meeting': [value: string]
  'select-place': [place: SelectedParkResult]
  'clear-park': []
}>()

const openPicker = shallowRef<'meeting' | null>(null)
const customMeetingOpen = shallowRef(false)
const customMeeting = shallowRef('')
const meetingOptions = computed(() => Array.from(new Set([
  props.selectedPark?.meeting,
  '公園入口處', '捷運站出口旁', '服務中心前', '涼亭前廣場',
].filter((value): value is string => Boolean(value)))))

function togglePicker(name: 'meeting') {
  openPicker.value = openPicker.value === name ? null : name
}

function selectMeeting(value: string) {
  emit('update:meeting', value)
  customMeetingOpen.value = false
  openPicker.value = null
}

function saveCustomMeeting() {
  if (customMeeting.value.trim()) selectMeeting(customMeeting.value.trim())
}
</script>

<template>
  <div class="schedule-grid" data-testid="create-schedule-selector">
    <!-- 1. 日期選擇 -->
    <div class="schedule-card-row schedule-card-row--date" aria-label="選擇活動日期">
      <div class="schedule-row-header">
        <CalendarDays :size="18" class="schedule-row-icon" aria-hidden="true" />
        <label class="schedule-row-title" for="create-direct-date">活動日期</label>
      </div>
      <div class="schedule-row-control">
        <input
          id="create-direct-date"
          name="event-date"
          :value="isoDate"
          type="date"
          :min="todayIso"
          class="schedule-direct-input"
          :aria-invalid="Boolean(errors?.isoDate)"
          :aria-describedby="errors?.isoDate ? 'create-date-error' : undefined"
          @change="emit('update:isoDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <p v-if="errors?.isoDate" id="create-date-error" class="schedule-field-error">{{ errors.isoDate }}</p>
    </div>

    <!-- 2. 時間選擇 -->
    <div class="schedule-card-row schedule-card-row--time" aria-label="設定活動時間">
      <div class="schedule-row-header">
        <Clock3 :size="18" class="schedule-row-icon" aria-hidden="true" />
        <span class="schedule-row-title">活動時間</span>
      </div>
      <div class="schedule-time-flow">
        <input
          id="create-custom-start-time"
          name="event-start-time"
          aria-label="活動開始時間"
          :value="time"
          type="time"
          autocomplete="off"
          class="schedule-time-input"
          :aria-invalid="Boolean(errors?.time)"
          :aria-describedby="errors?.time ? 'create-start-time-error' : undefined"
          @change="emit('update:time', ($event.target as HTMLInputElement).value)"
        />
        <span class="schedule-time-tilde" aria-hidden="true">至</span>
        <input
          id="create-custom-end-time"
          name="event-end-time"
          aria-label="活動結束時間"
          :value="endTime"
          type="time"
          :min="time"
          autocomplete="off"
          class="schedule-time-input"
          :aria-invalid="Boolean(errors?.endTime)"
          :aria-describedby="errors?.endTime ? 'create-end-time-error' : undefined"
          @change="emit('update:endTime', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <p v-if="errors?.time" id="create-start-time-error" class="schedule-field-error">{{ errors.time }}</p>
      <p v-if="errors?.endTime" id="create-end-time-error" class="schedule-field-error">{{ errors.endTime }}</p>
    </div>

    <!-- 3. 活動地點選擇 (直接顯示於介面，自動適應 RWD Auto Layout) -->
    <div class="schedule-card-row schedule-card-row--location" aria-label="選擇活動地點">
      <div class="schedule-row-header">
        <MapPin :size="18" class="schedule-row-icon" aria-hidden="true" />
        <span class="schedule-row-title">活動地點</span>
      </div>
      <div class="schedule-row-control">
        <!-- 已選定活動地點資訊卡片 -->
        <div v-if="selectedPark" class="selected-google-park-card">
          <div class="selected-google-park-card__header">
            <span class="tag tag--success">✓ 已選定活動地點</span>
            <button class="btn-re-search" type="button" @click="emit('clear-park')">
              <RotateCcw :size="14" aria-hidden="true" />
              <span>重新搜尋其他地點</span>
            </button>
          </div>
          <div class="selected-google-park-card__body">
            <div class="selected-google-park-icon">
              <MapPin :size="22" aria-hidden="true" />
            </div>
            <div class="selected-google-park-text">
              <strong>{{ selectedPark.name }}</strong>
              <span v-if="selectedPark.address">{{ selectedPark.address }}</span>
              <small v-if="selectedPark.district">{{ selectedPark.district }}</small>
            </div>
          </div>
        </div>

        <!-- 預設未選定時：直接呈現空白搜尋框 -->
        <div v-else class="direct-park-search-panel">
          <ParkAutocomplete
            placeholder="輸入地點或公園名稱"
            :auto-focus="false"
            :invalid="Boolean(errors?.park)"
            :described-by="errors?.park ? 'create-park-error' : undefined"
            @select="emit('select-place', $event)"
          />
        </div>
      </div>
      <p v-if="errors?.park" id="create-park-error" class="schedule-field-error">{{ errors.park }}</p>
    </div>

    <!-- 4. 集合地點選擇 (統一 Auto Layout 輸入框規格) -->
    <div class="schedule-card-row schedule-card-row--meeting" aria-label="選擇集合地點">
      <div class="schedule-row-header">
        <UsersRound :size="18" class="schedule-row-icon" aria-hidden="true" />
        <span class="schedule-row-title">集合地點</span>
      </div>
      <div class="schedule-row-control">
        <button
          id="create-meeting-button"
          class="schedule-fake-input"
          type="button"
          :class="{ 'is-active': openPicker === 'meeting' }"
          aria-controls="create-meeting-picker"
          :aria-expanded="openPicker === 'meeting'"
          :aria-invalid="Boolean(errors?.meeting)"
          :aria-describedby="errors?.meeting ? 'create-meeting-error' : undefined"
          @click="togglePicker('meeting')"
        >
          <span class="schedule-fake-input__text">{{ meeting || '請先選擇活動地點或自訂集合處' }}</span>
          <ChevronRight :size="18" class="schedule-fake-input__icon" :class="{ 'is-rotated': openPicker === 'meeting' }" aria-hidden="true" />
        </button>
      </div>
      <p v-if="errors?.meeting" id="create-meeting-error" class="schedule-field-error">{{ errors.meeting }}</p>
    </div>
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

<style scoped>
.schedule-field-error { margin: 4px 0 0; color: #9c332a; font-size: .9rem; line-height: 1.5; overflow-wrap: anywhere; }
.schedule-fake-input { width: 100%; text-align: left; }
</style>
