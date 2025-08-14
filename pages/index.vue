<script setup>
import versionData from '~/version.json'


const iservLogin = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.baseUrl.replace(/\/$/, '') // ohne trailing slash
  const redirectPath = config.public.oauth.redirectPath || '/auth-redirect'
  const redirectUri = `${baseUrl}${redirectPath}`
  const clientId = config.public.oauth.clientId
  const authUrl = `https://jmoosdorf.de/iserv/oauth/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid%20profile%20email`

  console.log('import.meta.env.MODE:', import.meta.env.MODE) // sollte "development" sein
  console.log('runtime:', config.public)

  window.location.href = authUrl
}
</script>

<template>
  <div class="btn btn-primary" @click="iservLogin">IServ Login</div>
  <p>Version: 0.0.7 Build {{ versionData.build }}</p>
</template>
