<script setup lang="ts">
import { Bell, ChevronDown } from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
import type { ExploreRadius } from '@/types/explore'

defineProps<{
  scopeSummary: string
  radius: ExploreRadius
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
      type="button"
      :aria-label="`目前位置：${scopeSummary}，活動範圍 ${radius} 公里內；點擊調整`"
      @click="emit('openScope')"
    >
      <small>目前位置</small>
      <strong>
        <span>{{ scopeSummary }}・{{ radius }} 公里內</span>
        <ChevronDown :size="17" aria-hidden="true" />
      </strong>
    </button>

    <button class="icon-button explore-header__notification" type="button" aria-label="通知" @click="emit('openNotifications')">
      <Bell :size="23" aria-hidden="true" />
    </button>
  </header>
</template>
