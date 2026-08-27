<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>

<template>
  <img
    class="brand-logo"
    :class="{ 'brand-logo--compact': compact }"
    src="/brand-logo-horizontal.svg"
    alt="公園好伴"
  />
</template>
