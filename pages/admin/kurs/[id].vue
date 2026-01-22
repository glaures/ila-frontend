<template>
  <div class="container-fluid py-3">
    <!-- Header mit Navigation -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h4 m-0">
        <i class="bi bi-book me-2"></i>
        {{ course?.name || 'Lade Kurs...' }}
      </h1>
      <div>
        <button class="btn btn-outline-secondary" @click="$router.back()">
          <i class="bi bi-arrow-left me-1"></i>
          Zurück
        </button>
      </div>
    </div>

    <!-- Kursdetails -->
    <div class="card mb-3">
      <div class="card-header">
        <h5 class="mb-0">Kursdetails</h5>
      </div>
      <div class="card-body" v-if="course">
        <div class="row">
          <div class="col-md-6">
            <p><strong>Kurs-ID:</strong> {{ course.courseId }}</p>
            <p><strong>Kursleitung:</strong> {{ course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}` : 'N/A' }}</p>
            <p><strong>Raum:</strong> {{ course.room || 'N/A' }}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Min. Schüler:innen:</strong> {{ course.minAttendees }}</p>
            <p><strong>Max. Schüler:innen:</strong> {{ course.maxAttendees }}</p>
            <p><strong>Aktuelle Schüler:innen:</strong>
              <span :class="participantCountClass">{{ assignments.length }}</span>
            </p>
          </div>
        </div>
        <div class="row" v-if="course.description">
          <div class="col-12">
            <p><strong>Beschreibung:</strong></p>
            <p class="text-muted">{{ course.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Schüler:innen-Verwaltung -->
    <div class="row">
      <!-- Schüler:innen-Liste -->
      <div class="col-lg-7">
        <div class="card">
          <div class="card-header">
            <div class="d-flex align-items-center justify-content-between">
              <h5 class="mb-0">
                <i class="bi bi-people me-2"></i>
                Schüler:innen ({{ assignments.length }})
              </h5>
              <button class="btn btn-sm btn-outline-secondary" @click="loadAssignments">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <div v-if="loading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Lade...</span>
              </div>
            </div>

            <div v-else-if="assignments.length === 0" class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Dieser Kurs hat noch keine Schüler:innen.
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover">
                <thead>
                <tr>
                  <th>Username</th>
                  <th>Vorname</th>
                  <th>Nachname</th>
                  <th class="text-end">Aktionen</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="assignment in sortedAssignments" :key="assignment.id">
                  <td>{{ assignment.userUserName }}<br><span class="text-muted small">Klasse {{ assignment.grade }}</span></td>
                  <td>{{ assignment.firstName }}</td>
                  <td>{{ assignment.lastName }}</td>
                  <td class="text-end">
                    <button
                        class="btn btn-sm btn-danger"
                        @click="confirmRemoveParticipant(assignment)"
                        :disabled="removing === assignment.id"
                    >
                      <span v-if="removing === assignment.id">
                        <span class="spinner-border spinner-border-sm me-1"></span>
                      </span>
                      <i v-else class="bi bi-trash"></i>
                      Entfernen
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Ausgeschlossene Schüler:innen -->
        <div class="card mt-3">
          <div class="card-header">
            <div class="d-flex align-items-center justify-content-between">
              <h5 class="mb-0">
                <i class="bi bi-person-x me-2"></i>
                Ausgeschlossene Schüler:innen ({{ exclusions.length }})
              </h5>
              <button class="btn btn-sm btn-outline-secondary" @click="loadExclusions">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <div v-if="loadingExclusions" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Lade...</span>
              </div>
            </div>

            <div v-else-if="exclusions.length === 0" class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Keine Schüler:innen von diesem Kurs ausgeschlossen.
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover">
                <thead>
                <tr>
                  <th>Name</th>
                  <th>Klasse</th>
                  <th>Grund</th>
                  <th class="text-end">Aktionen</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="exclusion in sortedExclusions" :key="exclusion.id">
                  <td>
                    <strong>{{ exclusion.user.firstName }} {{ exclusion.user.lastName }}</strong>
                    <br>
                    <small class="text-muted">{{ exclusion.user.userName }}</small>
                  </td>
                  <td>
                    <span class="badge bg-info">{{ exclusion.user.grade }}</span>
                  </td>
                  <td>
                    <span v-if="exclusion.reason" class="text-muted">{{ exclusion.reason }}</span>
                    <span v-else class="text-muted fst-italic">—</span>
                  </td>
                  <td class="text-end">
                    <button
                        class="btn btn-sm btn-outline-success"
                        @click="removeExclusion(exclusion)"
                        :disabled="removingExclusion === exclusion.id"
                        title="Ausschluss aufheben"
                    >
                      <span v-if="removingExclusion === exclusion.id">
                        <span class="spinner-border spinner-border-sm"></span>
                      </span>
                      <i v-else class="bi bi-person-check"></i>
                      Freigeben
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Aktionen Sidebar -->
      <div class="col-lg-5">
        <!-- Schüler:in hinzufügen -->
        <div class="card mb-3">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-person-plus me-2"></i>
              Schüler:in hinzufügen
            </h5>
          </div>
          <div class="card-body">
            <form @submit.prevent="addParticipant">
              <div class="mb-3">
                <label for="userSearch" class="form-label">Schüler:in suchen</label>
                <div class="position-relative">
                  <input
                      type="text"
                      class="form-control"
                      id="userSearch"
                      v-model="newParticipant.searchQuery"
                      @input="onSearchInput"
                      @focus="onSearchInput"
                      @blur="closeDropdown"
                      placeholder="Name oder Username eingeben..."
                      autocomplete="off"
                      :disabled="loadingUsers"
                  >
                  <div
                      v-if="newParticipant.showDropdown && filteredUsers.length > 0"
                      class="dropdown-menu show w-100 shadow"
                      style="max-height: 300px; overflow-y: auto;"
                  >
                    <button
                        v-for="user in filteredUsers"
                        :key="user.userName"
                        type="button"
                        class="dropdown-item"
                        @click="selectUser(user)"
                    >
                      <div class="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{{ user.lastName }}, {{ user.firstName }}</strong>
                          <br>
                          <small class="text-muted">{{ user.userName }}</small>
                        </div>
                        <span class="badge bg-secondary">Klasse {{ user.grade }}</span>
                      </div>
                    </button>
                  </div>
                  <div
                      v-if="newParticipant.showDropdown && newParticipant.searchQuery && filteredUsers.length === 0"
                      class="dropdown-menu show w-100"
                  >
                    <div class="dropdown-item text-muted">
                      <i class="bi bi-search me-2"></i>
                      Keine Schüler:innen gefunden
                    </div>
                  </div>
                </div>
                <div class="form-text">
                  {{ loadingUsers ? 'Lade Schüler:innen...' : 'Suche nach Name oder Username' }}
                </div>
              </div>
              <button
                  type="submit"
                  class="btn btn-primary w-100"
                  :disabled="adding || !newParticipant.userName || loadingUsers"
              >
                <span v-if="adding">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  Füge hinzu...
                </span>
                <span v-else>
                  <i class="bi bi-plus-circle me-2"></i>
                  Schüler:in hinzufügen
                </span>
              </button>
            </form>
          </div>
        </div>

        <!-- Schüler:in ausschließen -->
        <div class="card mb-3">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-person-x me-2"></i>
              Schüler:in ausschließen
            </h5>
          </div>
          <div class="card-body">
            <form @submit.prevent="addExclusion">
              <div class="mb-3">
                <label for="exclusionSearch" class="form-label">Schüler:in suchen</label>
                <div class="position-relative">
                  <input
                      type="text"
                      class="form-control"
                      id="exclusionSearch"
                      v-model="newExclusion.searchQuery"
                      @input="onExclusionSearchInput"
                      @focus="onExclusionSearchInput"
                      @blur="closeExclusionDropdown"
                      placeholder="Name oder Username eingeben..."
                      autocomplete="off"
                      :disabled="loadingUsers"
                  >
                  <div
                      v-if="newExclusion.showDropdown && filteredUsersForExclusion.length > 0"
                      class="dropdown-menu show w-100 shadow"
                      style="max-height: 300px; overflow-y: auto;"
                  >
                    <button
                        v-for="user in filteredUsersForExclusion"
                        :key="user.userName"
                        type="button"
                        class="dropdown-item"
                        @click="selectUserForExclusion(user)"
                    >
                      <div class="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{{ user.lastName }}, {{ user.firstName }}</strong>
                          <br>
                          <small class="text-muted">{{ user.userName }}</small>
                        </div>
                        <span class="badge bg-secondary">Klasse {{ user.grade }}</span>
                      </div>
                    </button>
                  </div>
                  <div
                      v-if="newExclusion.showDropdown && newExclusion.searchQuery && filteredUsersForExclusion.length === 0"
                      class="dropdown-menu show w-100"
                  >
                    <div class="dropdown-item text-muted">
                      <i class="bi bi-search me-2"></i>
                      Keine Schüler:innen gefunden
                    </div>
                  </div>
                </div>
                <div class="form-text">
                  Suche nach Schüler:innen, die von diesem Kurs ausgeschlossen werden sollen
                </div>
              </div>
              <div class="mb-3">
                <label for="exclusionReason" class="form-label">Grund (optional)</label>
                <input
                    type="text"
                    class="form-control"
                    id="exclusionReason"
                    v-model="newExclusion.reason"
                    placeholder="z.B. Konflikt mit anderem Kurs"
                >
              </div>
              <button
                  type="submit"
                  class="btn btn-warning w-100"
                  :disabled="addingExclusion || !newExclusion.userName || loadingUsers"
              >
                <span v-if="addingExclusion">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  Schließe aus...
                </span>
                <span v-else>
                  <i class="bi bi-person-x me-2"></i>
                  Schüler:in ausschließen
                </span>
              </button>
              <div class="form-text mt-2">
                Ausgeschlossene Schüler:innen können diesem Kurs nicht zugewiesen werden.
              </div>
            </form>
          </div>
        </div>

        <!-- Schüler:innen von anderem Kurs kopieren -->
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">
              <i class="bi bi-copy me-2"></i>
              Schüler:innen kopieren
            </h5>
          </div>
          <div class="card-body">
            <form @submit.prevent="copyParticipants">
              <div class="mb-3">
                <label for="period" class="form-label">Periode wählen</label>
                <select
                    class="form-select"
                    id="period"
                    v-model="copyForm.selectedPeriodId"
                    @change="loadCoursesForPeriod"
                    required
                >
                  <option value="">-- Bitte wählen --</option>
                  <option v-for="period in periods" :key="period.id" :value="period.id">
                    {{ period.name }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label for="sourceCourse" class="form-label">Quellkurs wählen</label>
                <select
                    class="form-select"
                    id="sourceCourse"
                    v-model="copyForm.selectedCourseId"
                    :disabled="!copyForm.selectedPeriodId || loadingCourses"
                    required
                >
                  <option value="">-- Bitte wählen --</option>
                  <option v-for="c in availableCourses" :key="c.id" :value="c.id">
                    {{ c.name }} ({{ c.courseId }})
                  </option>
                </select>
                <div v-if="loadingCourses" class="form-text">
                  <span class="spinner-border spinner-border-sm me-1"></span>
                  Lade Kurse...
                </div>
              </div>

              <button
                  type="submit"
                  class="btn btn-secondary w-100"
                  :disabled="copying || !copyForm.selectedCourseId"
              >
                <span v-if="copying">
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  Kopiere...
                </span>
                <span v-else>
                  <i class="bi bi-clipboard-check me-2"></i>
                  Schüler:innen kopieren
                </span>
              </button>
              <div class="form-text mt-2">
                Alle Schüler:innen des gewählten Kurses werden zu diesem Kurs hinzugefügt.
                Ausgeschlossene Schüler:innen werden übersprungen.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Bestätigungsdialog für Entfernen -->
    <div
        class="modal fade"
        id="confirmDeleteModal"
        tabindex="-1"
        ref="deleteModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Schüler:in entfernen</h5>
            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
            ></button>
          </div>
          <div class="modal-body">
            <p>Möchtest du wirklich folgende:n Schüler:in aus dem Kurs entfernen?</p>
            <div v-if="participantToRemove" class="alert alert-warning">
              <strong>{{ participantToRemove.firstName }} {{ participantToRemove.lastName }}</strong>
              <br>
              <small class="text-muted">{{ participantToRemove.userUserName }}</small>
            </div>
          </div>
          <div class="modal-footer">
            <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
            >
              Abbrechen
            </button>
            <button
                type="button"
                class="btn btn-danger"
                @click="removeParticipant"
            >
              <i class="bi bi-trash me-2"></i>
              Entfernen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useErrorStore } from '~/stores/error'
import { useToastStore } from '~/stores/toast'

definePageMeta({
  layout: 'admin'
})

// Types
interface CourseDto {
  id: number
  courseId: string
  name: string
  description?: string
  instructor?: {
    userName: string
    firstName: string
    lastName: string
  }
  room?: string
  minAttendees: number
  maxAttendees: number
}

interface CourseUserAssignmentDto {
  id: number
  courseId: number
  course: CourseDto
  userUserName: string
  firstName: string
  lastName: string
  grade: number
}

interface PeriodDto {
  id: number
  name: string
  current: boolean
  visible: boolean
}

interface Feedback {
  info: string[]
  warnings: string[]
  errors: string[]
}

interface UserDto {
  userName: string
  firstName: string
  lastName: string
  grade: number
  gender: string
  roles: string[]
}

interface CourseExclusionDto {
  id: number
  courseId: number
  courseName: string
  user: UserDto
  reason: string | null
  createdBy: UserDto | null
  createdAt: string
}

// Stores
const errorStore = useErrorStore()
const toastStore = useToastStore()
const route = useRoute()
const { $authFetch } = useNuxtApp()

// Refs
const courseId = ref<string>(route.params.id as string)
const course = ref<CourseDto | null>(null)
const assignments = ref<CourseUserAssignmentDto[]>([])
const exclusions = ref<CourseExclusionDto[]>([])
const periods = ref<PeriodDto[]>([])
const availableCourses = ref<CourseDto[]>([])
const users = ref<UserDto[]>([])

const loading = ref(false)
const adding = ref(false)
const removing = ref<number | null>(null)
const copying = ref(false)
const loadingCourses = ref(false)
const loadingUsers = ref(false)
const loadingExclusions = ref(false)
const addingExclusion = ref(false)
const removingExclusion = ref<number | null>(null)

const newParticipant = ref({
  userName: '',
  searchQuery: '',
  showDropdown: false
})

const newExclusion = ref({
  userName: '',
  searchQuery: '',
  reason: '',
  showDropdown: false
})

const copyForm = ref({
  selectedPeriodId: '',
  selectedCourseId: ''
})

const participantToRemove = ref<CourseUserAssignmentDto | null>(null)
const deleteModal = ref<HTMLElement | null>(null)
let deleteModalInstance: any = null

// Computed
const sortedAssignments = computed(() => {
  return [...assignments.value].sort((a, b) => {
    const nameA = `${a.lastName} ${a.firstName}`.toLowerCase()
    const nameB = `${b.lastName} ${b.firstName}`.toLowerCase()
    return nameA.localeCompare(nameB)
  })
})

const sortedExclusions = computed(() => {
  return [...exclusions.value].sort((a, b) => {
    const nameA = `${a.user.lastName} ${a.user.firstName}`.toLowerCase()
    const nameB = `${b.user.lastName} ${b.user.firstName}`.toLowerCase()
    return nameA.localeCompare(nameB)
  })
})

const participantCountClass = computed(() => {
  if (!course.value) return ''
  const count = assignments.value.length
  if (count < course.value.minAttendees) return 'badge bg-danger'
  if (count > course.value.maxAttendees) return 'badge bg-warning'
  return 'badge bg-success'
})

const filteredUsers = computed(() => {
  const query = newParticipant.value.searchQuery.toLowerCase().trim()
  if (!query) return []

  // Filtere Nutzer, die bereits zugewiesen oder ausgeschlossen sind
  const assignedUserNames = new Set(assignments.value.map(a => a.userUserName))
  const excludedUserNames = new Set(exclusions.value.map(e => e.user.userName))

  return users.value
      .filter(user => user.roles.includes('STUDENT'))
      .filter(user => !assignedUserNames.has(user.userName))
      .filter(user => !excludedUserNames.has(user.userName))
      .filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
        const userName = user.userName.toLowerCase()
        return fullName.includes(query) || userName.includes(query)
      })
      .slice(0, 10)
      .sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase()
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
})

const filteredUsersForExclusion = computed(() => {
  const query = newExclusion.value.searchQuery.toLowerCase().trim()
  if (!query) return []

  // Filtere Nutzer, die bereits ausgeschlossen sind
  const excludedUserNames = new Set(exclusions.value.map(e => e.user.userName))

  return users.value
      .filter(user => user.roles.includes('STUDENT'))
      .filter(user => !excludedUserNames.has(user.userName))
      .filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
        const userName = user.userName.toLowerCase()
        return fullName.includes(query) || userName.includes(query)
      })
      .slice(0, 10)
      .sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase()
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
})

// Methods
async function loadCourse() {
  try {
    course.value = await $authFetch(`/courses/${courseId.value}`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden des Kurses: ' + err)
  }
}

async function loadAssignments() {
  loading.value = true
  try {
    assignments.value = await $authFetch(`/assignments?course-id=${courseId.value}`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Schüler:innen: ' + err)
  } finally {
    loading.value = false
  }
}

async function loadExclusions() {
  loadingExclusions.value = true
  try {
    exclusions.value = await $authFetch(`/course-exclusions/by-course/${courseId.value}`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Ausschlüsse: ' + err)
  } finally {
    loadingExclusions.value = false
  }
}

async function loadPeriods() {
  try {
    periods.value = await $authFetch('/periods')
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Perioden: ' + err)
  }
}

async function loadUsers() {
  loadingUsers.value = true
  try {
    users.value = await $authFetch('/users')
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Benutzer: ' + err)
  } finally {
    loadingUsers.value = false
  }
}

function selectUser(user: UserDto) {
  newParticipant.value.userName = user.userName
  newParticipant.value.searchQuery = `${user.lastName}, ${user.firstName} (${user.userName})`
  newParticipant.value.showDropdown = false
}

function selectUserForExclusion(user: UserDto) {
  newExclusion.value.userName = user.userName
  newExclusion.value.searchQuery = `${user.lastName}, ${user.firstName} (${user.userName})`
  newExclusion.value.showDropdown = false
}

function onSearchInput() {
  newParticipant.value.showDropdown = newParticipant.value.searchQuery.length > 0
  newParticipant.value.userName = ''
}

function onExclusionSearchInput() {
  newExclusion.value.showDropdown = newExclusion.value.searchQuery.length > 0
  newExclusion.value.userName = ''
}

function closeDropdown() {
  setTimeout(() => {
    newParticipant.value.showDropdown = false
  }, 200)
}

function closeExclusionDropdown() {
  setTimeout(() => {
    newExclusion.value.showDropdown = false
  }, 200)
}

async function loadCoursesForPeriod() {
  if (!copyForm.value.selectedPeriodId) {
    availableCourses.value = []
    return
  }

  loadingCourses.value = true
  copyForm.value.selectedCourseId = ''

  try {
    const allCourses = await $authFetch(`/courses?period-id=${copyForm.value.selectedPeriodId}`)
    // Filter aus den aktuellen Kurs
    availableCourses.value = allCourses.filter((c: CourseDto) => c.id !== parseInt(courseId.value))
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Kurse: ' + err)
  } finally {
    loadingCourses.value = false
  }
}

async function addParticipant() {
  if (!newParticipant.value.userName) return

  adding.value = true
  try {
    const payload = {
      userName: newParticipant.value.userName,
      courseId: course.value?.courseId
    }

    const feedback: Feedback = await $authFetch('/assignments', {
      method: 'POST',
      body: payload
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

      toastStore.success(`Schüler:in ${newParticipant.value.userName} wurde hinzugefügt`)
      newParticipant.value.userName = ''
      newParticipant.value.searchQuery = ''
      newParticipant.value.showDropdown = false
      await loadAssignments()
    }
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Hinzufügen: ' + err)
  } finally {
    adding.value = false
  }
}

async function addExclusion() {
  if (!newExclusion.value.userName) return

  addingExclusion.value = true
  try {
    await $authFetch('/course-exclusions', {
      method: 'POST',
      body: {
        courseId: parseInt(courseId.value),
        userName: newExclusion.value.userName,
        reason: newExclusion.value.reason.trim() || null
      }
    })

    toastStore.success(`Schüler:in ${newExclusion.value.userName} wurde ausgeschlossen`)
    newExclusion.value.userName = ''
    newExclusion.value.searchQuery = ''
    newExclusion.value.reason = ''
    newExclusion.value.showDropdown = false
    await loadExclusions()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Ausschließen: ' + err)
  } finally {
    addingExclusion.value = false
  }
}

async function removeExclusion(exclusion: CourseExclusionDto) {
  removingExclusion.value = exclusion.id
  try {
    await $authFetch(`/course-exclusions/${exclusion.id}`, { method: 'DELETE' })
    toastStore.success(`Ausschluss für ${exclusion.user.firstName} ${exclusion.user.lastName} wurde aufgehoben`)
    await loadExclusions()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Aufheben des Ausschlusses: ' + err)
  } finally {
    removingExclusion.value = null
  }
}

function confirmRemoveParticipant(assignment: CourseUserAssignmentDto) {
  participantToRemove.value = assignment
  if (deleteModalInstance) {
    deleteModalInstance.show()
  }
}

async function removeParticipant() {
  if (!participantToRemove.value) return

  const assignmentId = participantToRemove.value.id
  removing.value = assignmentId

  try {
    await $authFetch(`/assignments/${assignmentId}`, {
      method: 'DELETE'
    })

    toastStore.success('Schüler:in wurde entfernt')

    // Modal schließen
    if (deleteModalInstance) {
      deleteModalInstance.hide()
    }

    await loadAssignments()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Entfernen: ' + err)
  } finally {
    removing.value = null
    participantToRemove.value = null
  }
}

async function copyParticipants() {
  if (!copyForm.value.selectedCourseId) return

  copying.value = true
  try {
    const feedback: Feedback = await $authFetch(
        `/assignments/copy-assignments?source-course-id=${copyForm.value.selectedCourseId}&destination-course-id=${courseId.value}`,
        {
          method: 'POST'
        }
    )

    // Feedback verarbeiten
    if (feedback.errors && feedback.errors.length > 0) {
      feedback.errors.forEach(err => errorStore.show(err))
    }

    if (feedback.warnings && feedback.warnings.length > 0) {
      feedback.warnings.forEach(warn => toastStore.warning(warn, 6000))
    }

    if (feedback.info && feedback.info.length > 0) {
      feedback.info.forEach(info => toastStore.info(info, 6000))
    }

    if (!feedback.errors || feedback.errors.length === 0) {
      toastStore.success('Schüler:innen wurden erfolgreich kopiert')
      copyForm.value.selectedPeriodId = ''
      copyForm.value.selectedCourseId = ''
      availableCourses.value = []
      await loadAssignments()
    }
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Kopieren: ' + err)
  } finally {
    copying.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Bootstrap Modal initialisieren
  if (process.client && deleteModal.value) {
    const { Modal } = await import('bootstrap')
    deleteModalInstance = new Modal(deleteModal.value)
  }

  // Daten laden
  await Promise.all([
    loadCourse(),
    loadAssignments(),
    loadExclusions(),
    loadPeriods(),
    loadUsers()
  ])
})
</script>

<style scoped>
.card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.table-hover tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.025);
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
}

.dropdown-item {
  cursor: pointer;
  padding: 0.75rem 1rem;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
}

.dropdown-item:active {
  background-color: #e9ecef;
}
</style>