// Rein Client-seitig, nutzt localStorage + sessionStorage
export function useLoginRedirect() {
    const config = useRuntimeConfig()

    // Annahmen/Defaults – passe bei Bedarf in runtimeConfig an
    const authBase   = config.public?.oauth?.authUrl      ?? 'https://jmoosdorf.de/iserv/oauth/v2/auth'
    const clientId   = config.public?.oauth?.clientId     ?? ''
    const redirectPath = config.public?.oauth?.redirectPath ?? '/auth-redirect'

    function login(returnTo?: string) {
        // SPA only: window ist garantiert verfügbar
        const route = useRoute()
        const target = returnTo ?? route.fullPath

        // Nach Login wieder dorthin zurück
        sessionStorage.setItem('oauth_returnTo', target)

        // CSRF/Korrelation
        const state = crypto.getRandomValues(new Uint32Array(4)).join('-')
        sessionStorage.setItem('oauth_state', state)

        const redirectUri = `${window.location.origin}${redirectPath}`

        const url = new URL(authBase)
        url.searchParams.set('response_type', 'code')
        url.searchParams.set('client_id', clientId)
        url.searchParams.set('redirect_uri', redirectUri)
        url.searchParams.set('scope', 'openid profile email')
        url.searchParams.set('state', state)

        // Externe Weiterleitung
        window.location.href = url.toString()
    }

    // Nur als Helper, falls du es woanders brauchst
    function getToken(): string | null {
        return localStorage.getItem('jwt')
    }

    return { login, getToken }
}
