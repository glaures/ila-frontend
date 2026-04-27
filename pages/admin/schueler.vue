<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col">
        <h1>Schüler:innen</h1>
        <p class="text-muted mb-0">
          Übersicht aller iLA-Schüler:innen. Hier können Schüler:innen, die nicht mehr am
          iLA-Verfahren teilnehmen sollen (z.B. Schulwechsel), manuell deaktiviert werden.
        </p>
      </div>
    </div>

    <!-- Statistik-Badges -->
    <div class="row mb-3">
      <div class="col d-flex gap-2 align-items-center flex-wrap">
        <span class="badge bg-success fs-6">
          <i class="bi bi-check-circle me-1"></i>
          {{ activeCount }} aktiv
        </span>
        <span class="badge bg-secondary fs-6">
          <i class="bi bi-slash-circle me-1"></i>
          {{ disabledCount }} deaktiviert
        </span>
        <span class="text-muted ms-2 small">
          ({{ filteredStudents.length }} angezeigt)
        </span>
      </div>
    </div>

    <!-- Filter-Zeile -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-5">
            <label class="form-label small text-muted mb-1">Suche</label>
            <input
                v-model="searchTerm"
                type="text"
                class="form-control"
                placeholder="Nach Name, Vorname oder Benutzername suchen..."
            />
          </div>
          <div class="col-md-3">
            <label class="form-label small text-muted mb-1">Klassenstufe</label>
            <select v-model="filterGrade" class="form-select">
              <option :value="null">Alle Klassenstufen</option>
              <option v-for="grade in availableGrades" :key="grade" :value="grade">
                Klasse {{ grade }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-muted mb-1">Status</label>
            <select v-model="filterStatus" class="form-select">
              <option value="all">Alle</option>
              <option value="active">Nur aktive</option>
              <option value="disabled">Nur deaktivierte</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabelle -->
    <div class="card">
      <div class="card-body p-0">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Lädt...</span>
          </div>
        </div>

        <div v-else-if="filteredStudents.length === 0" class="text-center py-5 text-muted">
          Keine Schüler:innen gefunden
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
            <tr>
              <th>Nachname</th>
              <th>Vorname</th>
              <th class="text-center">Klasse</th>
              <th>E-Mail</th>
              <th class="text-center">Status</th>
              <th class="text-end" style="width: 180px;">Aktion</th>
            </tr>
            </thead>
            <tbody>
            <tr
                v-for="student in filteredStudents"
                :key="student.userName"
                :class="{ 'text-muted': student.disabled }"
            >
              <td>{{ student.lastName }}</td>
              <td>{{ student.firstName }}</td>
              <td class="text-center">
                <span v-if="student.grade > 0" class="badge bg-info">{{ student.grade }}</span>
                <span v-else class="text-muted small">—</span>
              </td>
              <td class="small">{{ student.email }}</td>
              <td class="text-center">
                <span v-if="student.disabled" class="badge bg-secondary">
                  <i class="bi bi-slash-circle me-1"></i>deaktiviert
                </span>
                <span v-else class="badge bg-success">
                  <i class="bi bi-check-circle me-1"></i>aktiv
                </span>
              </td>
              <td class="text-end">
                <button
                    v-if="!student.disabled"
                    class="btn btn-sm btn-outline-danger"
                    @click="openDisableModal(student)"
                >
                  <i class="bi bi-slash-circle me-1"></i>
                  Deaktivieren
                </button>
                <button
                    v-else
                    class="btn btn-sm btn-outline-success"
                    @click="openEnableModal(student)"
                >
                  <i class="bi bi-arrow-counterclockwise me-1"></i>
                  Reaktivieren
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Deaktivieren-Modal -->
    <div ref="disableModalRef" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Schüler:in deaktivieren
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="selectedStudent">
            <p>Möchtest du folgende Person wirklich aus dem iLA-Verfahren herausnehmen?</p>
            <div class="alert alert-secondary">
              <strong>{{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</strong>
              <br>
              <small class="text-muted">
                Klasse {{ selectedStudent.grade }} · {{ selectedStudent.userName }}
              </small>
            </div>
            <div class="alert alert-warning small mb-0">
              <strong>Folgen:</strong>
              <ul class="mb-0 mt-1">
                <li>Die Rolle <code>STUDENT</code> wird entzogen</li>
                <li>Das iLA-Mitglied-Flag wird auf <code>false</code> gesetzt</li>
                <li>Die Person wird beim nächsten IServ-Sync <strong>nicht</strong> mehr automatisch
                  reaktiviert (lokal überschreibt extern)
                </li>
                <li>Sie wird damit aus laufenden Vergabe-Prozessen ausgenommen</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Abbrechen
            </button>
            <button
                type="button"
                class="btn btn-danger"
                :disabled="saving"
                @click="confirmDisable"
            >
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-slash-circle me-1"></i>
              Deaktivieren
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reaktivieren-Modal -->
    <div ref="enableModalRef" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
              <i class="bi bi-arrow-counterclockwise me-2"></i>
              Schüler:in reaktivieren
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="selectedStudent">
            <p>Möchtest du folgende Person wieder für das iLA-Verfahren freischalten?</p>
            <div class="alert alert-secondary">
              <strong>{{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</strong>
              <br>
              <small class="text-muted">{{ selectedStudent.userName }}</small>
            </div>
            <div class="alert alert-info small mb-0">
              <i class="bi bi-info-circle me-1"></i>
              Beim nächsten IServ-Sync werden die Rolle und das iLA-Mitglied-Flag automatisch
              wiederhergestellt, sofern die Person noch in IServ als Schüler:in geführt wird.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Abbrechen
            </button>
            <button
                type="button"
                class="btn btn-success"
                :disabled="saving"
                @click="confirmEnable"
            >
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-arrow-counterclockwise me-1"></i>
              Reaktivieren
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Modal } from 'bootstrap'

definePageMeta({
  layout: 'admin',
})

interface Student {
  userName: string
  firstName: string
  lastName: string
  email: string
  grade: number
  ilaMember: boolean
  disabled: boolean
  roles: string[]
}

const { $authFetch } = useNuxtApp()
const toastStore = useToastStore()
const errorStore = useErrorStore()

// State
const allStudents = ref<Student[]>([])
const loading = ref(false)
const saving = ref(false)

const searchTerm = ref('')
const filterGrade = ref<number | null>(null)
const filterStatus = ref<'all' | 'active' | 'disabled'>('all')

const selectedStudent = ref<Student | null>(null)
const disableModalRef = ref<HTMLElement | null>(null)
const enableModalRef = ref<HTMLElement | null>(null)
let disableModal: Modal | null = null
let enableModal: Modal | null = null

// Computed
const activeCount = computed(() => allStudents.value.filter(s => !s.disabled).length)
const disabledCount = computed(() => allStudents.value.filter(s => s.disabled).length)

const availableGrades = computed(() => {
  const grades = new Set<number>()
  allStudents.value.forEach(s => {
    if (s.grade > 0) grades.add(s.grade)
  })
  return Array.from(grades).sort((a, b) => a - b)
})

const filteredStudents = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  return allStudents.value
      .filter(s => {
        // Status-Filter
        if (filterStatus.value === 'active' && s.disabled) return false
        if (filterStatus.value === 'disabled' && !s.disabled) return false
        // Klassenstufe
        if (filterGrade.value !== null && s.grade !== filterGrade.value) return false
        // Suchbegriff
        if (term) {
          const haystack = `${s.firstName} ${s.lastName} ${s.userName}`.toLowerCase()
          if (!haystack.includes(term)) return false
        }
        return true
      })
      .sort((a, b) => {
        const last = a.lastName.localeCompare(b.lastName, 'de')
        return last !== 0 ? last : a.firstName.localeCompare(b.firstName, 'de')
      })
})

// Methods
async function loadStudents() {
  loading.value = true
  try {
    const users = await $authFetch<Student[]>('/users?count=9999')
    // Nur (ehemalige) iLA-Schüler:innen behalten
    allStudents.value = users.filter(u =>
        u.ilaMember || u.disabled || (u.roles && u.roles.includes('STUDENT'))
    )
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Laden der Schüler:innen: ' + err)
  } finally {
    loading.value = false
  }
}

function openDisableModal(student: Student) {
  selectedStudent.value = student
  disableModal?.show()
}

function openEnableModal(student: Student) {
  selectedStudent.value = student
  enableModal?.show()
}

async function confirmDisable() {
  if (!selectedStudent.value) return
  await setDisabled(selectedStudent.value, true)
  disableModal?.hide()
}

async function confirmEnable() {
  if (!selectedStudent.value) return
  await setDisabled(selectedStudent.value, false)
  enableModal?.hide()
}

async function setDisabled(student: Student, disabled: boolean) {
  saving.value = true
  try {
    const updated = await $authFetch<Student>(
        `/users/${encodeURIComponent(student.userName)}/disabled`,
        {
          method: 'POST',
          body: { disabled },
        }
    )
    // Lokal aktualisieren statt komplett neu laden
    const idx = allStudents.value.findIndex(s => s.userName === student.userName)
    if (idx !== -1) {
      // Falls beim Reaktivieren der User nicht mehr in unserer Filtermenge wäre,
      // bleibt er trotzdem sichtbar bis zum nächsten Reload — das ist OK.
      allStudents.value[idx] = { ...allStudents.value[idx], ...updated }
    }
    toastStore.success(
        disabled
            ? `${student.firstName} ${student.lastName} wurde deaktiviert.`
            : `${student.firstName} ${student.lastName} wurde reaktiviert.`
    )
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Fehler beim Speichern: ' + err)
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(() => {
  if (disableModalRef.value) disableModal = new Modal(disableModalRef.value)
  if (enableModalRef.value) enableModal = new Modal(enableModalRef.value)
  loadStudents()
})

onBeforeUnmount(() => {
  disableModal?.dispose()
  enableModal?.dispose()
})
</script>

<style scoped>
.table > :not(caption) > * > * {
  padding: 0.6rem 0.75rem;
}

.badge {
  font-weight: 500;
}
</style>