<template>
  <div>
    <!-- Skeleton -->
    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 5" :key="i" class="h-12 w-full rounded-md" />
    </div>

    <!-- Empty state -->
    <div v-else-if="relocations.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-sm font-medium text-zinc-700">No relocations yet</p>
      <p class="text-sm text-zinc-400 mt-1">Create your first relocation order to get started.</p>
    </div>

    <!-- Table -->
    <div v-else class="rounded-lg border border-zinc-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-zinc-50 hover:bg-zinc-50">
            <TableHead class="w-28 text-xs font-medium text-zinc-500 uppercase tracking-wide">ID</TableHead>
            <TableHead class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Origin</TableHead>
            <TableHead class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Destination</TableHead>
            <TableHead class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Date</TableHead>
            <TableHead class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</TableHead>
            <TableHead class="w-16 text-xs font-medium text-zinc-500 uppercase tracking-wide">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="relocation in relocations"
            :key="relocation.id"
            class="hover:bg-zinc-50/50 transition-colors"
          >
            <TableCell class="font-mono text-xs text-zinc-400">
              {{ relocation.id.slice(0, 8) }}…
            </TableCell>
            <TableCell class="font-medium text-zinc-800">{{ relocation.origin }}</TableCell>
            <TableCell class="text-zinc-600">{{ relocation.destination }}</TableCell>
            <TableCell class="text-zinc-600">{{ formatDate(relocation.date) }}</TableCell>
            <TableCell>
              <StatusBadge :status="relocation.status" />
            </TableCell>
            <TableCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <span>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8"
                        :disabled="isTerminal(relocation.status)"
                        @click="$emit('edit', relocation)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent v-if="isTerminal(relocation.status)">
                    <p>Cannot edit {{ relocation.status.toLowerCase() }} relocations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Relocation, RelocationStatus } from '@flovi/types'
import { TERMINAL_STATUSES } from '@flovi/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import StatusBadge from './StatusBadge.vue'

defineProps<{
  relocations: Relocation[]
  loading: boolean
}>()

defineEmits<{
  edit: [relocation: Relocation]
}>()

function isTerminal(status: RelocationStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}
</script>
