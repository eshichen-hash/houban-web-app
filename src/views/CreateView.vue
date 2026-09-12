<script setup lang="ts">
import { UsersRound } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onScopeDispose, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import VoiceCaptureCard from '@/components/create/voice/VoiceCaptureCard.vue'
import ActivityDraftEditor from '@/components/create/voice/ActivityDraftEditor.vue'
import DraftFieldSheet, { type DraftFieldValue } from '@/components/create/voice/DraftFieldSheet.vue'
import { useVoiceActivityDraft, DRAFT_STORAGE_KEY, readSavedDraft, saveDraft, type DraftField } from '@/composables/useVoiceActivityDraft'
import { useActivityRecorder } from '@/composables/useActivityRecorder'
import { useLiveActivityVoice } from '@/composables/useLiveActivityVoice'
import { useAppState } from '@/composables/useAppState'
import { initLiff, requireVerifiedLineToken, useLiff } from '@/services/liffService'
import { processActivityAudio, processActivityTranscript, VoiceServiceError } from '@/services/voiceDraftService'
import { activityPreset, uploadActivityImage } from '@/services/activityImageService'
import { triggerVoiceFeedback } from '@/services/voiceFeedback'
import type { SelectedParkResult } from '@/types/places'
import '@/styles/voice-create.css'

const router = useRouter(), { createEvent } = useAppState(), { liffState: liff } = useLiff()
const draft = useVoiceActivityDraft()
const mode = shallowRef<'voice' | 'draft'>('voice'), processing = shallowRef(false), authorizing = shallowRef(false)
const error = shallowRef(''), uploadError = shallowRef(''), saveNote = shallowRef('草稿僅儲存在此裝置，24 小時後自動失效。')
const uploading = shallowRef(false), saving = shallowRef(false), sheet = shallowRef<DraftField | null>(null), sheetError = shallowRef('')
const saved = shallowRef<unknown | null>(null), owner = shallowRef('guest')
const confirmRerecord = shallowRef(false)
const voiceNotice = shallowRef('')
const feedbackPulse = shallowRef<'' | 'start' | 'stop' | 'cancel'>('')
let mounted = true, controller: AbortController | null = null, generation = 0, expiresAt = Date.now() + 86400000
let noticeTimer: ReturnType<typeof setTimeout> | undefined, feedbackTimer: ReturnType<typeof setTimeout> | undefined
const recorder = useActivityRecorder((audio) => { void process(audio) })
const live = useLiveActivityVoice((text) => { transcript.value = text; void process(text) })
const voiceEngine = shallowRef<'live' | 'recorded'>('live'), transcript = shallowRef('')
const voiceInput = computed(() => voiceEngine.value === 'live' ? live : recorder)
const errorCode = shallowRef('')
const retryable = computed(() => !['VOICE_BILLING_REQUIRED','VOICE_CONFIGURATION_ERROR','VOICE_DAILY_LIMIT'].includes(errorCode.value || live.errorCode.value))
const audioLevel = computed(() => voiceEngine.value === 'live' ? live.level.value : voiceInput.value.state.value === 'recording' ? 0.24 : 0)
watch(live.transcript, (text) => { transcript.value = text })
const image = computed(() => draft.form.image || activityPreset(draft.form.type))

function showVoiceNotice(message: string) {
  clearTimeout(noticeTimer)
  voiceNotice.value = message
  noticeTimer = setTimeout(() => { voiceNotice.value = '' }, 2800)
}
function showFeedbackPulse(kind: 'start' | 'stop' | 'cancel') {
  clearTimeout(feedbackTimer)
  feedbackPulse.value = kind
  feedbackTimer = setTimeout(() => { feedbackPulse.value = '' }, 420)
}

