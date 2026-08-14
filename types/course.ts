// types/course.ts
// Kurs-bezogene DTOs, wie sie /courses?period-id= liefert.

export type Weekday =
    'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface BlockDto {
    id: number
    periodId: number
    dayOfWeek: Weekday
    startTime: string
    endTime: string
    applyToAllDays?: boolean | null
}

export interface InstructorDto {
    userName: string
    firstName: string
    lastName: string
    email?: string
    roles?: string[]
}

export interface CourseDto {
    id?: number
    courseId: string
    name: string
    description?: string
    courseCategories: string[]
    maxAttendees: number
    minAttendees: number
    room?: string
    instructor?: InstructorDto | null
    block?: BlockDto | null
    grades: number[]          // VK wird als 99 abgebildet
    placeholder: boolean
    excludedGenders?: string[]
    manualAssignmentOnly?: boolean
}
