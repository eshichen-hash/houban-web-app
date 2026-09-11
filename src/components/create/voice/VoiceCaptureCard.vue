<script setup lang="ts">
import { Mic, Square, LoaderCircle, ShieldCheck, CircleAlert, RotateCcw } from 'lucide-vue-next'
import { computed, useTemplateRef, watch } from 'vue'
const props = defineProps<{ state: string; elapsed: number; error: string; unavailable: boolean; processing: boolean; canRetry: boolean; authorizing: boolean; transcript: string; liveStatus: string }>()
const emit = defineEmits<{ start: []; stop: []; cancel: []; retry: []; text: []; updateTranscript: [value: string] }>()
const busy = computed(() => props.processing || props.authorizing || ['requesting','connecting','recording','stopping'].includes(props.state))
const waiting = computed(() => ['requesting','connecting','stopping'].includes(props.state))
const transcriptInput = useTemplateRef<HTMLTextAreaElement>('transcriptInput')
watch(() => props.transcript, () => {
  if (busy.value && transcriptInput.value) transcriptInput.value.scrollTop = transcriptInput.value.scrollHeight
}, { flush: 'post' })
</script>
<template>
  <section class="vd-capture" :class="{ 'is-active': busy }" aria-labelledby="voice-invitation">
    <div class="vd-capture-intro"><h2 id="voice-invitation">你想辦什麼活動？</h2><p v-if="!busy">先說活動、日期與公園，<br class="vd-mobile-break" />細節之後再補。</p></div>
    <div v-if="processing" class="vd-recorder-status" role="status"><LoaderCircle class="vd-processing-icon vd-spin" :size="48" aria-hidden="true" /><strong>正在整理你的活動草稿…</strong><span>{{ transcript ? '已收到說明，正在整理日期、地點與活動細節' : '正在辨識錄音並整理活動細節' }}</span><button class="vd-text-button" type="button" @click="emit('cancel')">取消整理</button></div>
    <div v-else class="vd-recorder-status">
      <button v-if="state === 'recording'" class="vd-mic-button is-recording" type="button" aria-label="完成錄音，開始整理草稿" @click="emit('stop')"><Square :size="30" fill="currentColor" aria-hidden="true" /></button>
      <button v-else class="vd-mic-button" type="button" :disabled="waiting || authorizing" aria-label="開始語音說明" @click="emit('start')"><LoaderCircle v-if="waiting || authorizing" class="vd-spin" :size="32" aria-hidden="true" /><Mic v-else :size="34" aria-hidden="true" /></button>
      <template v-if="state === 'recording'"><strong role="status">{{ liveStatus === 'listening' ? '正在聽，文字會即時顯示' : '正在錄音，停止後辨識文字' }}</strong><span :class="{ 'vd-warning-text': elapsed >= 75 }">{{ String(Math.floor(elapsed / 60)).padStart(2, '0') }}:{{ String(elapsed % 60).padStart(2, '0') }} / 01:30</span><p v-if="elapsed >= 75" role="status">剩下 {{ 90 - elapsed }} 秒，時間到會自動整理。</p><button type="button" class="vd-text-button" @click="emit('cancel')">取消錄音</button></template>
      <strong v-else role="status">{{ state === 'connecting' ? '正在連接即時辨識…' : state === 'stopping' ? '正在完成最後一句辨識…' : authorizing ? '確認 LINE 登入…' : state === 'requesting' ? '請允許使用麥克風' : '點一下，開始說明' }}</strong>
      <span v-if="state !== 'recording'" class="vd-muted">最多 90 秒，不用一次說完整</span>
      <button v-if="waiting" class="vd-text-button" type="button" @click="emit('cancel')">取消</button>
    </div>
    <div class="vd-transcript">
      <div class="vd-transcript-heading"><label for="voice-transcript">語音辨識文字</label><span v-if="state === 'recording' && liveStatus === 'listening'" class="vd-live-badge"><span aria-hidden="true" />即時辨識中</span></div>
      <textarea id="voice-transcript" ref="transcriptInput" class="vd-input" aria-label="語音辨識文字" aria-describedby="voice-transcript-hint" :value="transcript" :readonly="busy" rows="4" maxlength="5000" placeholder="點擊麥克風開始說明，辨識到的內容會顯示在這裡…" @input="emit('updateTranscript', ($event.target as HTMLTextAreaElement).value)" />
      <p id="voice-transcript-hint" class="vd-muted">{{ liveStatus === 'unavailable' ? '此瀏覽器使用錄音後辨識；文字不會在錄音中更新。' : busy ? '可以分句慢慢說，文字辨識後逐句更新，會有短暫延遲。' : '辨識有誤可直接修改文字，再整理成草稿。' }}</p>
      <button v-if="transcript.trim().length > 1 && !busy && canRetry" class="vd-primary" type="button" @click="emit('retry')">整理成活動草稿</button>
    </div>
    <div v-if="error" class="vd-warning" role="alert"><p class="vd-inline"><CircleAlert :size="20" aria-hidden="true" />{{ error }}</p><button v-if="canRetry && !busy && !transcript" class="vd-secondary" type="button" @click="emit('retry')"><RotateCcw :size="18" aria-hidden="true" />重試整理錄音</button></div>
    <button v-if="(unavailable || error) && !busy" class="vd-secondary vd-text-fallback" type="button" @click="emit('text')">改用文字輸入</button>
    <div class="vd-voice-example"><span>你可以這樣說</span><p>「明天下午三點到四點，在大安森林公園健走，捷運二號出口集合，找十二位朋友，免費，記得帶水。」</p></div>
    <p class="vd-prompt-list">活動・日期與時間・公園・集合地點<br />名額・費用・攜帶物品</p>
    <p class="vd-privacy"><ShieldCheck :size="17" aria-hidden="true" /><span>語音與文字會經 OpenRouter 及其模型供應商處理，本服務不保存音檔。<br />辨識文字僅暫留本頁；備援錄音最多保留 5 分鐘供重試。</span></p>
  </section>
</template>
