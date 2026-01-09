import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { useClients } from '../hooks/useClients'
import { useToast } from '../context/ToastContext'
import ConfirmModal from '../components/ConfirmModal'
import type { ProjectWithStats } from '@shared/types'
import { formatDuration, formatWorkdays } from '../utils/formatters'

// Icons
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

const ArchiveIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

const FolderIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
)

const ClipboardIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const DEFAULT_COLOR = '#8B5CF6'

export default function Projects() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [showArchived, setShowArchived] = useState(false)
  const { projects, loading, error, create, update, remove, archive } = useProjects(showArchived)
  const { clients } = useClients()

  const [search, setSearch] = useState('')
  const [filterClientId, setFilterClientId] = useState<number | ''>('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formName, setFormName] = useState('')
  const [formClientId, setFormClientId] = useState<number | null>(null)
  const [formColor, setFormColor] = useState(DEFAULT_COLOR)
  const [copied, setCopied] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ project: ProjectWithStats } | null>(null)

  const filteredProjects = projects.filter(p => {
    // When showArchived is checked, show ONLY archived projects
    if (showArchived && !p.archived) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterClientId && p.client_id !== filterClientId) return false
    return true
  })

  const resetForm = () => {
    setFormName('')
    setFormClientId(null)
    setFormColor(DEFAULT_COLOR)
    setIsAdding(false)
    setEditingId(null)
    setCopied(false)
  }

  const copyColorToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formColor.replace('#', '').toUpperCase())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleHexInput = (value: string) => {
    // Allow typing without #
    let hex = value.startsWith('#') ? value : `#${value}`
    // Validate hex format
    if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
      setFormColor(hex.toUpperCase())
    }
  }

  const handleCreate = async () => {
    if (!formName.trim()) return
    try {
      await create({ name: formName.trim(), client_id: formClientId, color: formColor })
      showToast('Progetto creato', 'success')
      resetForm()
    } catch (err) {
      showToast('Errore nella creazione del progetto', 'error')
    }
  }

  const handleUpdate = async () => {
    if (!formName.trim() || !editingId) return
    const project = projects.find(p => p.id === editingId)
    if (!project) return
    try {
      await update({
        id: editingId,
        name: formName.trim(),
        client_id: formClientId,
        color: formColor,
        archived: project.archived
      })
      showToast('Progetto aggiornato', 'success')
      resetForm()
    } catch (err) {
      showToast('Errore nell\'aggiornamento del progetto', 'error')
    }
  }

  const startEdit = (project: ProjectWithStats) => {
    setEditingId(project.id)
    setFormName(project.name)
    setFormClientId(project.client_id)
    setFormColor(project.color)
    setIsAdding(false)
  }


  const handleDelete = async (id: number) => {
    try {
      await remove(id)
      showToast('Progetto eliminato', 'success')
      setDeleteModal(null)
    } catch (err) {
      showToast('Errore nell\'eliminazione del progetto', 'error')
    }
  }

  const handleArchive = async (project: ProjectWithStats) => {
    try {
      await archive(project)
      showToast(project.archived ? 'Progetto ripristinato' : 'Progetto archiviato', 'success')
    } catch (err) {
      showToast('Errore nell\'archiviazione del progetto', 'error')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--prism-violet)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--error)] mb-2">Errore nel caricamento</p>
          <p className="text-[var(--text-muted)] text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Progetti</h1>
        <button
          onClick={() => {
            setFormName('')
            setFormClientId(null)
            setFormColor(DEFAULT_COLOR)
            setEditingId(null)
            setIsAdding(true)
          }}
          className="btn btn-primary"
        >
          <PlusIcon />
          <span>Nuovo progetto</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-[2] min-w-0">
          <input
            type="text"
            placeholder="Cerca progetti..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={filterClientId}
          onChange={e => setFilterClientId(e.target.value ? Number(e.target.value) : '')}
          className="select flex-1 min-w-[140px] max-w-[200px]"
        >
          <option value="">Tutti i clienti</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)]
                         border border-[var(--border-subtle)] cursor-pointer
                         hover:border-[var(--border-default)] transition-colors">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-base)]
                       text-[var(--prism-violet)] focus:ring-[var(--prism-violet)] focus:ring-offset-0"
          />
          <span className="text-sm text-[var(--text-secondary)]">Archiviati</span>
        </label>
      </div>

      {/* Form for new project */}
      {isAdding && (
        <div
          key="new"
          className="card p-5 mb-6 space-y-4 animate-scale-in"
        >
          {/* Color, Name, Client - same row */}
          <div className="flex items-end gap-4">
            {/* Color picker */}
            <div className="flex-shrink-0">
              <label className="text-sm text-[var(--text-muted)] mb-2 block">Colore</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formColor}
                  onChange={e => setFormColor(e.target.value.toUpperCase())}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-[var(--border-default)]
                             bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0
                             [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
                />
                <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg border border-[var(--border-default)] px-2 py-2">
                  <span className="text-[var(--text-muted)] font-mono text-sm">#</span>
                  <input
                    type="text"
                    value={formColor.replace('#', '')}
                    onChange={e => handleHexInput(e.target.value)}
                    maxLength={6}
                    className="w-16 bg-transparent border-none outline-none font-mono text-sm
                               text-[var(--text-primary)] uppercase tracking-wider"
                    placeholder="8B5CF6"
                  />
                </div>
                <button
                  type="button"
                  onClick={copyColorToClipboard}
                  className={`btn btn-ghost btn-icon transition-all duration-200 ${
                    copied ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                  }`}
                  title={copied ? 'Copiato!' : 'Copia HEX'}
                >
                  {copied ? <CheckIcon /> : <ClipboardIcon />}
                </button>
              </div>
            </div>

            {/* Project name */}
            <div className="flex-1 min-w-0">
              <label className="text-sm text-[var(--text-muted)] mb-2 block">Nome progetto</label>
              <input
                type="text"
                placeholder="Nome progetto"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="input w-full"
                autoFocus
              />
            </div>

            {/* Client */}
            <div className="flex-1 min-w-0">
              <label className="text-sm text-[var(--text-muted)] mb-2 block">Cliente</label>
              <select
                value={formClientId ?? ''}
                onChange={e => setFormClientId(e.target.value ? Number(e.target.value) : null)}
                className="select w-full"
              >
                <option value="">Nessun cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buttons - right aligned */}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={resetForm} className="btn btn-secondary">
              Annulla
            </button>
            <button
              onClick={handleCreate}
              className="btn btn-primary"
            >
              Crea progetto
            </button>
          </div>
        </div>
      )}

      {/* Projects table */}
      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1.5fr_100px_100px_100px_auto] gap-4 px-4 py-3
                        bg-[var(--bg-overlay)] border-b border-[var(--border-subtle)]
                        text-sm font-medium text-[var(--text-muted)]">
          <div>Cliente</div>
          <div>Nome progetto</div>
          <div className="text-right">Sessioni</div>
          <div className="text-right">Ore</div>
          <div className="text-right">Giornate</div>
          <div className="w-[100px]"></div>
        </div>

        {/* Table body */}
        <div className="divide-y divide-[var(--border-subtle)]">
          {filteredProjects.map(project => (
            editingId === project.id ? (
              /* Inline edit form */
              <div
                key={project.id}
                className="p-5 space-y-4 animate-scale-in bg-[var(--bg-surface)]"
              >
                {/* Color, Name, Client - same row */}
                <div className="flex items-end gap-4">
                  {/* Color picker */}
                  <div className="flex-shrink-0">
                    <label className="text-sm text-[var(--text-muted)] mb-2 block">Colore</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formColor}
                        onChange={e => setFormColor(e.target.value.toUpperCase())}
                        className="w-10 h-10 rounded-lg cursor-pointer border-2 border-[var(--border-default)]
                                   bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0
                                   [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
                      />
                      <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-lg border border-[var(--border-default)] px-2 py-2">
                        <span className="text-[var(--text-muted)] font-mono text-sm">#</span>
                        <input
                          type="text"
                          value={formColor.replace('#', '')}
                          onChange={e => handleHexInput(e.target.value)}
                          maxLength={6}
                          className="w-16 bg-transparent border-none outline-none font-mono text-sm
                                     text-[var(--text-primary)] uppercase tracking-wider"
                          placeholder="8B5CF6"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={copyColorToClipboard}
                        className={`btn btn-ghost btn-icon transition-all duration-200 ${
                          copied ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                        }`}
                        title={copied ? 'Copiato!' : 'Copia HEX'}
                      >
                        {copied ? <CheckIcon /> : <ClipboardIcon />}
                      </button>
                    </div>
                  </div>

                  {/* Project name */}
                  <div className="flex-1 min-w-0">
                    <label className="text-sm text-[var(--text-muted)] mb-2 block">Nome progetto</label>
                    <input
                      type="text"
                      placeholder="Nome progetto"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="input w-full"
                      autoFocus
                    />
                  </div>

                  {/* Client */}
                  <div className="flex-1 min-w-0">
                    <label className="text-sm text-[var(--text-muted)] mb-2 block">Cliente</label>
                    <select
                      value={formClientId ?? ''}
                      onChange={e => setFormClientId(e.target.value ? Number(e.target.value) : null)}
                      className="select w-full"
                    >
                      <option value="">Nessun cliente</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Buttons - right aligned */}
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={resetForm} className="btn btn-secondary">
                    Annulla
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="btn btn-primary"
                  >
                    Aggiorna
                  </button>
                </div>
              </div>
            ) : (
              /* Project row */
              <div
                key={project.id}
                onClick={() => navigate(`/tracking?tab=track&projectId=${project.id}`)}
                className="grid grid-cols-[1fr_1.5fr_100px_100px_100px_auto] gap-4 px-4 py-3
                           items-center group hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
              >
                <div className="text-[var(--text-secondary)] truncate">
                  {project.client_name || <span className="text-[var(--text-muted)]">—</span>}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full ring-2 ring-white/10 flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium text-[var(--text-primary)] truncate">{project.name}</span>
                  {project.archived && (
                    <span className="badge text-[var(--warning)] flex-shrink-0">Archiviato</span>
                  )}
                </div>
                <div className="text-right text-[var(--text-secondary)] tabular-nums">
                  {project.session_count}
                </div>
                <div className="text-right text-[var(--text-secondary)] tabular-nums">
                  {formatDuration(project.total_minutes || 0)}
                </div>
                <div className="text-right text-[var(--text-secondary)] tabular-nums">
                  {formatWorkdays(project.total_minutes || 0)}
                </div>
                <div className="flex gap-1 justify-end w-[100px] opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(project) }}
                    className="btn btn-ghost btn-icon"
                    title="Modifica"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleArchive(project) }}
                    className="btn btn-ghost btn-icon"
                    title={project.archived ? 'Ripristina' : 'Archivia'}
                  >
                    <ArchiveIcon />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteModal({ project }) }}
                    className="btn btn-ghost btn-icon text-[var(--error)] hover:bg-[var(--error-muted)]"
                    title="Elimina"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )
          ))}

          {/* Empty state */}
          {filteredProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
              <FolderIcon />
              <p className="mt-4 text-lg">Nessun progetto trovato</p>
              <p className="text-sm mt-1">
                {search || filterClientId ? 'Prova a modificare i filtri' : 'Crea il tuo primo progetto'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <ConfirmModal
          isOpen={true}
          title="Elimina progetto"
          message={`Vuoi eliminare il progetto "${deleteModal.project.name}"?`}
          confirmLabel="Elimina"
          cancelLabel="Annulla"
          danger
          onConfirm={() => handleDelete(deleteModal.project.id)}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  )
}
