<template>
  <div class="container-fluid py-4">
    <StatusCard :status="preferencesStatus"
                v-if="preferencesStatus"/>

    <!-- Navigation -->
    <div class="mt-3 d-flex justify-content-between mb-3">
      <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="!hasPreviousBlock"
          @click="goToPreviousBlock"
      >
        &larr; Zurück
      </button>
      <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="!hasNextBlock"
          @click="goToNextBlock"
      >
        Weiter &rarr;
      </button>
    </div>

    <div class="h4 mt-3">{{ currentBlockLabel }}</div>

    <!-- Hilfetext -->
    <div class="text-info text-xs small">
      Bringe die Kurse in die Reihenfolge, die Deiner Präferenz entspricht. Nutze die Pfeile oder Drag & Drop.
    </div>

    <!-- Pause -->
    <div class="mt-2 form-check form-switch mb-3" v-if="!alreadyAssignedCourse">
      <input
          class="form-check-input"
          type="checkbox"
          id="pauseToggle"
          v-model="pauseSelected"
      />
      <label class="form-check-label" for="pauseToggle">
        Mittagessen / Hofpause
      </label>
    </div>

    <div v-else class="mt-4">
      Du hast hier bereits den Kurs
      <div class="h4 mt-2">{{ alreadyAssignedCourse.name }}</div>
      belegt.
    </div>

    <div
        class="alert alert-info"
        v-if="pauseSelected"
    >
      Für diesen Block möchtest oder kannst Du keinen Kurs belegen.
    </div>


    <!-- Kursliste -->
    <draggable
        v-if="!pauseSelected"
        v-model="preferences"
        item-key="id"
        class="list-group"
        :disabled="pauseSelected"
        handle=".drag-handle"
        ghost-class="drag-ghost"
        @end="onDragEnd">
      <template #item="{ element, index }">
        <div
            class="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-start"
            :class="{ 'bg-warning-subtle': element.id === lastMovedId }"
        >
          <!-- Drag Handle -->

          <div class="me-md-3">
            <div>
              <i class="bi bi-grip-vertical drag-handle me-3" aria-hidden="true"></i>
              <strong>{{ index + 1 }}. {{ element.name }}</strong>
            </div>
            <div class="mt-1 d-flex flex-wrap">
              <span
                  v-for="cat in element.courseCategories"
                  :key="cat"
                  class="badge me-1 mb-1 text-black"
                  :style="{ backgroundColor: categoryColor(cat) }"
              >
                {{ categoryLabelMap[cat] || cat }}
              </span>
            </div>
            <div class="d-flex flex-wrap gap-1 mt-2 mt-md-0">
              <button class="btn btn-sm btn-outline-secondary" :disabled="index === 0 || pauseSelected"
                      @click="moveUp(index)" title="Einen nach oben">
                <i class="bi bi-chevron-up"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary"
                      :disabled="index === preferences.length - 1 || pauseSelected" @click="moveDown(index)"
                      title="Einen nach unten">
                <i class="bi bi-chevron-down"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary" :disabled="index === 0 || pauseSelected"
                      @click="moveToTop(index)" title="Ganz nach oben">
                <i class="bi bi-arrow-up"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary"
                      :disabled="index === preferences.length - 1 || pauseSelected" @click="moveToBottom(index)"
                      title="Ganz nach unten">
                <i class="bi bi-arrow-down"></i>
              </button>
              <button class="btn btn-sm btn-outline-info" @click="showInfo(element)" :disabled="pauseSelected"
                      title="Kursinfo anzeigen">
                <i class="bi bi-info-circle"></i>
              </button>
            </div>
          </div>
        </div>
      </template>
    </draggable>

    <!-- Info-Modal -->
    <div class="modal fade" ref="infoModalRef" id="infoModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ selectedCourse?.name || 'Kursinfo' }}</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
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

<script setup>
import {ref, onMounted, watch, computed, nextTick} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import draggable from 'vuedraggable'

const {$authFetch} = useNuxtApp()
const route = useRoute()
const router = useRouter()
import {useErrorStore} from '~/stores/error'

const errorStore = useErrorStore()


const blocks = ref([])
const currentBlockIndex = ref(-1)
const currentBlock = computed(() => blocks.value[currentBlockIndex.value] || null)
const allCourses = ref([])
const preferencesStatus = ref()

const currentBlockLabel = computed(() => {
  const block = currentBlock.value
  if (!block) return 'Block'
  const dayMap = {
    MONDAY: 'Montag',
    TUESDAY: 'Dienstag',
    WEDNESDAY: 'Mittwoch',
    THURSDAY: 'Donnerstag',
    FRIDAY: 'Freitag'
  }
  const day = dayMap[block.dayOfWeek] || block.dayOfWeek
  return `${day} ${block.startTime} – ${block.endTime}`
})

const pauseSelected = ref(false)
const selectedCourse = ref(null)

const infoModalRef = ref()
let modalInstance = null

const alreadyAssignedCourse = ref(null)
const preferences = ref([])

const categoryLabelMap = {
  iLa: "iLa",
  KuP: "Kreativität und Praxis",
  BuE: "Bewegung und Entspannung",
  FuF: "Fordern und Fördern",
  SoL: "Selbstorganisiertes Lernen"
}

