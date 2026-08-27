<script setup lang="ts">
import { CalendarDays, ChevronRight, Clock3, MapPin, Minus, Plus, Sparkles, UsersRound } from 'lucide-vue-next'
import { computed, reactive, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import { activityTypes, parks, type Cost, type Difficulty, type EventType } from '@/data/events'
import { useAppState } from '@/composables/useAppState'

const router = useRouter()
const { createEvent } = useAppState()

const showAllTypes = shallowRef(false)
const nameTouched = shallowRef(false)
const statusMessage = shallowRef('')
const dateIndex = shallowRef(0)
const timeIndex = shallowRef(0)
const parkIndex = shallowRef(0)
const meetingIndex = shallowRef(0)

const dates = ['今天・8 月 27 日', '明天・8 月 28 日', '本週・8 月 31 日']
const isoDates = ['2026-08-27', '2026-08-28', '2026-08-31']
const times = ['上午 9:00', '上午 10:30', '下午 2:00']
const meetings = ['公園入口', '大樹下長椅旁']

const form = reactive({
  type: '' as EventType | '',
  name: '',
  spots: 12,
  difficulty: '輕鬆' as Difficulty,
  cost: '免費' as Cost,
  intro: '',
})

const visibleTypes = computed(() => showAllTypes.value ? activityTypes : activityTypes.slice(0, 6))
const selectedPark = computed(() => parks[parkIndex.value])
const dateLabel = computed(() => dates[dateIndex.value])
const timeLabel = computed(() => times[timeIndex.value])
const meetingLabel = computed(() => meetings[meetingIndex.value])
const generatedName = computed(() => form.type ? `${selectedPark.value.name}・${form.type === '健走' ? '晨間健走' : `一起${form.type}`}` : '')
const generatedIntro = computed(() => form.type ? `在${selectedPark.value.name}進行${form.difficulty}${form.type}，歡迎一起參加。` : '')
const displayName = computed(() => form.name || generatedName.value)
const canCreate = computed(() => Boolean(form.type && displayName.value))

watch(() => form.type, () => {
  if (!nameTouched.value) form.name = generatedName.value
  statusMessage.value = form.type ? `已選 ${form.type}` : '請選擇一種活動類型'
})

watch([selectedPark, () => form.type, () => form.difficulty], () => {
  if (!nameTouched.value) form.name = generatedName.value
})

function setName(value: string) {
  nameTouched.value = true
  form.name = value
}

function cycleDate() {
  dateIndex.value = (dateIndex.value + 1) % dates.length
}

function cycleTime() {
  timeIndex.value = (timeIndex.value + 1) % times.length
}

function cyclePark() {
  parkIndex.value = (parkIndex.value + 1) % parks.length
  if (!nameTouched.value) form.name = generatedName.value
}

function cycleMeeting() {
  meetingIndex.value = (meetingIndex.value + 1) % meetings.length
}

function changeSpots(delta: number) {
  form.spots = Math.min(50, Math.max(3, form.spots + delta))
}

function normaliseSpots() {
  form.spots = Math.min(50, Math.max(3, Number(form.spots) || 3))
}

function submit() {
  if (!canCreate.value) {
    statusMessage.value = '請先選擇一種活動類型'
    return
  }
  const created = createEvent({
    title: displayName.value,
    type: form.type as EventType,
    difficulty: form.difficulty,
    dateKey: dateIndex.value === 0 ? 'today' : dateIndex.value === 1 ? 'tomorrow' : 'week',
    isoDate: isoDates[dateIndex.value],
    dateLabel: dateLabel.value,
    time: timeLabel.value,
    park: selectedPark.value,
    spots: form.spots,
    maxSpots: form.spots,
    cost: form.cost,
    audience: form.difficulty === '輕鬆' ? '可依需要休息' : '適合喜歡持續活動者',
    description: form.intro || generatedIntro.value,
    items: '飲用水、帽子（可選）',
    image: '/create-bench-grass-v1.png',
    imageAlt: '公園長椅與小草插圖',
  })
  statusMessage.value = `示意：已建立「${created.title}」`
  router.push('/manage')
}
</script>

<template>
  <div class="page-view create-view" id="main-content">
    <header class="topbar topbar--glass topbar--brand">
      <BrandLogo />
      <button class="icon-button" type="button" aria-label="活動管理" @click="router.push('/manage')"><UsersRound :size="22" aria-hidden="true" /></button>
    </header>

    <main class="page-content create-content" aria-labelledby="create-title">
      <div class="eyebrow">一起在公園相聚</div>
      <h1 id="create-title">快速建立活動</h1>

      <section class="intro-card accordion-card">
        <div class="intro-card__icon"><Sparkles :size="22" aria-hidden="true" /></div>
        <div><strong>把想做的事，變成一場公園邀請</strong><p>只要 3 步，就能邀請朋友參加。</p></div>
        <button class="text-link intro-card__link" type="button">查看怎麼發起 <span aria-hidden="true">⌄</span></button>
      </section>

      <section class="form-section" aria-labelledby="step-one-title">
        <div class="step-heading"><div><div class="eyebrow">第一步</div><h2 id="step-one-title">想發起什麼活動？</h2></div><strong>請選 1 種</strong></div>
        <div class="type-grid" role="radiogroup" aria-label="請選擇 1 種活動類型">
          <button
            v-for="type in visibleTypes"
            :key="type"
            class="type-choice"
            :class="{ 'is-selected': form.type === type }"
            type="button"
            role="radio"
            :aria-checked="form.type === type"
            @click="form.type = type"
          >
            <span v-if="form.type === type" aria-hidden="true">✓ </span>{{ type }}
          </button>
        </div>
        <button class="full-width-choice" type="button" @click="showAllTypes = !showAllTypes">{{ showAllTypes ? '收起活動類型' : '查看全部 15 種活動' }} <ChevronRight :size="18" aria-hidden="true" /></button>
      </section>

      <section class="form-section" aria-labelledby="step-two-title">
        <div class="step-heading"><div><div class="eyebrow">第二步</div><h2 id="step-two-title">安排行程</h2></div><span>日期、時間與地點</span></div>
        <div class="schedule-grid">
          <button class="schedule-field" type="button" aria-label="選擇日期" @click="cycleDate"><CalendarDays :size="22" aria-hidden="true" /><span><small>日期</small><strong>{{ dateLabel }}</strong></span><ChevronRight :size="19" aria-hidden="true" /></button>
          <button class="schedule-field" type="button" aria-label="選擇時間" @click="cycleTime"><Clock3 :size="22" aria-hidden="true" /><span><small>時間</small><strong>{{ timeLabel }}</strong></span><ChevronRight :size="19" aria-hidden="true" /></button>
          <button class="schedule-field schedule-field--wide" type="button" aria-label="選擇公園" @click="cyclePark"><MapPin :size="22" aria-hidden="true" /><span><small>公園</small><strong>{{ selectedPark.name }}</strong><em>{{ selectedPark.district }}</em></span><ChevronRight :size="19" aria-hidden="true" /></button>
          <button class="schedule-field schedule-field--wide" type="button" aria-label="選擇集合地點" @click="cycleMeeting"><UsersRound :size="22" aria-hidden="true" /><span><small>集合地點</small><strong>{{ meetingLabel }}</strong></span><ChevronRight :size="19" aria-hidden="true" /></button>
        </div>
        <div class="name-field-group">
          <div class="field-heading"><strong>活動名稱</strong><span>{{ form.type ? '依行程自動產生' : '尚待選擇活動' }}</span></div>
          <input id="event-name" :value="displayName" type="text" aria-label="活動名稱" placeholder="選擇活動後自動產生" @input="setName(($event.target as HTMLInputElement).value)" />
          <button v-if="form.type" class="button button--secondary name-edit" type="button" @click="nameTouched = true">編輯</button>
        </div>
      </section>

      <section class="form-section" aria-labelledby="step-three-title">
        <div class="step-heading"><div><div class="eyebrow">第三步</div><h2 id="step-three-title">設定參加資訊</h2></div><span>可再調整</span></div>
        <div class="field-heading"><strong>活動名額</strong><span>3–50 人</span></div>
        <div class="stepper-field">
          <button class="icon-button" type="button" aria-label="減少活動名額" @click="changeSpots(-1)"><Minus :size="20" aria-hidden="true" /></button>
          <label><input v-model.number="form.spots" type="number" min="3" max="50" aria-label="活動名額" @blur="normaliseSpots" /><span>人</span></label>
          <button class="icon-button" type="button" aria-label="增加活動名額" @click="changeSpots(1)"><Plus :size="20" aria-hidden="true" /></button>
        </div>
        <p class="helper-text">可直接輸入，或使用加減按鈕。</p>

        <div class="field-heading"><strong>體力需求</strong><span>依活動步調選擇</span></div>
        <div class="difficulty-grid" role="radiogroup" aria-label="體力需求">
          <button v-for="difficulty in (['輕鬆', '一般'] as Difficulty[])" :key="difficulty" class="difficulty-choice" :class="{ 'is-selected': form.difficulty === difficulty }" type="button" role="radio" :aria-checked="form.difficulty === difficulty" @click="form.difficulty = difficulty">
            <strong>{{ form.difficulty === difficulty ? '✓ ' : '' }}{{ difficulty }}</strong><span>{{ difficulty === '輕鬆' ? '步調較慢，可依需要休息' : '需要持續活動一段時間' }}</span>
          </button>
        </div>

        <div class="field-heading"><strong>費用</strong><span>參加者會看到</span></div>
        <div class="segmented-control" role="group" aria-label="活動費用">
          <button type="button" :class="{ 'is-selected': form.cost === '免費' }" :aria-pressed="form.cost === '免費'" @click="form.cost = '免費'">免費</button>
          <button type="button" :class="{ 'is-selected': form.cost === '付費' }" :aria-pressed="form.cost === '付費'" @click="form.cost = '付費'">付費</button>
        </div>

        <div class="name-field-group name-field-group--intro">
          <div class="field-heading"><strong>活動介紹</strong><span>{{ form.type ? '依選擇自動產生' : '尚待選擇活動' }}</span></div>
          <textarea v-model="form.intro" rows="3" aria-label="活動介紹" :placeholder="generatedIntro || '選定活動類型後，系統會依目前行程自動產生活動介紹。'"></textarea>
        </div>
      </section>

      <section class="summary-card create-summary" aria-labelledby="create-summary-title">
        <h2 id="create-summary-title">活動摘要</h2>
        <strong>{{ displayName || '尚未選擇活動類型' }}</strong>
        <span>{{ dateLabel }}・{{ timeLabel }}</span>
        <strong>{{ selectedPark.name }}</strong>
        <span>{{ meetingLabel }}・{{ form.spots }} 人・{{ form.difficulty }}・{{ form.cost }}</span>
      </section>
      <button class="button button--primary button--full create-submit" type="button" :disabled="!canCreate" @click="submit">建立活動 <span aria-hidden="true">→</span></button>
      <p class="create-note">確認摘要後直接建立，之後仍可在活動管理中編輯。</p>
    </main>
    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </div>
</template>
