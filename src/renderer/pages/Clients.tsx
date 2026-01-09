import { useState } from 'react'
import { useClients } from '../hooks/useClients'
import type { Client } from '@shared/types'

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

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

export default function Clients() {
  const { clients, loading, error, create, update, remove } = useClients()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newName.trim()) return
    await create({ name: newName.trim() })
    setNewName('')
    setIsAdding(false)
  }

  const handleUpdate = async (client: Client) => {
    if (!editName.trim()) return
    await update({ id: client.id, name: editName.trim() })
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = async (id: number) => {
    if (confirm('Eliminare questo cliente?')) {
      await remove(id)
    }
  }

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setEditName(client.name)
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
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Clienti</h1>
        <button
          onClick={() => {
            setNewName('')
            setEditingId(null)
            setEditName('')
            setIsAdding(true)
          }}
          className="btn btn-primary"
        >
          <PlusIcon />
          <span>Nuovo cliente</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Cerca clienti..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="card p-4 mb-6 animate-scale-in">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nome cliente"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="input flex-1"
              autoFocus
            />
            <button
              onClick={handleCreate}
              className="btn btn-primary"
            >
              <CheckIcon />
              <span>Salva</span>
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewName('') }}
              className="btn btn-secondary"
            >
              <XIcon />
              <span>Annulla</span>
            </button>
          </div>
        </div>
      )}

      {/* Clients list */}
      <div className="space-y-2">
        {filteredClients.map(client => (
          <div
            key={client.id}
            className="card flex items-center justify-between p-4 group
                       hover:border-[var(--border-default)] transition-all duration-150"
          >
            {editingId === client.id ? (
              <div className="flex gap-3 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleUpdate(client)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="input flex-1"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(client)}
                  className="btn btn-primary"
                >
                  <CheckIcon />
                  <span>Salva</span>
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="btn btn-secondary"
                >
                  <XIcon />
                  <span>Annulla</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--prism-violet)]/20 to-[var(--prism-cyan)]/20
                                  flex items-center justify-center text-[var(--text-secondary)] text-sm font-medium">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">{client.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(client)}
                    className="btn btn-ghost btn-icon"
                    title="Modifica"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="btn btn-ghost btn-icon text-[var(--error)] hover:bg-[var(--error-muted)]"
                    title="Elimina"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Empty state */}
        {filteredClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
            <UsersIcon />
            <p className="mt-4 text-lg">
              {search ? 'Nessun cliente trovato' : 'Nessun cliente'}
            </p>
            <p className="text-sm mt-1">
              {search ? 'Prova a modificare la ricerca' : 'Aggiungi il tuo primo cliente'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
