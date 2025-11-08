<template>
  <nav aria-label="Admin Navigation">
    <ul class="nav nav-pills flex-column gap-1">
      <template v-for="(group, groupIndex) in menuGroups" :key="groupIndex">
        <!-- Separator mit Überschrift -->
        <li v-if="groupIndex > 0" class="menu-separator">
          <hr class="my-2">
        </li>
        <li class="menu-header">
          <span class="text-muted small fw-semibold text-uppercase">{{ group.header }}</span>
        </li>

        <!-- Menüeinträge der Gruppe -->
        <li v-for="item in group.items" :key="item.to" class="nav-item text-nowrap">
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
      </template>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const menuGroups = [
  {
    header: 'Kursangebot',
    items: [
      { to: '/admin/phasen', label: 'Phasen', icon: 'bi bi-calendar3' },
      { to: '/admin/bloecke', label: 'Blöcke', icon: 'bi bi-clock-history' },
      { to: '/admin/kurse', label: 'Kurse', icon: 'bi bi-chat-left-text' },
      { to: '/admin/block-ausnahmen', label: 'Ausnahmen', icon: 'bi bi-clipboard2-x' },
    ]
  },
  {
    header: 'Belegungen',
    items: [
      { to: '/admin/preference-status', label: 'Präferenzen', icon: 'bi bi-folder-check' },
      { to: '/admin/zuweisungs-prozess', label: 'Zuweisungs-Prozess', icon: 'bi bi-person-lines-fill' },
      { to: '/admin/users', label: 'Manuelle Anpassungen', icon: 'bi bi-person-lines-fill' },
      { to: '/admin/problems', label: 'Belegungsprobleme', icon: 'bi bi-exclamation-diamond' },
      { to: '/admin/belegungen', label: 'Belegungsüberblick', icon: 'bi bi-printer' },
    ]
  },
  {
    header: 'Extras',
    items: [
      { to: '/admin/nutzerverwaltung', label: 'Externe Nutzer', icon: 'bi bi-person-fill-lock' },
      { to: '/admin/beste-schule-import', label: 'Import Beste Schule', icon: 'bi bi-arrow-up-right-square' },
    ]
  }
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

.menu-header {
  padding: 0.5rem 0.75rem 0.25rem;
  list-style: none;
}

.menu-header span {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.menu-separator {
  list-style: none;
  padding: 0;
}

.menu-separator hr {
  opacity: 0.3;
}
</style>