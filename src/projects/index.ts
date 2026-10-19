import { LocalProjectRepository } from './localRepository'
import { SupabaseProjectRepository } from './supabaseRepository'
import type { ProjectDocument, ProjectRepository } from './types'
import { initialDesign, toPersistedDesign } from '../model'
import { DEFAULT_TEMPLATE_ID } from '../templates'

export * from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const projectRepository: ProjectRepository = supabaseUrl && supabaseAnonKey
  ? new SupabaseProjectRepository(supabaseUrl, supabaseAnonKey)
  : new LocalProjectRepository()

export const newProjectDocument = (): ProjectDocument => ({
  schemaVersion: 1,
  templateId: DEFAULT_TEMPLATE_ID,
  design: toPersistedDesign(initialDesign),
})

export function normaliseSlug(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
