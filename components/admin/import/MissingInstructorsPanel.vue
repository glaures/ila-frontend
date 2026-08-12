<script lang="ts" setup>
import {computed, reactive, ref, watch} from 'vue'
import {useNuxtApp} from '#app'
import {useToastStore} from '@/stores/toast'
import type {MissingInstructor} from '@/types/courseImport'

const props = defineProps<{ instructors: MissingInstructor[] }>()
const emit = defineEmits<{ (e: 'created'): void }>()

const {$authFetch} = useNuxtApp() as any
const toastStore = useToastStore()

const key = (i: MissingInstructor) => `${i.firstName}|${i.lastName}`

const emails = reactive<Record<string, string>>({})
const saving = ref<string | null>(null)
const created = ref<Set<string>>(new Set())
const rowError = reactive<Record<string, string>>({})

// Beim Wechsel auf einen neuen Report die Eingaben zurücksetzen
watch(() => props.instructors, () => {
  created.value = new Set()
  saving.value = null
  for (const k of Object.keys(emails)) delete emails[k]
  for (const k of Object.keys(rowError)) delete rowError[k]
})

const openCount = computed(() =>
    props.instructors.filter(i => !created.value.has(key(i))).length
)

const allCreated = computed(() =>
    props.instructors.length > 0 && openCount.value === 0
)

async function createInstructor(instructor: MissingInstructor) {
  const k = key(instructor)
  const email = (emails[k] ?? '').trim()

  delete rowError[k]

  if (!email) {
    rowError[k] = 'Bitte eine E-Mail-Adresse eingeben.'
    return
  }

  saving.value = k
  try {
    await $authFetch('/users', {
      method: 'PUT',
      body: {
        login: null,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        email,
        initialRole: 'COURSE_INSTRUCTOR'
      }
    })

    created.value = new Set(created.value).add(k)
    toastStore.success(`${instructor.firstName} ${instructor.lastName} wurde angelegt`)
    emit('created')
  } catch (err: any) {
    // Globales Banner kommt aus dem authFetch-Plugin; hier die Zeile markieren.
    rowError[k] = err?.data?.message ?? 'Der Nutzer konnte nicht angelegt werden.'
  } finally {
    saving.value = null
  }
}
</script>

<template>
  <div class="card border-danger mb-3">
    <div class="card-body">
      <h5 class="card-title text-danger">
        <i class="bi bi-person-exclamation me-2" aria-hidden="true"></i>
        Fehlende Kursleiter ({{ instructors.length }})
      </h5>

      <p class="text-muted small">
        Diese Personen sind in der Excel-Datei als Kursleiter eingetragen, existieren aber noch nicht
        als Nutzer. Die Planungsdatei enthält keine E-Mail-Adressen – bitte hier ergänzen. Nach dem
        Anlegen die Datei erneut prüfen.
      </p>

      <div
          v-for="instructor in instructors"
          :key="key(instructor)"
          class="border rounded p-2 mb-2"
      >
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-3">
            <strong>{{ instructor.firstName }} {{ instructor.lastName }}</strong>
          </div>

          <div class="col-12 col-md-4">
            <input
                v-model="emails[key(instructor)]"
                :aria-label="`E-Mail für ${instructor.firstName} ${instructor.lastName}`"
                :disabled="created.has(key(instructor)) || saving === key(instructor)"
                class="form-control form-control-sm"
                placeholder="vorname.nachname@schule.de"
                type="email"
                @keyup.enter="createInstructor(instructor)"
            />
          </div>

          <div class="col-12 col-md-2">
            <button
                v-if="!created.has(key(instructor))"
                :disabled="saving !== null"
                class="btn btn-sm btn-primary w-100"
                type="button"
                @click="createInstructor(instructor)"
            >
              <span v-if="saving === key(instructor)">
                <span class="spinner-border spinner-border-sm me-1"></span>
                Anlegen…
              </span>
              <span v-else>Anlegen</span>
            </button>
            <span v-else class="badge bg-success">
              <i class="bi bi-check-lg me-1" aria-hidden="true"></i>Angelegt
            </span>
          </div>

          <div class="col-12 col-md-3">
            <span class="text-muted small">Kurse:</span>
            <span
                v-for="courseId in instructor.courseIds"
                :key="courseId"
                class="badge bg-light text-dark border ms-1"
            >
              {{ courseId }}
            </span>
          </div>
        </div>

        <div v-if="rowError[key(instructor)]" class="text-danger small mt-1">
          {{ rowError[key(instructor)] }}
        </div>
      </div>

      <div v-if="allCreated" class="alert alert-success mb-0 mt-3">
        <i class="bi bi-check-circle me-2" aria-hidden="true"></i>
        Alle fehlenden Kursleiter wurden angelegt. Bitte die Datei jetzt
        <strong>erneut prüfen</strong> – die Zuordnung erfolgt beim nächsten Durchlauf.
      </div>
    </div>
  </div>
</template>
