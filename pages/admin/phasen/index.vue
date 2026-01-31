<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="h4 m-0">Phasen</div>
    </div>
    <div class="row g-3">
      <!-- Linke Spalte: Suche / Liste / Neu -->
      <div class="col-12 col-xl-4">
        <div class="card">
          <div class="card-body">
            <label class="form-label">Suchen</label>
            <input
                v-model="searchQuery"
                type="text"
                class="form-control"
                placeholder="Name der Phase oder Datum (z. B. 12.09.2025)"
                @input="onSearchInput"
            />
            <div v-if="filteredSuggestions.length" class="list-group mt-2" style="max-height: 240px; overflow:auto;">
              <button
                  v-for="p in filteredSuggestions"
                  :key="p.id"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  :class="highlightClasses(p, selected?.id === p.id)"
                  @click="selectPeriod(p)"
              >
                <span>
                  <span class="me-2" v-if="p.current" aria-label="aktuell">⭐</span>
                  {{ p.name }}
                  <small class="text-muted d-block">
                    {{ p.startDate }} – {{ p.endDate }}
                  </small>
                </span>
                <span class="badge bg-light text-dark">#{{ p.id }}</span>
              </button>
            </div>

            <div class="d-grid gap-2 mt-3">
              <button class="btn btn-primary" @click="createNew">Neue Phase anlegen</button>
              <button class="btn btn-outline-secondary" @click="reload">Neu laden</button>
            </div>

            <hr class="my-4"/>

            <h6 class="text-muted mb-2">Alle Phasen</h6>
            <ul class="list-group small">
              <li
                  v-for="p in periods"
                  :key="p.id"
                  class="list-group-item d-flex justify-content-between align-items-center"
                  :class="highlightClasses(p, selected?.id === p.id)"
                  role="button"
                  @click="selectPeriod(p)"
              >
                <span>
                  <span class="me-2" v-if="p.current" aria-label="aktuell">⭐</span>
                  {{ p.name }}
                </span>
                <span class="ms-2">
                  <span v-if="p.visible" class="badge bg-success me-1">sichtbar</span>
                  <span v-if="p.current" class="badge bg-info me-1">aktuell</span>
                  <span v-if="p.exchangePhaseActive" class="badge bg-warning text-dark me-1">Wechselphase</span>
                  <span v-if="p.isClosed" class="badge bg-secondary">geschlossen</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Rechte Spalte: Formular -->
      <div class="col-12 col-xl-8" v-if="form">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="card-title mb-0">
                {{ isNew ? 'Neue Phase' : ('Phase bearbeiten: ' + (form.name || '')) }}
              </h5>
              <small v-if="!isNew" class="text-muted">ID: {{ form.id }}</small>
            </div>

            <div class="alert alert-info py-2" v-if="!isNew && form.current">
              Diese Phase ist aktuell.
            </div>

            <!-- Warnung bei geschlossener Phase -->
            <div class="alert alert-warning py-2" v-if="!isNew && form.isClosed">
              Diese Phase ist <strong>geschlossen</strong>. Wenn du sie zur <em>aktuellen</em> Phase machst,
              steht sie Nutzern ggf. nicht für neue Kurswahlen zur Verfügung. Bitte prüfe das sorgfältig.
            </div>

            <!-- ========== Grunddaten ========== -->
            <fieldset class="mb-4">
              <legend class="h6 text-muted border-bottom pb-2 mb-3">Grunddaten</legend>
              <div class="row g-3">
                <div class="col-md-8">
                  <label class="form-label">Name</label>
                  <input v-model.trim="form.name" type="text" class="form-control" placeholder="z. B. Schuljahr 2025/26 – Halbjahr 1" />
                </div>

                <div class="col-md-4 d-flex align-items-end">
                  <div class="form-check mt-4">
                    <input class="form-check-input" type="checkbox" id="visible" v-model="form.visible">
                    <label class="form-check-label" for="visible">sichtbar</label>
                  </div>
                </div>

                <div class="col-12 d-flex flex-wrap gap-3 align-items-center">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="current" v-model="form.current">
                    <label class="form-check-label" for="current">aktuell</label>
                  </div>

                  <!-- Komfortaktion: nur diese Phase -> current=true; Server erzwingt Eindeutigkeit -->
                  <button
                      v-if="!isNew && !form.current"
                      class="btn btn-outline-info btn-sm"
                      type="button"
                      @click="makeCurrent"
                      :disabled="saving"
                  >
                    Zur aktuellen Phase machen
                  </button>

                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="isClosed" v-model="form.isClosed">
                    <label class="form-check-label" for="isClosed">geschlossen</label>
                  </div>
                </div>
              </div>
            </fieldset>

            <!-- ========== Präferenzvergabe ========== -->
            <fieldset class="mb-4">
              <legend class="h6 text-muted border-bottom pb-2 mb-3">
                <i class="bi bi-calendar-check me-2"></i>Präferenzvergabe
              </legend>
              <p class="text-muted small mb-3">
                Zeitraum, in dem Schüler ihre Kurspräferenzen abgeben können.
              </p>
              <div class="row g-3">
                <div class="col-sm-6">
                  <label class="form-label">Start (TT.MM.JJJJ)</label>
                  <DateInput v-model="form.startDate" placeholder="01.09.2025" required="true"/>
                </div>

                <div class="col-sm-6">
                  <label class="form-label">Ende (TT.MM.JJJJ)</label>
                  <DateInput v-model="form.endDate" placeholder="31.01.2026" />
                </div>
              </div>
            </fieldset>

            <!-- ========== Wechselphase ========== -->
            <fieldset class="mb-4">
              <legend class="h6 text-muted border-bottom pb-2 mb-3">
                <i class="bi bi-arrow-left-right me-2"></i>Wechselphase
              </legend>
              <p class="text-muted small mb-3">
                Zeitraum, in dem Schüler Kurswechsel beantragen können. Beide Felder müssen gesetzt sein, um die Wechselphase zu aktivieren.
              </p>
              <div class="row g-3">
                <div class="col-sm-6">
                  <label class="form-label">Start</label>
                  <input
                      type="datetime-local"
                      class="form-control"
                      v-model="form.exchangePhaseStart"
                      placeholder="Datum und Uhrzeit"
                  />
                </div>

                <div class="col-sm-6">
                  <label class="form-label">Ende</label>
                  <input
                      type="datetime-local"
                      class="form-control"
                      v-model="form.exchangePhaseEnd"
                      placeholder="Datum und Uhrzeit"
                  />
                </div>

                <!-- Status-Anzeige -->
                <div class="col-12" v-if="form.exchangePhaseStart && form.exchangePhaseEnd">
                  <div
                      class="alert py-2 mb-0"
                      :class="exchangePhaseStatusClass"
                  >
                    <strong>Status:</strong> {{ exchangePhaseStatusText }}
                  </div>
                </div>
              </div>
            </fieldset>

            <div class="d-flex flex-wrap gap-2 mt-4">
              <button class="btn btn-success" @click="save" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                Speichern
              </button>
              <button v-if="!isNew" class="btn btn-outline-danger" @click="remove" :disabled="saving">Löschen</button>
              <button class="btn btn-outline-secondary" @click="resetForm" :disabled="saving">Abbrechen</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Platzhalter -->
      <div class="col-12 col-xl-8" v-else>
        <div class="alert alert-info">Bitte eine Phase aus der Liste wählen oder „Neue Phase anlegen" klicken.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

import { onMounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useErrorStore } from '~/stores/error'
import DateInput from '~/components/DateInput.vue'

type PeriodDTO = {
  id: number | null
  name: string
  startDate: string // "dd.MM.yyyy" - Präferenzvergabe Start
  endDate: string   // "dd.MM.yyyy" - Präferenzvergabe Ende
  visible: boolean
  current: boolean
  isClosed: boolean
  exchangePhaseStart: string | null  // Form: ISO "yyyy-MM-ddTHH:mm", Server: "dd.MM.yyyy HH:mm"
  exchangePhaseEnd: string | null    // Form: ISO "yyyy-MM-ddTHH:mm", Server: "dd.MM.yyyy HH:mm"
  exchangePhaseActive?: boolean      // vom Server berechnet
}

const errorStore = useErrorStore()
const route = useRoute()
const router = useRouter()
const { $authFetch } = useNuxtApp() as any

const periods = ref<PeriodDTO[]>([])
const selected = ref<PeriodDTO | null>(null)
const form = ref<PeriodDTO | null>(null)
const saving = ref(false)

const searchQuery = ref('')
const filteredSuggestions = ref<PeriodDTO[]>([])

const isNew = computed(() => form.value?.id == null)

// --- Exchange Phase Status ---
const exchangePhaseStatusText = computed(() => {
  if (!form.value?.exchangePhaseStart || !form.value?.exchangePhaseEnd) {
    return 'Nicht konfiguriert'
  }
  const now = new Date()
  const start = new Date(form.value.exchangePhaseStart)
  const end = new Date(form.value.exchangePhaseEnd)

  if (now < start) {
    return `Beginnt am ${formatDateTime(start)}`
  } else if (now > end) {
    return `Beendet seit ${formatDateTime(end)}`
  } else {
    return `Aktiv bis ${formatDateTime(end)}`
  }
})

