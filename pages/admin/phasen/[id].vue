<template>
  <LazyAdminPhasenIndex />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const LazyAdminPhasenIndex = defineAsyncComponent(() => import('./index.vue'))
</script>