async function start() {
  if (authorizing.value || processing.value) return
  clearTimeout(noticeTimer); error.value = ''; errorCode.value = ''; voiceNotice.value = ''
  showFeedbackPulse('start')
  void triggerVoiceFeedback('start')
  voiceEngine.value = live.supported() ? 'live' : 'recorded'
  if (!voiceInput.value.supported()) { await voiceInput.value.start(); return }
  const current = ++generation
  authorizing.value = true
  try { await requireVerifiedLineToken(); if (mounted && current === generation) { transcript.value = ''; await voiceInput.value.start() } }
  catch (err) { if (mounted && current === generation) error.value = err instanceof Error ? err.message : '請先登入 LINE 後開始錄音。' }
  finally { if (mounted) authorizing.value = false }
}
async function stopVoice() {
  if (voiceInput.value.state.value !== 'recording') return
  showFeedbackPulse('stop')
  void triggerVoiceFeedback('stop')
  await voiceInput.value.stop()
}
async function process(input: Blob | string) {
  if (processing.value) return
  controller = new AbortController(); const current = ++generation; processing.value = true; error.value = ''
  try {
    const result = typeof input === 'string' ? await processActivityTranscript(input, controller.signal) : await processActivityAudio(input, controller.signal)
    if (!mounted || current !== generation) return
    draft.applyExtraction(result.extraction); recorder.clearAudio(); expiresAt = Date.now() + 86400000
    mode.value = 'draft'; persist(); await nextTick(); document.getElementById('draft-title')?.scrollIntoView({ block: 'start' })
  } catch (err) {
    if (mounted && current === generation && err instanceof VoiceServiceError) {
      errorCode.value = err.code
      if (err.transcript) transcript.value = err.transcript
    }
    if (mounted && current === generation) error.value = err instanceof Error && err.name !== 'AbortError' ? err.message : '語音整理逾時，請重試。'
  } finally { if (mounted && current === generation) processing.value = false }
}
function cancelRecording() { ++generation; controller?.abort(); recorder.cancel(); live.cancel(); transcript.value = ''; processing.value = false; authorizing.value = false; error.value = ''; errorCode.value = '' }
function cancelVoice() {
  const wasProcessing = processing.value
  showFeedbackPulse('cancel')
  if (!wasProcessing) cancelRecording()
  else { ++generation; controller?.abort(); processing.value = false; error.value = ''; errorCode.value = '' }
  void triggerVoiceFeedback('cancel')
  showVoiceNotice(wasProcessing ? '已取消整理，辨識文字仍保留。' : '已取消錄音，可重新開始。')
}
function openText() { const text = transcript.value; cancelRecording(); draft.blank(); if (text.trim()) draft.updateIntro(text.trim()); expiresAt = Date.now() + 86400000; mode.value = 'draft'; persist() }
function retryVoice() { if (transcript.value.trim()) void process(transcript.value); else if (recorder.audio.value) void process(recorder.audio.value) }
function openSheet(field: DraftField, message = '') { sheetError.value = message; sheet.value = field }
function applyField(value: DraftFieldValue, place: SelectedParkResult | null) {
  const field = sheet.value
  if (!field) return
  if (field === 'type') draft.form.type = value.type
  if (field === 'date') draft.form.isoDate = value.isoDate
  if (field === 'time') { draft.form.time = value.time; draft.form.endTime = value.endTime }
  if (field === 'park' && place) draft.confirmPark(place)
  if (field === 'meeting') { draft.form.meeting = value.meeting.trim(); draft.meetingConfirmed.value = true }
  if (field === 'spots') draft.form.spots = value.spots
  if (field === 'cost') { draft.form.cost = value.cost; draft.form.costAmount = value.cost === '免費' ? 0 : value.costAmount }
  if (field === 'items') draft.form.items = value.items.trim()
  if (field === 'copy') { draft.updateName(value.name.trim()); draft.updateIntro(value.intro.trim()) }
  draft.status[field] = '已確認'; sheet.value = null; error.value = ''; persist()
}
function persist() {
  if (mode.value !== 'draft' || saving.value || Date.now() >= expiresAt) return
  const stored = saveDraft(localStorage, owner.value, draft.snapshot(), expiresAt)
  saveNote.value = stored ? '草稿僅儲存在此裝置，24 小時後自動失效。' : '此瀏覽器無法儲存草稿，離開前請完成建立。'
}
watch(() => draft.snapshot(), persist, { deep: true })
async function upload(file: File) {
  if (uploading.value || saving.value) return
  uploading.value = true; uploadError.value = ''; const current = generation
  try { const url = await uploadActivityImage(file); if (mounted && current === generation) { draft.form.image = url; draft.imageSource.value = 'upload'; persist() } }
  catch (err) { if (mounted) uploadError.value = err instanceof Error ? err.message : '圖片上傳失敗，請重試。' }
  finally { if (mounted) uploading.value = false }
}
function rerecord() {
  confirmRerecord.value = false; cancelRecording(); draft.blank(); saved.value = null; localStorage.removeItem(DRAFT_STORAGE_KEY); mode.value = 'voice'
}
function resume() {
  if (draft.restore(saved.value)) {
    try { expiresAt = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}').expiresAt || Date.now() + 86400000 } catch { expiresAt = Date.now() + 86400000 }
    mode.value = 'draft'; saved.value = null; persist()
  } else { saved.value = null; localStorage.removeItem(DRAFT_STORAGE_KEY); error.value = '舊草稿格式已更新，請重新錄音。' }
}
async function submit() {
  if (saving.value || uploading.value) return
  error.value = ''; const issue = draft.firstIssue()
  if (issue) { openSheet(issue, draft.fieldError(issue)); return }
  persist(); saving.value = true
  try {
    const input = draft.buildEventInput()
    input.image = image.value; input.imageAlt = draft.imageSource.value === 'upload' ? '主辦人上傳的活動圖片' : `${draft.form.type}活動系統配圖（示意）`
    if (!draft.form.items.trim()) input.items = '無特別要求'
    await createEvent(input, draft.creationId.value)
    localStorage.removeItem(DRAFT_STORAGE_KEY); recorder.clearAudio(); saved.value = null
    await router.push('/manage')
  } catch (err) { error.value = err instanceof Error ? err.message : '尚未完成建立，草稿已保留，請重試。' }
  finally { if (mounted) saving.value = false }
}
onMounted(async () => {
  await initLiff()
  if (!mounted) return
  if (liff.profile?.userId) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(liff.profile.userId))
    if (!mounted) return
    owner.value = Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, '0')).join('')
  }
  saved.value = readSavedDraft(localStorage, owner.value) || readSavedDraft(localStorage, 'guest')
})
const expiresTimer = setInterval(() => {
  if (mode.value === 'draft' && Date.now() >= expiresAt && !saving.value) {
    localStorage.removeItem(DRAFT_STORAGE_KEY); saveNote.value = '這份草稿已不再儲存在此裝置；你仍可在本頁完成建立。'
  }
}, 60000)
onScopeDispose(() => { mounted = false; ++generation; controller?.abort(); clearInterval(expiresTimer); clearTimeout(noticeTimer); clearTimeout(feedbackTimer) })
</script>

