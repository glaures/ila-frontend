<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'

const router = useRouter()

onMounted(async () => {
  const {$authFetch} = useNuxtApp()
  const blocks = await $authFetch('/blocks')
  const firstBlockId = blocks[0].id
  router.replace(`/preferences/${firstBlockId}`)
})
</script>

<template>
  <div class="container py-5 text-center">
    <p>Lade Kurswahl…</p>
  </div>
</template>
