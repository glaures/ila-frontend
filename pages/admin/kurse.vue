<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNuxtApp } from '#app'
import { useErrorStore } from '~/stores/error'
import { useToastStore } from '~/stores/toast'
import { usePeriodContextStore } from '~/stores/periodContext'
import { weekdayLabels } from '~/utils/weekdays'

type BlockDto = {
  id: number
  periodId: number
  dayOfWeek: 'MONDAY'|'TUESDAY'|'WEDNESDAY'|'THURSDAY'|'FRIDAY'|'SATURDAY'|'SUNDAY'
  startTime: string
  endTime: string
  applyToAllDays?: boolean | null
}

type UserDto = {
  userName: string
  firstName: string
  lastName: string
  email: string
  grade: number
  gender: string
  ilaMember: boolean
  roles: string[]
}

type CourseDto = {
  id?: number            // serververgeben (nicht editierbar)
  courseId: string       // vom Nutzer vergeben (mandatory)
  name: string
  description?: string
  courseCategories: string[]
  maxAttendees: number
  room?: string
  instructor?: UserDto | null  // GEÄNDERT: von string zu UserDto
  block?: BlockDto | null
  minAttendees: number
  grades: number[]
  placeholder: boolean
  excludedGenders?: string[]
  manualAssignmentOnly?: boolean
}

const ALL_CATEGORIES = ['iLa', 'KuP', 'BuE', 'FuF'] as const
const GRADES_OPTIONS = [5,6,7,8,9,10,11,12]
const GENDER_OPTIONS = ['male', 'female', 'diverse'] as const

definePageMeta({ layout: 'admin' })
const route = useRoute()
const router = useRouter()
const { $authFetch } = useNuxtApp() as any
const errorStore = useErrorStore()
const toastStore = useToastStore()
const periodContextStore = usePeriodContextStore()

// --- Perioden-Kontext (einfach gehalten) ---
const periodStore = usePeriodContextStore()
const periodId = computed(() => periodStore.selectedId) // <— direkt aus dem Store

// --- Daten ---
const courses = ref<CourseDto[]>([])
const blocks  = ref<BlockDto[]>([])
const users = ref<UserDto[]>([])  // NEU: Alle Nutzer
const selectedCourse = ref<CourseDto | null>(null)
const selectedBlockId = ref<number | null>(null)
const selectedInstructorUserName = ref<string | null>(null)  // NEU: Ausgewählter Kursleiter

// --- Modal für Löschbestätigung ---
const showDeleteModal = ref(false)
const assignmentCount = ref(0)

// --- Verfügbare Kursleiter (Nutzer ohne STUDENT-Rolle) ---
const availableInstructors = computed(() => {
  return users.value.filter(user => !user.roles.includes('STUDENT'))
})

// --- Typeahead ---
const search = ref('')
const typeaheadOpen = ref(false)
const filteredCourses = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return courses.value.slice(0, 20)
  return courses.value.filter(c => {
    const instructorName = c.instructor
        ? `${c.instructor.firstName} ${c.instructor.lastName}`.toLowerCase()
        : ''
    return (c.courseId ?? '').toLowerCase().includes(q) ||
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        instructorName.includes(q)
  }).slice(0, 50)
})

// --- Formular ---
const form = ref<Partial<CourseDto>>({
  courseId: '',
  name: '',
  description: '',
  courseCategories: [],
  maxAttendees: undefined,
  room: '',
  instructor: null,  // GEÄNDERT: null statt ''
  block: null,
  minAttendees: 0,
  grades: [],
  placeholder: false,
  excludedGenders: [],
  manualAssignmentOnly: false
})

// --- Abgeleitet: nur Blöcke der aktuellen Phase ---
const blocksForCurrentPeriod = computed(() =>
    blocks.value.filter(b => periodId.value != null && b.periodId === periodId.value)
)

// --- Helper ---
function blockLabel(b: BlockDto) {
  const day = weekdayLabels[b.dayOfWeek] ?? b.dayOfWeek
  return `${day} ${b.startTime}–${b.endTime}`
}
function blockShortLabel(b?: BlockDto | null) {
  if (!b) return ''
  const day = weekdayLabels[b.dayOfWeek] ?? b.dayOfWeek
  return `${day} ${b.startTime}–${b.endTime}`
}
function displayCourse(c: CourseDto) {
  const id = c.courseId ? `[${c.courseId}] ` : ''
  return `${id}${c.name ?? ''}`
}

