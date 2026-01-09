import { useState, useEffect, useCallback } from 'react'
import type { BackupInfo, BackupConfig } from '@shared/types'
import { useToast } from '../../context/ToastContext'
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

const XIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ArchiveIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
)

const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

const WEEKDAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

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

interface BackupTableProps {
  title: string
  backups: BackupInfo[]
  selected: Set<string>
  onToggleSelect: (name: string) => void
  onToggleSelectAll: () => void
  onDownload: (name: string) => void
  onRestore: (backup: BackupInfo) => void
}

function BackupTable({ title, backups, selected, onToggleSelect, onToggleSelectAll, onDownload, onRestore }: BackupTableProps) {
  if (backups.length === 0) return null

  const allSelected = backups.every(b => selected.has(b.name))

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">{title}</h3>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={allSelected && backups.length > 0}
                  onChange={onToggleSelectAll}
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
                    onChange={() => onToggleSelect(backup.name)}
                    className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-base)] cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)]">{backup.name}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatDate(backup.date)}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatFileSize(backup.size)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => onDownload(backup.name)}
                    className="btn btn-ghost text-xs py-1.5 px-2"
                    title="Scarica"
                  >
                    <DownloadIcon />
                  </button>
                  <button
                    onClick={() => onRestore(backup)}
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
    </div>
  )
}

