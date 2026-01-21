<template>
  <div class="instructor-assignments">
    <h2 class="h5 mb-3">Manuelle Kurszuweisungen</h2>

    <!-- Kursauswahl -->
    <div class="card mb-3">
      <div class="card-body">
        <label class="form-label fw-bold">Kurs auswählen:</label>
        <select
            v-model="selectedCourse"
            class="form-select form-select-lg"
            @change="loadCourseData"
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

    <!-- Kursinfo -->
    <div v-if="selectedCourse" class="card mb-3">
      <div class="card-body">
        <div class="row g-2">
          <div class="col-6">
            <small class="text-muted d-block">Belegung:</small>
            <strong>{{ currentAssignments.length }} / {{ selectedCourse.maxAttendees }}</strong>
          </div>
          <div class="col-6">
            <small class="text-muted d-block">Freie Plätze:</small>
            <strong class="text-success">{{ selectedCourse.maxAttendees - currentAssignments.length }}</strong>
          </div>
        </div>
        <div class="progress mt-2" style="height: 8px;">
          <div
              class="progress-bar"
              :class="progressBarColor"
              :style="{ width: `${(currentAssignments.length / selectedCourse.maxAttendees) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Loading Spinner -->
    <div v-if="loading && selectedCourse" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Lade...</span>
      </div>
      <p class="text-muted mt-2">Lade Teilnehmer...</p>
    </div>

    <!-- Zugewiesene Schüler -->
    <div v-else-if="selectedCourse && currentAssignments.length > 0" class="mb-4">
      <h6 class="mb-2">
        <i class="bi bi-check-circle text-success"></i>
        Zugewiesene Schüler ({{ currentAssignments.length }})
      </h6>
      <div class="list-group">
        <div
            v-for="assignment in sortedAssignments"
            :key="assignment.id"
            class="list-group-item d-flex justify-content-between align-items-center"
        >
          <div>
            <strong>{{ assignment.firstName }} {{ assignment.lastName }}</strong>
            <br>
            <small class="text-muted">Klasse {{ assignment.grade }}</small>
          </div>
          <button
              class="btn btn-sm btn-outline-danger"
              @click="removeStudent(assignment)"
              :disabled="removing === assignment.id"
          >
            <span v-if="removing === assignment.id" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Keine Teilnehmer -->
    <div v-else-if="selectedCourse && !loading && currentAssignments.length === 0" class="alert alert-info mb-4">
      <i class="bi bi-info-circle me-2"></i>
      Dieser Kurs hat noch keine Teilnehmer.
    </div>

    <!-- Schüler hinzufügen -->
    <div v-if="selectedCourse && !loading && canAddStudents" class="card">
      <div class="card-header bg-primary text-white">
        <i class="bi bi-person-plus"></i>
        Schüler hinzufügen
      </div>
      <div class="card-body">
        <!-- Suchfeld -->
        <div class="mb-3">
          <input
              v-model="searchQuery"
              type="text"
              class="form-control form-control-lg"
              placeholder="Schüler suchen (Name oder Klasse)..."
              @input="filterAvailableStudents"
              :disabled="loadingUsers || adding"
          >
          <div v-if="loadingUsers" class="form-text">
            <span class="spinner-border spinner-border-sm me-1"></span>
            Lade Benutzer...
          </div>
        </div>

        <!-- Verfügbare Schüler -->
        <div v-if="filteredStudents.length > 0" class="available-students">
          <div
              v-for="student in filteredStudents"
              :key="student.userName"
              class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              @click="addStudent(student)"
              :class="{ 'disabled': adding }"
              style="cursor: pointer;"
          >
            <div>
              <strong>{{ student.firstName }} {{ student.lastName }}</strong>
              <br>
              <small class="text-muted">Klasse {{ student.grade }} · {{ student.userName }}</small>
            </div>
            <i class="bi bi-plus-circle fs-4 text-primary"></i>
          </div>
        </div>

        <div v-else-if="searchQuery && !loadingUsers" class="text-center py-4 text-muted">
          <i class="bi bi-search fs-1"></i>
          <p class="mt-2">Keine Schüler gefunden.</p>
        </div>

        <div v-else-if="!loadingUsers" class="text-center py-4 text-muted">
          <i class="bi bi-arrow-up fs-1"></i>
          <p class="mt-2">Geben Sie einen Suchbegriff ein.</p>
        </div>
      </div>
    </div>

    <!-- Kurs voll -->
    <div v-if="selectedCourse && !loading && !canAddStudents" class="alert alert-warning">
      <i class="bi bi-exclamation-triangle"></i>
      Der Kurs ist voll belegt. Sie können keine weiteren Schüler hinzufügen.
    </div>

    <!-- Leerer Zustand -->
    <div v-if="!selectedCourse" class="text-center py-5">
      <i class="bi bi-arrow-up fs-1 text-muted"></i>
      <p class="text-muted mt-3">Bitte wählen Sie zunächst einen Kurs aus.</p>
    </div>

    <!-- Bestätigungs-Modal -->
    <div ref="deleteModal" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Teilnehmer entfernen
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body" v-if="assignmentToRemove">
            <p>Möchten Sie folgenden Schüler wirklich aus dem Kurs entfernen?</p>
            <div class="alert alert-secondary">
              <strong>{{ assignmentToRemove.firstName }} {{ assignmentToRemove.lastName }}</strong>
              <br>
              <small class="text-muted">Klasse {{ assignmentToRemove.grade }}</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Abbrechen
            </button>
            <button
                type="button"
                class="btn btn-danger"
                @click="confirmRemoveStudent"
                :disabled="removing !== null"
            >
              <span v-if="removing !== null">
                <span class="spinner-border spinner-border-sm me-1"></span>
                Entferne...
              </span>
              <span v-else>
                <i class="bi bi-trash me-1"></i>
                Entfernen
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

