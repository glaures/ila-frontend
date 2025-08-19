// stores/error.ts
import { defineStore } from 'pinia'

export const useErrorStore = defineStore('error', () => {
    const errorMessage = ref('')
    const visible = ref(false)
    let timeout: ReturnType<typeof setTimeout>

    function show(message: string) {
        console.log("error store:" + message)
        errorMessage.value = message
        visible.value = true
        clearTimeout(timeout)
        timeout = setTimeout(hide, 5000) // Auto-hide after 5s
    }

    function hide() {
        visible.value = false
        errorMessage.value = ''
    }

    return { errorMessage, visible, show, hide }
})
