<script setup lang="ts">
import { Mic, Square, LoaderCircle, ShieldCheck, CircleAlert, RotateCcw } from 'lucide-vue-next'
defineProps<{ state: string; elapsed: number; error: string; unavailable: boolean; processing: boolean; canRetry: boolean; authorizing: boolean }>()
const emit = defineEmits<{ start: []; stop: []; cancel: []; retry: []; text: [] }>()
</script>
<template>
  <section class="vd-capture" aria-labelledby="voice-invitation">
    <div class="vd-capture-intro"><h2 id="voice-invitation">你想辦什麼活動？</h2><p>先說活動、日期與公園，<br class="vd-mobile-break" />細節之後再補。</p></div>
    <div v-if="processing" class="vd-recorder-status" role="status"><LoaderCircle class="vd-processing-icon vd-spin" :size="48" aria-hidden="true" /><strong>正在聽懂你的安排…</strong><span>正在辨識語音並整理成活動草稿</span><button class="vd-text-button" type="button" @click="emit('cancel')">取消整理</button></div>
    <div v-else class="vd-recorder-status">
      <button v-if="state === 'recording'" class="vd-mic-button is-recording" type="button" aria-label="完成錄音，開始整理草稿" @click="emit('stop')"><Square :size="30" fill="currentColor" aria-hidden="true" /></button>
      <button v-else class="vd-mic-button" type="button" :disabled="state === 'requesting' || authorizing" aria-label="開始語音說明" @click="emit('start')"><LoaderCircle v-if="state === 'requesting' || authorizing" class="vd-spin" :size="32" aria-hidden="true" /><Mic v-else :size="34" aria-hidden="true" /></button>
      <template v-if="state === 'recording'"><strong>正在錄音，慢慢說就好</strong><span :class="{ 'vd-warning-text': elapsed >= 75 }">{{ String(Math.floor(elapsed / 60)).padStart(2, '0') }}:{{ String(elapsed % 60).padStart(2, '0') }} / 01:30</span><p v-if="elapsed >= 75" role="status">剩下 {{ 90 - elapsed }} 秒，時間到會自動整理。</p><button type="button" class="vd-text-button" @click="emit('cancel')">取消錄音</button></template>
      <strong v-else>{{ authorizing ? '確認 LINE 登入…' : state === 'requesting' ? '請允許使用麥克風' : '點一下，開始說明' }}</strong>
      <span v-if="state !== 'recording'" class="vd-muted">最多 90 秒，不用一次說完整</span>
      <button v-if="state === 'requesting'" class="vd-text-button" type="button" @click="emit('cancel')">取消</button>
    </div>
    <div v-if="error" class="vd-warning" role="alert"><p class="vd-inline"><CircleAlert :size="20" aria-hidden="true" />{{ error }}</p><button v-if="canRetry && !processing" class="vd-secondary" type="button" @click="emit('retry')"><RotateCcw :size="18" aria-hidden="true" />重試整理錄音</button></div>
    <button v-if="unavailable && !processing" class="vd-secondary vd-text-fallback" type="button" @click="emit('text')">改用文字輸入</button>
    <div class="vd-voice-example"><span>你可以這樣說</span><p>「明天下午三點到四點，在大安森林公園健走，捷運二號出口集合，找十二位朋友，免費，記得帶水。」</p></div>
    <p class="vd-prompt-list">活動・日期與時間・公園・集合地點<br />名額・費用・攜帶物品</p>
    <p class="vd-privacy"><ShieldCheck :size="17" aria-hidden="true" /><span>錄音會送至語音服務整理，本服務不保存音檔。<br />若整理失敗，錄音僅在此頁暫留最多 5 分鐘供重試。</span></p>
  </section>
</template>
