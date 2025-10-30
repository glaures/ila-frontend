// types/assignment.ts

export interface AssignmentResult {
    totalStudents: number
    assignedStudents: number
    partiallyAssigned: number
    unassigned: number
    averagePriority: number
    priorityDistribution: Record<number, number>
    averageFairnessScore: number
    fairnessStdDeviation: number
    assignmentRate: number
}