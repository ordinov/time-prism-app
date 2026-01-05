import { useState } from 'react'
import { useClients } from '../hooks/useClients'
import type { Client } from '@shared/types'

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
    return <div className="p-4">Caricamento...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">Errore: {error}</div>
  }

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Clienti</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Nuovo
        </button>
      </div>

      <input
        type="text"
        placeholder="Cerca..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 border rounded mb-4"
      />

      {isAdding && (
        <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded">
          <input
            type="text"
            placeholder="Nome cliente"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="flex-1 px-3 py-2 border rounded"
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Salva
          </button>
          <button
            onClick={() => { setIsAdding(false); setNewName('') }}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Annulla
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filteredClients.map(client => (
          <div
            key={client.id}
            className="flex items-center justify-between p-3 bg-white rounded shadow-sm"
          >
            {editingId === client.id ? (
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(client)}
                  className="flex-1 px-3 py-1 border rounded"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(client)}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                >
                  Salva
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 bg-gray-300 rounded text-sm"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <>
                <span>{client.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(client)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Modifica"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Elimina"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {filteredClients.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            {search ? 'Nessun cliente trovato' : 'Nessun cliente. Creane uno!'}
          </p>
        )}
      </div>
    </div>
  )
}
