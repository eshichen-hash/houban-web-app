<script setup lang="ts">
import { Bell, ChevronDown, MapPin } from 'lucide-vue-next'
import { computed } from 'vue'
import BrandLogo from '@/components/BrandLogo.vue'
import type { ExploreLocationMode, ExploreLocationSource, ExploreRadius } from '@/types/explore'

const props = defineProps<{
  scopeSummary: string
  radius: ExploreRadius
  locationMode?: ExploreLocationMode
  locationSource?: ExploreLocationSource | null
}>()

const emit = defineEmits<{
  openScope: []
  openNotifications: []
}>()

const scopeLabel = computed(() => {
  if (!props.scopeSummary) return '尚未設定'
  if (props.locationSource === 'last-used') return '上次位置'
  if (props.locationSource === 'manual' || props.locationMode === 'park' || props.locationMode === 'district') return '搜尋中心'
  return '目前位置'
})
</script>

<template>
  <header class="topbar topbar--glass explore-header">
    <RouterLink class="explore-header__brand" to="/explore" aria-label="公園好伴探索首頁">
      <BrandLogo responsive />
    </RouterLink>

    <button
      v-if="scopeSummary"
      class="explore-header__scope"
      type="button"
      :aria-label="`${scopeLabel}：${scopeSummary}，活動範圍 ${radius} 公里內；點擊調整`"
      @click="emit('openScope')"
    >
      <small>{{ scopeLabel }}</small>
      <strong>
        <span>{{ scopeSummary }}・{{ radius }} 公里內</span>
        <ChevronDown :size="17" aria-hidden="true" />
      </strong>
    </button>

    <div
      v-else
      class="explore-header__scope explore-header__scope--prompt"
      role="status"
      aria-label="尚未設定活動位置，請在下方選擇"
    >
      <small>{{ scopeLabel }}</small>
      <strong>
        <span class="explore-header__prompt-text">
          <MapPin :size="14" class="inline-pin-icon" aria-hidden="true" />
          請在下方設定
        </span>
      </strong>
    </div>

    <button class="icon-button explore-header__notification" type="button" aria-label="通知" @click="emit('openNotifications')">
      <Bell :size="23" aria-hidden="true" />
    </button>
  </header>
</template>
