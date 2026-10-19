import { LocalProjectRepository } from './localRepository'
import { SupabaseProjectRepository } from './supabaseRepository'
import type { ProjectRepository } from './types'

export * from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const projectRepository: ProjectRepository = supabaseUrl && supabasePublishableKey
  ? new SupabaseProjectRepository(supabaseUrl, supabasePublishableKey)
  : new LocalProjectRepository()
