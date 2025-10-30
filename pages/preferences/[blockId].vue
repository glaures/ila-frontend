<template>
  <div class="container-fluid py-4">
    <StatusCard :status="preferencesStatus" v-if="preferencesStatus"/>

    <!-- Navigation -->
    <div class="mt-3 d-flex justify-content-between mb-3">
      <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="!hasPreviousBlock || isSaving"
          @click="goToPreviousBlock"
          aria-label="Zum vorherigen Block zurück"
      >
        <span v-if="isSaving && navigationDirection === 'prev'" class="spinner-border spinner-border-sm me-1"></span>
        &larr; Zurück
      </button>
      <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="!hasNextBlock || isSaving"
          @click="goToNextBlock"
          aria-label="Zum nächsten Block weiter"
      >
        <span v-if="isSaving && navigationDirection === 'next'" class="spinner-border spinner-border-sm me-1"></span>
        Weiter &rarr;
      </button>
    </div>

    <div class="h4 mt-3">{{ currentBlockLabel }}</div>

    <!-- Bereits zugewiesener Kurs -->
    <div v-if="alreadyAssignedCourse" class="alert alert-success mt-4" role="status">
      <div class="d-flex align-items-start">
        <i class="bi bi-check-circle-fill text-success fs-4 me-3 flex-shrink-0"></i>
        <div class="flex-grow-1">
          <h5 class="alert-heading mb-2">Zuweisung erfolgt</h5>
          <p class="mb-1">
            Du wurdest dem Kurs <strong>{{ alreadyAssignedCourse.name }}</strong> zugeteilt.
          </p>
          <div class="mt-2 d-flex flex-wrap gap-1">
            <span
                v-for="cat in alreadyAssignedCourse.courseCategories"
                :key="cat"
                class="badge"
                :style="{ 
                  backgroundColor: getCategoryInfo(cat).color, 
                  color: getCategoryInfo(cat).textColor 
                }"
            >
              {{ categoryLabelMap[cat as CategoryCode] || cat }}
            </span>
          </div>
          <hr class="my-2">
          <p class="small text-muted mb-0">
            <i class="bi bi-info-circle me-1"></i>
            Diese Zuweisung ist verbindlich und kann nicht mehr geändert werden.
          </p>
        </div>
      </div>
    </div>

    <!-- Präferenzauswahl -->
    <template v-else>
      <!-- Hilfetext -->
      <div class="alert alert-info small">
        <i class="bi bi-info-circle me-2"></i>
        Sortiere die Kurse nach Deiner Präferenz. Der Algorithmus berücksichtigt deine Präferenzen
        über alle Blöcke hinweg bei der finalen Zuweisung. Nutze die Pfeile oder Drag & Drop.
      </div>

      <!-- Kursliste -->
      <draggable
          v-model="preferences"
          item-key="id"
          class="list-group"
          :disabled="isSaving"
          handle=".drag-handle"
          ghost-class="drag-ghost"
          @end="onDragEnd">
        <template #item="{ element, index }">
          <div
              class="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-start"
              :class="{ 'bg-warning-subtle': element.id === lastMovedId }"
          >
            <div class="me-md-3 flex-grow-1">
              <div>
                <i class="bi bi-grip-vertical drag-handle me-3" aria-hidden="true"></i>
                <strong>{{ index + 1 }}. {{ element.name }}</strong>
              </div>
              <div class="mt-1 d-flex flex-wrap">
                <span
                    v-for="cat in element.courseCategories"
                    :key="cat"
                    class="badge me-1 mb-1"
                    :style="{ 
                      backgroundColor: getCategoryInfo(cat).color,
                      color: getCategoryInfo(cat).textColor
                    }"
                >
                  {{ categoryLabelMap[cat as CategoryCode] || cat }}
                </span>
              </div>
              <div class="d-flex flex-wrap gap-1 mt-2 mt-md-0">
                <button
                    class="btn btn-sm btn-outline-secondary"
                    :disabled="index === 0 || isSaving"
                    @click="moveUp(index)"
                    aria-label="Kurs einen Platz nach oben bewegen"
                >
                  <i class="bi bi-chevron-up" aria-hidden="true"></i>
                </button>
                <button
                    class="btn btn-sm btn-outline-secondary"
                    :disabled="index === preferences.length - 1 || isSaving"
                    @click="moveDown(index)"
                    aria-label="Kurs einen Platz nach unten bewegen"
                >
                  <i class="bi bi-chevron-down" aria-hidden="true"></i>
                </button>
                <button
                    class="btn btn-sm btn-outline-secondary"
                    :disabled="index === 0 || isSaving"
                    @click="moveToTop(index)"
                    aria-label="Kurs ganz nach oben bewegen"
                >
                  <i class="bi bi-arrow-up" aria-hidden="true"></i>
                </button>
                <button
                    class="btn btn-sm btn-outline-secondary"
                    :disabled="index === preferences.length - 1 || isSaving"
                    @click="moveToBottom(index)"
                    aria-label="Kurs ganz nach unten bewegen"
                >
                  <i class="bi bi-arrow-down" aria-hidden="true"></i>
                </button>
                <button
                    class="btn btn-sm btn-outline-info"
                    @click="showInfo(element)"
                    :disabled="isSaving"
                    aria-label="Kursinfo anzeigen"
                >
                  <i class="bi bi-info-circle" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
        </template>
      </draggable>

      <!-- Saving Indicator -->
      <div v-if="isSaving && !navigationDirection" class="text-center mt-3 text-muted small">
        <span class="spinner-border spinner-border-sm me-2"></span>
        Speichere Änderungen...
      </div>
    </template>

    <!-- Info-Modal -->
    <div class="modal fade" ref="infoModalRef" id="infoModal" tabindex="-1" aria-labelledby="infoModalLabel">
      <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="infoModalLabel">{{ selectedCourse?.name || 'Kursinfo' }}</h5>
            <button type="button" class="btn-close" @click="closeModal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body">
            <p v-if="selectedCourse?.description?.trim()">
              {{ selectedCourse.description }}
            </p>
            <p v-else class="text-muted fst-italic">
              Zu diesem Kurs liegt derzeit keine Beschreibung vor.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="position-fixed bottom-0 mb-4">
      <ErrorBanner/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import draggable from 'vuedraggable'
