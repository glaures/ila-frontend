<script setup lang="ts">
import { usePeriodContextStore } from '~/stores/periodContext'
import { computed, watch, ref } from "vue"
import { weekdayLabels } from '~/utils/weekdays'

type Problem = {
  description: string
  type: string
  id: string
}

// Die Problemliste liefert nur den Benutzernamen (`id`); Klassenstufe und Name
// kommen aus der Nutzerliste und werden darüber verknüpft.
type Student = {
  userName: string
  firstName?: string
  lastName?: string
  grade?: number
  /** Klassenbezeichnung inkl. Zug, z.B. "6c" – vom Backend aus grade + classSuffix gebildet */
  schoolClass?: string
}

// Freie Plätze je Klassenstufe und Block – siehe docs/backend-free-seats.md
type FreeSeatsCell = {
  grade: number
  blockId: number
  dayOfWeek: string
  startTime?: string
  endTime?: string
  freeSeats: number
  capacity?: number
  assignedSeats?: number
  courseCount?: number
}

type FreeSeatsBlock = {
  blockId: number
  dayOfWeek: string
  startTime?: string
  endTime?: string
}

const { $authFetch } = useNuxtApp() as any
const config = useRuntimeConfig()
const periodStore = usePeriodContextStore()
const periodId = computed(() => periodStore.selectedId)

definePageMeta({
  layout: 'admin'
})

const problems = ref<Problem[]>([])
const loading = ref(true)
const selectedType = ref<string>('all')
const studentsByUserName = ref<Record<string, Student>>({})
const freeSeats = ref<FreeSeatsCell[]>([])
const freeSeatsUnavailable = ref(false)

const WEEKDAY_ORDER: Record<string, number> = {
  MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7
}

/** 99 ist im Backend die Vorklasse. */
function gradeRowLabel(grade: number): string {
  return grade === 99 ? 'Vorklasse' : `Klasse ${grade}`
}

// Zeilen und Spalten werden aus den gelieferten Zellen abgeleitet.
// Eingeschrieben wird in Blöcke, nicht in Wochentage – an einem Tag kann es mehrere geben.
const freeSeatsBlocks = computed(() => {
  const blocks = new Map<number, FreeSeatsBlock>()
  freeSeats.value.forEach(c => {
    if (!blocks.has(c.blockId)) {
      blocks.set(c.blockId, {
        blockId: c.blockId,
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        endTime: c.endTime
      })
    }
  })
  return Array.from(blocks.values()).sort((a, b) =>
      (WEEKDAY_ORDER[a.dayOfWeek] ?? 9) - (WEEKDAY_ORDER[b.dayOfWeek] ?? 9)
      || (a.startTime ?? '').localeCompare(b.startTime ?? '')
  )
})

/** „Mo", „Di", … – die Spalten werden sonst zu breit. */
function shortWeekday(day: string): string {
  return (weekdayLabels[day] ?? day).slice(0, 2)
}

function blockLabel(block: FreeSeatsBlock): string {
  const day = weekdayLabels[block.dayOfWeek] ?? block.dayOfWeek
  if (!block.startTime) return day
  return `${day} ${block.startTime}–${block.endTime ?? ''}`
}

const freeSeatsGrades = computed(() => {
  const grades = new Set(freeSeats.value.map(c => c.grade))
  return Array.from(grades).sort((a, b) => a - b)
})

const freeSeatsIndex = computed(() => {
  const index: Record<string, FreeSeatsCell> = {}
  freeSeats.value.forEach(c => {
    index[`${c.grade}|${c.blockId}`] = c
  })
  return index
})

function freeSeatsCell(grade: number, blockId: number): FreeSeatsCell | null {
  return freeSeatsIndex.value[`${grade}|${blockId}`] ?? null
}

/** Ein Kurs liegt in genau einem Block – die Zeilensumme zählt nichts doppelt. */
function freeSeatsOfWeek(grade: number): number {
  return freeSeats.value
      .filter(c => c.grade === grade)
      .reduce((sum, c) => sum + (c.freeSeats ?? 0), 0)
}

