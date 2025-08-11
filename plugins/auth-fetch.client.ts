
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
            if (response.status === 401) {
                console.warn('🔒 JWT ungültig oder abgelaufen – Redirect zur Startseite')
                localStorage.removeItem('jwt')
                window.location.href = '/'
            }
        }
    })

    nuxtApp.provide('authFetch', authFetch)
})
