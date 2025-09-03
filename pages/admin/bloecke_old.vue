<template>
  <div>
    <h3>Blöcke verwalten</h3>

    <div class="mb-4">
      <label class="form-label">Phase auswählen:</label>
      <select v-model="selectedPeriodId" class="form-select">
        <option v-for="period in periods" :key="period.id" :value="period.id">
          {{ period.name }}
        </option>
      </select>
    </div>

    <div v-if="!selectedPeriodId" class="alert alert-warning">
      Bitte wähle zuerst eine Phase aus.
    </div>

    <div v-else>
      <table class="table table-striped align-middle">
        <thead>
        <tr>
          <th>Wochentag</th>
          <th>Uhrzeit</th>
          <th>Aktionen</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="block in filteredBlocks" :key="block.id">
          <td>{{ dayOfWeekLabel(block.dayOfWeek) }}</td>
          <td>{{ block.startTime }} – {{ block.endTime }}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-2" @click="startEdit(block)">Bearbeiten</button>
            <button class="btn btn-sm btn-outline-danger" @click="deleteBlock(block)">Löschen</button>
          </td>
        </tr>
        </tbody>
      </table>

      <hr />
      <h4>{{ isEditing ? 'Block bearbeiten' : 'Neuen Block anlegen' }}</h4>

      <form @submit.prevent="submitForm" class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Wochentag</label>
          <select v-model="form.dayOfWeek" class="form-select" required>
            <option v-for="(label, key) in weekdays" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>

        <div class="col-md-3">
          <label class="form-label">Startzeit</label>
          <TimeInput v-model="form.startTime" required />
        </div>

        <div class="col-md-3">
          <label class="form-label">Endzeit</label>
          <TimeInput v-model="form.endTime" required />
        </div>

        <div class="col-md-2 d-flex align-items-end">
          <div class="form-check">
            <input v-model="form.allDays" class="form-check-input" type="checkbox" id="allDaysCheck" :disabled="isEditing" />
            <label class="form-check-label" for="allDaysCheck">Für alle Wochentage</label>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TimeInput from '~/components/TimeInput.vue'

const weekdays = {
  MONDAY: 'Montag',
  TUESDAY: 'Dienstag',
  WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag',
  FRIDAY: 'Freitag',
  SATURDAY: 'Samstag',
  SUNDAY: 'Sonntag',
}

const { data: blocks, refresh } = await useFetch('http://localhost:8080/blocks')
const { data: periods } = await useFetch('http://localhost:8080/periods')

const selectedPeriodId = ref(null)

const filteredBlocks = computed(() => blocks.value.filter(b => b.periodId === selectedPeriodId.value))

const form = ref({
  dayOfWeek: 'MONDAY',
  startTime: '',
  endTime: '',
  allDays: false,
})

const isEditing = ref(false)
const editingId = ref(null)
const successMessage = ref('')
const submitError = ref('')

const dayOfWeekLabel = key => weekdays[key] || key

const startEdit = (block) => {
  form.value = {
    dayOfWeek: block.dayOfWeek,
    startTime: block.startTime,
    endTime: block.endTime,
    allDays: false,
  }
  editingId.value = block.id
  isEditing.value = true
  successMessage.value = ''
  submitError.value = ''
}

const cancelEdit = () => {
  resetForm()
}

const resetForm = () => {
  form.value = {
    dayOfWeek: 'MONDAY',
    startTime: '',
    endTime: '',
    allDays: false,
  }
  isEditing.value = false
  editingId.value = null
}

const isValidTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)

const submitForm = async () => {
  successMessage.value = ''
  submitError.value = ''

  if (!selectedPeriodId.value) {
    submitError.value = 'Bitte wähle eine Phase aus.'
    return
  }

  if (!form.value.dayOfWeek) {
    submitError.value = 'Bitte einen Wochentag auswählen.'
    return
  }

  if (!isValidTime(form.value.startTime)) {
    submitError.value = 'Startzeit ist ungültig oder fehlt (Format HH:mm).'
    return
  }

  if (!isValidTime(form.value.endTime)) {
    submitError.value = 'Endzeit ist ungültig oder fehlt (Format HH:mm).'
    return
  }

  if (form.value.startTime >= form.value.endTime) {
    submitError.value = 'Die Startzeit muss vor der Endzeit liegen.'
    return
  }

  const payload = {
    id: isEditing.value ? editingId.value : undefined,
    periodId: selectedPeriodId.value,
    dayOfWeek: form.value.dayOfWeek,
    startTime: form.value.startTime,
    endTime: form.value.endTime,
  }

  if (!isEditing.value && form.value.allDays) {
    payload.applyToAllDays = true
  }

  if (!isEditing.value) {
    delete payload.id
  }

  try {
    if (isEditing.value) {
      await useFetch(`http://localhost:8080/blocks/${editingId.value}`, {
        method: 'PUT',
        body: payload,
      })
      successMessage.value = 'Block aktualisiert.'
      await refresh()
    } else {
      await useFetch('http://localhost:8080/blocks', {
        method: 'POST',
        body: payload,
      })
      successMessage.value = form.value.allDays ? 'Blöcke für alle Wochentage erstellt.' : 'Block angelegt.'
      await refresh()
    }

    resetForm()
  } catch (e) {
    submitError.value = e?.data?.message || 'Fehler beim Speichern.'
  }
}

const deleteBlock = async (block) => {
  if (confirm(`Block am ${dayOfWeekLabel(block.dayOfWeek)} wirklich löschen?`)) {
    try {
      await useFetch(`http://localhost:8080/blocks/${block.id}`, {
        method: 'DELETE',
      })
      successMessage.value = 'Block gelöscht.'
      await refresh()
    } catch (e) {
      submitError.value = e?.data?.message || 'Fehler beim Löschen.'
    }
  }
}
</script>
