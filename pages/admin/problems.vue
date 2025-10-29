<script setup lang="ts">
import { usePeriodContextStore } from '~/stores/periodContext'
import {computed, watch} from "vue";

type Problem = {
  description: string
  type: string
  id: string
}

const { $authFetch } = useNuxtApp() as any
const periodStore = usePeriodContextStore()
const periodId = computed(() => periodStore.selectedId)

definePageMeta({
  layout: 'admin' // dein Admin-Layout
})

const problems = ref<Problem[]>([])
const loading = ref(true)

const typeLabel: Record<string, string> = {
  notEnoughCourses: 'nicht genügend Kurse',
}

function resolveFixRoute(p: Problem): string | null {
  switch (p.type) {
    case 'notEnoughCourses':
      return `/admin/users/${encodeURIComponent(p.id)}`
    default:
      return null
  }
}

const hasProblems = computed(() => problems.value.length > 0)

async function loadProblems() {
  // Nur laden, wenn eine gültige Period-ID vorhanden ist
  if (!periodId.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const data = await $authFetch(`/problems?period-id=${periodId.value}`)
    // Absicherung gegen „komische" Antworten
    problems.value = Array.isArray(data) ? data as Problem[] : []
  } finally {
    loading.value = false
  }
}

// Watch auf periodId - lädt Probleme, wenn sich die Period ändert
watch(periodId, (newPeriodId) => {
  if (newPeriodId) {
    loadProblems()
  }
}, { immediate: true }) // immediate: true führt den Watch sofort aus, falls bereits eine Period vorhanden ist
</script>

<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h4 mb-0">Belegungsprobleme</h1>
      <button class="btn btn-outline-secondary btn-sm" @click="loadProblems" :disabled="loading">
        <span v-if="!loading">Neu laden</span>
        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" role="status" aria-hidden="true"></div>
      <div class="mt-2">Lade Probleme …</div>
    </div>

    <div v-else-if="!hasProblems" class="alert alert-success" role="alert">
      Aktuell sind keine Probleme vorhanden.
    </div>

    <div v-else class="card">
      <div class="list-group list-group-flush">
        <div
            v-for="p in problems"
            :key="p.id + ':' + p.type + ':' + p.description"
            class="list-group-item d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2"
        >
          <div class="flex-fill">
            <div class="fw-semibold">
              {{ p.description }}
            </div>
            <div class="small text-muted mt-1">
              <span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                {{ typeLabel[p.type] ?? p.type }}
              </span>
              <span class="ms-2">Problem-ID: <code>{{ p.id }}</code></span>
            </div>
          </div>

          <div class="ms-md-3">
            <NuxtLink
                v-if="resolveFixRoute(p)"
                :to="resolveFixRoute(p)!"
                class="btn btn-primary btn-sm"
            >
              Beheben
            </NuxtLink>
            <button
                v-else
                class="btn btn-outline-secondary btn-sm"
                disabled
                title="Für diesen Problemtyp ist noch keine Aktion hinterlegt."
            >
              Keine Aktion verfügbar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* kleine optische Hilfe auf mobilen Geräten */
.list-group-item { border-left: 0; border-right: 0; }
.card { border: 0; }
</style>