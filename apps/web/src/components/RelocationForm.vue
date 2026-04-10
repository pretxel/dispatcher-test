<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <!-- Origin -->
    <div class="space-y-1.5">
      <Label for="origin">Origin <span class="text-red-500">*</span></Label>
      <Input
        id="origin"
        v-model="origin"
        placeholder="e.g. Madrid"
        :class="{ 'border-red-400': errors.origin }"
      />
      <p v-if="errors.origin" class="text-xs text-red-500">{{ errors.origin }}</p>
    </div>

    <!-- Destination -->
    <div class="space-y-1.5">
      <Label for="destination">Destination <span class="text-red-500">*</span></Label>
      <Input
        id="destination"
        v-model="destination"
        placeholder="e.g. Barcelona"
        :class="{ 'border-red-400': errors.destination }"
      />
      <p v-if="errors.destination" class="text-xs text-red-500">{{ errors.destination }}</p>
    </div>

    <!-- Execution Date -->
    <div class="space-y-1.5">
      <Label>Execution Date <span class="text-red-500">*</span></Label>
      <Popover>
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            :class="['w-full justify-start text-left font-normal', !dateValue && 'text-muted-foreground', errors.date && 'border-red-400']"
          >
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ dateValue ? formatDate(dateValue) : 'Pick a date' }}
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <Calendar
            v-model="dateValue"
            :min-value="todayDate"
            initial-focus
          />
        </PopoverContent>
      </Popover>
      <p v-if="errors.date" class="text-xs text-red-500">{{ errors.date }}</p>
    </div>

    <!-- Notes -->
    <div class="space-y-1.5">
      <Label for="notes">Notes <span class="text-zinc-400 text-xs font-normal">(optional)</span></Label>
      <Textarea
        id="notes"
        v-model="notes"
        placeholder="Additional instructions..."
        rows="3"
        maxlength="500"
        :class="{ 'border-red-400': errors.notes }"
      />
      <div class="flex justify-between items-center">
        <p v-if="errors.notes" class="text-xs text-red-500">{{ errors.notes }}</p>
        <p class="text-xs text-zinc-400 ml-auto">{{ notes?.length ?? 0 }}/500</p>
      </div>
    </div>

    <!-- Status (edit mode only) -->
    <div v-if="mode === 'edit'" class="space-y-1.5">
      <Label for="status">Status</Label>
      <Select v-model="status" :disabled="isTerminalStatus">
        <SelectTrigger :class="{ 'opacity-50 cursor-not-allowed': isTerminalStatus }">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in ALL_STATUSES" :key="s" :value="s">
            {{ statusLabel(s) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="isTerminalStatus" class="text-xs text-zinc-400">Status cannot be changed for completed or cancelled relocations.</p>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-2">
      <Button type="submit" class="flex-1" :disabled="submitting">
        <svg v-if="submitting" class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ submitting ? 'Saving...' : mode === 'create' ? 'Create Relocation' : 'Save Changes' }}
      </Button>
      <Button type="button" variant="outline" @click="$emit('cancel')">Cancel</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import { today, getLocalTimeZone, CalendarDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { Relocation, RelocationStatus } from '@flovi/types'
import { TERMINAL_STATUSES, ALL_STATUSES } from '@flovi/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

const props = defineProps<{
  mode: 'create' | 'edit'
  initial?: Relocation
  submitting: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { origin: string; destination: string; date: string; notes?: string; status?: RelocationStatus }]
  cancel: []
}>()

const origin = ref(props.initial?.origin ?? '')
const destination = ref(props.initial?.destination ?? '')

function jsDateToCalendarDate(d: Date): CalendarDate {
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

const dateValue = ref<DateValue | undefined>(
  props.initial?.date ? jsDateToCalendarDate(new Date(props.initial.date)) : undefined
)
const notes = ref(props.initial?.notes ?? '')
const status = ref<RelocationStatus>(props.initial?.status ?? 'PENDING')
const errors = ref<Record<string, string>>({})

const todayDate = computed(() => today(getLocalTimeZone()))

const isTerminalStatus = computed(() =>
  props.mode === 'edit' && TERMINAL_STATUSES.includes(props.initial?.status ?? 'PENDING')
)

const formSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  date: z.date({ required_error: 'Execution date is required' }).refine(
    (d) => d > new Date(),
    'Date must be in the future'
  ),
  notes: z.string().max(500, 'Maximum 500 characters').optional(),
})

function formatDate(date: DateValue): string {
  const jsDate = new Date(date.year, date.month - 1, date.day)
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(jsDate)
}

function statusLabel(s: RelocationStatus): string {
  const labels: Record<RelocationStatus, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }
  return labels[s]
}

function onSubmit() {
  errors.value = {}

  let jsDate: Date | undefined
  if (dateValue.value) {
    jsDate = new Date(dateValue.value.year, dateValue.value.month - 1, dateValue.value.day)
    // Set to noon to avoid timezone boundary issues
    jsDate.setHours(12, 0, 0, 0)
  }

  const result = formSchema.safeParse({
    origin: origin.value,
    destination: destination.value,
    date: jsDate,
    notes: notes.value || undefined,
  })

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      errors.value[issue.path[0] as string] = issue.message
    })
    return
  }

  emit('submit', {
    origin: result.data.origin,
    destination: result.data.destination,
    date: result.data.date.toISOString(),
    notes: result.data.notes,
    ...(props.mode === 'edit' ? { status: status.value } : {}),
  })
}
</script>