const categoryColor = (code) => {
  const colorMap = {
    iLa: "#E0E0D9",
    KuP: "#F1938B",
    BuE: "#B9D3B5",
    FuF: "#FFFEA6",
    SoL: "#000000"
  }
  return colorMap[code] || colorMap['iLa']
}

const fetchPreferencesStatus = async () => {
  preferencesStatus.value = await $authFetch("/preferences-status")
}

const fetchBlocks = async () => {
  blocks.value = await $authFetch("/blocks")

  const currentId = Number(route.params.blockId)
  const index = blocks.value.findIndex(b => b.id === currentId)
  if (index !== -1) {
    currentBlockIndex.value = index
    await fetchPreferences(currentId)
  } else {
    router.replace("/preferences")
  }
}

const fetchPreferences = async (blockId) => {
  // eventuell bereits bestehende Zuordnungen
  const assignmentsResponse = await $authFetch(`/assignments/${blockId}`)
  if (assignmentsResponse.assignment) {
    console.log('already assigned: ' + assignmentsResponse.assignment.course)
    alreadyAssignedCourse.value = assignmentsResponse.assignment.course
  } else { // Präferenzen laden
    const preferencesResponse = await $authFetch(`/preferences/${blockId}`)

    pauseSelected.value = preferencesResponse.pauseSelected || preferencesResponse.courses?.length === 0

    const courseMap = new Map(preferencesResponse.courses.map(c => [c.id, c]))
    // Kurse separat merken (z. B. für spätere Verwendung)
    allCourses.value = preferencesResponse.courses

    // Wenn keine gespeicherten Präferenzen: komplette Kursliste verwenden
    preferences.value = (preferencesResponse.preferences?.preferences.length > 0)
        ? preferencesResponse.preferences.preferences.map(id => courseMap.get(id)).filter(Boolean)
        : [...preferencesResponse.courses]
  }
  await fetchPreferencesStatus()
}

const savePreferences = async () => {
  if (!currentBlock.value) return
  const payload = {
    pauseSelected: pauseSelected.value,
    preferences: preferences.value.map(c => c.id),
  }
  await $authFetch(`/preferences/${currentBlock.value.id}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  })
  await fetchPreferences(currentBlock.value.id)
}

const goToPreviousBlock = async () => {
  if (currentBlockIndex.value > 0) {
    try {
      await savePreferences()
      const prevBlock = blocks.value[currentBlockIndex.value - 1]
      router.push(`/preferences/${prevBlock.id}`)
    } catch (err) {
      console.error("Fehler beim Speichern vor Navigation:", err)
    }
  }
}

const goToNextBlock = async () => {
  if (currentBlockIndex.value < blocks.value.length - 1) {
    try {
      await savePreferences()
      const nextBlock = blocks.value[currentBlockIndex.value + 1]
      router.push(`/preferences/${nextBlock.id}`)
    } catch (err) {
      errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
      console.error("Fehler beim Speichern vor Navigation:", err)
    }
  }
}

const hasPreviousBlock = computed(() => currentBlockIndex.value > 0)
const hasNextBlock = computed(() => currentBlockIndex.value < blocks.value.length - 1)

const moveUp = async (index) => {
  if (index > 0) {
    const temp = preferences.value[index - 1]
    preferences.value[index - 1] = preferences.value[index]
    preferences.value[index] = temp
    lastMovedId.value = preferences.value[index - 1].id
    await savePreferences()
  }
}

const moveDown = async (index) => {
  if (index < preferences.value.length - 1) {
    const temp = preferences.value[index + 1]
    preferences.value[index + 1] = preferences.value[index]
    preferences.value[index] = temp
    lastMovedId.value = preferences.value[index + 1].id
    await savePreferences()
  }
}

const moveToTop = async (index) => {
  const item = preferences.value.splice(index, 1)[0]
  preferences.value.unshift(item)
  lastMovedId.value = item.id
  await savePreferences()
}

const moveToBottom = async (index) => {
  const item = preferences.value.splice(index, 1)[0]
  preferences.value.push(item)
  lastMovedId.value = item.id
  await savePreferences()
}

const onDragEnd = async () => {
  console.log('drag end')
  await savePreferences()
  await fetchPreferences(currentBlock.value.id)
}

const lastMovedId = ref(null)
watch(lastMovedId, () => {
  if (lastMovedId.value) {
    setTimeout(() => {
      lastMovedId.value = null
    }, 1000)
  }
})

const showInfo = (course) => {
  selectedCourse.value = course
  modalInstance?.show()
}

const closeModal = () => modalInstance?.hide()

onMounted(async () => {
  await fetchBlocks()
  await nextTick()
  if (window.bootstrap && infoModalRef.value) {
    modalInstance = new window.bootstrap.Modal(infoModalRef.value)
  }
  await fetchPreferencesStatus()
})

watch(pauseSelected, async (newVal) => {
  console.log('pause selected: ' + newVal)
  await savePreferences()
  await fetchPreferences(currentBlock.value.id)
})

watch(() => route.params.blockId, async (newVal) => {
  const newIndex = blocks.value.findIndex(b => b.id === Number(newVal))
  if (newIndex !== -1) {
    currentBlockIndex.value = newIndex
    await fetchPreferences(Number(newVal))
  }
})
</script>

<style>
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
