<script setup lang="ts">
import { ImagePlus, Sparkles } from 'lucide-vue-next'
import { shallowRef, useTemplateRef } from 'vue'

const audience = defineModel<string>('audience', { required: true })
const items = defineModel<string>('items', { required: true })
const image = defineModel<string>('image', { required: true })
const feedback = shallowRef('')
const eventImageInput = useTemplateRef<HTMLInputElement>('eventImageInput')

function chooseImage() {
  eventImageInput.value?.click()
}

function readImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 1_500_000) {
    feedback.value = '照片請小於 1.5 MB，以免本地原型儲存空間不足'
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.addEventListener('load', () => {
    if (typeof reader.result !== 'string') return
    image.value = reader.result
    feedback.value = `已加入照片：${file.name}`
  })
  reader.readAsDataURL(file)
}

function generatePoster() {
  image.value = '/create-bench-grass-v1.png'
  feedback.value = '已加入本地示意海報'
}
</script>

<template>
  <details class="advanced-settings">
    <summary>
      <span><strong>更多活動設定</strong><small>照片、適合對象、攜帶物品（選填）</small></span>
      <span class="advanced-settings__toggle" aria-hidden="true">＋</span>
    </summary>
    <div class="advanced-settings__body">
      <section class="advanced-settings__section" aria-labelledby="activity-image-title">
        <h2 id="activity-image-title">活動圖片</h2>
        <div class="media-upload">
          <div class="media-upload__preview">
            <img v-if="image" :src="image" alt="活動圖片預覽" />
            <span v-else>尚未加入活動照片</span>
          </div>
          <div class="media-upload__actions">
            <button class="button button--secondary" type="button" @click="chooseImage"><ImagePlus :size="18" aria-hidden="true" />上傳照片</button>
            <input id="event-image" ref="eventImageInput" class="sr-only" type="file" accept="image/*" @change="readImage" />
            <button class="button button--secondary" type="button" @click="generatePoster"><Sparkles :size="18" aria-hidden="true" />生成活動海報</button>
          </div>
          <p>有真實照片時優先使用；目前未串接圖片生成服務，按下後會使用本地示意海報。</p>
        </div>
      </section>

      <section class="advanced-settings__section advanced-field-grid">
        <label for="event-audience"><span>適合對象</span><input id="event-audience" v-model.trim="audience" type="text" placeholder="例如：初學者也可以參加" /></label>
        <label for="event-items"><span>攜帶物品</span><input id="event-items" v-model.trim="items" type="text" placeholder="例如：飲用水、帽子" /></label>
      </section>
    </div>
  </details>
  <p class="sr-only" role="status" aria-live="polite">{{ feedback }}</p>
</template>
