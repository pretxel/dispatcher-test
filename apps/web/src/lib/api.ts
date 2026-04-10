import axios from 'axios'
import { supabase } from './supabase'
import { router } from '@/router'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
})

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return config
})

// On 401 → sign out and redirect to login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut()
      router.push({ name: 'login' })
    }
    return Promise.reject(error)
  }
)
