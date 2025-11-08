<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col">
        <h1>Nutzerverwaltung</h1>
        <p class="text-muted">
          Verwaltung externer Nutzer ohne IServ-Account (z.B. externe Kursleiter)
        </p>
      </div>
    </div>

    <!-- Aktions-Buttons -->
    <div class="row mb-3">
      <div class="col">
        <button class="btn btn-primary" @click="openCreateModal">
          <i class="bi bi-plus-circle me-2"></i>
          Neuen Nutzer anlegen
        </button>
      </div>
    </div>

    <!-- Nutzertabelle -->
    <div class="row">
      <div class="col">
        <div class="card">
          <div class="card-header bg-light">
            <h5 class="mb-0">Externe Nutzer</h5>
          </div>
          <div class="card-body p-0">
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Lädt...</span>
              </div>
            </div>

            <div v-else-if="users.length === 0" class="text-center py-5 text-muted">
              Keine externen Nutzer vorhanden
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                <tr>
                  <th>Benutzername</th>
                  <th>Vorname</th>
                  <th>Nachname</th>
                  <th>E-Mail</th>
                  <th>Rollen</th>
                  <th class="text-end">Aktionen</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="user in users" :key="user.userName">
                  <td>
                    <strong>{{ user.userName }}</strong>
                  </td>
                  <td>{{ user.firstName || '-' }}</td>
                  <td>{{ user.lastName || '-' }}</td>
                  <td>{{ user.email || '-' }}</td>
                  <td>
                      <span
                          v-for="role in user.roles"
                          :key="role"
                          class="badge bg-secondary me-1"
                      >
                        {{ formatRole(role) }}
                      </span>
                  </td>
                  <td class="text-end">
                    <button
                        class="btn btn-sm btn-outline-primary"
                        @click="openEditModal(user)"
                        title="Bearbeiten"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Paginierung -->
          <div v-if="showPagination" class="card-footer bg-light">
            <nav aria-label="Seitennavigation">
              <ul class="pagination mb-0 justify-content-center align-items-center">
                <li class="page-item" :class="{ disabled: currentPage === 0 }">
                  <button
                      class="page-link"
                      @click="changePage(currentPage - 1)"
                      :disabled="currentPage === 0"
                  >
                    Zurück
                  </button>
                </li>

                <li class="page-item disabled">
                  <span class="page-link">
                    Seite {{ currentPage + 1 }}
                  </span>
                </li>

                <li
                    class="page-item"
                    :class="{ disabled: !hasNextPage }"
                >
                  <button
                      class="page-link"
                      @click="changePage(currentPage + 1)"
                      :disabled="!hasNextPage"
                  >
                    Weiter
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal für Erstellen/Bearbeiten -->
    <div
        class="modal fade"
        ref="userModal"
        tabindex="-1"
        aria-labelledby="userModalLabel"
        aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="userModalLabel">
              {{ isEditMode ? 'Nutzer bearbeiten' : 'Neuen Nutzer anlegen' }}
            </h5>
            <button
                type="button"
                class="btn-close"
                @click="closeModal"
                aria-label="Schließen"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveUser">
              <div class="mb-3">
                <label for="login" class="form-label">
                  Benutzername <span class="text-danger">*</span>
                </label>
                <input
                    id="login"
                    v-model="formData.login"
                    type="text"
                    class="form-control"
                    :disabled="isEditMode"
                    required
                    placeholder="z.B. max.mustermann"
                />
                <div v-if="isEditMode" class="form-text">
                  Der Benutzername kann nicht geändert werden
                </div>
              </div>

              <div class="mb-3">
                <label for="firstName" class="form-label">Vorname</label>
                <input
                    id="firstName"
                    v-model="formData.firstName"
                    type="text"
                    class="form-control"
                    placeholder="Max"
                />
              </div>

              <div class="mb-3">
                <label for="lastName" class="form-label">Nachname</label>
                <input
                    id="lastName"
                    v-model="formData.lastName"
                    type="text"
                    class="form-control"
                    placeholder="Mustermann"
                />
              </div>

              <div class="mb-3">
                <label for="email" class="form-label">E-Mail</label>
                <input
                    id="email"
                    v-model="formData.email"
                    type="email"
                    class="form-control"
                    placeholder="max.mustermann@example.com"
                />
              </div>

              <div v-if="!isEditMode" class="mb-3">
                <label for="initialRole" class="form-label">
                  Rolle <span class="text-danger">*</span>
                </label>
                <select
                    id="initialRole"
                    v-model="formData.initialRole"
                    class="form-select"
                    required
                >
                  <option value="">Bitte wählen...</option>
                  <option value="COURSE_INSTRUCTOR">Kursleiter</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="TREASURER">Schatzmeister</option>
                </select>
              </div>

              <div v-if="isEditMode" class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                Die Rolle kann derzeit nur beim Anlegen eines Nutzers gesetzt
                werden. Für Rollenänderungen wenden Sie sich bitte an einen
                Systemadministrator.
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              Abbrechen
            </button>
            <button
                type="button"
                class="btn btn-primary"
                @click="saveUser"
                :disabled="saving"
            >
              <span
                  v-if="saving"
                  class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
              ></span>
              {{ isEditMode ? 'Speichern' : 'Anlegen' }}
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

