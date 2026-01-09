# Sessions Table Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Excel-style editable table view for sessions in the Reports page with inline editing, sorting, and CRUD operations.

**Architecture:** Tab-based UI in Reports page switching between "Tracker" (existing aggregated view) and "Tabella" (new detailed sessions table). The table uses inline editing with direct cell click activation, leveraging existing `useSessions` and `useProjects` hooks.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, better-sqlite3, react-datepicker

---

## Task 1: Add `notes` field to TypeScript types

**Files:**
- Modify: `src/shared/types.ts:17-24` (Session interface)
- Modify: `src/shared/types.ts:61-65` (CreateSessionInput)
- Modify: `src/shared/types.ts:67-72` (UpdateSessionInput)
- Modify: `src/shared/types.ts:30-35` (SessionWithProject)

**Step 1: Update Session interface**

In `src/shared/types.ts`, add `notes` field to Session:

```typescript
export interface Session {
  id: number
  project_id: number
  start_at: string
  end_at: string
  notes: string | null  // ADD THIS LINE
  created_at: string
  updated_at: string
}
```

**Step 2: Update SessionWithProject interface**

```typescript
export interface SessionWithProject extends Session {
  project_name: string
  project_color: string
  client_name: string | null
}
```
(No changes needed - inherits `notes` from Session)

**Step 3: Update CreateSessionInput**

```typescript
export interface CreateSessionInput {
  project_id: number
  start_at: string
  end_at: string
  notes?: string | null  // ADD THIS LINE
}
```

**Step 4: Update UpdateSessionInput**

```typescript
export interface UpdateSessionInput {
  id: number
  project_id: number
  start_at: string
  end_at: string
  notes?: string | null  // ADD THIS LINE
}
```

