<script setup lang="ts">
import { CalendarDays, ChevronDown } from 'lucide-vue-next'
import { computed, shallowRef, watch } from 'vue'
import InterestPickerDialog from '@/components/explore/InterestPickerDialog.vue'
import { activityTypes, type DateFilter, type EventType } from '@/data/events'
import type { ExploreFilters } from '@/types/explore'

const props = defineProps<{
  dateFilter: DateFilter
  interest: EventType | '全部'
  customDate: string | null
  resultCount: number
}>()

const emit = defineEmits<{
  apply: [filters: ExploreFilters]
  preview: [filters: ExploreFilters]
}>()

const open = defineModel<boolean>('open', { default: false })
const calendarOpen = shallowRef(false)
const interestDialogOpen = shallowRef(false)
const draftDateFilter = shallowRef<DateFilter>(props.dateFilter)
const draftCustomDate = shallowRef<string | null>(props.customDate)
const draftInterest = shallowRef<EventType | '全部'>(props.interest)

const quickTypes = activityTypes.slice(0, 5)
const dateOptions: Array<{ value: Exclude<DateFilter, 'custom'>; label: string }> = [
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '本週' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

const appliedDateLabel = computed(() => {
  if (props.dateFilter === 'custom' && props.customDate) return formatDate(props.customDate)
  if (props.dateFilter === 'tomorrow') return '明天'
  if (props.dateFilter === 'week') return '本週'
  return '今天'
})

const appliedSummary = computed(() => `${appliedDateLabel.value}・${props.interest === '全部' ? '全部興趣' : props.interest}`)

function currentDraft(): ExploreFilters {
  return {
    dateFilter: draftDateFilter.value,
    customDate: draftCustomDate.value,
    interest: draftInterest.value,
  }
}

function syncDraft() {
  draftDateFilter.value = props.dateFilter
  draftCustomDate.value = props.customDate
  draftInterest.value = props.interest
  calendarOpen.value = false
}

function chooseDate(value: Exclude<DateFilter, 'custom'>) {
  draftDateFilter.value = value
  draftCustomDate.value = null
  calendarOpen.value = false
}

function chooseCustomDate(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.value) return
  draftCustomDate.value = input.value
  draftDateFilter.value = 'custom'
}

function applyFilters() {
  emit('apply', currentDraft())
  open.value = false
}

watch(open, (isOpen) => {
  if (!isOpen) return
  syncDraft()
  emit('preview', currentDraft())
})

watch([draftDateFilter, draftCustomDate, draftInterest], () => {
  if (open.value) emit('preview', currentDraft())
})
</script>

<template>
  <section class="filter-panel" aria-label="篩選活動">
    <button
      class="filter-panel__toggle"
      type="button"
      :aria-expanded="open"
      aria-controls="explore-filter-body"
      @click="open = !open"
    >
      <span class="filter-panel__toggle-copy">
        <strong>篩選活動</strong>
        <small>{{ appliedSummary }}</small>
      </span>
      <ChevronDown :size="22" :class="{ 'is-rotated': open }" aria-hidden="true" />
    </button>

    <Transition name="filter-expand">
      <div v-if="open" id="explore-filter-body" class="filter-panel__body">
        <p class="filter-panel__lead">慢慢挑一場，選個方便的時間出發</p>

        <fieldset class="filter-group">
          <legend>什麼時候想出門？</legend>
          <div class="choice-grid choice-grid--dates" role="group" aria-label="選擇活動日期">
            <button
              v-for="option in dateOptions"
              :key="option.value"
              class="choice-button"
              :class="{ 'is-selected': draftDateFilter === option.value }"
              type="button"
              :aria-pressed="draftDateFilter === option.value"
              @click="chooseDate(option.value)"
            >
              {{ option.label }}
            </button>
            <button
              class="choice-button choice-button--calendar"
              :class="{ 'is-selected': draftDateFilter === 'custom' }"
              type="button"
              aria-label="使用日曆選擇日期"
              :aria-expanded="calendarOpen"
              @click="calendarOpen = !calendarOpen"
            >
              <CalendarDays :size="18" aria-hidden="true" />
              日曆
            </button>
          </div>
          <div v-if="calendarOpen" class="calendar-popover">
            <label for="filter-date">選擇日期</label>
            <input id="filter-date" name="filter-date" type="date" autocomplete="off" :value="draftCustomDate ?? ''" @change="chooseCustomDate" />
            <small>選擇後會預估符合日期的活動數量。</small>
          </div>
        </fieldset>

        <fieldset class="filter-group">
          <legend>想做什麼活動？</legend>
          <div class="choice-grid choice-grid--types" role="group" aria-label="選擇一種活動興趣">
            <button class="choice-button" :class="{ 'is-selected': draftInterest === '全部' }" type="button" :aria-pressed="draftInterest === '全部'" @click="draftInterest = '全部'">
              全部
            </button>
            <button
              v-for="type in quickTypes"
              :key="type"
              class="choice-button"
              :class="{ 'is-selected': draftInterest === type }"
              type="button"
              :aria-pressed="draftInterest === type"
              @click="draftInterest = type"
            >
              {{ type }}
            </button>
          </div>
          <button class="text-link" type="button" @click="interestDialogOpen = true">
            查看全部 15 種活動 <span aria-hidden="true">→</span>
          </button>
        </fieldset>

        <div class="filter-panel__apply">
          <span aria-live="polite">目前條件有 {{ resultCount }} 場</span>
          <button class="button button--primary button--full" type="button" @click="applyFilters">
            查看 {{ resultCount }} 場活動
          </button>
        </div>
      </div>
    </Transition>

    <InterestPickerDialog
      :open="interestDialogOpen"
      :types="activityTypes"
      :selected="draftInterest"
      @close="interestDialogOpen = false"
      @select="draftInterest = $event"
    />
  </section>
</template>