<template>
  <div id="main-content" class="page-view create-view voice-create-view">
    <header class="topbar topbar--glass topbar--brand"><BrandLogo /><button class="icon-button" type="button" aria-label="活動管理" @click="router.push('/manage')"><UsersRound :size="22" aria-hidden="true" /></button></header>
    <main class="page-content create-content vd-page" aria-labelledby="create-title">
      <div class="vd-page-heading"><span class="vd-eyebrow">一起在公園相聚</span><h1 id="create-title">{{ mode === 'voice' ? '用說的，發起一場活動' : '確認你的活動草稿' }}</h1><p>{{ mode === 'voice' ? '不用一次說完整，系統會整理成可修改的草稿。' : '把細節確認好，就能邀請大家一起出門。' }}</p></div>
      <section v-if="saved && mode === 'voice'" class="vd-resume" aria-labelledby="resume-title"><h2 id="resume-title">此裝置有一份未完成草稿</h2><p>可以接著修改，或捨棄後重新開始。</p><div><button type="button" class="vd-primary" @click="resume">繼續草稿</button><button type="button" class="vd-secondary" @click="rerecord">捨棄草稿</button></div></section>
      <VoiceCaptureCard v-if="mode === 'voice'" :state="voiceInput.state.value" :elapsed="voiceInput.elapsed.value" :error="error || voiceInput.error.value" :unavailable="voiceInput.unavailable.value" :processing="processing" :can-retry="retryable && (recorder.canRetry.value || transcript.trim().length > 1)" :authorizing="authorizing" :transcript="transcript" :live-status="voiceEngine === 'live' ? live.liveStatus.value : 'unavailable'" :audio-level="audioLevel" :notice="voiceNotice" :feedback="feedbackPulse" @update-transcript="transcript = $event" @start="start" @stop="stopVoice" @cancel="cancelVoice" @retry="retryVoice" @text="openText" />
      <ActivityDraftEditor v-else :rows="draft.rows.value" :image="image" :image-source="draft.imageSource.value" :intro="draft.form.intro" :title="draft.displayName.value" :uploading="uploading" :saving="saving" :error="error" :upload-error="uploadError" :save-note="saveNote" @edit="openSheet" @upload="upload" @preset="draft.form.image = ''; draft.imageSource.value = 'preset'" @submit="submit" @rerecord="confirmRerecord = true" />
      <div v-if="confirmRerecord" class="vd-rerecord-confirm" role="alert"><p>重新錄音會取代目前草稿。要繼續嗎？</p><button class="vd-secondary" type="button" @click="confirmRerecord = false">保留草稿</button><button class="vd-primary" type="button" @click="rerecord">捨棄並重新錄音</button></div>
    </main>
    <DraftFieldSheet v-if="sheet" :key="sheet" :field="sheet" :value="draft.form" :park="draft.selectedPark.value" :park-query="draft.parkQuery.value" :generated-name="draft.generatedName.value" :generated-intro="draft.generatedIntro.value" :initial-error="sheetError" @close="sheet = null" @apply="applyField" @open-park="openSheet('park')" />
  </div>
</template>
