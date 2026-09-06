<script setup lang="ts">
import { ChevronDown, ChevronRight, Minus, Plus, Sparkles, UsersRound, X } from 'lucide-vue-next'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdvancedActivitySettings from '@/components/create/AdvancedActivitySettings.vue'
import CreateScheduleSelector from '@/components/create/CreateScheduleSelector.vue'
import EditableActivityIntro from '@/components/create/EditableActivityIntro.vue'
import EditableActivityName from '@/components/create/EditableActivityName.vue'
import BrandLogo from '@/components/BrandLogo.vue'
import { fullActivityTypes, activityTypeGroups, type Difficulty, type EventType } from '@/data/events'
import { useAppState } from '@/composables/useAppState'
import { useCreateEventDraft } from '@/composables/useCreateEventDraft'

const router = useRouter()
const { createEvent } = useAppState()
const {
  form,
  todayIso,
  selectedPark,
  dateLabel,
  timeLabel,
  generatedName,
  generatedIntro,
  displayName,
  canCreate,
  validationErrors,
  validate,
  nameIsCustom,
  introIsCustom,
  updateName,
  resetGeneratedName,
  updateIntro,
  resetGeneratedIntro,
  selectPark,
  selectPlace,
  changeSpots,
  normaliseSpots,
  buildEventInput,
} = useCreateEventDraft()

const showTypeSheet = shallowRef(false)
const guideOpen = shallowRef(false)
const statusMessage = shallowRef('')
const isSubmitting = shallowRef(false)
const submitAttempted = shallowRef(false)
const saveError = shallowRef('')
const feedbackRef = useTemplateRef<HTMLElement>('feedbackRef')
const creationId = `created-${crypto.randomUUID()}`
const fieldErrors = computed(() => submitAttempted.value ? validationErrors.value : {})
const fieldIds = {
  type: 'create-type-choice', isoDate: 'create-direct-date', time: 'create-custom-start-time',
  endTime: 'create-custom-end-time', park: 'pac-input', meeting: 'create-meeting-button', spots: 'create-spots',
} as const

function focusField(field: keyof typeof fieldIds) {
  const control = document.getElementById(fieldIds[field])
  control?.focus({ preventScroll: true })
  control?.scrollIntoView({ block: 'center' })
}

const featuredTypes = computed(() => {
  const featured = fullActivityTypes.filter((t) => t.featured).slice(0, 6).map((t) => t.name)
  if (form.type && !featured.includes(form.type as EventType)) {
    return [form.type as EventType, ...featured.slice(0, 5)]
  }
  return featured
})

function selectTypeAndCloseSheet(type: EventType) {
  form.type = type
  showTypeSheet.value = false
}

watch(() => form.type, () => {
  statusMessage.value = form.type ? `已選 ${form.type}` : '請選擇一種活動類型'
})

