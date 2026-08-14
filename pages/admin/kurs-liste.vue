<script lang="ts" setup>
definePageMeta({layout: 'admin'})

import {computed, onMounted, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {useNuxtApp} from '#app'
import {storeToRefs} from 'pinia'
import {useErrorStore} from '~/stores/error'
import {usePeriodContextStore} from '~/stores/periodContext'
import {weekdayLabels} from '~/utils/weekdays'
import {getCategoryInfo} from '~/utils/categories'
import {useCourseExport} from '~/composables/useCourseExport'
import type {BlockDto, CourseDto} from '~/types/course'

const router = useRouter()
const {$authFetch} = useNuxtApp() as any
const errorStore = useErrorStore()
const periodStore = usePeriodContextStore()
const {selectedId, selectedPeriod} = storeToRefs(periodStore)

const {
  busy: exportBusy,
  localError: exportError,
  downloadOverviewCsv,
  downloadImportTemplate
} = useCourseExport()

const courses = ref<CourseDto[]>([])
const loading = ref(false)

// --- Filter ---
const search = ref('')
const filterBlockId = ref<string>('')       // '' = alle, 'none' = ohne Block
const filterCategory = ref<string>('')
const filterGrade = ref<string>('')
const filterInstructor = ref<string>('')    // '' = alle, 'none' = ohne Kursleiter
const onlyGaps = ref(false)

// --- Sortierung ---
type SortKey = 'courseId' | 'name' | 'instructor' | 'block' | 'room' | 'maxAttendees' | 'minAttendees'
const sortKey = ref<SortKey>('courseId')
const sortDir = ref<'asc' | 'desc'>('asc')

// --- Vorlagen-Optionen ---
const excludePlaceholders = ref(true)
const onlyWithBlock = ref(false)

const WEEKDAY_ORDER: Record<string, number> = {
  MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Männlich', female: 'Weiblich', diverse: 'Divers'
}

// --- Anzeige-Helfer ---
function blockLabel(b?: BlockDto | null): string {
  if (!b) return ''
  return `${weekdayLabels[b.dayOfWeek] ?? b.dayOfWeek} ${b.startTime}–${b.endTime}`
}

function instructorName(c: CourseDto): string {
  return c.instructor ? `${c.instructor.firstName} ${c.instructor.lastName}` : ''
}

/** 99 ist im Backend die Vorbereitungsklasse. */
function gradeLabel(g: number): string {
  return g === 99 ? 'VK' : String(g)
}

function gradesLabel(c: CourseDto): string {
  return [...(c.grades ?? [])].sort((a, b) => a - b).map(gradeLabel).join(', ')
}

function gendersLabel(c: CourseDto): string {
  return (c.excludedGenders ?? []).map(g => GENDER_LABELS[g] ?? g).join(', ')
}

function flagsLabel(c: CourseDto): string {
  const flags: string[] = []
  if (c.placeholder) flags.push('Platzhalter')
  if (c.manualAssignmentOnly) flags.push('nur manuell')
  return flags.join(', ')
}

/** Fehlende Angaben, die vor einem Phasenstart auffallen sollten. */
function gapsOf(c: CourseDto): string[] {
  const gaps: string[] = []
  if (!c.block) gaps.push('kein Block')
  if (!c.instructor) gaps.push('kein Kursleiter')
  if (!c.room?.trim()) gaps.push('kein Raum')
  if (!c.courseCategories?.length) gaps.push('keine Kategorie')
  if (!c.grades?.length) gaps.push('keine Klassenstufe')
  return gaps
}

// --- Filter-Optionen aus den geladenen Kursen ableiten ---
const blockOptions = computed(() => {
  const map = new Map<number, BlockDto>()
  for (const c of courses.value) if (c.block) map.set(c.block.id, c.block)
  return [...map.values()].sort((a, b) =>
      (WEEKDAY_ORDER[a.dayOfWeek] ?? 9) - (WEEKDAY_ORDER[b.dayOfWeek] ?? 9)
      || a.startTime.localeCompare(b.startTime)
  )
})

const categoryOptions = computed(() => {
  const set = new Set<string>()
  for (const c of courses.value) for (const cat of c.courseCategories ?? []) set.add(cat)
  return [...set].sort()
})

const gradeOptions = computed(() => {
  const set = new Set<number>()
  for (const c of courses.value) for (const g of c.grades ?? []) set.add(g)
  return [...set].sort((a, b) => a - b)
})

const instructorOptions = computed(() => {
  const map = new Map<string, string>()
  for (const c of courses.value) {
    if (c.instructor) map.set(c.instructor.userName, instructorName(c))
  }
  return [...map.entries()]
      .map(([userName, label]) => ({userName, label}))
      .sort((a, b) => a.label.localeCompare(b.label))
})

// --- Filtern & Sortieren ---
const filteredCourses = computed(() => {
  const q = search.value.trim().toLowerCase()

  const result = courses.value.filter(c => {
    if (q) {
      const haystack = [
        c.courseId, c.name, c.description, c.room,
        instructorName(c), blockLabel(c.block), (c.courseCategories ?? []).join(' ')
      ].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (filterBlockId.value === 'none' && c.block) return false
    if (filterBlockId.value && filterBlockId.value !== 'none'
        && c.block?.id !== Number(filterBlockId.value)) return false
    if (filterCategory.value && !(c.courseCategories ?? []).includes(filterCategory.value)) return false
    if (filterGrade.value && !(c.grades ?? []).includes(Number(filterGrade.value))) return false
    if (filterInstructor.value === 'none' && c.instructor) return false
    if (filterInstructor.value && filterInstructor.value !== 'none'
        && c.instructor?.userName !== filterInstructor.value) return false
    if (onlyGaps.value && gapsOf(c).length === 0) return false
    return true
  })

  const dir = sortDir.value === 'asc' ? 1 : -1
  return result.sort((a, b) => compareBy(a, b, sortKey.value) * dir)
})

function sortValue(c: CourseDto, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return (c.name ?? '').toLowerCase()
    case 'instructor':
      return instructorName(c).toLowerCase()
    case 'block':
      // Blöcke chronologisch, Kurse ohne Block ans Ende
      return c.block
          ? (WEEKDAY_ORDER[c.block.dayOfWeek] ?? 9) * 10000
          + Number(c.block.startTime.slice(0, 2)) * 100
          + Number(c.block.startTime.slice(3, 5))
          : Number.MAX_SAFE_INTEGER
    case 'room':
      return (c.room ?? '').toLowerCase()
    case 'maxAttendees':
      return c.maxAttendees ?? 0
    case 'minAttendees':
      return c.minAttendees ?? 0
    default:
      return (c.courseId ?? '').toLowerCase()
  }
}

function compareBy(a: CourseDto, b: CourseDto, key: SortKey): number {
  const va = sortValue(a, key)
  const vb = sortValue(b, key)
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  return String(va).localeCompare(String(vb), 'de', {numeric: true})
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return 'bi bi-arrow-down-up text-muted opacity-50'
  return sortDir.value === 'asc' ? 'bi bi-sort-down-alt' : 'bi bi-sort-up-alt'
}

// --- Kennzahlen (immer über alle Kurse der Phase, nicht über den Filter) ---
const stats = computed(() => {
  const list = courses.value
  return {
    total: list.length,
    seats: list.reduce((sum, c) => sum + (c.maxAttendees ?? 0), 0),
    withoutBlock: list.filter(c => !c.block).length,
    withoutInstructor: list.filter(c => !c.instructor).length,
    withGaps: list.filter(c => gapsOf(c).length > 0).length,
    placeholders: list.filter(c => c.placeholder).length
  }
})

const hasFilters = computed(() =>
    !!search.value || !!filterBlockId.value || !!filterCategory.value
    || !!filterGrade.value || !!filterInstructor.value || onlyGaps.value
)

function resetFilters() {
  search.value = ''
  filterBlockId.value = ''
  filterCategory.value = ''
  filterGrade.value = ''
  filterInstructor.value = ''
  onlyGaps.value = false
}

// --- Laden ---
async function loadCourses() {
  if (selectedId.value == null) {
    courses.value = []
    return
  }
  loading.value = true
  try {
    courses.value = await $authFetch(`/courses?period-id=${selectedId.value}`)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Die Kurse konnten nicht geladen werden: ' + err)
  } finally {
    loading.value = false
  }
}

// --- Aktionen ---
function openCourse(c: CourseDto) {
  if (c.id == null) return
  router.push({path: '/admin/kurse', query: {id: String(c.id)}})
}

const CSV_HEADERS = [
  'Kurs-ID', 'Name', 'Beschreibung', 'Kategorien', 'Kursleiter', 'Wochentag', 'Zeitschiene',
  'Raum', 'Min. Teilnehmer', 'Max. Teilnehmer', 'Klassenstufen', 'Ausgeschlossene Geschlechter',
  'Platzhalter', 'Nur manuelle Zuweisung', 'Lücken'
]

function onExportCsv() {
  const rows = filteredCourses.value.map(c => [
    c.courseId,
    c.name,
    c.description ?? '',
    (c.courseCategories ?? []).join(', '),
    instructorName(c),
    c.block ? (weekdayLabels[c.block.dayOfWeek] ?? c.block.dayOfWeek) : '',
    c.block ? `${c.block.startTime}–${c.block.endTime}` : '',
    c.room ?? '',
    c.minAttendees ?? 0,
    c.maxAttendees ?? '',
    gradesLabel(c),
    gendersLabel(c),
    c.placeholder ? 'ja' : 'nein',
    c.manualAssignmentOnly ? 'ja' : 'nein',
    gapsOf(c).join(', ')
  ])
  downloadOverviewCsv(CSV_HEADERS, rows, selectedPeriod.value?.name ?? 'phase')
}

async function onDownloadTemplate() {
  if (selectedId.value == null) return
  await downloadImportTemplate(selectedId.value, selectedPeriod.value?.name ?? 'phase', {
    excludePlaceholders: excludePlaceholders.value,
    onlyWithBlock: onlyWithBlock.value
  })
}

onMounted(async () => {
  if (!periodStore.initialized) {
    await periodStore.loadPeriods($authFetch)
  }
  await loadCourses()
})

watch(selectedId, async () => {
  resetFilters()
  await loadCourses()
})
</script>

<template>
  <div class="container-fluid py-3">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div>
        <h1 class="h4 mb-0">Kursübersicht</h1>
        <small v-if="selectedPeriod" class="text-muted">Phase: {{ selectedPeriod.name }}</small>
      </div>
      <div class="d-flex flex-wrap gap-2 d-print-none">
        <NuxtLink class="btn btn-outline-secondary" to="/admin/kurse">
          <i class="bi bi-pencil-square me-1" aria-hidden="true"></i>Kurse bearbeiten
        </NuxtLink>
        <button class="btn btn-outline-primary" type="button" @click="onExportCsv"
                :disabled="filteredCourses.length === 0">
          <i class="bi bi-filetype-csv me-1" aria-hidden="true"></i>Übersicht exportieren
        </button>
      </div>
    </div>

    <div v-if="selectedId == null" class="alert alert-warning">
      <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
      Bitte oben eine Phase auswählen.
    </div>

    <template v-else>
      <!-- Kennzahlen -->
      <div class="row g-2 mb-3">
        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100"><div class="card-body py-2">
            <div class="text-muted small">Kurse</div>
            <div class="h5 mb-0">{{ stats.total }}</div>
          </div></div>
        </div>
        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100"><div class="card-body py-2">
            <div class="text-muted small">Plätze gesamt</div>
            <div class="h5 mb-0">{{ stats.seats }}</div>
          </div></div>
        </div>
        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100"><div class="card-body py-2">
            <div class="text-muted small">ohne Block</div>
            <div class="h5 mb-0" :class="stats.withoutBlock ? 'text-danger' : ''">{{ stats.withoutBlock }}</div>
          </div></div>
        </div>
        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100"><div class="card-body py-2">
            <div class="text-muted small">ohne Kursleiter</div>
            <div class="h5 mb-0" :class="stats.withoutInstructor ? 'text-danger' : ''">{{ stats.withoutInstructor }}</div>
          </div></div>
        </div>
        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100"><div class="card-body py-2">
            <div class="text-muted small">mit Lücken</div>
            <div class="h5 mb-0" :class="stats.withGaps ? 'text-warning' : ''">{{ stats.withGaps }}</div>
          </div></div>
        </div>
        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100"><div class="card-body py-2">
            <div class="text-muted small">Platzhalter</div>
            <div class="h5 mb-0">{{ stats.placeholders }}</div>
          </div></div>
        </div>
      </div>

      <!-- Import-Vorlage -->
      <div class="card mb-3 d-print-none">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div>
              <h2 class="h6 mb-1">
                <i class="bi bi-file-earmark-excel me-1" aria-hidden="true"></i>
                Import-Vorlage für die nächste Phase
              </h2>
              <p class="text-muted small mb-2">
                Erzeugt eine .xlsx im Spaltenlayout des Import-Parsers – als Startdatei zum
                Überarbeiten und anschließenden Hochladen unter
                <NuxtLink to="/admin/kurs-import">Kurse importieren</NuxtLink>.
              </p>
              <div class="d-flex flex-wrap gap-3">
                <div class="form-check">
                  <input id="tpl-placeholders" v-model="excludePlaceholders" class="form-check-input" type="checkbox">
                  <label class="form-check-label small" for="tpl-placeholders">Platzhalter-Kurse weglassen</label>
                </div>
                <div class="form-check">
                  <input id="tpl-blocks" v-model="onlyWithBlock" class="form-check-input" type="checkbox">
                  <label class="form-check-label small" for="tpl-blocks">nur Kurse mit Block</label>
                </div>
              </div>
            </div>
            <button class="btn btn-success text-nowrap" type="button"
                    :disabled="exportBusy || stats.total === 0" @click="onDownloadTemplate">
              <span v-if="exportBusy">
                <span class="spinner-border spinner-border-sm me-2"></span>Wird erzeugt…
              </span>
              <span v-else>
                <i class="bi bi-download me-1" aria-hidden="true"></i>Vorlage herunterladen
              </span>
            </button>
          </div>
          <div v-if="exportError" class="alert alert-danger mt-3 mb-0 py-2 small">{{ exportError }}</div>
        </div>
      </div>

      <!-- Filter -->
      <div class="card mb-3 d-print-none">
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-12 col-lg-4">
              <label class="form-label small mb-1" for="f-search">Suche</label>
              <input id="f-search" v-model="search" class="form-control form-control-sm" type="text"
                     placeholder="ID, Name, Beschreibung, Raum, Kursleiter …">
            </div>
            <div class="col-6 col-lg-2">
              <label class="form-label small mb-1" for="f-block">Block</label>
              <select id="f-block" v-model="filterBlockId" class="form-select form-select-sm">
                <option value="">alle</option>
                <option value="none">— ohne Block —</option>
                <option v-for="b in blockOptions" :key="b.id" :value="String(b.id)">{{ blockLabel(b) }}</option>
              </select>
            </div>
            <div class="col-6 col-lg-2">
              <label class="form-label small mb-1" for="f-cat">Kategorie</label>
              <select id="f-cat" v-model="filterCategory" class="form-select form-select-sm">
                <option value="">alle</option>
                <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="col-6 col-lg-1">
              <label class="form-label small mb-1" for="f-grade">Stufe</label>
              <select id="f-grade" v-model="filterGrade" class="form-select form-select-sm">
                <option value="">alle</option>
                <option v-for="g in gradeOptions" :key="g" :value="String(g)">{{ gradeLabel(g) }}</option>
              </select>
            </div>
            <div class="col-6 col-lg-3">
              <label class="form-label small mb-1" for="f-instructor">Kursleiter</label>
              <select id="f-instructor" v-model="filterInstructor" class="form-select form-select-sm">
                <option value="">alle</option>
                <option value="none">— ohne Kursleiter —</option>
                <option v-for="i in instructorOptions" :key="i.userName" :value="i.userName">{{ i.label }}</option>
              </select>
            </div>
          </div>
          <div class="d-flex flex-wrap align-items-center gap-3 mt-2">
            <div class="form-check">
              <input id="f-gaps" v-model="onlyGaps" class="form-check-input" type="checkbox">
              <label class="form-check-label small" for="f-gaps">nur Kurse mit fehlenden Angaben</label>
            </div>
            <button v-if="hasFilters" class="btn btn-link btn-sm p-0" type="button" @click="resetFilters">
              Filter zurücksetzen
            </button>
            <span class="text-muted small ms-auto">
              {{ filteredCourses.length }} von {{ stats.total }} Kursen
            </span>
          </div>
        </div>
      </div>

      <!-- Tabelle -->
      <div class="card">
        <div class="table-responsive course-table">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead class="table-light">
            <tr>
              <th role="button" @click="toggleSort('courseId')">Kurs-ID <i :class="sortIcon('courseId')"></i></th>
              <th role="button" @click="toggleSort('name')">Name <i :class="sortIcon('name')"></i></th>
              <th>Kategorien</th>
              <th role="button" @click="toggleSort('instructor')">Kursleiter <i :class="sortIcon('instructor')"></i></th>
              <th role="button" @click="toggleSort('block')">Block <i :class="sortIcon('block')"></i></th>
              <th role="button" @click="toggleSort('room')">Raum <i :class="sortIcon('room')"></i></th>
              <th class="text-end" role="button" @click="toggleSort('minAttendees')">Min <i :class="sortIcon('minAttendees')"></i></th>
              <th class="text-end" role="button" @click="toggleSort('maxAttendees')">Max <i :class="sortIcon('maxAttendees')"></i></th>
              <th>Stufen</th>
              <th>Ausgeschl.</th>
              <th>Flags</th>
              <th>Beschreibung</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="c in filteredCourses" :key="c.id ?? c.courseId" role="button" @click="openCourse(c)">
              <td class="text-nowrap"><span class="badge bg-secondary">{{ c.courseId }}</span></td>
              <td>
                {{ c.name }}
                <i v-if="gapsOf(c).length" :title="gapsOf(c).join(', ')"
                   class="bi bi-exclamation-triangle-fill text-warning ms-1"></i>
              </td>
              <td class="text-nowrap">
                <span v-for="cat in c.courseCategories" :key="cat" class="badge me-1"
                      :style="{ backgroundColor: getCategoryInfo(cat).color, color: getCategoryInfo(cat).textColor }">
                  {{ cat }}
                </span>
              </td>
              <td class="text-nowrap">
                <span v-if="c.instructor">{{ instructorName(c) }}</span>
                <span v-else class="text-danger small">— fehlt —</span>
              </td>
              <td class="text-nowrap">
                <span v-if="c.block">{{ blockLabel(c.block) }}</span>
                <span v-else class="text-danger small">— fehlt —</span>
              </td>
              <td class="text-nowrap">
                <span v-if="c.room">{{ c.room }}</span>
                <span v-else class="text-muted small">—</span>
              </td>
              <td class="text-end">{{ c.minAttendees }}</td>
              <td class="text-end">{{ c.maxAttendees }}</td>
              <td class="text-nowrap small">{{ gradesLabel(c) || '—' }}</td>
              <td class="text-nowrap small">{{ gendersLabel(c) || '—' }}</td>
              <td class="text-nowrap small">{{ flagsLabel(c) || '—' }}</td>
              <td class="description-cell small text-muted" :title="c.description">{{ c.description }}</td>
            </tr>
            <tr v-if="!loading && filteredCourses.length === 0">
              <td class="text-center text-muted py-4" colspan="12">
                {{ stats.total === 0 ? 'Für diese Phase sind keine Kurse angelegt.' : 'Keine Kurse passen zu den Filtern.' }}
              </td>
            </tr>
            <tr v-if="loading">
              <td class="text-center text-muted py-4" colspan="12">
                <span class="spinner-border spinner-border-sm me-2"></span>Kurse werden geladen…
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.course-table {
  max-height: calc(100vh - 22rem);
  overflow: auto;
}

.course-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}

.description-cell {
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media print {
  .course-table {
    max-height: none;
    overflow: visible;
  }
}
</style>
