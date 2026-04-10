<template>
  <div class="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo / Brand -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h1 class="text-2xl font-semibold text-zinc-900">Flovi Dispatcher</h1>
        <p class="text-sm text-zinc-500 mt-1">Vehicle relocation management</p>
      </div>

      <!-- Card -->
      <Card>
        <CardContent class="pt-6">
          <div class="space-y-4">
            <div class="text-center">
              <h2 class="text-lg font-medium text-zinc-800">Sign in to continue</h2>
              <p class="text-sm text-zinc-400 mt-1">Use your Google account to access the dispatcher</p>
            </div>
            <Button
              class="w-full gap-2"
              variant="outline"
              :disabled="loading"
              @click="handleSignIn"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{{ loading ? 'Redirecting...' : 'Sign in with Google' }}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p class="text-center text-xs text-zinc-400 mt-6">
        Access is restricted to authorized dispatchers only.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const authStore = useAuthStore()
const loading = ref(false)

async function handleSignIn() {
  loading.value = true
  try {
    await authStore.signInWithGoogle()
  } finally {
    // Redirect away from page on success, reset on failure
    loading.value = false
  }
}
</script>
