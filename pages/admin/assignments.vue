<template>
  <div>
    <h1>Kursbelegungen – Übersicht &amp; Druck</h1>
    <!-- Header / Controls (screen only) -->
    <div class="d-flex align-items-center justify-content-between mb-3 d-print-none">
      <div class="btn-group">
        <button class="btn btn-outline-secondary" @click="reloadAll" :disabled="loading">
          <span v-if="!loading">Neu laden</span>
          <span v-else>Aktualisiere…</span>
        </button>
        <button class="btn btn-primary" @click="printPage" :disabled="loading || !selectedDay">
          Drucken
        </button>
      </div>
    </div>

    <!-- Day picker (screen only) -->
    <div class="card mb-4 d-print-none">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-6">
            <label class="form-label" for="daySelect">Wochentag</label>
            <select id="daySelect" class="form-select" v-model="selectedDay" @change="onDayChange">
              <option disabled value="">– Bitte wählen –</option>
              <option v-for="d in weekdaysAvailable" :key="d" :value="d">{{ formatDay(d) }}</option>
            </select>
          </div>
          <div class="col-12 col-md-6" v-if="selectedDay">
            <div class="text-muted small">
              Es werden alle Blöcke am {{ formatDay(selectedDay) }} geladen. Für jeden Block werden die angebotenen
              Kurse und deren Teilnehmer angezeigt.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" class="alert alert-info">Daten werden geladen …</div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- Content -->
    <div v-if="!loading && selectedDay">
      <div v-for="block in blocksForSelectedDaySorted" :key="block.id" class="mb-4">
        <!-- Block header (screen only) -->
        <div class="d-flex align-items-center mb-2 d-print-none">
          <h2 class="h5 mb-0">Block {{ timeRange(block) }}</h2>
          <span class="badge bg-light text-dark ms-2">ID: {{ block.id }}</span>
        </div>

        <div v-if="coursesByBlock[block.id] && coursesByBlock[block.id].length" class="row g-3">
          <div v-for="course in coursesByBlock[block.id]" :key="course.id" class="col-12 col-md-6 col-lg-4">
            <!-- Each course becomes its own print page -->
            <div class="card h-100 d-flex flex-column course-print-page">
              <!-- Print-only heading with day & time -->
              <div class="card-header d-none d-print-block bg-white border-0 pt-4">
                <div class="mb-1 text-uppercase small text-muted">{{ formatDay(block.dayOfWeek) }}</div>
                <h1 class="h4 mb-1">{{ timeRange(block) }}</h1>
                <h2 class="h5 mb-0">{{ course.name }}</h2>
              </div>

              <div class="card-body d-flex flex-column">
                <!-- Screen heading -->
                <div class="d-flex justify-content-between align-items-start mb-2 d-print-none">
                  <h3 class="h6 mb-0">{{ course.name }}</h3>
                  <span class="badge bg-secondary">{{ course.courseId }}</span>
                </div>

                <!-- Meta info -->
                <div class="small text-muted mb-2">
                  <div>Raum: <strong>{{ course.room || '—' }}</strong></div>
                  <div>Leitung: <strong>{{ displayInstructor(course) }}</strong></div>
                  <div>Max. TN: <strong>{{ course.maxAttendees }}</strong></div>
                  <div>Klassen: <strong>{{ course.grades.join(',') }}</strong></div>
                </div>

                <!-- Attendees list -->
                <div>
                  <div class="d-flex justify-content-between align-items-center border-top pt-2 mb-1">
                    <span class="small text-muted">Teilnehmer</span>
                    <span class="badge bg-light text-dark">
                      {{ (assignmentsByCourse[course.id] || []).length }} / {{ course.maxAttendees }}
                    </span>
                  </div>
                  <ol class="mb-0 ps-3">
                    <li v-for="a in (assignmentsByCourse[course.id] || [])" :key="a.userUserName" class="small">
                      {{ a.lastName }}, {{ a.firstName }}
                    </li>
                    <li v-if="(assignmentsByCourse[course.id] || []).length === 0" class="small text-muted">(Keine
                      Zuordnungen)
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="alert alert-warning">Für diesen Block sind keine Kurse hinterlegt.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref, computed} from 'vue'

definePageMeta({layout: 'admin', title: 'Kurszuweisungen'})

// --- Types from backend DTOs ---
interface BlockDto {
  id: number
  periodId: number
  dayOfWeek: string // e.g. "MONDAY"
  startTime: string // HH:mm
  endTime: string   // HH:mm
  applyToAllDays: boolean | null
}

interface CourseDto {
  id: number
  courseId: string
  name: string
  description: string
  courseCategories: string[]
  maxAttendees: number
  room?: string
  instructor?: string
  teacher?: { firstName?: string; lastName?: string; userName?: string }
}

