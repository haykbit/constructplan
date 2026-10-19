import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Box, Check, Columns2, Copy, ExternalLink, House, LogOut, Minus, Move3D, Plus, RotateCcw, RotateCw, Ruler, Save, Trash2, UserPlus, X } from 'lucide-react'
import { FURNITURE_CATALOG, HOUSE, type DesignState, type FurnitureItem, type FurnitureKind, type VisibilityKey } from './model'
import { newProjectDocument, normaliseSlug, projectRepository, ProjectAuthRequiredError, type ProjectSummary, type ProjectView, type SaveState } from './projects'
import { useProjectSession } from './projects/useProjectSession'
import { getProjectTemplate } from './templates'

type Mode = '2d' | '3d' | 'split'

function Header({ mode, setMode, projectName, readOnly }: { mode: Mode; setMode: (mode: Mode) => void; projectName: string; readOnly?: boolean }) {
  return <header className="app-header">
    <div className="brand">
      <span className="brand-mark"><House size={18} /></span>
      <div><strong>Forma</strong><span>{projectName}{readOnly ? ' · presentación' : ''}</span></div>
    </div>
    <nav className="mode-tabs" aria-label="Vistas del proyecto">
      <button className={mode === '2d' ? 'active' : ''} onClick={() => setMode('2d')}><Ruler size={15} /> Plano 2D</button>
      <button className={mode === '3d' ? 'active' : ''} onClick={() => setMode('3d')}><Box size={15} /> Modelo 3D</button>
      <button className={mode === 'split' ? 'active' : ''} onClick={() => setMode('split')}><Columns2 size={15} /> Comparar</button>
    </nav>
  </header>
}

function Workspace({ mode, design, setDesign, templateId, readOnly = false }: { mode: Mode; design: DesignState; setDesign: React.Dispatch<React.SetStateAction<DesignState>>; templateId: string; readOnly?: boolean }) {
  const template = getProjectTemplate(templateId)
  const Plan = template.Plan
  const Model = template.Model
  const onSelect = (selected: string) => { if (!readOnly) setDesign((current) => ({ ...current, selected, selectedFurnitureId: selected.startsWith('furniture:') ? selected.slice(10) : null })) }
  const onSelectFurniture = (id: string | null) => { if (!readOnly) setDesign((current) => ({ ...current, selected: id ? `furniture:${id}` : 'none', selectedFurnitureId: id })) }
  const onUpdateFurniture = (id: string, patch: Partial<FurnitureItem>) => { if (!readOnly) setDesign((current) => ({ ...current, furniture: current.furniture.map((item) => item.id === id ? { ...item, ...patch } : item) })) }
  const onToggleVisibility = (key: VisibilityKey) => setDesign((current) => ({ ...current, [key]: !current[key] }))
  if (mode === '2d') return <main className="workspace single"><Plan design={design} onSelectFurniture={onSelectFurniture} onUpdateFurniture={onUpdateFurniture} readOnly={readOnly} /></main>
  if (mode === '3d') return <main className="workspace single"><Model design={design} onSelect={onSelect} onUpdateFurniture={onUpdateFurniture} onToggleVisibility={onToggleVisibility} readOnly={readOnly} presentation={readOnly} /></main>
  return <main className="workspace split">
    <section><Plan design={design} onSelectFurniture={onSelectFurniture} onUpdateFurniture={onUpdateFurniture} readOnly={readOnly} /></section>
    <section><Model design={design} onSelect={onSelect} onUpdateFurniture={onUpdateFurniture} onToggleVisibility={onToggleVisibility} readOnly={readOnly} presentation={readOnly} /></section>
  </main>
}

