<template>
  <div class="container my-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="h4 m-0">Zuweisungs-Prozess</div>
    </div>
    <div class="row">
      <div class="col-12">
        <!-- Period Selection -->
        <div class="card mb-4">
          <div class="card-body">
            <h5 class="card-title">Zeitraum auswählen</h5>
            <div class="row align-items-center">
              <div class="col-md-6">
                <select
                    v-model="selectedPeriodId"
                    class="form-select"
                    :disabled="isAssigning"
                    @change="onPeriodChange"
                >
                  <option :value="null">Bitte wählen...</option>
                  <option
                      v-for="period in periods"
                      :key="period.id"
                      :value="period.id"
                  >
                    {{ period.name }}
                  </option>
                </select>
              </div>
              <div class="col-md-6 mt-3 mt-md-0">
                <button
                    class="btn btn-primary btn-lg w-100"
                    :disabled="!selectedPeriodId || isAssigning || hasFinalizedResult"
                    @click="startAssignment"
                >
                  <span v-if="isAssigning" class="spinner-border spinner-border-sm me-2"></span>
                  <span v-if="isAssigning">Zuweisen läuft...</span>
                  <span v-else>Kurse zuweisen</span>
                </button>
                <div v-if="hasFinalizedResult && selectedPeriodId" class="text-muted small mt-2">
                  <i class="bi bi-info-circle me-1"></i>
                  Es existiert bereits eine finalisierte Zuweisung für diesen Zeitraum.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Warning Box - only if there are historical results -->
        <div v-if="selectedPeriodId && !viewingHistorical && historicalResults.length > 0 && !hasFinalizedResult" class="alert alert-warning mb-4">
          <strong>Achtung:</strong> Die Kurszuweisung löscht alle bestehenden (nicht-manuellen) Zuweisungen
          für den gewählten Zeitraum und erstellt sie neu. Dieser Vorgang kann nicht rückgängig gemacht werden.
        </div>

        <!-- Loading State -->
        <div v-if="isAssigning" class="card mb-4">
          <div class="card-body text-center py-5">
            <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
            <h5>Kurse werden zugewiesen...</h5>
            <p class="text-muted">Dies kann einige Minuten dauern.</p>
          </div>
        </div>

        <!-- Current Results -->
        <div v-if="displayedResult && !isAssigning" class="mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="mb-0">
              {{ viewingHistorical ? 'Historisches Ergebnis' : 'Aktuelles Ergebnis' }}
            </h5>
            <button
                v-if="viewingHistorical"
                class="btn btn-sm btn-secondary"
                @click="clearHistoricalView"
            >
              Zurück zur Übersicht
            </button>
          </div>
          <AssignmentResults :result="displayedResult" />
          <div v-if="viewingHistorical" class="text-muted small mt-2">
            Ausgeführt am: {{ formatDateTime(displayedResult.executedAt) }}
          </div>
        </div>

        <!-- Historical Results -->
        <div v-if="selectedPeriodId && historicalResults.length > 0 && !viewingHistorical" class="card">
          <div class="card-body">
            <h5 class="card-title">Frühere Zuweisungen</h5>
            <div v-if="loadingHistory" class="text-center py-3">
              <div class="spinner-border spinner-border-sm"></div>
              <span class="ms-2">Lade Historie...</span>
            </div>
            <div v-else class="list-group list-group-flush">
              <div
                  v-for="result in historicalResults"
                  :key="result.id"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                  :class="{ 'list-group-item-success': result.finalized }"
                  style="cursor: pointer;"
                  @click="viewHistoricalResult(result)"
              >
                <div class="flex-grow-1">
                  <div class="fw-bold">
                    {{ formatDateTime(result.executedAt) }}
                    <span v-if="result.finalized" class="badge bg-success ms-2">Finalisiert</span>
                  </div>
                  <div class="text-muted small">
                    {{ result.assignedStudents }} von {{ result.totalStudents }} Schülern zugewiesen
                    ({{ calculateAssignmentRate(result).toFixed(1) }}%)
                    • Ø Priorität: {{ result.averagePriority.toFixed(2) }}
                    • Dauer: {{ formatDuration(result.executionDurationMs) }}
                    <span v-if="result.studentsWithoutPreferences > 0">
                      • {{ result.studentsWithoutPreferences }} ohne Präferenzen
                    </span>
                  </div>
                </div>
                <div v-if="!result.finalized && !hasFinalizedResult" class="d-flex gap-2 ms-3">
                  <button
                      class="btn btn-sm btn-success"
                      @click.stop="markAsFinal(result)"
                      title="Als final markieren"
                  >
                    <i class="bi bi-check-circle"></i> Als final markieren
                  </button>
                  <button
                      class="btn btn-sm btn-outline-danger"
                      @click.stop="deleteHistoricalResult(result)"
                      title="Löschen"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div v-else-if="!result.finalized" class="ms-3">
                  <button
                      class="btn btn-sm btn-outline-danger"
                      @click.stop="deleteHistoricalResult(result)"
                      title="Löschen"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No History Message -->
        <div v-if="selectedPeriodId && !loadingHistory && historicalResults.length === 0 && !assignmentResult && !viewingHistorical" class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          Für diesen Zeitraum gibt es noch keine früheren Zuweisungen.
        </div>
      </div>
    </div>

    <!-- Assignment Confirmation Modal -->
    <div
        ref="assignmentModalRef"
        class="modal fade"
        tabindex="-1"
        aria-labelledby="assignmentModalLabel"
        aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="assignmentModalLabel" class="modal-title">Kurszuweisung durchführen</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body">
            <p v-if="historicalResults.length > 0">
              <strong>Achtung:</strong> Die Kurszuweisung löscht alle bestehenden (nicht-manuellen) Zuweisungen
              für den gewählten Zeitraum und erstellt sie neu.
            </p>
            <p v-else>
              Möchten Sie die erste Kurszuweisung für diesen Zeitraum durchführen?
            </p>
            <p class="mb-0">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
            <button type="button" class="btn btn-primary" @click="confirmAssignment">
              Kurse zuweisen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
        ref="deleteModalRef"
        class="modal fade"
        tabindex="-1"
        aria-labelledby="deleteModalLabel"
        aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="deleteModalLabel" class="modal-title">Historische Zuweisung löschen</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body">
            <p v-if="resultToDelete">
              Möchten Sie die Zuweisung vom <strong>{{ formatDateTime(resultToDelete.executedAt) }}</strong> wirklich löschen?
            </p>
            <div v-if="isLatestResult" class="alert alert-warning mt-3">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Hinweis:</strong> Das ist das Resultat des letzten Zuweisungslaufs.
              Wenn Sie es löschen, werden Sie nicht mehr gewarnt, falls Sie den Zuweisungs-Algorithmus
              erneut starten. Bedenken Sie, dass nur das Ergebnis, nicht aber die Zuweisungen gelöscht werden.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
            <button type="button" class="btn btn-danger" @click="confirmDelete">
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Finalize Confirmation Modal -->
    <div
        ref="finalizeModalRef"
        class="modal fade"
        tabindex="-1"
        aria-labelledby="finalizeModalLabel"
        aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="finalizeModalLabel" class="modal-title">Zuweisung als final markieren</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body">
            <p v-if="resultToFinalize">
              Möchten Sie die Zuweisung vom <strong>{{ formatDateTime(resultToFinalize.executedAt) }}</strong> wirklich als final markieren?
            </p>
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Achtung:</strong> Diese Aktion löst die Kommunikation an alle Schüler aus und kann nicht rückgängig gemacht werden.
              Nach der Finalisierung können keine weiteren Zuweisungsdurchläufe mehr für diesen Zeitraum gestartet werden.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Abbrechen</button>
            <button type="button" class="btn btn-success" @click="confirmMarkAsFinal">
              Als final markieren
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Period } from '~/types/period'
import { Modal } from 'bootstrap'

