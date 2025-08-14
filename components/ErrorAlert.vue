<template>
  <div v-if="visible" class="alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 z-3 w-auto shadow" role="alert">
    {{ message }}
    <button type="button" class="btn-close" @click="visible = false"></button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')

function showError(msg) {
  message.value = msg
  visible.value = true
  setTimeout(() => visible.value = false, 5000)
}

defineExpose({ showError })
</script>
