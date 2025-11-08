<template>
  <div class="container my-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="h4 m-0">Zuweisungs-Prozess</div>
    </div>
    <div class="row">
      <div class="col-12">
        <!-- Period Selection -->
        <div class="card mb-4">
          <div class="card-body">
            <h5 class="card-title">Zeitraum auswählen</h5>
            <div class="row align-items-center">
              <div class="col-md-6">
                <select
                    v-model="selectedPeriodId"
                    class="form-select"
                    :disabled="isAssigning"
                >
                  <option :value="null">Bitte wählen...</option>
                  <option
                      v-for="period in periods"
                      :key="period.id"
                      :value="period.id"
                  >
                    {{ period.name }}
                  </option>
                </select>
              </div>
              <div class="col-md-6 mt-3 mt-md-0">
                <button
                    class="btn btn-primary btn-lg w-100"
                    :disabled="!selectedPeriodId || isAssigning"
                    @click="startAssignment"
                >
                  <span v-if="isAssigning" class="spinner-border spinner-border-sm me-2"></span>
                  <span v-if="isAssigning">Zuweisen läuft...</span>
                  <span v-else>Kurse zuweisen</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Warning Box -->
        <div v-if="selectedPeriodId" class="alert alert-warning mb-4">
          <strong>Achtung:</strong> Die Kurszuweisung löscht alle bestehenden (nicht-manuellen) Zuweisungen
          für den gewählten Zeitraum und erstellt sie neu. Dieser Vorgang kann nicht rückgängig gemacht werden.
        </div>

        <!-- Loading State -->
        <div v-if="isAssigning" class="card mb-4">
          <div class="card-body text-center py-5">
            <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
            <h5>Kurse werden zugewiesen...</h5>
            <p class="text-muted">Dies kann einige Minuten dauern.</p>
          </div>
        </div>

        <!-- Results -->
        <AssignmentResults
            v-if="assignmentResult && !isAssigning"
            :result="assignmentResult"
            class="mb-4"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Period } from '~/types/period'

definePageMeta({
  layout: 'admin'
})

const { isAssigning, assignmentResult, assignCourses } = useAssignment()

// Load periods
const periods = ref<Period[]>([])
const selectedPeriodId = ref<number | null>(null)

const loadPeriods = async () => {
  try {
    const { $authFetch } = useNuxtApp() as any
    periods.value = await $authFetch('/periods')

    // Auto-select current period
    const currentPeriod = periods.value.find(p => p.current)
    if (currentPeriod) {
      selectedPeriodId.value = currentPeriod.id
    }
  } catch (err) {
    console.error('Fehler beim Laden der Zeiträume:', err)
  }
}

const startAssignment = async () => {
  if (!selectedPeriodId.value) return

  const confirmed = confirm(
      'Möchten Sie wirklich die Kurszuweisung für diesen Zeitraum durchführen? ' +
      'Alle bestehenden (nicht-manuellen) Zuweisungen werden gelöscht.'
  )

  if (!confirmed) return

  await assignCourses(selectedPeriodId.value)
}

onMounted(() => {
  loadPeriods()
})
</script>

<style scoped>
.spinner-border {
  vertical-align: middle;
}
</style>