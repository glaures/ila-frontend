<template>
  <nav aria-label="Admin Navigation">
    <ul class="nav nav-pills flex-column gap-1">
      <li v-for="item in items" :key="item.to" class="nav-item text-nowrap">
        <NuxtLink
            :to="item.to"
            class="nav-link"
            :class="{ active: isActive(item) }"
            @click="$emit('navigate')"
        >
          <i :class="item.icon" aria-hidden="true" class="me-1"></i>
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { to: '/admin/overview', label: 'Dashboard',  icon: 'bi bi-house-door' },
  { to: '/admin/phasen', label: 'Phasen',  icon: 'bi bi-calendar3' },
  { to: '/admin/kurse', label: 'Kurse',  icon: 'bi bi-chat-left-text' },
  { to: '/admin/users', label: 'Schüler', icon: 'bi bi-person-lines-fill' },
  { to: '/admin/problems', label: 'Probleme', icon: 'bi bi-exclamation-diamond' },
  { to: '/admin/assignments', label: 'Druck-Übersichten', icon: 'bi bi-printer' },
]

function isActive(item: { to: string }) {
  // Markiert auch Unterseiten als aktiv (z. B. /admin/assignments/123)
  return route.path === item.to || route.path.startsWith(item.to + '/')
}
</script>

<style scoped>
.nav-pills .nav-link {
  border-radius: .5rem;
}
.nav-pills .nav-link.active {
  color: #fff;
}
</style>
