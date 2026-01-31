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

      <!-- Rollenbasierte Menüeinträge -->
      <li v-if="userStore.hasRole('ADMIN') || userStore.hasRole('SCHOOL_Admin')">
        <NuxtLink class="dropdown-item" to="/admin">
          <i class="bi bi-gear me-2"></i>Administration
        </NuxtLink>
      </li>
      <li v-if="userStore.hasRole('COURSE_INSTRUCTOR')">
        <NuxtLink class="dropdown-item" to="/instructor">
          <i class="bi bi-journal-text me-2"></i>Meine Kurse
        </NuxtLink>
      </li>

      <!-- Studenten-spezifische Menüeinträge -->
      <li v-if="userStore.hasRole('STUDENT')">
        <NuxtLink class="dropdown-item" to="/preferences">
          <i class="bi bi-star me-2"></i>Meine Präferenzen
        </NuxtLink>
      </li>
      <li v-if="userStore.hasRole('STUDENT')">
        <NuxtLink class="dropdown-item" to="/wechselrunde">
          <i class="bi bi-arrow-left-right me-2"></i>Wechselrunde
        </NuxtLink>
      </li>

      <li v-if="hasMultipleViews">
        <hr class="dropdown-divider"/>
      </li>

      <li><a class="dropdown-item" href="#" @click.prevent="logout">
        <i class="bi bi-box-arrow-right me-2"></i>Abmelden
      </a></li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from "~/stores/user.js"

const userStore = useUserStore()

const displayName = computed(() => userStore.name)

// Prüfen ob der Nutzer mehrere Views hat (für den Divider)
const hasMultipleViews = computed(() => {
  return userStore.hasRole('ADMIN') ||
      userStore.hasRole('SCHOOL_Admin') ||
      userStore.hasRole('COURSE_INSTRUCTOR') ||
      userStore.hasRole('STUDENT')
})

// Platzhalter-Bild, später mit echtem Avatar ersetzen
const avatarUrl = ref('/images/avatar_placeholder.png')

function logout() {
  localStorage.removeItem('jwt')
  userStore.clear()
  window.location.href = '/'
}
</script>

<style scoped>
.dropdown-toggle::after {
  display: none;
}

.dropdown-item {
  display: flex;
  align-items: center;
}
</style>