export default defineNuxtRouteMiddleware((to, from) => {
    if (import.meta.prerender) return
    if (to.path === '/auth-redirect' || to.path === '/') {
        return
    }
    const token = localStorage.getItem('jwt')

    if (token)
        return

    const config = useRuntimeConfig()
    const baseUrl = config.public.baseUrl.replace(/\/$/, '') // ohne trailing slash
    const redirectPath = config.public.oauth.redirectPath || '/auth-redirect'
    const redirectUri = `${baseUrl}${redirectPath}`
    const clientId = config.public.oauth.clientId

    // Optional: returnTo + state (empfohlen)
    const returnTo = encodeURIComponent(to.fullPath)
    const state = crypto.getRandomValues(new Uint32Array(4)).join('-')
    sessionStorage.setItem('oauth_state', state)

    const authUrl = new URL(config.public.oauth.authUrl || 'https://jmoosdorf.de/iserv/oauth/v2/auth')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', 'openid profile email')
    authUrl.searchParams.set('state', `${state}|${returnTo}`)
    return navigateTo(authUrl.toString(), {external: true})
})
