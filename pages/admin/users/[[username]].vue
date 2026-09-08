<template>
  <div class="container-fluid py-3" @keydown="onKeydown">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="h4 m-0">Manuelle Zuweisungen</div>
    </div>

    <!-- Schülersuche -->
    <div class="mb-4 mt-3">
      <label class="form-label">Schülersuche</label>
      <input
          v-model="studentSearch"
          class="form-control"
          placeholder="Vorname oder Nachname"
      />
      <ul class="list-group" v-if="filteredStudents.length && studentSearch">
        <li
            class="list-group-item list-group-item-action"
            v-for="student in filteredStudents"
            :key="student.username"
            @click="selectStudent(student)"
        >
          {{ student.firstName }} {{ student.lastName }} ({{ student.userName }})
        </li>
      </ul>
    </div>

    <!-- Feedback-Ausgabe -->
    <div v-if="feedback.info.length" class="alert alert-success">{{ feedback.info.join(' ') }}</div>
    <div v-if="feedback.warning.length" class="alert alert-warning">{{ feedback.warning.join(' ') }}</div>
    <div v-if="feedback.error.length" class="alert alert-danger">{{ feedback.error.join(' ') }}</div>

    <!-- Kurszuweisungen anzeigen -->
    <div v-if="selectedStudent">
      <h5>Kurse von {{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</h5>

      <!-- Schülerinformationen -->
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <h6 class="card-subtitle mb-2 text-muted">Schülerinformationen</h6>
            <button
                v-if="canImpersonate"
                class="btn btn-sm btn-outline-secondary text-nowrap"
                type="button"
                @click="openImpersonateModal"
            >
              <i class="bi bi-incognito me-1" aria-hidden="true"></i>
              Anmelden als
            </button>
          </div>
          <div class="row">
            <div class="col-md-4">
              <strong>Klassenstufe:</strong> {{ selectedStudent.grade }}
            </div>
            <div class="col-md-4">
              <strong>Benutzername:</strong> {{ selectedStudent.userName }}
            </div>
            <div class="col-md-4" v-if="selectedStudent.email">
              <strong>E-Mail:</strong> {{ selectedStudent.email }}
            </div>
          </div>
        </div>
      </div>

      <table class="table table-sm">
        <thead>
        <tr>
          <th>Kurs</th>
          <th>Aktion</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="assignment in assignments" :key="assignment.id">
          <td>
            <div class="p-2">
              <div class="text-muted">{{ assignment.course.block.dayOfWeek }},
                {{ assignment.course.block.startTime }}-{{ assignment.course.block.endTime }}
              </div>
              <div class="mt-1">{{ assignment.course.courseId }}:&nbsp;{{ assignment.course.name }}</div>
            </div>
          </td>
          <td>
            <button class="btn btn-danger btn-sm" @click="removeAssignment(assignment.id)">Entfernen</button>
          </td>
        </tr>
        </tbody>
      </table>

      <!-- Kurs hinzufügen -->
      <div class="mt-4">
        <label class="form-label">Kurs hinzufügen</label>
        <input
            v-model="courseSearch"
            @input="filterCourses"
            class="form-control"
            placeholder="Kursname oder Kurs-ID"
        />
        <ul class="list-group" v-if="filteredCourses.length && courseSearch">
          <li
              class="list-group-item list-group-item-action"
              v-for="course in filteredCourses"
              :key="course.courseId"
              @click="selectCourse(course)"
          >
            <div class="text-muted small">{{ course.block?.dayOfWeek }}&nbsp;{{
                course.block.startTime
              }}-{{ course.block.endTime }}
            </div>
            <div>[{{ course.courseId }}] {{ course.name }}</div>
          </li>
        </ul>
        <div v-if="selectedCourse" class="mt-2">
          {{ selectedCourse.courseId }}:&nbsp;{{ selectedCourse.name }}
          <button class="btn btn-primary" @click="assignCourse">Zuweisen</button>
        </div>
      </div>

      <!-- Zuweisbare Kurse: Auswahl und Regelprüfung kommen aus dem Backend -->
      <div class="mt-4">
        <div v-if="assignableUnavailable" class="alert alert-secondary py-2 small">
          <i class="bi bi-info-circle me-1"></i>
          Der Endpoint <code>/users/{{ selectedStudent.userName }}/assignable-courses</code> ist im
          Backend noch nicht verfügbar – die Liste der zuweisbaren Kurse bleibt so lange leer.
        </div>

        <template v-else>
          <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
            <label class="form-label m-0">Zuweisbare Kurse</label>
            <span class="badge bg-secondary">{{ assignableCourses.length }}</span>
            <div class="form-check form-switch ms-auto mb-0" v-if="blockedCourses.length">
              <input
                  id="showBlockedCourses"
                  v-model="showBlockedCourses"
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
              >
              <label class="form-check-label small text-muted" for="showBlockedCourses">
                Nicht zuweisbare Kurse anzeigen ({{ blockedCourses.length }})
              </label>
            </div>
          </div>

          <div v-if="!assignableCourses.length" class="alert alert-warning py-2 small">
            Nach den Zuweisungsregeln ist derzeit kein Kurs zuweisbar.
            <template v-if="blockedCourses.length">
              Bei {{ blockedCourses.length }} Kursen steht ein Grund im Weg – siehe unten.
            </template>
          </div>

          <div v-for="group in groupedAssignableCourses" :key="group.dayOfWeek" class="mb-3">
            <div class="text-muted small fw-semibold">{{ group.dayLabel }}</div>
            <ul class="list-group">
              <li
                  v-for="course in group.courses"
                  :key="course.id"
                  class="list-group-item d-flex justify-content-between align-items-center gap-2"
              >
                <div>
                  <div class="text-muted small">
                    {{ course.startTime }}-{{ course.endTime }}
                    <span class="ms-2">{{ course.assignedSeats }} / {{ course.capacity }} Plätze belegt</span>
                  </div>
                  <div>
                    [{{ course.courseId }}] {{ course.name }}
                    <span
                        v-if="course.manualAssignmentOnly"
                        class="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle ms-1 fw-normal"
                        title="Dieser Kurs wird ausschließlich manuell vergeben."
                    >
                      nur manuell
                    </span>
                  </div>
                  <div v-if="course.warning" class="small text-warning-emphasis">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{ course.warning }}
                  </div>
                </div>
                <button
                    class="btn btn-primary btn-sm text-nowrap"
                    :disabled="assigning !== null"
                    @click="assignAssignableCourse(course)"
                >
                  <span v-if="assigning === course.id" class="spinner-border spinner-border-sm" role="status"></span>
                  <span v-else>Zuweisen</span>
                </button>
              </li>
            </ul>
          </div>

          <!-- Nicht zuweisbare Kurse mit Grund: sonst sucht man vergeblich nach einem Kurs,
               den man hier erwartet hätte. -->
          <div
              v-for="group in groupedBlockedCourses"
              v-show="showBlockedCourses"
              :key="'blocked-' + group.dayOfWeek"
              class="mb-3"
          >
            <div class="text-muted small fw-semibold">{{ group.dayLabel }} – nicht zuweisbar</div>
            <ul class="list-group">
              <li
                  v-for="course in group.courses"
                  :key="course.id"
                  class="list-group-item d-flex justify-content-between align-items-center gap-2 text-muted"
              >
                <div>
                  <div class="small">
                    {{ course.startTime }}-{{ course.endTime }}
                    <span class="ms-2">{{ course.assignedSeats }} / {{ course.capacity }} Plätze belegt</span>
                  </div>
                  <div>[{{ course.courseId }}] {{ course.name }}</div>
                </div>
                <span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle text-nowrap">
                  {{ course.reason }}
                </span>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </div>

    <!-- Modal: Sitzung übernehmen -->
    <div
        class="modal fade"
        ref="impersonateModal"
        tabindex="-1"
        aria-labelledby="impersonateModalLabel"
        aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="impersonateModalLabel">Als Nutzer anmelden</h5>
            <button type="button" class="btn-close" @click="closeImpersonateModal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body" v-if="selectedStudent">
            <p>
              Möchtest Du iLa als
              <strong>{{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</strong>
              ({{ selectedStudent.userName }}) benutzen?
            </p>
            <div class="alert alert-warning mb-0">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              Deine Admin-Sitzung wird gesichert, Du kannst jederzeit über den Hinweisbalken
              zurückkehren. Achtung: Alle Aktionen in der übernommenen Sitzung werden echt
              gespeichert (Präferenzen, Wechselwünsche, Abwesenheiten) und die Übernahme wird
              protokolliert. Die Sitzung läuft nach einer Stunde ab.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeImpersonateModal">Abbrechen</button>
            <button type="button" class="btn btn-primary" :disabled="impersonating" @click="confirmImpersonate">
              <span v-if="impersonating" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Anmelden als
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, computed} from 'vue'
import {Modal} from 'bootstrap'
import {weekdayLabels} from "~/utils/weekdays.js";

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const {$authFetch} = useNuxtApp()
const config = useRuntimeConfig()
const periodContextStore = usePeriodContextStore()
const userStore = useUserStore()
const {isImpersonating, impersonate} = useImpersonation()

const impersonateModal = ref(null)
const impersonating = ref(false)
let impersonateModalInstance = null

const canImpersonate = computed(() => userStore.isAdmin() && !isImpersonating.value)

const students = ref([])
const courses = ref([])
const assignments = ref([])

// Kurse, die dem Schüler nach allen Zuweisungsregeln noch zugewiesen werden könnten.
// Die Prüfung passiert im Backend – siehe docs/backend-assignable-courses.md; sie im Frontend
// nachzurechnen hieße, Klassenstufen, Sperren, Tageskonflikte und Kontingent doppelt zu pflegen.
const assignableCourses = ref([])
const blockedCourses = ref([])
const assignableUnavailable = ref(false)
const showBlockedCourses = ref(false)
const assigning = ref(null)

const studentSearch = ref('')
const selectedStudent = ref(null)

const courseSearch = ref('')
const filteredCourses = ref([])
const selectedCourse = ref(null)

const feedback = ref({info: [], warning: [], error: []})

const filteredStudents = computed(() => {
  const q = studentSearch.value.toLowerCase()
  if (!q) return []
  return students.value.filter(s => s.firstName?.toLowerCase().includes(q) || s.lastName?.toLowerCase().includes(q))
})

const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

const OTHER_DAY = 'OTHER'

function groupCoursesByDay(courses) {
  const groups = {}
  for (const course of courses) {
    // Ein unbekannter Wochentag darf den Kurs nicht verschlucken: lieber unsortiert unten
    // anhängen, als ihn aus einer Liste verschwinden zu lassen, die ihn mitzählt.
    const day = dayOrder.includes(course.dayOfWeek) ? course.dayOfWeek : OTHER_DAY
    if (!groups[day]) groups[day] = []
    groups[day].push(course)
  }
  return [...dayOrder, OTHER_DAY]
      .filter(day => groups[day]?.length)
      .map(day => ({
        dayOfWeek: day,
        dayLabel: day === OTHER_DAY ? 'Ohne Wochentag' : (weekdayLabels[day] ?? day),
        courses: groups[day]
      }))
}

const groupedAssignableCourses = computed(() => groupCoursesByDay(assignableCourses.value))
const groupedBlockedCourses = computed(() => groupCoursesByDay(blockedCourses.value))

const enrichedCourses = computed(() => {
  return courses.value.map(c => ({
    ...c,
    block: {
      ...c.block,
      dayOfWeek: weekdayLabels[c.block.dayOfWeek]
    }
  }))
})

watchEffect(async () => {
  if (periodContextStore.selectedPeriod)
    courses.value = await $authFetch(`/courses?period-id=${periodContextStore.selectedPeriod.id}`)
})

onMounted(async () => {
  students.value = await $authFetch('/users')
  courses.value = await $authFetch(`/courses?period-id=${periodContextStore.selectedPeriod.id}`)
  const param = route.params?.username
  if (param) {
    const userName = decodeURIComponent(param)
    selectStudent({userName})
    studentSearch.value = userName
  }
})

function selectStudent(student) {
  // Wenn nur ein String oder ein Objekt mit userName übergeben wird,
  // hole das vollständige Student-Objekt aus dem students Array
  let userName
  if (typeof student === 'string') {
    userName = student
  } else if (student?.userName) {
    userName = student.userName
  } else {
    return
  }

  const fullStudent = students.value.find(s => s.userName === userName)
  if (!fullStudent) {
    console.warn(`Student mit userName '${userName}' nicht gefunden`)
    return
  }

  selectedStudent.value = fullStudent
  studentSearch.value = ''
  filteredStudents.value = []
  loadStudentCourses()
}

/**
 * Zuweisungen und zuweisbare Kurse hängen zusammen: Jede Zuweisung verändert Tageskonflikte,
 * Kontingent und Belegung der übrigen Kurse – deshalb immer beides zusammen laden.
 */
async function loadStudentCourses() {
  await Promise.all([loadAssignments(), loadAssignableCourses()])
}

async function loadAssignableCourses() {
  assignableCourses.value = []
  blockedCourses.value = []
  assignableUnavailable.value = false
  if (!selectedStudent.value || !periodContextStore.selectedPeriod) return

  try {
    // Bewusst ohne $authFetch: Gegen ein älteres Backend ohne diesen Endpoint würde dessen
    // globaler Fehlerhandler bei jedem Schülerwechsel ein rotes Fehlerbanner einblenden.
    const data = await $fetch(
        `/users/${encodeURIComponent(selectedStudent.value.userName)}/assignable-courses`
        + `?period-id=${periodContextStore.selectedPeriod.id}`, {
          baseURL: config.public.apiBase,
          credentials: config.public.apiWithCredentials ? 'include' : 'omit',
          headers: {Authorization: `Bearer ${localStorage.getItem('jwt')}`}
        })
    const all = Array.isArray(data) ? data : []
    assignableCourses.value = all.filter(c => c.assignable)
    blockedCourses.value = all.filter(c => !c.assignable)
    // Ist gar nichts zuweisbar, ist die eigentliche Information, woran es liegt – dann die
    // Gründe gleich aufklappen, statt eine leere Liste zu zeigen.
    showBlockedCourses.value = !assignableCourses.value.length && blockedCourses.value.length > 0
  } catch (err) {
    assignableUnavailable.value = true
    console.warn('Zuweisbare Kurse konnten nicht geladen werden:', err)
  }
}

async function loadAssignments() {
  if (!selectedStudent.value) return
  assignments.value = (await $authFetch(`/assignments?user-name=${selectedStudent.value.userName}&period-id=${periodContextStore.selectedPeriod.id}`))
      .map(assignment => ({
        ...assignment,
        course: {
          ...assignment.course,
          block: {
            ...assignment.course.block,
            dayOfWeek: weekdayLabels[assignment.course.block.dayOfWeek]
          }
        }
      }))
}

function filterCourses() {
  const q = courseSearch.value.toLowerCase()
  filteredCourses.value = enrichedCourses.value.filter(
      c => c.name.toLowerCase().includes(q) || c.courseId.toString().includes(q)
  )
}

function selectCourse(course) {
  console.log('course selected: ' + course.name)
  selectedCourse.value = course
  courseSearch.value = ''
  filteredCourses.value = []
}

async function assignCourse() {
  if (!selectedStudent.value || !selectedCourse.value) return
  const result = await $authFetch('/assignments', {
    method: 'POST',
    body: {
      userName: selectedStudent.value.userName,
      courseId: selectedCourse.value.courseId,
    },
  })
  showFeedback(result)
  await loadStudentCourses()
  selectedCourse.value = null
}

async function assignAssignableCourse(course) {
  if (!selectedStudent.value || assigning.value !== null) return
  assigning.value = course.id
  try {
    const result = await $authFetch('/assignments', {
      method: 'POST',
      body: {
        userName: selectedStudent.value.userName,
        courseId: course.courseId,
        periodId: periodContextStore.selectedPeriod?.id,
      },
    })
    showFeedback(result)
    await loadStudentCourses()
  } finally {
    assigning.value = null
  }
}

async function removeAssignment(id) {
  console.log("deleting " + id)
  const result = await $authFetch(`/assignments/${id}`, {method: 'DELETE'})
  showFeedback(result)
  await loadStudentCourses()
}

function openImpersonateModal() {
  if (!selectedStudent.value || !impersonateModal.value) return
  impersonateModalInstance = Modal.getOrCreateInstance(impersonateModal.value)
  impersonateModalInstance.show()
}

function closeImpersonateModal() {
  impersonateModalInstance?.hide()
}

async function confirmImpersonate() {
  if (!selectedStudent.value || impersonating.value) return
  impersonating.value = true
  try {
    // Bei Erfolg wird die Seite neu geladen, der Modal-Zustand ist dann egal
    await impersonate(selectedStudent.value.userName)
  } catch (err) {
    // Fehlermeldung zeigt der $authFetch-Handler bereits an
    console.error('Impersonation fehlgeschlagen:', err)
    closeImpersonateModal()
  } finally {
    impersonating.value = false
  }
}

function showFeedback(result) {
  console.log("feedback: " + result.info)
  feedback.value = {
    info: result.info || [],
    warning: result.warning || [],
    error: result.error || [],
  }
}

onBeforeUnmount(() => {
  impersonateModalInstance?.dispose()
})

// Wenn intern auf anderen Nutzer-Param navigiert wird (ebenfalls nur mit [[username]].vue relevant)
watch(() => route.params?.username, (val) => {
  if (val) {
    const userName = decodeURIComponent(String(val))
    selectStudent(userName)
  }
})
</script>

<style scoped>
.container {
  max-width: 800px;
}
</style>