function FurnitureControls({ design, setDesign }: { design: DesignState; setDesign: React.Dispatch<React.SetStateAction<DesignState>> }) {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const selected = design.furniture.find(({ id }) => id === design.selectedFurnitureId)
  useEffect(() => { if (design.selectedFurnitureId) setCatalogOpen(false) }, [design.selectedFurnitureId])
  const update = (id: string, patch: Partial<FurnitureItem>) => setDesign((current) => ({ ...current, furniture: current.furniture.map((item) => item.id === id ? { ...item, ...patch } : item) }))
  const closeSelection = () => setDesign((current) => ({ ...current, selected: 'none', selectedFurnitureId: null }))
  const rotate = (delta: number) => selected && update(selected.id, { rotation: (selected.rotation + delta + 360) % 360 })
  const resize = (axis: 'w' | 'h', delta: number) => {
    if (!selected) return
    const next = Math.max(.28, Math.min(axis === 'w' ? HOUSE.width - .48 : HOUSE.depth - .48, selected[axis] + delta))
    const position = axis === 'w' ? 'x' : 'y'
    const max = axis === 'w' ? HOUSE.width : HOUSE.depth
    const moved = Math.max(.24, Math.min(max - .24 - next, selected[position] - (next - selected[axis]) / 2))
    update(selected.id, { [axis]: next, [position]: moved })
  }
  const elevate = (delta: number) => selected && update(selected.id, { elevation: Math.max(0, Math.min(2.6, selected.elevation + delta)) })
  const remove = () => {
    if (!selected) return
    setDesign((current) => ({ ...current, selected: 'none', selectedFurnitureId: null, furniture: current.furniture.filter(({ id }) => id !== selected.id) }))
  }
  const duplicate = () => {
    if (!selected) return
    const id = `${selected.kind}-${Date.now()}`
    const copy = { ...selected, id, label: `${selected.label} copia`, x: Math.min(HOUSE.width - selected.w - .24, selected.x + .22), y: Math.min(HOUSE.depth - selected.h - .24, selected.y + .22) }
    setDesign((current) => ({ ...current, selected: `furniture:${id}`, selectedFurnitureId: id, furniture: [...current.furniture, copy] }))
  }
  const add = (template: (typeof FURNITURE_CATALOG)[number]) => {
    const id = `${template.kind}-${Date.now()}`
    const kitchen = template.kind.startsWith('kitchen')
    const offset = (design.furniture.length % 5) * .14
    const furniture: FurnitureItem = { ...template, id, x: kitchen ? 1.25 + offset : 5.75 + offset, y: kitchen ? 8.1 + offset : 8.35 + offset, elevation: 0, rotation: 0 }
    setDesign((current) => ({ ...current, selected: `furniture:${id}`, selectedFurnitureId: id, furniture: [...current.furniture, furniture] }))
    setCatalogOpen(false)
  }
  const changeKitchen = (kind: FurnitureKind) => {
    if (!selected) return
    const template = FURNITURE_CATALOG.find((entry) => entry.kind === kind)
    if (!template) return
    update(selected.id, { kind, label: template.label, w: template.w, h: template.h, height: template.height })
  }
  return <>
    <div className="add-furniture-control">
      {catalogOpen && <div className="furniture-catalog" role="menu"><div><strong>Añadir mueble</strong><button onClick={() => setCatalogOpen(false)} aria-label="Cerrar catálogo"><X size={14} /></button></div>{FURNITURE_CATALOG.map((template) => <button key={template.kind} onClick={() => add(template)} role="menuitem"><span>{template.label}</span><small>{template.w.toFixed(2)} × {template.h.toFixed(2)} m</small></button>)}</div>}
      <button className="add-furniture-button" onClick={() => setCatalogOpen((open) => !open)} aria-expanded={catalogOpen}><Plus size={16} /> Añadir mueble</button>
    </div>
    {selected && <div className="furniture-context" role="toolbar" aria-label={`Acciones de ${selected.label}`}>
      <div className="furniture-context-title"><Move3D size={15} /><span><strong>{selected.label}</strong><small>Arrastra para mover</small></span></div>
      {selected.kind.startsWith('kitchen') && <label className="kitchen-kind"><span>Tipo</span><select value={selected.kind} onChange={(event) => changeKitchen(event.target.value as FurnitureKind)}><option value="kitchen-base">Módulo bajo</option><option value="kitchen-tall">Módulo alto</option><option value="kitchen-island">Isla</option></select></label>}
      <div className="context-control"><span>Giro</span><div><button onClick={() => rotate(-15)} title="Girar 15° a la izquierda"><RotateCcw size={14} /></button><b>{Math.round(selected.rotation)}°</b><button onClick={() => rotate(15)} title="Girar 15° a la derecha"><RotateCw size={14} /></button></div></div>
      <div className="context-control"><span>Ancho</span><div><button onClick={() => resize('w', -.1)} title="Reducir ancho"><Minus size={13} /></button><b>{selected.w.toFixed(2)} m</b><button onClick={() => resize('w', .1)} title="Aumentar ancho"><Plus size={13} /></button></div></div>
      <div className="context-control"><span>Fondo</span><div><button onClick={() => resize('h', -.1)} title="Reducir fondo"><Minus size={13} /></button><b>{selected.h.toFixed(2)} m</b><button onClick={() => resize('h', .1)} title="Aumentar fondo"><Plus size={13} /></button></div></div>
      <div className="context-control elevation"><span>Cota Z</span><div><button onClick={() => elevate(-.05)} title="Bajar"><Minus size={13} /></button><b>{Math.round(selected.elevation * 100)} cm</b><button onClick={() => elevate(.05)} title="Subir"><Plus size={13} /></button></div></div>
      <div className="context-actions"><button onClick={duplicate} title="Duplicar"><Copy size={14} /></button><button className="danger" onClick={remove} title="Eliminar"><Trash2 size={14} /></button><button onClick={closeSelection} title="Cerrar acciones"><X size={14} /></button></div>
    </div>}
  </>
}

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname)
  useEffect(() => {
    const update = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  return pathname
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await projectRepository.requestMagicLink(email, window.location.href)
      setSent(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo enviar el enlace')
    }
  }
  useEffect(() => projectRepository.onAuthStateChange(onAuthenticated), [onAuthenticated])
  return <main className="system-page"><section className="system-card">
    <span className="system-mark"><House size={22} /></span>
    <h1>Acceso al proyecto</h1>
    {sent ? <><p>Te hemos enviado un enlace de acceso a <strong>{email}</strong>.</p><button className="primary-action" onClick={() => setSent(false)}>Usar otro correo</button></> : <form onSubmit={submit}>
      <p>Introduce el correo autorizado para abrir los proyectos de Forma.</p>
      <label>Correo electrónico<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-action" type="submit">Recibir enlace de acceso</button>
    </form>}
  </section></main>
}

