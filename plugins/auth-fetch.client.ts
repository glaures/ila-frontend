export default defineNuxtPlugin((nuxtApp) => {
    const authFetch = $fetch.create({
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
