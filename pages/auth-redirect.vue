<script setup>
import { useRouter, useRoute } from 'vue-router'

const route = useRoute()
const router = useRouter()

const code = route.query.code

if (code) {
  const redirectUri = 'http://localhost:3000/auth-redirect'
  const response = await fetch('http://localhost:8080/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  })

  if (response.ok) {
    const { token } = await response.json()
    localStorage.setItem('jwt', token)
    router.replace('/preferences') // oder Startseite
  } else {
    console.error('Login fehlgeschlagen')
  }
}
</script>

<template>
  <div class="container py-5 text-center">
    <p>Authentifiziere dich…</p>
  </div>
</template>
