<script setup lang="ts">
import { Calendar, Check, Download, ExternalLink, Smartphone, X } from 'lucide-vue-next'
import type { EventItem } from '@/data/events'
import { downloadIcsCalendar, generateGoogleCalendarUrl } from '@/utils/calendarUtils'

const props = defineProps<{
  show: boolean
  event: EventItem | null
}>()

const emit = defineEmits<{
  close: []
  added: [type: 'google' | 'apple']
}>()

function addToGoogle() {
  if (!props.event) return
  const url = generateGoogleCalendarUrl(props.event)
  window.open(url, '_blank', 'noopener,noreferrer')
  emit('added', 'google')
  emit('close')
}

function addToApple() {
  if (!props.event) return
  downloadIcsCalendar(props.event)
  emit('added', 'apple')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show && event" class="responsive-dialog" role="dialog" aria-modal="true" aria-labelledby="cal-dialog-title">
      <div class="responsive-dialog__backdrop" @click="emit('close')" />

      <div class="responsive-dialog__panel" style="max-width: 480px; margin-inline: auto; border-radius: 28px 28px 0 0; padding-bottom: 24px;">
        <div class="responsive-dialog__handle" />

        <header class="responsive-dialog__header" style="border-bottom: 0; padding-bottom: 6px;">
          <div>
            <span class="eyebrow">活動提醒</span>
            <h2 id="cal-dialog-title">加入我的行事曆</h2>
          </div>
          <button class="icon-button responsive-dialog__close" type="button" aria-label="關閉" @click="emit('close')">
            <X :size="24" />
          </button>
        </header>

        <div style="padding: 0 20px;">
          <p style="margin: 0 0 16px; color: var(--ink-soft); font-size: 0.92rem; line-height: 1.5;">
            請選擇您習慣使用的日曆，活動開始前 1 小時會自動發送出發提醒：
          </p>

          <div style="display: grid; gap: 12px;">
            <!-- 1. Google 日曆 -->
            <button
              class="cal-option-btn"
              type="button"
              @click="addToGoogle"
            >
              <div class="cal-option-icon" style="background: #e0f2fe; color: #0284c7;">
                <Calendar :size="24" />
              </div>
              <div class="cal-option-text">
                <strong>Google 日曆</strong>
                <span>適合 Android 手機與 Google 帳號用戶</span>
              </div>
              <ExternalLink :size="18" style="color: var(--ink-soft); flex-shrink: 0;" />
            </button>

            <!-- 2. Apple / 手機日曆 -->
            <button
              class="cal-option-btn"
              type="button"
              @click="addToApple"
            >
              <div class="cal-option-icon" style="background: #dcfce7; color: #15803d;">
                <Smartphone :size="24" />
              </div>
              <div class="cal-option-text">
                <strong>Apple / 手機內建日曆</strong>
                <span>適合 iPhone / iPad / 系統行事曆 (.ics)</span>
              </div>
              <Download :size="18" style="color: var(--ink-soft); flex-shrink: 0;" />
            </button>
          </div>

          <div style="margin-top: 20px; padding: 12px 14px; background: rgba(247, 242, 232, 0.7); border: 1px solid var(--line); border-radius: 14px; font-size: 0.85rem; color: var(--ink-soft);">
            📍 <strong>活動地點</strong>：{{ event.park.name }}（{{ event.park.meeting }}）<br />
            ⏰ <strong>活動時間</strong>：{{ event.dateLabel }}・{{ event.time }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cal-option-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #ffffff;
  border: 1.5px solid var(--line, #d8e0d8);
  border-radius: 18px;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.cal-option-btn:hover {
  background: #f0fdf4;
  border-color: #5b8d70;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(43, 94, 64, 0.1);
}

.cal-option-btn:active {
  transform: scale(0.98);
}

.cal-option-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.cal-option-text {
  flex: 1;
  min-width: 0;
}

.cal-option-text strong {
  display: block;
  font-size: 1.05rem;
  color: var(--ink, #20343b);
  font-weight: 800;
}

.cal-option-text span {
  display: block;
  font-size: 0.82rem;
  color: var(--ink-soft, #5f6d63);
  margin-top: 2px;
}
</style>