function SaveControl({ slug, view, saveState, message, unpublished, onPublish, onInvite, repositoryKind }: { slug: string; view: ProjectView; saveState: SaveState; message: string; unpublished: boolean; onPublish: () => void; onInvite: () => void; repositoryKind: 'local' | 'supabase' }) {
  if (view === 'presentation') return <div className="sync-control readonly"><Check size={14} /><span>Versión publicada · solo lectura</span></div>
  const icon = saveState === 'saving' || saveState === 'dirty' ? <Save size={14} /> : <Check size={14} />
  return <div className={`sync-control ${saveState}`}>
    <div>{icon}<span>{message || 'Guardado'}{repositoryKind === 'local' ? ' · desarrollo local' : ''}</span></div>
    <button onClick={() => navigate(`/presentacion/${slug}`)} title="Abrir la presentación"><ExternalLink size={14} /> Presentación</button>
    <button onClick={onInvite} title="Dar acceso al cliente"><UserPlus size={14} /> Acceso</button>
    <button className="publish-action" disabled={!unpublished || saveState === 'saving' || saveState === 'conflict'} onClick={onPublish}>Publicar</button>
  </div>
}

function InviteDialog({ projectId, slug, onClose }: { projectId: string; slug: string; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const editorUrl = `${window.location.origin}/proyectos/${slug}`
  const presentationUrl = `${window.location.origin}/presentacion/${slug}`
  const invite = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await projectRepository.invite(projectId, email, role)
      setMessage(projectRepository.kind === 'local' ? 'Acceso simulado en desarrollo local.' : 'Acceso preparado. Comparte el enlace del proyecto con el cliente.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo preparar el acceso')
    } finally {
      setSubmitting(false)
    }
  }
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    setMessage('Enlace copiado')
  }
  return <div className="dialog-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="access-dialog" role="dialog" aria-modal="true" aria-label="Acceso al proyecto">
    <header><div><p className="eyebrow">ACCESO</p><h2>Compartir proyecto</h2></div><button onClick={onClose} aria-label="Cerrar"><X size={16} /></button></header>
    <form onSubmit={invite}><label>Correo autorizado<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@correo.com" /></label><label>Permisos<select value={role} onChange={(event) => setRole(event.target.value as 'editor' | 'viewer')}><option value="editor">Puede editar</option><option value="viewer">Solo acceso privado</option></select></label><button className="primary-action" disabled={submitting}>{submitting ? 'Preparando…' : 'Autorizar correo'}</button></form>
    <div className="share-links"><button onClick={() => { void copy(editorUrl) }}><Copy size={14} /><span><strong>Enlace de edición</strong><small>{editorUrl}</small></span></button><button onClick={() => { void copy(presentationUrl) }}><ExternalLink size={14} /><span><strong>Presentación pública</strong><small>{presentationUrl}</small></span></button></div>
    {message && <p className="dialog-message">{message}</p>}{error && <p className="form-error">{error}</p>}
  </section></div>
}

