<template>
  <div class="card">
    <div class="card-body p-3">

      <!-- Zeile 1: "bearbeitete Blöcke" + Progressbar -->
      <div class="d-flex align-items-center gap-2">
        <span class="small text-nowrap">bearbeitete Blöcke</span>
        <div class="flex-grow-1">
          <div class="progress" :aria-label="'bearbeitete Blöcke: ' + progressPct + '%'">
            <div
                class="progress-bar"
                role="progressbar"
                :style="{ width: progressPct + '%' }"
                :aria-valuenow="progressPct"
                aria-valuemin="0"
                aria-valuemax="100"
            />
          </div>
        </div>
      </div>

      <!-- Zeile 2: "gewählte Kategorien" + Boxen + Check/X -->
      <div class="d-flex align-items-center justify-content-between mt-2">
        <div class="d-flex align-items-center flex-wrap gap-1">
          <span class="small text-nowrap me-2">präferierte Kategorien</span>
          <template v-for="(code, idx) in status.categories" :key="code + '-' + idx">
            <span
                class="badge rounded-pill"
                :style="{
                backgroundColor: getCategoryInfo(code).color,
                color: getCategoryInfo(code).textColor,
                fontSize: '0.7rem'
              }"
            >
              {{ code }}
            </span>
          </template>
        </div>
        <StatusIcon :ok="status.isCategoryDistributionOk" />
      </div>

      <!-- Zeile 3: Gesamthinweis readyToSubmit -->
      <div
          class="d-flex align-items-center gap-1 mt-2 small"
          :class="status.readyToSubmit ? 'text-success' : 'text-danger'"
      >
        <StatusIcon :ok="status.readyToSubmit" />
        <span>{{ status.readyToSubmit ? 'Bereit zur Abgabe' : 'Noch nicht abgabefertig' }}</span>
      </div>

      <div class="text-warning small">
        <template v-for="(advice, idx) in status.advices" :key="advice + '-' + idx">
          <div>
            {{ advice }}
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { getCategoryInfo } from '~/utils/categories'

const props = defineProps<{
  status: {
    progress: number
    categories: string[]   // einfache Liste der gewählten Kategorien
    isCategoryDistributionOk: boolean
    readyToSubmit: boolean
    advices: string[]
  }
}>()

const progressPct = computed(() =>
    Math.round(Math.min(Math.max(props.status.progress ?? 0, 0), 1) * 100)
)

/** kleines Icon-Subcomponent (grün/rot) */
const StatusIcon = defineComponent({
  props: { ok: { type: Boolean, required: true } },
  setup(p) {
    return () =>
        h(
            'span',
            { class: p.ok ? 'text-success' : 'text-danger', 'aria-hidden': 'true' },
            [
              p.ok
                  ? h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'currentColor' }, [
                    h('path', { d: 'M9 16.2l-3.5-3.5-1.4 1.4L9 19 20.3 7.7l-1.4-1.4z' })
                  ])
                  : h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'currentColor' }, [
                    h('path', { d: 'M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z' })
                  ])
            ]
        )
  }
})
</script>
