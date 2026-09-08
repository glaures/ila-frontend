<!-- components/ImpersonationBanner.vue -->
<template>
  <div
      v-if="isImpersonating"
      class="impersonation-banner d-flex flex-wrap align-items-center justify-content-between gap-2 px-4 py-2"
  >
    <div class="small">
      <i class="bi bi-incognito me-2" aria-hidden="true"></i>
      Du benutzt iLa gerade als <strong>{{ userStore.name ?? userStore.username }}</strong>
      <span class="d-none d-md-inline"> ({{ userStore.username }})</span>.
      Sitzung übernommen von <strong>{{ impersonatedBy }}</strong> –
      Änderungen werden echt gespeichert.
    </div>
    <button class="btn btn-sm btn-dark text-nowrap" type="button" @click="stopImpersonation">
      <i class="bi bi-box-arrow-left me-1" aria-hidden="true"></i>
      Zurück zum Admin-Konto
    </button>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/user'
import { useErrorStore } from '~/stores/error'
import { IMPERSONATION_EXPIRED_KEY } from '~/composables/useImpersonation'

const userStore = useUserStore()
const errorStore = useErrorStore()
const { isImpersonating, impersonatedBy, stopImpersonation } = useImpersonation()

// Der Hinweis wird beim automatischen Rückfall auf die Admin-Sitzung
// (abgelaufenes Impersonation-Token) gesetzt und überlebt den Reload.
onMounted(() => {
  if (sessionStorage.getItem(IMPERSONATION_EXPIRED_KEY)) {
    sessionStorage.removeItem(IMPERSONATION_EXPIRED_KEY)
    errorStore.show('Die übernommene Sitzung ist abgelaufen. Du bist wieder als Admin angemeldet.')
  }
})
</script>

<style scoped>
.impersonation-banner {
  background-color: #ffc107;
  color: #212529;
  border-bottom: 1px solid rgba(0, 0, 0, .15);
}
</style>
