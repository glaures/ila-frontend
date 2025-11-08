<script setup lang="ts">
definePageMeta({layout: 'admin'})

import {ref, computed, onMounted, watch} from 'vue'
import {useNuxtApp} from '#app'
import TimeInput from '@/components/TimeInput.vue'
import {usePeriodContextStore} from '@/stores/periodContext'
import {weekdayLabels} from '@/utils/weekdays'
import { useToastStore } from '@/stores/toast'

type BlockDto = {
  id?: number
  periodId: number
  dayOfWeek: string
  startTime: string
  endTime: string
}

type CourseDto = {
  id?: number
  courseId?: string
  name?: string
}

const periodContext = usePeriodContextStore()
const {$authFetch} = useNuxtApp() as any

const loading = ref(false)
const blocks = ref<BlockDto[]>([])
const selectedBlockId = ref<number | null>(null)

const form = ref<BlockDto | null>(null)
const isSaving = ref(false)

// Delete flow state
const isDeleting = ref(false)
const isLoadingLinkedCourses = ref(false)
const showDeleteModal = ref(false)
const coursesInBlock = ref<CourseDto[]>([])

const DAYS = Object.keys(weekdayLabels)
const DAY_ORDER: Record<string, number> = {
  MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7
}

const blockLabel = (b: BlockDto) =>
    `${weekdayLabels[b.dayOfWeek] ?? b.dayOfWeek} ${b.startTime}–${b.endTime}`

const selectedBlock = computed(() =>
    blocks.value.find(b => b.id === selectedBlockId.value) || null
)

const showCopyModal = ref(false)
const sourcePeriodId = ref<number | null>(null)
const isCopying = ref(false)
const availableSourcePeriods = ref<any[]>([])

const toastStore = useToastStore()

