<!-- /pages/index.vue -->
<script setup lang="ts">
import Version from "~/components/Version.vue";

definePageMeta({
  authDisabled: true,
  layout: 'empty'
})

const {login} = useLoginRedirect()

const isRedirecting = ref(false)

function handleLogin() {
  if (isRedirecting.value) return
  isRedirecting.value = true
  login('/') // nach Login zur Root-Seite zurück
}

import { useErrorStore } from '~/stores/error'
const errorStore = useErrorStore()
</script>

<template>
  <div class="container min-vh-100 d-flex align-items-center justify-content-center">
    <div class="col-12 col-md-8 col-lg-5">
      <div class="card shadow-sm border-0">
        <div class="card-body p-4 p-md-5 text-center">

          <!-- Logo -->
          <img
              src="/images/logo_johanna_moosdorf.png"
              alt="Logo der Johanna-Moosdorf-Schule"
              class="img-fluid mb-4"
              style="max-height: 120px; object-fit: contain;"
              loading="eager"
          />

          <!-- Titel & Text -->
          <h1 class="h4 mb-2">Willkommen zur iLa Einschreibung</h1>
          <p class="text-muted mb-4">
            Bitte melde Dich mit Deinem IServ-Account an!
          </p>

          <!-- Login-Button -->
          <button
              type="button"
              class="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center"
              :disabled="isRedirecting"
              @click="handleLogin"
          >
            <span v-if="!isRedirecting">Jetzt via IServ anmelden</span>
            <span v-else class="d-inline-flex align-items-center">
              <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Weiterleiten…
            </span>
          </button>

          <!-- Divider mit "oder" -->
          <div class="position-relative my-4">
            <hr class="text-muted">
            <span class="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">
              oder
            </span>
          </div>

          <!-- Interner Login für Nutzer ohne IServ -->
          <div class="alert alert-info py-2 mb-3">
            <small>
              <strong>Kein IServ Account?</strong><br>
              Externe Kursleiter können sich
              <NuxtLink to="/login-internal" class="alert-link fw-bold">hier anmelden</NuxtLink>
            </small>
          </div>

          <div class="mt-3">
            <small class="text-muted">
              Probleme bei der Anmeldung? <br/>
              Support Email an <a href="mailto:admin@sandbox27.de" class="link-secondary">admin@sandbox27.de</a>
              schreiben
            </small>
          </div>
        </div>
      </div>

      <div class="text-center mt-3">
        <small class="text-muted">
          <Version />
        </small>
      </div>
    </div>
  </div>
</template>