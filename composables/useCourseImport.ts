// composables/useCourseImport.ts
import {computed, ref} from 'vue'
import {useNuxtApp} from '#app'
import type {CourseImportReport, CourseImportRow} from '@/types/courseImport'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // Backend-Limit: 10 MB

export type RowFilter = 'all' | 'errors' | 'warnings'

export function useCourseImport() {
    const {$authFetch} = useNuxtApp() as any

    const selectedFile = ref<File | null>(null)
    const report = ref<CourseImportReport | null>(null)
    const busy = ref(false)
    const busyMode = ref<'validate' | 'commit' | null>(null)
    const localError = ref<string | null>(null)

    // Der Report gehört immer zu genau einer (Datei, Phase)-Kombination. Da das Backend
    // zwischen validate und commit keinen State hält, muss beim Wechsel neu geprüft werden.
    const reportFileRef = ref<File | null>(null)
    const reportPeriodId = ref<number | null>(null)

    const hasReport = computed(() => report.value !== null)

    const isStale = computed(() =>
        hasReport.value && reportFileRef.value !== selectedFile.value
    )

    const canCommit = computed(() =>
        !!report.value && report.value.importable && !report.value.committed
            && !isStale.value && !busy.value
    )

    function reset() {
        selectedFile.value = null
        clearReport()
    }

    function clearReport() {
        report.value = null
        reportFileRef.value = null
        reportPeriodId.value = null
        localError.value = null
    }

    /** Datei übernehmen; gibt eine Fehlermeldung zurück, wenn sie abgelehnt wurde. */
    function setFile(file: File): string | null {
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
            return 'Bitte eine Excel-Datei im Format .xlsx auswählen.'
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            return 'Die Datei ist größer als 10 MB und kann nicht hochgeladen werden.'
        }
        selectedFile.value = file
        clearReport()
        return null
    }

    async function send(path: 'validate' | 'commit', periodId: number) {
        if (!selectedFile.value || busy.value) return

        busy.value = true
        busyMode.value = path
        localError.value = null

        const file = selectedFile.value

        try {
            const form = new FormData()
            form.append('file', file)

            // Kein Content-Type setzen – der Browser ergänzt den multipart-Boundary.
            const result = await $authFetch(
                `/imports/courses/${path}?period-id=${periodId}`,
                {method: 'POST', body: form}
            ) as CourseImportReport

            report.value = result
            reportFileRef.value = file
            reportPeriodId.value = periodId
            return result
        } catch (err: any) {
            // Das globale Fehlerbanner wird bereits vom authFetch-Plugin angezeigt;
            // hier nur die Inline-Meldung für den Import-Kontext setzen.
            localError.value = err?.data?.message
                ?? 'Die Datei konnte nicht verarbeitet werden.'
            return null
        } finally {
            busy.value = false
            busyMode.value = null
        }
    }

    const validate = (periodId: number) => send('validate', periodId)
    const commit = (periodId: number) => send('commit', periodId)

    function filterRows(rows: CourseImportRow[], filter: RowFilter): CourseImportRow[] {
        if (filter === 'errors') {
            return rows.filter(r => r.issues.some(i => i.severity === 'ERROR'))
        }
        if (filter === 'warnings') {
            return rows.filter(r => r.issues.some(i => i.severity === 'WARNING'))
        }
        return rows
    }

    return {
        selectedFile,
        report,
        busy,
        busyMode,
        localError,
        hasReport,
        isStale,
        canCommit,
        reportPeriodId,
        setFile,
        reset,
        clearReport,
        validate,
        commit,
        filterRows
    }
}
