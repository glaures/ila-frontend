<script lang="ts" setup>
import {computed, ref} from 'vue'
import type {CourseImportRow} from '@/types/courseImport'
import {formatGrades, issueFieldLabel} from '@/types/courseImport'
import {getCategoryInfo} from '@/utils/categories'

const props = defineProps<{ rows: CourseImportRow[] }>()

type RowFilter = 'all' | 'errors' | 'warnings'

const filter = ref<RowFilter>('all')
const expanded = ref<Set<number>>(new Set())

const errorRowCount = computed(() =>
    props.rows.filter(r => r.issues.some(i => i.severity === 'ERROR')).length
)
const warningRowCount = computed(() =>
    props.rows.filter(r => r.issues.some(i => i.severity === 'WARNING')).length
)

const visibleRows = computed(() => {
  if (filter.value === 'errors') {
    return props.rows.filter(r => r.issues.some(i => i.severity === 'ERROR'))
  }
  if (filter.value === 'warnings') {
    return props.rows.filter(r => r.issues.some(i => i.severity === 'WARNING'))
  }
  return props.rows
})

function toggle(rowNumber: number) {
  const next = new Set(expanded.value)
  if (next.has(rowNumber)) {
    next.delete(rowNumber)
  } else {
    next.add(rowNumber)
  }
  expanded.value = next
}

function rowSeverity(row: CourseImportRow): 'ERROR' | 'WARNING' | null {
  if (row.issues.some(i => i.severity === 'ERROR')) return 'ERROR'
  if (row.issues.some(i => i.severity === 'WARNING')) return 'WARNING'
  return null
}

const actionMeta: Record<string, { label: string; cls: string }> = {
  CREATE: {label: 'Neu', cls: 'bg-success'},
  UPDATE: {label: 'Update', cls: 'bg-primary'},
  SKIP: {label: 'Übersprungen', cls: 'bg-secondary'}
}

function instructorLabel(row: CourseImportRow): string {
  const name = `${row.instructorFirstName ?? ''} ${row.instructorLastName ?? ''}`.trim()
  return name || '–'
}
</script>

<template>
  <div class="card">
    <div class="card-body">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h5 class="card-title mb-0">Kurszeilen</h5>

        <div aria-label="Zeilen filtern" class="btn-group btn-group-sm" role="group">
          <button
              :class="filter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
              class="btn"
              type="button"
              @click="filter = 'all'"
          >
            Alle ({{ rows.length }})
          </button>
          <button
              :class="filter === 'errors' ? 'btn-danger' : 'btn-outline-danger'"
              :disabled="errorRowCount === 0"
              class="btn"
              type="button"
              @click="filter = 'errors'"
          >
            Fehler ({{ errorRowCount }})
          </button>
          <button
              :class="filter === 'warnings' ? 'btn-warning' : 'btn-outline-warning'"
              :disabled="warningRowCount === 0"
              class="btn"
              type="button"
              @click="filter = 'warnings'"
          >
            Warnungen ({{ warningRowCount }})
          </button>
        </div>
      </div>

      <p v-if="visibleRows.length === 0" class="text-muted mb-0">
        Keine Zeilen für diesen Filter.
      </p>

      <div v-else class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
          <tr>
            <th style="width: 2.5rem"></th>
            <th style="width: 4rem">Zeile</th>
            <th>Kurs-ID</th>
            <th>Name</th>
            <th>Block</th>
            <th>Raum</th>
            <th>Kursleiter</th>
            <th>Aktion</th>
          </tr>
          </thead>
          <tbody>
          <template v-for="row in visibleRows" :key="row.rowNumber">
            <tr :class="{
                  'table-danger': rowSeverity(row) === 'ERROR',
                  'table-warning': rowSeverity(row) === 'WARNING'
                }">
              <td>
                <button
                    :aria-expanded="expanded.has(row.rowNumber)"
                    :aria-label="`Details zu Zeile ${row.rowNumber}`"
                    class="btn btn-link btn-sm p-0"
                    type="button"
                    @click="toggle(row.rowNumber)"
                >
                  <i
                      :class="expanded.has(row.rowNumber) ? 'bi-chevron-down' : 'bi-chevron-right'"
                      class="bi"
                      aria-hidden="true"
                  ></i>
                </button>
              </td>
              <td class="text-muted">{{ row.rowNumber }}</td>
              <td><code>{{ row.courseId || '–' }}</code></td>
              <td>{{ row.name || '–' }}</td>
              <td class="text-nowrap">{{ row.weekday }} {{ row.timeSlot }}</td>
              <td>{{ row.room || '–' }}</td>
              <td>
                {{ instructorLabel(row) }}
                <i
                    v-if="row.instructorUserName"
                    :title="row.instructorUserName"
                    class="bi bi-check-circle-fill text-success ms-1 small"
                    aria-hidden="true"
                ></i>
              </td>
              <td>
                <span :class="actionMeta[row.action]?.cls ?? 'bg-secondary'" class="badge">
                  {{ actionMeta[row.action]?.label ?? row.action }}
                </span>
              </td>
            </tr>

            <!-- Meldungen der Zeile: immer sichtbar, wenn vorhanden -->
            <tr v-if="row.issues.length > 0" class="issue-row">
              <td></td>
              <td colspan="7">
                <ul class="list-unstyled mb-0 small">
                  <li
                      v-for="(issue, i) in row.issues"
                      :key="i"
                      :class="issue.severity === 'ERROR' ? 'text-danger' : 'text-warning-emphasis'"
                  >
                    <i
                        :class="issue.severity === 'ERROR' ? 'bi-x-octagon-fill' : 'bi-exclamation-triangle-fill'"
                        class="bi me-1"
                        aria-hidden="true"
                    ></i>
                    <strong>{{ issueFieldLabel(issue.field) }}:</strong>
                    {{ issue.message }}
                  </li>
                </ul>
              </td>
            </tr>

            <!-- Aufgeklappte Detailansicht -->
            <tr v-if="expanded.has(row.rowNumber)" class="detail-row">
              <td></td>
              <td colspan="7">
                <dl class="row mb-0 small">
                  <dt class="col-sm-3">Kategorien</dt>
                  <dd class="col-sm-9">
                    <template v-if="row.categories?.length">
                      <span
                          v-for="code in row.categories"
                          :key="code"
                          :style="{
                            backgroundColor: getCategoryInfo(code).color,
                            color: getCategoryInfo(code).textColor
                          }"
                          class="badge me-1"
                      >
                        {{ getCategoryInfo(code).label }}
                      </span>
                    </template>
                    <span v-else>–</span>
                  </dd>

                  <dt class="col-sm-3">Jahrgänge</dt>
                  <dd class="col-sm-9">{{ formatGrades(row.grades) }}</dd>

                  <dt class="col-sm-3">Max. Teilnehmer</dt>
                  <dd class="col-sm-9">{{ row.maxAttendees ?? '–' }}</dd>

                  <dt class="col-sm-3">Beschreibung</dt>
                  <dd class="col-sm-9 mb-0">{{ row.description || '–' }}</dd>
                </dl>
              </td>
            </tr>
          </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.issue-row td,
.detail-row td {
  border-top: 0;
  padding-top: 0;
}

code {
  color: inherit;
}
</style>
