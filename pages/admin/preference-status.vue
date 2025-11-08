<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="h4 m-0">Präferenzen</div>
    </div>

    <!-- Ladeanzeige -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Lädt...</span>
      </div>
    </div>

    <!-- Hauptinhalt -->
    <div v-else-if="data">
      <!-- Statistik-Karten -->
      <div class="row mb-4">
        <div class="col-md-4">
          <div class="card border-danger">
            <div class="card-body">
              <h5 class="card-title text-danger">Noch nicht begonnen</h5>
              <p class="display-4 mb-0">{{ data.notStarted }}</p>
              <small class="text-muted">{{ getPercentage(data.notStarted) }}%</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-warning">
            <div class="card-body">
              <h5 class="card-title text-warning">In Bearbeitung</h5>
              <p class="display-4 mb-0">{{ data.inProgress }}</p>
              <small class="text-muted">{{ getPercentage(data.inProgress) }}%</small>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-success">
            <div class="card-body">
              <h5 class="card-title text-success">Abgeschlossen</h5>
              <p class="display-4 mb-0">{{ data.completed }}</p>
              <small class="text-muted">{{ getPercentage(data.completed) }}%</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Fortschrittsbalken -->
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Gesamtfortschritt</h5>
          <div class="progress" style="height: 30px;">
            <div
                class="progress-bar bg-success"
                :style="{ width: getPercentage(data.completed) + '%' }"
                role="progressbar"
            >
              {{ getPercentage(data.completed) }}% Fertig
            </div>
            <div
                class="progress-bar bg-warning"
                :style="{ width: getPercentage(data.inProgress) + '%' }"
                role="progressbar"
            >
              {{ getPercentage(data.inProgress) }}%
            </div>
            <div
                class="progress-bar bg-danger"
                :style="{ width: getPercentage(data.notStarted) + '%' }"
                role="progressbar"
            >
              {{ getPercentage(data.notStarted) }}%
            </div>
          </div>
        </div>
      </div>

      <!-- Block-Filter Dropdown -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-3">
              <label for="blockSelect" class="form-label fw-bold">Block-Filter:</label>
            </div>
            <div class="col-md-9">
              <select
                  id="blockSelect"
                  class="form-select"
                  v-model="selectedBlockId"
                  @change="onBlockChange"
              >
                <option :value="null">Alle Blöcke</option>
                <option
                    v-for="block in blocks"
                    :key="block.id"
                    :value="block.id"
                >
                  {{ getBlockLabel(block.dayOfWeek) }}, {{ block.startTime }} - {{ block.endTime }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Beliebteste Kurse -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">
            {{ selectedBlockId ? 'Beliebteste Kurse im ausgewählten Block' : 'Beliebteste Kurse (alle Blöcke)' }}
            (nach Prio-1-Platzierungen)
          </h5>
        </div>
        <div class="card-body">
          <div v-if="data.popularCourses.length === 0" class="text-muted">
            Noch keine Präferenzen vorhanden
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover">
              <thead>
              <tr>
                <th>Rang</th>
                <th>Kurs-ID</th>
                <th>Kursname</th>
                <th>Lehrer</th>
                <th>Prio-1-Wahl</th>
                <th>Max. Teilnehmer</th>
                <th>Auslastung</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(course, index) in data.popularCourses" :key="course.courseId">
                <td>
                  <span class="badge" :class="getRankBadgeClass(index)">{{ index + 1 }}</span>
                </td>
                <td>{{ course.courseIdentifier }}</td>
                <td>{{ course.courseName }}</td>
                <td>{{ course.instructor }}</td>
                <td>
                  <strong>{{ course.firstPreferenceCount }}</strong>
                </td>
                <td>{{ course.maxAttendees }}</td>
                <td>
                  <div class="progress" style="min-width: 100px;">
                    <div
                        class="progress-bar"
                        :class="getUtilizationClass(course.utilizationPercentage)"
                        :style="{ width: Math.min(course.utilizationPercentage, 100) + '%' }"
                        role="progressbar"
                    >
                      {{ course.utilizationPercentage }}%
                    </div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Fehlerfall -->
    <div v-else class="alert alert-warning">
      Keine Daten verfügbar
    </div>
  </div>
</template>

<script setup lang="ts">
import { useErrorStore } from '~/stores/error'
import { usePeriodContextStore } from '~/stores/periodContext'
import { weekdayLabels } from '~/utils/weekdays'

definePageMeta({
  layout: 'admin'
})

// Types
interface BlockDto {
  id: number
  periodId: number
  dayOfWeek: string
  startTime: string
  endTime: string
}

interface CoursePopularity {
  courseId: number
  courseIdentifier: string
  courseName: string
  instructor: string
  firstPreferenceCount: number
  maxAttendees: number
  utilizationPercentage: number
}

interface PreferenceStatusResponse {
  periodId: number
  periodName: string
  totalStudents: number
  notStarted: number
  inProgress: number
  completed: number
  popularCourses: CoursePopularity[]
}

const { $authFetch } = useNuxtApp()
const errorStore = useErrorStore()
const periodStore = usePeriodContextStore()

// State
const loading = ref(true)
const blocks = ref<BlockDto[]>([])
const selectedBlockId = ref<number | null>(null)
const data = ref<PreferenceStatusResponse | null>(null)

// Computed
const periodId = computed(() => periodStore.selectedPeriod?.id ?? null)

// Blöcke laden
async function loadBlocks() {
  if (!periodId.value) {
    blocks.value = []
    return
  }

  try {
    const result = await ($authFetch as any)(`/blocks?period-id=${periodId.value}`)
    blocks.value = Array.isArray(result) ? result : []
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Blöcke: ' + err)
    blocks.value = []
  }
}

// Preference Status laden
async function loadPreferenceStatus() {
  if (!periodId.value) {
    errorStore.show('Keine Periode ausgewählt')
    loading.value = false
    return
  }

  try {
    loading.value = true
    let url = `/preference-status?period-id=${periodId.value}`
    if (selectedBlockId.value) {
      url += `&block-id=${selectedBlockId.value}`
    }
    data.value = await ($authFetch as any)(url)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Präferenz-Statistiken: ' + err)
  } finally {
    loading.value = false
  }
}

// Handler für Block-Auswahl
function onBlockChange() {
  loadPreferenceStatus()
}

// Prozentwerte berechnen
function getPercentage(count: number): number {
  if (!data.value || data.value.totalStudents === 0) return 0
  return Math.round((count / data.value.totalStudents) * 100)
}

// Badge-Klasse für Rankings
function getRankBadgeClass(index: number): string {
  if (index === 0) return 'bg-warning text-dark'
  if (index === 1) return 'bg-secondary'
  if (index === 2) return 'bg-info'
  return 'bg-light text-dark'
}

// Auslastungs-Farbe
function getUtilizationClass(percentage: number): string {
  if (percentage >= 100) return 'bg-danger'
  if (percentage >= 80) return 'bg-warning'
  return 'bg-success'
}

// Wochentag-Label
function getBlockLabel(dayOfWeek: string): string {
  return weekdayLabels[dayOfWeek] || dayOfWeek || 'Unbekannt'
}

// Initial laden
onMounted(async () => {
  // Lade Perioden, falls noch nicht geschehen
  if (!periodStore.initialized) {
    await periodStore.loadPeriods($authFetch)
  }

  // Lade Blöcke und dann Preference Status
  await loadBlocks()
  await loadPreferenceStatus()
})

// Neu laden, wenn sich die Periode ändert
watch(periodId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    selectedBlockId.value = null // Reset Block-Filter bei Periodenwechsel
    await loadBlocks()
    await loadPreferenceStatus()
  }
})
</script>

<style scoped>
.card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.display-4 {
  font-weight: 300;
}

.progress {
  border-radius: 0.375rem;
}

.table th {
  font-weight: 600;
  background-color: #f8f9fa;
}

.form-select {
  max-width: 500px;
}
</style>