interface CourseUserAssignmentDto {
  courseId: number
  course: CourseDto
  userUserName: string
  firstName: string
  lastName: string
}

const {$authFetch} = useNuxtApp() as any

const loading = ref(false)
const error = ref<string | null>(null)

const blocks = ref<BlockDto[]>([])
const selectedDay = ref<string>('')

const coursesByBlock = ref<Record<number, CourseDto[]>>({})
const assignmentsByCourse = ref<Record<number, CourseUserAssignmentDto[]>>({})

const weekdayLabels: Record<string, string> = {
  MONDAY: 'Montag',
  TUESDAY: 'Dienstag',
  WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag',
  FRIDAY: 'Freitag',
  SATURDAY: 'Samstag',
  SUNDAY: 'Sonntag'
}

const formatDay = (d: string) => weekdayLabels[d] || d

const weekdaysAvailable = computed(() => {
  const set = new Set(blocks.value.map(b => b.dayOfWeek))
  const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  return Array.from(set).sort((a, b) => order.indexOf(a) - order.indexOf(b))
})

const blocksForSelectedDaySorted = computed(() => {
  return blocks.value
      .filter(b => b.dayOfWeek === selectedDay.value)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
})

function timeRange(b: BlockDto) {
  return `${b.startTime} – ${b.endTime}`
}

function displayInstructor(c: CourseDto) {
  if (c.instructor && c.instructor.trim().length) return c.instructor
  const t = c.teacher
  if (!t) return '—'
  const name = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim()
  return name || t.userName || '—'
}

async function loadBlocks() {
  error.value = null
  loading.value = true
  try {
    const data = await $authFetch('/blocks')
    blocks.value = data as BlockDto[]
    if (!selectedDay.value && blocks.value.length) {
      selectedDay.value = weekdaysAvailable.value[0] || ''
      if (selectedDay.value) await loadCoursesAndAssignmentsForDay(selectedDay.value)
    }
  } catch (e: any) {
    error.value = e?.message || 'Fehler beim Laden der Blöcke.'
  } finally {
    loading.value = false
  }
}

async function loadCoursesForBlock(blockId: number): Promise<CourseDto[]> {
  const courses: CourseDto[] = await $authFetch(`/courses?block-id=${encodeURIComponent(blockId)}`)
  coursesByBlock.value[blockId] = courses
  return courses
}

async function loadAssignmentsForCourse(courseId: number): Promise<CourseUserAssignmentDto[]> {
  if (assignmentsByCourse.value[courseId]) return assignmentsByCourse.value[courseId]
  const list: CourseUserAssignmentDto[] = await $authFetch(`/assignments?course-id=${encodeURIComponent(courseId)}`)
  // Sort by lastName then firstName
  list.sort((a, b) => {
    if (a.lastName === b.lastName) return a.firstName.localeCompare(b.firstName, 'de')
    return a.lastName.localeCompare(b.lastName, 'de')
  })
  assignmentsByCourse.value[courseId] = list
  return list
}

async function loadCoursesAndAssignmentsForDay(day: string) {
  error.value = null
  loading.value = true
  try {
    coursesByBlock.value = {}
    assignmentsByCourse.value = {}

    const dayBlocks = blocks.value.filter(b => b.dayOfWeek === day)
    const coursesByBlockArr = await Promise.all(dayBlocks.map(b => loadCoursesForBlock(b.id)))
    const allCourses = coursesByBlockArr.flat()
    await Promise.all(allCourses.map(c => loadAssignmentsForCourse(c.id)))
  } catch (e: any) {
    error.value = e?.message || 'Fehler beim Laden der Kurse/Teilnehmer.'
  } finally {
    loading.value = false
  }
}

function onDayChange() {
  if (selectedDay.value) loadCoursesAndAssignmentsForDay(selectedDay.value)
}

function printPage() {
  window.print()
}

async function reloadAll() {
  if (selectedDay.value) await loadCoursesAndAssignmentsForDay(selectedDay.value)
}

onMounted(loadBlocks)
</script>

<style scoped>
/***** Print helpers *****/
@media print {
  .d-print-none {
    display: none !important;
  }

  .container {
    max-width: 100% !important;
    width: 100% !important;
  }

  .row {
    display: block !important;
    margin: 0 !important;
  }

  [class*="col-"] {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
  }

  .course-print-page {
    page-break-before: always;
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #000 !important;
    box-shadow: none !important;
    min-height: 95vh;
  }

  .card-body {
    display: block !important;
  }

  .h-100 {
    height: auto !important;
  }
}
</style>
