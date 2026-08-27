<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './BottomNav.vue'

const route = useRoute()
const isOnboarding = computed(() => route.meta.shell === 'onboarding')
const root = computed(() => (route.meta.root as string | undefined) ?? 'explore')
const showBottomNav = computed(() => !isOnboarding.value && Boolean(route.meta.root))
</script>

<template>
  <div class="app-frame" :class="{ 'is-onboarding': isOnboarding }">
    <div class="app-surface" :class="`surface-${root}`">
      <slot />
      <BottomNav v-if="showBottomNav" :active="root" />
    </div>
  </div>
</template>
