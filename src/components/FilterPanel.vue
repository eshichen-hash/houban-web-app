<script setup lang="ts">
import { CalendarDays, ChevronDown } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import { activityTypes, type DateFilter, type EventType } from '@/data/events'

const props = defineProps<{
  dateFilter: DateFilter
  interest: EventType | '全部'
  customDate: string | null
}>()

const emit = defineEmits<{
  'update:dateFilter': [value: Exclude<DateFilter, 'custom'>]
  'update:customDate': [value: string]
  'update:interest': [value: EventType | '全部']
}>()

const open = defineModel<boolean>('open', { default: false })
const calendarOpen = shallowRef(false)
const quickTypes = activityTypes.slice(0, 6)
const dateOptions: Array<{ value: Exclude<DateFilter, 'custom'>; label: string }> = [
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'week', label: '本週' },
]

const currentDateLabel = computed(() => {
  if (props.dateFilter === 'custom' && props.customDate) return `指定日期・${props.customDate.replaceAll('-', '/')}`
  if (props.dateFilter === 'tomorrow') return '明天'
  if (props.dateFilter === 'week') return '本週'
  return '今天'
})

function chooseCustomDate(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.value) return
  emit('update:customDate', input.value)
  calendarOpen.value = false
}
</script>

<template>
  <section class="filter-panel" aria-label="篩選活動">
    <button
      class="filter-panel__toggle"
      type="button"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="filter-panel__toggle-copy">
        <strong>篩選活動</strong>
        <small>依日期與興趣挑選</small>
      </span>
      <ChevronDown :size="22" :class="{ 'is-rotated': open }" aria-hidden="true" />
    </button>

    <div v-if="open" class="filter-panel__body">
      <p class="filter-panel__lead">慢慢挑一場，選個方便的時間出發</p>
      <div class="filter-group">
        <div class="filter-group__heading">
          <h2>什麼時候想出門？</h2>
          <span>目前查看：{{ currentDateLabel }}</span>
        </div>
        <div class="choice-grid choice-grid--dates" role="group" aria-label="選擇活動日期">
          <button
            v-for="option in dateOptions"
            :key="option.value"
            class="choice-button"
            :class="{ 'is-selected': props.dateFilter === option.value }"
            type="button"
            :aria-pressed="props.dateFilter === option.value"
            @click="emit('update:dateFilter', option.value)"
          >
            {{ option.label }}
          </button>
          <button class="choice-button choice-button--calendar" :class="{ 'is-selected': props.dateFilter === 'custom' }" type="button" aria-label="開啟日曆" :aria-expanded="calendarOpen" @click="calendarOpen = !calendarOpen">
            <CalendarDays :size="18" aria-hidden="true" />
            日曆
          </button>
        </div>
        <div v-if="calendarOpen" class="calendar-popover">
          <label for="filter-date">選擇日期</label>
          <input id="filter-date" type="date" :value="props.customDate ?? ''" @change="chooseCustomDate" />
          <small>選擇後會顯示該日期的活動。</small>
        </div>
      </div>

      <div class="filter-group">
        <div class="filter-group__heading">
          <h2>想做什麼活動？</h2>
        </div>
        <div class="choice-grid choice-grid--types" role="group" aria-label="活動類型">
          <button
            class="choice-button"
            :class="{ 'is-selected': props.interest === '全部' }"
            type="button"
            :aria-pressed="props.interest === '全部'"
            @click="emit('update:interest', '全部')"
          >
            全部
          </button>
          <button
            v-for="type in quickTypes"
            :key="type"
            class="choice-button"
            :class="{ 'is-selected': props.interest === type }"
            type="button"
            :aria-pressed="props.interest === type"
            @click="emit('update:interest', type)"
          >
            {{ type }}
          </button>
        </div>
        <button class="text-link" type="button">查看全部 15 種活動 <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </section>
</template>