interface User {
  userName: string
  firstName?: string
  lastName?: string
  email?: string
  roles: string[]
}

interface UserPayload {
  login?: string
  firstName?: string
  lastName?: string
  email?: string
  initialRole?: string
}

const { $authFetch } = useNuxtApp()
const toastStore = useToastStore()
const errorStore = useErrorStore()

// State
const users = ref<User[]>([])
const loading = ref(false)
const saving = ref(false)
const currentPage = ref(0)
const pageSize = 20
const hasNextPage = ref(true)

const isEditMode = ref(false)
const userModal = ref<HTMLElement | null>(null)
let modalInstance: Modal | null = null

const formData = ref<UserPayload>({
  login: '',
  firstName: '',
  lastName: '',
  email: '',
  initialRole: '',
})

// Computed
const showPagination = computed(() => {
  // Zeige Paginierung, wenn wir nicht auf Seite 0 sind oder wenn es eine nächste Seite gibt
  return currentPage.value > 0 || hasNextPage.value
})

// Methods
async function loadUsers() {
  loading.value = true
  try {
    const response = await $authFetch<User[]>(
        `/users?intern=true&page=${currentPage.value}&count=${pageSize}`
    )
    users.value = response

    // Wenn die Liste kürzer als pageSize ist, gibt es keine weitere Seite
    hasNextPage.value = response.length >= pageSize
  } catch (err: any) {
    errorStore.show(
        err?.data?.message ?? 'Fehler beim Laden der Nutzer: ' + err
    )
  } finally {
    loading.value = false
  }
}

function changePage(page: number) {
  if (page < 0) return // Keine negativen Seiten
  if (page > currentPage.value && !hasNextPage.value) return // Keine weitere Seite verfügbar

  currentPage.value = page
  loadUsers()
}

function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    ADMIN: 'Administrator',
    COURSE_INSTRUCTOR: 'Kursleiter',
    TREASURER: 'Schatzmeister',
    STUDENT: 'Schüler',
    SCHOOL_ADMIN: 'Schuladministrator',
  }
  return roleMap[role] || role
}

function openCreateModal() {
  isEditMode.value = false
  formData.value = {
    login: '',
    firstName: '',
    lastName: '',
    email: '',
    initialRole: '',
  }
  showModal()
}

function openEditModal(user: User) {
  isEditMode.value = true
  formData.value = {
    login: user.userName,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
  }
  showModal()
}

function showModal() {
  if (userModal.value) {
    modalInstance = new Modal(userModal.value)
    modalInstance.show()
  }
}

function closeModal() {
  if (modalInstance) {
    modalInstance.hide()
  }
}

async function saveUser() {
  // Validierung
  if (!formData.value.login?.trim()) {
    toastStore.error('Bitte geben Sie einen Benutzernamen ein')
    return
  }

  if (!isEditMode.value && !formData.value.initialRole) {
    toastStore.error('Bitte wählen Sie eine Rolle aus')
    return
  }

  saving.value = true
  try {
    if (isEditMode.value) {
      // Nur geänderte Felder senden (login nicht änderbar)
      const payload: UserPayload = {
        login: formData.value.login,
      }
      if (formData.value.firstName?.trim()) {
        payload.firstName = formData.value.firstName
      }
      if (formData.value.lastName?.trim()) {
        payload.lastName = formData.value.lastName
      }
      if (formData.value.email?.trim()) {
        payload.email = formData.value.email
      }

      await $authFetch('/users', {
        method: 'POST',
        body: payload,
      })
      toastStore.success('Nutzer erfolgreich aktualisiert')
    } else {
      // Neuen Nutzer anlegen
      await $authFetch('/users', {
        method: 'PUT',
        body: formData.value,
      })
      toastStore.success('Nutzer erfolgreich angelegt')
    }

    closeModal()
    await loadUsers()
  } catch (err: any) {
    errorStore.show(
        err?.data?.message ?? 'Fehler beim Speichern des Nutzers: ' + err
    )
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.table > :not(caption) > * > * {
  padding: 0.75rem;
}

.badge {
  font-weight: 500;
  padding: 0.35rem 0.65rem;
}

.modal-content {
  border-radius: 0.5rem;
}

.form-label {
  font-weight: 500;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
}
</style>