// Perioden laden (außer der aktuellen)
async function loadAvailableSourcePeriods() {
  try {
    const allPeriods = await $authFetch('/periods')
    availableSourcePeriods.value = allPeriods.filter(
        (p: any) => p.id !== periodContext.selectedPeriod?.id
    )
    // Sortiere nach Datum absteigend (neueste zuerst)
    availableSourcePeriods.value.sort((a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  } catch (err) {
    console.error('Fehler beim Laden der Perioden:', err)
  }
}

function openCopyModal() {
  showCopyModal.value = true
  loadAvailableSourcePeriods()
  // Pre-select die vorherige Periode falls vorhanden
  if (availableSourcePeriods.value.length > 0) {
    sourcePeriodId.value = availableSourcePeriods.value[0].id
  }
}

async function copyBlocksFromSourcePeriod() {
  if (!sourcePeriodId.value || !periodContext.selectedPeriod?.id) return

  isCopying.value = true
  try {
    await $authFetch('/blocks/copy-from-period', {
      method: 'POST',
      params: {
        'source-period-id': sourcePeriodId.value,
        'target-period-id': periodContext.selectedPeriod.id
      }
    })
    showCopyModal.value = false
    await loadBlocksForCurrentPeriod()
    // Optional: Success-Toast
    toastStore.success('Blöcke erfolgreich kopiert!')
  } catch (err) {
    toastStore.error(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  } finally {
    isCopying.value = false
  }
}

function cancelCopy() {
  showCopyModal.value = false
  sourcePeriodId.value = null
}

function newEmptyForCurrentPeriod(): BlockDto {
  const pid = periodContext.selectedPeriod?.id
  return {
    periodId: pid ?? 0,
    dayOfWeek: 'MONDAY',
    startTime: '08:00',
    endTime: '09:00'
  }
}

function ensureFormFromSelection() {
  if (selectedBlock.value) {
    form.value = JSON.parse(JSON.stringify(selectedBlock.value))
  } else {
    form.value = newEmptyForCurrentPeriod()
  }
}

async function loadBlocksForCurrentPeriod() {
  const pid = periodContext.selectedPeriod?.id
  if (!pid) {
    blocks.value = []
    selectedBlockId.value = null
    form.value = null
    return
  }
  loading.value = true
  try {
    const res = await $authFetch(`/blocks?period-id=${pid}`)
    const list: BlockDto[] = Array.isArray(res) ? res : []
    list.sort((a, b) => {
      const d = (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99)
      if (d !== 0) return d
      return a.startTime.localeCompare(b.startTime)
    })
    blocks.value = list
    if (selectedBlockId.value != null && !blocks.value.some(b => b.id === selectedBlockId.value)) {
      selectedBlockId.value = null
    }
    ensureFormFromSelection()
  } finally {
    loading.value = false
  }
}

function createNew() {
  selectedBlockId.value = null
  form.value = newEmptyForCurrentPeriod()
}

async function save() {
  if (!form.value || !form.value.periodId) return
  isSaving.value = true
  try {
    const payload = {
      periodId: form.value.periodId,
      dayOfWeek: form.value.dayOfWeek,
      startTime: form.value.startTime,
      endTime: form.value.endTime
    }
    if (form.value.id) {
      await $authFetch(`/blocks/${form.value.id}`, {method: 'PUT', body: payload})
    } else {
      const created = await $authFetch(`/blocks`, {method: 'POST', body: payload})
      await loadBlocksForCurrentPeriod()
      if (created?.id) {
        selectedBlockId.value = created.id
        ensureFormFromSelection()
      }
      return
    }
    await loadBlocksForCurrentPeriod()
  } finally {
    isSaving.value = false
  }
}

/** Direkt Kurse laden und Modal öffnen (keine erste confirm-Nachfrage) */
async function openDeleteModal() {
  if (!selectedBlock.value?.id) return
  isLoadingLinkedCourses.value = true
  showDeleteModal.value = true
  try {
    const res = await $authFetch(`/courses?block-id=${selectedBlock.value.id}`)
    const list: CourseDto[] = Array.isArray(res) ? res : []
    // Optional: nach Name/CourseId sortieren
    coursesInBlock.value = list.sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '') || (a.courseId ?? '').localeCompare(b.courseId ?? '')
    )
  } finally {
    isLoadingLinkedCourses.value = false
  }
}

/** Final bestätigen und DELETE ausführen */
async function confirmDeleteBlock() {
  if (!selectedBlock.value?.id) return
  isDeleting.value = true
  try {
    await $authFetch(`/blocks/${selectedBlock.value.id}`, {method: 'DELETE'})
    showDeleteModal.value = false
    selectedBlockId.value = null
    await loadBlocksForCurrentPeriod()
  } finally {
    isDeleting.value = false
  }
}

function cancelDelete() {
  showDeleteModal.value = false
}

onMounted(async () => {
  await loadBlocksForCurrentPeriod()
})

watch(() => periodContext.selectedPeriod?.id, async () => {
  selectedBlockId.value = null
  await loadBlocksForCurrentPeriod()
})

watch(selectedBlockId, () => {
  ensureFormFromSelection()
})
</script>

<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="h4 m-0">Blöcke</div>
    </div>
    <div class="row g-3">
      <!-- Linke Spalte: Liste -->
      <div class="col-12 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" @click="createNew">
                  Neu
                </button>
                <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="openCopyModal"
                    :disabled="!periodContext.selectedPeriod || blocks.length > 0"
                    title="Blöcke aus vorheriger Periode kopieren"
                >
                  Kopieren
                </button>
              </div>
            </div>

            <!-- Hinweis wenn bereits Blöcke existieren -->
            <div v-if="blocks.length > 0" class="alert alert-info alert-sm mb-2">
              <small>
                💡 Tipp: Die Kopierfunktion ist nur für leere Perioden verfügbar.
              </small>
            </div>

            <div v-if="loading" class="text-muted">Lade Blöcke…</div>

            <ul v-else class="list-group">
              <li
                  v-for="b in blocks"
                  :key="b.id"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  :class="{'active': b.id === selectedBlockId}"
                  role="button"
                  @click="selectedBlockId = b.id ?? null"
              >
                <div>
                  <div class="fw-semibold">{{ blockLabel(b) }}</div>
                  <small class="text-muted">ID: {{ b.id }}</small>
                </div>
                <span v-if="b.id === selectedBlockId" class="badge bg-light text-dark">ausgewählt</span>
              </li>
              <li v-if="!blocks.length" class="list-group-item text-muted">
                Keine Blöcke gefunden.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Rechte Spalte: Formular -->
      <div class="col-12 col-lg-7">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title mb-3">
              {{ selectedBlock ? 'Block bearbeiten' : 'Neuen Block anlegen' }}
            </h5>

            <div v-if="!periodContext.selectedPeriod" class="alert alert-warning">
              Bitte wähle zuerst eine Phase (Period), um Blöcke anzuzeigen oder anzulegen.
            </div>

            <form v-if="form && periodContext.selectedPeriod" @submit.prevent="save" class="vstack gap-3">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Wochentag</label>
                  <select class="form-select" v-model="form.dayOfWeek" required>
                    <option v-for="d in DAYS" :key="d" :value="d">{{ weekdayLabels[d] }}</option>
                  </select>
                </div>

                <div class="col-md-3">
                  <label class="form-label">Startzeit</label>
                  <TimeInput v-model="form.startTime" required/>
                </div>

                <div class="col-md-3">
                  <label class="form-label">Endzeit</label>
                  <TimeInput v-model="form.endTime" required/>
                </div>
              </div>

              <div class="d-flex gap-2">
                <button class="btn btn-success" type="submit" :disabled="isSaving">
                  <span v-if="isSaving" class="spinner-border spinner-border-sm me-2"/>
                  Speichern
                </button>

                <button
                    v-if="selectedBlock"
                    class="btn btn-outline-danger"
                    type="button"
                    :disabled="isDeleting || isLoadingLinkedCourses"
                    @click="openDeleteModal"
                >
                  <span v-if="isDeleting || isLoadingLinkedCourses" class="spinner-border spinner-border-sm me-2"/>
                  Löschen
                </button>

                <button class="btn btn-outline-secondary ms-auto" type="button" @click="createNew">
                  Abbrechen / Neu
                </button>
              </div>
            </form>

            <div v-else class="text-muted">Kein Formular verfügbar.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kopieren-Modal -->
    <div
        v-if="showCopyModal"
        class="modal fade show d-block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        style="background-color: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Blöcke aus Vorperiode kopieren</h5>
            <button type="button" class="btn-close" @click="cancelCopy"></button>
          </div>
          <div class="modal-body">
            <p class="mb-3">
              Kopiere alle Zeitblöcke aus einer existierenden Periode in die aktuelle Periode:
              <strong>{{ periodContext.selectedPeriod?.name }}</strong>
            </p>

            <div class="mb-3">
              <label class="form-label">Quell-Periode auswählen:</label>
              <select
                  class="form-select"
                  v-model="sourcePeriodId"
                  required
              >
                <option :value="null" disabled>-- Bitte wählen --</option>
                <option
                    v-for="p in availableSourcePeriods"
                    :key="p.id"
                    :value="p.id"
                >
                  {{ p.name }} ({{ p.startDate }} - {{ p.endDate }})
                </option>
              </select>
            </div>

            <div class="alert alert-warning">
              <strong>Hinweis:</strong> Es werden nur die Zeitblöcke kopiert,
              nicht die Kurszuordnungen!
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" @click="cancelCopy">
              Abbrechen
            </button>
            <button
                class="btn btn-primary"
                :disabled="!sourcePeriodId || isCopying"
                @click="copyBlocksFromSourcePeriod"
            >
              <span v-if="isCopying" class="spinner-border spinner-border-sm me-2" />
              Blöcke kopieren
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bestätigungs-Modal (einzige Nachfrage) -->
    <div
        v-if="showDeleteModal"
        class="modal fade show d-block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        style="background-color: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Block wirklich löschen?</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="cancelDelete"></button>
          </div>
          <div class="modal-body">
            <p class="mb-3">
              Dieser Block ist ausgewählt:
              <strong v-if="selectedBlock">{{ blockLabel(selectedBlock) }}</strong>
            </p>

            <div v-if="isLoadingLinkedCourses" class="text-muted">Lade verknüpfte Kurse…</div>

            <div v-else>
              <div v-if="coursesInBlock.length">
                <p class="mb-2">
                  Folgende Kurse sind diesem Block zugeordnet und verlieren bei einer Löschung ihre Blockzuweisung:
                </p>
                <ul class="list-group mb-3">
                  <li v-for="c in coursesInBlock" :key="c.id" class="list-group-item">
                    <div class="d-flex justify-content-between">
                      <span>
                        <strong>{{ c.name ?? 'Unbenannter Kurs' }}</strong>
                        <span v-if="c.courseId" class="text-muted"> ({{ c.courseId }})</span>
                      </span>
                      <small class="text-muted">ID: {{ c.id }}</small>
                    </div>
                  </li>
                </ul>
                <div class="alert alert-warning">
                  <strong>Achtung:</strong> Diese Kurse müssen anschließend neu einem Block zugeordnet werden.
                </div>
              </div>
              <div v-else class="alert alert-info">
                Für diesen Block sind aktuell keine Kurse zugeordnet.
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" @click="cancelDelete">Abbrechen</button>
            <button class="btn btn-danger" type="button" :disabled="isDeleting" @click="confirmDeleteBlock">
              <span v-if="isDeleting" class="spinner-border spinner-border-sm me-2"/>
              Ja, endgültig löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-group-item.active {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.modal {
  transition: opacity .15s ease-in-out;
}
</style>
