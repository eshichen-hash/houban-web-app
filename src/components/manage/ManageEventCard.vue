<script setup lang="ts">
import { AlertTriangle, CalendarDays, Check, Edit3, MapPin, UsersRound } from 'lucide-vue-next'
import type { EventItem } from '@/data/events'

defineProps<{
  event: EventItem
  status?: 'active' | 'ended' | 'cancelled'
}>()

const emit = defineEmits<{
  edit: [event: EventItem]
  attendees: [event: EventItem]
  change: [event: EventItem]
  end: [event: EventItem]
}>()
</script>

<template>
  <article class="card manage-event-card" style="padding: 20px; background: rgba(255, 253, 248, 0.95); border: 1px solid var(--line); border-radius: 20px;">
    <!-- 頂部狀態與人數標籤 -->
    <div class="manage-card-topline">
      <span v-if="status === 'ended'" class="tag">已結束</span>
      <span v-else-if="status === 'cancelled'" class="tag" style="background: #fee2e2; color: #b91c1c;">已取消</span>
      <span v-else class="tag tag--success">進行中</span>

      <span class="tag tag--info">{{ event.spots || 6 }}／{{ event.maxSpots || 12 }} 人</span>
    </div>

    <h2 style="margin: 8px 0 12px; font-size: 1.35rem; color: var(--ink);">{{ event.title }}</h2>

    <div style="display: grid; gap: 6px; margin-bottom: 16px; color: var(--ink-soft); font-size: 0.95rem;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <CalendarDays :size="18" style="color: #2b5e40;" aria-hidden="true" />
        <span>{{ event.dateLabel || '今天' }}・{{ event.time }}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <MapPin :size="18" style="color: #2b5e40;" aria-hidden="true" />
        <span>{{ event.park.name }}</span>
      </div>
    </div>

    <!-- 2x2 統一操作按鈕群 -->
    <div class="manage-actions-grid">
      <button class="manage-action-btn" type="button" @click="emit('edit', event)">
        <Edit3 :size="18" aria-hidden="true" />
        <span>編輯</span>
      </button>
      <button class="manage-action-btn" type="button" @click="emit('attendees', event)">
        <UsersRound :size="18" aria-hidden="true" />
        <span>報名名單</span>
      </button>
      <button class="manage-action-btn" type="button" @click="emit('change', event)">
        <AlertTriangle :size="18" aria-hidden="true" />
        <span>異動／取消</span>
      </button>
      <button class="manage-action-btn" type="button" @click="emit('end', event)">
        <Check :size="18" aria-hidden="true" />
        <span>活動結束</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.manage-card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.manage-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.manage-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid var(--line, #d8e0d8);
  border-radius: 14px;
  color: var(--ink, #20343b);
  font-size: 0.92rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.manage-action-btn:hover {
  background: #f0fdf4;
  border-color: #5b8d70;
  color: #2b5e40;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(43, 94, 64, 0.1);
}

.manage-action-btn:active {
  transform: scale(0.97);
  background: #dcfce7;
}

@media (max-width: 360px) {
  .manage-actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>

