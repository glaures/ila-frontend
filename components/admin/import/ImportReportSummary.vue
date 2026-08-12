<script lang="ts" setup>
import type {CourseImportReport} from '@/types/courseImport'
import {issueFieldLabel} from '@/types/courseImport'

defineProps<{ report: CourseImportReport }>()
</script>

<template>
  <div>
    <!-- Dateiweite Meldungen zuerst -->
    <div
        v-for="(issue, idx) in report.globalIssues"
        :key="'global-' + idx"
        :class="issue.severity === 'ERROR' ? 'alert-danger' : 'alert-warning'"
        class="alert d-flex align-items-start gap-2"
    >
      <i
          :class="issue.severity === 'ERROR' ? 'bi-x-octagon-fill' : 'bi-exclamation-triangle-fill'"
          class="bi mt-1"
          aria-hidden="true"
      ></i>
      <div>
        <strong>{{ issueFieldLabel(issue.field) }}:</strong>
        {{ issue.message }}
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex flex-wrap align-items-baseline gap-3 mb-3">
          <h5 class="card-title mb-0">Prüfergebnis</h5>
          <span v-if="report.fileName" class="text-muted small">
            <i class="bi bi-file-earmark-excel me-1" aria-hidden="true"></i>{{ report.fileName }}
          </span>
          <span v-if="report.sheetName" class="text-muted small">
            <i class="bi bi-table me-1" aria-hidden="true"></i>Datenblatt: {{ report.sheetName }}
          </span>
          <span class="text-muted small">
            <i class="bi bi-calendar3 me-1" aria-hidden="true"></i>{{ report.periodName }}
          </span>
        </div>

        <div class="row g-2 row-cols-2 row-cols-md-3 row-cols-xl-5">
          <div class="col">
            <div class="stat border rounded p-2 h-100">
              <div class="stat-value">{{ report.totalRows }}</div>
              <div class="stat-label">Kurszeilen</div>
            </div>
          </div>
          <div class="col">
            <div class="stat border rounded p-2 h-100">
              <div class="stat-value text-success">{{ report.importableRows }}</div>
              <div class="stat-label">importierbar</div>
            </div>
          </div>
          <div class="col">
            <div class="stat border rounded p-2 h-100">
              <div :class="report.errorCount > 0 ? 'text-danger' : ''" class="stat-value">
                {{ report.errorCount }}
              </div>
              <div class="stat-label">Fehler</div>
            </div>
          </div>
          <div class="col">
            <div class="stat border rounded p-2 h-100">
              <div :class="report.warningCount > 0 ? 'text-warning' : ''" class="stat-value">
                {{ report.warningCount }}
              </div>
              <div class="stat-label">Warnungen</div>
            </div>
          </div>
          <div class="col">
            <div class="stat border rounded p-2 h-100">
              <div class="stat-value text-muted">{{ report.skippedRows }}</div>
              <div class="stat-label">übersprungen</div>
            </div>
          </div>
        </div>

        <div
            :class="report.importable ? 'alert-success' : 'alert-danger'"
            class="alert mt-3 mb-0 d-flex align-items-center gap-2"
        >
          <i
              :class="report.importable ? 'bi-check-circle-fill' : 'bi-x-circle-fill'"
              class="bi"
              aria-hidden="true"
          ></i>
          <span v-if="report.importable">
            Die Datei enthält keine blockierenden Fehler und kann importiert werden.
          </span>
          <span v-else>
            Es gibt blockierende Fehler – der Import ist noch nicht möglich.
            Bitte die unten aufgeführten Punkte beheben.
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.8rem;
  color: #6c757d;
}
</style>
