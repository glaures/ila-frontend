<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// --- Nuxt app injections ---
const { $authFetch } = useNuxtApp()

// --- Types ---
interface CourseUserAssignmentDTO {
  userName: string
  courseId: string | null
  courseName: string | null
  blockId: number
  predefined: boolean
  pause: boolean
  preferenceIndex: number
}

interface CourseGroup {
  courseId: string
  courseName: string
  participants: { userName: string; predefined: boolean; preferenceIndex: number }[]
}

interface BlockData {
  blockId: number
  courses: CourseGroup[]
}

const PAUSE_ID = '__PAUSE__'
const PAUSE_NAME = 'Mittagessen / Hofpause'

// --- State ---
const route = useRoute()
const router = useRouter()

const loading = ref<boolean>(false)
const errorMsg = ref<string>('')
const raw = ref<CourseUserAssignmentDTO[]>([])

const blocks = ref<BlockData[]>([])
const selectedBlockId = ref<number | null>(null)
const selectedCourseId = ref<string | null>(null)

const courseSearch = ref<string>('')

// --- Fetch ---
async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await $authFetch<CourseUserAssignmentDTO[]>('/test-assignment')
    raw.value = data ?? []
    buildBlocks()
    // initialize selection from query or fallback to first
    const fromQuery = Number(route.query.blockId)
    const exists = blocks.value.find(b => b.blockId === fromQuery)
    selectedBlockId.value = exists ? exists.blockId : (blocks.value[0]?.blockId ?? null)

    const courseFromQuery = (route.query.courseId as string | undefined) || null
    const courseExists = currentCourses.value.find(c => c.courseId === courseFromQuery)
    selectedCourseId.value = courseExists ? courseFromQuery : null
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || 'Unbekannter Fehler beim Laden.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// --- Builders ---
function buildBlocks() {
  // Group by block, then by course (including pause)
  const byBlock = new Map<number, Map<string, CourseGroup>>()
  for (const row of raw.value) {
    const bId = Number(row.blockId)
    const courseId = row.pause ? PAUSE_ID : (row.courseId ?? 'unknown')
    const courseName = row.pause ? PAUSE_NAME : (row.courseName ?? 'Unbenannter Kurs')

    if (!byBlock.has(bId)) byBlock.set(bId, new Map())
    const courseMap = byBlock.get(bId)!

    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, { courseId, courseName, participants: [] })
    }
    courseMap.get(courseId)!.participants.push({
      userName: row.userName,
      predefined: !!row.predefined,
      preferenceIndex: Number(row.preferenceIndex ?? 0),
    })
  }

  const blockList: BlockData[] = []
  ;[...byBlock.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([blockId, courseMap]) => {
        // sort participants by name; sort courses by name but put PAUSE last
        const courses = [...courseMap.values()]
            .map(c => ({
              ...c,
              participants: c.participants.sort((x, y) => x.userName.localeCompare(y.userName, 'de')),
            }))
            .sort((a, b) => {
              if (a.courseId === PAUSE_ID && b.courseId !== PAUSE_ID) return 1
              if (b.courseId === PAUSE_ID && a.courseId !== PAUSE_ID) return -1
              return a.courseName.localeCompare(b.courseName, 'de')
            })

        blockList.push({ blockId, courses })
      })

  blocks.value = blockList
}

// --- Computed ---
const blockOptions = computed(() => blocks.value.map(b => ({ value: b.blockId, label: `Block ${b.blockId}` })))

const currentBlock = computed(() => blocks.value.find(b => b.blockId === selectedBlockId.value) || null)

const currentCourses = computed(() => {
  const all = currentBlock.value?.courses ?? []
  if (!courseSearch.value.trim()) return all
  const q = courseSearch.value.toLowerCase()
  return all.filter(c => c.courseName.toLowerCase().includes(q))
})

const selectedCourse = computed(() => currentCourses.value.find(c => c.courseId === selectedCourseId.value) || null)

const participantCount = (c: CourseGroup) => c.participants.length

// --- Watch routing ---
watch([selectedBlockId, selectedCourseId], ([bId, cId]) => {
  const query: Record<string, any> = {}
  if (bId != null) query.blockId = bId
  if (cId) query.courseId = cId
  router.replace({ query })
})

