<template>
  <div class="exchange-page">
    <div class="container py-4">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h3 mb-1">Kurswechsel</h1>
          <p class="text-muted mb-0" v-if="exchangePhaseInfo">
            <span v-if="exchangePhaseInfo.active" class="text-success">
              <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i>
              Wechselphase aktiv bis {{exchangePhaseInfo.end}}
            </span>
            <span v-else-if="exchangePhaseInfo.upcoming" class="text-warning">
              <i class="bi bi-clock me-1"></i>
              Startet am {{ exchangePhaseInfo.start }}
            </span>
            <span v-else class="text-secondary">
              <i class="bi bi-x-circle me-1"></i>
              Wechselphase beendet
            </span>
          </p>
        </div>
        <div>
          <span class="badge bg-primary fs-6">{{ currentPeriod?.name }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Laden...</span>
        </div>
        <p class="mt-3 text-muted">Lade Kursdaten...</p>
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Aktuelle Kurse -->
        <div class="card mb-4 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="mb-0">
              <i class="bi bi-journal-bookmark me-2"></i>
              Meine aktuellen Kurse
            </h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                <tr>
                  <th>Block</th>
                  <th>Kurs</th>
                  <th class="text-end">Aktion</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="assignment in myAssignments" :key="assignment.id">
                  <td>
                    <span class="badge" :class="getDayBadgeClass(assignment.block.dayOfWeek)">
                      {{ assignment.block.name }}
                    </span>
                  </td>
                  <td class="fw-medium">{{ assignment.course.name }}</td>
                  <td class="text-end">
                    <button
                        v-if="canExchange(assignment)"
                        class="btn btn-outline-primary btn-sm"
                        @click="startExchange(assignment)"
                        :disabled="!exchangePhaseInfo?.active">
                      <i class="bi bi-arrow-left-right me-1"></i>
                      Wechseln
                    </button>
                    <span v-else class="badge bg-secondary">
                      {{ assignment.preset ? 'Fest zugewiesen' : 'Nicht wechselbar' }}
                    </span>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Offene Wechselwünsche -->
        <div class="card mb-4 shadow-sm" v-if="myRequests.length > 0">
          <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="bi bi-hourglass-split me-2"></i>
              Meine Wechselwünsche
            </h5>
            <span class="badge bg-info">{{ pendingCount }} offen</span>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <div
                  v-for="request in myRequests"
                  :key="request.id"
                  class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-2">
                      <span class="fw-medium me-2">{{ request.currentCourseName }}</span>
                      <i class="bi bi-arrow-right mx-2 text-muted"></i>
                      <span class="text-primary">{{ request.desiredCourses.length }} Wunschkurs(e)</span>
                    </div>
                    <div class="small">
                      <ol class="mb-0 ps-3">
                        <li v-for="option in request.desiredCourses" :key="option.id" class="text-muted">
                          {{ option.name }} ({{ option.blockName }})
                        </li>
                      </ol>
                    </div>
                  </div>
                  <div class="text-end">
                  <span
                      class="badge mb-2 d-block"
                      :class="getStatusBadgeClass(request.status)">
                    {{ getStatusLabel(request.status) }}
                  </span>
                    <div v-if="request.status === 'PENDING'">
                      <button
                          class="btn btn-outline-secondary btn-sm me-1"
                          @click="editRequest(request)">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                          class="btn btn-outline-danger btn-sm"
                          @click="withdrawRequest(request)">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                    <div v-else-if="request.status === 'FULFILLED'" class="small text-success">
                      <i class="bi bi-check-circle me-1"></i>
                      {{ request.fulfilledWithCourseName }}
                    </div>
                    <div v-else-if="request.rejectionReason" class="small text-danger">
                      {{ request.rejectionReason }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Wechsel-Modal -->
      <div
          class="modal fade"
          id="exchangeModal"
          tabindex="-1"
          ref="exchangeModalRef">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-arrow-left-right me-2"></i>
                Kurs wechseln
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <!-- Aktueller Kurs -->
              <div class="alert alert-light border mb-4" v-if="selectedAssignment">
                <div class="small text-muted mb-1">Du gibst ab:</div>
                <div class="fw-medium">
                  {{ selectedAssignment.course.name }}
                  <span class="badge bg-secondary ms-2">{{ selectedAssignment.block.name }}</span>
                </div>
              </div>

              <!-- Wunschliste -->
              <div class="mb-3">
                <label class="form-label fw-medium">
                  <i class="bi bi-list-ol me-1"></i>
                  Wunschliste (nach Priorität geordnet)
                </label>
                <p class="small text-muted">
                  Ziehe Kurse in deine Wunschliste. Die Reihenfolge bestimmt die Priorität.
                </p>

                <!-- Ausgewählte Kurse (Wunschliste) -->
                <div
                    class="wishlist-container border rounded p-3 mb-3 bg-light"
                    @dragover.prevent
                    @drop="onDropToWishlist">
                  <div v-if="wishlist.length === 0" class="text-center text-muted py-4">
                    <i class="bi bi-arrow-down-circle fs-3 d-block mb-2"></i>
                    Ziehe gewünschte Kurse hierher
                  </div>
                  <div
                      v-for="(course, index) in wishlist"
                      :key="course.id"
                      class="wishlist-item d-flex align-items-center bg-white border rounded p-2 mb-2"
                      draggable="true"
                      @dragstart="onDragStartWishlist($event, index)"
                      @dragover.prevent
                      @drop="onDropReorder($event, index)">
                    <span class="badge bg-primary me-2">{{ index + 1 }}</span>
                    <div class="flex-grow-1">
                      <div class="fw-medium">{{ course.name }}</div>
                      <div class="small text-muted">{{ course.blockName }} · {{ translateDayOfWeek(course.dayOfWeek) }}</div>
                    </div>
                    <div class="text-end me-2">
                      <span class="badge" :class="course.availableSpots > 0 ? 'bg-success' : 'bg-danger'">
                        {{ course.availableSpots }} Plätze frei
                      </span>
                    </div>
                    <button
                        class="btn btn-outline-danger btn-sm"
                        @click="removeFromWishlist(index)">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Verfügbare Kurse -->
              <div>
                <label class="form-label fw-medium">
                  <i class="bi bi-collection me-1"></i>
                  Verfügbare Kurse
                </label>
                <div class="input-group mb-3">
                  <span class="input-group-text"><i class="bi bi-search"></i></span>
                  <input
                      type="text"
                      class="form-control"
                      placeholder="Kurse durchsuchen..."
                      v-model="courseSearch">
                </div>

                <div class="available-courses-list" style="max-height: 300px; overflow-y: auto;">
                  <div
                      v-for="course in filteredAvailableCourses"
                      :key="course.id"
                      class="available-course-item d-flex align-items-center border rounded p-2 mb-2"
                      :class="{
                      'border-success': course.eligible && !course.warning,
                      'border-warning': course.eligible && course.warning,
                      'border-secondary opacity-50': !course.eligible,
                      'cursor-grab': course.eligible
                    }"
                      :draggable="course.eligible"
                      @dragstart="onDragStartAvailable($event, course)">
                    <div class="flex-grow-1">
                      <div class="fw-medium">{{ course.name }}</div>
                      <div class="small text-muted">{{ course.blockName }} · {{ translateDayOfWeek(course.dayOfWeek) }}</div>
                      <div v-if="!course.eligible" class="small text-danger">
                        <i class="bi bi-exclamation-circle me-1"></i>
                        {{ course.ineligibilityReason }}
                      </div>
                      <div v-else-if="course.warning" class="small text-warning">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        {{ course.warning }}
                      </div>
                    </div>
                    <div class="text-end">
                      <span class="badge" :class="course.availableSpots > 0 ? 'bg-success' : 'bg-danger'">
                        {{ course.availableSpots }} frei
                      </span>
                      <button
                          v-if="course.eligible && !isInWishlist(course)"
                          class="btn btn-outline-primary btn-sm ms-2"
                          @click="addToWishlist(course)">
                        <i class="bi bi-plus"></i>
                      </button>
                      <span v-else-if="isInWishlist(course)" class="badge bg-info ms-2">
                        In Wunschliste
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                Abbrechen
              </button>
              <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="wishlist.length === 0 || submitting"
                  @click="submitExchangeRequest">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-check-lg me-1"></i>
                {{ editingRequest ? 'Aktualisieren' : 'Wechselwunsch abgeben' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Modal } from 'bootstrap'
import { usePeriodContextStore } from '~/stores/periodContext'
import { useToastStore } from '~/stores/toast'
import { useErrorStore } from '~/stores/error'
import { weekdayLabels } from '~/utils/weekdays'

const { $authFetch } = useNuxtApp()
const periodContextStore = usePeriodContextStore()
const toastStore = useToastStore()
const errorStore = useErrorStore()

// Types
interface Block {
  id: number
  name: string
  dayOfWeek: string
}

interface Course {
  id: number
  name: string
  courseCategories: string[]
}

interface Assignment {
  id: number
  block: Block
  course: Course
  preset: boolean
}

interface AvailableCourse {
  id: number           // Course.id (eindeutige interne ID)
  courseId: string     // Course.courseId (fachliche Kennung)
  name: string
  blockId: number
  blockName: string
  dayOfWeek: string
  availableSpots: number
  eligible: boolean
  ineligibilityReason: string | null
  warning: string | null
}

interface DesiredCourseOption {
  id: number           // Course.id
  courseId: string     // Course.courseId
  name: string
  blockName: string
  priority: number
}

interface ExchangeRequest {
  id: number
  studentName: string
  currentCourseName: string
  currentBlockName: string
  desiredCourses: DesiredCourseOption[]
  status: string
  fulfilledWithCourseName: string | null
  rejectionReason: string | null
  createdAt: string
  resolvedAt: string | null
}

interface ExchangePhaseInfo {
  active: boolean
  upcoming: boolean
  start: string
  end: string
}

// State
const currentPeriod = ref<{id: number, name: string} | null>(null)
const loading = ref(true)
const exchangePhaseInfo = ref<ExchangePhaseInfo | null>(null)
const myAssignments = ref<Assignment[]>([])
const myRequests = ref<ExchangeRequest[]>([])
const availableCourses = ref<AvailableCourse[]>([])
const selectedAssignment = ref<Assignment | null>(null)
const wishlist = ref<AvailableCourse[]>([])
const courseSearch = ref('')
const submitting = ref(false)
const editingRequest = ref<ExchangeRequest | null>(null)
const exchangeModalRef = ref<HTMLElement | null>(null)
let exchangeModal: Modal | null = null

// Computed
const pendingCount = computed(() =>
    myRequests.value.filter(r => r.status === 'PENDING').length
)

const filteredAvailableCourses = computed(() => {
  let courses = availableCourses.value
  if (courseSearch.value) {
    const search = courseSearch.value.toLowerCase()
    courses = courses.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.blockName.toLowerCase().includes(search)
    )
  }
  return courses
})

// Methods
const loadData = async () => {
  loading.value = true

  try {
    // Period laden falls noch nicht vorhanden
    if (!currentPeriod.value) {
      // Versuche aus Store
      if (periodContextStore.currentPeriod) {
        currentPeriod.value = periodContextStore.currentPeriod
      } else {
        // Period selbst laden
        const periods = await $authFetch('/periods') as any[]
        const current = periods.find((p: any) => p.current)
        if (current) {
          currentPeriod.value = current
        }
      }
    }

    if (!currentPeriod.value) {
      console.warn('Keine aktuelle Periode verfügbar')
      loading.value = false
      return
    }

    // Load exchange phase info
    const phaseResponse = await $authFetch(`/periods/${currentPeriod.value.id}/exchange-phase`)
    exchangePhaseInfo.value = phaseResponse

    // Load my assignments
    const assignmentsResponse = await $authFetch(`/assignments/my?periodId=${currentPeriod.value.id}`)
    myAssignments.value = assignmentsResponse

    // Load my exchange requests
    const requestsResponse = await $authFetch(`/exchange/my-requests?periodId=${currentPeriod.value.id}`)
    myRequests.value = requestsResponse
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Daten')
  } finally {
    loading.value = false
  }
}

const canExchange = (assignment: Assignment) => {
  return !assignment.preset && exchangePhaseInfo.value?.active
}

const startExchange = async (assignment: Assignment) => {
  selectedAssignment.value = assignment
  wishlist.value = []
  editingRequest.value = null
  courseSearch.value = ''

  if (!currentPeriod.value) {
    errorStore.show('Keine aktuelle Periode verfügbar')
    return
  }

  // Load available courses
  try {
    const response = await $authFetch(
        `/exchange/available-courses?periodId=${currentPeriod.value.id}&assignmentId=${assignment.id}`
    )
    availableCourses.value = response
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der verfügbaren Kurse')
    return
  }

  // Show modal
  if (exchangeModalRef.value && !exchangeModal) {
    exchangeModal = new Modal(exchangeModalRef.value)
  }
  exchangeModal?.show()
}

const editRequest = async (request: ExchangeRequest) => {
  // Find the assignment
  const assignment = myAssignments.value.find(
      a => a.course.name === request.currentCourseName
  )
  if (!assignment) return

  selectedAssignment.value = assignment
  editingRequest.value = request
  courseSearch.value = ''

  // Load available courses
  try {
    const response = await $authFetch(
        `/exchange/available-courses?periodId=${currentPeriod.value?.id}&assignmentId=${assignment.id}`
    )
    availableCourses.value = response

    // Restore wishlist from request
    wishlist.value = request.desiredCourses.map(dc => {
      const available = availableCourses.value.find(c => c.id === dc.id)
      return available || {
        id: dc.id,
        courseId: dc.courseId,
        name: dc.name,
        blockName: dc.blockName,
        blockId: 0,
        dayOfWeek: '',
        availableSpots: 0,
        eligible: true,
        ineligibilityReason: null
      }
    })
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der verfügbaren Kurse')
    return
  }

  exchangeModal?.show()
}

const withdrawRequest = async (request: ExchangeRequest) => {
  if (!confirm('Möchtest du diesen Wechselwunsch wirklich zurückziehen?')) return

  try {
    await $authFetch(`/exchange/${request.id}`, { method: 'DELETE' })
    toastStore.success('Wechselwunsch zurückgezogen')
    await loadData()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Zurückziehen')
  }
}

const addToWishlist = (course: AvailableCourse) => {
  if (!isInWishlist(course)) {
    wishlist.value.push(course)
  }
}

const removeFromWishlist = (index: number) => {
  wishlist.value.splice(index, 1)
}

const isInWishlist = (course: AvailableCourse) => {
  return wishlist.value.some(c => c.id === course.id)
}

// Drag & Drop
let draggedCourse: AvailableCourse | null = null
let draggedIndex: number | null = null

const onDragStartAvailable = (event: DragEvent, course: AvailableCourse) => {
  draggedCourse = course
  draggedIndex = null
  event.dataTransfer?.setData('text/plain', course.id.toString())
}

const onDragStartWishlist = (event: DragEvent, index: number) => {
  draggedCourse = wishlist.value[index]
  draggedIndex = index
  event.dataTransfer?.setData('text/plain', index.toString())
}

const onDropToWishlist = (event: DragEvent) => {
  if (draggedCourse && draggedIndex === null && !isInWishlist(draggedCourse)) {
    wishlist.value.push(draggedCourse)
  }
  draggedCourse = null
  draggedIndex = null
}

const onDropReorder = (event: DragEvent, targetIndex: number) => {
  if (draggedIndex !== null && draggedIndex !== targetIndex) {
    const item = wishlist.value.splice(draggedIndex, 1)[0]
    wishlist.value.splice(targetIndex, 0, item)
  } else if (draggedCourse && draggedIndex === null && !isInWishlist(draggedCourse)) {
    wishlist.value.splice(targetIndex, 0, draggedCourse)
  }
  draggedCourse = null
  draggedIndex = null
}

const submitExchangeRequest = async () => {
  if (!selectedAssignment.value || wishlist.value.length === 0 || !currentPeriod.value) return

  submitting.value = true

  try {
    const desiredCourseIds = wishlist.value.map(c => c.id)

    if (editingRequest.value) {
      // Update existing request
      await $authFetch(`/exchange/${editingRequest.value.id}`, {
        method: 'PUT',
        body: { desiredCourseIds }
      })
      toastStore.success('Wechselwunsch aktualisiert')
    } else {
      // Create new request
      await $authFetch('/exchange', {
        method: 'POST',
        body: {
          periodId: currentPeriod.value.id,
          currentAssignmentId: selectedAssignment.value.id,
          desiredCourseIds
        }
      })
      toastStore.success('Wechselwunsch abgegeben')
    }

    exchangeModal?.hide()
    await loadData()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Absenden des Wechselwunsches')
  } finally {
    submitting.value = false
  }
}

const translateDayOfWeek = (dayOfWeek: string) => {
  return weekdayLabels[dayOfWeek] || dayOfWeek
}

const getDayBadgeClass = (dayOfWeek: string) => {
  const classes: Record<string, string> = {
    MONDAY: 'bg-primary',
    TUESDAY: 'bg-success',
    WEDNESDAY: 'bg-warning text-dark',
    THURSDAY: 'bg-info',
    FRIDAY: 'bg-danger'
  }
  return classes[dayOfWeek] || 'bg-secondary'
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    PENDING: 'bg-warning text-dark',
    FULFILLED: 'bg-success',
    UNFULFILLABLE: 'bg-danger',
    EXPIRED: 'bg-secondary',
    WITHDRAWN: 'bg-light text-dark'
  }
  return classes[status] || 'bg-secondary'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Offen',
    FULFILLED: 'Erfüllt',
    UNFULFILLABLE: 'Nicht möglich',
    EXPIRED: 'Abgelaufen',
    WITHDRAWN: 'Zurückgezogen'
  }
  return labels[status] || status
}

// Lifecycle
onMounted(() => {
  loadData()
})

// Watch for period changes
watch(() => periodContextStore.currentPeriod, () => {
  loadData()
})
</script>

<style scoped>
.exchange-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.wishlist-container {
  min-height: 120px;
}

.wishlist-item {
  cursor: grab;
}

.wishlist-item:active {
  cursor: grabbing;
}

.available-course-item.cursor-grab {
  cursor: grab;
}

.available-course-item.cursor-grab:active {
  cursor: grabbing;
}
</style>