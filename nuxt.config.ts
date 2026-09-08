// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-11-01',
    devtools: {enabled: true},

    modules: [
        '@nuxt/eslint',
        '@nuxt/fonts',
        '@nuxt/icon',
        '@nuxt/image',
        '@nuxt/scripts',
        '@pinia/nuxt',
        'pinia-plugin-persistedstate/nuxt'
    ],

    plugins: ['~/plugins/bootstrap.client.ts'],
    css: ['bootstrap/dist/css/bootstrap.min.css',
        'bootstrap-icons/font/bootstrap-icons.css',
        '~/assets/styles/theme.css'],
    ssr: false,
    app: {
        baseURL: process.env.NUXT_BASE_URL || '/' // Fallback auf /
    },
    nitro: {
        preset: "gh-pages"
        // 200.html/404.html werden von Nitro beim `nuxt generate` automatisch
        // vorgerendert (SPA-Fallback), siehe Prerender-Log.
    },
    // Der Dev-Server löscht beim (Neu-)Start sein Nitro-Output-Verzeichnis.
    // Ohne diese Umleitung wäre das `.output` – ein laufender `npm run dev`
    // räumt dann mitten im `npm run deploy` das fertige Build-Ergebnis weg.
    $development: {
        nitro: {
            output: {
                dir: '.nuxt/dev-output'
            }
        }
    },
    runtimeConfig: {
        public: {
            baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
            apiBase: process.env.NUXT_PUBLIC_API_BASE,
            apiWithCredentials: process.env.NUXT_PUBLIC_API_WITH_CREDENTIALS === 'true',
            oauth: {
                authUrl: process.env.NUXT_PUBLIC_OAUTH_AUTH_URL,
                clientId: process.env.NUXT_PUBLIC_OAUTH_CLIENT_ID,
                redirectPath: process.env.NUXT_PUBLIC_OAUTH_REDIRECT_PATH
            }
        }
    },

    vite: {
        build: {
            sourcemap: true
        }
    }

})