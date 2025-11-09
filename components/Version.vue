<template>
  <span>v{{ versionData.major}}.{{ versionData.minor }}.{{ versionData.build }}</span>
</template>
<script setup lang="ts">
import versionData from '~/version.json'
</script>