function freeSeatsTitle(cell: FreeSeatsCell | null): string {
  if (!cell) return 'Keine Kurse für diese Stufe in diesem Block'
  const parts: string[] = []
  if (cell.courseCount != null) parts.push(`${cell.courseCount} Kurse`)
  if (cell.assignedSeats != null && cell.capacity != null) {
    parts.push(`${cell.assignedSeats} von ${cell.capacity} Plätzen belegt`)
  }
  return parts.join(' • ')
}

function studentOf(p: Problem): Student | null {
  return studentsByUserName.value[p.id] ?? null
}

function gradeOf(p: Problem): number | null {
  const grade = studentOf(p)?.grade
  return grade && grade > 0 ? grade : null
}

/** Klasse mit Zug ("6c"), falls das Backend sie kennt – sonst die reine Stufe. */
function schoolClassOf(p: Problem): string | null {
  const schoolClass = studentOf(p)?.schoolClass?.trim()
  if (schoolClass) return schoolClass
  const grade = gradeOf(p)
  return grade ? String(grade) : null
}

function nameOf(p: Problem): string | null {
  const student = studentOf(p)
  if (!student) return null
  const name = [student.firstName, student.lastName].filter(Boolean).join(' ')
  return name || null
}

const typeLabel: Record<string, string> = {
  notEnoughCourses: 'nicht genügend Kurse',
  moreThan1AtTheSameDayOfWeek: 'mehrere Kurse am selben Tag'
}

// Gruppiere Probleme nach Typ
const problemsByType = computed(() => {
  const grouped: Record<string, Problem[]> = {}
  problems.value.forEach(p => {
    if (!grouped[p.type]) {
      grouped[p.type] = []
    }
    grouped[p.type].push(p)
  })
  return grouped
})

// Liste der verfügbaren Typen mit Anzahl
const availableTypes = computed(() => {
  return Object.keys(problemsByType.value).map(type => ({
    value: type,
    label: typeLabel[type] ?? type,
    count: problemsByType.value[type].length
  })).sort((a, b) => a.label.localeCompare(b.label))
})

// Gefilterte Probleme basierend auf Auswahl, nach Klassenstufe sortiert
const filteredProblems = computed(() => {
  const list = selectedType.value === 'all'
      ? problems.value
      : (problemsByType.value[selectedType.value] ?? [])
  // Aufsteigend nach Klassenstufe, innerhalb der Stufe nach Klasse und Name;
  // Probleme ohne bekannte Klassenstufe ans Ende.
  return [...list].sort((a, b) => {
    const gradeA = gradeOf(a)
    const gradeB = gradeOf(b)
    if (gradeA !== gradeB) {
      if (gradeA == null) return 1
      if (gradeB == null) return -1
      return gradeA - gradeB
    }
    const classDiff = (schoolClassOf(a) ?? '').localeCompare(schoolClassOf(b) ?? '')
    if (classDiff !== 0) return classDiff
    return (nameOf(a) ?? a.id).localeCompare(nameOf(b) ?? b.id)
  })
})

// Verteilung der aktuell angezeigten Probleme auf die Klassenstufen
const problemsByGrade = computed(() => {
  const counts = new Map<number | null, number>()
  filteredProblems.value.forEach(p => {
    const grade = gradeOf(p)
    counts.set(grade, (counts.get(grade) ?? 0) + 1)
  })
  return Array.from(counts.entries())
      .map(([grade, count]) => ({ grade, count }))
      // Klassenstufen aufsteigend, "ohne Klassenstufe" ans Ende
      .sort((a, b) => (a.grade ?? Infinity) - (b.grade ?? Infinity))
})

function resolveFixRoute(p: Problem): string | null {
  switch (p.type) {
    case 'notEnoughCourses':
      return `/admin/users/${encodeURIComponent(p.id)}`
    case 'moreThan1AtTheSameDayOfWeek':
      return `/admin/user-assignments/${encodeURIComponent(p.id)}`
    default:
      return null
  }
}

function formatDescription(p: Problem): string {
  if (p.type === 'moreThan1AtTheSameDayOfWeek') {
    // Ersetze englische Wochentage durch deutsche
    let desc = p.description
    for (const [eng, de] of Object.entries(weekdayLabels)) {
      desc = desc.replace(eng, de)
    }
    return desc
  }
  return p.description
}

