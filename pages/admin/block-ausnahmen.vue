<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="h4 m-0">Ausnahmen</div>
    </div>
    <p class="text-muted">
      Hier können Sie Schüler oder ganze Klassenstufen von bestimmten Blocks ausnehmen
      (z.B. für Klassenleiterstunden oder andere Verpflichtungen).
    </p>

    <div v-if="periodStore.selectedId">
      <!-- Formular zum Hinzufügen -->
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">
            <i class="bi bi-plus-circle"></i> Neue Ausnahme hinzufügen
          </h5>
        </div>
        <div class="card-body">
          <!-- Ausnahme-Typ -->
          <div class="mb-3">
            <label class="form-label fw-bold">Ausnahme für:</label>
            <div class="form-check">
              <input
                  class="form-check-input"
                  type="radio"
                  v-model="exclusionType"
                  value="user"
                  id="typeUser"
              >
              <label class="form-check-label" for="typeUser">
                Einzelner Schüler
              </label>
            </div>
            <div class="form-check">
              <input
                  class="form-check-input"
                  type="radio"
                  v-model="exclusionType"
                  value="grade"
                  id="typeGrade"
              >
              <label class="form-check-label" for="typeGrade">
                Gesamte Klassenstufe
              </label>
            </div>
          </div>

          <!-- Schüler-Auswahl -->
          <div v-if="exclusionType === 'user'" class="mb-3">
            <label class="form-label fw-bold">Schüler:</label>
            <select v-model="selectedUserName" class="form-select">
              <option :value="null">Bitte wählen...</option>
              <option v-for="user in sortedStudents" :key="user.userName" :value="user.userName">
                {{ user.lastName }}, {{ user.firstName }} (Klasse {{ user.grade }})
              </option>
            </select>
          </div>

          <!-- Klassenstufen-Auswahl -->
          <div v-if="exclusionType === 'grade'" class="mb-3">
            <label class="form-label fw-bold">Klassenstufe:</label>
            <select v-model="selectedGrade" class="form-select">
              <option :value="null">Bitte wählen...</option>
              <option v-for="grade in availableGrades" :key="grade" :value="grade">
                Klassenstufe {{ grade }}
              </option>
            </select>
          </div>

          <!-- Block-Auswahl -->
          <div class="mb-3">
            <label class="form-label fw-bold">Block:</label>
            <select v-model="selectedBlockId" class="form-select">
              <option :value="null">Bitte wählen...</option>
              <option v-for="block in sortedBlocks" :key="block.id" :value="block.id">
                {{ formatBlock(block) }}
              </option>
            </select>
          </div>

          <!-- Grund (optional) -->
          <div class="mb-3">
            <label class="form-label fw-bold">
              Grund (optional):
            </label>
            <input
                v-model="reason"
                type="text"
                class="form-control"
                placeholder="z.B. Klassenleiterstunde"
                maxlength="512"
            >
            <div class="form-text">
              Dieser Grund wird nur zur internen Dokumentation gespeichert.
            </div>
          </div>

          <button
              class="btn btn-primary"
              @click="addExclusion"
              :disabled="!canAddExclusion || adding"
          >
            <span v-if="adding" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-plus-circle me-2"></i>
            {{ exclusionType === 'grade' ? 'Ausnahmen für Klassenstufe hinzufügen' : 'Ausnahme hinzufügen' }}
          </button>
        </div>
      </div>

      <!-- Liste der Ausnahmen -->
      <div class="card">
        <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-list-ul"></i> Bestehende Ausnahmen
          </h5>
          <span class="badge bg-light text-dark">{{ exclusions.length }}</span>
        </div>
        <div class="card-body">
          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Lädt...</span>
            </div>
            <p class="mt-2 text-muted">Lade Ausnahmen...</p>
          </div>

          <div v-else-if="exclusions.length === 0" class="text-center text-muted py-4">
            <i class="bi bi-inbox" style="font-size: 3rem;"></i>
            <p class="mt-2">Noch keine Ausnahmen vorhanden.</p>
          </div>

          <div v-else>
            <!-- Filter und Suche -->
            <div class="row mb-3">
              <div class="col-md-6">
                <input
                    v-model="searchTerm"
                    type="text"
                    class="form-control"
                    placeholder="Nach Name suchen..."
                >
              </div>
              <div class="col-md-3">
                <select v-model="filterGrade" class="form-select">
                  <option :value="null">Alle Klassenstufen</option>
                  <option v-for="grade in availableGrades" :key="grade" :value="grade">
                    Klasse {{ grade }}
                  </option>
                </select>
              </div>
              <div class="col-md-3">
                <select v-model="filterBlockId" class="form-select">
                  <option :value="null">Alle Blocks</option>
                  <option v-for="block in sortedBlocks" :key="block.id" :value="block.id">
                    {{ formatBlockShort(block) }}
                  </option>
                </select>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead class="table-light">
                <tr>
                  <th>Name</th>
                  <th>Klasse</th>
                  <th>Block</th>
                  <th>Grund</th>
                  <th>Erstellt am</th>
                  <th style="width: 100px;">Aktionen</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="exclusion in filteredExclusions" :key="exclusion.id">
                  <td>{{ exclusion.lastName }}, {{ exclusion.firstName }}</td>
                  <td>
                    <span class="badge bg-info">{{ exclusion.grade }}</span>
                  </td>
                  <td>{{ getBlockLabel(exclusion.blockId) }}</td>
                  <td>
                      <span v-if="exclusion.reason" class="text-muted">
                        {{ exclusion.reason }}
                      </span>
                    <span v-else class="text-muted fst-italic">-</span>
                  </td>
                  <td>
                    <small class="text-muted">
                      {{ formatDate(exclusion.createdAt) }}
                    </small>
                  </td>
                  <td>
                    <button
                        class="btn btn-sm btn-danger"
                        @click="removeExclusion(exclusion)"
                        :disabled="removing === exclusion.id"
                        title="Ausnahme entfernen"
                    >
                      <span v-if="removing === exclusion.id" class="spinner-border spinner-border-sm"></span>
                      <i v-else class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>

            <div v-if="filteredExclusions.length !== exclusions.length" class="text-muted mt-2">
              {{ filteredExclusions.length }} von {{ exclusions.length }} Ausnahmen angezeigt
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="alert alert-warning">
      <i class="bi bi-exclamation-triangle"></i>
      Bitte wählen Sie zunächst eine Period aus.
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

