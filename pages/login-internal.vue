<!-- /pages/login-internal.vue -->
<script setup lang="ts">
import { useErrorStore } from '~/stores/error'
import { useToastStore } from '~/stores/toast'

definePageMeta({
  authDisabled: true,
  layout: 'empty'
})

const config = useRuntimeConfig()
const errorStore = useErrorStore()
const toastStore = useToastStore()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const isResetLoading = ref(false)

// Prüft, ob eine gültige E-Mail-Adresse eingegeben wurde
const isValidEmail = computed(() => {
  const email = username.value.trim()
  // Einfache E-Mail-Validierung
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
})

async function handleLogin() {
  if (isLoading.value) return

  // Validierung
  if (!username.value.trim()) {
    errorStore.show('Bitte gib einen Benutzernamen ein.')
    return
  }

  if (!password.value) {
    errorStore.show('Bitte gib ein Passwort ein.')
    return
  }

  isLoading.value = true

  try {
    // POST Request an /login (ohne authFetch, da noch kein Token vorhanden)
    const response = await $fetch('/login', {
      method: 'POST',
      baseURL: config.public.apiBase,
      credentials: config.public.apiWithCredentials ? 'include' : 'omit',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        username: username.value.trim(),
        password: password.value
      }
    })

    // Response verarbeiten
    const { token, user, roles } = response as any

    // Token speichern
    localStorage.setItem('jwt', token)

    // Username im Store setzen
    userStore.setUsername(user.username)
    userStore.setName(user.name)
    userStore.setRoles(roles)

    // Erfolgsmeldung
    toastStore.success('Erfolgreich angemeldet!')

    // Navigation
    await navigateTo(roles.includes('ADMIN') ? '/admin' :
        roles.includes('COURSE_INSTRUCTOR') ? '/instructor/attendance' : '/preferences')

  } catch (err: any) {
    console.error('Login error:', err)
    isLoading.value = false
    errorStore.show(err?.data?.message ?? 'Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.')
  }
}

async function handlePasswordReset() {
  if (isResetLoading.value || !isValidEmail.value) return

  isResetLoading.value = true

  try {
    await $fetch('/users/password-reset', {
      method: 'POST',
      baseURL: config.public.apiBase,
      credentials: config.public.apiWithCredentials ? 'include' : 'omit',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: username.value.trim()
      }
    })

    toastStore.success('Ein neues Passwort wurde an deine E-Mail-Adresse gesendet.')

  } catch (err: any) {
    console.error('Password reset error:', err)
    errorStore.show(err?.data?.message ?? 'Das Zurücksetzen des Passworts ist fehlgeschlagen.')
  } finally {
    isResetLoading.value = false
  }
}

// Enter-Taste im Formular
function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div class="container min-vh-100 d-flex align-items-center justify-content-center">
    <div class="col-12 col-md-8 col-lg-5">
      <div class="card shadow-sm border-0">
        <div class="card-body p-3 p-md-5">

          <!-- Logo -->
          <div class="text-center mb-3">
            <img
                src="/images/logo_johanna_moosdorf.png"
                alt="Logo der Johanna-Moosdorf-Schule"
                class="img-fluid"
                style="max-height: 80px; object-fit: contain;"
                loading="eager"
            />
          </div>

          <!-- Titel & Text -->
          <h1 class="h4 mb-1 text-center">iLA Login</h1>
          <p class="text-muted mb-4 text-center">
            Anmeldung für Nutzer ohne IServ-Konto
          </p>

          <!-- Login-Formular -->
          <div class="mb-2">
            <label for="username" class="form-label">E-Mail-Adresse</label>
            <input
                id="username"
                v-model="username"
                type="email"
                class="form-control"
                placeholder="E-Mail-Adresse eingeben"
                :disabled="isLoading || isResetLoading"
                autocomplete="username"
                @keypress="handleKeyPress"
            />
          </div>

          <div class="mb-3">
            <label for="password" class="form-label">Passwort</label>
            <input
                id="password"
                v-model="password"
                type="password"
                class="form-control"
                placeholder="Passwort eingeben"
                :disabled="isLoading || isResetLoading"
                autocomplete="current-password"
                @keypress="handleKeyPress"
            />
          </div>

          <!-- Login-Button -->
          <button
              type="button"
              class="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center"
              :disabled="isLoading || isResetLoading"
              @click="handleLogin"
          >
            <span v-if="!isLoading">Anmelden</span>
            <span v-else class="d-inline-flex align-items-center">
              <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Wird angemeldet…
            </span>
          </button>

          <!-- Passwort vergessen -->
          <div class="mt-3 d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <small class="text-muted">
              Passwort vergessen? E-Mail eingeben und neues anfordern:
            </small>
            <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="!isValidEmail || isLoading || isResetLoading"
                @click="handlePasswordReset"
            >
              <span v-if="!isResetLoading">Neues Passwort</span>
              <span v-else class="d-inline-flex align-items-center">
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Sende…
              </span>
            </button>
          </div>

          <div class="mt-3 text-center">
            <small class="text-muted">
              Probleme bei der Anmeldung? <br/>
              Support Email an <a href="mailto:ila@jms-muenster.de" class="link-secondary">ila@jms-muenster.de</a>
              schreiben
            </small>
          </div>

          <!-- Link zur IServ-Anmeldung -->
          <hr class="my-2">
          <div class="text-center">
            <small class="text-muted">
              Schüler melden sich über <NuxtLink to="/" class="link-secondary">IServ</NuxtLink> an.
            </small>
          </div>
        </div>
      </div>

      <div class="text-center mt-2">
        <small class="text-muted">
          &copy; {{ new Date().getFullYear() }} Johanna-Moosdorf-Schule | <Version/>
        </small>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Optional: Focus-Styling für bessere Accessibility */
</style>