const hasProblems = computed(() => problems.value.length > 0)

async function loadStudents() {
  // Fehlschlag darf die Problemliste nicht verhindern – dann fehlt nur die Klassenangabe
  try {
    const users = await $authFetch('/users?count=9999')
    const byUserName: Record<string, Student> = {}
    for (const user of (Array.isArray(users) ? users as Student[] : [])) {
      if (user?.userName) byUserName[user.userName] = user
    }
    studentsByUserName.value = byUserName
  } catch (err) {
    console.error('Fehler beim Laden der Nutzerliste:', err)
  }
}

async function loadFreeSeats() {
  freeSeats.value = []
  freeSeatsUnavailable.value = false
  try {
    // Bewusst ohne $authFetch: Solange der Endpoint im Backend fehlt, würde dessen globaler
    // Fehlerhandler bei jedem Aufruf der Seite ein rotes Fehlerbanner einblenden.
    const data = await $fetch(`/periods/${periodId.value}/free-seats`, {
      baseURL: config.public.apiBase,
      credentials: config.public.apiWithCredentials ? 'include' : 'omit',
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }
    })
    freeSeats.value = Array.isArray(data) ? data as FreeSeatsCell[] : []
  } catch (err) {
    freeSeatsUnavailable.value = true
    console.warn('Freie Plätze konnten nicht geladen werden:', err)
  }
}

async function loadProblems() {
  if (!periodId.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    const [data] = await Promise.all([
      $authFetch(`/problems?period-id=${periodId.value}`),
      loadStudents(),
      loadFreeSeats(),
    ])
    problems.value = Array.isArray(data) ? data as Problem[] : []
    // Wenn der aktuell ausgewählte Typ nicht mehr existiert, auf "all" zurücksetzen
    if (selectedType.value !== 'all' && !problemsByType.value[selectedType.value]) {
      selectedType.value = 'all'
    }
  } finally {
    loading.value = false
  }
}

watch(periodId, (newPeriodId) => {
  if (newPeriodId) {
    loadProblems()
  }
}, { immediate: true })
</script>

