<template>
  <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', colorClass]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RelocationStatus } from '@flovi/types'

const props = defineProps<{ status: RelocationStatus }>()

const config: Record<RelocationStatus, { label: string; class: string }> = {
  PENDING:     { label: 'Pending',     class: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' },
  IN_PROGRESS: { label: 'In Progress', class: 'bg-blue-50 text-blue-800 ring-blue-600/20' },
  COMPLETED:   { label: 'Completed',   class: 'bg-green-50 text-green-800 ring-green-600/20' },
  CANCELLED:   { label: 'Cancelled',   class: 'bg-zinc-100 text-zinc-500 ring-zinc-500/20' },
}

const colorClass = computed(() => config[props.status]?.class ?? '')
const label = computed(() => config[props.status]?.label ?? props.status)
</script>
