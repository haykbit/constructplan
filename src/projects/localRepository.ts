import { initialDesign, toPersistedDesign } from '../model'
import type { ProjectCreateInput, ProjectDocument, ProjectRecord, ProjectRepository, ProjectSummary, ProjectView, RevisionEvent } from './types'
import { ProjectConflictError, ProjectNotFoundError } from './types'
import { DEFAULT_TEMPLATE_ID } from '../templates'

const INDEX_KEY = 'forma:projects:index:v1'
const projectKey = (slug: string) => `forma:project:${slug}:v1`
const revisionKey = (id: string) => `forma:project:${id}:revisions:v1`

const defaultDocument = (): ProjectDocument => ({
  schemaVersion: 1,
  templateId: DEFAULT_TEMPLATE_ID,
  design: toPersistedDesign(initialDesign),
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function now() {
  return new Date().toISOString()
}

function readIndex(): string[] {
  const raw = localStorage.getItem(INDEX_KEY)
  return raw ? JSON.parse(raw) as string[] : []
}

function writeProject(record: ProjectRecord) {
  localStorage.setItem(projectKey(record.slug), JSON.stringify(record))
  const slugs = new Set(readIndex())
  slugs.add(record.slug)
  localStorage.setItem(INDEX_KEY, JSON.stringify([...slugs]))
}

function ensureSeed(): ProjectRecord {
  const raw = localStorage.getItem(projectKey('casa-gemma'))
  if (raw) {
    const stored = JSON.parse(raw) as ProjectRecord
    if (!stored.access) {
      stored.access = 'owner'
      writeProject(stored)
    }
    return stored
  }
  const document = defaultDocument()
  const record: ProjectRecord = {
    id: 'local-casa-gemma',
    slug: 'casa-gemma',
    name: 'Casa Gemma',
    draft: clone(document),
    published: clone(document),
    revision: 1,
    publishedRevision: 1,
    updatedAt: now(),
    access: 'owner',
  }
  writeProject(record)
  return record
}

function findById(id: string): ProjectRecord | null {
  for (const slug of readIndex()) {
    const raw = localStorage.getItem(projectKey(slug))
    if (!raw) continue
    const record = JSON.parse(raw) as ProjectRecord
    if (!record.access) record.access = 'owner'
    if (record.id === id) return record
  }
  return null
}

export class LocalProjectRepository implements ProjectRepository {
  readonly kind = 'local' as const
  readonly requiresAuth = false

  constructor() {
    ensureSeed()
  }

  async currentUserEmail() { return null }
  onAuthStateChange() { return () => undefined }
  async requestMagicLink() { return undefined }
  async signOut() { return undefined }

  async list(): Promise<ProjectSummary[]> {
    return readIndex().flatMap((slug) => {
      const raw = localStorage.getItem(projectKey(slug))
      if (!raw) return []
      const { id, name, revision, publishedRevision, updatedAt } = JSON.parse(raw) as ProjectRecord
      return [{ id, slug, name, revision, publishedRevision, updatedAt }]
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async load(slug: string, view: ProjectView): Promise<ProjectRecord> {
    if (slug === 'casa-gemma') ensureSeed()
    const raw = localStorage.getItem(projectKey(slug))
    if (!raw) throw new ProjectNotFoundError(slug)
    const record = JSON.parse(raw) as ProjectRecord
    if (!record.access) record.access = 'owner'
    return view === 'presentation' ? { ...record, draft: clone(record.published), revision: record.publishedRevision } : clone(record)
  }

  async create(input: ProjectCreateInput): Promise<ProjectRecord> {
    if (localStorage.getItem(projectKey(input.slug))) throw new Error('Ya existe un proyecto con esa URL')
    const record: ProjectRecord = {
      id: `local-${crypto.randomUUID()}`,
      slug: input.slug,
      name: input.name,
      draft: clone(input.document),
      published: clone(input.document),
      revision: 1,
      publishedRevision: 1,
      updatedAt: now(),
      access: 'owner',
    }
    writeProject(record)
    return clone(record)
  }

  async invite() { return undefined }

  async saveDraft(projectId: string, expectedRevision: number, document: ProjectDocument): Promise<RevisionEvent> {
    const record = findById(projectId)
    if (!record) throw new ProjectNotFoundError(projectId)
    if (record.revision !== expectedRevision) throw new ProjectConflictError()
    const updatedAt = now()
    const revision = record.revision + 1
    const next = { ...record, draft: clone(document), revision, updatedAt }
    writeProject(next)
    const history = JSON.parse(localStorage.getItem(revisionKey(projectId)) ?? '[]') as RevisionEvent[]
    localStorage.setItem(revisionKey(projectId), JSON.stringify([...history.slice(-49), { revision, document, updatedAt }]))
    return { revision, document: clone(document), updatedAt }
  }

  async publish(projectId: string, expectedRevision: number) {
    const record = findById(projectId)
    if (!record) throw new ProjectNotFoundError(projectId)
    if (record.revision !== expectedRevision) throw new ProjectConflictError()
    const publishedAt = now()
    writeProject({ ...record, published: clone(record.draft), publishedRevision: record.revision, updatedAt: publishedAt })
    return { publishedRevision: record.revision, publishedAt }
  }

  subscribe(projectId: string, listener: (event: RevisionEvent) => void) {
    const handler = (event: StorageEvent) => {
      if (!event.key?.startsWith('forma:project:') || !event.newValue) return
      const record = JSON.parse(event.newValue) as ProjectRecord
      if (record.id === projectId) listener({ revision: record.revision, document: clone(record.draft), updatedAt: record.updatedAt })
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }
}
