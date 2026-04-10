export type RelocationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export const TERMINAL_STATUSES: RelocationStatus[] = ['COMPLETED', 'CANCELLED']

export const ALL_STATUSES: RelocationStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

export interface Relocation {
  id: string
  origin: string
  destination: string
  date: string // ISO 8601
  notes?: string | null
  status: RelocationStatus
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateRelocationDto {
  origin: string
  destination: string
  date: string // ISO 8601, must be future date
  notes?: string
}

export interface UpdateRelocationDto {
  origin?: string
  destination?: string
  date?: string
  notes?: string
  status?: RelocationStatus
}
