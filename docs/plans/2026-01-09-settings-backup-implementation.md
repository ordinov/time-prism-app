# Settings Backup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Settings page with database backup/restore management including multi-select deletion.

**Architecture:** New `/settings` route with horizontal tabs. First tab "Database" shows backup list with name/date/size, allows creating backups, restoring (with auto-safety-backup), and deleting multiple backups via checkbox selection.

**Tech Stack:** React, TypeScript, Electron IPC, SQLite (better-sqlite3), Tailwind CSS

---

## Task 1: Add BackupInfo Type

**Files:**
- Modify: `src/shared/types.ts:91` (end of file)

**Step 1: Add the BackupInfo interface**

Add at the end of `src/shared/types.ts`:

```typescript
// Backup
export interface BackupInfo {
  name: string
  date: Date
  size: number
}

export interface RestoreResult {
  success: boolean
  safetyBackupName: string
}
```

**Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add BackupInfo and RestoreResult interfaces"
```

---

## Task 2: Update backup.ts - Add Size and Delete Functions

**Files:**
- Modify: `src/main/backup.ts`

**Step 1: Update listBackups to include size**

Replace the `listBackups` function (lines 55-67):

```typescript
export function listBackups(): { name: string; date: Date; size: number }[] {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) return []

  return fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stats = fs.statSync(path.join(backupDir, f))
      return {
        name: f,
        date: stats.mtime,
        size: stats.size
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}
```

**Step 2: Add deleteBackups function**

Add after `restoreBackup` function (after line 79):

```typescript
export function deleteBackups(names: string[]): void {
  const backupDir = getBackupDir()

  for (const name of names) {
    const backupPath = path.join(backupDir, name)
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }
  }
}
```

**Step 3: Modify restoreBackup to create safety backup first**

Replace the `restoreBackup` function (lines 69-79):

```typescript
export function restoreBackup(backupName: string): { success: boolean; safetyBackupName: string } {
  const backupDir = getBackupDir()
  const backupPath = path.join(backupDir, backupName)
  const dbPath = getDbPath()

  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file does not exist')
  }

  // Create safety backup before restore
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safetyBackupName = `pre-restore_${timestamp}.db`
  const safetyBackupPath = path.join(backupDir, safetyBackupName)

  fs.copyFileSync(dbPath, safetyBackupPath)
  fs.copyFileSync(backupPath, dbPath)

  return { success: true, safetyBackupName }
}
```

**Step 4: Update createBackup to not auto-clean for manual backups**

Add a new function for manual backups (after `createBackup`):

```typescript
export function createManualBackup(): string {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database file does not exist')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFileName = `backup_${timestamp}.db`
  const backupPath = path.join(backupDir, backupFileName)

  fs.copyFileSync(dbPath, backupPath)

  return backupFileName
}
```

**Step 5: Commit**

```bash
git add src/main/backup.ts
git commit -m "feat(backup): add size to list, delete function, safety restore"
```

---

## Task 3: Update IPC Handlers

**Files:**
- Modify: `src/main/ipc.ts`

**Step 1: Update imports**

Change line 3:

```typescript
import { createBackup, listBackups, restoreBackup, exportBackup, importBackup, deleteBackups, createManualBackup } from './backup'
```

**Step 2: Update backup:list handler**

Replace line 132-134:

```typescript
  ipcMain.handle('backup:list', (): { name: string; date: Date; size: number }[] => {
    return listBackups()
  })
```

**Step 3: Update backup:restore handler**

Replace lines 136-138:

```typescript
  ipcMain.handle('backup:restore', (_, backupName: string): { success: boolean; safetyBackupName: string } => {
    return restoreBackup(backupName)
  })
```

**Step 4: Add backup:delete handler**

Add after backup:restore handler:

```typescript
  ipcMain.handle('backup:delete', (_, names: string[]): void => {
    deleteBackups(names)
  })

  ipcMain.handle('backup:createManual', (): string => {
    return createManualBackup()
  })
```

**Step 5: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat(ipc): update backup handlers for size, delete, manual create"
```

---

## Task 4: Update Preload API

