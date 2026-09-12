<script setup lang="ts">
import { ChevronRight, Info, LocateFixed, MapPin, RotateCcw } from 'lucide-vue-next'
import { computed } from 'vue'
import type { ExploreScope } from '@/types/explore'

const props = defineProps<{
  lastUsedScope: ExploreScope | null
  isLocating: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  useCurrent: []
  useLastUsed: []
  chooseArea: []
}>()

const lastUsedLabel = computed(() => props.lastUsedScope?.location?.trim() || '上次選擇的位置')
const lastUsedMeta = computed(() => {
  if (!props.lastUsedScope) return ''
  return `以 ${props.lastUsedScope.radius} 公里內的活動為主`
})
</script>

<template>
  <section class="explore-location-gate" aria-labelledby="explore-location-title">
    <div class="explore-location-gate__intro">
      <span class="eyebrow">第一步</span>
      <h1 id="explore-location-title">先設定活動位置</h1>
      <p>先告訴我們從哪裡開始找，馬上看到今天附近適合參加的活動。</p>
    </div>

    <div class="explore-location-gate__choices" aria-label="選擇活動搜尋位置">
      <button
        class="location-choice location-choice--current"
        type="button"
        :disabled="props.isLocating"
        @click="emit('useCurrent')"
      >
        <span class="location-choice__icon" aria-hidden="true">
          <LocateFixed :size="24" :class="{ 'animate-spin': props.isLocating }" />
        </span>
        <span class="location-choice__copy">
          <strong>{{ props.isLocating ? '正在取得目前位置…' : '使用目前位置' }}</strong>
          <small>{{ props.isLocating ? '請稍候，定位成功後才會顯示活動' : '使用手機定位，找離你最近的活動' }}</small>
        </span>
        <ChevronRight class="location-choice__arrow" :size="22" aria-hidden="true" />
      </button>

      <button
        v-if="props.lastUsedScope"
        class="location-choice"
        type="button"
        @click="emit('useLastUsed')"
      >
        <span class="location-choice__icon" aria-hidden="true">
          <RotateCcw :size="23" />
        </span>
        <span class="location-choice__copy">
          <strong>沿用上次位置：{{ lastUsedLabel }}</strong>
          <small>{{ lastUsedMeta }}</small>
        </span>
        <ChevronRight class="location-choice__arrow" :size="22" aria-hidden="true" />
      </button>

      <button class="location-choice" type="button" @click="emit('chooseArea')">
        <span class="location-choice__icon" aria-hidden="true">
          <MapPin :size="24" />
        </span>
        <span class="location-choice__copy">
          <strong>選擇附近區域</strong>
          <small>從區域或公園清單選擇搜尋中心</small>
        </span>
        <ChevronRight class="location-choice__arrow" :size="22" aria-hidden="true" />
      </button>
    </div>

    <p v-if="props.errorMessage" class="location-gate__error" role="alert">
      <Info :size="19" aria-hidden="true" />
      <span>{{ props.errorMessage }}</span>
    </p>

    <p class="location-gate__privacy">
      <Info :size="17" aria-hidden="true" />
      定位只用來計算活動距離，不會公開你的精確位置。
    </p>
  </section>
</template>
