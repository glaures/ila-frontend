<template>
  <div class="card">
    <div class="card-header bg-success text-white">
      <h5 class="mb-0">
        <i class="bi bi-check-circle me-2"></i>
        Zuweisung abgeschlossen
      </h5>
    </div>
    <div class="card-body">
      <!-- Summary Stats -->
      <div class="row mb-4">
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="stat-card bg-primary text-white p-3 rounded">
            <div class="stat-value">{{ result.assignedStudents }}</div>
            <div class="stat-label">Vollständig zugewiesen</div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="stat-card bg-warning text-white p-3 rounded">
            <div class="stat-value">{{ result.partiallyAssigned }}</div>
            <div class="stat-label">Teilweise zugewiesen</div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="stat-card bg-danger text-white p-3 rounded">
            <div class="stat-value">{{ result.unassigned }}</div>
            <div class="stat-label">Nicht zugewiesen</div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
          <div class="stat-card bg-info text-white p-3 rounded">
            <div class="stat-value">{{ result.assignmentRate.toFixed(1) }}%</div>
            <div class="stat-label">Zuweisungsrate</div>
          </div>
        </div>
      </div>

      <!-- Quality Metrics -->
      <div class="row mb-4">
        <div class="col-md-6 mb-3">
          <h6 class="text-muted mb-3">Qualitätsmetriken</h6>
          <div class="d-flex justify-content-between mb-2">
            <span>Durchschnittliche Priorität:</span>
            <strong>{{ result.averagePriority.toFixed(2) }}</strong>
          </div>
          <div class="d-flex justify-content-between mb-2">
            <span>Fairness-Score (Durchschnitt):</span>
            <strong>{{ result.averageFairnessScore.toFixed(2) }}</strong>
          </div>
          <div class="d-flex justify-content-between mb-2">
            <span>Fairness-Standardabweichung:</span>
            <strong>{{ result.fairnessStdDeviation.toFixed(2) }}</strong>
          </div>
        </div>

        <!-- Priority Distribution -->
        <div class="col-md-6 mb-3">
          <h6 class="text-muted mb-3">Prioritätsverteilung</h6>
          <div
              v-for="(count, priority) in sortedPriorityDistribution"
              :key="priority"
              class="mb-2"
          >
            <div class="d-flex justify-content-between mb-1">
              <span>Priorität {{ priority }}:</span>
              <strong>{{ count }} Zuweisungen</strong>
            </div>
            <div class="progress" style="height: 20px;">
              <div
                  class="progress-bar"
                  :class="getPriorityColor(Number(priority))"
                  role="progressbar"
                  :style="{ width: (count / totalAssignments * 100) + '%' }"
                  :aria-valuenow="count"
                  :aria-valuemin="0"
                  :aria-valuemax="totalAssignments"
              >
                {{ ((count / totalAssignments) * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Interpretation -->
      <div class="alert alert-info mb-0">
        <h6 class="alert-heading">
          <i class="bi bi-info-circle me-2"></i>
          Interpretation
        </h6>
        <ul class="mb-0">
          <li>
            <strong>Priorität 1</strong> bedeutet, dass der Schüler seinen Wunschkurs erhalten hat
          </li>
          <li>
            Ein niedriger <strong>Fairness-Score</strong> ist besser (niedrigere Durchschnittspriorität)
          </li>
          <li>
            Eine niedrige <strong>Standardabweichung</strong> bedeutet, dass die Zuweisungen fair verteilt sind
          </li>
          <li v-if="result.unassigned > 0" class="text-warning">
            <strong>Nicht zugewiesene Schüler</strong> sollten manuell nachbearbeitet werden
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssignmentResult } from '~/types/assignment'

const props = defineProps<{
  result: AssignmentResult
}>()

const sortedPriorityDistribution = computed(() => {
  const entries = Object.entries(props.result.priorityDistribution)
  entries.sort((a, b) => Number(a[0]) - Number(b[0]))
  return Object.fromEntries(entries)
})

const totalAssignments = computed(() => {
  return Object.values(props.result.priorityDistribution).reduce((sum, count) => sum + count, 0)
})

const getPriorityColor = (priority: number): string => {
  if (priority === 1) return 'bg-success'
  if (priority === 2) return 'bg-info'
  if (priority === 3) return 'bg-warning'
  return 'bg-danger'
}
</script>

<style scoped>
.stat-card {
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.progress {
  background-color: #e9ecef;
}
</style>