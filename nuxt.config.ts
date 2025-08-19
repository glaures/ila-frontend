import fs from 'fs';
import path from 'path';

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
    },
    hooks: {
        close: () => {
            const publicDir = path.resolve('.output/public');
            const indexFile = path.join(publicDir, 'index.html');
            const spaFile = path.join(publicDir, '200.html');

            if (fs.existsSync(indexFile)) {
                fs.copyFileSync(indexFile, spaFile);
                console.log('✅ 200.html erzeugt für SPA-Routing');
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