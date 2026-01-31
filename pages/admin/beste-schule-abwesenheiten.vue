<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useErrorStore } from '~/stores/error'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: 'admin' })

const { $authFetch } = useNuxtApp() as any
const errorStore = useErrorStore()
const toastStore = useToastStore()

// --- Types ---
interface ApiStatus {
  available: boolean
  service: string
}

interface SyncResult {
  date: string
  totalRelevant: number
  created: number
  errors: number
  message: string | null
  success: boolean
}

interface CleanupResult {
  deletedCount: number
  daysKept: number
}

interface ExternalAbsence {
  id: number
  externalId: number
  studentLocalId: string
  fromDateTime: string
  toDateTime: string
  absenceType: string
  date: string
  fetchedAt: string
}

// --- State ---
const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)
const viewDate = ref(today)
const daysToKeep = ref(7)

const apiStatus = ref<ApiStatus | null>(null)
const loadingStatus = ref(false)

const syncing = ref(false)
const syncResult = ref<SyncResult | null>(null)

const absences = ref<ExternalAbsence[]>([])
const loadingAbsences = ref(false)

const cleaning = ref(false)
const cleanupResult = ref<CleanupResult | null>(null)

// --- Lifecycle ---
onMounted(async () => {
  await checkApiStatus()
  await loadAbsences()
})

// --- Methods ---
async function checkApiStatus() {
  try {
    loadingStatus.value = true
    apiStatus.value = await $authFetch('/external-absences/status')
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Prüfen des API-Status')
    apiStatus.value = { available: false, service: 'Beste.Schule API' }
  } finally {
    loadingStatus.value = false
  }
}

async function startSync() {
  if (!selectedDate.value) return

  try {
    syncing.value = true
    syncResult.value = null

    syncResult.value = await $authFetch(`/external-absences/sync?date=${selectedDate.value}`, {
      method: 'POST'
    })

    if (syncResult.value?.success) {
      toastStore.success(`${syncResult.value.created} Abwesenheiten synchronisiert`)
    } else {
      toastStore.warning('Sync mit Warnungen abgeschlossen')
    }

    // Ansicht aktualisieren wenn gleiches Datum
    if (viewDate.value === selectedDate.value) {
      await loadAbsences()
    }
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Synchronisieren')
  } finally {
    syncing.value = false
  }
}