function ProjectEditor({ slug, view }: { slug: string; view: ProjectView }) {
  const [mode, setMode] = useState<Mode>(view === 'presentation' ? '3d' : 'split')
  const [inviteOpen, setInviteOpen] = useState(false)
  const session = useProjectSession(slug, view)
  useEffect(() => setMode(view === 'presentation' ? '3d' : 'split'), [view])
  if (session.loading) return <main className="system-page"><div className="loading-mark">Cargando proyecto…</div></main>
  if (session.authRequired) return <AuthScreen onAuthenticated={session.reload} />
  if (session.error || !session.project) return <main className="system-page"><section className="system-card"><h1>No se pudo abrir el proyecto</h1><p>{session.error}</p><button className="primary-action" onClick={() => navigate('/proyectos')}>Volver a proyectos</button></section></main>
  const readOnly = view === 'presentation' || session.project.access === 'viewer'
  return <div className="variant-a">
    <Header mode={mode} setMode={setMode} projectName={session.project.name} readOnly={readOnly} />
    <Workspace mode={mode} design={session.design} setDesign={session.setDesign} templateId={session.project.draft.templateId} readOnly={readOnly} />
    {!readOnly && <FurnitureControls design={session.design} setDesign={session.setDesign} />}
    <SaveControl
      slug={slug}
      view={readOnly ? 'presentation' : view}
      saveState={session.saveState}
      message={session.saveMessage}
      unpublished={session.project.revision > session.project.publishedRevision}
      onPublish={() => { void session.publish() }}
      onInvite={() => setInviteOpen(true)}
      repositoryKind={session.repositoryKind}
    />
    {inviteOpen && <InviteDialog projectId={session.project.id} slug={slug} onClose={() => setInviteOpen(false)} />}
  </div>
}

function ProjectDashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const load = async () => {
    setLoading(true)
    try {
      setProjects(await projectRepository.list())
      setAuthRequired(false)
      setError('')
    } catch (caught) {
      if (caught instanceof ProjectAuthRequiredError) setAuthRequired(true)
      else setError(caught instanceof Error ? caught.message : 'No se pudieron cargar los proyectos')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load(); return projectRepository.onAuthStateChange(() => { void load() }) }, [])
  const suggestedSlug = useMemo(() => normaliseSlug(name), [name])
  const create = async (event: FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      const created = await projectRepository.create({ name, slug: normaliseSlug(slug || suggestedSlug), document: newProjectDocument() })
      navigate(`/proyectos/${created.slug}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el proyecto')
    } finally {
      setCreating(false)
    }
  }
  if (authRequired) return <AuthScreen onAuthenticated={() => { void load() }} />
  return <main className="dashboard-page">
    <header className="dashboard-header"><div className="brand"><span className="brand-mark"><House size={18} /></span><div><strong>Forma</strong><span>Proyectos</span></div></div>{projectRepository.requiresAuth && <button className="quiet-action" onClick={() => { void projectRepository.signOut() }}><LogOut size={14} /> Salir</button>}</header>
    <div className="dashboard-content">
      <section><p className="eyebrow">ESTUDIO</p><h1>Proyectos de vivienda</h1><p className="dashboard-intro">Cada proyecto utiliza el mismo editor 2D/3D y conserva su propio diseño, historial y publicación.</p>
        {loading ? <p>Cargando…</p> : <div className="project-grid">{projects.map((project) => <button key={project.id} className="project-card" onClick={() => navigate(`/proyectos/${project.slug}`)}><span>{project.name}</span><small>Revisión {project.revision}{project.revision > project.publishedRevision ? ' · cambios sin publicar' : ' · publicado'}</small><time>{new Date(project.updatedAt).toLocaleString('es-ES')}</time></button>)}</div>}
      </section>
      <form className="create-project-card" onSubmit={create}><p className="eyebrow">NUEVO PROYECTO</p><h2>Crear desde la plantilla base</h2><label>Nombre<input required value={name} onChange={(event) => { setName(event.target.value); setSlug(normaliseSlug(event.target.value)) }} placeholder="Casa Martínez" /></label><label>URL<input required value={slug} onChange={(event) => setSlug(normaliseSlug(event.target.value))} placeholder={suggestedSlug || 'casa-martinez'} /><small>/proyectos/{slug || suggestedSlug || 'casa-martinez'}</small></label>{error && <p className="form-error">{error}</p>}<button className="primary-action" disabled={creating || !name || !slug}>{creating ? 'Creando…' : 'Crear proyecto'}</button></form>
    </div>
  </main>
}

export default function App() {
  const pathname = usePathname()
  const route = useMemo(() => {
    const presentation = pathname.match(/^\/presentacion\/([^/]+)\/?$/)
    if (presentation) return { kind: 'project' as const, slug: decodeURIComponent(presentation[1]), view: 'presentation' as const }
    const editor = pathname.match(/^\/proyectos\/([^/]+)\/?$/)
    if (editor && editor[1] !== 'nuevo') return { kind: 'project' as const, slug: decodeURIComponent(editor[1]), view: 'editor' as const }
    if (pathname === '/proyectos' || pathname === '/proyectos/' || pathname === '/proyectos/nuevo') return { kind: 'dashboard' as const }
    return { kind: 'legacy' as const }
  }, [pathname])
  useEffect(() => {
    if (route.kind === 'legacy') navigate('/proyectos/casa-gemma')
  }, [route.kind])
  if (route.kind === 'project') return <ProjectEditor slug={route.slug} view={route.view} />
  if (route.kind === 'dashboard') return <ProjectDashboard />
  return null
}
