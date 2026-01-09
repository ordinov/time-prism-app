import { useState, useEffect, useCallback } from 'react'
import type { BackupInfo } from '@shared/types'
import RestoreModal from './RestoreModal'
import DeleteBackupsModal from './DeleteBackupsModal'

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

export default function BackupTab() {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [restoreTarget, setRestoreTarget] = useState<BackupInfo | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadBackups = useCallback(async () => {
    try {
      const list = await window.api.backup.list()
      setBackups(list)
    } catch (err) {
      console.error('Failed to load backups:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await window.api.backup.createManual()
      await loadBackups()
      setToast({ message: 'Backup creato con successo', type: 'success' })
    } catch (err) {
      setToast({ message: 'Errore durante la creazione del backup', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async () => {
    if (!restoreTarget) return
    try {
      const result = await window.api.backup.restore(restoreTarget.name)
      if (result.success) {
        setToast({ message: `Database ripristinato. Backup di sicurezza: ${result.safetyBackupName}`, type: 'success' })
        await loadBackups()
      }
    } catch (err) {
      setToast({ message: 'Errore durante il ripristino', type: 'error' })
    } finally {
      setRestoreTarget(null)
    }
  }

  const handleDelete = async () => {
    try {
      await window.api.backup.delete(Array.from(selected))
      setSelected(new Set())
      await loadBackups()
      setToast({ message: `${selected.size} backup eliminati`, type: 'success' })
    } catch (err) {
      setToast({ message: 'Errore durante l\'eliminazione', type: 'error' })
    } finally {
      setShowDeleteModal(false)
    }
  }

  const handleDownload = async (backupName: string) => {
    try {
      const result = await window.api.backup.download(backupName)
      if (result) {
        setToast({ message: 'Backup scaricato con successo', type: 'success' })
      }
    } catch (err) {
      setToast({ message: 'Errore durante il download', type: 'error' })
    }
  }

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === backups.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(backups.map(b => b.name)))
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-[var(--text-muted)]">
        Caricamento...
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in
          ${toast.type === 'success' ? 'bg-[var(--success)] text-white' : 'bg-[var(--error)] text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn btn-primary"
        >
          <PlusIcon />
          {creating ? 'Creazione...' : 'Crea Backup'}
        </button>

        {selected.size > 0 && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-danger"
          >
            <TrashIcon />
            Elimina ({selected.size})
          </button>
        )}
      </div>

      {/* Backup List */}
      {backups.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[var(--text-muted)] mb-2">Nessun backup presente</p>
          <p className="text-sm text-[var(--text-muted)]">Crea il tuo primo backup per proteggere i tuoi dati.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === backups.length && backups.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-base)] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Data</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Dimensione</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(backup => (
                <tr
                  key={backup.name}
                  className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-base)]/50"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(backup.name)}
                      onChange={() => toggleSelect(backup.name)}
                      className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-base)] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)]">{backup.name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatDate(backup.date)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatFileSize(backup.size)}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleDownload(backup.name)}
                      className="btn btn-ghost text-xs py-1.5 px-2"
                      title="Scarica"
                    >
                      <DownloadIcon />
                    </button>
                    <button
                      onClick={() => setRestoreTarget(backup)}
                      className="btn btn-secondary text-xs py-1.5 px-3"
                    >
                      Ripristina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Restore Modal */}
      <RestoreModal
        backup={restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
      />

      {/* Delete Modal */}
      <DeleteBackupsModal
        isOpen={showDeleteModal}
        selectedNames={Array.from(selected)}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
