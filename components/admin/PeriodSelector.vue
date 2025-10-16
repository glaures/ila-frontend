<script setup lang="ts">
import { onMounted } from 'vue'
import { useNuxtApp } from '#app'
import { storeToRefs } from 'pinia'
import { usePeriodContextStore } from '@/stores/periodContext'

const { $authFetch } = useNuxtApp() as any
const store = usePeriodContextStore()
const { periods, selectedId, loading } = storeToRefs(store)

onMounted(async () => {
  if (!store.initialized) {
    await store.loadPeriods($authFetch)
  }
})

function onChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  store.setSelected(val ? Number(val) : null)
}
</script>

<template>
  <div class="mb-3">
    <label class="form-label d-flex align-items-center gap-2" for="period-select">
      <span>Phase</span>
      <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    </label>

    <select
        id="period-select"
        class="form-select"
        :disabled="loading || periods.length === 0"
        :value="selectedId ?? ''"
        @change="onChange"
        aria-label="Phase auswählen"
    >
      <option value="" disabled>Phase auswählen</option>
      <option
          v-for="p in periods"
          :key="p.id"
          :value="p.id"
      >
        {{ p.current ? '★ ' : '' }}{{ p.name }}{{ p.current ? ' (aktuell)' : '' }}
      </option>
    </select>

    <small v-if="!loading && periods.length === 0" class="text-warning d-block mt-1">
      Keine Phasen gefunden.
    </small>
  </div>
</template>
