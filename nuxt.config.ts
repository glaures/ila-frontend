// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-11-01',
    devtools: {enabled: true},

    modules: [
        '@nuxt/content',
        '@nuxt/eslint',
        '@nuxt/fonts',
        '@nuxt/icon',
        '@nuxt/image',
        '@nuxt/scripts'
    ],

    plugins: ['~/plugins/bootstrap.client.ts'],
    css: ['bootstrap/dist/css/bootstrap.min.css',
        'bootstrap-icons/font/bootstrap-icons.css'],
    ssr: false,
    app: {
        baseURL: process.env.NUXT_BASE_URL || '/' // Fallback auf /
    },
    nitro: {
        prerender: {
            routes: ['/']
        }
    },
    runtimeConfig: {
        public: {
            baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000',
            apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080',
            apiWithCredentials: process.env.NUXT_PUBLIC_API_WITH_CREDENTIALS === 'true',
            oauth: {
                authUrl: process.env.NUXT_PUBLIC_OAUTH_AUTH_URL || '',
                clientId: process.env.NUXT_PUBLIC_OAUTH_CLIENT_ID || '',
                redirectPath: process.env.NUXT_PUBLIC_OAUTH_REDIRECT_PATH || '/auth-redirect'
            }
        }
    }

})