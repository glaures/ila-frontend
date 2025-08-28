<template>
  <NuxtLayout>
    <ErrorBanner />
    <NuxtPage/>
  </NuxtLayout>
</template>

<script setup>
import ErrorBanner from '~/components/ErrorBanner.vue'
useHead({
  link: [
    { rel: 'icon', type: 'image/png', href: 'https://www.jmoosdorf-schule.de/wp-content/uploads/2021/09/cropped-favicon-32x32.png' }
  ]
})
</script>
