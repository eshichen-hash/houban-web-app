<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import { useOnboarding } from '@/composables/useAppState'

const router = useRouter()
const { complete } = useOnboarding()

function enterExplore() {
  complete()
  router.push('/explore')
}
</script>

<template>
  <main class="onboarding-view" id="main-content" aria-labelledby="onboarding-title">
    <div class="onboarding-view__overlay" aria-hidden="true"></div>
    <section class="onboarding-view__content">
      <BrandLogo />
      <div class="onboarding-view__copy">
        <h1 id="onboarding-title">找一場活動，<br />和好伴一起出門</h1>
        <p>先看看附近適合的活動，需要時再依日期與興趣慢慢篩選。</p>
        <button class="button button--primary onboarding-view__primary" type="button" @click="enterExplore">
          查看附近及時活動
          <ArrowRight :size="22" aria-hidden="true" />
        </button>
      </div>
      <button class="button onboarding-view__skip" type="button" @click="enterExplore">
        直接進入探索
        <ArrowRight :size="20" aria-hidden="true" />
      </button>
    </section>
  </main>
</template>
