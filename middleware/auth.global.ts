export default defineNuxtRouteMiddleware((to, from) => {
    if (to.path === '/auth-redirect') {
        return
    }
    if (process.client) {
        const token = localStorage.getItem('jwt')

        if(token)
            return

        const config = useRuntimeConfig()
        const baseUrl = config.public.baseUrl.replace(/\/$/, '') // ohne trailing slash
        const redirectPath = config.public.oauth.redirectPath || '/auth-redirect'
        const redirectUri = `${baseUrl}${redirectPath}`

        // Optional: returnTo + state (empfohlen)
        const returnTo = encodeURIComponent(to.fullPath)
        const state = crypto.getRandomValues(new Uint32Array(4)).join('-')
        sessionStorage.setItem('oauth_state', state)

        const authUrl = new URL(config.public.oauth.authUrl || 'https://jmoosdorf.de/iserv/oauth/v2/auth')
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('client_id', config.public.oauth.clientId || 'DEIN_CLIENT_ID')
        authUrl.searchParams.set('redirect_uri', redirectUri)
        authUrl.searchParams.set('scope', 'openid profile email')
        authUrl.searchParams.set('state', `${state}|${returnTo}`)
        return navigateTo(authUrl.toString(), { external: true })

    }
})
