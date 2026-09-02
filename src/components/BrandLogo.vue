<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
  responsive?: boolean
}>(), {
  compact: false,
  responsive: false,
})
</script>

<template>
  <span v-if="responsive" class="brand-logo brand-logo--responsive" role="img" aria-label="公園好伴">
    <img class="brand-logo__symbol" src="/brand-logo-symbol.svg" alt="" width="780" height="610" />
    <img class="brand-logo__horizontal" src="/brand-logo-horizontal.svg" alt="" width="620" height="235" />
  </span>
  <img
    v-else
    class="brand-logo"
    :class="{ 'brand-logo--compact': compact }"
    src="/brand-logo-horizontal.svg"
    alt="公園好伴"
    width="620"
    height="235"
  />
</template>
