// types/period.ts

export interface Period {
    id: number
    name: string
    current: boolean
    startDate: string
    endDate: string
    visible: boolean
    createdAt?: string
}