<script setup>
import {useRoute} from 'vue-router'

const route = useRoute()

const code = route.query.code
if (code) {
  const config = useRuntimeConfig()
  const redirectUri = `${config.public.baseUrl.replace(/\/$/, '')}${config.public.oauth.redirectPath}`
  try {
    const {token} = await $fetch(config.public.apiBase + '/auth', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: {code, redirectUri}
    })
    localStorage.setItem('jwt', token)
    await navigateTo('/preferences')
  } catch (err) {
    // err.data enthält ggf. die Fehler-Antwort vom Backend
    console.error('Login fehlgeschlagen:', err?.data ?? err)
    await navigateTo('/') // oder Fehlerseite
  }
}
</script>

<template>
  <div class="container py-5 text-center">
    <p>Authentifiziere dich…</p>
  </div>
</template>