**Step 5: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add notes field to session types"
```

---

## Task 2: Add `notes` column to database schema

**Files:**
- Modify: `src/main/database.ts:34-41`

**Step 1: Add migration for notes column**

In `src/main/database.ts`, after the CREATE TABLE statements, add migration:

```typescript
export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id),
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      archived INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      start_at DATETIME NOT NULL,
      end_at DATETIME NOT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions(start_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
  `)

  // Migration: add notes column if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[]
  const hasNotes = columns.some(col => col.name === 'notes')
  if (!hasNotes) {
    db.exec('ALTER TABLE sessions ADD COLUMN notes TEXT DEFAULT NULL')
  }

  return db
}
```

**Step 2: Commit**

```bash
git add src/main/database.ts
git commit -m "feat: add notes column to sessions table with migration"
```

---

## Task 3: Update IPC handlers for notes field

**Files:**
- Modify: `src/main/ipc.ts:71-97` (sessions:list handler)
- Modify: `src/main/ipc.ts:99-105` (sessions:create handler)
- Modify: `src/main/ipc.ts:107-113` (sessions:update handler)

**Step 1: Update sessions:list to include notes**

The SELECT already uses `s.*` so notes is automatically included. No change needed.

**Step 2: Update sessions:create handler**

```typescript
ipcMain.handle('db:sessions:create', (_, input: CreateSessionInput): Session => {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO sessions (project_id, start_at, end_at, notes) VALUES (?, ?, ?, ?)'
  ).run(input.project_id, input.start_at, input.end_at, input.notes ?? null)
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid) as Session
})
```

**Step 3: Update sessions:update handler**

```typescript
ipcMain.handle('db:sessions:update', (_, input: UpdateSessionInput): Session => {
  const db = getDatabase()
  db.prepare(
    'UPDATE sessions SET project_id = ?, start_at = ?, end_at = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(input.project_id, input.start_at, input.end_at, input.notes ?? null, input.id)
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(input.id) as Session
})
```

**Step 4: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat: update IPC handlers to support notes field"
```

---

## Task 4: Create SessionsTable component

**Files:**
- Create: `src/renderer/components/SessionsTable.tsx`

**Step 1: Create the component file**

```typescript
import { useState, useMemo } from 'react'
import DatePicker from 'react-datepicker'
import type { SessionWithProject, ProjectWithClient } from '@shared/types'

type SortField = 'project_name' | 'date' | 'start_at' | 'end_at' | 'notes' | 'hours' | 'days'
type SortDir = 'asc' | 'desc'

interface Props {
  sessions: SessionWithProject[]
  projects: ProjectWithClient[]
  onUpdate: (session: SessionWithProject) => Promise<void>
  onCreate: (projectId: number, startAt: string, endAt: string, notes?: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

interface EditingCell {
  sessionId: number
  field: 'project_id' | 'date' | 'start_at' | 'end_at' | 'notes'
}

export default function SessionsTable({ sessions, projects, onUpdate, onCreate, onDelete }: Props) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [newRow, setNewRow] = useState<{
    project_id: number
    date: string
    start_at: string
    end_at: string
    notes: string
  } | null>(null)

  const sortedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortField) {
        case 'project_name':
          aVal = a.project_name.toLowerCase()
          bVal = b.project_name.toLowerCase()
          break
        case 'date':
        case 'start_at':
          aVal = new Date(a.start_at).getTime()
          bVal = new Date(b.start_at).getTime()
          break
        case 'end_at':
          aVal = new Date(a.end_at).getTime()
          bVal = new Date(b.end_at).getTime()
          break
        case 'notes':
          aVal = (a.notes || '').toLowerCase()
          bVal = (b.notes || '').toLowerCase()
          break
        case 'hours':
        case 'days':
          aVal = new Date(a.end_at).getTime() - new Date(a.start_at).getTime()
          bVal = new Date(b.end_at).getTime() - new Date(b.start_at).getTime()
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [sessions, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  const startEdit = (sessionId: number, field: EditingCell['field'], currentValue: string) => {
    setEditingCell({ sessionId, field })
    setEditValue(currentValue)
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveEdit = async (session: SessionWithProject) => {
    if (!editingCell) return

    const updated = { ...session }

    switch (editingCell.field) {
      case 'project_id':
        updated.project_id = parseInt(editValue)
        break
      case 'date': {
        const newDate = new Date(editValue)
        const oldStart = new Date(session.start_at)
        const oldEnd = new Date(session.end_at)
        newDate.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0)
        updated.start_at = newDate.toISOString()
        const endDate = new Date(editValue)
        endDate.setHours(oldEnd.getHours(), oldEnd.getMinutes(), 0, 0)
        updated.end_at = endDate.toISOString()
        break
      }
      case 'start_at': {
        const [hours, minutes] = editValue.split(':').map(Number)
        const newStart = new Date(session.start_at)
        newStart.setHours(hours, minutes, 0, 0)
        updated.start_at = newStart.toISOString()
        break
      }
      case 'end_at': {
        const [hours, minutes] = editValue.split(':').map(Number)
        const newEnd = new Date(session.end_at)
        newEnd.setHours(hours, minutes, 0, 0)
        updated.end_at = newEnd.toISOString()
        break
      }
      case 'notes':
        updated.notes = editValue || null
        break
    }

    await onUpdate(updated)
    cancelEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent, session: SessionWithProject) => {
    if (e.key === 'Enter') {
      saveEdit(session)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT')
  }

  const formatDateForInput = (date: string) => {
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }

  const calcHours = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    return (ms / (1000 * 60 * 60)).toFixed(2)
  }

  const calcDays = (start: string, end: string) => {
    const hours = parseFloat(calcHours(start, end))
    return (hours / 8).toFixed(2)
  }

  const handleAddNew = () => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    const endTime = new Date(now)
    endTime.setHours(endTime.getHours() + 1)

    setNewRow({
      project_id: projects[0]?.id || 0,
      date: now.toISOString().split('T')[0],
      start_at: `${now.getHours().toString().padStart(2, '0')}:00`,
      end_at: `${endTime.getHours().toString().padStart(2, '0')}:00`,
      notes: ''
    })
  }

  const saveNewRow = async () => {
    if (!newRow || !newRow.project_id) return

    const [startH, startM] = newRow.start_at.split(':').map(Number)
    const [endH, endM] = newRow.end_at.split(':').map(Number)

    const startDate = new Date(newRow.date)
    startDate.setHours(startH, startM, 0, 0)

    const endDate = new Date(newRow.date)
    endDate.setHours(endH, endM, 0, 0)

    await onCreate(
      newRow.project_id,
      startDate.toISOString(),
      endDate.toISOString(),
      newRow.notes || undefined
    )
    setNewRow(null)
  }

  const cancelNewRow = () => {
    setNewRow(null)
  }

  return (
    <div className="bg-surface rounded-lg border border-subtle overflow-hidden">
      <div className="flex justify-end p-3 border-b border-subtle">
        <button onClick={handleAddNew} className="btn btn-primary text-sm">
          + Nuova sessione
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-subtle text-left text-sm">
              <th
                className="py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary"
                onClick={() => handleSort('project_name')}
              >
                Progetto {getSortIcon('project_name')}
              </th>
              <th
                className="py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary"
                onClick={() => handleSort('date')}
              >
                Data {getSortIcon('date')}
              </th>
              <th
                className="py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary"
                onClick={() => handleSort('start_at')}
              >
                Inizio {getSortIcon('start_at')}
              </th>
              <th
                className="py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary"
                onClick={() => handleSort('end_at')}
              >
                Fine {getSortIcon('end_at')}
              </th>
              <th
                className="py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary"
                onClick={() => handleSort('notes')}
              >
                Note {getSortIcon('notes')}
              </th>
              <th
                className="py-3 px-4 font-medium text-secondary text-right cursor-pointer hover:text-primary bg-elevated"
                onClick={() => handleSort('hours')}
              >
                Ore {getSortIcon('hours')}
              </th>
              <th
                className="py-3 px-4 font-medium text-secondary text-right cursor-pointer hover:text-primary bg-elevated"
                onClick={() => handleSort('days')}
              >
                Giorni {getSortIcon('days')}
              </th>
              <th className="py-3 px-4 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {/* New row */}
            {newRow && (
              <tr className="border-b border-subtle bg-elevated/50">
                <td className="py-2 px-4">
                  <select
                    value={newRow.project_id}
                    onChange={e => setNewRow({ ...newRow, project_id: parseInt(e.target.value) })}
                    className="select text-sm py-1"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-4">
                  <input
                    type="date"
                    value={newRow.date}
                    onChange={e => setNewRow({ ...newRow, date: e.target.value })}
                    className="input text-sm py-1"
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="time"
                    value={newRow.start_at}
                    onChange={e => setNewRow({ ...newRow, start_at: e.target.value })}
                    className="input text-sm py-1 w-24"
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="time"
                    value={newRow.end_at}
                    onChange={e => setNewRow({ ...newRow, end_at: e.target.value })}
                    className="input text-sm py-1 w-24"
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="text"
                    value={newRow.notes}
                    onChange={e => setNewRow({ ...newRow, notes: e.target.value })}
                    placeholder="Note..."
                    className="input text-sm py-1"
                  />
                </td>
                <td className="py-2 px-4 text-right bg-elevated text-muted">—</td>
                <td className="py-2 px-4 text-right bg-elevated text-muted">—</td>
                <td className="py-2 px-4">
                  <div className="flex gap-1">
                    <button onClick={saveNewRow} className="btn btn-ghost btn-icon text-success" title="Salva">
                      ✓
                    </button>
                    <button onClick={cancelNewRow} className="btn btn-ghost btn-icon text-error" title="Annulla">
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Session rows */}
            {sortedSessions.map(session => (
              <tr key={session.id} className="border-b border-subtle hover:bg-elevated/30 group">
                {/* Project */}
                <td className="py-2 px-4">
                  {editingCell?.sessionId === session.id && editingCell.field === 'project_id' ? (
                    <select
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(session)}
                      onKeyDown={e => handleKeyDown(e, session)}
                      autoFocus
                      className="select text-sm py-1"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div
                      onClick={() => startEdit(session.id, 'project_id', session.project_id.toString())}
                      className="cursor-pointer hover:bg-overlay/50 rounded px-2 py-1 -mx-2"
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: session.project_color }}
                      />
                      {session.project_name}
                    </div>
                  )}
                </td>

                {/* Date */}
                <td className="py-2 px-4">
                  {editingCell?.sessionId === session.id && editingCell.field === 'date' ? (
                    <input
                      type="date"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(session)}
                      onKeyDown={e => handleKeyDown(e, session)}
                      autoFocus
                      className="input text-sm py-1"
                    />
                  ) : (
                    <div
                      onClick={() => startEdit(session.id, 'date', formatDateForInput(session.start_at))}
                      className="cursor-pointer hover:bg-overlay/50 rounded px-2 py-1 -mx-2"
                    >
                      {formatDate(session.start_at)}
                    </div>
                  )}
                </td>

                {/* Start time */}
                <td className="py-2 px-4">
                  {editingCell?.sessionId === session.id && editingCell.field === 'start_at' ? (
                    <input
                      type="time"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(session)}
                      onKeyDown={e => handleKeyDown(e, session)}
                      autoFocus
                      className="input text-sm py-1 w-24"
                    />
                  ) : (
                    <div
                      onClick={() => startEdit(session.id, 'start_at', formatTime(session.start_at))}
                      className="cursor-pointer hover:bg-overlay/50 rounded px-2 py-1 -mx-2 font-mono"
                    >
                      {formatTime(session.start_at)}
                    </div>
                  )}
                </td>

                {/* End time */}
                <td className="py-2 px-4">
                  {editingCell?.sessionId === session.id && editingCell.field === 'end_at' ? (
                    <input
                      type="time"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(session)}
                      onKeyDown={e => handleKeyDown(e, session)}
                      autoFocus
                      className="input text-sm py-1 w-24"
                    />
                  ) : (
                    <div
                      onClick={() => startEdit(session.id, 'end_at', formatTime(session.end_at))}
                      className="cursor-pointer hover:bg-overlay/50 rounded px-2 py-1 -mx-2 font-mono"
                    >
                      {formatTime(session.end_at)}
                    </div>
                  )}
                </td>

                {/* Notes */}
                <td className="py-2 px-4">
                  {editingCell?.sessionId === session.id && editingCell.field === 'notes' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(session)}
                      onKeyDown={e => handleKeyDown(e, session)}
                      autoFocus
                      placeholder="Note..."
                      className="input text-sm py-1"
                    />
                  ) : (
                    <div
                      onClick={() => startEdit(session.id, 'notes', session.notes || '')}
                      className="cursor-pointer hover:bg-overlay/50 rounded px-2 py-1 -mx-2 min-h-[28px] text-secondary"
                    >
                      {session.notes || <span className="text-muted italic">—</span>}
                    </div>
                  )}
                </td>

                {/* Hours (calculated) */}
                <td className="py-2 px-4 text-right bg-elevated font-mono text-secondary">
                  {calcHours(session.start_at, session.end_at)}
                </td>

                {/* Days (calculated) */}
                <td className="py-2 px-4 text-right bg-elevated font-mono text-secondary">
                  {calcDays(session.start_at, session.end_at)}
                </td>

                {/* Delete */}
                <td className="py-2 px-4 relative">
                  {confirmDelete === session.id ? (
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => { onDelete(session.id); setConfirmDelete(null) }}
                        className="btn btn-danger text-xs py-1 px-2"
                      >
                        Sì
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="btn btn-ghost text-xs py-1 px-2"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(session.id)}
                      className="btn btn-ghost btn-icon opacity-0 group-hover:opacity-100 text-muted hover:text-error"
                      title="Elimina"
                    >
                      🗑
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {sortedSessions.length === 0 && !newRow && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted">
                  Nessuna sessione nel periodo selezionato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/SessionsTable.tsx
git commit -m "feat: create SessionsTable component with inline editing"
```

---

## Task 5: Update Reports page with tabs

**Files:**
- Modify: `src/renderer/pages/Reports.tsx`

**Step 1: Rewrite Reports.tsx with tab functionality**

```typescript
import { useState, useMemo } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useProjects } from '../hooks/useProjects'
import SessionsTable from '../components/SessionsTable'
import type { SessionWithProject } from '@shared/types'

