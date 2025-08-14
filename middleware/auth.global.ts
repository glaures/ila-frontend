import {useLoginRedirect} from "~/composables/useLoginRedirect";

export default defineNuxtRouteMiddleware((to) => {
    // Öffentlich zulässige Seiten: Start + OAuth Callback + Seiten mit Flag
    if (to.path === '/' || to.path === '/auth-redirect' || to.meta.authDisabled === true) return

    // Reines SPA: localStorage ist verfügbar
    const token = localStorage.getItem('jwt')

    if (!token) {
        const { login } = useLoginRedirect()
        return login(to.fullPath) // keine Duplikate, gemeinsame Logik
    }
})
