<script setup lang="ts">
import { CalendarClock, ChevronDown, CircleAlert, LoaderCircle, MapPin, Mic, RotateCcw, Shapes, ShieldCheck, Square } from 'lucide-vue-next'
import { computed, useTemplateRef, watch } from 'vue'

const props = withDefaults(defineProps<{
  state: string
  elapsed: number
  error: string
  unavailable: boolean
  processing: boolean
  canRetry: boolean
  authorizing: boolean
  transcript: string
  liveStatus: string
  audioLevel?: number
  notice?: string
  feedback?: 'start' | 'stop' | 'cancel' | ''
}>(), {
  audioLevel: 0,
  notice: '',
  feedback: '',
})

const emit = defineEmits<{
  start: []
  stop: []
  cancel: []
  retry: []
  text: []
  updateTranscript: [value: string]
}>()

const busy = computed(() => props.processing || props.authorizing || ['requesting', 'connecting', 'recording', 'stopping'].includes(props.state))
const waiting = computed(() => ['requesting', 'connecting', 'stopping'].includes(props.state))
const statusMessage = computed(() => {
  if (props.notice) return props.notice
  if (props.processing) return '正在整理你的活動草稿…'
  if (props.state === 'recording') return props.liveStatus === 'listening' ? '正在聽，文字會即時顯示' : '正在錄音，停止後會顯示文字'
  if (props.state === 'connecting') return '正在連接即時辨識…'
  if (props.state === 'stopping') return '正在完成最後一句辨識…'
  if (props.authorizing) return '正在確認 LINE 登入…'
  if (props.state === 'requesting') return '請允許使用麥克風'
  return '點一下麥克風，開始說明'
})
const recordingGuide = computed(() => props.transcript.trim()
  ? '如果方便，也可以補充集合地點、名額、費用或攜帶物品。'
  : '可以先從做什麼、什麼時候、在哪裡開始。')
const meterBars = computed(() => [0.46, 0.72, 1, 0.82, 0.58, 0.9, 0.52].map((weight) => {
  const level = Math.max(0, Math.min(1, props.audioLevel))
  return `scaleY(${(0.22 + level * weight * 0.78).toFixed(2)})`
}))
const transcriptInput = useTemplateRef<HTMLTextAreaElement>('transcriptInput')

watch(() => props.transcript, () => {
  if (busy.value && transcriptInput.value) transcriptInput.value.scrollTop = transcriptInput.value.scrollHeight
}, { flush: 'post' })
watch(() => props.state, (state, previous) => {
  if (state !== 'recording' || previous === 'recording') return
  requestAnimationFrame(() => {
    const input = transcriptInput.value
    if (!input) return
    input.scrollIntoView({ block: 'end', behavior: 'auto' })
    window.scrollBy({ top: 32, behavior: 'auto' })
  })
}, { flush: 'post' })
</script>