interface Course {
  id: number
  courseId: string
  name: string
  maxAttendees: number
  block: {
    id: number
    dayOfWeek: string
    startTime: string
    endTime: string
  } | null
}

interface Assignment {
  id: number
  userUserName: string
  firstName: string
  lastName: string
  grade: number
}

interface User {
  userName: string
  firstName: string
  lastName: string
  grade: number
}

interface Feedback {
  errors?: string[]
  warnings?: string[]
  info?: string[]
}

const instructorCourses = ref<Course[]>([])
const selectedCourse = ref<Course | null>(null)
const currentAssignments = ref<Assignment[]>([])
const allUsers = ref<User[]>([])
const filteredStudents = ref<User[]>([])
const searchQuery = ref('')
const loading = ref(false)
const loadingUsers = ref(false)
const adding = ref(false)
const removing = ref<number | null>(null)

// Modal
const deleteModal = ref<HTMLElement | null>(null)
const assignmentToRemove = ref<Assignment | null>(null)
let deleteModalInstance: any = null

const canAddStudents = computed(() => {
  if (!selectedCourse.value) return false
  return currentAssignments.value.length < selectedCourse.value.maxAttendees
})

const progressBarColor = computed(() => {
  if (!selectedCourse.value) return 'bg-primary'
  const percentage = (currentAssignments.value.length / selectedCourse.value.maxAttendees) * 100
  if (percentage >= 90) return 'bg-danger'
  if (percentage >= 70) return 'bg-warning'
  return 'bg-success'
})

// Sortierte Zuweisungen (nach Vorname, dann Nachname)
const sortedAssignments = computed(() => {
  return [...currentAssignments.value].sort((a, b) => {
    const firstNameCompare = a.firstName.localeCompare(b.firstName, 'de')
    if (firstNameCompare !== 0) return firstNameCompare
    return a.lastName.localeCompare(b.lastName, 'de')
  })
})

// Kurse des Kursleiters und alle Benutzer laden
onMounted(async () => {
  // Bootstrap Modal initialisieren
  if (process.client && deleteModal.value) {
    const { Modal } = await import('bootstrap')
    deleteModalInstance = new Modal(deleteModal.value)
  }

  try {
    loading.value = true
    loadingUsers.value = true

    const [courses, users] = await Promise.all([
      $authFetch('/courses/instructedbyme'),
      $authFetch('/users')
    ])

    instructorCourses.value = courses
    allUsers.value = users
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Daten')
  } finally {
    loading.value = false
    loadingUsers.value = false
  }
})

