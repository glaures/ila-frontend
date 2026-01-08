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
    const {token, user, roles} = await $fetch(config.public.apiBase + '/auth', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: {code, redirectUri}
    })
    localStorage.setItem('jwt', token)
    userStore.setUsername(user.preferred_username)
    userStore.setName(user.name)
    userStore.setRoles(roles)
    await navigateTo(roles.includes('ADMIN') ? '/admin' :
          roles.includes('COURSE_INSTRUCTOR') ? '/instructor/attendance' : '/preferences')
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
