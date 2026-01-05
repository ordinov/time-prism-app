import { useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useClients } from '../hooks/useClients'
import type { ProjectWithClient } from '@shared/types'

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899'
]

export default function Projects() {
  const [showArchived, setShowArchived] = useState(false)
  const { projects, loading, error, create, update, remove, archive } = useProjects(showArchived)
  const { clients } = useClients()

  const [search, setSearch] = useState('')
  const [filterClientId, setFilterClientId] = useState<number | ''>('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formName, setFormName] = useState('')
  const [formClientId, setFormClientId] = useState<number | null>(null)
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])

  const filteredProjects = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterClientId && p.client_id !== filterClientId) return false
    return true
  })

  const resetForm = () => {
    setFormName('')
    setFormClientId(null)
    setFormColor(PRESET_COLORS[0])
    setIsAdding(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formName.trim()) return
    await create({ name: formName.trim(), client_id: formClientId, color: formColor })
    resetForm()
  }

  const handleUpdate = async () => {
    if (!formName.trim() || !editingId) return
    const project = projects.find(p => p.id === editingId)
    if (!project) return
    await update({
      id: editingId,
      name: formName.trim(),
      client_id: formClientId,
      color: formColor,
      archived: project.archived
    })
    resetForm()
  }

  const startEdit = (project: ProjectWithClient) => {
    setEditingId(project.id)
    setFormName(project.name)
    setFormClientId(project.client_id)
    setFormColor(project.color)
    setIsAdding(false)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Eliminare questo progetto?')) {
      await remove(id)
    }
  }

  if (loading) return <div className="p-4">Caricamento...</div>
  if (error) return <div className="p-4 text-red-600">Errore: {error}</div>

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Progetti</h1>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null) }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Nuovo
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Cerca..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
        />
        <select
          value={filterClientId}
          onChange={e => setFilterClientId(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border rounded"
        >
          <option value="">Tutti i clienti</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
          />
          <span className="text-sm">Archiviati</span>
        </label>
      </div>

      {(isAdding || editingId) && (
        <div className="p-4 bg-gray-50 rounded mb-4 space-y-3">
          <input
            type="text"
            placeholder="Nome progetto"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            autoFocus
          />
          <select
            value={formClientId ?? ''}
            onChange={e => setFormClientId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Nessun cliente</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setFormColor(color)}
                className={`w-8 h-8 rounded-full border-2 ${formColor === color ? 'border-gray-800' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              {editingId ? 'Aggiorna' : 'Crea'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
              Annulla
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filteredProjects.map(project => (
          <div
            key={project.id}
            className={`flex items-center justify-between p-3 bg-white rounded shadow-sm ${project.archived ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="font-medium">{project.name}</span>
              <span className="text-gray-500 text-sm">{project.client_name ?? '—'}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(project)} className="p-1 hover:bg-gray-100 rounded" title="Modifica">✏️</button>
              <button onClick={() => archive(project)} className="p-1 hover:bg-gray-100 rounded" title={project.archived ? 'Ripristina' : 'Archivia'}>📦</button>
              <button onClick={() => handleDelete(project.id)} className="p-1 hover:bg-gray-100 rounded" title="Elimina">🗑️</button>
            </div>
          </div>
        ))}
        {filteredProjects.length === 0 && (
          <p className="text-gray-500 text-center py-8">Nessun progetto trovato</p>
        )}
      </div>
    </div>
  )
}
