<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'

const router = useRouter()

onMounted(async () => {
  const { $authFetch } = useNuxtApp()
  const blocks = await $authFetch('/blocks')
  if (blocks.length > 0) {
    const firstBlockId = blocks[0].id
    router.replace(`/preferences/${firstBlockId}`)
  } else {
    console.warn('Keine Blöcke vorhanden')
  }
})
</script>

<template>
  <div class="container py-5 text-center">
    <p>Lade Kurswahl…</p>
  </div>
</template>
