<script setup lang="ts">
import { Compass, Plus, UserRound } from 'lucide-vue-next'

defineProps<{ active: string }>()

const items = [
  { to: '/explore', key: 'explore', label: '探索', icon: Compass },
  { to: '/create', key: 'create', label: '發起', icon: Plus },
  { to: '/my', key: 'my', label: '我的', icon: UserRound },
]
</script>

<template>
  <nav class="bottom-nav" aria-label="主要導覽">
    <RouterLink
      v-for="item in items"
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