**Files:**
- Modify: `src/main/preload.ts`

**Step 1: Import BackupInfo and RestoreResult types**

Update line 1-9:

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type {
  Client, Project, Session,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  SessionQuery, ProjectWithClient, SessionWithProject,
  SettingsMap, BackupInfo, RestoreResult
} from '../shared/types'
```

**Step 2: Update backup API object**

Replace lines 32-38:

```typescript
  backup: {
    create: (): Promise<string> => ipcRenderer.invoke('backup:create'),
    createManual: (): Promise<string> => ipcRenderer.invoke('backup:createManual'),
    list: (): Promise<BackupInfo[]> => ipcRenderer.invoke('backup:list'),
    restore: (name: string): Promise<RestoreResult> => ipcRenderer.invoke('backup:restore', name),
    delete: (names: string[]): Promise<void> => ipcRenderer.invoke('backup:delete', names),
    export: (): Promise<string | null> => ipcRenderer.invoke('backup:export'),
    import: (): Promise<boolean> => ipcRenderer.invoke('backup:import'),
  },
```

**Step 3: Commit**

```bash
git add src/main/preload.ts
git commit -m "feat(preload): expose updated backup API with types"
```

---

## Task 5: Add Settings Icon to Sidebar

**Files:**
- Modify: `src/renderer/components/Sidebar.tsx`

**Step 1: Add GearIcon component**

Add after ChartIcon (around line 27):

```typescript
const GearIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
```

**Step 2: Add settings to navItems array**

Update navItems (lines 56-61):

```typescript
const navItems = [
  { to: '/tracking', label: 'Track', icon: ClockIcon },
  { to: '/projects', label: 'Progetti', icon: FolderIcon },
  { to: '/clients', label: 'Clienti', icon: UsersIcon },
  { to: '/reports', label: 'Report', icon: ChartIcon },
  { to: '/settings', label: 'Impostazioni', icon: GearIcon },
]
```

**Step 3: Commit**

```bash
git add src/renderer/components/Sidebar.tsx
git commit -m "feat(sidebar): add settings navigation icon"
```

---

## Task 6: Add Settings Route

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Import Settings page**

Add import after line 6:

```typescript
import Settings from './pages/Settings'
```

**Step 2: Add route**

Add after line 16 (reports route):

```typescript
        <Route path="settings" element={<Settings />} />
```

**Step 3: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat(router): add settings route"
```

---

## Task 7: Create Settings Page with Tabs

**Files:**
- Create: `src/renderer/pages/Settings.tsx`

**Step 1: Create the Settings page**

```typescript
import { useState } from 'react'
import BackupTab from '../components/Settings/BackupTab'

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
)

type TabId = 'database'

interface Tab {
  id: TabId
  label: string
  icon: () => JSX.Element
}

const tabs: Tab[] = [
  { id: 'database', label: 'Database', icon: DatabaseIcon },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('database')

  return (
    <div className="h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Impostazioni</h1>
      </div>

      {/* Tab Bar */}
      <div className="px-6 border-b border-[var(--border-subtle)]">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer
                ${activeTab === tab.id
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              <tab.icon />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--prism-violet)] to-[var(--prism-cyan)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'database' && <BackupTab />}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/Settings.tsx
git commit -m "feat(settings): create settings page with tab structure"
```

---

## Task 8: Create BackupTab Component

**Files:**
- Create: `src/renderer/components/Settings/BackupTab.tsx`

**Step 1: Create the BackupTab component**

```typescript
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
                  <td className="px-4 py-3 text-right">
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
```

**Step 2: Create Settings directory**

```bash
mkdir -p src/renderer/components/Settings
```

**Step 3: Commit**

```bash
git add src/renderer/components/Settings/BackupTab.tsx
git commit -m "feat(settings): create BackupTab component"
```

---

## Task 9: Create RestoreModal Component

**Files:**
- Create: `src/renderer/components/Settings/RestoreModal.tsx`

**Step 1: Create the RestoreModal component**

