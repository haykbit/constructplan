import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { hydrateDesign, initialDesign, toPersistedDesign, type DesignState } from '../model'
import { projectRepository } from '.'
import { ProjectAuthRequiredError, ProjectConflictError, type ProjectDocument, type ProjectRecord, type ProjectView, type SaveState } from './types'

type SessionState = {
  loading: boolean
  authRequired: boolean
  error: string | null
}

const documentFor = (templateId: string, design: DesignState): ProjectDocument => ({
  schemaVersion: 1,
  templateId,
  design: toPersistedDesign(design),
})

export function useProjectSession(slug: string, view: ProjectView) {
  const [session, setSession] = useState<SessionState>({ loading: true, authRequired: false, error: null })
  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [design, setDesign] = useState<DesignState>(initialDesign)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const projectRef = useRef<ProjectRecord | null>(null)
  const designRef = useRef(design)
  const revisionRef = useRef(0)
  const lastSavedRef = useRef('')
  const timerRef = useRef<number | null>(null)
  const saveChainRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => { designRef.current = design }, [design])
  useEffect(() => { projectRef.current = project }, [project])

  const reload = useCallback(() => setReloadToken((value) => value + 1), [])

  useEffect(() => projectRepository.onAuthStateChange(reload), [reload])

  useEffect(() => {
    let cancelled = false
    setSession({ loading: true, authRequired: false, error: null })
    setSaveState('idle')
    void projectRepository.load(slug, view).then((loaded) => {
      if (cancelled) return
      const nextDesign = hydrateDesign(loaded.draft.design)
      const serialised = JSON.stringify(loaded.draft)
      revisionRef.current = loaded.revision
      lastSavedRef.current = serialised
      setProject(loaded)
      setDesign(nextDesign)
      setSession({ loading: false, authRequired: false, error: null })
    }).catch((error: unknown) => {
      if (cancelled) return
      setProject(null)
      if (error instanceof ProjectAuthRequiredError) setSession({ loading: false, authRequired: true, error: null })
      else setSession({ loading: false, authRequired: false, error: error instanceof Error ? error.message : 'No se pudo cargar el proyecto' })
    })
    return () => { cancelled = true }
  }, [slug, view, reloadToken])

  const persist = useCallback((document: ProjectDocument, serialised = JSON.stringify(document)) => {
    const loaded = projectRef.current
    if (!loaded || view !== 'editor' || loaded.access === 'viewer' || serialised === lastSavedRef.current) return saveChainRef.current
    const run = saveChainRef.current.then(async () => {
      if (serialised === lastSavedRef.current) return
      setSaveState('saving')
      setSaveMessage('Guardando…')
      try {
        const result = await projectRepository.saveDraft(loaded.id, revisionRef.current, document)
        revisionRef.current = result.revision
        lastSavedRef.current = serialised
        setProject((current) => current ? { ...current, draft: document, revision: result.revision, updatedAt: result.updatedAt } : current)
        setSaveState('saved')
        setSaveMessage('Guardado')
      } catch (error) {
        if (error instanceof ProjectConflictError) {
          setSaveState('conflict')
          setSaveMessage('Hay cambios de otra sesión')
        } else {
          setSaveState('error')
          setSaveMessage(error instanceof Error ? error.message : 'Error al guardar')
        }
        throw error
      }
    })
    saveChainRef.current = run.catch(() => undefined)
    return run
  }, [view])

  useEffect(() => {
    if (!project || session.loading || view !== 'editor' || project.access === 'viewer') return
    const document = documentFor(project.draft.templateId, design)
    const serialised = JSON.stringify(document)
    if (serialised === lastSavedRef.current) return
    setSaveState('dirty')
    setSaveMessage('Cambios pendientes')
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { void persist(document, serialised) }, 500)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [design, persist, project, session.loading, view])

  useEffect(() => {
    if (!project || view !== 'editor' || project.access === 'viewer') return
    return projectRepository.subscribe(project.id, (event) => {
      if (event.revision <= revisionRef.current) return
      const localDocument = documentFor(project.draft.templateId, designRef.current)
      if (JSON.stringify(localDocument) !== lastSavedRef.current) {
        setSaveState('conflict')
        setSaveMessage('Hay cambios de otra sesión')
        return
      }
      revisionRef.current = event.revision
      lastSavedRef.current = JSON.stringify(event.document)
      setProject((current) => current ? { ...current, draft: event.document, revision: event.revision, updatedAt: event.updatedAt } : current)
      setDesign(hydrateDesign(event.document.design))
      setSaveState('saved')
      setSaveMessage('Actualizado desde otra sesión')
    })
  }, [project?.id, view])

  useEffect(() => {
    const warnIfPending = (event: BeforeUnloadEvent) => {
      if (saveState !== 'dirty' && saveState !== 'saving') return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnIfPending)
    return () => window.removeEventListener('beforeunload', warnIfPending)
  }, [saveState])

  const publish = useCallback(async () => {
    const loaded = projectRef.current
    if (!loaded || view !== 'editor' || loaded.access === 'viewer') return
    if (timerRef.current) window.clearTimeout(timerRef.current)
    const document = documentFor(loaded.draft.templateId, designRef.current)
    await persist(document)
    setSaveMessage('Publicando…')
    try {
      const result = await projectRepository.publish(loaded.id, revisionRef.current)
      setProject((current) => current ? { ...current, published: document, publishedRevision: result.publishedRevision, updatedAt: result.publishedAt } : current)
      setSaveState('saved')
      setSaveMessage('Versión publicada')
    } catch (error) {
      setSaveState(error instanceof ProjectConflictError ? 'conflict' : 'error')
      setSaveMessage(error instanceof Error ? error.message : 'No se pudo publicar')
    }
  }, [persist, view])

  return {
    ...session,
    project,
    design,
    setDesign: setDesign as Dispatch<SetStateAction<DesignState>>,
    saveState,
    saveMessage,
    publish,
    reload,
    repositoryKind: projectRepository.kind,
  }
}
