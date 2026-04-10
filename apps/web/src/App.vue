<template>
  <RouterView />
  <Toaster rich-colors position="top-right" />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
</script>
