<script setup>
import UserAvatarMenu from '~/components/UserAvatarMenu.vue'
</script>

<template>
  <header class="d-flex justify-content-between align-items-center px-4 py-2 border-bottom bg-light"
          @click="navigateTo('/preferences')">
    <img src="/images/logo_johanna_moosdorf.png" alt="Logo" height="50"/>
    <UserAvatarMenu/>
  </header>
  <main>
    <NuxtPage/>
  </main>
</template>