import { useErrorStore } from '~/stores/error'
import { weekdayLabels } from '~/utils/weekdays'
import { categoryLabelMap, categoryColors, getCategoryInfo, type CategoryCode } from '~/utils/categories'

// Types
interface Course {
  id: number
  name: string
  courseCategories: string[]
  description?: string
}

interface Block {
  id: number
  dayOfWeek: string
  startTime: string
  endTime: string
}

interface PreferencesStatus {
  progress: number
  categories: string[]
  isCategoryDistributionOk: boolean
  readyToSubmit: boolean
  advices: string[]
}

type NavigationDirection = 'prev' | 'next' | null

// Composables
const { $authFetch } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const errorStore = useErrorStore()

// State
const blocks = ref<Block[]>([])
const currentBlockIndex = ref(-1)
const currentBlock = computed(() => blocks.value[currentBlockIndex.value] || null)
const allCourses = ref<Course[]>([])
const preferencesStatus = ref<PreferencesStatus>()

const selectedCourse = ref<Course | null>(null)
const alreadyAssignedCourse = ref<Course | null>(null)
const preferences = ref<Course[]>([])
const lastMovedId = ref<number | null>(null)

const isSaving = ref(false)
const navigationDirection = ref<NavigationDirection>(null)

const infoModalRef = ref()
let modalInstance: any = null

// Computed
const currentBlockLabel = computed(() => {
  const block = currentBlock.value
  if (!block) return 'Block'
  const day = weekdayLabels[block.dayOfWeek] || block.dayOfWeek
  return `${day} ${block.startTime} – ${block.endTime}`
})

const hasPreviousBlock = computed(() => currentBlockIndex.value > 0)
const hasNextBlock = computed(() => currentBlockIndex.value < blocks.value.length - 1)

// API Calls
const fetchPreferencesStatus = async () => {
  try {
    preferencesStatus.value = await $authFetch("/preferences-status")
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden des Status')
  }
}

const fetchBlocks = async () => {
  try {
    blocks.value = await $authFetch("/blocks")

    const currentId = Number(route.params.blockId)
    const index = blocks.value.findIndex(b => b.id === currentId)
    if (index !== -1) {
      currentBlockIndex.value = index
      await fetchPreferences(currentId)
    } else {
      router.replace("/preferences")
    }
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Blöcke')
  }
}