const {$authFetch} = useNuxtApp()
const toastStore = useToastStore()
const periodStore = usePeriodContextStore()

// Weekday Labels aus Utility
import {weekdayLabels} from '@/utils/weekdays'

// Sortier-Reihenfolge für Wochentage
const dayOfWeekOrder: Record<string, number> = {
  'MONDAY': 0,
  'TUESDAY': 1,
  'WEDNESDAY': 2,
  'THURSDAY': 3,
  'FRIDAY': 4,
  'SATURDAY': 5,
  'SUNDAY': 6
}

// Interfaces
interface Block {
  id: number
  dayOfWeek: string  // "MONDAY", "TUESDAY", etc.
  startTime: string
  endTime: string
}

interface User {
  userName: string
  firstName: string
  lastName: string
  grade: number
  ilaMember: boolean
}

interface Exclusion {
  id: number
  userName: string
  firstName: string
  lastName: string
  grade: number
  blockId: number
  periodId: number
  reason: string | null
  createdAt: string
}

// State
const blocks = ref<Block[]>([])
const students = ref<User[]>([])
const grades = ref<number[]>([])
const exclusions = ref<Exclusion[]>([])

// Loading states
const loading = ref(false)
const adding = ref(false)
const removing = ref<number | null>(null)

// Form data
const exclusionType = ref<'user' | 'grade'>('user')
const selectedUserName = ref<string | null>(null)
const selectedGrade = ref<number | null>(null)
const selectedBlockId = ref<number | null>(null)
const reason = ref('')

// Filter
const searchTerm = ref('')
const filterGrade = ref<number | null>(null)
const filterBlockId = ref<number | null>(null)

// Computed
const availableGrades = computed(() => {
  return [...grades.value].sort((a, b) => a - b)
})

const sortedStudents = computed(() => {
  return [...students.value].sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade
    if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName)
    return a.firstName.localeCompare(b.firstName)
  })
})

const sortedBlocks = computed(() => {
  return [...blocks.value].sort((a, b) => {
    const orderA = dayOfWeekOrder[a.dayOfWeek] ?? 999
    const orderB = dayOfWeekOrder[b.dayOfWeek] ?? 999
    if (orderA !== orderB) return orderA - orderB
    return a.startTime.localeCompare(b.startTime)
  })
})

const canAddExclusion = computed(() => {
  if (!selectedBlockId.value) return false
  if (exclusionType.value === 'user') return selectedUserName.value !== null
  if (exclusionType.value === 'grade') return selectedGrade.value !== null
  return false
})

const filteredExclusions = computed(() => {
  let filtered = [...exclusions.value]

  // Name search
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter(e =>
        e.firstName.toLowerCase().includes(term) ||
        e.lastName.toLowerCase().includes(term)
    )
  }

  // Grade filter
  if (filterGrade.value !== null) {
    filtered = filtered.filter(e => e.grade === filterGrade.value)
  }

  // Block filter
  if (filterBlockId.value !== null) {
    filtered = filtered.filter(e => e.blockId === filterBlockId.value)
  }

  // Sort
  return filtered.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade
    if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName)
    return a.firstName.localeCompare(b.firstName)
  })
})