interface AssignmentResultData {
  id: number
  executedAt: string
  totalStudents: number
  assignedStudents: number
  partiallyAssigned: number
  unassigned: number
  averagePriority: number
  priorityDistribution: Record<number, number>
  averageFairnessScore: number
  fairnessStdDeviation: number
  executionDurationMs?: number
  studentsWithoutPreferences: number
  finalized: boolean
}

definePageMeta({
  layout: 'admin'
})

const { $authFetch } = useNuxtApp() as any
const toastStore = useToastStore()
const { isAssigning, assignmentResult, assignCourses } = useAssignment()

// Load periods
const periods = ref<Period[]>([])
const selectedPeriodId = ref<number | null>(null)

// Historical results
const historicalResults = ref<AssignmentResultData[]>([])
const loadingHistory = ref(false)
const viewingHistorical = ref(false)
const currentHistoricalResult = ref<AssignmentResultData | null>(null)

// Modal refs and instances
const assignmentModalRef = ref<HTMLElement | null>(null)
const deleteModalRef = ref<HTMLElement | null>(null)
const finalizeModalRef = ref<HTMLElement | null>(null)
let assignmentModal: Modal | null = null
let deleteModal: Modal | null = null
let finalizeModal: Modal | null = null

// Delete confirmation state
const resultToDelete = ref<AssignmentResultData | null>(null)

// Finalize confirmation state
const resultToFinalize = ref<AssignmentResultData | null>(null)

// Computed property for displayed result
const displayedResult = computed(() => {
  if (viewingHistorical.value && currentHistoricalResult.value) {
    return currentHistoricalResult.value
  }
  return assignmentResult.value
})

// Check if result to delete is the latest one
const isLatestResult = computed(() => {
  if (!resultToDelete.value || historicalResults.value.length === 0) return false
  // The first item in the list is the latest (newest)
  return historicalResults.value[0].id === resultToDelete.value.id
})

// Check if there's any finalized result
const hasFinalizedResult = computed(() => {
  return historicalResults.value.some(result => result.finalized)
})

