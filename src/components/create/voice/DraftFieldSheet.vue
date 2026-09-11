<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, shallowRef, useTemplateRef } from 'vue'
import { Minus, Plus, X, CircleAlert } from 'lucide-vue-next'
import { fullActivityTypes, type Cost, type EventType, type Park } from '@/data/events'
import type { DraftField } from '@/composables/useVoiceActivityDraft'
import { DRAFT_FIELDS } from '@/composables/useVoiceActivityDraft'
import type { SelectedParkResult } from '@/types/places'
import { addCalendarDays, eventDateTime, isValidDate, taipeiDate, timeMinutes } from '@/utils/eventDateTime'
import DraftPlacePicker from './DraftPlacePicker.vue'

export interface DraftFieldValue {
  type: EventType | ''; isoDate: string; time: string; endTime: string; meeting: string; spots: number;
  cost: Cost; costAmount: number | null; items: string; name: string; intro: string
}
const props = defineProps<{ field: DraftField; value: DraftFieldValue; park: Park | null; parkQuery: string; generatedName: string; generatedIntro: string; initialError?: string }>()
const emit = defineEmits<{ close: []; apply: [value: DraftFieldValue, place: SelectedParkResult | null]; openPark: [] }>()
const draft = reactive({ ...props.value }), place = shallowRef<SelectedParkResult | null>(null)
const error = shallowRef(props.initialError || '')
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const title = computed(() => DRAFT_FIELDS.find((item) => item.key === props.field)!.label)
const today = taipeiDate()
let previousFocus: HTMLElement | null = null, previousOverflow = ''
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement; previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'; dialog.value?.showModal()
  // Keep the heading visible when opened; do not force a mobile keyboard before an explicit tap.
  dialog.value?.querySelector<HTMLElement>('h2')?.focus()
})
onScopeDispose(() => { document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }) })
function toggleItem(item: string) {
  const items = draft.items.split(/[、,，\n]/).map((value) => value.trim()).filter(Boolean)
  draft.items = (items.includes(item) ? items.filter((value) => value !== item) : [...items, item]).join('、')
}
function save() {
  error.value = ''
  if (props.field === 'type' && !draft.type) error.value = '請選擇一種活動類型。'
  if (props.field === 'date' && (!isValidDate(draft.isoDate) || draft.isoDate < taipeiDate())) error.value = '請選擇今天或之後的日期。'
  if (props.field === 'time') {
    const start = timeMinutes(draft.time), end = timeMinutes(draft.endTime)
    if (start === null || end === null) error.value = '請填寫開始與結束時間。'
    else if (end <= start) error.value = '結束時間須晚於開始時間；目前僅支援當日活動。'
    else if (isValidDate(draft.isoDate) && eventDateTime(draft.isoDate, draft.time).getTime() <= Date.now()) error.value = '開始時間已過，請改選時間或日期。'
  }
  if (props.field === 'park' && !place.value?.name) error.value = '請先從搜尋結果選擇一個地點。'
  if (props.field === 'meeting' && !draft.meeting.trim()) error.value = '請填寫明確的集合地點。'
  if (props.field === 'spots' && (!Number.isInteger(draft.spots) || draft.spots < 3 || draft.spots > 50)) error.value = '請設定 3–50 人的名額。'
  if (props.field === 'cost' && draft.cost === '付費' && (!Number.isInteger(draft.costAmount) || Number(draft.costAmount) < 1 || Number(draft.costAmount) > 9999)) error.value = '請填寫每人費用 NT$1–9,999。'
  if (props.field === 'copy' && (!draft.name.trim() || !draft.intro.trim())) error.value = '請填寫活動名稱與介紹，或使用自動產生。'
  if (error.value) return
  emit('apply', { ...draft }, place.value)
}
</script>
<template>
  <Teleport to="body">
    <dialog ref="dialog" class="vd-dialog" aria-labelledby="draft-sheet-title" @cancel.prevent="emit('close')" @click.self="emit('close')">
      <section class="vd-sheet">
        <div class="vd-sheet-handle" aria-hidden="true"></div>
        <header class="vd-sheet-header"><h2 id="draft-sheet-title" tabindex="-1">{{ title }}</h2><button class="vd-icon-button" type="button" aria-label="取消修改並關閉" @click="emit('close')"><X :size="22" /></button></header>
        <form @submit.prevent="save">
          <div class="vd-sheet-body">
            <p v-if="error" class="vd-warning vd-inline" role="alert"><CircleAlert :size="20" aria-hidden="true" />{{ error }}</p>
            <fieldset v-if="field === 'type'" class="vd-radio-grid"><legend class="sr-only">選擇一種活動</legend><label v-for="item in fullActivityTypes" :key="item.key" :class="{ selected: draft.type === item.name }"><input v-model="draft.type" type="radio" name="draft-type" :value="item.name" /><span>{{ item.name }}</span></label></fieldset>
            <template v-else-if="field === 'date'">
              <label class="vd-input-label" for="draft-date">活動日期</label><input id="draft-date" v-model="draft.isoDate" class="vd-input" type="date" :min="today" required />
              <div class="vd-chips"><button type="button" @click="draft.isoDate = today">今天</button><button type="button" @click="draft.isoDate = addCalendarDays(today, 1)">明天</button></div><p class="vd-muted">日期以台灣時間為準。</p>
            </template>
            <template v-else-if="field === 'time'">
              <div class="vd-time-presets" aria-label="時間快選"><button v-for="option in [{ start: '09:00', end: '10:00' }, { start: '10:30', end: '11:30' }, { start: '14:00', end: '15:00' }]" :key="option.start" type="button" :aria-pressed="draft.time === option.start && draft.endTime === option.end" @click="draft.time = option.start; draft.endTime = option.end">{{ option.start }}–{{ option.end }}</button></div>
              <div class="vd-time-inputs"><label class="vd-input-label">活動開始<input v-model="draft.time" class="vd-input" type="time" required /></label><label class="vd-input-label">活動結束<input v-model="draft.endTime" class="vd-input" type="time" required /></label></div><p class="vd-muted">可直接修改時間；結束須晚於開始。</p>
            </template>
            <DraftPlacePicker v-else-if="field === 'park'" :initial-query="parkQuery || park?.name || ''" @select="place = $event.name ? $event : null" />
            <template v-else-if="field === 'meeting'">
              <p class="vd-muted">{{ park ? `活動地點：${park.name}` : '請先確認公園，再說明在哪裡集合。' }}</p>
              <button v-if="!park" type="button" class="vd-text-button" @click="emit('openPark')">先確認公園／地點</button>
              <label class="vd-input-label" for="draft-meeting">集合位置</label><textarea id="draft-meeting" v-model="draft.meeting" class="vd-input" rows="3" maxlength="300" placeholder="例如：捷運大安森林公園站 2 號出口旁" required></textarea>
              <div v-if="park?.meeting" class="vd-chips"><button type="button" @click="draft.meeting = park!.meeting">使用地點建議：{{ park.meeting }}</button></div>
              <p class="vd-muted">請確認出入口或明顯地標；系統建議不代表實際入口位置。</p>
            </template>
            <template v-else-if="field === 'spots'">
              <p>希望邀請幾位好伴？</p><div class="vd-stepper"><button type="button" aria-label="減少名額" :disabled="draft.spots <= 3" @click="draft.spots = Math.max(3, Number(draft.spots) - 1)"><Minus /></button><label><input v-model.number="draft.spots" type="number" min="3" max="50" aria-label="活動名額" required /><span>人</span></label><button type="button" aria-label="增加名額" :disabled="draft.spots >= 50" @click="draft.spots = Math.min(50, Number(draft.spots) + 1)"><Plus /></button></div><p class="vd-muted">3–50 位參加者，不含主辦人。</p>
            </template>
            <template v-else-if="field === 'cost'">
              <fieldset class="vd-radio-grid vd-two-cols"><legend class="sr-only">活動費用</legend><label v-for="cost in (['免費', '付費'] as const)" :key="cost" :class="{ selected: draft.cost === cost }"><input v-model="draft.cost" type="radio" name="draft-cost" :value="cost" />{{ cost }}</label></fieldset>
              <label v-if="draft.cost === '付費'" class="vd-input-label">每人費用（新台幣）<input v-model.number="draft.costAmount" class="vd-input" type="number" min="1" max="9999" inputmode="numeric" placeholder="例如：100" required /></label>
              <p class="vd-muted">金額會顯示給參加者。本平台目前不代收款項。</p>
            </template>
            <template v-else-if="field === 'items'">
              <label class="vd-input-label" for="draft-items">攜帶物品（選填）</label><textarea id="draft-items" v-model="draft.items" class="vd-input" rows="3" maxlength="1000" placeholder="例如：飲用水、帽子、毛巾"></textarea>
              <div class="vd-chips"><button v-for="item in ['飲用水', '帽子', '毛巾', '防曬用品']" :key="item" type="button" :aria-pressed="draft.items.split('、').includes(item)" @click="toggleItem(item)">{{ item }}</button></div>
            </template>
            <template v-else-if="field === 'copy'">
              <label class="vd-input-label">活動名稱<input v-model="draft.name" class="vd-input" maxlength="100" required /></label>
              <label class="vd-input-label">活動介紹<textarea v-model="draft.intro" class="vd-input" rows="5" maxlength="2000" required></textarea></label>
              <button type="button" class="vd-text-button" @click="draft.name = generatedName; draft.intro = generatedIntro">依目前選擇重新產生</button>
            </template>
          </div>
          <footer class="vd-sheet-footer"><button type="button" class="vd-secondary" @click="emit('close')">取消</button><button class="vd-primary" type="submit">{{ field === 'park' ? '確認此地點' : '確認修改' }}</button></footer>
        </form>
      </section>
    </dialog>
  </Teleport>
</template>
