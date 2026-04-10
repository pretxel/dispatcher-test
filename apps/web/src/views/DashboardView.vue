<template>
  <div class="min-h-screen bg-zinc-50">
    <AppNavbar />

    <main class="pt-14">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Page header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-xl font-semibold text-zinc-900">Relocations</h1>
            <p class="text-sm text-zinc-500 mt-0.5">
              {{ store.relocations.length }} order{{ store.relocations.length !== 1 ? 's' : '' }} total
            </p>
          </div>
          <Button @click="openCreateSheet">
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Relocation
          </Button>
        </div>

        <!-- Error banner -->
        <div v-if="store.error" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {{ store.error }}
        </div>

        <!-- Table -->
        <RelocationTable
          :relocations="store.relocations"
          :loading="store.loading"
          @edit="openEditSheet"
        />
      </div>
    </main>

    <!-- Create Sheet -->
    <RelocationSheet
      v-model:open="createSheetOpen"
      mode="create"
      @saved="store.fetchAll"
    />

    <!-- Edit Sheet -->
    <RelocationSheet
      v-if="selectedRelocation"
      v-model:open="editSheetOpen"
      mode="edit"
      :relocation="selectedRelocation"
      @saved="store.fetchAll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Relocation } from '@flovi/types'
import { useRelocationsStore } from '@/stores/relocationsStore'
import { Button } from '@/components/ui/button'
import AppNavbar from '@/components/AppNavbar.vue'
import RelocationTable from '@/components/RelocationTable.vue'
import RelocationSheet from '@/components/RelocationSheet.vue'

const store = useRelocationsStore()

const createSheetOpen = ref(false)
const editSheetOpen = ref(false)
const selectedRelocation = ref<Relocation | undefined>()

onMounted(() => store.fetchAll())

function openCreateSheet() {
  createSheetOpen.value = true
}

function openEditSheet(relocation: Relocation) {
  selectedRelocation.value = relocation
  editSheetOpen.value = true
}
</script>