async function loadAbsences() {
  try {
    loadingAbsences.value = true
    absences.value = await $authFetch(`/external-absences?date=${viewDate.value}`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Abwesenheiten')
  } finally {
    loadingAbsences.value = false
  }
}

async function cleanup() {
  try {
    cleaning.value = true
    cleanupResult.value = null

    cleanupResult.value = await $authFetch(`/external-absences/cleanup?daysToKeep=${daysToKeep.value}`, {
      method: 'DELETE'
    })

    toastStore.success(`${cleanupResult.value?.deletedCount} alte Einträge gelöscht`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Bereinigen')
  } finally {
    cleaning.value = false
  }
}

// --- Formatierung ---
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return '-'
  const date = new Date(dateTimeString)
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function shortenUuid(uuid: string): string {
  if (!uuid) return '-'
  return uuid.substring(0, 8) + '...'
}

function getAbsenceTypeBadgeClass(type: string): string {
  switch (type?.toLowerCase()) {
    case 'krank':
      return 'bg-danger'
    case 'freistellung':
      return 'bg-info'
    case 'fehlend':
      return 'bg-warning text-dark'
    default:
      return 'bg-secondary'
  }
}
</script>

<template>
  <div>
    <!-- Sticky Button-Leiste -->
    <div class="sticky-top bg-white border-bottom py-2 mb-3" style="z-index: 10;">
      <div class="d-flex justify-content-between align-items-center">
        <h4 class="mb-0">
          <i class="bi bi-cloud-download me-2"></i>
          Beste.Schule Abwesenheiten
        </h4>
        <div class="d-flex gap-2">
          <button
              class="btn btn-outline-secondary"
              @click="checkApiStatus"
              :disabled="loadingStatus"
          >
            <span v-if="loadingStatus" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-wifi me-1"></i>
            Status prüfen
          </button>
          <button
              class="btn btn-primary"
              @click="startSync"
              :disabled="syncing || !apiStatus?.available"
          >
            <span v-if="syncing" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-arrow-repeat me-1"></i>
            Sync starten
          </button>
        </div>
      </div>
    </div>

    <!-- API-Status Badge -->
    <div class="mb-3">
      <span v-if="loadingStatus" class="badge bg-secondary">
        <span class="spinner-border spinner-border-sm me-1" style="width: 0.7rem; height: 0.7rem;"></span>
        Prüfe Verbindung...
      </span>
      <span v-else-if="apiStatus?.available" class="badge bg-success">
        <i class="bi bi-check-circle me-1"></i>
        {{ apiStatus.service }} erreichbar
      </span>
      <span v-else-if="apiStatus !== null" class="badge bg-danger">
        <i class="bi bi-x-circle me-1"></i>
        {{ apiStatus?.service ?? 'API' }} nicht erreichbar
      </span>
    </div>

    <!-- Sync-Bereich -->
    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <h5 class="card-title mb-3">
          <i class="bi bi-calendar-event me-2"></i>
          Synchronisation
        </h5>
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-4">
            <label class="form-label">Datum auswählen</label>
            <input
                type="date"
                class="form-control"
                v-model="selectedDate"
                :max="today"
            />
          </div>
          <div class="col-12 col-md-8">
            <div class="form-text">
              Abwesenheiten für das gewählte Datum werden von Beste.Schule abgerufen und lokal gespeichert.
              Der Sync läuft automatisch alle 30 Minuten zwischen 10:00 und 14:00 Uhr.
            </div>
          </div>
        </div>

        <!-- Sync-Ergebnis -->
        <div v-if="syncResult" class="mt-3 p-3 rounded" :class="syncResult.success ? 'bg-success-subtle' : 'bg-warning-subtle'">
          <div class="d-flex align-items-center mb-2">
            <i class="bi me-2" :class="syncResult.success ? 'bi-check-circle text-success' : 'bi-exclamation-triangle text-warning'"></i>
            <strong>Sync-Ergebnis für {{ formatDate(syncResult.date) }}</strong>
          </div>
          <div class="row text-center">
            <div class="col-4">
              <div class="fs-4 fw-bold text-primary">{{ syncResult.totalRelevant }}</div>
              <small class="text-muted">Relevant</small>
            </div>
            <div class="col-4">
              <div class="fs-4 fw-bold text-success">{{ syncResult.created }}</div>
              <small class="text-muted">Importiert</small>
            </div>
            <div class="col-4">
              <div class="fs-4 fw-bold" :class="syncResult.errors > 0 ? 'text-danger' : 'text-muted'">
                {{ syncResult.errors }}
              </div>
              <small class="text-muted">Fehler</small>
            </div>
          </div>
          <div v-if="syncResult.message" class="alert alert-warning mt-2 mb-0 py-2">
            {{ syncResult.message }}
          </div>
        </div>
      </div>
    </div>

    <!-- Gespeicherte Abwesenheiten -->
    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">
            <i class="bi bi-list-ul me-2"></i>
            Gespeicherte Abwesenheiten
          </h5>
          <button class="btn btn-sm btn-outline-secondary" @click="loadAbsences" :disabled="loadingAbsences">
            <span v-if="loadingAbsences" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-arrow-clockwise"></i>
          </button>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-12 col-md-4">
            <label class="form-label">Datum für Anzeige</label>
            <input
                type="date"
                class="form-control"
                v-model="viewDate"
                :max="today"
                @change="loadAbsences"
            />
          </div>
          <div class="col-12 col-md-8 d-flex align-items-end">
            <span class="text-muted">
              <span v-if="loadingAbsences">Lade...</span>
              <span v-else>{{ absences.length }} Abwesenheiten gefunden</span>
            </span>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loadingAbsences" class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="text-muted mt-2 mb-0">Lade Abwesenheiten...</p>
        </div>

        <!-- Keine Daten -->
        <div v-else-if="absences.length === 0" class="alert alert-info mb-0">
          <i class="bi bi-info-circle me-2"></i>
          Keine Abwesenheiten für dieses Datum gespeichert.
        </div>

        <!-- Tabelle -->
        <div v-else class="table-responsive" style="max-height: 400px;">
          <table class="table table-sm table-striped table-hover mb-0">
            <thead class="table-light sticky-top">
            <tr>
              <th>Schüler-ID (SaxSVS)</th>
              <th>Typ</th>
              <th>Von</th>
              <th>Bis</th>
              <th>Importiert</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="absence in absences" :key="absence.id">
              <td>
                <code class="small text-muted">{{ shortenUuid(absence.studentLocalId) }}</code>
              </td>
              <td>
                  <span class="badge" :class="getAbsenceTypeBadgeClass(absence.absenceType)">
                    {{ absence.absenceType }}
                  </span>
              </td>
              <td>{{ formatDateTime(absence.fromDateTime) }}</td>
              <td>{{ formatDateTime(absence.toDateTime) }}</td>
              <td class="text-muted small">{{ formatDateTime(absence.fetchedAt) }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Cleanup-Bereich -->
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">
          <i class="bi bi-trash me-2"></i>
          Alte Daten bereinigen
        </h5>
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-3">
            <label class="form-label">Tage behalten</label>
            <input
                type="number"
                class="form-control"
                v-model.number="daysToKeep"
                min="1"
                max="30"
            />
          </div>
          <div class="col-12 col-md-3">
            <button
                class="btn btn-outline-danger"
                @click="cleanup"
                :disabled="cleaning"
            >
              <span v-if="cleaning" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-trash me-1"></i>
              Bereinigen
            </button>
          </div>
          <div class="col-12 col-md-6">
            <div class="form-text">
              Löscht alle Abwesenheiten, die älter als {{ daysToKeep }} Tage sind.
              Der Cleanup läuft automatisch täglich um 2:00 Uhr.
            </div>
          </div>
        </div>

        <div v-if="cleanupResult" class="alert alert-success mt-3 mb-0 py-2">
          <i class="bi bi-check-circle me-2"></i>
          {{ cleanupResult.deletedCount }} Einträge gelöscht (älter als {{ cleanupResult.daysKept }} Tage)
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-responsive {
  max-height: 400px;
  overflow-y: auto;
}

.table thead.sticky-top th {
  background-color: var(--bs-table-bg);
}

code.small {
  font-size: 0.75rem;
}
</style>