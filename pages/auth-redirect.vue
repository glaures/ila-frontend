<script setup>
import {useRoute} from 'vue-router'
import { useErrorStore } from '~/stores/error'
import { useUserStore } from '~/stores/user'

const route = useRoute()
const errorStore = useErrorStore()
const userStore = useUserStore()

const code = route.query.code
if (code) {
  const config = useRuntimeConfig()
  const redirectUri = `${config.public.baseUrl.replace(/\/$/, '')}${config.public.oauth.redirectPath}`
  try {
    const {token, username} = await $fetch(config.public.apiBase + '/auth', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: {code, redirectUri}
    })
    localStorage.setItem('jwt', token)
    userStore.setUsername(username)
    await navigateTo('/preferences')
  } catch (err) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
    await navigateTo('/') // oder Fehlerseite
  }
}
</script>

<template>
  <div class="container py-5 text-center">
    <p>Authentifiziere dich…</p>
  </div>
</template>