<template>
  <section class="vd-capture" :class="{ 'is-active': busy, 'is-feedback': feedback }" aria-labelledby="voice-invitation">
    <div class="vd-capture-intro">
      <h2 id="voice-invitation">用一句話說明活動</h2>
      <p v-if="!busy">先說「做什麼、什麼時候、在哪裡」，其他細節可在草稿補上。</p>
    </div>

    <ul v-if="!busy" class="vd-sentence-formula" aria-label="建議先說的三項資訊">
      <li><Shapes :size="20" aria-hidden="true" /><div><strong>做什麼</strong><small>活動類型</small></div></li>
      <li><CalendarClock :size="20" aria-hidden="true" /><div><strong>什麼時候</strong><small>日期與時間</small></div></li>
      <li><MapPin :size="20" aria-hidden="true" /><div><strong>在哪裡</strong><small>公園或地點</small></div></li>
    </ul>

    <div class="vd-recorder-status">
      <LoaderCircle v-if="processing" class="vd-processing-icon vd-spin" :size="48" aria-hidden="true" />
      <button
        v-else-if="state === 'recording'"
        class="vd-mic-button is-recording"
        type="button"
        aria-label="完成錄音，開始整理草稿"
        @click="emit('stop')"
      ><Square :size="30" fill="currentColor" aria-hidden="true" /></button>
      <button
        v-else
        class="vd-mic-button"
        type="button"
        :disabled="waiting || authorizing"
        aria-label="開始語音說明"
        @click="emit('start')"
      ><LoaderCircle v-if="waiting || authorizing" class="vd-spin" :size="32" aria-hidden="true" /><Mic v-else :size="34" aria-hidden="true" /></button>

      <div v-if="state === 'recording'" class="vd-audio-meter" aria-label="麥克風輸入音量" role="img">
        <span v-for="(transform, index) in meterBars" :key="index" :style="{ transform }" />
      </div>
      <strong class="vd-status-message" role="status" aria-live="polite" aria-atomic="true">{{ statusMessage }}</strong>

      <template v-if="processing">
        <span class="vd-muted">{{ transcript ? '已收到說明，正在整理日期、地點與活動細節' : '正在辨識錄音並整理活動細節' }}</span>
        <button class="vd-text-button" type="button" @click="emit('cancel')">取消整理</button>
      </template>
      <template v-else-if="state === 'recording'">
        <span :class="{ 'vd-warning-text': elapsed >= 75 }">{{ String(Math.floor(elapsed / 60)).padStart(2, '0') }}:{{ String(elapsed % 60).padStart(2, '0') }} / 01:30</span>
        <p class="vd-recording-guide">{{ recordingGuide }}</p>
        <p v-if="elapsed >= 75" class="vd-warning-text">剩下 {{ 90 - elapsed }} 秒，時間到會自動整理。</p>
        <button type="button" class="vd-text-button" @click="emit('cancel')">取消錄音</button>
      </template>
      <template v-else>
        <span class="vd-muted">最多 90 秒，不用一次說完整</span>
        <button v-if="waiting" class="vd-text-button" type="button" @click="emit('cancel')">取消</button>
      </template>
    </div>

    <div class="vd-transcript">
      <div class="vd-transcript-heading">
        <label for="voice-transcript">語音辨識文字</label>
        <span v-if="state === 'recording' && liveStatus === 'listening'" class="vd-live-badge"><span aria-hidden="true" />即時辨識中</span>
      </div>
      <textarea
        id="voice-transcript"
        ref="transcriptInput"
        class="vd-input"
        aria-label="語音辨識文字"
        aria-describedby="voice-transcript-hint"
        :value="transcript"
        :readonly="busy"
        rows="4"
        maxlength="5000"
        placeholder="例如：明天下午三點，在大安森林公園健走…"
        @input="emit('updateTranscript', ($event.target as HTMLTextAreaElement).value)"
      />
      <p id="voice-transcript-hint" class="vd-muted">{{ liveStatus === 'unavailable' ? '此瀏覽器使用錄音後辨識；文字不會在錄音中更新。' : busy ? '可以分句慢慢說，辨識文字會有短暫延遲。' : '辨識有誤可直接修改，再整理成草稿。' }}</p>
      <button v-if="transcript.trim().length > 1 && !busy && canRetry" class="vd-primary" type="button" @click="emit('retry')">整理成活動草稿</button>
    </div>

    <div v-if="error" class="vd-warning" role="alert">
      <p class="vd-inline"><CircleAlert :size="20" aria-hidden="true" />{{ error }}</p>
      <button v-if="canRetry && !busy && !transcript" class="vd-secondary" type="button" @click="emit('retry')"><RotateCcw :size="18" aria-hidden="true" />重試整理錄音</button>
    </div>
    <button v-if="(unavailable || error) && !busy" class="vd-secondary vd-text-fallback" type="button" @click="emit('text')">改用文字輸入</button>

    <details v-if="!busy" class="vd-speaking-guide">
      <summary>想一次說完整？查看說話提示 <ChevronDown :size="19" aria-hidden="true" /></summary>
      <div class="vd-speaking-guide__body">
        <p>有想到再補充，不必照順序：</p>
        <ul class="vd-optional-prompts">
          <li>集合地點</li><li>名額</li><li>費用</li><li>攜帶物品</li>
        </ul>
        <div class="vd-voice-example"><span>一句話範例</span><p>「明天下午三點到四點，在大安森林公園健走，捷運二號出口集合，找十二位朋友，免費，記得帶水。」</p></div>
      </div>
    </details>

    <p class="vd-privacy"><ShieldCheck :size="17" aria-hidden="true" /><span>語音與文字會經 OpenRouter 及其模型供應商處理，本服務不保存音檔。<br />辨識文字僅暫留本頁；備援錄音最多保留 5 分鐘供重試。</span></p>
  </section>
</template>
