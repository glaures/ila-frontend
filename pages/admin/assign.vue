<template>
  <div class="p-4">
    <h1 class="h4 mb-4">Kursvergabe starten</h1>

    <div v-if="loading" class="text-muted">Lade aktuelle Phase...</div>

    <div v-else>
      <p class="mb-2">
        Aktuelle Phase:
        <strong>{{ currentPeriod?.name || 'Unbekannt' }}</strong>
      </p>
      <button @click="startAssignment" :disabled="assigning" class="btn btn-primary mb-4">
        {{ assigning ? 'Vergabe läuft...' : 'Kursvergabe starten' }}
      </button>

      <!-- Strukturierte Anzeige -->
      <div v-if="result && result.students" class="mt-4">
        <h2 class="h5 mb-3">Vergabeübersicht</h2>

        <div
            v-for="student in result.students"
            :key="student.studentName"
            class="mb-4 border rounded p-3 bg-light"
        >
          <h5>{{ student.studentName }}</h5>
          <table class="table table-sm table-bordered mt-2 mb-0">
            <thead>
            <tr>
              <th>Block</th>
              <th>Kurs</th>
              <th>Präferenz</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="block in student.weeklyPlan" :key="block.blockLabel">
              <td>{{ block.blockLabel }}</td>
              <td>{{ block.courseName }}</td>
              <td>
            <span
                :class="{
                'text-muted': block.preferenceIndex === -1,
                'fw-bold': block.preferenceIndex === 0
              }"
            >
              {{ block.preferenceIndex === -1 ? 'PAUSE' : block.preferenceIndex + 1 }}
            </span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useNuxtApp } from '#app'

const { $authFetch } = useNuxtApp()

const currentPeriod = ref(null)
const loading = ref(true)
const assigning = ref(false)
const result = ref(null)

const BASE_URL = 'http://localhost:8080'

async function fetchCurrentPeriod() {
  try {
    currentPeriod.value = await $authFetch(BASE_URL + '/periods/current')
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function startAssignment() {
  if (!currentPeriod.value?.id) return
  assigning.value = true
  result.value = null
  try {
    result.value = await $authFetch(`${BASE_URL}/assign/${currentPeriod.value.id}`, {
      method: 'POST'
    })
  } catch (err) {
    result.value = 'Fehler: ' + err.message
  } finally {
    assigning.value = false
  }
}

onMounted(fetchCurrentPeriod)
</script>
