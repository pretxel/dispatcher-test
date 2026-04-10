<template>
  <Sheet :open="open" @update:open="$emit('update:open', $event)">
    <SheetContent class="sm:max-w-md overflow-y-auto">
      <SheetHeader class="mb-6">
        <SheetTitle>{{ mode === 'create' ? 'New Relocation' : 'Edit Relocation' }}</SheetTitle>
        <SheetDescription>
          {{ mode === 'create'
            ? 'Create a new vehicle relocation order.'
            : 'Update the details of this relocation request.' }}
        </SheetDescription>
      </SheetHeader>
      <RelocationForm
        :mode="mode"
        :initial="relocation"
        :submitting="submitting"
        @submit="handleSubmit"
        @cancel="$emit('update:open', false)"
      />
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import type { Relocation, CreateRelocationDto, UpdateRelocationDto } from '@flovi/types'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useRelocationsStore } from '@/stores/relocationsStore'
import RelocationForm from './RelocationForm.vue'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  relocation?: Relocation
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const store = useRelocationsStore()
const submitting = ref(false)

async function handleSubmit(payload: CreateRelocationDto | UpdateRelocationDto) {
  submitting.value = true
  try {
    if (props.mode === 'create') {
      await store.create(payload as CreateRelocationDto)
      toast.success('Relocation created successfully')
    } else if (props.relocation) {
      await store.update(props.relocation.id, payload as UpdateRelocationDto)
      toast.success('Relocation updated successfully')
    }
    emit('update:open', false)
    emit('saved')
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? 'Something went wrong')
  } finally {
    submitting.value = false
  }
}
</script>
