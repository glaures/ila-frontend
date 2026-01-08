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
            {{ course.name }} - {{ formatBlock(course.block) }}
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

    <!-- Zugewiesene Schüler -->
    <div v-if="selectedCourse && currentAssignments.length > 0" class="mb-4">
      <h6 class="mb-2">
        <i class="bi bi-check-circle text-success"></i>
        Zugewiesene Schüler
      </h6>
      <div class="list-group">
        <div
            v-for="student in currentAssignments"
            :key="student.userName"
            class="list-group-item d-flex justify-content-between align-items-center"
        >
          <div>
            <strong>{{ student.firstName }} {{ student.lastName }}</strong>
            <br>
            <small class="text-muted">Klasse {{ student.grade }}</small>
          </div>
          <button
              class="btn btn-sm btn-outline-danger"
              @click="removeStudent(student)"
              :disabled="loading"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Schüler hinzufügen -->
    <div v-if="selectedCourse && canAddStudents" class="card">
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
          >
        </div>

        <!-- Verfügbare Schüler -->
        <div v-if="filteredStudents.length > 0" class="available-students">
          <div
              v-for="student in filteredStudents"
              :key="student.userName"
              class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              @click="addStudent(student)"
              style="cursor: pointer;"
          >
            <div>
              <strong>{{ student.firstName }} {{ student.lastName }}</strong>
              <br>
              <small class="text-muted">Klasse {{ student.grade }}</small>
            </div>
            <i class="bi bi-plus-circle fs-4 text-primary"></i>
          </div>
        </div>

        <div v-else-if="searchQuery" class="text-center py-4 text-muted">
          <i class="bi bi-search fs-1"></i>
          <p class="mt-2">Keine Schüler gefunden.</p>
        </div>

        <div v-else class="text-center py-4 text-muted">
          <i class="bi bi-arrow-up fs-1"></i>
          <p class="mt-2">Geben Sie einen Suchbegriff ein.</p>
        </div>
      </div>
    </div>

    <!-- Kurs voll -->
    <div v-else-if="selectedCourse && !canAddStudents" class="alert alert-warning">
      <i class="bi bi-exclamation-triangle"></i>
      Der Kurs ist voll belegt. Sie können keine weiteren Schüler hinzufügen.
    </div>

    <!-- Leerer Zustand -->
    <div v-else class="text-center py-5">
      <i class="bi bi-arrow-up fs-1 text-muted"></i>
      <p class="text-muted mt-3">Bitte wählen Sie zunächst einen Kurs aus.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '~/stores/toast'
import { useErrorStore } from '~/stores/error'

definePageMeta({
  layout: 'instructor'
})

const { $authFetch } = useNuxtApp()
const toastStore = useToastStore()
const errorStore = useErrorStore()

interface Course {
  id: number
  name: string
  maxAttendees: number
  block: {
    id: number
    dayOfWeek: number
    startTime: string
    endTime: string
  }
}

interface Student {
  userName: string
  firstName: string
  lastName: string
  grade: number
}

const instructorCourses = ref<Course[]>([])
const selectedCourse = ref<Course | null>(null)
const currentAssignments = ref<Student[]>([])
const availableStudents = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])
const searchQuery = ref('')
const loading = ref(false)

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

// Kurse des Kursleiters laden
onMounted(async () => {
  try {
    loading.value = true
    // TODO: Backend-Endpoint für Kursleiter-Kurse erstellen
    // instructorCourses.value = await $authFetch('/api/instructor/courses')

    // Beispieldaten für Entwicklung
    instructorCourses.value = [
      {
        id: 1,
        name: 'Basketball',
        maxAttendees: 15,
        block: { id: 1, dayOfWeek: 1, startTime: '14:00', endTime: '15:30' }
      },
      {
        id: 2,
        name: 'Töpfern',
        maxAttendees: 12,
        block: { id: 2, dayOfWeek: 3, startTime: '14:00', endTime: '15:30' }
      }
    ]
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Kurse')
  } finally {
    loading.value = false
  }
})

// Kursdaten laden (Zuweisungen + verfügbare Schüler)
const loadCourseData = async () => {
  if (!selectedCourse.value) {
    currentAssignments.value = []
    availableStudents.value = []
    filteredStudents.value = []
    searchQuery.value = ''
    return
  }

  try {
    loading.value = true
    // TODO: Backend-Endpoints erstellen
    // const [assignments, available] = await Promise.all([
    //   $authFetch(`/api/instructor/courses/${selectedCourse.value.id}/assignments`),
    //   $authFetch(`/api/instructor/courses/${selectedCourse.value.id}/available-students`)
    // ])
    // currentAssignments.value = assignments
    // availableStudents.value = available

    // Beispieldaten für Entwicklung
    currentAssignments.value = [
      { userName: 'max.mustermann', firstName: 'Max', lastName: 'Mustermann', grade: 9 },
      { userName: 'anna.schmidt', firstName: 'Anna', lastName: 'Schmidt', grade: 10 }
    ]

    availableStudents.value = [
      { userName: 'tom.mueller', firstName: 'Tom', lastName: 'Müller', grade: 9 },
      { userName: 'lisa.wagner', firstName: 'Lisa', lastName: 'Wagner', grade: 10 },
      { userName: 'paul.becker', firstName: 'Paul', lastName: 'Becker', grade: 9 },
      { userName: 'sarah.koch', firstName: 'Sarah', lastName: 'Koch', grade: 11 }
    ]
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Kursdaten')
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
  filteredStudents.value = availableStudents.value.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase()
    const grade = student.grade.toString()
    return fullName.includes(query) || grade.includes(query)
  })
}

// Schüler zum Kurs hinzufügen
const addStudent = async (student: Student) => {
  if (!selectedCourse.value || !canAddStudents.value) return

  try {
    loading.value = true
    // TODO: Backend-Endpoint für manuelle Zuweisung erstellen
    // await $authFetch(`/api/instructor/courses/${selectedCourse.value.id}/assignments`, {
    //   method: 'POST',
    //   body: {
    //     userName: student.userName,
    //     blockId: selectedCourse.value.block.id
    //   }
    // })

    // Optimistisches Update
    currentAssignments.value.push(student)
    availableStudents.value = availableStudents.value.filter(s => s.userName !== student.userName)
    searchQuery.value = ''
    filteredStudents.value = []

    toastStore.success(`${student.firstName} ${student.lastName} wurde dem Kurs zugewiesen`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Zuweisen des Schülers')
  } finally {
    loading.value = false
  }
}

// Schüler aus Kurs entfernen
const removeStudent = async (student: Student) => {
  if (!selectedCourse.value) return

  if (!confirm(`${student.firstName} ${student.lastName} wirklich aus dem Kurs entfernen?`)) {
    return
  }

  try {
    loading.value = true
    // TODO: Backend-Endpoint zum Entfernen der Zuweisung erstellen
    // await $authFetch(`/api/instructor/courses/${selectedCourse.value.id}/assignments/${student.userName}`, {
    //   method: 'DELETE'
    // })

    // Optimistisches Update
    currentAssignments.value = currentAssignments.value.filter(s => s.userName !== student.userName)
    availableStudents.value.push(student)

    toastStore.success(`${student.firstName} ${student.lastName} wurde aus dem Kurs entfernt`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Entfernen des Schülers')
  } finally {
    loading.value = false
  }
}

// Block formatieren
const formatBlock = (block: Course['block']) => {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  return `${days[block.dayOfWeek]} ${block.startTime.slice(0, 5)}-${block.endTime.slice(0, 5)}`
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