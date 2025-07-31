<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthFetch} from "~/composables/useAuthFetch.js";

const router = useRouter()

onMounted(async () => {
  const {data: blocksRaw} = await useAuthFetch('http://localhost:8080/blocks')
  const blocks = ref(blocksRaw.value || []).value
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
