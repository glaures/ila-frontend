<script setup lang="ts">
definePageMeta({layout: 'admin'})

import { ref, computed, onMounted, watch } from 'vue'
import { usePeriodContextStore } from '@/stores/periodContext'
import { useToastStore } from '@/stores/toast'
import { useErrorStore } from '@/stores/error'

const { $authFetch } = useNuxtApp()
const periodContext = usePeriodContextStore()
const toastStore = useToastStore()
const errorStore = useErrorStore()

interface DesiredCourseOption {
  id: number
  courseId: string
  name: string
  blockName: string
  priority: number
}

interface ExchangeRequest {
  id: number
  studentName: string
  currentCourseName: string
  currentBlockName: string
  desiredCourses: DesiredCourseOption[]
  status: string
  fulfilledWithCourseName: string | null
  rejectionReason: string | null
  createdAt: string
  resolvedAt: string | null
}

interface ResolutionResult {
  totalRequests: number
  fulfilled: number
  unfulfillable: number
  rounds: number
  fulfillmentRate: number
}

// State
const period = computed(() => periodContext.selectedPeriod)
const allRequests = ref<ExchangeRequest[]>([])
const activeTab = ref<'pending' | 'all'>('pending')
const resolving = ref(false)
const loading = ref(false)
const lastResolution = ref<ResolutionResult | null>(null)

// Wechselphase-Status aus Period-Feldern
const exchangePhaseActive = computed(() => {
  const p = period.value as any
  if (!p?.exchangePhaseStart || !p?.exchangePhaseEnd) return false
  return p.exchangePhaseActive === true
})

const exchangePhaseInfo = computed(() => {
  const p = period.value as any
  if (!p?.exchangePhaseStart || !p?.exchangePhaseEnd) {
    return null
  }
  return {
    start: p.exchangePhaseStart,
    end: p.exchangePhaseEnd,
    active: p.exchangePhaseActive === true
  }
})

// Computed
const stats = computed(() => {
  const pending = allRequests.value.filter(r => r.status === 'PENDING').length
  const fulfilled = allRequests.value.filter(r => r.status === 'FULFILLED').length
  const unfulfillable = allRequests.value.filter(r => r.status === 'UNFULFILLABLE').length
  return { pending, fulfilled, unfulfillable }
})

const filteredRequests = computed(() => {
  if (activeTab.value === 'pending') {
    return allRequests.value.filter(r => r.status === 'PENDING')
  }
  return allRequests.value
})

const canResolve = computed(() => {
  return stats.value.pending > 0
})

// Methods
const loadData = async () => {
  if (!period.value) return

  loading.value = true
  try {
    const requestsResponse = await $authFetch(`/exchange/admin/all?periodId=${period.value.id}`)
    allRequests.value = requestsResponse
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Daten')
  } finally {
    loading.value = false
  }
}

const resolveExchanges = async () => {
  if (!period.value) return

  if (!confirm('Möchtest du die Wechselrunde jetzt auflösen? Dieser Vorgang kann nicht rückgängig gemacht werden.')) {
    return
  }

  resolving.value = true

  try {
    const result = await $authFetch(`/exchange/admin/resolve?periodId=${period.value.id}`, {
      method: 'POST'
    })
    lastResolution.value = result
    toastStore.success(`${result.fulfilled} von ${result.totalRequests} Wünschen erfüllt`)
    await loadData()
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler bei der Auflösung')
  } finally {
    resolving.value = false
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    PENDING: 'bg-warning text-dark',
    FULFILLED: 'bg-success',
    UNFULFILLABLE: 'bg-danger',
    EXPIRED: 'bg-secondary',
    WITHDRAWN: 'bg-light text-dark border'
  }
  return classes[status] || 'bg-secondary'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Offen',
    FULFILLED: 'Erfüllt',
    UNFULFILLABLE: 'Nicht möglich',
    EXPIRED: 'Abgelaufen',
    WITHDRAWN: 'Zurückgezogen'
  }
  return labels[status] || status
}

// Lifecycle
onMounted(() => {
  loadData()
})

// Watch for period changes
watch(() => periodContext.selectedPeriod?.id, () => {
  loadData()
})
</script>

