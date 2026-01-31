<script setup lang="ts">
import { usePeriodContextStore } from '~/stores/periodContext'
import { useToastStore } from '~/stores/toast'
import { useErrorStore } from '~/stores/error'
import { weekdayLabels } from '~/utils/weekdays'
import { computed, watch, ref } from 'vue'
import { Modal } from 'bootstrap'

type Assignment = {
  id: number
  courseId: number
  course: {
    id: number
    courseId: string
    name: string
    block: {
      id: number
      periodId: number
      dayOfWeek: string
      startTime: string
      endTime: string
    }
  }
  userUserName: string
  firstName: string
  lastName: string
  grade: number
}

type GroupedAssignments = {
  dayOfWeek: string
  dayLabel: string
  assignments: Assignment[]
}

const route = useRoute()
const { $authFetch } = useNuxtApp() as any
const periodStore = usePeriodContextStore()
const toastStore = useToastStore()
const errorStore = useErrorStore()

const periodId = computed(() => periodStore.selectedId)
const userName = computed(() => route.params.username as string)

definePageMeta({
  layout: 'admin'
})

const assignments = ref<Assignment[]>([])
const loading = ref(true)
const deleting = ref<number | null>(null)

// Modal State
const deleteModalRef = ref<HTMLElement | null>(null)
const assignmentToDelete = ref<Assignment | null>(null)
let deleteModal: Modal | null = null

// Wochentage in der richtigen Reihenfolge
const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

const groupedAssignments = computed<GroupedAssignments[]>(() => {
  const groups: Record<string, Assignment[]> = {}

  for (const a of assignments.value) {
    // Null-Check für course.block
    if (!a.course?.block?.dayOfWeek) continue

    const day = a.course.block.dayOfWeek
    if (!groups[day]) {
      groups[day] = []
    }
    groups[day].push(a)
  }

  return dayOrder
      .filter(day => groups[day]?.length)
      .map(day => ({
        dayOfWeek: day,
        dayLabel: weekdayLabels[day] ?? day,
        assignments: groups[day].sort((a, b) =>
            (a.course.block?.startTime ?? '').localeCompare(b.course.block?.startTime ?? '')
        )
      }))
})

const studentName = computed(() => {
  const first = assignments.value[0]
  if (first?.firstName && first?.lastName) {
    return `${first.firstName} ${first.lastName}`
  }
  return userName.value
})

async function loadAssignments() {
  if (!periodId.value || !userName.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const data = await $authFetch(`/assignments?user-name=${encodeURIComponent(userName.value)}&period-id=${periodId.value}`)
    assignments.value = Array.isArray(data) ? data : []
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Kurszuweisungen')
  } finally {
    loading.value = false
  }
}

function showDeleteModal(assignment: Assignment) {
  assignmentToDelete.value = assignment
  if (deleteModalRef.value && !deleteModal) {
    deleteModal = new Modal(deleteModalRef.value)
  }
  deleteModal?.show()
}

function hideDeleteModal() {
  deleteModal?.hide()
  assignmentToDelete.value = null
}

async function confirmDelete() {
  if (!assignmentToDelete.value) return

  const assignment = assignmentToDelete.value
  deleting.value = assignment.id
  hideDeleteModal()

  try {
    await $authFetch(`/assignments/${assignment.id}`, { method: 'DELETE' })
    toastStore.success('Kurszuweisung wurde entfernt')
    await loadAssignments()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Entfernen der Kurszuweisung')
  } finally {
    deleting.value = null
  }
}

function formatTime(time: string): string {
  if (!time) return ''
  // Entferne Sekunden falls vorhanden (HH:mm:ss -> HH:mm)
  return time.substring(0, 5)
}

watch([periodId, userName], () => {
  loadAssignments()
}, { immediate: true })
</script>

<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div>
        <NuxtLink to="/admin/problems" class="btn btn-outline-secondary btn-sm me-2">
          ← Zurück
        </NuxtLink>
        <h1 class="h4 mb-0 d-inline-block align-middle">
          Kurszuweisungen: {{ studentName }}
        </h1>
      </div>
      <button class="btn btn-outline-secondary btn-sm" @click="loadAssignments" :disabled="loading">
        <span v-if="!loading">Neu laden</span>
        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" role="status" aria-hidden="true"></div>
      <div class="mt-2">Lade Kurszuweisungen …</div>
    </div>

    <div v-else-if="assignments.length === 0" class="alert alert-info">
      Keine Kurszuweisungen vorhanden.
    </div>

    <div v-else>
      <div v-for="group in groupedAssignments" :key="group.dayOfWeek" class="card mb-3">
        <div class="card-header d-flex align-items-center">
          <strong>{{ group.dayLabel }}</strong>
          <span
              v-if="group.assignments.length > 1"
              class="badge bg-warning text-dark ms-2"
              title="Mehrere Kurse am selben Tag"
          >
            {{ group.assignments.length }} Kurse
          </span>
        </div>
        <ul class="list-group list-group-flush">
          <li
              v-for="a in group.assignments"
              :key="a.id"
              class="list-group-item d-flex justify-content-between align-items-center"
          >
            <div>
              <div class="fw-semibold">{{ a.course.name }}</div>
              <div class="small text-muted">
                {{ formatTime(a.course.block?.startTime) }} – {{ formatTime(a.course.block?.endTime) }}
                <span class="ms-2">Kurs-ID: <code>{{ a.course.courseId }}</code></span>
              </div>
            </div>
            <button
                class="btn btn-outline-danger btn-sm"
                @click="showDeleteModal(a)"
                :disabled="deleting === a.id"
                title="Kurszuweisung entfernen"
            >
              <span v-if="deleting === a.id" class="spinner-border spinner-border-sm" role="status"></span>
              <span v-else>Entfernen</span>
            </button>
          </li>
        </ul>
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
            <h5 class="modal-title" id="deleteModalLabel">Kurszuweisung entfernen</h5>
            <button type="button" class="btn-close" @click="hideDeleteModal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body">
            <p>Möchtest du die folgende Kurszuweisung wirklich entfernen?</p>
            <p class="fw-semibold mb-0" v-if="assignmentToDelete">
              {{ assignmentToDelete.course.name }}
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="hideDeleteModal">
              Abbrechen
            </button>
            <button type="button" class="btn btn-danger" @click="confirmDelete">
              Entfernen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-header {
  background-color: #f8f9fa;
}
</style>