type Tab = 'tracker' | 'tabella'

export default function Reports() {
  const [tab, setTab] = useState<Tab>('tracker')
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [customEnd, setCustomEnd] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const { start_date, end_date } = useMemo(() => {
    const start = new Date(customStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(customEnd)
    end.setHours(23, 59, 59, 999)
    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    }
  }, [customStart, customEnd])

  const { sessions, loading, create, update, remove } = useSessions({ start_date, end_date })
  const { projects } = useProjects()

  const projectStats = useMemo(() => {
    const stats: Record<number, { name: string; client: string | null; minutes: number }> = {}

    sessions.forEach(s => {
      const duration = (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / (1000 * 60)
      if (!stats[s.project_id]) {
        stats[s.project_id] = { name: s.project_name, client: s.client_name, minutes: 0 }
      }
      stats[s.project_id].minutes += duration
    })

    return Object.values(stats).sort((a, b) => b.minutes - a.minutes)
  }, [sessions])

  const dateStats = useMemo(() => {
    const stats: Record<string, number> = {}

    sessions.forEach(s => {
      const date = new Date(s.start_at).toLocaleDateString('it-IT')
      const duration = (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / (1000 * 60)
      stats[date] = (stats[date] || 0) + duration
    })

    return Object.entries(stats)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime())
  }, [sessions])

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  const formatDays = (minutes: number) => (minutes / 60 / 8).toFixed(2)

  const totalMinutes = projectStats.reduce((sum, p) => sum + p.minutes, 0)

  const handleUpdate = async (session: SessionWithProject) => {
    await update({
      id: session.id,
      project_id: session.project_id,
      start_at: session.start_at,
      end_at: session.end_at,
      notes: session.notes
    })
  }

  const handleCreate = async (projectId: number, startAt: string, endAt: string, notes?: string) => {
    await create({
      project_id: projectId,
      start_at: startAt,
      end_at: endAt,
      notes
    })
  }

  const handleDelete = async (id: number) => {
    await remove(id)
  }

  if (loading) return <div className="p-4 text-secondary">Caricamento...</div>

  return (
    <div className="h-full overflow-auto">
      <h1 className="text-2xl font-bold mb-4">Report</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-subtle">
        <button
          onClick={() => setTab('tracker')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'tracker'
              ? 'border-prism-violet text-primary'
              : 'border-transparent text-muted hover:text-secondary'
          }`}
        >
          Tracker
        </button>
        <button
          onClick={() => setTab('tabella')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'tabella'
              ? 'border-prism-violet text-primary'
              : 'border-transparent text-muted hover:text-secondary'
          }`}
        >
          Tabella
        </button>
      </div>

      {/* Date filters */}
      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="text-sm text-secondary block mb-1">Da</label>
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="text-sm text-secondary block mb-1">A</label>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Tab content */}
      {tab === 'tracker' ? (
        <div className="grid grid-cols-2 gap-6">
          <div className="card p-4">
            <h2 className="text-lg font-semibold mb-3">Riepilogo per Progetto</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-subtle text-left">
                  <th className="py-2 text-secondary font-medium">Progetto</th>
                  <th className="py-2 text-secondary font-medium">Cliente</th>
                  <th className="py-2 text-right text-secondary font-medium">Ore</th>
                  <th className="py-2 text-right text-secondary font-medium">Giorni</th>
                </tr>
              </thead>
              <tbody>
                {projectStats.map((p, i) => (
                  <tr key={i} className="border-b border-subtle">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-secondary">{p.client || '—'}</td>
                    <td className="py-2 text-right font-mono">{formatMinutes(p.minutes)}</td>
                    <td className="py-2 text-right font-mono">{formatDays(p.minutes)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2">TOTALE</td>
                  <td></td>
                  <td className="py-2 text-right font-mono">{formatMinutes(totalMinutes)}</td>
                  <td className="py-2 text-right font-mono">{formatDays(totalMinutes)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card p-4">
            <h2 className="text-lg font-semibold mb-3">Riepilogo per Data</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-subtle text-left">
                  <th className="py-2 text-secondary font-medium">Data</th>
                  <th className="py-2 text-right text-secondary font-medium">Ore</th>
                  <th className="py-2 text-right text-secondary font-medium">Giorni</th>
                </tr>
              </thead>
              <tbody>
                {dateStats.map((d, i) => (
                  <tr key={i} className="border-b border-subtle">
                    <td className="py-2">{d.date}</td>
                    <td className="py-2 text-right font-mono">{formatMinutes(d.minutes)}</td>
                    <td className="py-2 text-right font-mono">{formatDays(d.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <SessionsTable
          sessions={sessions}
          projects={projects}
          onUpdate={handleUpdate}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/Reports.tsx
git commit -m "feat: add tabs to Reports page with sessions table view"
```

---

## Task 6: Add CSS variables for border-prism-violet

**Files:**
- Modify: `src/renderer/index.css`

**Step 1: Add border utility class**

Add after line 127 (after `.border-default`):

```css
.border-prism-violet { border-color: var(--prism-violet); }
```

**Step 2: Commit**

```bash
git add src/renderer/index.css
git commit -m "feat: add border-prism-violet utility class"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add notes to TypeScript types | `src/shared/types.ts` |
| 2 | Add notes column to DB schema | `src/main/database.ts` |
| 3 | Update IPC handlers for notes | `src/main/ipc.ts` |
| 4 | Create SessionsTable component | `src/renderer/components/SessionsTable.tsx` |
| 5 | Update Reports with tabs | `src/renderer/pages/Reports.tsx` |
| 6 | Add CSS utility class | `src/renderer/index.css` |

**Total commits:** 6