```typescript
import { useState } from 'react'
import type { BackupInfo } from '@shared/types'

interface Props {
  backup: BackupInfo | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

const WarningIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

export default function RestoreModal({ backup, onClose, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [restoring, setRestoring] = useState(false)

  if (!backup) return null

  const handleConfirm = async () => {
    setRestoring(true)
    try {
      await onConfirm()
    } finally {
      setRestoring(false)
      setConfirmed(false)
    }
  }

  const handleClose = () => {
    setConfirmed(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-elevated)] border border-[var(--border-subtle)]
                      rounded-xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-[var(--warning)]/20 text-[var(--warning)]
                          flex items-center justify-center mx-auto mb-4">
            <WarningIcon />
          </div>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center mb-2">
            Ripristina Database
          </h3>

          <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
            Stai per ripristinare il database dal backup:
          </p>

          <p className="text-sm font-mono text-[var(--text-primary)] text-center bg-[var(--bg-base)]
                        rounded-lg px-3 py-2 mb-4">
            {backup.name}
          </p>

          <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
            I dati attuali verranno salvati automaticamente prima del ripristino.
          </p>

          <label className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-base)] cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-base)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Ho capito che i dati correnti verranno sostituiti
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="btn btn-ghost flex-1"
              disabled={restoring}
            >
              Annulla
            </button>
            <button
              onClick={handleConfirm}
              disabled={!confirmed || restoring}
              className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {restoring ? 'Ripristino...' : 'Ripristina'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Settings/RestoreModal.tsx
git commit -m "feat(settings): create RestoreModal component"
```

---

## Task 10: Create DeleteBackupsModal Component

**Files:**
- Create: `src/renderer/components/Settings/DeleteBackupsModal.tsx`

**Step 1: Create the DeleteBackupsModal component**

```typescript
import { useState } from 'react'

interface Props {
  isOpen: boolean
  selectedNames: string[]
  onClose: () => void
  onConfirm: () => Promise<void>
}

const TrashIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

export default function DeleteBackupsModal({ isOpen, selectedNames, onClose, onConfirm }: Props) {
  const [deleting, setDeleting] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-elevated)] border border-[var(--border-subtle)]
                      rounded-xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-[var(--error)]/20 text-[var(--error)]
                          flex items-center justify-center mx-auto mb-4">
            <TrashIcon />
          </div>

          <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center mb-2">
            Elimina Backup
          </h3>

          <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
            Stai per eliminare <span className="font-bold text-[var(--error)]">{selectedNames.length} backup</span>.
            Questa azione è irreversibile.
          </p>

          {/* List of backups to delete */}
          <div className="bg-[var(--bg-base)] rounded-lg p-3 mb-6 max-h-40 overflow-auto">
            {selectedNames.map(name => (
              <div key={name} className="text-xs font-mono text-[var(--text-muted)] py-1">
                {name}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={deleting}
            >
              Annulla
            </button>
            <button
              onClick={handleConfirm}
              disabled={deleting}
              className="btn bg-[var(--error)] hover:bg-[var(--error)]/80 text-white flex-1"
            >
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Settings/DeleteBackupsModal.tsx
git commit -m "feat(settings): create DeleteBackupsModal component"
```

---

## Task 11: Final Integration Commit

**Step 1: Verify all files are committed**

```bash
git status
```

**Step 2: Create final integration commit if needed**

If there are uncommitted changes:

```bash
git add -A
git commit -m "feat: complete settings page with database backup management"
```

---

## Summary

After completing all tasks, the following files will be created/modified:

**Created:**
- `src/renderer/pages/Settings.tsx`
- `src/renderer/components/Settings/BackupTab.tsx`
- `src/renderer/components/Settings/RestoreModal.tsx`
- `src/renderer/components/Settings/DeleteBackupsModal.tsx`

**Modified:**
- `src/shared/types.ts` - BackupInfo and RestoreResult types
- `src/main/backup.ts` - size in list, delete function, safety restore
- `src/main/ipc.ts` - updated handlers
- `src/main/preload.ts` - updated API
- `src/renderer/components/Sidebar.tsx` - gear icon
- `src/renderer/App.tsx` - settings route
