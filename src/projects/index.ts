import { LocalProjectRepository } from './localRepository'
import { SupabaseProjectRepository } from './supabaseRepository'
import type { ProjectRepository } from './types'

export * from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const automaticAuth = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_EMAIL && import.meta.env.VITE_DEV_AUTH_PASSWORD
  ? { email: import.meta.env.VITE_DEV_AUTH_EMAIL, password: import.meta.env.VITE_DEV_AUTH_PASSWORD }
  : undefined

export const projectRepository: ProjectRepository = supabaseUrl && supabasePublishableKey
  ? new SupabaseProjectRepository(supabaseUrl, supabasePublishableKey, automaticAuth)
  : new LocalProjectRepository()
