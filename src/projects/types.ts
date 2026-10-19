import type { PersistedDesign } from '../model'

export type ProjectView = 'editor' | 'presentation'
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'

export type ProjectDocument = {
  schemaVersion: 1
  templateId: string
  design: PersistedDesign
}

export type ProjectRecord = {
  id: string
  slug: string
  name: string
  draft: ProjectDocument
  published: ProjectDocument
  revision: number
  publishedRevision: number
  updatedAt: string
  access: 'owner' | 'editor' | 'viewer' | 'public'
}

export type ProjectSummary = Pick<ProjectRecord, 'id' | 'slug' | 'name' | 'revision' | 'publishedRevision' | 'updatedAt'>

export type ProjectCreateInput = {
  name: string
  slug: string
  document: ProjectDocument
}

export type RevisionEvent = {
  revision: number
  document: ProjectDocument
  updatedAt: string
}

export class ProjectAuthRequiredError extends Error {
  constructor() {
    super('AUTH_REQUIRED')
    this.name = 'ProjectAuthRequiredError'
  }
}

export class ProjectNotFoundError extends Error {
  constructor(slug: string) {
    super(`No existe el proyecto ${slug}`)
    this.name = 'ProjectNotFoundError'
  }
}

export class ProjectConflictError extends Error {
  constructor() {
    super('El proyecto se ha modificado desde otra sesión')
    this.name = 'ProjectConflictError'
  }
}

export interface ProjectRepository {
  readonly kind: 'local' | 'supabase'
  readonly requiresAuth: boolean
  currentUserEmail(): Promise<string | null>
  onAuthStateChange(listener: () => void): () => void
  requestMagicLink(email: string, redirectTo: string): Promise<void>
  signOut(): Promise<void>
  list(): Promise<ProjectSummary[]>
  load(slug: string, view: ProjectView): Promise<ProjectRecord>
  create(input: ProjectCreateInput): Promise<ProjectRecord>
  invite(projectId: string, email: string, role?: 'editor' | 'viewer'): Promise<void>
  saveDraft(projectId: string, expectedRevision: number, document: ProjectDocument): Promise<RevisionEvent>
  publish(projectId: string, expectedRevision: number): Promise<{ publishedRevision: number; publishedAt: string }>
  subscribe(projectId: string, listener: (event: RevisionEvent) => void): () => void
}
