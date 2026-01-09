# Configurable Backup Policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make automatic backup policy configurable with scheduled times, retention policy (daily/weekly/monthly), and separate UI for manual vs automatic backups.

**Architecture:** BackupScheduler class manages timers based on configured schedule times. Retention policy cleanup runs after each automatic backup, classifying backups dynamically into daily/weekly/monthly categories. Configuration stored in settings table as JSON.

**Tech Stack:** TypeScript, Electron, React, SQLite (better-sqlite3), Tailwind CSS

---

## Task 1: Add BackupConfig Type

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: Add BackupConfig interface**

Add at the end of `src/shared/types.ts`:

```typescript
// Backup Configuration
export interface BackupConfig {
  scheduleTimes: string[]    // ["09:00", "13:00", "18:00"]
  maxDaily: number           // max daily backups to keep
  maxWeekly: number          // max weekly backups to keep
  maxMonthly: number         // max monthly backups to keep
  weeklyDay: number          // 0=Sun, 1=Mon, ..., 6=Sat
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  scheduleTimes: ['09:00', '13:00', '18:00'],
  maxDaily: 1,
  maxWeekly: 2,
  maxMonthly: 3,
  weeklyDay: 1  // Monday
}
```

**Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add BackupConfig interface and defaults"
```

---

## Task 2: Create Backup Scheduler

**Files:**
- Create: `src/main/backup-scheduler.ts`

**Step 1: Create the scheduler class**

```typescript
import { getDatabase } from './database'
import { createBackup } from './backup'
import { DEFAULT_BACKUP_CONFIG, type BackupConfig } from '../shared/types'

let schedulerTimeout: NodeJS.Timeout | null = null
let lastBackupCheck: string | null = null

export function getBackupConfig(): BackupConfig {
  const db = getDatabase()

  const getVal = (key: string, defaultVal: string): string => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? defaultVal
  }

  return {
    scheduleTimes: JSON.parse(getVal('backup_schedule_times', JSON.stringify(DEFAULT_BACKUP_CONFIG.scheduleTimes))),
    maxDaily: parseInt(getVal('backup_max_daily', String(DEFAULT_BACKUP_CONFIG.maxDaily)), 10),
    maxWeekly: parseInt(getVal('backup_max_weekly', String(DEFAULT_BACKUP_CONFIG.maxWeekly)), 10),
    maxMonthly: parseInt(getVal('backup_max_monthly', String(DEFAULT_BACKUP_CONFIG.maxMonthly)), 10),
    weeklyDay: parseInt(getVal('backup_weekly_day', String(DEFAULT_BACKUP_CONFIG.weeklyDay)), 10)
  }
}

export function setBackupConfig(config: BackupConfig): void {
  const db = getDatabase()

  const setVal = (key: string, value: string) => {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, value)
  }

  setVal('backup_schedule_times', JSON.stringify(config.scheduleTimes))
  setVal('backup_max_daily', String(config.maxDaily))
  setVal('backup_max_weekly', String(config.maxWeekly))
  setVal('backup_max_monthly', String(config.maxMonthly))
  setVal('backup_weekly_day', String(config.weeklyDay))
}

function getNextScheduledTime(scheduleTimes: string[]): Date | null {
  if (scheduleTimes.length === 0) return null

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Sort times
  const sortedTimes = [...scheduleTimes].sort()

  // Find next time today
  for (const time of sortedTimes) {
    const scheduled = new Date(`${today}T${time}:00`)
    if (scheduled > now) {
      return scheduled
    }
  }

  // Next is tomorrow's first time
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  return new Date(`${tomorrowStr}T${sortedTimes[0]}:00`)
}

function shouldRunMissedBackup(scheduleTimes: string[]): boolean {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('backup_last_auto') as { value: string } | undefined

  if (!row) return true // Never ran, run now

  const lastBackup = new Date(row.value)
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Check if any scheduled time passed since last backup
  for (const time of scheduleTimes) {
    const scheduled = new Date(`${today}T${time}:00`)
    if (scheduled > lastBackup && scheduled <= now) {
      return true
    }
  }

  // Check yesterday's times if last backup was before today
  if (lastBackup.toISOString().split('T')[0] < today) {
    return true
  }

  return false
}

function recordBackupTime(): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run('backup_last_auto', new Date().toISOString())
}

function runScheduledBackup(): void {
  try {
    console.log('[BackupScheduler] Running scheduled backup...')
    createBackup()
    recordBackupTime()
    console.log('[BackupScheduler] Backup completed')
  } catch (e) {
    console.error('[BackupScheduler] Backup failed:', e)
  }

  // Schedule next
  scheduleNextBackup()
}

function scheduleNextBackup(): void {
  const config = getBackupConfig()
  const nextTime = getNextScheduledTime(config.scheduleTimes)

  if (!nextTime) {
    console.log('[BackupScheduler] No scheduled times configured')
    return
  }

  const msUntilNext = nextTime.getTime() - Date.now()
  console.log(`[BackupScheduler] Next backup at ${nextTime.toISOString()} (in ${Math.round(msUntilNext / 60000)} minutes)`)

  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout)
  }

  schedulerTimeout = setTimeout(runScheduledBackup, msUntilNext)
}

