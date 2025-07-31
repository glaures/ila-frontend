<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'

const router = useRouter()

onMounted(async () => {
  const {data: userInfo} = await useFetch("https://jmoosdorf.de/iserv/idm/api/v1/users/26711937-6e11-4c1d-8e12-652ec37cd458");
  console.log("userinfo:" + userInfo.value)
  const {data: blocks} = await useFetch('http://localhost:8080/blocks')
  if (blocks.value.length > 0) {
    const firstBlockId = blocks.value[0].id
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
