// stores/toast.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'danger' | 'warning' | 'info'

export interface Toast {
    id: number
    message: string
    type: ToastType
}

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<Toast[]>([])
    let nextId = 1

    function show(message: string, type: ToastType = 'success', duration = 4000) {
        const id = nextId++
        toasts.value.push({ id, message, type })

        if (duration > 0) {
            setTimeout(() => {
                remove(id)
            }, duration)
        }
    }

    function remove(id: number) {
        const index = toasts.value.findIndex(t => t.id === id)
        if (index > -1) {
            toasts.value.splice(index, 1)
        }
    }

    // Convenience methods
    function success(message: string, duration?: number) {
        show(message, 'success', duration)
    }

    function error(message: string, duration?: number) {
        show(message, 'danger', duration)
    }

    function warning(message: string, duration?: number) {
        show(message, 'warning', duration)
    }

    function info(message: string, duration?: number) {
        show(message, 'info', duration)
    }

    return {
        toasts,
        show,
        remove,
        success,
        error,
        warning,
        info
    }
})