const exchangePhaseStatusClass = computed(() => {
  if (!form.value?.exchangePhaseStart || !form.value?.exchangePhaseEnd) {
    return 'alert-secondary'
  }
  const now = new Date()
  const start = new Date(form.value.exchangePhaseStart)
  const end = new Date(form.value.exchangePhaseEnd)

  if (now < start) {
    return 'alert-info'
  } else if (now > end) {
    return 'alert-secondary'
  } else {
    return 'alert-success'
  }
})

// --- Helpers ---

/**
 * Konvertiert deutsches Format "dd.MM.yyyy HH:mm" zu ISO "yyyy-MM-ddTHH:mm" für datetime-local Input
 */
function germanDateTimeToISO(german: string | null): string | null {
  if (!german) return null
  // Format: "dd.MM.yyyy HH:mm" -> "yyyy-MM-ddTHH:mm"
  const match = german.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, day, month, year, hour, minute] = match
  return `${year}-${month}-${day}T${hour}:${minute}`
}

/**
 * Konvertiert ISO "yyyy-MM-ddTHH:mm" zu deutschem Format "dd.MM.yyyy HH:mm" für Server
 */
function isoToGermanDateTime(iso: string | null): string | null {
  if (!iso) return null
  // Format: "yyyy-MM-ddTHH:mm" -> "dd.MM.yyyy HH:mm"
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  return `${day}.${month}.${year} ${hour}:${minute}`
}

/**
 * Konvertiert Server-DTO (deutsches Format) zu Form-DTO (ISO für datetime-local)
 */
function serverToForm(p: PeriodDTO): PeriodDTO {
  return {
    ...p,
    exchangePhaseStart: germanDateTimeToISO(p.exchangePhaseStart),
    exchangePhaseEnd: germanDateTimeToISO(p.exchangePhaseEnd)
  }
}

/**
 * Konvertiert Form-DTO (ISO) zu Server-DTO (deutsches Format)
 */
function formToServer(p: PeriodDTO): PeriodDTO {
  return {
    ...p,
    exchangePhaseStart: isoToGermanDateTime(p.exchangePhaseStart),
    exchangePhaseEnd: isoToGermanDateTime(p.exchangePhaseEnd)
  }
}

function clone(p: PeriodDTO): PeriodDTO { return { ...p } }