export function startBackupScheduler(): void {
  console.log('[BackupScheduler] Starting...')

  const config = getBackupConfig()

  // Check if we missed a backup while app was closed
  if (shouldRunMissedBackup(config.scheduleTimes)) {
    console.log('[BackupScheduler] Missed backup detected, running now...')
    try {
      createBackup()
      recordBackupTime()
    } catch (e) {
      console.error('[BackupScheduler] Missed backup failed:', e)
    }
  }

  scheduleNextBackup()
}

export function stopBackupScheduler(): void {
  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout)
    schedulerTimeout = null
  }
  console.log('[BackupScheduler] Stopped')
}

export function restartBackupScheduler(): void {
  stopBackupScheduler()
  scheduleNextBackup()
}
```

**Step 2: Commit**

```bash
git add src/main/backup-scheduler.ts
git commit -m "feat(backup): create BackupScheduler with configurable times"
```

---

## Task 3: Add Retention Policy Cleanup

**Files:**
- Modify: `src/main/backup.ts`

**Step 1: Add imports at top**

Add after existing imports:

```typescript
import type { BackupConfig } from '../shared/types'
```

**Step 2: Replace cleanOldBackups with new policy-based cleanup**

Replace the `cleanOldBackups` function (lines 57-74) with:

```typescript
export function cleanupWithRetentionPolicy(config: BackupConfig): void {
  const backupDir = getBackupDir()
  if (!fs.existsSync(backupDir)) return

  // Get all automatic backups (data_*.db), sorted newest first
  const allBackups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('data_') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      date: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  if (allBackups.length === 0) return

  const toKeep = new Set<string>()

  // 1. Keep daily backups (first backup of each day, up to maxDaily days)
  const dailyKept = new Map<string, typeof allBackups[0]>()
  for (const backup of allBackups) {
    const dayKey = backup.date.toISOString().split('T')[0]
    if (!dailyKept.has(dayKey) && dailyKept.size < config.maxDaily) {
      dailyKept.set(dayKey, backup)
      toKeep.add(backup.name)
    }
  }

  // 2. Keep weekly backups (prefer configured day, fallback to first available)
  const weeklyKept = new Map<string, typeof allBackups[0]>()
  for (const backup of allBackups) {
    const weekKey = getWeekKey(backup.date)
    if (!weeklyKept.has(weekKey) && weeklyKept.size < config.maxWeekly) {
      const dayOfWeek = backup.date.getDay()
      const existing = weeklyKept.get(weekKey)

      if (!existing) {
        weeklyKept.set(weekKey, backup)
        toKeep.add(backup.name)
      } else if (dayOfWeek === config.weeklyDay && existing.date.getDay() !== config.weeklyDay) {
        // Replace with preferred day
        weeklyKept.set(weekKey, backup)
        toKeep.add(backup.name)
      }
    }
  }

  // 3. Keep monthly backups (first available of each month)
  const monthlyKept = new Map<string, typeof allBackups[0]>()
  for (const backup of allBackups) {
    const monthKey = backup.date.toISOString().slice(0, 7) // YYYY-MM
    if (!monthlyKept.has(monthKey) && monthlyKept.size < config.maxMonthly) {
      monthlyKept.set(monthKey, backup)
      toKeep.add(backup.name)
    }
  }

  // Delete backups not in any retention category
  for (const backup of allBackups) {
    if (!toKeep.has(backup.name)) {
      try {
        fs.unlinkSync(backup.path)
        console.log(`[Backup] Deleted: ${backup.name}`)
      } catch (e) {
        console.error(`[Backup] Failed to delete ${backup.name}:`, e)
      }
    }
  }
}