const fetchPreferences = async (blockId: number) => {
  try {
    // Prüfen ob bereits zugewiesen
    const assignmentsResponse: any = await $authFetch(`/assignments/${blockId}`)
    if (assignmentsResponse.assignment) {
      alreadyAssignedCourse.value = assignmentsResponse.assignment.course
      return
    }
    // alle angebotenen Kurse laden
    const coursesResponse = await $authFetch(`/courses?block-id=${blockId}`)
    const courseMap = new Map(coursesResponse.map((c: Course) => [c.id, c]))
    allCourses.value = coursesResponse

    // Präferenzen laden
    const preferencesResponse: any = await $authFetch(`/preferences/${blockId}`)

    const hasExistingPreferences = preferencesResponse.preferencedCourseIds?.length > 0

    // Wenn keine gespeicherten Präferenzen: komplette Kursliste verwenden
    preferences.value = hasExistingPreferences
        ? preferencesResponse.preferencedCourseIds.map((id: number) => courseMap.get(id)).filter(Boolean)
        : [...coursesResponse]

    // Wenn keine Präferenzen vorhanden waren, speichere die initiale Liste direkt
    if (!hasExistingPreferences && preferences.value.length > 0) {
      const payload = {
        preferencedCourseIds: preferences.value.map(c => c.id),
      }

      try {
        await $authFetch(`/preferences/${blockId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (err: any) {
        console.error('Fehler beim initialen Speichern:', err)
        // Fehler nicht anzeigen, da dies im Hintergrund passiert
      }
    }

    await fetchPreferencesStatus()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Präferenzen')
  }
}

const savePreferences = async () => {
  if (!currentBlock.value || isSaving.value) return

  isSaving.value = true
  const payload = {
    preferencedCourseIds: preferences.value.map(c => c.id),
  }

  try {
    await $authFetch(`/preferences/${currentBlock.value.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    // Status aktualisieren
    await fetchPreferencesStatus()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Speichern')
    throw err
  } finally {
    isSaving.value = false
  }
}

// Debounced save für UI-Interaktionen
const debouncedSave = useDebounceFn(async () => {
  await savePreferences()
}, 800)

// Navigation
const goToPreviousBlock = async () => {
  if (currentBlockIndex.value > 0 && !isSaving.value) {
    try {
      navigationDirection.value = 'prev'
      await savePreferences()
      const prevBlock = blocks.value[currentBlockIndex.value - 1]
      await router.push(`/preferences/${prevBlock.id}`)
    } catch (err: any) {
      errorStore.show(err?.data?.message ?? 'Fehler beim Navigieren')
    } finally {
      navigationDirection.value = null
    }
  }
}

const goToNextBlock = async () => {
  if (currentBlockIndex.value < blocks.value.length - 1 && !isSaving.value) {
    try {
      navigationDirection.value = 'next'
      await savePreferences()
      const nextBlock = blocks.value[currentBlockIndex.value + 1]
      await router.push(`/preferences/${nextBlock.id}`)
    } catch (err: any) {
      errorStore.show(err?.data?.message ?? 'Fehler beim Navigieren')
    } finally {
      navigationDirection.value = null
    }
  }
}

// Move operations - refactored to reduce duplication
const moveCourse = (fromIndex: number, toIndex: number) => {
  const item = preferences.value.splice(fromIndex, 1)[0]
  preferences.value.splice(toIndex, 0, item)
  lastMovedId.value = item.id
  debouncedSave()
}

const moveUp = (index: number) => {
  if (index > 0) {
    moveCourse(index, index - 1)
  }
}

const moveDown = (index: number) => {
  if (index < preferences.value.length - 1) {
    moveCourse(index, index + 1)
  }
}

const moveToTop = (index: number) => {
  moveCourse(index, 0)
}

const moveToBottom = (index: number) => {
  moveCourse(index, preferences.value.length - 1)
}

const onDragEnd = async () => {
  await debouncedSave()
}

// Modal
const showInfo = (course: Course) => {
  selectedCourse.value = course
  modalInstance?.show()
}

const closeModal = () => modalInstance?.hide()

// Watchers
watch(lastMovedId, () => {
  if (lastMovedId.value) {
    setTimeout(() => {
      lastMovedId.value = null
    }, 1000)
  }
})

watch(() => route.params.blockId, async (newVal) => {
  const newIndex = blocks.value.findIndex(b => b.id === Number(newVal))
  if (newIndex !== -1) {
    currentBlockIndex.value = newIndex
    alreadyAssignedCourse.value = null
    await fetchPreferences(Number(newVal))
  }
})

// Lifecycle
onMounted(async () => {
  await fetchBlocks()
  await nextTick()
  if (window.bootstrap && infoModalRef.value) {
    modalInstance = new window.bootstrap.Modal(infoModalRef.value)
  }
})
</script>

<style scoped>
.drag-ghost {
  opacity: 0.5;
}

.drag-handle {
  cursor: grab;
  opacity: .6;
}

.drag-handle:active {
  cursor: grabbing;
}
</style>