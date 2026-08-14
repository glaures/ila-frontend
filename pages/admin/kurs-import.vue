<script lang="ts" setup>
definePageMeta({layout: 'admin'})

import {computed, ref, watch} from 'vue'
import {storeToRefs} from 'pinia'
import {usePeriodContextStore} from '@/stores/periodContext'
import {useToastStore} from '@/stores/toast'
import {useCourseImport} from '@/composables/useCourseImport'
import ImportReportSummary from '@/components/admin/import/ImportReportSummary.vue'
import ImportRowTable from '@/components/admin/import/ImportRowTable.vue'
import MissingInstructorsPanel from '@/components/admin/import/MissingInstructorsPanel.vue'

const periodContext = usePeriodContextStore()
const {selectedId, selectedPeriod} = storeToRefs(periodContext)
const toastStore = useToastStore()

const {
  selectedFile,
  report,
  busy,
  busyMode,
  localError,
  isStale,
  canCommit,
  reportPeriodId,
  setFile,
  reset,
  clearReport,
  validate,
  commit
} = useCourseImport()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const fileError = ref<string | null>(null)

// Phasenwechsel invalidiert den Report – er gehört immer zu genau einer Phase.
watch(selectedId, (newId) => {
  if (report.value && reportPeriodId.value !== newId) {
    clearReport()
  }
})

const hasPeriod = computed(() => selectedId.value != null)

const canValidate = computed(() =>
    !!selectedFile.value && hasPeriod.value && !busy.value
)

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    acceptFile(target.files[0])
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    acceptFile(event.dataTransfer.files[0])
  }
}

function acceptFile(file: File) {
  fileError.value = setFile(file)
}

