<template>
  <div>
    <h1>Phasen verwalten</h1>

    <div v-if="pending" class="alert alert-info">Lade Phasen...</div>
    <div v-else-if="error" class="alert alert-danger">Fehler beim Laden: {{ error.message }}</div>

    <table v-else class="table table-striped align-middle">
      <thead>
      <tr>
        <th>Sichtbar</th>
        <th>Name</th>
        <th>Zeitraum</th>
        <th>Aktionen</th>
        <th>Kurse</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="phase in data" :key="phase.id">
        <td class="text-center">
          <input class="form-check-input" type="checkbox" disabled :checked="phase.visible" />
        </td>
        <td>{{ phase.name }}</td>
        <td>
          <div>{{ phase.startDate }}</div>
          <div>{{ phase.endDate }}</div>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-2" @click="startEdit(phase)">Bearbeiten</button>
          <button class="btn btn-sm btn-outline-danger" @click="deletePhase(phase)">Löschen</button>
        </td>
        <td class="text-end">{{ phase.courseCount }}</td>
      </tr>
      </tbody>
    </table>

    <hr />
    <h4>{{ isEditing ? 'Phase bearbeiten' : 'Neue Phase anlegen' }}</h4>

    <form @submit.prevent="submitForm" class="row g-3">
      <div class="col-md-4">
        <label class="form-label">Name</label>
        <input v-model="form.name" type="text" class="form-control" required />
      </div>

      <div class="col-md-3">
        <label class="form-label">Start</label>
        <DateInput v-model="form.startDate" required />
      </div>

      <div class="col-md-3">
        <label class="form-label">Ende</label>
        <DateInput v-model="form.endDate" required />
      </div>

      <div class="col-md-2 d-flex align-items-end">
        <div class="form-check">
          <input v-model="form.visible" class="form-check-input" type="checkbox" id="sichtbarCheck" />
          <label class="form-check-label" for="sichtbarCheck">Sichtbar</label>
        </div>
      </div>

      <div class="col-12">
        <button type="submit" class="btn btn-primary">
          {{ isEditing ? 'Speichern' : 'Anlegen' }}
        </button>
        <button v-if="isEditing" type="button" class="btn btn-secondary ms-2" @click="cancelEdit">
          Abbrechen
        </button>
      </div>
    </form>

    <div v-if="successMessage" class="alert alert-success mt-3">{{ successMessage }}</div>
    <div v-if="submitError" class="alert alert-danger mt-3">{{ submitError }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DateInput from '~/components/DateInput.vue'

definePageMeta({
  layout: 'admin'
})

const { data, pending, error, refresh } = await useFetch('http://localhost:8080/periods', {
  key: 'phasen-fetch',
})

const form = ref({
  name: '',
  startDate: '',
  endDate: '',
  visible: false,
})

const isEditing = ref(false)
const editingId = ref(null)
const successMessage = ref('')
const submitError = ref('')

const isValidDate = (dateStr) => /^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)
const parseDate = (str) => {
  const [day, month, year] = str.split('.').map(Number)
  return new Date(year, month - 1, day)
}

const submitForm = async () => {
  successMessage.value = ''
  submitError.value = ''

  if (!isValidDate(form.value.startDate)) {
    submitError.value = 'Startdatum muss im Format TT.MM.JJJJ vorliegen.'
    return
  }
  if (!isValidDate(form.value.endDate)) {
    submitError.value = 'Endedatum muss im Format TT.MM.JJJJ vorliegen.'
    return
  }
  const start = parseDate(form.value.startDate)
  const end = parseDate(form.value.endDate)
  if (start > end) {
    submitError.value = 'Das Startdatum darf nicht nach dem Enddatum liegen.'
    return
  }

  const payload = {
    id: isEditing.value ? editingId.value : undefined,
    name: form.value.name,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    visible: form.value.visible,
  }

  if (!isEditing.value) {
    delete payload.id
  }

  try {
    if (isEditing.value) {
      await $fetch(`http://localhost:8080/periods/${editingId.value}`, {
        method: 'PUT',
        body: payload,
      })
      successMessage.value = 'Phase erfolgreich aktualisiert.'
    } else {
      await $fetch('http://localhost:8080/periods', {
        method: 'POST',
        body: payload,
      })
      successMessage.value = 'Phase erfolgreich angelegt.'
    }

    resetForm()
    await refresh()
  } catch (e) {
    submitError.value = e?.data?.message || 'Fehler beim Speichern.'
  }
}

const startEdit = (phase) => {
  form.value = {
    name: phase.name,
    startDate: phase.startDate,
    endDate: phase.endDate,
    visible: phase.visible,
  }
  editingId.value = phase.id
  isEditing.value = true
  successMessage.value = ''
  submitError.value = ''
}

const cancelEdit = () => {
  resetForm()
}

const resetForm = () => {
  form.value = { name: '', startDate: '', endDate: '', visible: false }
  isEditing.value = false
  editingId.value = null
}

const deletePhase = async (phase) => {
  if (confirm(`Soll die Phase "${phase.name}" wirklich gelöscht werden?`)) {
    try {
      await $fetch(`http://localhost:8080/periods/${phase.id}`, {
        method: 'DELETE',
      })
      await refresh()
      successMessage.value = 'Phase gelöscht.'
    } catch (e) {
      submitError.value = e?.data?.message || 'Fehler beim Löschen.'
    }
  }
}
</script>