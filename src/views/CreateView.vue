<script setup lang="ts">
import { ChevronDown, ChevronRight, Minus, Plus, Sparkles, UsersRound } from 'lucide-vue-next'
import { computed, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdvancedActivitySettings from '@/components/create/AdvancedActivitySettings.vue'
import CreateScheduleSelector from '@/components/create/CreateScheduleSelector.vue'
import EditableActivityIntro from '@/components/create/EditableActivityIntro.vue'
import EditableActivityName from '@/components/create/EditableActivityName.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { activityTypes, type Difficulty } from '@/data/events'
import { useAppState } from '@/composables/useAppState'
import { useCreateEventDraft } from '@/composables/useCreateEventDraft'

const router = useRouter()
const { createEvent } = useAppState()
const {
  form,
  parks,
  todayIso,
  tomorrowIso,
  selectedPark,
  dateLabel,
  timeLabel,
  generatedName,
  generatedIntro,
  displayName,
  canCreate,
  nameIsCustom,
  introIsCustom,
  updateName,
  resetGeneratedName,
  updateIntro,
  resetGeneratedIntro,
  selectPark,
  changeSpots,
  normaliseSpots,
  buildEventInput,
} = useCreateEventDraft()

const showAllTypes = shallowRef(false)
const guideOpen = shallowRef(false)
const statusMessage = shallowRef('')

const visibleTypes = computed(() => showAllTypes.value ? activityTypes : activityTypes.slice(0, 6))

watch(() => form.type, () => {
  statusMessage.value = form.type ? `已選 ${form.type}` : '請選擇一種活動類型'
})

function submit() {
  if (!canCreate.value) {
    statusMessage.value = '請先選擇一種活動類型'
    return
  }
  const created = createEvent(buildEventInput())
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

      <section class="intro-card accordion-card" :class="{ 'is-open': guideOpen }">
        <div class="intro-card__icon"><Sparkles :size="22" aria-hidden="true" /></div>
        <div><strong>把想做的事，變成一場公園邀請</strong><p>只要 3 步，就能邀請朋友參加。</p></div>
        <div v-show="guideOpen" id="create-guide-details" class="intro-card__details">
          <ol>
            <li><span>1</span>選擇想一起做的活動</li>
            <li><span>2</span>確認公園、日期、時間與集合地點</li>
            <li><span>3</span>設定名額、體力需求與參加提醒</li>
          </ol>
        </div>
        <button class="text-link intro-card__link" type="button" aria-controls="create-guide-details" :aria-expanded="guideOpen" @click="guideOpen = !guideOpen">{{ guideOpen ? '收起說明' : '查看怎麼發起' }} <ChevronDown :size="18" aria-hidden="true" /></button>
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
        <CreateScheduleSelector
          :iso-date="form.isoDate"
          :time="form.time"
          :end-time="form.endTime"
          :park-id="form.parkId"
          :meeting="form.meeting"
          :parks="parks"
          :today-iso="todayIso"
          :tomorrow-iso="tomorrowIso"
          :date-label="dateLabel"
          :time-label="timeLabel"
          @update:iso-date="form.isoDate = $event"
          @update:time="form.time = $event"
          @update:end-time="form.endTime = $event"
          @update:park-id="selectPark"
          @update:meeting="form.meeting = $event"
        />
        <EditableActivityName
          :model-value="form.name"
          :auto-name="generatedName"
          :disabled="!form.type"
          :is-custom="nameIsCustom"
          @update:model-value="updateName"
          @reset="resetGeneratedName"
        />
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

        <EditableActivityIntro
          :model-value="form.intro"
          :auto-intro="generatedIntro"
          :disabled="!form.type"
          :is-custom="introIsCustom"
          @update:model-value="updateIntro"
          @reset="resetGeneratedIntro"
        />
      </section>

      <AdvancedActivitySettings v-model:audience="form.audience" v-model:items="form.items" v-model:image="form.image" />

      <section class="summary-card create-summary" aria-labelledby="create-summary-title">
        <h2 id="create-summary-title">活動摘要</h2>
        <strong>{{ displayName || '尚未選擇活動類型' }}</strong>
        <span>{{ dateLabel }}・{{ timeLabel }}</span>
        <strong>{{ selectedPark?.name }}</strong>
        <span>{{ form.meeting }}・{{ form.spots }} 人・{{ form.difficulty }}・{{ form.cost }}</span>
      </section>
      <button class="button button--primary button--full create-submit" type="button" :disabled="!canCreate" @click="submit">建立活動 <span aria-hidden="true">→</span></button>
      <p class="create-note">確認摘要後直接建立，之後仍可在活動管理中編輯。</p>
    </main>
    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </div>
</template>
