export default defineNuxtPlugin(() => {
    const authFetch = $fetch.create({
        onRequest({ options }) {
            const token = localStorage.getItem('jwt')
            if (token) {
                options.headers = {
                    ...options.headers,
                    Authorization: `Bearer ${token}`,
                }
            }
        },

        async onResponseError({ response }) {
            if (response.status === 401) {
                console.warn('Token ungültig oder abgelaufen – redirect zur Startseite')

                // Token entfernen
                localStorage.removeItem('jwt')

                // Weiterleitung zur Startseite
                window.location.href = '/'
            }
        }
    })

    // globale fetch-Instanz überschreiben
    globalThis.$fetch = authFetch
})
