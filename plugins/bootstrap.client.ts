import * as bootstrap from 'bootstrap'

// Typisiertes Plugin für Nuxt 3
export default defineNuxtPlugin(() => {
    if (typeof window !== 'undefined') {
        // @ts-ignore – Bootstrap hat kein offizielles Global-API-Typing
        window.bootstrap = bootstrap
    }
})
