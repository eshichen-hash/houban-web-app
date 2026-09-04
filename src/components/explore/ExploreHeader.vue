<script setup lang="ts">
import { Bell, ChevronDown, MapPin } from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
import type { ExploreLocationMode, ExploreRadius } from '@/types/explore'

defineProps<{
  scopeSummary: string
  radius: ExploreRadius
  locationMode?: ExploreLocationMode
}>()

const emit = defineEmits<{
  openScope: []
  openNotifications: []
}>()
</script>

<template>
  <header class="topbar topbar--glass explore-header">
    <RouterLink class="explore-header__brand" to="/explore" aria-label="公園好伴探索首頁">
      <BrandLogo responsive />
    </RouterLink>

    <button
      class="explore-header__scope"
      :class="{ 'explore-header__scope--prompt': !scopeSummary }"
      type="button"
      :aria-label="scopeSummary ? `${locationMode === 'park' ? '搜尋中心' : '目前位置'}：${scopeSummary}，活動範圍 ${radius} 公里內；點擊調整` : '尚未設定活動位置，點擊選擇地點或開啟定位'"
      @click="emit('openScope')"
    >
      <small>{{ !scopeSummary ? '搜尋中心' : locationMode === 'park' ? '搜尋中心' : '目前位置' }}</small>
      <strong>
        <span v-if="scopeSummary">{{ scopeSummary }}・{{ radius }} 公里內</span>
        <span v-else class="explore-header__prompt-text">
          <MapPin :size="14" class="inline-pin-icon" aria-hidden="true" />
          點擊設定活動位置
        </span>
        <ChevronDown :size="17" aria-hidden="true" />
      </strong>
    </button>

    <button class="icon-button explore-header__notification" type="button" aria-label="通知" @click="emit('openNotifications')">
      <Bell :size="23" aria-hidden="true" />
    </button>
  </header>
</template>
