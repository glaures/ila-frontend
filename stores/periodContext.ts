import { defineStore } from 'pinia'

export interface PeriodDto {
    id: number
    name: string
    startDate: string // "dd.MM.yyyy"
    endDate: string   // "dd.MM.yyyy"
    current?: boolean
}

const LS_KEY = 'admin.periodId'

export const usePeriodContextStore = defineStore('periodContext', {
    state: () => ({
        periods: [] as PeriodDto[],
        selectedId: null as number | null,
        loading: false,
        initialized: false,
    }),
    getters: {
        selectedPeriod(state): PeriodDto | null {
            return state.periods.find(p => p.id === state.selectedId) ?? null
        },
    },
    actions: {
        async loadPeriods($authFetch: any) {
            if (this.loading) return
            this.loading = true
            try {
                const { useErrorStore } = await import('@/stores/error')
                const errorStore = useErrorStore()

                const data = await $authFetch('/periods') as PeriodDto[]
                this.periods = Array.isArray(data) ? data : []

                // Auswahl bestimmen: 1) LocalStorage, 2) current:true, 3) erste Phase
                const saved = Number(localStorage.getItem(LS_KEY) ?? '')
                const fromLs = this.periods.find(p => p.id === saved)
                const current = this.periods.find(p => p.current)
                const first = this.periods[0]

                this.selectedId = (fromLs?.id ?? current?.id ?? first?.id ?? null)
                if (this.selectedId != null) {
                    localStorage.setItem(LS_KEY, String(this.selectedId))
                }

                this.initialized = true
            } catch (err: any) {
                // globales Fehlerbanner wird über errorStore angezeigt
                const { useErrorStore } = await import('@/stores/error')
                const errorStore = useErrorStore()
                errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
            } finally {
                this.loading = false
            }
        },

        setSelected(id: number | null) {
            this.selectedId = id
            if (id == null) {
                localStorage.removeItem(LS_KEY)
            } else {
                localStorage.setItem(LS_KEY, String(id))
            }
        },
    },
})