function emptyForm(): PeriodDTO {
  return {
    id: null,
    name: '',
    startDate: '',
    endDate: '',
    visible: true,
    current: false,
    isClosed: false,
    exchangePhaseStart: null,
    exchangePhaseEnd: null
  }
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function sortPeriods(list: PeriodDTO[]): PeriodDTO[] {
  const toKey = (d: string) => d.split('.').reverse().join('-') // yyyy-MM-dd
  return [...list].sort((a,b) => {
    if (a.current !== b.current) return a.current ? -1 : 1
    const ka = toKey(a.startDate || '00.00.0000')
    const kb = toKey(b.startDate || '00.00.0000')
    if (ka !== kb) return ka.localeCompare(kb)
    return (a.name || '').localeCompare(b.name || '')
  })
}

function highlightClasses(p: PeriodDTO, isSelected: boolean) {
  return {
    'active': isSelected,
    'border border-2 border-info current-item': p.current && !isSelected
  }
}

// --- Load ---
async function loadAll() {
  try {
    const data = await $authFetch<PeriodDTO[]>('/periods', { method: 'GET' })
    // Konvertiere Server-Format (deutsch) zu Form-Format (ISO für datetime-local)
    periods.value = sortPeriods((data || []).map(serverToForm))
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  }
}

function selectPeriod(p: PeriodDTO) {
  selected.value = p
  form.value = clone(p)
  router.replace({ path: `/admin/phasen/${p.id}` }).catch(() => {})
}

function createNew() {
  selected.value = null
  form.value = emptyForm()
  router.replace({ path: `/admin/phasen` }).catch(() => {})
}

function resetForm() {
  form.value = selected.value ? clone(selected.value) : null
}

function onSearchInput() {
  const q = searchQuery.value.trim().toLowerCase()
  filteredSuggestions.value = q
      ? periods.value.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.startDate || '').includes(q) ||
          (p.endDate || '').includes(q) ||
          String(p.id || '').includes(q)
      ).slice(0, 20)
      : []
}

async function makeCurrent() {
  if (!form.value || form.value.id == null) return
  try {
    if (form.value.isClosed) {
      const ok = confirm('Diese Phase ist geschlossen. Trotzdem zur aktuellen Phase machen?')
      if (!ok) return
    }
    saving.value = true
    // Konvertiere Form-Format (ISO) zu Server-Format (deutsch)
    const payload = formToServer({ ...form.value, current: true })
    const saved = await $authFetch<PeriodDTO>(`/periods/${form.value.id}`, { method: 'PUT', body: payload })
    await reload()
    const match = periods.value.find(p => p.id === saved.id)
    if (match) selectPeriod(match)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  } finally {
    saving.value = false
  }
}

async function save() {
  if (!form.value) return
  saving.value = true
  try {
    // Konvertiere Form-Format (ISO) zu Server-Format (deutsch)
    const body = formToServer({ ...form.value })

    if (!!body.current && !!body.isClosed) {
      const ok = confirm('Diese Phase ist geschlossen. Trotzdem als aktuelle Phase speichern?')
      if (!ok) { saving.value = false; return }
    }

    let saved: PeriodDTO
    if (form.value.id == null) {
      saved = await $authFetch<PeriodDTO>('/periods', { method: 'POST', body })
    } else {
      saved = await $authFetch<PeriodDTO>(`/periods/${form.value.id}`, { method: 'PUT', body })
    }

    await reload()
    const match = periods.value.find(p => p.id === saved.id)
    if (match) selectPeriod(match)
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!form.value || form.value.id == null) return
  if (!confirm('Diese Phase wirklich löschen?')) return
  saving.value = true
  try {
    await $authFetch<void>(`/periods/${form.value.id}`, { method: 'DELETE' })
    await reload()
    selected.value = null
    form.value = null
    router.replace({ path: `/admin/phasen` }).catch(() => {})
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
  } finally {
    saving.value = false
  }
}

async function preselectFromPath() {
  // Direktaufruf /admin/phasen/{id} -> vorselektieren
  const maybeId = Number(route.params.id)
  if (maybeId && periods.value.length) {
    const match = periods.value.find(p => p.id === maybeId)
    if (match) selectPeriod(match)
  }
}

async function reload() {
  await loadAll()
  await preselectFromPath()
}

onMounted(async () => { await reload() })

watch(() => route.params.id, async () => { await preselectFromPath() })
</script>

<style scoped>
.card-title { font-weight: 600; }
/* Selektion in Blau wie üblich */
.list-group-item.active {
  background-color: #0d6efd;
  border-color: #0d6efd;
}
/* Aktuelle Phase hervorheben, wenn nicht selektiert */
.current-item {
  background-image: linear-gradient(to right, rgba(13,110,253,.10), rgba(13,110,253,0));
}
/* Fieldset styling */
fieldset {
  border: none;
  padding: 0;
  margin: 0;
}
legend {
  font-size: 1rem;
  width: 100%;
}
</style>