// Methods
const formatBlock = (block: Block) => {
  const dayLabel = weekdayLabels[block.dayOfWeek] || block.dayOfWeek
  return `${dayLabel}, ${block.startTime.substring(0, 5)} - ${block.endTime.substring(0, 5)}`
}

const formatBlockShort = (block: Block) => {
  const dayLabel = weekdayLabels[block.dayOfWeek] || block.dayOfWeek
  const shortDay = dayLabel.substring(0, 2)
  return `${shortDay} ${block.startTime.substring(0, 5)}`
}

const getBlockLabel = (blockId: number) => {
  const block = blocks.value.find(b => b.id === blockId)
  return block ? formatBlock(block) : `Block ${blockId}`
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadBlocks = async () => {
  if (!periodStore.selectedId) return
  try {
    blocks.value = await $authFetch('/blocks', {
      params: {'period-id': periodStore.selectedId}
    })
  } catch (err: any) {
    toastStore.error(err?.data?.message ?? 'Fehler beim Laden der Blocks')
  }
}

const loadStudents = async () => {
  try {
    const allUsers = await $authFetch('/users') as User[]
    students.value = allUsers.filter((u: User) => u.ilaMember)
  } catch (err: any) {
    toastStore.error(err?.data?.message ?? 'Fehler beim Laden der Schüler')
  }
}

const loadGrades = async () => {
  try {
    grades.value = await $authFetch('/users/grades') as number[]
  } catch (err: any) {
    toastStore.error(err?.data?.message ?? 'Fehler beim Laden der Klassenstufen')
  }
}

const loadExclusions = async () => {
  if (!periodStore.selectedId) return

  loading.value = true
  try {
    await Promise.all([
      loadBlocks(),
      loadStudents(),
      loadGrades()
    ])

    exclusions.value = await $authFetch('/block-exclusions', {
      params: {periodId: periodStore.selectedId}
    })
  } catch (err: any) {
    toastStore.error(err?.data?.message ?? 'Fehler beim Laden der Ausnahmen')
  } finally {
    loading.value = false
  }
}

const addExclusion = async () => {
  if (!canAddExclusion.value || !periodStore.selectedId) return

  const request: any = {
    blockId: selectedBlockId.value,
    periodId: periodStore.selectedId,
    reason: reason.value || null
  }

  if (exclusionType.value === 'user') {
    request.userName = selectedUserName.value
  } else {
    request.grade = selectedGrade.value
  }

  adding.value = true
  try {
    const response = await $authFetch('/block-exclusions', {
      method: 'POST',
      body: request
    })

    if (exclusionType.value === 'user') {
      toastStore.success('Ausnahme hinzugefügt')
    } else {
      // BatchExclusionResult
      if (response.added > 0) {
        toastStore.success(response.message)
      } else {
        toastStore.warning('Alle Schüler hatten bereits diese Ausnahme')
      }
    }

    // Reset form
    selectedUserName.value = null
    selectedGrade.value = null
    selectedBlockId.value = null
    reason.value = ''

    // Reload
    await loadExclusions()
  } catch (err: any) {
    toastStore.error(err?.data?.message ?? 'Fehler beim Hinzufügen der Ausnahme')
  } finally {
    adding.value = false
  }
}

const removeExclusion = async (exclusion: Exclusion) => {
  const confirmMsg = `Ausnahme für ${exclusion.firstName} ${exclusion.lastName} wirklich entfernen?`
  if (!confirm(confirmMsg)) return

  removing.value = exclusion.id
  try {
    await $authFetch(`/block-exclusions/${exclusion.id}`, {
      method: 'DELETE'
    })
    toastStore.success('Ausnahme entfernt')
    await loadExclusions()
  } catch (err: any) {
    toastStore.error(err?.data?.message ?? 'Fehler beim Entfernen der Ausnahme')
  } finally {
    removing.value = null
  }
}

// Lifecycle
onMounted(async () => {
  // Period Store initialisieren falls noch nicht geschehen
  if (!periodStore.initialized) {
    await periodStore.loadPeriods($authFetch)
  }

  // Daten laden wenn Period bereits gewählt ist
  if (periodStore.selectedId) {
    await loadExclusions()
  }
})

// Überwache Änderungen der ausgewählten Period
watch(() => periodStore.selectedId, async (newPeriodId) => {
  if (newPeriodId) {
    await loadExclusions()
  }
})
</script>

<style scoped>
.table th {
  font-weight: 600;
  background-color: #f8f9fa;
}

.card-header {
  font-weight: 600;
}

.bi {
  font-size: 1.1em;
}
</style>