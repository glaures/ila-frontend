<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNuxtApp } from '#app'
import { useErrorStore } from '~/stores/error'
import { weekdayLabels } from '~/utils/weekdays'

type BlockDto = {
  id: number
  periodId: number
  dayOfWeek: 'MONDAY'|'TUESDAY'|'WEDNESDAY'|'THURSDAY'|'FRIDAY'|'SATURDAY'|'SUNDAY'
  startTime: string
  endTime: string
  applyToAllDays?: boolean | null
}

type CourseDto = {
  id?: number
  courseId: string
  name: string
  description?: string
  courseCategories: string[]
  maxAttendees: number
  room?: string
  instructor?: string
  block?: BlockDto | null
  minAttendees: number
  grades: number[]          // Set<Integer> im Backend
  placeholder: boolean
}

const ALL_CATEGORIES = ['iLa', 'KuP', 'BuE', 'FuF'] as const
const GRADES_OPTIONS = [5,6,7,8,9,10,11,12]

definePageMeta({ layout: 'admin' })
const route = useRoute()
const router = useRouter()
const { $authFetch } = useNuxtApp() as any
const errorStore = useErrorStore()

const courses = ref<CourseDto[]>([])
const blocks  = ref<BlockDto[]>([])

const selectedCourse = ref<CourseDto | null>(null)
const selectedBlockId = ref<number | null>(null)

// Typeahead
const search = ref('')
const typeaheadOpen = ref(false)
const filteredCourses = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return courses.value.slice(0, 20)
  return courses.value.filter(c =>
      (c.courseId ?? '').toLowerCase().includes(q) ||
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q) ||
      (c.instructor ?? '').toLowerCase().includes(q)
  ).slice(0, 50)
})

// Formularmodell
const form = ref<Partial<CourseDto>>({
  courseId: '',
  name: '',
  description: '',
  courseCategories: [],
  maxAttendees: undefined,
  room: '',
  instructor: '',
  block: null,
  minAttendees: 0,
  grades: [],
  placeholder: false
})

async function loadCourses() {
  try {
    courses.value = await $authFetch('/courses')
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  }
}
async function loadBlocks() {
  try {
    blocks.value = await $authFetch('/blocks')
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  }
}

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
    instructor: c.instructor ?? '',
    block: c.block ?? null,
    minAttendees: typeof c.minAttendees === 'number' ? c.minAttendees : 0,
    grades: Array.isArray(c.grades) ? [...c.grades].sort((a,b)=>a-b) : [],
    placeholder: !!c.placeholder
  }
  selectedBlockId.value = c.block?.id ?? null
  search.value = displayCourse(c)
  typeaheadOpen.value = false
  router.replace({ path: route.path, query: { id: String(c.id ?? '') } })
}

function newCourse() {
  selectedCourse.value = null
  selectedBlockId.value = null
  form.value = {
    courseId: '',
    name: '',
    description: '',
    courseCategories: [],
    maxAttendees: undefined,
    room: '',
    instructor: '',
    block: null,
    minAttendees: 0,
    grades: [],
    placeholder: false
  }
  search.value = ''
  typeaheadOpen.value = false
  router.replace({ path: route.path, query: {} })
}

function validateForm(): string[] {
  const errors: string[] = []
  if (!form.value.courseId?.trim()) errors.push('courseId ist Pflicht.')
  if (!form.value.name?.trim()) errors.push('name ist Pflicht.')
  if (form.value.maxAttendees === undefined || form.value.maxAttendees === null) {
    errors.push('maxAttendees ist Pflicht.')
  } else if (Number(form.value.maxAttendees) < 1) {
    errors.push('maxAttendees muss ≥ 1 sein.')
  }
  if (!form.value.courseCategories || form.value.courseCategories.length === 0) {
    errors.push('Mindestens eine Kurskategorie wählen.')
  }
  // Plausibilitätscheck min ≤ max (falls gesetzt)
  if (form.value.minAttendees != null && form.value.maxAttendees != null) {
    if (Number(form.value.minAttendees) > Number(form.value.maxAttendees)) {
      errors.push('minAttendees darf nicht größer als maxAttendees sein.')
    }
  }
  return errors
}