<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h4 mb-0">Belegungsprobleme</h1>
      <button class="btn btn-outline-secondary btn-sm" @click="loadProblems" :disabled="loading">
        <span v-if="!loading">Neu laden</span>
        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border" role="status" aria-hidden="true"></div>
      <div class="mt-2">Lade Probleme …</div>
    </div>

    <template v-else>
      <!-- Freie Plätze je Klassenstufe und Wochentag -->
      <div v-if="freeSeats.length" class="card mb-3">
        <div class="card-body">
          <div class="fw-semibold mb-2">Freie Plätze nach Klassenstufe und Block</div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle text-center mb-0">
              <thead class="table-light">
              <tr>
                <th class="text-start">Klassenstufe</th>
                <th v-for="block in freeSeatsBlocks" :key="block.blockId" :title="blockLabel(block)">
                  <div>{{ shortWeekday(block.dayOfWeek) }}</div>
                  <div class="fw-normal text-muted small">{{ block.startTime ?? '' }}</div>
                </th>
                <th>Woche</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="grade in freeSeatsGrades" :key="grade">
                <th scope="row" class="text-start fw-normal">{{ gradeRowLabel(grade) }}</th>
                <td
                    v-for="block in freeSeatsBlocks"
                    :key="block.blockId"
                    :title="`${blockLabel(block)} — ${freeSeatsTitle(freeSeatsCell(grade, block.blockId))}`"
                    :class="{
                      'text-muted': !freeSeatsCell(grade, block.blockId),
                      'text-danger fw-semibold': freeSeatsCell(grade, block.blockId)?.freeSeats === 0
                    }"
                >
                  {{ freeSeatsCell(grade, block.blockId)?.freeSeats ?? '–' }}
                </td>
                <td class="fw-semibold">{{ freeSeatsOfWeek(grade) }}</td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="text-muted small mt-2">
            <i class="bi bi-info-circle me-1"></i>
            Eine Spalte je Block, nicht je Wochentag. Plätze in Kursen, die mehrere Stufen zulassen,
            stehen in jeder dieser Zeilen – die Spalten lassen sich deshalb nicht über die
            Klassenstufen aufsummieren. Platzhalter-Kurse, Kurse mit ausschließlich manueller
            Zuweisung sowie geschlechts- und personenbezogene Ausschlüsse sind nicht berücksichtigt.
          </div>
        </div>
      </div>

      <div v-else-if="freeSeatsUnavailable" class="alert alert-secondary py-2 small">
        <i class="bi bi-info-circle me-1"></i>
        Der Endpoint <code>/periods/{{ periodId }}/free-seats</code> ist im Backend noch nicht
        verfügbar – die Übersicht der freien Plätze bleibt so lange leer.
      </div>

      <div v-if="!hasProblems" class="alert alert-success" role="alert">
        Aktuell sind keine Probleme vorhanden.
      </div>

      <div v-else>
      <!-- Auswahl der Problemart -->
      <div class="card mb-3">
        <div class="card-body">
          <label for="typeFilter" class="form-label fw-semibold">Problemart filtern:</label>
          <select
              id="typeFilter"
              v-model="selectedType"
              class="form-select"
          >
            <option value="all">
              Alle Probleme ({{ problems.length }})
            </option>
            <option
                v-for="type in availableTypes"
                :key="type.value"
                :value="type.value"
            >
              {{ type.label }} ({{ type.count }})
            </option>
          </select>
        </div>
      </div>

      <!-- Übersicht nach Klassenstufe -->
      <div class="card mb-3">
        <div class="card-body">
          <div class="fw-semibold mb-2">
            Probleme nach Klassenstufe
            <span v-if="selectedType !== 'all'" class="text-muted fw-normal small ms-1">
              (nur {{ typeLabel[selectedType] ?? selectedType }})
            </span>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <span
                v-for="entry in problemsByGrade"
                :key="entry.grade ?? 'none'"
                class="badge fs-6 fw-normal"
                :class="entry.grade
                  ? 'bg-info-subtle text-info-emphasis border border-info-subtle'
                  : 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle'"
            >
              {{ entry.grade ? `Klasse ${entry.grade}` : 'ohne Klassenstufe' }}
              <span class="fw-semibold ms-1">{{ entry.count }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Problemliste -->
      <div class="card">
        <div class="card-header bg-light">
          <span class="fw-semibold">
            {{ selectedType === 'all' ? 'Alle Probleme' : (typeLabel[selectedType] ?? selectedType) }}
          </span>
          <span class="badge bg-secondary ms-2">{{ filteredProblems.length }}</span>
        </div>
        <div class="list-group list-group-flush">
          <div
              v-for="p in filteredProblems"
              :key="p.id + ':' + p.type + ':' + p.description"
              class="list-group-item d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2"
          >
            <div class="flex-fill">
              <div class="fw-semibold">
                {{ formatDescription(p) }}
              </div>
              <div class="small text-muted mt-1">
                <span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                  {{ typeLabel[p.type] ?? p.type }}
                </span>
                <span class="ms-2">
                  Schüler:in:
                  <span v-if="nameOf(p)">{{ nameOf(p) }}</span>
                  <code>{{ p.id }}</code>
                </span>
                <span
                    v-if="schoolClassOf(p)"
                    class="badge bg-info-subtle text-info-emphasis border border-info-subtle ms-2"
                >
                  Klasse {{ schoolClassOf(p) }}
                </span>
              </div>
            </div>

            <div class="ms-md-3">
              <NuxtLink
                  v-if="resolveFixRoute(p)"
                  :to="resolveFixRoute(p)!"
                  class="btn btn-primary btn-sm"
              >
                Beheben
              </NuxtLink>
              <button
                  v-else
                  class="btn btn-outline-secondary btn-sm"
                  disabled
                  title="Für diesen Problemtyp ist noch keine Aktion hinterlegt."
              >
                Keine Aktion verfügbar
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.list-group-item { border-left: 0; border-right: 0; }
.card { border: 0; }
.card-header { border: 0; }
</style>