function removeFile() {
  reset()
  fileError.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

async function onValidate() {
  if (selectedId.value == null) return
  const result = await validate(selectedId.value)
  if (result) {
    if (result.importable) {
      toastStore.success('Die Datei ist fehlerfrei und kann importiert werden.')
    } else {
      toastStore.warning(`Prüfung abgeschlossen: ${result.errorCount} Fehler gefunden.`)
    }
  }
}

async function onCommit() {
  if (selectedId.value == null) return
  const result = await commit(selectedId.value)
  if (result?.committed) {
    toastStore.success(
        `Import abgeschlossen: ${result.createdCount} neu, ${result.updatedCount} aktualisiert.`
    )
  } else if (result) {
    toastStore.error('Der Import wurde nicht durchgeführt – es gibt noch Fehler.')
  }
}
</script>

<template>
  <div>
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h4 mb-0">Kurse importieren</h1>
    </div>

    <!-- Voraussetzungen -->
    <div class="alert alert-info d-flex align-items-start gap-2">
      <i class="bi bi-info-circle-fill mt-1" aria-hidden="true"></i>
      <div>
        Der Import ordnet jede Kurszeile über <strong>Wochentag + Zeitschiene</strong> einem
        bestehenden Block zu. Die Zielphase muss ihre Blöcke also bereits besitzen –
        andernfalls schlagen die betroffenen Zeilen fehl.
        <NuxtLink to="/admin/bloecke">Blöcke verwalten</NuxtLink>
        <div class="mt-1">
          Als Startdatei lässt sich in der
          <NuxtLink to="/admin/kurs-liste">Kursübersicht</NuxtLink>
          eine Import-Vorlage aus den Kursen einer bestehenden Phase herunterladen.
        </div>
      </div>
    </div>

    <div v-if="!hasPeriod" class="alert alert-warning">
      <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
      Bitte links zuerst eine Phase auswählen.
    </div>

    <!-- Schritt 1: Datei -->
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-title">
          1. Excel-Datei auswählen
          <small v-if="selectedPeriod" class="text-muted fw-normal">
            – Zielphase: {{ selectedPeriod.name }}
          </small>
        </h5>

        <div
            :class="{ 'drag-over': isDragging }"
            class="upload-area"
            @click="triggerFileInput"
            @dragleave.prevent="isDragging = false"
            @dragover.prevent="isDragging = true"
            @drop.prevent="handleDrop"
        >
          <div v-if="!selectedFile" class="upload-content">
            <i class="bi bi-file-earmark-excel fs-1 text-primary mb-3" aria-hidden="true"></i>
            <h5>Excel-Datei (.xlsx) hier ablegen</h5>
            <p class="text-muted">oder klicken zum Auswählen – max. 10 MB</p>
            <button class="btn btn-primary mt-2" type="button">Datei auswählen</button>
          </div>

          <div v-else class="selected-file">
            <i class="bi bi-file-earmark-excel fs-1 text-success mb-3" aria-hidden="true"></i>
            <h5>{{ selectedFile.name }}</h5>
            <p class="text-muted">{{ formatFileSize(selectedFile.size) }}</p>
            <button class="btn btn-outline-danger btn-sm" type="button" @click.stop="removeFile">
              <i class="bi bi-trash" aria-hidden="true"></i> Entfernen
            </button>
          </div>
        </div>

        <input
            ref="fileInput"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="d-none"
            type="file"
            @change="handleFileSelect"
        />

        <div v-if="fileError" class="alert alert-danger mt-3 mb-0">{{ fileError }}</div>

        <div class="mt-3 d-flex flex-wrap gap-2">
          <button
              :disabled="!canValidate"
              class="btn btn-primary"
              type="button"
              @click="onValidate"
          >
            <span v-if="busyMode === 'validate'">
              <span class="spinner-border spinner-border-sm me-2"></span>
              Wird geprüft…
            </span>
            <span v-else>
              <i class="bi bi-search me-2" aria-hidden="true"></i>
              {{ report ? 'Erneut prüfen' : 'Datei prüfen' }}
            </span>
          </button>

          <button
              v-if="selectedFile"
              :disabled="busy"
              class="btn btn-outline-secondary"
              type="button"
              @click="removeFile"
          >
            Zurücksetzen
          </button>
        </div>

        <p class="text-muted small mt-2 mb-0">
          Beim Prüfen wird nichts gespeichert. Korrigierte Dateien einfach erneut hochladen.
        </p>
      </div>
    </div>

    <div v-if="localError" class="alert alert-danger">
      <i class="bi bi-x-octagon me-2" aria-hidden="true"></i>{{ localError }}
    </div>

    <!-- Schritt 2: Report -->
    <template v-if="report">
      <div v-if="isStale" class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
        Die ausgewählte Datei hat sich seit der letzten Prüfung geändert.
        Bitte erneut prüfen, bevor importiert wird.
      </div>

      <ImportReportSummary :report="report"/>

      <MissingInstructorsPanel
          v-if="report.missingInstructors.length > 0"
          :instructors="report.missingInstructors"
      />

      <ImportRowTable v-if="report.rows.length > 0" :rows="report.rows"/>

      <!-- Schritt 3: Commit -->
      <div class="card mt-3">
        <div class="card-body">
          <h5 class="card-title">2. Importieren</h5>

          <div v-if="report.committed" class="alert alert-success mb-0">
            <h6 class="alert-heading">
              <i class="bi bi-check-circle me-2" aria-hidden="true"></i>Import abgeschlossen
            </h6>
            <p class="mb-0">
              {{ report.createdCount }} Kurse neu angelegt,
              {{ report.updatedCount }} Kurse aktualisiert.
            </p>
          </div>

          <template v-else>
            <p class="text-muted">
              Der Import schreibt die Kurse in die Phase
              <strong>{{ report.periodName }}</strong>. Er ist erst möglich, wenn keine
              blockierenden Fehler mehr vorliegen.
            </p>
            <button
                :disabled="!canCommit"
                class="btn btn-success"
                type="button"
                @click="onCommit"
            >
              <span v-if="busyMode === 'commit'">
                <span class="spinner-border spinner-border-sm me-2"></span>
                Wird importiert…
              </span>
              <span v-else>
                <i class="bi bi-database-add me-2" aria-hidden="true"></i>
                {{ report.importableRows }} Kurse importieren
              </span>
            </button>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.upload-area {
  border: 3px dashed #dee2e6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f8f9fa;
}

.upload-area:hover {
  border-color: #0d6efd;
  background-color: #e7f1ff;
}

.upload-area.drag-over {
  border-color: #0d6efd;
  background-color: #cfe2ff;
}

.upload-content i,
.selected-file i {
  display: block;
}

.selected-file {
  padding: 10px;
}
</style>