export default function BackupTab() {
  const { showToast } = useToast()
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [config, setConfig] = useState<BackupConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [restoreTarget, setRestoreTarget] = useState<BackupInfo | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [newTime, setNewTime] = useState('')

  // Derived state for separate backup lists
  const autoBackups = backups.filter(b => b.name.startsWith('data_') || b.name.startsWith('pre-restore_'))
  const manualBackups = backups.filter(b => b.name.startsWith('backup_'))

  const loadData = useCallback(async () => {
    try {
      const [backupList, backupConfig] = await Promise.all([
        window.api.backup.list(),
        window.api.backup.getConfig()
      ])
      setBackups(backupList)
      setConfig(backupConfig)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveConfig = async () => {
    if (!config) return
    if (config.scheduleTimes.length === 0) {
      showToast('Serve almeno un orario programmato', 'error')
      return
    }
    setSaving(true)
    try {
      await window.api.backup.setConfig(config)
      showToast('Configurazione salvata', 'success')
    } catch (err) {
      showToast('Errore nel salvataggio', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTime = () => {
    if (!config || !newTime) return
    if (config.scheduleTimes.includes(newTime)) {
      showToast('Orario già presente', 'error')
      return
    }
    setConfig({ ...config, scheduleTimes: [...config.scheduleTimes, newTime].sort() })
    setNewTime('')
  }

  const handleRemoveTime = (time: string) => {
    if (!config) return
    setConfig({ ...config, scheduleTimes: config.scheduleTimes.filter(t => t !== time) })
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      await window.api.backup.createManual()
      await loadData()
      showToast('Backup creato con successo', 'success')
    } catch (err) {
      showToast('Errore durante la creazione del backup', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async () => {
    if (!restoreTarget) return
    try {
      const result = await window.api.backup.restore(restoreTarget.name)
      if (result.success) {
        showToast(`Database ripristinato. Backup di sicurezza: ${result.safetyBackupName}`, 'success')
        await loadData()
      }
    } catch (err) {
      showToast('Errore durante il ripristino', 'error')
    } finally {
      setRestoreTarget(null)
    }
  }

  const handleDelete = async () => {
    const count = selected.size
    try {
      await window.api.backup.delete(Array.from(selected))
      setSelected(new Set())
      await loadData()
      showToast(`${count} backup eliminati`, 'success')
    } catch (err) {
      showToast('Errore durante l\'eliminazione', 'error')
    } finally {
      setShowDeleteModal(false)
    }
  }

  const handleDownload = async (backupName: string) => {
    try {
      const result = await window.api.backup.download(backupName)
      if (result) {
        showToast('Backup scaricato con successo', 'success')
      }
    } catch (err) {
      showToast('Errore durante il download', 'error')
    }
  }

  const handleDownloadArchive = async () => {
    try {
      const result = await window.api.backup.downloadArchive()
      if (result) {
        showToast('Archivio scaricato con successo', 'success')
      }
    } catch (err) {
      showToast('Errore durante il download dell\'archivio', 'error')
    }
  }

  const handleUploadBackup = async () => {
    try {
      const result = await window.api.backup.uploadBackup()
      if (result) {
        await loadData()
        showToast(`Backup importato: ${result}`, 'success')
      }
    } catch (err) {
      showToast('Errore durante l\'importazione del backup', 'error')
    }
  }

  const handleUploadArchive = async () => {
    try {
      const count = await window.api.backup.uploadArchive()
      if (count > 0) {
        await loadData()
        showToast(`Importati ${count} backup dall'archivio`, 'success')
      }
    } catch (err) {
      showToast('Errore durante l\'importazione dell\'archivio', 'error')
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

  const toggleSelectAllAuto = () => {
    const allAutoSelected = autoBackups.every(b => selected.has(b.name))
    if (allAutoSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        autoBackups.forEach(b => next.delete(b.name))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        autoBackups.forEach(b => next.add(b.name))
        return next
      })
    }
  }

  const toggleSelectAllManual = () => {
    const allManualSelected = manualBackups.every(b => selected.has(b.name))
    if (allManualSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        manualBackups.forEach(b => next.delete(b.name))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        manualBackups.forEach(b => next.add(b.name))
        return next
      })
    }
  }

  if (loading || !config) {
    return (
      <div className="p-6 flex items-center justify-center text-[var(--text-muted)]">
        Caricamento...
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Config Section */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Backup Automatici</h3>

        {/* Schedule Times */}
        <div className="mb-4">
          <label className="text-xs text-[var(--text-secondary)] block mb-2">Orari programmati (se l'applicazione è chiusa sarà eseguito al primo avvio)</label>
          <div className="flex flex-wrap items-center gap-2">
            {config.scheduleTimes.map(time => (
              <span
                key={time}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-base)] text-sm font-mono"
              >
                {time}
                <button
                  onClick={() => handleRemoveTime(time)}
                  className="text-[var(--text-muted)] hover:text-[var(--error)] cursor-pointer"
                >
                  <XIcon />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="input py-1 px-2 w-24 text-sm"
              />
              <button
                onClick={handleAddTime}
                disabled={!newTime}
                className="btn btn-secondary text-xs py-1 px-2 disabled:opacity-50"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>

        {/* Retention Settings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Max giornalieri</label>
            <input
              type="number"
              min={1}
              value={config.maxDaily}
              onChange={e => setConfig({ ...config, maxDaily: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="input py-1 px-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Max settimanali</label>
            <input
              type="number"
              min={1}
              value={config.maxWeekly}
              onChange={e => setConfig({ ...config, maxWeekly: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="input py-1 px-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Max mensili</label>
            <input
              type="number"
              min={1}
              value={config.maxMonthly}
              onChange={e => setConfig({ ...config, maxMonthly: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="input py-1 px-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Giorno settimanale</label>
            <select
              value={config.weeklyDay}
              onChange={e => setConfig({ ...config, weeklyDay: parseInt(e.target.value, 10) })}
              className="select py-1 text-sm"
            >
              {WEEKDAYS.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="btn btn-primary text-sm"
          >
            {saving ? 'Salvataggio...' : 'Salva configurazione'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn btn-primary"
        >
          <PlusIcon />
          {creating ? 'Creazione...' : 'Crea Backup Manuale'}
        </button>

        <button
          onClick={handleDownloadArchive}
          className="btn btn-secondary"
          disabled={backups.length === 0}
        >
          <ArchiveIcon />
          Scarica archivio
        </button>

        <button
          onClick={handleUploadBackup}
          className="btn btn-secondary"
        >
          <UploadIcon />
          Importa backup
        </button>

        <button
          onClick={handleUploadArchive}
          className="btn btn-secondary"
        >
          <UploadIcon />
          Importa archivio
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

      {/* Empty State */}
      {backups.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[var(--text-muted)] mb-2">Nessun backup presente</p>
          <p className="text-sm text-[var(--text-muted)]">I backup automatici verranno creati agli orari programmati.</p>
        </div>
      ) : (
        <>
          {/* Auto Backups Table */}
          <BackupTable
            title="Backup Automatici"
            backups={autoBackups}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllAuto}
            onDownload={handleDownload}
            onRestore={setRestoreTarget}
          />

          {/* Manual Backups Table */}
          <BackupTable
            title="Backup Manuali"
            backups={manualBackups}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllManual}
            onDownload={handleDownload}
            onRestore={setRestoreTarget}
          />
        </>
      )}

      {/* Modals */}
      <RestoreModal
        backup={restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
      />
      <DeleteBackupsModal
        isOpen={showDeleteModal}
        selectedNames={Array.from(selected)}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
