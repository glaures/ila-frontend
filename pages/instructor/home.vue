<template>
  <div>
    Willkommen, {{displayName}}
  </div>
</template>

<script setup>
import {useUserStore} from "~/stores/user.js";

const userStore = useUserStore()
const displayName = computed(() => userStore.username)

</script>
