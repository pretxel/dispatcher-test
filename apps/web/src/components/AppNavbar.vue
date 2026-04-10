<template>
  <header class="fixed top-0 inset-x-0 z-50 h-14 border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
    <div class="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
      <!-- Brand -->
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <span class="font-semibold text-zinc-900">Flovi Dispatcher</span>
      </div>

      <!-- User menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button class="flex items-center gap-2 rounded-full outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1">
            <Avatar class="h-8 w-8">
              <AvatarImage :src="user?.user_metadata?.avatar_url" />
              <AvatarFallback class="bg-zinc-200 text-zinc-700 text-xs font-medium">
                {{ initials }}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuLabel class="font-normal">
            <div class="flex flex-col space-y-1">
              <p class="text-sm font-medium leading-none">{{ user?.user_metadata?.full_name }}</p>
              <p class="text-xs leading-none text-muted-foreground">{{ user?.email }}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-red-600 cursor-pointer" @click="handleSignOut">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const authStore = useAuthStore()
const router = useRouter()
const user = computed(() => authStore.user)

const initials = computed(() => {
  const name = user.value?.user_metadata?.full_name as string | undefined
  if (!name) return '?'
  return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
})

async function handleSignOut() {
  await authStore.signOut()
  router.push({ name: 'login' })
}
</script>
