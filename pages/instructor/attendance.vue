<template>
  <div class="instructor-attendance">
    <h2 class="h5 mb-3">Abwesenheiten melden</h2>

    <!-- Kursauswahl -->
    <div class="card mb-3">
      <div class="card-body">
        <label class="form-label fw-bold">Kurs auswählen:</label>
        <select
            v-model="selectedCourse"
            class="form-select form-select-lg"
            @change="loadCourseAttendees"
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

    <!-- Teilnehmerliste mit Anwesenheitsstatus -->
    <div v-if="selectedCourse && attendees.length > 0" class="attendee-list">
      <div class="card mb-3" v-for="attendee in attendees" :key="attendee.userName">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">{{ attendee.firstName }} {{ attendee.lastName }}</h6>
              <small class="text-muted">Klasse {{ attendee.grade }}</small>
            </div>
            <div class="form-check form-switch">
              <input
                  class="form-check-input"
                  type="checkbox"
                  :id="`attendance-${attendee.userName}`"
                  v-model="attendee.present"
                  @change="toggleAttendance(attendee)"
                  style="width: 3rem; height: 1.5rem;"
              >
              <label
                  class="form-check-label ms-2"
                  :for="`attendance-${attendee.userName}`"
              >
                <span :class="attendee.present ? 'text-success' : 'text-danger'">
                  {{ attendee.present ? 'Anwesend' : 'Abwesend' }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Leerer Zustand -->
    <div v-else-if="selectedCourse && attendees.length === 0" class="text-center py-5">
      <i class="bi bi-people fs-1 text-muted"></i>
      <p class="text-muted mt-3">Keine Teilnehmer für diesen Kurs gefunden.</p>
    </div>

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
  block: {
    id: number
    dayOfWeek: number
    startTime: string
    endTime: string
  }
}

interface Attendee {
  userName: string
  firstName: string
  lastName: string
  grade: number
  present: boolean
}

const instructorCourses = ref<Course[]>([])
const selectedCourse = ref<Course | null>(null)
const attendees = ref<Attendee[]>([])
const loading = ref(false)

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
        block: { id: 1, dayOfWeek: 1, startTime: '14:00', endTime: '15:30' }
      },
      {
        id: 2,
        name: 'Töpfern',
        block: { id: 2, dayOfWeek: 3, startTime: '14:00', endTime: '15:30' }
      }
    ]
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Kurse')
  } finally {
    loading.value = false
  }
})

// Teilnehmer für ausgewählten Kurs laden
const loadCourseAttendees = async () => {
  if (!selectedCourse.value) {
    attendees.value = []
    return
  }

  try {
    loading.value = true
    // TODO: Backend-Endpoint für Kursteilnehmer erstellen
    // attendees.value = await $authFetch(`/api/instructor/courses/${selectedCourse.value.id}/attendees`)

    // Beispieldaten für Entwicklung
    attendees.value = [
      { userName: 'max.mustermann', firstName: 'Max', lastName: 'Mustermann', grade: 9, present: true },
      { userName: 'anna.schmidt', firstName: 'Anna', lastName: 'Schmidt', grade: 10, present: true },
      { userName: 'tom.mueller', firstName: 'Tom', lastName: 'Müller', grade: 9, present: true }
    ]
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Teilnehmer')
  } finally {
    loading.value = false
  }
}

// Anwesenheitsstatus ändern
const toggleAttendance = async (attendee: Attendee) => {
  try {
    // TODO: Backend-Endpoint für Anwesenheit erstellen
    // await $authFetch(`/api/instructor/courses/${selectedCourse.value?.id}/attendance`, {
    //   method: 'POST',
    //   body: {
    //     userName: attendee.userName,
    //     present: attendee.present,
    //     date: new Date().toISOString()
    //   }
    // })

    toastStore.success(
        `${attendee.firstName} ${attendee.lastName} als ${attendee.present ? 'anwesend' : 'abwesend'} markiert`
    )
  } catch (err: any) {
    // Bei Fehler Status zurücksetzen
    attendee.present = !attendee.present
    errorStore.show(err?.data?.message ?? 'Fehler beim Speichern der Anwesenheit')
  }
}

// Block formatieren
const formatBlock = (block: Course['block']) => {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  return `${days[block.dayOfWeek]} ${block.startTime.slice(0, 5)}-${block.endTime.slice(0, 5)}`
}
</script>

<style scoped>
.instructor-attendance {
  max-width: 600px;
  margin: 0 auto;
}

.attendee-list .card {
  border-left: 4px solid #667eea;
  transition: transform 0.2s, box-shadow 0.2s;
}

.attendee-list .card:active {
  transform: scale(0.98);
}

.form-check-input {
  cursor: pointer;
}

.form-check-input:checked {
  background-color: #28a745;
  border-color: #28a745;
}

/* Mobile Optimierungen */
@media (max-width: 576px) {
  .card-body {
    padding: 1rem;
  }
}
</style>