watchEffect(async () => {
  if(periodContextStore.selectedPeriod)
    await loadBlocks()
})

// --- Laden ---
async function loadBlocks() {
  try { blocks.value = await $authFetch(`/blocks?period-id=${periodContextStore.selectedPeriod?.id}`) }
  catch (err: any) { errorStore.show(err?.data?.message ?? 'Die Blöcke konnten nicht geladen werden: ' + err) }
}

async function loadCoursesForPeriod() {
  try {
    if (periodId.value == null) { courses.value = []; return }
    courses.value = await $authFetch(`/courses?period-id=${periodId.value}`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  }
}

async function loadUsers() {
  try {
    users.value = await $authFetch('/users')
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Nutzer: ' + err)
  }
}

// --- Auswahl ---
function selectCourse(c: CourseDto) {
  selectedCourse.value = { ...c }
  form.value = {
    id: c.id,
    courseId: c.courseId ?? '',
    name: c.name ?? '',
    description: c.description ?? '',
    courseCategories: Array.isArray(c.courseCategories) ? [...c.courseCategories] : [],
    maxAttendees: c.maxAttendees,
    room: c.room ?? '',
    instructor: c.instructor ?? null,  // GEÄNDERT: instructor-Objekt
    block: c.block ?? null,
    minAttendees: typeof c.minAttendees === 'number' ? c.minAttendees : 0,
    grades: Array.isArray(c.grades) ? [...c.grades].sort((a,b)=>a-b) : [],
    placeholder: !!c.placeholder,
    excludedGenders: Array.isArray(c.excludedGenders) ? [...c.excludedGenders] : [],
    manualAssignmentOnly: !!c.manualAssignmentOnly
  }
  selectedBlockId.value = c.block?.id ?? null
  selectedInstructorUserName.value = c.instructor?.userName ?? null  // NEU: userName extrahieren
  search.value = displayCourse(c)
  typeaheadOpen.value = false
  router.replace({ path: route.path, query: { id: String(c.id ?? '') } })
}
function newCourse() {
  selectedCourse.value = null
  selectedBlockId.value = null
  selectedInstructorUserName.value = null  // NEU: zurücksetzen
  form.value = {
    courseId: '',
    name: '',
    description: '',
    courseCategories: [],
    maxAttendees: undefined,
    room: '',
    instructor: null,  // GEÄNDERT: null statt ''
    block: null,
    minAttendees: 0,
    grades: [],
    placeholder: false,
    excludedGenders: [],
    manualAssignmentOnly: false
  }
  search.value = ''
  typeaheadOpen.value = false
  router.replace({ path: route.path, query: {} })
}

function manageCourseParticipants() {
  if (!form.value.id) return
  router.push(`/admin/kurs/${form.value.id}`)
}

// --- Validierung & Persistenz ---
function validateForm(): string[] {
  const errors: string[] = []
  if (!form.value.courseId?.trim()) errors.push('courseId ist Pflicht.')
  if (!form.value.name?.trim()) errors.push('name ist Pflicht.')
  if (form.value.maxAttendees == null) errors.push('maxAttendees ist Pflicht.')
  else if (Number(form.value.maxAttendees) < 1) errors.push('maxAttendees muss ≥ 1 sein.')
  if (!form.value.courseCategories || form.value.courseCategories.length === 0) errors.push('Mindestens eine Kurskategorie wählen.')
  if (form.value.minAttendees != null && form.value.maxAttendees != null) {
    if (Number(form.value.minAttendees) > Number(form.value.maxAttendees)) errors.push('minAttendees darf nicht größer als maxAttendees sein.')
  }
  if (periodId.value == null) errors.push('Bitte oben eine Phase auswählen.')
  return errors
}

async function saveCourse() {
  const errs = validateForm()
  if (errs.length) { errorStore.show(errs.join(' ')); return }
  try {
    const gradesSortedUnique = Array.from(new Set(form.value.grades ?? [])).sort((a,b)=>a-b)
    const isNewCourse = form.value.id == null

    // Instructor-Objekt aus der Auswahl erstellen
    let instructorDto: UserDto | null = null
    if (selectedInstructorUserName.value) {
      const selectedUser = users.value.find(u => u.userName === selectedInstructorUserName.value)
      if (selectedUser) {
        instructorDto = selectedUser
      }
    }

    const payload: any = {
      courseId: form.value.courseId!.trim(),
      name: form.value.name!.trim(),
      description: form.value.description?.trim() || '',
      courseCategories: [...(form.value.courseCategories as string[])],
      maxAttendees: Number(form.value.maxAttendees),
      room: form.value.room?.trim() || '',
      instructor: instructorDto,  // GEÄNDERT: vollständiges UserDto statt String
      blockId: (selectedBlockId.value !== null ? selectedBlockId.value : null),
      minAttendees: Number(form.value.minAttendees ?? 0),
      grades: gradesSortedUnique,
      placeholder: !!form.value.placeholder,
      excludedGenders: [...(form.value.excludedGenders ?? [])],
      manualAssignmentOnly: !!form.value.manualAssignmentOnly
    }

    let saved: CourseDto
    if (!isNewCourse) {
      const urlId = Number(form.value.id)
      saved = await $authFetch(`/courses/${urlId}`, { method: 'PUT', body: payload })
      toastStore.success(`Kurs "${saved.name}" wurde erfolgreich aktualisiert.`)
    } else {
      payload.periodId = periodId.value // <— NEU: beim Anlegen mitsenden
      saved = await $authFetch('/courses', { method: 'POST', body: payload })
      toastStore.success(`Kurs "${saved.name}" wurde erfolgreich angelegt.`)
    }

    await loadCoursesForPeriod()
    const after = courses.value.find(x => (saved.id && x.id === saved.id) || x.courseId === saved.courseId) ?? saved
    selectCourse(after)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  }
}

// --- Löschen inkl. Sicherheitsabfrage ---
async function fetchAssignmentCountForCourseId(courseIdNum: number): Promise<number> {
  try {
    const resp: any = await $authFetch(`/assignments?course-id=${courseIdNum}`)
    if (typeof resp === 'number') return resp
    if (Array.isArray(resp)) return resp.length
    if (resp && typeof resp === 'object') {
      const v = resp.count ?? resp.total ?? resp.size
      if (typeof v === 'number') return v
    }
    throw new Error('Unerwartetes Antwortformat von /assignments')
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Zuordnungsanzahl: ' + err)
    throw err
  }
}
async function deleteCourse() {
  if (form.value.id == null) {
    errorStore.show('Kein Kurs ausgewählt oder Kurs hat keine Server-ID.')
    return
  }
  const idNum = Number(form.value.id)
  try {
    assignmentCount.value = await fetchAssignmentCountForCourseId(idNum)
    showDeleteModal.value = true
  } catch { /* Fehler bereits gemeldet */ }
}

async function confirmDelete() {
  if (form.value.id == null) return
  const idNum = Number(form.value.id)
  const courseName = form.value.name || 'Kurs'
  try {
    await $authFetch(`/courses/${idNum}`, { method: 'DELETE' })
    await loadCoursesForPeriod()
    showDeleteModal.value = false
    toastStore.success(`Kurs "${courseName}" wurde erfolgreich gelöscht.`)
    newCourse()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Löschen: ' + err)
  }
}

function cancelDelete() {
  showDeleteModal.value = false
}

// --- Deep-Link-Preselect (einfach): bevorzugt ?id=<serverId>
function tryPreselectFromRoute() {
  const idStr = typeof route.query.id === 'string' ? route.query.id
      : (typeof route.params.id === 'string' ? route.params.id : '')
  if (!idStr) return
  const idNum = Number(idStr)
  const byId = courses.value.find(c => c.id === idNum)
  if (byId) selectCourse(byId)
}

// --- Lifecycle ---
onMounted(async () => {
  // Periode sicher initialisieren (einfach & explizit)
  if (!periodStore.initialized) {
    await periodStore.loadPeriods($authFetch)
  }
  await loadUsers()  // NEU: Nutzer laden
  await loadBlocks()
  await loadCoursesForPeriod()
  tryPreselectFromRoute()
})

// Watch: Wenn Instructor-Auswahl sich ändert, form.instructor aktualisieren
watch(selectedInstructorUserName, (newUserName) => {
  if (newUserName) {
    const selectedUser = users.value.find(u => u.userName === newUserName)
    form.value.instructor = selectedUser ?? null
  } else {
    form.value.instructor = null
  }
})

// Bei Wechsel der Phase: Kurse neu laden & Formular leeren
watch(() => periodStore.selectedId, async () => {
  await loadCoursesForPeriod()
  newCourse()
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showDeleteModal.value) {
      showDeleteModal.value = false
    } else {
      typeaheadOpen.value = false
    }
  }
}
function onBlockChange(ev: Event) {
  const val = (ev.target as HTMLSelectElement).value
  selectedBlockId.value = val ? Number(val) : null
}
</script>

