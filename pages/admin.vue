<template>
  <div class="container-fluid mt-4">
    <div class="row">
      <!-- Sidebar -->
      <div class="col-md-3 mb-3">
        <div class="list-group">
          <NuxtLink
              v-for="section in sections"
              :key="section.path"
              :to="section.path"
              class="list-group-item list-group-item-action"
              :class="{ active: isActive(section.path) }"
          >
            {{ section.label }}
          </NuxtLink>
        </div>
      </div>

      <!-- Content Area -->
      <div class="col-md-9">
        <NuxtPage/> <!-- Zeigt die jeweilige Child-Komponente -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router'

const route = useRoute()

const sections = [
  {label: 'Überblick', path: '/admin/ueberblick'},
  {label: 'Schuljahre', path: '/admin/schuljahre'},
  {label: 'Phasen', path: '/admin/phasen'},
  {label: 'Blöcke', path: '/admin/bloecke'},
  {label: 'Kurse', path: '/admin/kurse'},
]

const isActive = (path) => route.path === path
</script>

<style scoped>
.list-group-item.active {
  background-color: #0d6efd;
  color: white;
}
</style>