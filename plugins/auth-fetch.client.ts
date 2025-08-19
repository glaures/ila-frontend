
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
                localStorage.removeItem('jwt')
                window.location.href = '/'
                errorStore.show('Beim Laden der Daten ist ein Fehler aufgetreten')
            }
        }
    })

    nuxtApp.provide('authFetch', authFetch)
})