const loadPeriods = async () => {
  try {
    periods.value = await $authFetch('/periods')

    // Auto-select current period
    const currentPeriod = periods.value.find(p => p.current)
    if (currentPeriod) {
      selectedPeriodId.value = currentPeriod.id
      await loadHistoricalResults()
    }
  } catch (err) {
    console.error('Fehler beim Laden der Zeiträume:', err)
  }
}

const loadHistoricalResults = async () => {
  if (!selectedPeriodId.value) return

  loadingHistory.value = true
  try {
    const results = await $authFetch(`/periods/${selectedPeriodId.value}/assign-courses/history`)
    historicalResults.value = results
  } catch (err: any) {
    console.error('Fehler beim Laden der Historie:', err)
    const errorStore = useErrorStore()
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Historie')
  } finally {
    loadingHistory.value = false
  }
}

const onPeriodChange = async () => {
  viewingHistorical.value = false
  currentHistoricalResult.value = null
  if (selectedPeriodId.value) {
    await loadHistoricalResults()
  } else {
    historicalResults.value = []
  }
}

const startAssignment = () => {
  if (!selectedPeriodId.value || !assignmentModal) return
  assignmentModal.show()
}

const confirmAssignment = async () => {
  if (!selectedPeriodId.value || !assignmentModal) return

  assignmentModal.hide()

  viewingHistorical.value = false
  currentHistoricalResult.value = null

  await assignCourses(selectedPeriodId.value)

  // Reload history after assignment
  if (selectedPeriodId.value) {
    await loadHistoricalResults()
  }
}

const viewHistoricalResult = (result: AssignmentResultData) => {
  currentHistoricalResult.value = result
  viewingHistorical.value = true
}

const clearHistoricalView = () => {
  viewingHistorical.value = false
  currentHistoricalResult.value = null
}

const deleteHistoricalResult = (result: AssignmentResultData) => {
  if (!deleteModal) return
  resultToDelete.value = result
  deleteModal.show()
}

const confirmDelete = async () => {
  if (!selectedPeriodId.value || !resultToDelete.value || !deleteModal) return

  const resultId = resultToDelete.value.id

  deleteModal.hide()

  try {
    await $authFetch(`/assignment-results/${resultId}`, {
      method: 'DELETE'
    })

    toastStore.success('Historische Zuweisung wurde gelöscht')

    // Remove from list
    historicalResults.value = historicalResults.value.filter(r => r.id !== resultId)

    // Clear view if we were viewing this result
    if (viewingHistorical.value && currentHistoricalResult.value?.id === resultId) {
      clearHistoricalView()
    }
  } catch (err: any) {
    console.error('Fehler beim Löschen:', err)
    const errorStore = useErrorStore()
    errorStore.show(err?.data?.message ?? 'Fehler beim Löschen der historischen Zuweisung')
  } finally {
    resultToDelete.value = null
  }
}

const markAsFinal = (result: AssignmentResultData) => {
  if (!finalizeModal) return
  resultToFinalize.value = result
  finalizeModal.show()
}

const confirmMarkAsFinal = async () => {
  if (!resultToFinalize.value || !finalizeModal) return

  const resultId = resultToFinalize.value.id

  finalizeModal.hide()

  try {
    const updatedResults = await $authFetch(`/assignment-results/mark-final/${resultId}`, {
      method: 'PUT'
    })

    toastStore.success('Zuweisung wurde als final markiert')

    // Update the list with the returned results
    historicalResults.value = updatedResults

    // If we're viewing this result, update it as well
    if (viewingHistorical.value && currentHistoricalResult.value?.id === resultId) {
      currentHistoricalResult.value = updatedResults.find((r: AssignmentResultData) => r.id === resultId) || currentHistoricalResult.value
    }
  } catch (err: any) {
    console.error('Fehler beim Markieren als final:', err)
    const errorStore = useErrorStore()
    errorStore.show(err?.data?.message ?? 'Fehler beim Markieren der Zuweisung als final')
  } finally {
    resultToFinalize.value = null
  }
}

const formatDateTime = (dateTimeStr: string) => {
  const date = new Date(dateTimeStr)
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (durationMs: number | undefined) => {
  if (!durationMs) return 'n/a'

  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

const calculateAssignmentRate = (result: AssignmentResultData) => {
  if (result.totalStudents === 0) return 0
  return (result.assignedStudents / result.totalStudents) * 100
}

onMounted(() => {
  loadPeriods()

  // Initialize Bootstrap modals
  if (assignmentModalRef.value) {
    assignmentModal = new Modal(assignmentModalRef.value)
  }
  if (deleteModalRef.value) {
    deleteModal = new Modal(deleteModalRef.value)
  }
  if (finalizeModalRef.value) {
    finalizeModal = new Modal(finalizeModalRef.value)
  }
})
</script>

<style scoped>
.spinner-border {
  vertical-align: middle;
}

.list-group-item:hover {
  background-color: #f8f9fa;
}
</style>