// composables/useCourseExport.ts
// Zwei Exporte mit unterschiedlichem Zweck:
//  - downloadOverviewCsv: die angezeigte Liste als CSV (Doku, Weitergabe, Archiv)
//  - downloadImportTemplate: .xlsx vom Backend, Spaltenlayout des Import-Parsers
//    (siehe docs/backend-course-export.md) -> direkt wieder in /admin/kurs-import einlesbar
import {ref} from 'vue'
import {useNuxtApp} from '#app'

export interface ImportTemplateOptions {
    /** Platzhalter-Kurse aus der Vorlage weglassen */
    excludePlaceholders?: boolean
    /** Nur Kurse exportieren, die einem Block zugeordnet sind */
    onlyWithBlock?: boolean
}

/** Löst einen Browser-Download für einen bereits geladenen Blob aus. */
function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

/** Phasenname -> dateisystemtauglicher Teil eines Dateinamens. */
export function fileNameSlug(value: string): string {
    return (value || 'phase')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60)
}

/**
 * CSV für Excel: Semikolon als Trennzeichen und BOM, damit Excel (DE) die Datei
 * ohne Import-Assistent und mit korrekten Umlauten öffnet.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
    const escape = (v: string | number | null | undefined) => {
        const s = v == null ? '' : String(v)
        return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [headers.map(escape).join(';')]
    for (const row of rows) lines.push(row.map(escape).join(';'))
    return '﻿' + lines.join('\r\n')
}

export function useCourseExport() {
    const {$authFetch} = useNuxtApp() as any

    const busy = ref(false)
    const localError = ref<string | null>(null)

    function downloadOverviewCsv(
        headers: string[],
        rows: (string | number | null | undefined)[][],
        periodName: string
    ) {
        const csv = toCsv(headers, rows)
        saveBlob(
            new Blob([csv], {type: 'text/csv;charset=utf-8'}),
            `kursuebersicht-${fileNameSlug(periodName)}.csv`
        )
    }

    /**
     * Holt die Import-Vorlage als .xlsx vom Backend. Das Spaltenlayout kommt bewusst
     * vom Server, damit Export und Import nicht auseinanderlaufen.
     */
    async function downloadImportTemplate(
        periodId: number,
        periodName: string,
        options: ImportTemplateOptions = {}
    ): Promise<boolean> {
        if (busy.value) return false
        busy.value = true
        localError.value = null

        const params = new URLSearchParams({'period-id': String(periodId)})
        if (options.excludePlaceholders) params.set('exclude-placeholders', 'true')
        if (options.onlyWithBlock) params.set('only-with-block', 'true')

        try {
            const blob = await $authFetch(`/exports/courses?${params.toString()}`, {
                method: 'GET',
                responseType: 'blob'
            }) as Blob

            saveBlob(blob, `kurs-vorlage-${fileNameSlug(periodName)}.xlsx`)
            return true
        } catch (err: any) {
            // Das globale Fehlerbanner kommt bereits aus dem authFetch-Plugin;
            // hier nur die Inline-Meldung im Export-Kontext.
            const status = err?.response?.status ?? err?.statusCode
            localError.value = status === 404
                ? 'Der Export-Endpoint /exports/courses ist im Backend noch nicht verfügbar.'
                : (err?.data?.message ?? 'Die Import-Vorlage konnte nicht erzeugt werden.')
            return false
        } finally {
            busy.value = false
        }
    }

    return {busy, localError, downloadOverviewCsv, downloadImportTemplate}
}
