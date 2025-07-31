
<template>
  <div class="container-fluid py-4">
    <h2>{{ currentBlockLabel }}</h2>

    <!-- Navigation -->
    <div class="d-flex justify-content-between mb-3">
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

    <!-- Pause -->
    <div class="form-check form-switch mb-3">
      <input
          class="form-check-input"
          type="checkbox"
          id="pauseToggle"
          v-model="pauseSelected"
      />
      <label class="form-check-label" for="pauseToggle">
        Ich möchte in diesem Block keinen Kurs belegen (selbstorganisiertes Lernen)
      </label>
    </div>

    <div
        class="alert alert-info"
        v-if="pauseSelected"
    >
      Du hast für diesen Block festgelegt, dass du keinen Kurs belegen möchtest.
    </div>

    <!-- Kursliste -->
    <draggable
        v-model="preferences"
        item-key="id"
        class="list-group"
        :disabled="pauseSelected"
    >
      <template #item="{ element, index }">
        <div
            class="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-start"
            :class="{ 'bg-warning-subtle': element.id === lastMovedId }"
        >
          <div class="me-md-3 flex-grow-1">
            <strong>{{ index + 1 }}. {{ element.name }}</strong>
            <div class="mt-1 d-flex flex-wrap">
              <span
                  v-for="cat in element.courseCategories"
                  :key="cat"
                  class="badge me-1 mb-1"
                  :style="{ backgroundColor: categoryColor(cat) }"
              >
                {{ categoryLabelMap[cat] || cat }}
              </span>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-1 mt-2 mt-md-0">
            <button class="btn btn-sm btn-outline-secondary" :disabled="index === 0 || pauseSelected" @click="moveUp(index)" title="Einen nach oben">
              <i class="bi bi-chevron-up"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" :disabled="index === preferences.length - 1 || pauseSelected" @click="moveDown(index)" title="Einen nach unten">
              <i class="bi bi-chevron-down"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" :disabled="index === 0 || pauseSelected" @click="moveToTop(index)" title="Ganz nach oben">
              <i class="bi bi-arrow-up"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" :disabled="index === preferences.length - 1 || pauseSelected" @click="moveToBottom(index)" title="Ganz nach unten">
              <i class="bi bi-arrow-down"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" @click="showInfo(element)" :disabled="pauseSelected" title="Kursinfo anzeigen">
              <i class="bi bi-info-circle"></i>
            </button>
          </div>
        </div>
      </template>
    </draggable>

    <!-- Speichern -->
    <button class="btn btn-primary mt-4" @click="savePreferences" :disabled="!currentBlock">
      Speichern & Weiter
    </button>

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
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'

const route = useRoute()
const router = useRouter()

const blocks = ref([])
const currentBlockIndex = ref(-1)
const currentBlock = computed(() => blocks.value[currentBlockIndex.value] || null)
const allCourses = ref([])

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
const preferences = ref([])
const selectedCourse = ref(null)
const infoModalRef = ref()
let modalInstance = null

const categoryLabelMap = {
  iLa: "iLa",
  KuP: "Kreativität und Praxis",
  BuE: "Bewegung und Entspannung",
  FuF: "Fordern und Fördern",
}

const categoryColor = (code) => {
  const colorMap = {
    iLa: "#0d6efd",
    KuP: "#d63384",
    BuE: "#198754",
    FuF: "#fd7e14",
  }
  return colorMap[code] || "#6c757d"
}

const fetchBlocks = async () => {
  const res = await fetch("http://localhost:8080/blocks")
  const allBlocks = await res.json()
  blocks.value = allBlocks

  const currentId = Number(route.params.blockId)
  const index = allBlocks.findIndex(b => b.id === currentId)
  if (index !== -1) {
    currentBlockIndex.value = index
    await fetchPreferences(currentId)
  } else {
    router.replace("/preferences")
  }
}

const fetchPreferences = async (blockId) => {
  const res = await fetch(`http://localhost:8080/preferences/${blockId}`)
  const json = await res.json()
  pauseSelected.value = json.pauseSelected || false

  const courseMap = new Map(json.courses.map(c => [c.id, c]))
  // Kurse separat merken (z. B. für spätere Verwendung)
  allCourses.value = json.courses

  // Wenn keine gespeicherten Präferenzen: komplette Kursliste verwenden
  preferences.value = (json.preferences?.length > 0)
      ? json.preferences.map(id => courseMap.get(id)).filter(Boolean)
      : [...json.courses]
}

const savePreferences = async () => {
  if (!currentBlock.value) return
  const payload = {
    pauseSelected: pauseSelected.value,
    preferences: preferences.value.map(c => c.id),
  }
  await fetch(`http://localhost:8080/preferences/${currentBlock.value.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  goToNextBlock()
}

const goToPreviousBlock = () => {
  if (currentBlockIndex.value > 0) {
    const prevBlock = blocks.value[currentBlockIndex.value - 1]
    router.push(`/preferences/${prevBlock.id}`)
  }
}

const goToNextBlock = () => {
  if (currentBlockIndex.value < blocks.value.length - 1) {
    const nextBlock = blocks.value[currentBlockIndex.value + 1]
    router.push(`/preferences/${nextBlock.id}`)
  }
}

const hasPreviousBlock = computed(() => currentBlockIndex.value > 0)
const hasNextBlock = computed(() => currentBlockIndex.value < blocks.value.length - 1)

const moveUp = (index) => {
  if (index > 0) {
    const temp = preferences.value[index - 1]
    preferences.value[index - 1] = preferences.value[index]
    preferences.value[index] = temp
    lastMovedId.value = preferences.value[index - 1].id
  }
}

const moveDown = (index) => {
  if (index < preferences.value.length - 1) {
    const temp = preferences.value[index + 1]
    preferences.value[index + 1] = preferences.value[index]
    preferences.value[index] = temp
    lastMovedId.value = preferences.value[index + 1].id
  }
}

const moveToTop = (index) => {
  const item = preferences.value.splice(index, 1)[0]
  preferences.value.unshift(item)
  lastMovedId.value = item.id
}

const moveToBottom = (index) => {
  const item = preferences.value.splice(index, 1)[0]
  preferences.value.push(item)
  lastMovedId.value = item.id
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
  if (window.bootstrap) {
    modalInstance = new window.bootstrap.Modal(infoModalRef.value)
  }
})

watch(() => route.params.blockId, async (newVal) => {
  const newIndex = blocks.value.findIndex(b => b.id === Number(newVal))
  if (newIndex !== -1) {
    currentBlockIndex.value = newIndex
    await fetchPreferences(Number(newVal))
  }
})
</script>