async function submit() {
  if (isSubmitting.value) return
  submitAttempted.value = true
  saveError.value = ''
  if (Object.keys(validate()).length) {
    await nextTick()
    feedbackRef.value?.focus()
    return
  }
  isSubmitting.value = true
  try {
    const created = await createEvent(buildEventInput(), creationId)
    statusMessage.value = `已建立「${created.title}」`
    await router.push('/manage')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : '活動未能儲存，請稍後重試。表單內容已保留。'
  } finally {
    isSubmitting.value = false
    if (saveError.value) { await nextTick(); feedbackRef.value?.focus() }
  }
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

      <section v-if="saveError || (submitAttempted && !canCreate)" ref="feedbackRef" class="create-feedback" role="alert" tabindex="-1" aria-labelledby="create-feedback-title">
        <h2 id="create-feedback-title">{{ saveError ? '活動尚未完成建立' : '請確認以下欄位' }}</h2>
        <p v-if="saveError">{{ saveError }}</p>
        <ul v-else><li v-for="(message, field) in fieldErrors" :key="field"><a :href="`#${fieldIds[field]}`" @click.prevent="focusField(field)">{{ message }}</a></li></ul>
      </section>

      <fieldset class="create-fields" :disabled="isSubmitting" :aria-busy="isSubmitting">
      <legend class="sr-only">建立活動資料</legend>
      <section class="form-section form-section--transparent-bg" aria-labelledby="step-one-title">
        <div class="step-heading">
          <div>
            <div class="eyebrow">第一步</div>
            <h2 id="step-one-title">想發起什麼活動？</h2>
          </div>
          <span class="activity-type-status" :class="{ 'is-selected': form.type }">
            <span v-if="form.type">✓ 已選 {{ form.type }}</span>
            <span v-else>請選 1 種</span>
          </span>
        </div>
        <div id="create-type-choice" class="activity-type-grid" role="radiogroup" tabindex="-1" aria-label="請選擇 1 種活動類型" :aria-describedby="fieldErrors.type ? 'create-type-error' : undefined">
          <button
            v-for="type in featuredTypes"
            :key="type"
            class="activity-type-btn"
            :class="{ 'is-selected': form.type === type }"
            type="button"
            role="radio"
            :aria-checked="form.type === type"
            @click="form.type = type"
          >
            <span v-if="form.type === type" class="check-mark" aria-hidden="true">✓</span>
            <span>{{ type }}</span>
          </button>
        </div>
        <p v-if="fieldErrors.type" id="create-type-error" class="create-field-error">{{ fieldErrors.type }}</p>
        <button class="full-width-choice full-width-choice--types" type="button" aria-label="查看全部 15 種活動" @click="showTypeSheet = true">
          <span>查看全部 15 種活動</span>
          <ChevronRight :size="18" aria-hidden="true" />
        </button>
      </section>

      <!-- 底部抽屜彈窗 (Bottom Sheet): 全部 15 種活動 -->
      <Teleport to="body">
        <div v-if="showTypeSheet" class="overlay" @click.self="showTypeSheet = false">
          <section class="sheet activity-type-sheet" role="dialog" aria-modal="true" aria-labelledby="activity-type-sheet-title" aria-describedby="activity-type-sheet-desc">
            <div class="sheet-handle"></div>
            <header class="sheet-header">
              <div>
                <span class="eyebrow">15 種活動</span>
                <h2 id="activity-type-sheet-title">選擇活動類型</h2>
              </div>
              <button class="icon-button" type="button" aria-label="關閉活動類型選擇" @click="showTypeSheet = false">
                <X :size="20" aria-hidden="true" />
              </button>
            </header>
            <div class="sheet-body">
              <p class="muted activity-type-sheet-intro" id="activity-type-sheet-desc">依活動方式分組，選擇 1 種後會自動帶回表單。</p>
              <div class="activity-type-groups">
                <fieldset v-for="group in activityTypeGroups" :key="group" class="activity-type-group">
                  <legend>{{ group }}</legend>
                  <div class="activity-type-sheet-grid">
                    <button
                      v-for="item in fullActivityTypes.filter((t) => t.group === group)"
                      :key="item.key"
                      class="activity-type-btn"
                      :class="{ 'is-selected': form.type === item.name }"
                      type="button"
                      @click="selectTypeAndCloseSheet(item.name)"
                    >
                      <span v-if="form.type === item.name" class="check-mark" aria-hidden="true">✓</span>
                      <span>{{ item.name }}</span>
                    </button>
                  </div>
                </fieldset>
              </div>
            </div>
          </section>
        </div>
      </Teleport>

      <section class="form-section" aria-labelledby="step-two-title">
        <div class="step-heading"><div><div class="eyebrow">第二步</div><h2 id="step-two-title">安排行程</h2></div><span>日期、時間與地點</span></div>
        <CreateScheduleSelector
          :iso-date="form.isoDate"
          :time="form.time"
          :end-time="form.endTime"
          :selected-park="selectedPark"
          :errors="fieldErrors"
          :meeting="form.meeting"
          :today-iso="todayIso"
          @update:iso-date="form.isoDate = $event"
          @update:time="form.time = $event"
          @update:end-time="form.endTime = $event"
          @select-place="selectPlace"
          @clear-park="selectPark('')"
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
          <label><input id="create-spots" v-model.number="form.spots" name="event-spots" type="number" min="3" max="50" aria-label="活動名額" :aria-invalid="Boolean(fieldErrors.spots)" :aria-describedby="fieldErrors.spots ? 'create-spots-error' : undefined" @blur="normaliseSpots" /><span>人</span></label>
          <button class="icon-button" type="button" aria-label="增加活動名額" @click="changeSpots(1)"><Plus :size="20" aria-hidden="true" /></button>
        </div>
        <p v-if="fieldErrors.spots" id="create-spots-error" class="create-field-error">{{ fieldErrors.spots }}</p>
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
      </fieldset>

      <section class="summary-card create-summary" aria-labelledby="create-summary-title">
        <h2 id="create-summary-title">活動摘要</h2>
        <strong>{{ displayName || '尚未選擇活動類型' }}</strong>
        <span>{{ dateLabel }}・{{ timeLabel }}</span>
        <strong>{{ selectedPark?.name }}</strong>
        <span>{{ form.meeting }}・{{ form.spots }} 人・{{ form.difficulty }}・{{ form.cost }}</span>
      </section>
      <button class="button button--primary button--full create-submit" type="button" :disabled="isSubmitting" :aria-busy="isSubmitting" @click="submit">{{ isSubmitting ? '正在儲存活動…' : saveError ? '重試建立活動' : '建立活動' }} <span v-if="!isSubmitting" aria-hidden="true">→</span></button>
      <p class="create-note">確認摘要後直接建立，之後仍可在活動管理中編輯。</p>
    </main>
    <p class="sr-only" role="status" aria-live="polite">{{ statusMessage }}</p>
  </div>
</template>

<style scoped>
.create-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
.create-fields:disabled { opacity: .72; }
.create-feedback { margin-block: 20px; padding: 18px; border: 1px solid #c37165; border-radius: 18px; background: #fff5f0; color: #82352b; overflow-wrap: anywhere; scroll-margin-top: 110px; }
.create-feedback h2 { margin: 0 0 8px; font-size: 1.1rem; }
.create-feedback p, .create-feedback ul { margin: 0; }
.create-feedback a { color: inherit; text-decoration: underline; }
.create-field-error { margin: 8px 0; color: #9c332a; font-size: .9rem; }
</style>