<template>
  <div class="container-fluid py-3" @keydown="onKeydown">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="h4 m-0">Kurse</div>
      <div>
        <button class="btn btn-outline-secondary me-2" @click="newCourse">Neuer Kurs</button>
        <button class="btn btn-outline-danger me-2" :disabled="!form.id" @click="deleteCourse">Löschen</button>
        <button class="btn btn-outline-primary me-2" :disabled="!form.id" @click="manageCourseParticipants">
          <i class="bi bi-people me-1"></i>
          Teilnehmer verwalten
        </button>
        <button class="btn btn-primary" @click="saveCourse">Speichern</button>
      </div>
    </div>

    <div v-if="periodId == null" class="alert alert-info">
      Bitte oben eine Phase auswählen. Es werden erst dann Kurse geladen.
    </div>

    <!-- Typeahead Search -->
    <div class="mb-3 position-relative" @focusin="typeaheadOpen = true">
      <label class="form-label fw-semibold">Kurssuche</label>
      <input
          v-model="search"
          @focus="typeaheadOpen = true"
          @input="typeaheadOpen = true"
          class="form-control"
          type="text"
          placeholder="Suche nach ID, Name, Beschreibung oder Kursleiter ..."
          autocomplete="off"
      />
      <div
          v-if="typeaheadOpen"
          class="list-group position-absolute w-100 shadow"
          style="z-index: 20; max-height: 320px; overflow:auto;"
      >
        <button
            v-for="c in filteredCourses"
            :key="(c.id ?? c.courseId)"
            class="list-group-item list-group-item-action"
            @click="selectCourse(c)"
        >
          <div class="d-flex justify-content-between">
            <div>
              <span class="badge bg-secondary me-2">{{ c.courseId }}</span>
              <strong>{{ c.name }}</strong>
              <small v-if="c.instructor" class="text-muted ms-2">
                ({{ c.instructor.firstName }} {{ c.instructor.lastName }})
              </small>
              <div v-if="c.block" class="small text-muted mt-1">
                {{ blockShortLabel(c.block) }}
              </div>
            </div>
            <small class="text-muted">max: {{ c.maxAttendees }}</small>
          </div>
          <div v-if="c.description" class="small text-muted text-truncate">{{ c.description }}</div>
        </button>
        <div v-if="filteredCourses.length === 0" class="list-group-item text-muted">Keine Treffer</div>
      </div>
    </div>

    <!-- Formular -->
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-12 col-md-3">
            <label class="form-label">Kurs-ID <span class="text-danger">*</span></label>
            <input v-model="form.courseId" class="form-control" type="text" />
          </div>

          <div class="col-12 col-md-5">
            <label class="form-label">Name <span class="text-danger">*</span></label>
            <input v-model="form.name" class="form-control" type="text" />
          </div>

          <div class="col-12 col-md-4">
            <label class="form-label">Kursleiter</label>
            <select v-model="selectedInstructorUserName" class="form-select">
              <option :value="null">Kein Kursleiter</option>
              <option
                  v-for="user in availableInstructors"
                  :key="user.userName"
                  :value="user.userName"
              >
                {{ user.firstName }} {{ user.lastName }} ({{ user.userName }})
              </option>
            </select>
            <div class="form-text">Nur Lehrer und Admins</div>
          </div>

          <div class="col-12">
            <label class="form-label">Beschreibung</label>
            <textarea v-model="form.description" class="form-control" rows="3"></textarea>
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label">Max. Teilnehmer <span class="text-danger">*</span></label>
            <input v-model.number="form.maxAttendees" class="form-control" type="number" min="1" />
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label">Min. Teilnehmer</label>
            <input v-model.number="form.minAttendees" class="form-control" type="number" min="0" />
          </div>

          <div class="col-12 col-md-3">
            <label class="form-label">Raum</label>
            <input v-model="form.room" class="form-control" type="text" />
          </div>

          <!-- Block-Auswahl (nur Blöcke der aktuellen Phase) -->
          <div class="col-12 col-md-3">
            <label class="form-label">Block</label>
            <select class="form-select" :value="selectedBlockId ?? ''" @change="onBlockChange">
              <option value="">— kein Block zugewiesen —</option>
              <option v-for="b in blocksForCurrentPeriod" :key="b.id" :value="b.id">
                {{ blockLabel(b) }}
              </option>
            </select>
          </div>

          <!-- Kategorien -->
          <div class="col-12">
            <label class="form-label d-block">Kategorien <span class="text-danger">*</span></label>
            <div class="d-flex flex-wrap gap-3">
              <div v-for="cat in ALL_CATEGORIES" :key="cat" class="form-check">
                <input
                    class="form-check-input"
                    type="checkbox"
                    :id="'cat-' + cat"
                    :value="cat"
                    v-model="form.courseCategories"
                />
                <label class="form-check-label" :for="'cat-' + cat">{{ cat }}</label>
              </div>
            </div>
          </div>

          <!-- Klassenstufen -->
          <div class="col-12">
            <label class="form-label d-block">Klassenstufen</label>
            <div class="d-flex flex-wrap gap-3">
              <div v-for="g in GRADES_OPTIONS" :key="g" class="form-check">
                <input
                    class="form-check-input"
                    type="checkbox"
                    :id="'grade-' + g"
                    :value="g"
                    v-model="form.grades"
                />
                <label class="form-check-label" :for="'grade-' + g">{{ g }}</label>
              </div>
            </div>
            <div class="form-text">Mehrfachauswahl möglich (5–12).</div>
          </div>

          <!-- Ausgeschlossene Geschlechter -->
          <div class="col-12">
            <label class="form-label d-block">Ausgeschlossene Geschlechter</label>
            <div class="d-flex flex-wrap gap-3">
              <div v-for="gender in GENDER_OPTIONS" :key="gender" class="form-check">
                <input
                    class="form-check-input"
                    type="checkbox"
                    :id="'gender-' + gender"
                    :value="gender"
                    v-model="form.excludedGenders"
                />
                <label class="form-check-label" :for="'gender-' + gender">
                  {{ gender === 'male' ? 'Männlich' : gender === 'female' ? 'Weiblich' : 'Divers' }}
                </label>
              </div>
            </div>
            <div class="form-text">Wähle Geschlechter aus, die von diesem Kurs ausgeschlossen werden sollen.</div>
          </div>

          <!-- Nur manuelle Zuweisung -->
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="manualAssignmentOnly" v-model="form.manualAssignmentOnly" />
              <label class="form-check-label" for="manualAssignmentOnly">Nur manuelle Zuweisung (von Präferenzverfahren ausschließen)</label>
            </div>
            <div class="form-text ms-4">Wenn aktiviert, können Schüler*innen diesen Kurs nicht im Präferenzverfahren wählen und er muss manuell zugewiesen werden.</div>
          </div>

          <!-- Platzhalter -->
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="placeholder" v-model="form.placeholder" />
              <label class="form-check-label" for="placeholder">Platzhalter</label>
            </div>
          </div>
        </div> <!-- /row -->
      </div>
    </div>

    <div class="py-3"></div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Kurs wirklich löschen?</h5>
            <button type="button" class="btn-close" @click="cancelDelete" aria-label="Schließen"></button>
          </div>
          <div class="modal-body">
            <div v-if="assignmentCount > 0" class="alert alert-warning mb-3">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>Achtung:</strong> Es sind aktuell <strong>{{ assignmentCount }}</strong> Schüler*innen diesem Kurs zugewiesen.
            </div>
            <p>
              Bist Du sicher, dass Du den Kurs
              <strong>{{ form.courseId ? `[${form.courseId}] ` : '' }}{{ form.name }}</strong>
              löschen möchtest?
            </p>
            <p v-if="assignmentCount > 0" class="text-danger mb-0">
              Alle Zuweisungen gehen dadurch verloren!
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="cancelDelete">Abbrechen</button>
            <button type="button" class="btn btn-danger" @click="confirmDelete">
              Kurs löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-group:empty { display: none; }
</style>