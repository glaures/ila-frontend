import { usePinia } from '#imports'

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()

    const authFetch = $fetch.create({
        baseURL: config.public.apiBase,
        credentials: config.public.apiWithCredentials ? 'include' : 'omit',
        onRequest({options}) {
            const token = localStorage.getItem('jwt')
            // Stelle sicher, dass headers ein Objekt ist
            if (token) {
                options.headers = {
                    ...options.headers,
                    Authorization: `Bearer ${token}`,
                }
            }
        },

        onResponseError({response}) {
            console.error("Fehler im authFetch: " + response)
            const errorStore = useErrorStore(usePinia())
            if (response.status === 401) {
                localStorage.removeItem('jwt')
                window.location.href = '/'
                errorStore.show('Du musst Dich erneut einloggen, da es ein Problem mit Deiner Anmeldung gab.')
            } else {
                const body = (response as any)._data
                errorStore.show(body.message)
            }
        }
    })

    nuxtApp.provide('authFetch', authFetch)
})
