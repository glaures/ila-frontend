<template>
  <div class="instructor-attendance">
    <h2 class="h5 mb-3">Anwesenheiten erfassen</h2>

    <!-- Schritt 1: Kursauswahl -->
    <div class="card mb-3">
      <div class="card-body">
        <label class="form-label fw-bold">Kurs auswählen:</label>
        <select
            v-model="selectedCourse"
            class="form-select form-select-lg"
            @change="onCourseChange"
            :disabled="loadingCourses"
        >
          <option :value="null">Bitte Kurs wählen...</option>
          <option
              v-for="course in instructorCourses"
              :key="course.id"
              :value="course"
          >
            {{ course.name }}<template v-if="course.block"> - {{ formatBlock(course.block) }}</template>
          </option>
        </select>
      </div>
    </div>

    <!-- Loading Spinner für Kurse -->
    <div v-if="loadingCourses" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Lade...</span>
      </div>
      <p class="text-muted mt-2">Lade Kurse...</p>
    </div>

    <!-- Schritt 2: Terminauswahl (wenn Kurs gewählt und keine Session aktiv) -->
    <template v-else-if="selectedCourse && !selectedSession">
      <!-- Neuen Termin erstellen -->
      <div class="card mb-3">
        <div class="card-header bg-primary text-white">
          <i class="bi bi-plus-circle me-2"></i>
          Neuen Termin erstellen
        </div>
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col">
              <label class="form-label">Datum</label>
              <input
                  type="date"
                  class="form-control form-control-lg"
                  v-model="newSessionDate"
                  :max="today"
              >
            </div>
            <div class="col-auto">
              <button
                  class="btn btn-primary btn-lg"
                  @click="createSession"
                  :disabled="!newSessionDate || creatingSession"
              >
                <span v-if="creatingSession" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-plus-lg me-1"></i>
                Erstellen
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Spinner für Sessions -->
      <div v-if="loadingSessions" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Lade...</span>
        </div>
        <p class="text-muted mt-2">Lade Termine...</p>
      </div>

      <!-- Bestehende Termine -->
      <div v-else-if="sessions.length > 0">
        <h6 class="mb-2">
          <i class="bi bi-calendar-check me-2"></i>
          Bestehende Termine ({{ sessions.length }})
        </h6>
        <div class="list-group">
          <div
              v-for="session in sessions"
              :key="session.id"
              class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              @click="selectSession(session)"
              style="cursor: pointer;"
          >
            <div>
              <strong>{{ formatDate(session.date) }}</strong>
              <br>
              <small class="text-muted">
                <span class="text-success">{{ session.presentCount }} anwesend</span>
                <span v-if="session.absentCount > 0" class="text-danger ms-2">{{ session.absentCount }} abwesend</span>
              </small>
            </div>
            <i class="bi bi-chevron-right text-muted"></i>
          </div>
        </div>
      </div>

      <!-- Keine Termine -->
      <div v-else class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i>
        Noch keine Termine erfasst. Erstellen Sie einen neuen Termin oben.
      </div>
    </template>

    <!-- Schritt 3: Anwesenheiten erfassen (wenn Session aktiv) -->
    <template v-else-if="selectedSession">
      <!-- Zurück-Button und Session-Info -->
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <button class="btn btn-outline-secondary btn-sm me-2" @click="backToSessions">
                <i class="bi bi-arrow-left"></i>
                Zurück
              </button>
              <strong>{{ formatDate(selectedSession.date) }}</strong>
            </div>
            <button
                class="btn btn-outline-danger btn-sm"
                @click="confirmDeleteSession"
                :disabled="deletingSession"
            >
              <span v-if="deletingSession" class="spinner-border spinner-border-sm"></span>
              <i v-else class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Statistik -->
      <div class="card mb-3">
        <div class="card-body">
          <div class="row g-2 text-center">
            <div class="col-4">
              <small class="text-muted d-block">Gesamt</small>
              <strong>{{ entries.length }}</strong>
            </div>
            <div class="col-4">
              <small class="text-muted d-block">Anwesend</small>
              <strong class="text-success">{{ presentCount }}</strong>
            </div>
            <div class="col-4">
              <small class="text-muted d-block">Abwesend</small>
              <strong class="text-danger">{{ absentCount }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Spinner für Entries -->
      <div v-if="loadingEntries" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Lade...</span>
        </div>
        <p class="text-muted mt-2">Lade Teilnehmer...</p>
      </div>

      <!-- Teilnehmerliste mit Anwesenheitsstatus -->
      <div v-else-if="entries.length > 0" class="attendee-list">
        <div class="card mb-2" v-for="entry in sortedEntries" :key="entry.userName">
          <div class="card-body py-2">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>{{ entry.firstName }} {{ entry.lastName }}</strong>
                <br>
                <small class="text-muted">Klasse {{ entry.grade }}</small>
              </div>
              <div class="form-check form-switch">
                <input
                    class="form-check-input"
                    type="checkbox"
                    :id="`attendance-${entry.userName}`"
                    v-model="entry.present"
                    @change="markDirty"
                    style="width: 3rem; height: 1.5rem;"
                >
                <label
                    class="form-check-label ms-2"
                    :for="`attendance-${entry.userName}`"
                >
                  <span :class="entry.present ? 'text-success' : 'text-danger'">
                    {{ entry.present ? 'Anwesend' : 'Abwesend' }}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Keine Teilnehmer -->
      <div v-else class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Keine Teilnehmer für diesen Kurs gefunden.
      </div>

      <!-- Speichern-Button (sticky am unteren Rand) -->
      <div v-if="entries.length > 0" class="sticky-bottom bg-white py-3 border-top">
        <button
            class="btn btn-success btn-lg w-100"
            @click="saveEntries"
            :disabled="!isDirty || savingEntries"
        >
          <span v-if="savingEntries" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-check-lg me-2"></i>
          {{ isDirty ? 'Änderungen speichern' : 'Keine Änderungen' }}
        </button>
      </div>
    </template>

    <!-- Leerer Zustand -->
    <div v-else-if="!loadingCourses && !selectedCourse" class="text-center py-5">
      <i class="bi bi-arrow-up fs-1 text-muted"></i>
      <p class="text-muted mt-3">Bitte wählen Sie zunächst einen Kurs aus.</p>
    </div>

    <!-- Bestätigungs-Modal für Löschen -->
    <div ref="deleteModal" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Termin löschen
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body">
            <p>Möchten Sie diesen Termin wirklich löschen?</p>
            <div class="alert alert-secondary" v-if="selectedSession">
              <strong>{{ formatDate(selectedSession.date) }}</strong>
              <br>
              <small class="text-muted">Alle Anwesenheitsdaten für diesen Termin werden gelöscht.</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Abbrechen
            </button>
            <button
                type="button"
                class="btn btn-danger"
                @click="deleteSession"
                :disabled="deletingSession"
            >
              <span v-if="deletingSession">
                <span class="spinner-border spinner-border-sm me-1"></span>
                Lösche...
              </span>
              <span v-else>
                <i class="bi bi-trash me-1"></i>
                Löschen
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '~/stores/toast'
import { useErrorStore } from '~/stores/error'
import { weekdayLabels } from '~/utils/weekdays'

definePageMeta({
  layout: 'instructor'
})

const { $authFetch } = useNuxtApp()
const toastStore = useToastStore()
const errorStore = useErrorStore()

// Interfaces
interface Course {
  id: number
  name: string
  block: {
    id: number
    dayOfWeek: string
    startTime: string
    endTime: string
  } | null
}

interface AttendanceSession {
  id: number
  courseId: number
  date: string
  notes: string | null
  presentCount: number
  absentCount: number
  totalCount: number
}

interface AttendanceEntry {
  id: number
  userName: string
  firstName: string
  lastName: string
  grade: number
  present: boolean
  note: string | null
}

// State
const instructorCourses = ref<Course[]>([])
const selectedCourse = ref<Course | null>(null)
const sessions = ref<AttendanceSession[]>([])
const selectedSession = ref<AttendanceSession | null>(null)
const entries = ref<AttendanceEntry[]>([])
const newSessionDate = ref('')
const isDirty = ref(false)

// Loading States
const loadingCourses = ref(false)
const loadingSessions = ref(false)
const loadingEntries = ref(false)
const creatingSession = ref(false)
const savingEntries = ref(false)
const deletingSession = ref(false)

// Modal
const deleteModal = ref<HTMLElement | null>(null)
let deleteModalInstance: any = null

// Computed
const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const presentCount = computed(() => entries.value.filter(e => e.present).length)
const absentCount = computed(() => entries.value.filter(e => !e.present).length)

const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => {
    const firstNameCompare = a.firstName.localeCompare(b.firstName, 'de')
    if (firstNameCompare !== 0) return firstNameCompare
    return a.lastName.localeCompare(b.lastName, 'de')
  })
})

