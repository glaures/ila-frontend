// types/courseImport.ts
// Antworttypen des Excel-Imports (Backend-Package sandbox27.ila.backend.imports)

export type CourseImportAction = 'CREATE' | 'UPDATE' | 'SKIP'

export type ImportIssueSeverity = 'ERROR' | 'WARNING'

export interface ImportIssue {
    severity: ImportIssueSeverity
    field: string
    message: string
}

export interface CourseImportRow {
    rowNumber: number
    courseId: string
    name: string
    description: string
    categories: string[]
    grades: number[]          // VK wird als 99 abgebildet
    maxAttendees: number | null
    room: string
    weekday: string           // wie im Excel ("Montag")
    timeSlot: string          // wie im Excel ("11:20:00")
    instructorFirstName: string
    instructorLastName: string
    instructorUserName: string | null
    action: CourseImportAction
    issues: ImportIssue[]
}

export interface MissingInstructor {
    firstName: string
    lastName: string
    courseIds: string[]
}

export interface CourseImportReport {
    fileName: string | null
    sheetName: string | null
    periodId: number
    periodName: string

    totalRows: number
    importableRows: number
    skippedRows: number
    errorCount: number
    warningCount: number

    importable: boolean
    committed: boolean
    createdCount: number
    updatedCount: number

    rows: CourseImportRow[]
    missingInstructors: MissingInstructor[]
    globalIssues: ImportIssue[]
}

/** Feldnamen aus den Issues für die Anzeige übersetzen */
const issueFieldLabels: Record<string, string> = {
    courseId: 'Kurs-ID',
    name: 'Name',
    description: 'Beschreibung',
    categories: 'Kategorien',
    grades: 'Jahrgänge',
    maxAttendees: 'Max. Teilnehmer',
    room: 'Raum',
    block: 'Block',
    weekday: 'Wochentag',
    timeSlot: 'Zeitschiene',
    instructor: 'Kursleiter',
    file: 'Datei',
    sheet: 'Datenblatt'
}

export function issueFieldLabel(field: string): string {
    return issueFieldLabels[field] ?? field
}

/** Jahrgänge formatieren – 99 steht für die Vorklasse (VK) */
export function formatGrades(grades: number[] | null | undefined): string {
    if (!grades || grades.length === 0) return '–'
    return grades.map(g => (g === 99 ? 'VK' : String(g))).join(', ')
}