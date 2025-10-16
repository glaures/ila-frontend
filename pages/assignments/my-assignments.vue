<script setup lang="ts">
import {ref, onMounted} from 'vue'

const {$authFetch} = useNuxtApp()

interface Course {
  id: number
  name: string
  category: string
  room: string
  instructor: string
  pause: boolean
  preferenceIndex?: number
}

interface BlockOverview {
  blockId: number
  dayOfWeek: string
  startTime: string
  endTime: string
  periodId: number
  status: 'ASSIGNED' | 'OPEN' | 'PAUSE'
  assignedCourse: Course | null
  topPreferences: Course[]
}

const loading = ref(true)
const errorMsg = ref<string | null>(null)
const overview = ref<BlockOverview[]>([])

const weekdayLabel = (day: string) => ({
  MONDAY: 'Montag', TUESDAY: 'Dienstag', WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag', FRIDAY: 'Freitag'
}[day] || day)

async function loadOverview() {
  loading.value = true
  errorMsg.value = null
  try {
    const data = await $authFetch('/preferences/overview')
    overview.value = data
  } finally {
    loading.value = false
  }
}

onMounted(loadOverview)
</script>

<template>
  <div class="container py-4">
    <h1 class="h3 mb-3">Meine Kurse</h1>

    <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>
    <div v-if="loading" class="text-center">
      <div class="spinner-border"></div>
    </div>

    <div class="row g-3" v-else>
      <div v-for="b in overview" :key="b.blockId" class="col-12 col-md-6 col-lg-6">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>{{ weekdayLabel(b.dayOfWeek) }}</strong>
              <small class="text-muted d-block">{{ b.startTime }}–{{ b.endTime }}</small>
            </div>
            <NuxtLink
                class="btn btn-sm btn-outline-primary"
                :to="`/preferences/${b.blockId}`"
            >
              Bearbeiten
            </NuxtLink>
          </div>

          <div class="card-body">
            <template v-if="b.status === 'ASSIGNED'">
              <div class="fw-semibold">{{ b.assignedCourse?.name }}</div>
              <div>{{ b.assignedCourse?.instructor }}, {{ b.assignedCourse?.room }}</div>
            </template>

            <template v-else-if="b.status === 'OPEN'">
              <div v-if="b.topPreferences.length > 0">
                <div class="fw-semibold">Top-Präferenzen:</div>
                <ol class="list-group list-group-numbered">
                  <li v-for="c in b.topPreferences" :key="c.id" class="list-group-item">
                    {{ c.name }}
                    <span class="badge bg-light text-dark">Prio {{ c.preferenceIndex! + 1 }}</span>
                  </li>
                </ol>
              </div>
              <div v-else class="text-muted">
                Mittagessen / Hofpause
              </div>
            </template>

            <template v-else>
              <span class="text-muted">Pause gewählt</span>
            </template>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
