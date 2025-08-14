<script setup lang="ts">
definePageMeta({ authDisabled: true }) // <-- Middleware überspringt diese Seite
const { login } = useLoginRedirect()
</script>

<template>
  <main class="mx-auto max-w-xl p-6">
    <h1 class="text-2xl font-semibold mb-4">Willkommen 👋</h1>
    <p class="mb-6">
      Diese Startseite ist immer ohne Login erreichbar.
    </p>
    <button class="px-4 py-2 rounded bg-black text-white" @click="login('/')">
      Jetzt anmelden
    </button>
  </main>
</template>
