<template>
  <div class="dropdown">
    <button
        class="btn btn-light dropdown-toggle d-flex align-items-center"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
    >
      <img
          :src="avatarUrl"
          alt="User Avatar"
          class="rounded-circle me-2"
          width="32"
          height="32"
      />
      <span class="d-none d-md-inline">{{ displayName }}</span>
    </button>
    <ul class="dropdown-menu dropdown-menu-end">
      <li>
        <h6 class="dropdown-header">Angemeldet als {{ displayName }}</h6>
      </li>
      <li>
        <hr class="dropdown-divider"/>
      </li>
      <li><a class="dropdown-item" href="#" @click.prevent="logout">Abmelden</a></li>
    </ul>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useUserStore} from "~/stores/user.js";
const userStore = useUserStore()

// Hier evtl. dynamische Daten holen oder aus einem Store
const displayName = computed(() => userStore.username)

// Platzhalter-Bild, später mit echtem Avatar ersetzen
const avatarUrl = ref('/images/avatar_placeholder.png')

// Optional: Laden von echten Daten via API oder Pinia Store
onMounted(() => {
  // z. B. echte Userdaten aus localStorage oder JWT lesen
  // displayName.value = decodedJwt.fullName
})

function logout() {
  localStorage.removeItem('jwt')
  window.location.href = '/'
}
</script>

<style scoped>
.dropdown-toggle::after {
  display: none; /* optional: Pfeil verbergen */
}
</style>
