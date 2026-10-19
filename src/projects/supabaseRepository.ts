import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { ProjectCreateInput, ProjectDocument, ProjectRecord, ProjectRepository, ProjectSummary, ProjectView, RevisionEvent } from './types'
import { ProjectAuthRequiredError, ProjectConflictError, ProjectNotFoundError } from './types'

type ProjectRow = {
  id: string
  slug: string
  name: string
  draft_document: ProjectDocument
  published_document: ProjectDocument
  revision: number
  published_revision: number
  updated_at: string
}

const fromRow = (row: ProjectRow, access: ProjectRecord['access'] = 'editor'): ProjectRecord => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  draft: row.draft_document,
  published: row.published_document,
  revision: Number(row.revision),
  publishedRevision: Number(row.published_revision),
  updatedAt: row.updated_at,
  access,
})

export class SupabaseProjectRepository implements ProjectRepository {
  readonly kind = 'supabase' as const
  readonly requiresAuth = true
  private client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }

  async currentUserEmail() {
    const { data } = await this.client.auth.getUser()
    return data.user?.email ?? null
  }

  onAuthStateChange(listener: () => void) {
    const { data } = this.client.auth.onAuthStateChange(() => listener())
    return () => data.subscription.unsubscribe()
  }

  async requestMagicLink(email: string, redirectTo: string) {
    const { error } = await this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    if (error) throw error
  }

  async signOut() {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }

  private async claimInvitations() {
    const { error } = await this.client.rpc('claim_project_invitations')
    if (error) throw error
  }

  async list(): Promise<ProjectSummary[]> {
    if (!await this.currentUserEmail()) throw new ProjectAuthRequiredError()
    await this.claimInvitations()
    const { data, error } = await this.client.from('projects').select('id, slug, name, revision, published_revision, updated_at').order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      revision: Number(row.revision),
      publishedRevision: Number(row.published_revision),
      updatedAt: row.updated_at,
    }))
  }

  async load(slug: string, view: ProjectView): Promise<ProjectRecord> {
    if (view === 'presentation') {
      if (!await this.currentUserEmail()) throw new ProjectAuthRequiredError()
      await this.claimInvitations()
      const { data, error } = await this.client.from('project_publications').select('*').eq('slug', slug).maybeSingle()
      if (error) throw error
      if (!data) throw new ProjectNotFoundError(slug)
      return {
        id: data.project_id,
        slug: data.slug,
        name: data.name,
        draft: data.document,
        published: data.document,
        revision: Number(data.revision),
        publishedRevision: Number(data.revision),
        updatedAt: data.published_at,
        access: 'viewer',
      }
    }
    if (!await this.currentUserEmail()) throw new ProjectAuthRequiredError()
    await this.claimInvitations()
    const { data, error } = await this.client.from('projects').select('*').eq('slug', slug).maybeSingle()
    if (error) throw error
    if (!data) throw new ProjectNotFoundError(slug)
    const { data: membership, error: membershipError } = await this.client.from('project_members').select('role').eq('project_id', data.id).maybeSingle()
    if (membershipError) throw membershipError
    return fromRow(data as ProjectRow, (membership?.role ?? 'viewer') as ProjectRecord['access'])
  }

  async create(input: ProjectCreateInput): Promise<ProjectRecord> {
    if (!await this.currentUserEmail()) throw new ProjectAuthRequiredError()
    const { data, error } = await this.client.rpc('create_project', {
      p_name: input.name,
      p_slug: input.slug,
      p_document: input.document,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    if (!row) throw new Error('No se pudo crear el proyecto')
    return fromRow(row as ProjectRow, 'owner')
  }

  async invite(projectId: string, email: string, role: 'editor' | 'viewer' = 'editor') {
    const { error } = await this.client.rpc('invite_project_member', {
      p_project_id: projectId,
      p_email: email.trim().toLowerCase(),
      p_role: role,
    })
    if (error) throw error
  }

  async saveDraft(projectId: string, expectedRevision: number, document: ProjectDocument): Promise<RevisionEvent> {
    const { data, error } = await this.client.rpc('save_project_draft', {
      p_project_id: projectId,
      p_expected_revision: expectedRevision,
      p_document: document,
    })
    if (error) throw error
    const result = Array.isArray(data) ? data[0] : data
    if (!result) throw new ProjectConflictError()
    return { revision: Number(result.new_revision), document, updatedAt: result.saved_at }
  }

  async publish(projectId: string, expectedRevision: number) {
    const { data, error } = await this.client.rpc('publish_project', {
      p_project_id: projectId,
      p_expected_revision: expectedRevision,
    })
    if (error) throw error
    const result = Array.isArray(data) ? data[0] : data
    if (!result) throw new ProjectConflictError()
    return { publishedRevision: Number(result.published_revision), publishedAt: result.published_at }
  }

  subscribe(projectId: string, listener: (event: RevisionEvent) => void) {
    const channel: RealtimeChannel = this.client.channel(`project:${projectId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, (payload) => {
        const row = payload.new as ProjectRow
        listener({ revision: Number(row.revision), document: row.draft_document, updatedAt: row.updated_at })
      }).subscribe()
    return () => { void this.client.removeChannel(channel) }
  }
}
