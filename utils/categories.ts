// utils/categories.ts
export type CategoryCode = 'iLa' | 'KuP' | 'BuE' | 'FuF' | 'SoL'

export const categoryColors: Record<CategoryCode, { color: string; textColor?: string }> = {
    iLa: { color: '#E0E0D9' },
    KuP: { color: '#F1938B' },
    BuE: { color: '#B9D3B5' },
    FuF: { color: '#FFFEA6' },
    SoL: { color: '#000000', textColor: '#FFFFFF' }
}

export const categoryLabelMap: Record<CategoryCode, string> = {
    iLa: 'iLa',
    KuP: 'Kreativität und Praxis',
    BuE: 'Bewegung und Entspannung',
    FuF: 'Fordern und Fördern',
    SoL: 'Selbstorganisiertes Lernen'
}

/** Schreibweise vereinheitlichen – das Backend liefert z. B. "SOL" statt "SoL" */
export function normalizeCategoryCode(code: string): CategoryCode | string {
    const match = categoryList.find(c => c.toLowerCase() === code?.toLowerCase())
    return match ?? code
}

/** Hilfsfunktion: alle Infos zu einer Kategorie holen */
export function getCategoryInfo(code: string) {
    const c = normalizeCategoryCode(code) as CategoryCode
    return {
        code,
        label: categoryLabelMap[c] ?? code,
        color: categoryColors[c]?.color ?? '#eee',
        textColor: categoryColors[c]?.textColor ?? '#000'
    }
}

/** Praktisch wenn du z. B. eine Liste zum Iterieren brauchst */
export const categoryList = Object.keys(categoryLabelMap) as CategoryCode[]