function getWeekKey(date: Date): string {
  // Get ISO week number
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

// Keep old function for backwards compatibility but use new logic
export function cleanOldBackups(): void {
  // Import here to avoid circular dependency
  const { getBackupConfig } = require('./backup-scheduler')
  const config = getBackupConfig()
  cleanupWithRetentionPolicy(config)
}
```

**Step 3: Commit**

```bash
git add src/main/backup.ts
git commit -m "feat(backup): add retention policy cleanup (daily/weekly/monthly)"
```

---

## Task 4: Add IPC Handlers for Config

**Files:**
- Modify: `src/main/ipc.ts`

**Step 1: Update imports**

Add to imports at top:

```typescript
import { getBackupConfig, setBackupConfig, restartBackupScheduler } from './backup-scheduler'
import type { BackupConfig } from '../shared/types'
```

**Step 2: Add new handlers after backup:import handler**

Add before the `// Settings` comment:

```typescript
  ipcMain.handle('backup:getConfig', (): BackupConfig => {
    return getBackupConfig()
  })

  ipcMain.handle('backup:setConfig', (_, config: BackupConfig): void => {
    setBackupConfig(config)
    restartBackupScheduler()
  })
```

**Step 3: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat(ipc): add backup config get/set handlers"
```

---

## Task 5: Update Preload API

**Files:**
- Modify: `src/main/preload.ts`

**Step 1: Update imports**

Add `BackupConfig` to imports:

```typescript
import type {
  Client, Project, Session,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  SessionQuery, ProjectWithClient, SessionWithProject,
  SettingsMap, BackupInfo, RestoreResult, BackupConfig
} from '../shared/types'
```

**Step 2: Add to backup API object**

Add after `import:` line in backup object:

```typescript
    getConfig: (): Promise<BackupConfig> => ipcRenderer.invoke('backup:getConfig'),
    setConfig: (config: BackupConfig): Promise<void> => ipcRenderer.invoke('backup:setConfig', config),
```

**Step 3: Commit**

```bash
git add src/main/preload.ts
git commit -m "feat(preload): expose backup config API"
```

---

## Task 6: Update App Startup

**Files:**
- Modify: `src/main/index.ts`

**Step 1: Update imports**

Replace import line 5:

```typescript
import { startBackupScheduler, stopBackupScheduler } from './backup-scheduler'
```

**Step 2: Replace backup code in whenReady**

Replace lines 47-52 (the auto backup section):

```typescript
  // Start backup scheduler (handles missed backups automatically)
  startBackupScheduler()
```

**Step 3: Add scheduler stop on quit**

Update the `window-all-closed` handler:

```typescript
app.on('window-all-closed', () => {
  stopBackupScheduler()
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

**Step 4: Commit**

```bash
git add src/main/index.ts
git commit -m "feat(app): integrate backup scheduler on startup/shutdown"
```

---

## Task 7: Update BackupTab with Config Form

**Files:**
- Modify: `src/renderer/components/Settings/BackupTab.tsx`

**Step 1: Complete rewrite of BackupTab**

Replace entire file with:

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { BackupInfo, BackupConfig } from '@shared/types'
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
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [config, setConfig] = useState<BackupConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [restoreTarget, setRestoreTarget] = useState<BackupInfo | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleSaveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      await window.api.backup.setConfig(config)
      setToast({ message: 'Configurazione salvata', type: 'success' })
    } catch (err) {
      setToast({ message: 'Errore nel salvataggio', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddTime = () => {
    if (!config || !newTime) return
    if (config.scheduleTimes.includes(newTime)) {
      setToast({ message: 'Orario già presente', type: 'error' })
      return
    }
    setConfig({ ...config, scheduleTimes: [...config.scheduleTimes, newTime].sort() })
    setNewTime('')
  }

  const handleRemoveTime = (time: string) => {
    if (!config) return
    if (config.scheduleTimes.length <= 1) {
      setToast({ message: 'Serve almeno un orario', type: 'error' })
      return
    }
    setConfig({ ...config, scheduleTimes: config.scheduleTimes.filter(t => t !== time) })
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      await window.api.backup.createManual()
      await loadData()
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
        await loadData()
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
      await loadData()
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
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in
          ${toast.type === 'success' ? 'bg-[var(--success)] text-white' : 'bg-[var(--error)] text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Config Section */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Backup Automatici</h3>

        {/* Schedule Times */}
        <div className="mb-4">
          <label className="text-xs text-[var(--text-secondary)] block mb-2">Orari programmati</label>
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
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Giornalieri</label>
            <select
              value={config.maxDaily}
              onChange={e => setConfig({ ...config, maxDaily: parseInt(e.target.value, 10) })}
              className="select py-1 text-sm"
            >
              {[1, 2, 3, 5, 7, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Settimanali</label>
            <select
              value={config.maxWeekly}
              onChange={e => setConfig({ ...config, maxWeekly: parseInt(e.target.value, 10) })}
              className="select py-1 text-sm"
            >
              {[1, 2, 4, 6, 8, 12].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Mensili</label>
            <select
              value={config.maxMonthly}
              onChange={e => setConfig({ ...config, maxMonthly: parseInt(e.target.value, 10) })}
              className="select py-1 text-sm"
            >
              {[1, 2, 3, 6, 12, 24].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
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
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="btn btn-primary"
        >
          <PlusIcon />
          {creating ? 'Creazione...' : 'Crea Backup Manuale'}
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
```

**Step 2: Commit**

```bash
git add src/renderer/components/Settings/BackupTab.tsx
git commit -m "feat(ui): add backup config form and separate auto/manual tables"
```

---

## Task 8: Final Integration Test

**Step 1: Verify all files**

```bash
git status
```

**Step 2: Create final commit if needed**

If there are uncommitted changes:

```bash
git add -A
git commit -m "feat: complete configurable backup policy implementation"
```

---

## Summary

**Files created:**
- `src/main/backup-scheduler.ts` - Timer and scheduler logic

**Files modified:**
- `src/shared/types.ts` - BackupConfig type
- `src/main/backup.ts` - Retention policy cleanup
- `src/main/ipc.ts` - Config handlers
- `src/main/preload.ts` - Config API
- `src/main/index.ts` - Scheduler integration
- `src/renderer/components/Settings/BackupTab.tsx` - Config UI + separate tables
