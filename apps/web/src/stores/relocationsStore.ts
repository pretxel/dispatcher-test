import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { Relocation, CreateRelocationDto, UpdateRelocationDto } from '@flovi/types'

export const useRelocationsStore = defineStore('relocations', () => {
  const relocations = ref<Relocation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<Relocation[]>('/api/v1/relocations')
      relocations.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load relocations'
    } finally {
      loading.value = false
    }
  }

  async function create(dto: CreateRelocationDto): Promise<Relocation> {
    const { data } = await api.post<Relocation>('/api/v1/relocations', dto)
    relocations.value.unshift(data)
    return data
  }

  async function update(id: string, dto: UpdateRelocationDto): Promise<Relocation> {
    const { data } = await api.put<Relocation>(`/api/v1/relocations/${id}`, dto)
    const idx = relocations.value.findIndex((r) => r.id === id)
    if (idx !== -1) relocations.value[idx] = data
    return data
  }

  return { relocations, loading, error, fetchAll, create, update }
})
