<!-- components/ToastContainer.vue -->
<script setup lang="ts">
import {useToastStore} from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 9999;">
    <TransitionGroup name="toast">
      <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="toast show align-items-center border-0 mb-2"
          :class="{
          'text-bg-success': toast.type === 'success',
          'text-bg-danger': toast.type === 'danger',
          'text-bg-warning': toast.type === 'warning',
          'text-bg-info': toast.type === 'info'
        }"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
      >
        <div class="d-flex">
          <div class="toast-body">
            {{ toast.message }}
          </div>
          <button
              type="button"
              class="btn-close btn-close-white me-2 m-auto"
              @click="toastStore.remove(toast.id)"
              aria-label="Close"
          ></button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Toast Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>