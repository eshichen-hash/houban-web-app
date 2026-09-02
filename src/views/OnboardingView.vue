<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useOnboarding } from '@/composables/useAppState'

const router = useRouter()
const { complete } = useOnboarding()

function enterExplore() {
  complete()
  router.push('/explore')
}
</script>

<template>
  <main id="main-content" class="onboarding-screen" tabindex="-1" aria-label="公園好伴首次進入引導">
    <div class="onboarding-media" aria-hidden="true"></div>
    <div class="onboarding-park-elements" aria-hidden="true">
      <svg class="onboarding-bench" width="116" height="78" viewBox="0 0 116 78" fill="none"><path d="M16 38h78M22 22h66v16H22zM27 38v24M83 38v24M15 62h82" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <svg class="onboarding-lamp" width="70" height="102" viewBox="0 0 70 102" fill="none"><path d="M35 94V31M22 94h26M23 31h24l-4-15H27l-4 15ZM35 16V7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <section class="onboarding-content">
      <div class="onboarding-brand">
        <img class="onboarding-logo-image" src="/brand-logo-horizontal.svg" width="620" height="235" alt="公園好伴" />
      </div>
      <h1 id="onboarding-title">找一場活動，<br />和好伴一起出門</h1>
      <p>先看看附近適合的活動，需要時再依日期與興趣慢慢篩選。</p>
      <div class="onboarding-actions">
        <button class="button button-accent" type="button" @click="enterExplore">
          查看附近及時活動 <ChevronRight :size="20" aria-hidden="true" />
        </button>
      </div>
      <button class="onboarding-skip" type="button" @click="enterExplore">
        <span>直接進入探索</span>
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </section>
  </main>
</template>

