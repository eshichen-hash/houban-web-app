<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'
import { primaryNavigationItems } from './primaryNavigation'

defineProps<{ active: string }>()
</script>

<template>
  <aside class="side-nav" aria-label="桌面主要導覽">
    <RouterLink class="side-nav__brand" to="/explore" aria-label="前往公園好伴探索首頁">
      <BrandLogo />
    </RouterLink>

    <nav class="side-nav__menu" aria-label="主要導覽選單">
      <RouterLink
        v-for="item in primaryNavigationItems"
        :key="item.key"
        :to="item.to"
        class="side-nav__item"
        :class="{ 'is-active': active === item.key }"
        :aria-current="active === item.key ? 'page' : undefined"
      >
        <span class="side-nav__icon">
          <component :is="item.icon" :size="24" :stroke-width="2.4" aria-hidden="true" />
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <p class="side-nav__note">找公園、找活動、找同伴，讓今天多一個出門的理由。</p>
  </aside>
</template>
