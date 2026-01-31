<script setup lang="ts">
import { useRoute } from 'vue-router'
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
    const { token, user, roles } = await $fetch(config.public.apiBase + '/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { code, redirectUri }
    })
    localStorage.setItem('jwt', token)
    userStore.setUsername(user.preferred_username)
    userStore.setName(user.name)
    userStore.setRoles(roles)

    // Redirect basierend auf Rolle
    if (roles.includes('ADMIN')) {
      await navigateTo('/admin')
    } else if (roles.includes('COURSE_INSTRUCTOR')) {
      await navigateTo('/instructor/attendance')
    } else if (roles.includes('STUDENT')) {
      // Für Studenten: Prüfen, ob Wechselrunde aktiv ist
      await redirectStudent(config.public.apiBase, token)
    } else {
      await navigateTo('/preferences')
    }
  } catch (err: any) {
    errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
    await navigateTo('/')
  }
}

/**
 * Prüft ob die Wechselrunde aktiv ist und leitet entsprechend weiter
 */
async function redirectStudent(apiBase: string, token: string) {
  try {
    // Aktuelle Periode laden
    const periods = await $fetch(apiBase + '/periods', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const currentPeriod = (periods as any[]).find((p) => p.current)

    if (currentPeriod) {
      // Exchange-Phase-Status laden
      const exchangePhase = await $fetch(
          `${apiBase}/periods/${currentPeriod.id}/exchange-phase`,
          { headers: { Authorization: `Bearer ${token}` } }
      ) as { active?: boolean }

      if (exchangePhase?.active) {
        await navigateTo('/wechselrunde')
        return
      }
    }
  } catch (err) {
    // Bei Fehler einfach zu preferences weiterleiten
    console.warn('Konnte Wechselrunden-Status nicht prüfen:', err)
  }

  // Fallback: zu preferences weiterleiten
  await navigateTo('/preferences')
}
</script>

<template>
  <div class="container py-5 text-center">
    <div class="spinner-border text-primary mb-3" role="status">
      <span class="visually-hidden">Laden...</span>
    </div>
    <p>Authentifiziere dich…</p>
  </div>
</template>