function gotoPrev() {
  if (!currentBlock.value) return
  const idx = blocks.value.findIndex(b => b.blockId === currentBlock.value!.blockId)
  if (idx > 0) {
    selectedBlockId.value = blocks.value[idx - 1].blockId
    selectedCourseId.value = null
  }
}

function gotoNext() {
  if (!currentBlock.value) return
  const idx = blocks.value.findIndex(b => b.blockId === currentBlock.value!.blockId)
  if (idx >= 0 && idx < blocks.value.length - 1) {
    selectedBlockId.value = blocks.value[idx + 1].blockId
    selectedCourseId.value = null
  }
}

function selectCourse(c: CourseGroup) {
  selectedCourseId.value = c.courseId
}
</script>

<template>
  <div class="container py-3">
    <h1 class="h3 mb-3">Test‑Assignment Explorer</h1>

    <!-- Alerts -->
    <div v-if="errorMsg" class="alert alert-danger" role="alert">
      {{ errorMsg }}
    </div>

    <div v-if="loading" class="d-flex align-items-center gap-2 mb-3">
      <div class="spinner-border" role="status" aria-hidden="true"></div>
      <span>Lade Testdaten …</span>
    </div>

    <div v-if="!loading && blocks.length === 0 && !errorMsg" class="alert alert-warning">
      Keine Daten vorhanden.
    </div>

    <div v-if="blocks.length" class="row g-3">
      <!-- Controls -->
      <div class="col-12 d-flex align-items-center gap-2 flex-wrap">
        <div class="btn-group" role="group">
          <button class="btn btn-outline-secondary" @click="gotoPrev" :disabled="!currentBlock || blocks[0].blockId === currentBlock?.blockId">
            ◀︎ Vorheriger Block
          </button>
          <button class="btn btn-outline-secondary" @click="gotoNext" :disabled="!currentBlock || blocks[blocks.length-1].blockId === currentBlock?.blockId">
            Nächster Block ▶︎
          </button>
        </div>
        <div>
          <label class="form-label me-2 mb-0">Block</label>
          <select class="form-select d-inline-block w-auto" v-model.number="selectedBlockId">
            <option v-for="o in blockOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="ms-auto d-flex align-items-center gap-2">
          <input class="form-control" type="search" v-model="courseSearch" placeholder="Kurs suchen…" style="min-width: 200px;" />
        </div>
      </div>

      <!-- Course list -->
      <div class="col-12 col-lg-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h2 class="h5 mb-0">Kurse im Block {{ currentBlock?.blockId }}</h2>
              <span class="text-muted small">{{ currentCourses.length }} Kurse</span>
            </div>

            <ul class="list-group">
              <li
                  v-for="c in currentCourses"
                  :key="c.courseId"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  :class="{ active: selectedCourseId === c.courseId }"
                  @click="selectCourse(c)"
                  role="button"
              >
                <div>
                  <div class="fw-semibold">
                    {{ c.courseName }}
                    <span v-if="c.courseId === PAUSE_ID" class="badge bg-secondary ms-2">Pause</span>
                  </div>
                  <div class="small text-muted">{{ participantCount(c) }} Teilnehmer</div>
                </div>
                <span aria-hidden="true">›</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Participants -->
      <div class="col-12 col-lg-6" v-if="selectedCourse">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h2 class="h5 mb-0">Teilnehmer • {{ selectedCourse.courseName }}</h2>
              <span class="text-muted small">{{ selectedCourse.participants.length }} Teilnehmer</span>
            </div>

            <ul class="list-group">
              <li v-for="p in selectedCourse.participants" :key="p.userName" class="list-group-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-2">
                  <span>{{ p.userName }}</span>
                  <span class="badge bg-light text-muted border">Präferenz {{ p.preferenceIndex + 1 }}</span>
                </div>
                <span v-if="p.predefined" class="badge bg-info text-dark">vorgegeben</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="col-12" v-else>
        <div class="alert alert-info">
          Wähle links einen Kurs, um die Teilnehmer zu sehen.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/***** Mobile polish *****/
.list-group-item.active {
  color: inherit;
  background-color: rgba(13, 110, 253, 0.08);
  border-color: rgba(13, 110, 253, 0.25);
}
.card { border-radius: 1rem; }
</style>
