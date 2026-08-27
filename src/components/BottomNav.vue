<script setup lang="ts">
import { primaryNavigationItems } from './primaryNavigation'

defineProps<{ active: string }>()
</script>

<template>
  <nav class="bottom-nav" aria-label="主要導覽">
    <RouterLink
      v-for="item in primaryNavigationItems"
      :key="item.key"
      :to="item.to"
      class="bottom-nav__item"
      :class="{ 'is-active': active === item.key }"
      :aria-current="active === item.key ? 'page' : undefined"
    >
      <component :is="item.icon" :size="22" :stroke-width="2.4" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
