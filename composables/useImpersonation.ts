// composables/useImpersonation.ts
//
// "Anmelden als" (Impersonation): Ein Admin lässt sich vom Backend ein Token für
// einen anderen Nutzer ausstellen (POST /impersonate) und benutzt die App danach
// in dessen Identität. Das Admin-Token wird vorher gesichert, damit es einen
// Rückweg gibt (siehe docs/frontend-impersonation.md).

import type { Pinia } from 'pinia'
import { useUserStore } from '~/stores/user'

const ADMIN_TOKEN_KEY = 'adminToken'
const ADMIN_USER_KEY = 'adminUser'
const JWT_KEY = 'jwt'
// Die vom Admin gewählte Phase gilt nicht für die übernommene Sitzung
const PERIOD_KEY = 'admin.periodId'
/** Merker für den Hinweis nach automatischem Rückfall auf die Admin-Sitzung (überlebt den Reload) */
export const IMPERSONATION_EXPIRED_KEY = 'impersonation.expired'

interface AdminSession {
    token: string
    username: string | null
    name: string | null
    roles: string[]
    periodId: string | null
}

interface ImpersonationResponse {
    token: string
    user: {
        username?: string
        preferred_username?: string
        name?: string
        impersonatedBy?: string
    }
    roles: string[]
}

function readAdminSession(): AdminSession | null {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (!token) return null
    let stored: Partial<AdminSession> = {}
    try {
        stored = JSON.parse(localStorage.getItem(ADMIN_USER_KEY) ?? '{}')
    } catch {
        // Beschädigter Eintrag: Token reicht, der Rest wird beim Reload nachgeladen
    }
    return {
        token,
        username: stored.username ?? null,
        name: stored.name ?? null,
        roles: Array.isArray(stored.roles) ? stored.roles : [],
        periodId: stored.periodId ?? null,
    }
}

/** Verwirft eine gesicherte Admin-Sitzung (z.B. beim Abmelden). */
export function clearAdminSession() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
}

/**
 * Schreibt das gesicherte Admin-Token zurück und stellt den Admin-Store wieder her.
 * Bewusst frei von Nuxt-Kontext, damit es auch aus dem $authFetch-Fehlerhandler
 * (401 nach Ablauf des Impersonation-Tokens) aufgerufen werden kann.
 *
 * @returns true, wenn eine Admin-Sitzung wiederhergestellt wurde
 */
export function restoreAdminSession(pinia?: Pinia): boolean {
    const admin = readAdminSession()
    if (!admin) return false

    localStorage.setItem(JWT_KEY, admin.token)
    clearAdminSession()

    if (admin.periodId) {
        localStorage.setItem(PERIOD_KEY, admin.periodId)
    } else {
        localStorage.removeItem(PERIOD_KEY)
    }

    const userStore = useUserStore(pinia)
    userStore.setUser({
        username: admin.username,
        name: admin.name,
        roles: admin.roles,
        impersonatedBy: null,
    })
    return true
}

export function useImpersonation() {
    const { $authFetch } = useNuxtApp()
    const userStore = useUserStore()
    const router = useRouter()

    const impersonatedBy = computed(() => userStore.impersonatedBy)
    const isImpersonating = computed(() => !!userStore.impersonatedBy)

    /** Startseite der übernommenen Rolle – analog zum Verhalten nach einem Login */
    function homeForRoles(roles: string[]): string {
        if (roles.includes('COURSE_INSTRUCTOR')) return '/instructor/attendance'
        return '/preferences'
    }

    /**
     * Lädt die Seite komplett neu, damit keine In-Memory-Stores oder Caches der
     * vorherigen Identität übrig bleiben.
     */
    async function hardReloadTo(path: string) {
        // Persistierung des Stores (Cookie) vor dem Verlassen der Seite abwarten
        await nextTick()
        window.location.href = router.resolve(path).href
    }

    /** Übernimmt die Sitzung des angegebenen Nutzers. */
    async function impersonate(userName: string) {
        const adminToken = localStorage.getItem(JWT_KEY)
        if (!adminToken) throw new Error('Kein gültiges Token vorhanden.')

        // Erst der Request – schlägt er fehl, bleibt die Admin-Sitzung unangetastet
        const response = await $authFetch<ImpersonationResponse>('/impersonate', {
            method: 'POST',
            body: { userName },
        })

        localStorage.setItem(ADMIN_TOKEN_KEY, adminToken)
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({
            username: userStore.username,
            name: userStore.name,
            roles: userStore.roles,
            periodId: localStorage.getItem(PERIOD_KEY),
        }))

        localStorage.setItem(JWT_KEY, response.token)
        localStorage.removeItem(PERIOD_KEY)
        userStore.setUser({
            username: response.user.preferred_username ?? response.user.username ?? userName,
            name: response.user.name ?? userName,
            roles: response.roles ?? [],
            impersonatedBy: response.user.impersonatedBy ?? adminUsernameFallback(),
        })

        await hardReloadTo(homeForRoles(response.roles ?? []))
    }

    // Falls das Backend impersonatedBy einmal nicht mitliefert, ist der Banner
    // trotzdem sichtbar und der Rückweg möglich.
    function adminUsernameFallback(): string {
        return userStore.username ?? 'admin'
    }

    /** Kehrt zur gesicherten Admin-Sitzung zurück. */
    async function stopImpersonation() {
        if (!restoreAdminSession()) {
            // Kein Rückweg vorhanden: sauber ausloggen statt in fremder Identität bleiben
            localStorage.removeItem(JWT_KEY)
            userStore.clear()
            await hardReloadTo('/')
            return
        }
        await hardReloadTo('/admin')
    }

    return {
        isImpersonating,
        impersonatedBy,
        impersonate,
        stopImpersonation,
    }
}
