// composables/useAssignment.ts
import type { AssignmentResult } from '~/types/assignment'

export const useAssignment = () => {
    const { $authFetch } = useNuxtApp()
    const errorStore = useErrorStore()
    const toastStore = useToastStore()

    const isAssigning = ref(false)
    const assignmentResult = ref<AssignmentResult | null>(null)

    const assignCourses = async (periodId: number): Promise<AssignmentResult | null> => {
        isAssigning.value = true
        assignmentResult.value = null

        try {
            const result = await $authFetch<AssignmentResult>(
                `/periods/${periodId}/assign-courses`,
                {
                    method: 'POST'
                }
            )

            assignmentResult.value = result
            toastStore.success('Kurszuweisung erfolgreich abgeschlossen!')
            return result
        } catch (err: any) {
            console.error('Fehler bei der Kurszuweisung:', err)
            errorStore.show(err?.data?.message ?? 'Fehler bei der Kurszuweisung: ' + err)
            return null
        } finally {
            isAssigning.value = false
        }
    }

    return {
        isAssigning,
        assignmentResult,
        assignCourses
    }
}