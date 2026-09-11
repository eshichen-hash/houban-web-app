<script setup lang="ts">
import { CircleAlert, Pencil, Check, Upload, ImagePlus, RotateCcw } from 'lucide-vue-next'
import type { DraftField, FieldStatus } from '@/composables/useVoiceActivityDraft'
defineProps<{ rows: { key: DraftField; label: string; value: string; status: FieldStatus }[]; image: string; imageSource: string; intro: string; title: string; uploading: boolean; saving: boolean; error: string; uploadError: string; saveNote: string }>()
const emit = defineEmits<{ edit: [field: DraftField]; upload: [file: File]; preset: []; submit: []; rerecord: [] }>()
function chooseFile(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (file) emit('upload', file); input.value = '' }
</script>
<template>
  <section class="vd-draft" aria-labelledby="draft-title" :aria-busy="saving">
    <header class="vd-draft-heading"><span class="vd-eyebrow">已整理成活動草稿</span><h2 id="draft-title">{{ title || '把想法變成一場邀請' }}</h2><p><Pencil :size="17" aria-hidden="true" />點擊任一欄位即可修改</p></header>
    <div class="vd-draft-card">
      <div class="vd-draft-image"><img :src="image" :alt="imageSource === 'upload' ? '主辦人上傳的活動圖片' : '公園活動示意配圖，非實際活動照片'" width="1200" height="675" /><span class="vd-image-label"><ImagePlus :size="16" aria-hidden="true" />{{ imageSource === 'upload' ? '自行上傳' : '系統配圖' }}</span></div>
      <div class="vd-image-actions"><label :class="{ 'is-disabled': uploading || saving }"><Upload :size="18" aria-hidden="true" />{{ uploading ? '圖片上傳中…' : '上傳活動圖片' }}<input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploading || saving" @change="chooseFile" /></label><button v-if="imageSource === 'upload'" type="button" class="vd-text-button" :disabled="saving || uploading" @click="emit('preset')">使用系統配圖</button></div>
      <p v-if="uploadError" role="alert" class="vd-warning">{{ uploadError }}</p>
      <div class="vd-fields"><button v-for="row in rows" :key="row.key" type="button" class="vd-field" :data-field="row.key" :class="{ 'is-pending': row.status === '待確認', 'is-copy': row.key === 'copy' }" :disabled="saving" @click="emit('edit', row.key)"><span class="vd-field-copy"><span class="vd-field-label">{{ row.label }}</span><strong>{{ row.value }}</strong><span v-if="row.key === 'copy' && intro" class="vd-intro-preview">{{ intro }}</span></span><span class="vd-field-end"><span class="vd-field-status" :class="{ pending: row.status === '待確認' }"><CircleAlert v-if="row.status === '待確認'" :size="16" aria-hidden="true" /><Check v-else-if="row.status === '已確認'" :size="15" aria-hidden="true" />{{ row.status }}</span><Pencil :size="17" aria-hidden="true" /></span></button></div>
    </div>
    <p v-if="error" class="vd-warning" role="alert">{{ error }}</p>
    <p class="vd-local-note" role="status">{{ saveNote }}</p>
    <div class="vd-draft-actions"><button type="button" class="vd-primary" :disabled="saving || uploading" @click="emit('submit')">{{ saving ? '正在儲存活動…' : '確認並建立活動' }}<span v-if="!saving" aria-hidden="true">→</span></button><button type="button" class="vd-secondary" :disabled="saving || uploading" @click="emit('rerecord')"><RotateCcw :size="18" aria-hidden="true" />重新錄音</button></div>
    <p class="vd-muted vd-confirm-note">確認後才會正式建立活動；待確認欄位會引導你逐一補齊。</p>
  </section>
</template>