// Lifecycle
onMounted(async () => {
  // Bootstrap Modal initialisieren
  if (process.client && deleteModal.value) {
    const { Modal } = await import('bootstrap')
    deleteModalInstance = new Modal(deleteModal.value)
  }

  await loadCourses()
})

// Methods
async function loadCourses() {
  try {
    loadingCourses.value = true
    instructorCourses.value = await $authFetch('/courses/instructedbyme')

    // Automatisch auswählen wenn nur ein Kurs
    if (instructorCourses.value.length === 1) {
      selectedCourse.value = instructorCourses.value[0]
      await loadSessions()
    }
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Kurse')
  } finally {
    loadingCourses.value = false
  }
}

async function onCourseChange() {
  selectedSession.value = null
  entries.value = []
  sessions.value = []
  isDirty.value = false

  if (selectedCourse.value) {
    await loadSessions()
  }
}

async function loadSessions() {
  if (!selectedCourse.value) return

  try {
    loadingSessions.value = true
    sessions.value = await $authFetch(`/attendance/sessions?course-id=${selectedCourse.value.id}`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Termine')
  } finally {
    loadingSessions.value = false
  }
}

async function createSession() {
  if (!selectedCourse.value || !newSessionDate.value) return

  try {
    creatingSession.value = true
    const newSession: AttendanceSession = await $authFetch('/attendance/sessions', {
      method: 'POST',
      body: {
        courseId: selectedCourse.value.id,
        date: newSessionDate.value,
        notes: null
      }
    })

    toastStore.success('Termin erstellt')
    newSessionDate.value = ''

    // Direkt zur Anwesenheitserfassung wechseln
    selectedSession.value = newSession
    await loadEntries()

    // Sessions-Liste aktualisieren
    await loadSessions()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Erstellen des Termins')
  } finally {
    creatingSession.value = false
  }
}

async function selectSession(session: AttendanceSession) {
  selectedSession.value = session
  await loadEntries()
}

async function loadEntries() {
  if (!selectedSession.value) return

  try {
    loadingEntries.value = true
    entries.value = await $authFetch(`/attendance/sessions/${selectedSession.value.id}/entries`)
    isDirty.value = false
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Teilnehmer')
  } finally {
    loadingEntries.value = false
  }
}

function markDirty() {
  isDirty.value = true
}

async function saveEntries() {
  if (!selectedSession.value || !isDirty.value) return

  try {
    savingEntries.value = true

    const updateRequests = entries.value.map(e => ({
      userName: e.userName,
      present: e.present,
      note: e.note
    }))

    await $authFetch(`/attendance/sessions/${selectedSession.value.id}/entries`, {
      method: 'PUT',
      body: updateRequests
    })

    isDirty.value = false
    toastStore.success('Anwesenheiten gespeichert')

    // Session-Statistik aktualisieren
    await loadSessions()

    // Aktuelle Session aktualisieren
    const updatedSession = sessions.value.find(s => s.id === selectedSession.value?.id)
    if (updatedSession) {
      selectedSession.value = updatedSession
    }
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Speichern')
  } finally {
    savingEntries.value = false
  }
}

function confirmDeleteSession() {
  if (deleteModalInstance) {
    deleteModalInstance.show()
  }
}

async function deleteSession() {
  if (!selectedSession.value) return

  try {
    deletingSession.value = true

    await $authFetch(`/attendance/sessions/${selectedSession.value.id}`, {
      method: 'DELETE'
    })

    toastStore.success('Termin gelöscht')

    // Modal schließen
    if (deleteModalInstance) {
      deleteModalInstance.hide()
    }

    // Zurück zur Terminliste
    selectedSession.value = null
    entries.value = []
    await loadSessions()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Löschen')
  } finally {
    deletingSession.value = false
  }
}

function backToSessions() {
  if (isDirty.value) {
    if (!confirm('Sie haben ungespeicherte Änderungen. Wirklich zurück?')) {
      return
    }
  }
  selectedSession.value = null
  entries.value = []
  isDirty.value = false
}

// Formatierungsfunktionen
function formatBlock(block: Course['block']) {
  if (!block) return ''
  const day = weekdayLabels[block.dayOfWeek] || block.dayOfWeek
  return `${day} ${block.startTime}-${block.endTime}`
}

function formatDate(dateString: string) {
  // Backend liefert Format "dd.MM.yyyy", JavaScript erwartet ISO oder andere Formate
  const parts = dateString.split('.')
  if (parts.length === 3) {
    // Deutsches Format: dd.MM.yyyy -> zu Date konvertieren
    const [day, month, year] = parts
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Fallback für ISO-Format oder andere
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return dateString // Falls nicht parsbar, Original zurückgeben
  }
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>

<style scoped>
.instructor-attendance {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 80px; /* Platz für sticky button */
}

.list-group-item {
  border-left: 4px solid #667eea;
}

.list-group-item-action:hover {
  background-color: #f8f9fa;
}

.list-group-item-action:active {
  transform: scale(0.98);
}

.attendee-list .card {
  border-left: 4px solid #667eea;
}

.form-check-input {
  cursor: pointer;
}

.form-check-input:checked {
  background-color: #28a745;
  border-color: #28a745;
}

.sticky-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 600px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
}

/* Mobile Optimierungen */
@media (max-width: 576px) {
  .card-body {
    padding: 1rem;
  }
}
</style>