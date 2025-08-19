<!-- components/ErrorBanner.vue -->
<template>
  <div v-if="visible" class="alert alert-danger m-3 shadow" style="z-index: 9999" role="alert">
    {{ errorMessage }}
    <button type="button" class="btn-close float-end" @click="hide"></button>
  </div>
</template>

<script setup>
import {useErrorStore} from '~/stores/error'

const errorStore = useErrorStore()
console.log('STORE?', errorStore)
const visible = computed(() => errorStore.visible)
const errorMessage = computed(() => errorStore.errorMessage)
const hide = errorStore.hide

watchEffect(() => {
  console.log('[ErrorBanner] Sichtbar:', visible, 'Text:', errorMessage)
})
</script>
