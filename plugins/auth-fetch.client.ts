import { usePinia } from '#imports'
import { IMPERSONATION_EXPIRED_KEY, restoreAdminSession } from '~/composables/useImpersonation'

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()

    function absolute(path: string) {
        const base = (config.app?.baseURL ?? '/').replace(/\/$/, '')
        return `${base}${path}`
    }

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
                // Impersonation-Token läuft nach 1h ab: zurück zur Admin-Sitzung
                // statt den Admin auf den Login-Screen zu werfen.
                if (restoreAdminSession(usePinia())) {
                    // Hinweis überlebt den folgenden Reload
                    sessionStorage.setItem(IMPERSONATION_EXPIRED_KEY, '1')
                    window.location.href = absolute('/admin')
                    return
                }
                localStorage.removeItem('jwt')
                window.location.href = absolute('/')
                errorStore.show('Du musst Dich erneut einloggen, da es ein Problem mit Deiner Anmeldung gab.')
            } else {
                const body = (response as any)._data
                errorStore.show(
                    body?.message ?? `Unerwarteter Fehler (HTTP ${response.status})`
                )
            }
        }
    })

    nuxtApp.provide('authFetch', authFetch)
})