// Kursdaten laden (Zuweisungen)
const loadCourseData = async () => {
  if (!selectedCourse.value) {
    currentAssignments.value = []
    filteredStudents.value = []
    searchQuery.value = ''
    return
  }

  try {
    loading.value = true
    currentAssignments.value = await $authFetch(`/assignments?course-id=${selectedCourse.value.id}`)
    searchQuery.value = ''
    filteredStudents.value = []
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Teilnehmer')
  } finally {
    loading.value = false
  }
}

// Schüler filtern basierend auf Suchbegriff
const filterAvailableStudents = () => {
  if (!searchQuery.value.trim()) {
    filteredStudents.value = []
    return
  }

  const query = searchQuery.value.toLowerCase()

  // Bereits zugewiesene Benutzer ausfiltern
  const assignedUserNames = new Set(currentAssignments.value.map(a => a.userUserName))

  filteredStudents.value = allUsers.value
      .filter(user => {
        // Bereits zugewiesene ausschließen
        if (assignedUserNames.has(user.userName)) return false

        // Nach Name oder Klasse suchen
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
        const grade = user.grade.toString()
        return fullName.includes(query) || grade.includes(query) || user.userName.toLowerCase().includes(query)
      })
      .slice(0, 20) // Maximal 20 Ergebnisse anzeigen
}

// Schüler zum Kurs hinzufügen
const addStudent = async (student: User) => {
  if (!selectedCourse.value || !canAddStudents.value) return

  try {
    adding.value = true

    const feedback: Feedback = await $authFetch('/assignments', {
      method: 'POST',
      body: {
        userName: student.userName,
        courseId: selectedCourse.value.courseId
      }
    })

    // Feedback verarbeiten
    if (feedback.errors && feedback.errors.length > 0) {
      feedback.errors.forEach(err => errorStore.show(err))
    } else {
      if (feedback.warnings && feedback.warnings.length > 0) {
        feedback.warnings.forEach(warn => toastStore.warning(warn))
      }
      if (feedback.info && feedback.info.length > 0) {
        feedback.info.forEach(info => toastStore.info(info))
      }

      toastStore.success(`${student.firstName} ${student.lastName} wurde dem Kurs zugewiesen`)
      searchQuery.value = ''
      filteredStudents.value = []
      await loadCourseData()
    }
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Zuweisen des Schülers')
  } finally {
    adding.value = false
  }
}

// Dialog zum Entfernen eines Schülers öffnen
const removeStudent = (assignment: Assignment) => {
  assignmentToRemove.value = assignment
  if (deleteModalInstance) {
    deleteModalInstance.show()
  }
}

// Schüler aus Kurs entfernen (nach Bestätigung)
const confirmRemoveStudent = async () => {
  if (!selectedCourse.value || !assignmentToRemove.value) return

  try {
    removing.value = assignmentToRemove.value.id

    await $authFetch(`/assignments/${assignmentToRemove.value.id}`, {
      method: 'DELETE'
    })

    toastStore.success(`${assignmentToRemove.value.firstName} ${assignmentToRemove.value.lastName} wurde aus dem Kurs entfernt`)

    // Modal schließen
    if (deleteModalInstance) {
      deleteModalInstance.hide()
    }

    await loadCourseData()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Entfernen des Schülers')
  } finally {
    removing.value = null
    assignmentToRemove.value = null
  }
}

// Block formatieren
const formatBlock = (block: Course['block']) => {
  if (!block) return ''
  const day = weekdayLabels[block.dayOfWeek] || block.dayOfWeek
  return `${day} ${block.startTime}-${block.endTime}`
}
</script>

<style scoped>
.instructor-assignments {
  max-width: 600px;
  margin: 0 auto;
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

.list-group-item-action.disabled {
  pointer-events: none;
  opacity: 0.6;
}

.available-students {
  max-height: 400px;
  overflow-y: auto;
}

/* Touch-optimierte Klickflächen */
.list-group-item,
.btn {
  min-height: 44px;
  touch-action: manipulation;
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

  .list-group-item {
    padding: 0.75rem;
  }
}
</style>