<template>
  <div class="container-fluid py-4">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1">Wechselrunde verwalten</h1>
        <p class="text-muted mb-0">{{ period?.name }}</p>
      </div>
      <div>
        <button
            class="btn btn-success"
            :disabled="!canResolve || resolving"
            @click="resolveExchanges">
          <span v-if="resolving" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-play-fill me-1"></i>
          Auflösung starten
        </button>
      </div>
    </div>

    <!-- Hinweis wenn keine Phase gewählt -->
    <div v-if="!period" class="alert alert-warning">
      Bitte wähle zuerst eine Phase, um die Wechselrunde zu verwalten.
    </div>

    <template v-else>
      <!-- Status Cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <div class="bg-primary bg-opacity-10 rounded-circle p-3">
                    <i class="bi bi-hourglass-split text-primary fs-4"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <h6 class="text-muted mb-1">Offene Wünsche</h6>
                  <h3 class="mb-0">{{ stats.pending }}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <div class="bg-success bg-opacity-10 rounded-circle p-3">
                    <i class="bi bi-check-circle text-success fs-4"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <h6 class="text-muted mb-1">Erfüllt</h6>
                  <h3 class="mb-0">{{ stats.fulfilled }}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <div class="bg-danger bg-opacity-10 rounded-circle p-3">
                    <i class="bi bi-x-circle text-danger fs-4"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <h6 class="text-muted mb-1">Nicht erfüllbar</h6>
                  <h3 class="mb-0">{{ stats.unfulfillable }}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0">
                  <div
                      class="rounded-circle p-3"
                      :class="exchangePhaseActive ? 'bg-success bg-opacity-10' : 'bg-secondary bg-opacity-10'">
                    <i
                        class="fs-4"
                        :class="exchangePhaseActive ? 'bi bi-broadcast text-success' : 'bi bi-broadcast text-secondary'"></i>
                  </div>
                </div>
                <div class="flex-grow-1 ms-3">
                  <h6 class="text-muted mb-1">Phase</h6>
                  <h5 class="mb-0" :class="exchangePhaseActive ? 'text-success' : 'text-secondary'">
                    {{ exchangePhaseActive ? 'Aktiv' : 'Inaktiv' }}
                  </h5>
                  <small v-if="exchangePhaseInfo" class="text-muted">
                    {{ exchangePhaseInfo.start }} – {{ exchangePhaseInfo.end }}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Letzte Auflösung -->
      <div v-if="lastResolution" class="alert alert-info d-flex align-items-center mb-4">
        <i class="bi bi-info-circle me-2"></i>
        <div>
          <strong>Letzte Auflösung:</strong>
          {{ lastResolution.fulfilled }} von {{ lastResolution.totalRequests }} Wünschen erfüllt
          ({{ lastResolution.fulfillmentRate.toFixed(1) }}%) in {{ lastResolution.rounds }} Runden
        </div>
      </div>

      <!-- Tabs -->
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <button
              class="nav-link"
              :class="{ active: activeTab === 'pending' }"
              @click="activeTab = 'pending'">
            Offene Wünsche
            <span class="badge bg-warning text-dark ms-1">{{ stats.pending }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button
              class="nav-link"
              :class="{ active: activeTab === 'all' }"
              @click="activeTab = 'all'">
            Alle Wünsche
          </button>
        </li>
      </ul>

      <!-- Requests Table -->
      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div v-if="loading" class="text-muted p-4">Lade Wechselwünsche…</div>
          <div v-else class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
              <tr>
                <th>Schüler</th>
                <th>Gibt ab</th>
                <th>Wunschliste</th>
                <th>Status</th>
                <th>Erstellt</th>
                <th>Ergebnis</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="request in filteredRequests" :key="request.id">
                <td class="fw-medium">{{ request.studentName }}</td>
                <td>
                  {{ request.currentCourseName }}
                  <span class="badge bg-light text-dark ms-1">{{ request.currentBlockName }}</span>
                </td>
                <td>
                  <div class="d-flex flex-wrap gap-1">
                      <span
                          v-for="(option, idx) in request.desiredCourses"
                          :key="option.id"
                          class="badge"
                          :class="idx === 0 ? 'bg-primary' : 'bg-secondary'">
                        {{ idx + 1 }}. {{ option.name }}
                      </span>
                  </div>
                </td>
                <td>
                    <span class="badge" :class="getStatusBadgeClass(request.status)">
                      {{ getStatusLabel(request.status) }}
                    </span>
                </td>
                <td class="small text-muted">
                  {{ formatDate(request.createdAt) }}
                </td>
                <td>
                    <span v-if="request.fulfilledWithCourseName" class="text-success small">
                      <i class="bi bi-check me-1"></i>
                      {{ request.fulfilledWithCourseName }}
                    </span>
                  <span v-else-if="request.rejectionReason" class="text-danger small">
                      {{ request.rejectionReason }}
                    </span>
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
              <tr v-if="filteredRequests.length === 0">
                <td colspan="6" class="text-center text-muted py-4">
                  Keine Wechselwünsche vorhanden
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
</style>