async function saveCourse() {
  const errs = validateForm()
  if (errs.length) { errorStore.show(err.join(' ')); return }

  const gradesSortedUnique = Array.from(new Set(form.value.grades ?? [])).sort((a,b)=>a-b)

  const payload: any = {
    courseId: form.value.courseId!.trim(),
    name: form.value.name!.trim(),
    description: form.value.description?.trim() || '',
    courseCategories: [...(form.value.courseCategories as string[])],
    maxAttendees: Number(form.value.maxAttendees),
    room: form.value.room?.trim() || '',
    instructor: form.value.instructor?.trim() || '',
    blockId: (selectedBlockId.value !== null ? selectedBlockId.value : null),
    minAttendees: Number(form.value.minAttendees ?? 0),
    grades: gradesSortedUnique,
    placeholder: !!form.value.placeholder
  }

  let saved: CourseDto
  if (form.value.id != null) {
    // id NUR im Pfad verwenden, NICHT im Body mitsenden
    const urlId = Number(form.value.id)
    saved = await $authFetch(`/courses/${urlId}`, { method: 'PUT', body: payload })
  } else {
    saved = await $authFetch('/courses', { method: 'POST', body: payload })
  }

  await loadCourses()
  const after = courses.value.find(x => (saved.id && x.id === saved.id) || x.courseId === saved.courseId) ?? saved
  selectCourse(after)
}

async function fetchAssignmentCountForCourseId(courseIdNum: number): Promise<number> {
  // Holt die Anzahl zugewiesener Schüler:innen für diesen Kurs.
  // Robust gegen verschiedene Response-Formate: number | {count} | array
  try {
    const resp: any = await $authFetch(`/assignments?course-id=${courseIdNum}`)

    if (typeof resp === 'number') return resp
    if (Array.isArray(resp)) return resp.length
    if (resp && typeof resp === 'object') {
      const v = resp.count ?? resp.total ?? resp.size
      if (typeof v === 'number') return v
    }

    // Fallback: unbekanntes Format → konservativ NICHT löschen
    throw new Error('Unerwartetes Antwortformat von /assignments')
  } catch (err: any) {
    // Fehler anzeigen und nach oben reichen, damit kein versehentliches Löschen passiert
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
    const count = await fetchAssignmentCountForCourseId(idNum)

    if (count > 0) {
      const ok = window.confirm(
          `Es sind aktuell ${count} Schülerinnen diesem Kurs zugewiesen. ` +
          `Bist Du sicher, dass Du diesen Kurs löschen möchtest? ` +
          `Es gehen alle Zuweisungen dadurch verloren.`
      )
      if (!ok) return
    }

    await $authFetch(`/courses/${idNum}`, { method: 'DELETE' })
    await loadCourses()
    newCourse() // Formular zurücksetzen
  } catch {
    // Fehler wurden bereits im fetch/DELETE-Call gemeldet
  }
}

// Preselect via ?courseId= oder :courseId / :id
function tryPreselectFromRoute() {
  // bevorzugt: /admin/kurse?id=123  (oder /admin/kurse/123, falls Route so existiert)
  const idFromQuery = typeof route.query.id === 'string' ? route.query.id : ''
  const idFromParam = typeof route.params.id === 'string' ? route.params.id : ''
  const idStr = idFromQuery || idFromParam

  if (idStr) {
    const idNum = Number(idStr)
    const byId = courses.value.find(c => c.id === idNum)
    if (byId) { selectCourse(byId); return }
  }

  // Fallback: historisch über courseId (z.B. ?courseId=ABC1)
  const cid = typeof route.query.courseId === 'string' ? route.query.courseId
      : (typeof route.params.courseId === 'string' ? route.params.courseId : '')
  if (cid) {
    const byCourseId = courses.value.find(c => c.courseId === cid)
    if (byCourseId) selectCourse(byCourseId)
  }
}

onMounted(async () => {
  await Promise.all([loadCourses(), loadBlocks()])
  tryPreselectFromRoute()
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') typeaheadOpen.value = false
}

function onBlockChange(ev: Event) {
  const val = (ev.target as HTMLSelectElement).value
  selectedBlockId.value = val ? Number(val) : null
}
</script>

<template>
  <div class="container-fluid py-3" @keydown="onKeydown">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h4 m-0">Kurse verwalten</h1>
      <div>
        <button class="btn btn-outline-secondary me-2" @click="newCourse">Neuer Kurs</button>
        <button class="btn btn-outline-danger me-2" :disabled="!form.id" @click="deleteCourse">Löschen</button>
        <button class="btn btn-primary" @click="saveCourse">Speichern</button>
      </div>
    </div>

    <!-- Typeahead Search -->
    <div class="mb-3 position-relative" @focusin="typeaheadOpen = true">
      <label class="form-label fw-semibold">Kurs suchen</label>
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
              <small v-if="c.instructor" class="text-muted ms-2">({{ c.instructor }})</small>
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
            <input v-model="form.instructor" class="form-control" type="text" />
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

          <!-- Block-Auswahl -->
          <div class="col-12 col-md-3">
            <label class="form-label">Block (optional)</label>
            <select class="form-select" :value="selectedBlockId ?? ''" @change="onBlockChange">
              <option value="">— kein Block zugewiesen —</option>
              <option v-for="b in blocks" :key="b.id" :value="b.id">
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
  </div>
</template>

<style scoped>
.list-group:empty { display: none; }
</style>
