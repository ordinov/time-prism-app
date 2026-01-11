# Activities Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add activities (e.g., Sviluppo, Integrazione, Testing) to sessions for better aggregate data control.

**Architecture:** Hybrid activity system - global activities available everywhere, project-specific activities for customization. Activities are optional on sessions and can be set via timeline modal or table column.

**Tech Stack:** SQLite, Electron IPC, React, React Query, TypeScript

---

## Task 1: Database Schema

**Files:**
- Modify: `src/main/database.ts:52-63`

**Step 1: Add activities table and migration**

After the existing `settings` table creation (line 52), add the activities table. Then add migration for sessions.activity_id column.

```typescript
// After line 51 (end of settings table), add:
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
```

**Step 2: Add migration for activity_id column in sessions**

After the existing `hasNotesColumn` migration block (lines 54-61), add:

```typescript
  // Migration: add activity_id column if not exists
  const hasActivityColumn = db.prepare(`
    SELECT COUNT(*) as count FROM pragma_table_info('sessions') WHERE name='activity_id'
  `).get() as { count: number }

  if (hasActivityColumn.count === 0) {
    db.exec(`ALTER TABLE sessions ADD COLUMN activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL`)
  }
```

**Step 3: Verify changes**

Manually restart the app to verify the database schema is created correctly.

**Step 4: Commit**

```bash
git add src/main/database.ts
git commit -m "feat(db): add activities table and sessions.activity_id column"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: Add Activity entity types**

After the `Session` interface (line 25), add:

```typescript
export interface Activity {
  id: number
  name: string
  project_id: number | null
  created_at: string
}

export interface ActivityWithProject extends Activity {
  project_name: string | null
  project_color: string | null
}
```

**Step 2: Update Session and SessionWithProject**

Add `activity_id` to `Session` interface:

```typescript
export interface Session {
  id: number
  project_id: number
  activity_id: number | null  // Add this line
  start_at: string
  end_at: string
  notes: string | null
  created_at: string
  updated_at: string
}
```

Add activity fields to `SessionWithProject`:

```typescript
export interface SessionWithProject extends Session {
  project_name: string
  project_color: string
  client_name: string | null
  activity_name: string | null  // Add this line
}
```

**Step 3: Add Activity input types**

After `UpdateSessionInput` (line 80), add:

```typescript
export interface CreateActivityInput {
  name: string
  project_id?: number | null
}

export interface UpdateActivityInput {
  id: number
  name: string
  project_id?: number | null
}

export interface ActivityQuery {
  project_id?: number | null
  includeGlobal?: boolean
}
```

**Step 4: Update Session input types**

Add `activity_id` to `CreateSessionInput` and `UpdateSessionInput`:

```typescript
export interface CreateSessionInput {
  project_id: number
  start_at: string
  end_at: string
  notes?: string | null
  activity_id?: number | null  // Add this line
}

export interface UpdateSessionInput {
  id: number
  project_id: number
  start_at: string
  end_at: string
  notes?: string | null
  activity_id?: number | null  // Add this line
}
```

**Step 5: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add Activity types and update Session types"
```

---

## Task 3: IPC Handlers

**Files:**
- Modify: `src/main/ipc.ts`

**Step 1: Add Activity type imports**

Update the import statement at line 5-12 to include Activity types:

```typescript
import type {
  Client, Project, Session, Activity,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  CreateActivityInput, UpdateActivityInput,
  SessionQuery, ActivityQuery,
  ProjectWithClient, ProjectWithStats, SessionWithProject, ActivityWithProject,
  Setting, SettingsMap, BackupConfig
} from '../shared/types'
```

**Step 2: Update sessions:list handler to include activity_name**

Modify the SQL query in `db:sessions:list` handler (around line 117) to include activity join:

```typescript
    let sql = `
      SELECT s.*, p.name as project_name, p.color as project_color, c.name as client_name,
             a.name as activity_name
      FROM sessions s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN activities a ON s.activity_id = a.id
      WHERE ${whereClause}
      ORDER BY s.start_at
    `
```

**Step 3: Update sessions:create handler**

Modify the INSERT statement (around line 173):

```typescript
  ipcMain.handle('db:sessions:create', (_, input: CreateSessionInput): Session => {
    const db = getDatabase()
    const result = db.prepare(
      'INSERT INTO sessions (project_id, start_at, end_at, notes, activity_id) VALUES (?, ?, ?, ?, ?)'
    ).run(input.project_id, input.start_at, input.end_at, input.notes ?? null, input.activity_id ?? null)
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid) as Session
  })
```

**Step 4: Update sessions:update handler**

Modify the UPDATE statement (around line 179):

```typescript
  ipcMain.handle('db:sessions:update', (_, input: UpdateSessionInput): Session => {
    const db = getDatabase()
    db.prepare(
      'UPDATE sessions SET project_id = ?, start_at = ?, end_at = ?, notes = ?, activity_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(input.project_id, input.start_at, input.end_at, input.notes ?? null, input.activity_id ?? null, input.id)
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(input.id) as Session
  })
```

**Step 5: Add Activities handlers**

Before the `// Backup` section (around line 198), add all activities handlers:

```typescript
  // Activities
  ipcMain.handle('db:activities:list', (_, query: ActivityQuery = {}): ActivityWithProject[] => {
    const db = getDatabase()

    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    // Filter by project_id or include global
    if (query.project_id !== undefined) {
      if (query.includeGlobal !== false) {
        // Include global activities (project_id IS NULL) and project-specific ones
        conditions.push('(a.project_id IS NULL OR a.project_id = ?)')
        params.push(query.project_id)
      } else {
        // Only project-specific activities
        conditions.push('a.project_id = ?')
        params.push(query.project_id)
      }
    }

    const sql = `
      SELECT a.*, p.name as project_name, p.color as project_color
      FROM activities a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.project_id IS NOT NULL, a.name
    `

    return db.prepare(sql).all(...params) as ActivityWithProject[]
  })

  ipcMain.handle('db:activities:create', (_, input: CreateActivityInput): Activity => {
    const db = getDatabase()
    const result = db.prepare(
      'INSERT INTO activities (name, project_id) VALUES (?, ?)'
    ).run(input.name, input.project_id ?? null)
    return db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid) as Activity
  })

  ipcMain.handle('db:activities:update', (_, input: UpdateActivityInput): Activity => {
    const db = getDatabase()
    db.prepare(
      'UPDATE activities SET name = ?, project_id = ? WHERE id = ?'
    ).run(input.name, input.project_id ?? null, input.id)
    return db.prepare('SELECT * FROM activities WHERE id = ?').get(input.id) as Activity
  })

  ipcMain.handle('db:activities:delete', (_, id: number): void => {
    const db = getDatabase()
    db.prepare('DELETE FROM activities WHERE id = ?').run(id)
  })
```

**Step 6: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat(ipc): add activities handlers and update sessions handlers"
```

---

## Task 4: Preload API

**Files:**
- Modify: `src/main/preload.ts`

**Step 1: Add Activity type imports**

Update imports at line 2-9:

```typescript
import type {
  Client, Project, Session, Activity,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  CreateActivityInput, UpdateActivityInput,
  SessionQuery, ActivityQuery,
  ProjectWithStats, SessionWithProject, ActivityWithProject,
  SettingsMap, BackupInfo, RestoreResult, BackupConfig
} from '../shared/types'
```

**Step 2: Add activities API**

After the `sessions` object (line 31), add:

```typescript
  activities: {
    list: (query?: ActivityQuery): Promise<ActivityWithProject[]> =>
      ipcRenderer.invoke('db:activities:list', query),
    create: (input: CreateActivityInput): Promise<Activity> =>
      ipcRenderer.invoke('db:activities:create', input),
    update: (input: UpdateActivityInput): Promise<Activity> =>
      ipcRenderer.invoke('db:activities:update', input),
    delete: (id: number): Promise<void> =>
      ipcRenderer.invoke('db:activities:delete', id),
  },
```

**Step 3: Commit**

```bash
git add src/main/preload.ts
git commit -m "feat(preload): expose activities API to renderer"
```

---

## Task 5: Activity Service

**Files:**
- Create: `src/renderer/services/activityService.ts`

**Step 1: Create the service file**

```typescript
/**
 * Activity Service
 * Centralizes all activity-related business logic and API calls
 */

import type {
  Activity,
  ActivityWithProject,
  CreateActivityInput,
  UpdateActivityInput,
  ActivityQuery,
} from '@shared/types'

/**
 * Validation error for activity operations
 */
export class ActivityValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActivityValidationError'
  }
}

/**
 * Validate activity input
 */
function validateActivityInput(input: { name?: string }): void {
  if (input.name !== undefined && !input.name.trim()) {
    throw new ActivityValidationError('Activity name is required')
  }
}

export const activityService = {
  // ============================================
  // API Operations
  // ============================================

  /**
   * List activities with optional filtering
   */
  async list(query: ActivityQuery = {}): Promise<ActivityWithProject[]> {
    return window.api.activities.list(query)
  },

  /**
   * Create a new activity with validation
   */
  async create(input: CreateActivityInput): Promise<Activity> {
    validateActivityInput(input)
    return window.api.activities.create(input)
  },

  /**
   * Update an existing activity with validation
   */
  async update(input: UpdateActivityInput): Promise<Activity> {
    validateActivityInput(input)
    return window.api.activities.update(input)
  },

  /**
   * Delete an activity by ID
   */
  async delete(id: number): Promise<void> {
    return window.api.activities.delete(id)
  },

  // ============================================
  // Business Logic (Pure Functions)
  // ============================================

  /**
   * Filter global activities (no project association)
   */
  filterGlobal(activities: ActivityWithProject[]): ActivityWithProject[] {
    return activities.filter(a => a.project_id === null)
  },

  /**
   * Filter activities by project ID
   */
  filterByProject(activities: ActivityWithProject[], projectId: number): ActivityWithProject[] {
    return activities.filter(a => a.project_id === projectId)
  },

  /**
   * Get activities available for a specific project
   * (global activities + project-specific activities)
   */
  getAvailableForProject(activities: ActivityWithProject[], projectId: number): ActivityWithProject[] {
    return activities.filter(a => a.project_id === null || a.project_id === projectId)
  },

  /**
   * Sort activities by name
   */
  sortByName(activities: ActivityWithProject[], direction: 'asc' | 'desc' = 'asc'): ActivityWithProject[] {
    return [...activities].sort((a, b) => {
      const diff = a.name.localeCompare(b.name)
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Search activities by name (case-insensitive)
   */
  searchByName(activities: ActivityWithProject[], query: string): ActivityWithProject[] {
    if (!query.trim()) return activities
    const lowerQuery = query.toLowerCase()
    return activities.filter(a => a.name.toLowerCase().includes(lowerQuery))
  },
}
```

**Step 2: Commit**

```bash
git add src/renderer/services/activityService.ts
git commit -m "feat(service): add activityService"
```

---

## Task 6: useActivities Hook

**Files:**
- Create: `src/renderer/hooks/useActivities.ts`

**Step 1: Create the hook file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ActivityWithProject, CreateActivityInput, UpdateActivityInput, ActivityQuery } from '@shared/types'
import { activityService } from '../services/activityService'
import { sessionKeys } from './useSessions'

// ============================================
// Query Keys
// ============================================

export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (query: ActivityQuery) => [...activityKeys.lists(), query] as const,
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch activities
 * Uses React Query for caching and automatic refetching
 */
export function useActivities(query: ActivityQuery = {}) {
  const queryClient = useQueryClient()

  const {
    data: activities = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: activityKeys.list(query),
    queryFn: () => activityService.list(query),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateActivityInput) => activityService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateActivityInput) => activityService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      // Also invalidate sessions as they contain activity info
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => activityService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  return {
    activities,
    loading,
    error: error instanceof Error ? error.message : null,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    reload: refetch,
    // Expose mutation states for UI feedback
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

/**
 * Hook to create an activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateActivityInput) => activityService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })
}

/**
 * Hook to update an activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateActivityInput) => activityService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

/**
 * Hook to delete an activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => activityService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}
```

**Step 2: Commit**

```bash
git add src/renderer/hooks/useActivities.ts
git commit -m "feat(hooks): add useActivities hook"
```

---

## Task 7: Projects Page - Tab Activities

**Files:**
- Modify: `src/renderer/pages/Projects.tsx`

This is a large modification. The approach is to:
1. Add state for active tab
2. Import useActivities hook
3. Add tab buttons
4. Duplicate the project list logic for activities tab

**Step 1: Add imports**

At the top of the file, add:

```typescript
import { useActivities } from '../hooks/useActivities'
import type { ActivityWithProject } from '@shared/types'
```

**Step 2: Add tab state and activities hook**

Inside the component, after line 65 (`const { clients } = useClients()`), add:

```typescript
  const [activeTab, setActiveTab] = useState<'projects' | 'activities'>('projects')
  const { activities, create: createActivity, update: updateActivity, remove: removeActivity } = useActivities()
```

**Step 3: Add activities form state**

After `deleteModal` state (line 77), add:

```typescript
  const [deleteActivityModal, setDeleteActivityModal] = useState<{ activity: ActivityWithProject } | null>(null)
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null)
  const [activityFormName, setActivityFormName] = useState('')
  const [activityFormProjectId, setActivityFormProjectId] = useState<number | null>(null)
```

**Step 4: Add activities filter state and handlers**

```typescript
  const [activitySearch, setActivitySearch] = useState('')

  const filteredActivities = activities.filter(a => {
    if (activitySearch && !a.name.toLowerCase().includes(activitySearch.toLowerCase())) return false
    return true
  })

  const resetActivityForm = () => {
    setActivityFormName('')
    setActivityFormProjectId(null)
    setIsAddingActivity(false)
    setEditingActivityId(null)
  }

  const handleCreateActivity = async () => {
    if (!activityFormName.trim()) return
    try {
      await createActivity({ name: activityFormName.trim(), project_id: activityFormProjectId })
      showToast('Attivit\u00e0 creata', 'success')
      resetActivityForm()
    } catch (err) {
      showToast('Errore nella creazione dell\'attivit\u00e0', 'error')
    }
  }

  const handleUpdateActivity = async () => {
    if (!activityFormName.trim() || !editingActivityId) return
    try {
      await updateActivity({
        id: editingActivityId,
        name: activityFormName.trim(),
        project_id: activityFormProjectId
      })
      showToast('Attivit\u00e0 aggiornata', 'success')
      resetActivityForm()
    } catch (err) {
      showToast('Errore nell\'aggiornamento dell\'attivit\u00e0', 'error')
    }
  }

  const startEditActivity = (activity: ActivityWithProject) => {
    setEditingActivityId(activity.id)
    setActivityFormName(activity.name)
    setActivityFormProjectId(activity.project_id)
    setIsAddingActivity(false)
  }

  const handleDeleteActivity = async (id: number) => {
    try {
      await removeActivity(id)
      showToast('Attivit\u00e0 eliminata', 'success')
      setDeleteActivityModal(null)
    } catch (err) {
      showToast('Errore nell\'eliminazione dell\'attivit\u00e0', 'error')
    }
  }
```

**Step 5: Modify the render**

Replace the header section (starting around line 194) with tabbed header:

```tsx
      {/* Header with tabs */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-[var(--bg-surface)] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'projects'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Progetti
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'activities'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Attivit\u00e0
            </button>
          </div>
        </div>
        {activeTab === 'projects' ? (
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
        ) : (
          <button
            onClick={() => {
              setActivityFormName('')
              setActivityFormProjectId(null)
              setEditingActivityId(null)
              setIsAddingActivity(true)
            }}
            className="btn btn-primary"
          >
            <PlusIcon />
            <span>Nuova attivit\u00e0</span>
          </button>
        )}
      </div>
```

**Step 6: Wrap existing content in conditional render and add activities tab**

After filters section, wrap the existing projects content in `{activeTab === 'projects' && (...)}`

Then add activities tab content:

```tsx
      {activeTab === 'activities' && (
        <>
          {/* Activity search filter */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-[2] min-w-0">
              <input
                type="text"
                placeholder="Cerca attivit\u00e0..."
                value={activitySearch}
                onChange={e => setActivitySearch(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Form for new activity */}
          {isAddingActivity && (
            <div className="card p-5 mb-6 space-y-4 animate-scale-in">
              <div className="flex items-end gap-4">
                <div className="flex-1 min-w-0">
                  <label className="text-sm text-[var(--text-muted)] mb-2 block">Nome attivit\u00e0</label>
                  <input
                    type="text"
                    placeholder="Nome attivit\u00e0"
                    value={activityFormName}
                    onChange={e => setActivityFormName(e.target.value)}
                    className="input w-full"
                    autoFocus
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-sm text-[var(--text-muted)] mb-2 block">Progetto (opzionale)</label>
                  <select
                    value={activityFormProjectId ?? ''}
                    onChange={e => setActivityFormProjectId(e.target.value ? Number(e.target.value) : null)}
                    className="select w-full"
                  >
                    <option value="">Globale (tutti i progetti)</option>
                    {projects.filter(p => !p.archived).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={resetActivityForm} className="btn btn-secondary">
                  Annulla
                </button>
                <button onClick={handleCreateActivity} className="btn btn-primary">
                  Crea attivit\u00e0
                </button>
              </div>
            </div>
          )}

          {/* Activities table */}
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1.5fr_1fr_auto] gap-4 px-4 py-3
                            bg-[var(--bg-overlay)] border-b border-[var(--border-subtle)]
                            text-sm font-medium text-[var(--text-muted)]">
              <div>Nome</div>
              <div>Progetto</div>
              <div className="w-[60px]"></div>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {filteredActivities.map(activity => (
                editingActivityId === activity.id ? (
                  <div key={activity.id} className="p-5 space-y-4 animate-scale-in bg-[var(--bg-surface)]">
                    <div className="flex items-end gap-4">
                      <div className="flex-1 min-w-0">
                        <label className="text-sm text-[var(--text-muted)] mb-2 block">Nome attivit\u00e0</label>
                        <input
                          type="text"
                          placeholder="Nome attivit\u00e0"
                          value={activityFormName}
                          onChange={e => setActivityFormName(e.target.value)}
                          className="input w-full"
                          autoFocus
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-sm text-[var(--text-muted)] mb-2 block">Progetto (opzionale)</label>
                        <select
                          value={activityFormProjectId ?? ''}
                          onChange={e => setActivityFormProjectId(e.target.value ? Number(e.target.value) : null)}
                          className="select w-full"
                        >
                          <option value="">Globale (tutti i progetti)</option>
                          {projects.filter(p => !p.archived).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={resetActivityForm} className="btn btn-secondary">
                        Annulla
                      </button>
                      <button onClick={handleUpdateActivity} className="btn btn-primary">
                        Aggiorna
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={activity.id}
                    className="grid grid-cols-[1.5fr_1fr_auto] gap-4 px-4 py-3
                               items-center group hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <div className="font-medium text-[var(--text-primary)] truncate">
                      {activity.name}
                    </div>
                    <div className="text-[var(--text-secondary)] truncate flex items-center gap-2">
                      {activity.project_id ? (
                        <>
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: activity.project_color || '#888' }}
                          />
                          {activity.project_name}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)]">Globale</span>
                      )}
                    </div>
                    <div className="flex gap-1 justify-end w-[60px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditActivity(activity)}
                        className="btn btn-ghost btn-icon"
                        title="Modifica"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => setDeleteActivityModal({ activity })}
                        className="btn btn-ghost btn-icon text-[var(--error)] hover:bg-[var(--error-muted)]"
                        title="Elimina"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                )
              ))}

              {filteredActivities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                  <FolderIcon />
                  <p className="mt-4 text-lg">Nessuna attivit\u00e0 trovata</p>
                  <p className="text-sm mt-1">
                    {activitySearch ? 'Prova a modificare la ricerca' : 'Crea la tua prima attivit\u00e0'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Delete activity confirmation modal */}
          {deleteActivityModal && (
            <ConfirmModal
              isOpen={true}
              title="Elimina attivit\u00e0"
              message={`Vuoi eliminare l'attivit\u00e0 "${deleteActivityModal.activity.name}"?`}
              confirmLabel="Elimina"
              cancelLabel="Annulla"
              danger
              onConfirm={() => handleDeleteActivity(deleteActivityModal.activity.id)}
              onClose={() => setDeleteActivityModal(null)}
            />
          )}
        </>
      )}
```

**Step 7: Commit**

```bash
git add src/renderer/pages/Projects.tsx
git commit -m "feat(ui): add Activities tab to Projects page"
```

---

## Task 8: Session Modal Component

**Files:**
- Modify: `src/renderer/components/Timeline/NoteModal.tsx`

Rename and extend the NoteModal to handle both notes and activity selection.

**Step 1: Update props interface**

```typescript
import type { ActivityWithProject } from '@shared/types'

interface Props {
  isOpen: boolean
  sessionId: number
  startAt: string
  endAt: string
  currentNote: string | null
  currentActivityId: number | null
  activities: ActivityWithProject[]
  onSave: (sessionId: number, notes: string | null, activityId: number | null) => void
  onClose: () => void
}
```

**Step 2: Add activity state**

Inside the component, add:

```typescript
const [activityId, setActivityId] = useState<number | null>(currentActivityId)

// Update useEffect to include activityId
useEffect(() => {
  if (isOpen) {
    setNote(currentNote ?? '')
    setActivityId(currentActivityId)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }
}, [isOpen, sessionId, currentNote, currentActivityId])
```

**Step 3: Update handleSave**

```typescript
const handleSave = useCallback(() => {
  const trimmedNote = note.trim()
  onSave(sessionId, trimmedNote || null, activityId)
  onClose()
}, [note, activityId, sessionId, onSave, onClose])
```

**Step 4: Update modal content**

Add activity select before the textarea:

```tsx
{/* Content */}
<div className="p-6 space-y-4">
  {/* Activity select */}
  <div>
    <label className="text-sm text-[var(--text-muted)] mb-2 block">
      Attivit\u00e0 (opzionale)
    </label>
    <select
      value={activityId ?? ''}
      onChange={(e) => setActivityId(e.target.value ? Number(e.target.value) : null)}
      className="select w-full"
    >
      <option value="">Nessuna attivit\u00e0</option>
      {activities.map(a => (
        <option key={a.id} value={a.id}>
          {a.name}
          {a.project_id ? '' : ' (Globale)'}
        </option>
      ))}
    </select>
  </div>

  {/* Note textarea */}
  <div>
    <label className="text-sm text-[var(--text-muted)] mb-2 block">
      Note (opzionale)
    </label>
    <textarea
      ref={textareaRef}
      value={note}
      onChange={(e) => setNote(e.target.value)}
      placeholder="Descrivi l'attivit\u00e0 svolta..."
      className="w-full h-28 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                 rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)]
                 focus:outline-none focus:border-[var(--prism-violet)] focus:ring-1 focus:ring-[var(--prism-violet)]
                 resize-none"
    />
  </div>
  <p className="text-xs text-[var(--text-muted)]">
    Ctrl+Enter per salvare, Esc per annullare
  </p>
</div>
```

**Step 5: Commit**

```bash
git add src/renderer/components/Timeline/NoteModal.tsx
git commit -m "feat(ui): extend NoteModal with activity selection"
```

---

## Task 9: TimelineTrack - Open Modal on Session Create

**Files:**
- Modify: `src/renderer/components/Timeline/TimelineTrack.tsx`

**Step 1: Update props to include activities and onCreateSessionWithModal**

Add to Props interface:

```typescript
import type { SessionWithProject, ActivityWithProject } from '@shared/types'

// In Props interface:
activities: ActivityWithProject[]
onCreateSessionWithModal: (projectId: number, startAt: Date, endAt: Date) => void
```

**Step 2: Modify handleMouseUp to call onCreateSessionWithModal**

Change the session creation logic in `handleMouseUp`:

```typescript
const handleMouseUp = () => {
  if (isDragging && dragStart !== null && dragEnd !== null) {
    const startX = Math.min(dragStart, dragEnd)
    const endX = Math.max(dragStart, dragEnd)
    if (endX - startX > 10) {
      const startDate = snapToGrid(positionToDate(startX, viewStart, pixelsPerHour))
      const endDate = snapToGrid(positionToDate(endX, viewStart, pixelsPerHour))
      // Call the new handler that opens the modal
      onCreateSessionWithModal(projectId, startDate, endDate)
    }
  }
  setIsDragging(false)
  setDragStart(null)
  setDragEnd(null)
}
```

**Step 3: Update NoteModal usage to include activities**

Where NoteModal is rendered, update to pass activities and handle activity:

```tsx
{/* Note Modal */}
{noteModal && (
  <NoteModal
    isOpen={true}
    sessionId={noteModal.session.id}
    startAt={noteModal.session.start_at}
    endAt={noteModal.session.end_at}
    currentNote={noteModal.session.notes}
    currentActivityId={noteModal.session.activity_id}
    activities={activities}
    onSave={(sessionId, notes, activityId) => {
      onUpdateSessionNote(sessionId, notes)
      // Need to also update activity - this requires extending the handler
    }}
    onClose={() => setNoteModal(null)}
  />
)}
```

**Step 4: Commit**

```bash
git add src/renderer/components/Timeline/TimelineTrack.tsx
git commit -m "feat(ui): open modal on session creation in timeline"
```

---

## Task 10: Timeline Component - Wire Up Session Creation Modal

**Files:**
- Modify: `src/renderer/components/Timeline/Timeline.tsx` (if exists) or wherever Timeline orchestrates TimelineTrack

This task requires finding the Timeline parent component and:
1. Adding state for "pending session" (projectId, startAt, endAt)
2. Showing the modal when pending session is set
3. On modal save, create the session with notes and activity

**Step 1: Locate and read Timeline.tsx**

**Step 2: Add pending session state and modal**

```typescript
const [pendingSession, setPendingSession] = useState<{
  projectId: number
  startAt: Date
  endAt: Date
} | null>(null)
```

**Step 3: Add handler for creating session with modal**

```typescript
const handleCreateSessionWithModal = (projectId: number, startAt: Date, endAt: Date) => {
  setPendingSession({ projectId, startAt, endAt })
}
```

**Step 4: Pass handler to TimelineTrack**

**Step 5: Render modal for pending session**

```tsx
{pendingSession && (
  <NoteModal
    isOpen={true}
    sessionId={0}  // New session, no ID yet
    startAt={pendingSession.startAt.toISOString()}
    endAt={pendingSession.endAt.toISOString()}
    currentNote={null}
    currentActivityId={null}
    activities={activities.filter(a => a.project_id === null || a.project_id === pendingSession.projectId)}
    onSave={(_, notes, activityId) => {
      onCreateSession(
        pendingSession.projectId,
        pendingSession.startAt.toISOString(),
        pendingSession.endAt.toISOString(),
        notes,
        activityId
      )
      setPendingSession(null)
    }}
    onClose={() => setPendingSession(null)}
  />
)}
```

**Step 6: Commit**

```bash
git add src/renderer/components/Timeline/Timeline.tsx
git commit -m "feat(ui): add session creation modal to Timeline"
```

---

## Task 11: SessionsTable - Activity Column

**Files:**
- Modify: `src/renderer/components/SessionsTable.tsx`

**Step 1: Add activities to props**

```typescript
import type { SessionWithProject, ProjectWithClient, ActivityWithProject } from '@shared/types'

interface Props {
  sessions: SessionWithProject[]
  totalSessions?: number
  projects: ProjectWithClient[]
  activities: ActivityWithProject[]  // Add this
  currentDate: Date
  onUpdate: (session: SessionWithProject) => Promise<void>
  onCreate: (projectId: number, startAt: string, endAt: string, notes?: string, activityId?: number | null) => Promise<void>
  onDelete: (id: number) => Promise<void>
}
```

**Step 2: Add activity to EditingCell and NewRowData types**

```typescript
interface EditingCell {
  sessionId: number
  field: 'project' | 'date' | 'start' | 'end' | 'activity' | 'notes'  // Add 'activity'
}

interface NewRowData {
  projectId: number | null
  date: string
  start: string
  end: string
  activityId: number | null  // Add this
  notes: string
}
```

**Step 3: Add activity column header**

After "Fine" column header (around line 710), add:

```tsx
<th
  onClick={() => handleSort('activity')}
  className="text-left px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
>
  <span className="flex items-center gap-2">
    Attivit\u00e0
    <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('activity')}</span>
  </span>
</th>
```

**Step 4: Update SortKey type**

```typescript
type SortKey = 'client' | 'project' | 'date' | 'start' | 'end' | 'activity' | 'notes' | 'hours' | 'days'
```

**Step 5: Add sorting logic for activity**

In the sort switch statement:

```typescript
case 'activity':
  comparison = (a.activity_name || '').localeCompare(b.activity_name || '')
  break
```

**Step 6: Add renderCell case for activity**

```typescript
case 'activity':
  return (
    <div
      onClick={() => startEdit(session, field)}
      className={cellClasses}
    >
      {session.activity_name || <span className="text-[var(--text-muted)]">\u2014</span>}
    </div>
  )
```

**Step 7: Add activity edit mode**

In the isEditing switch:

```typescript
case 'activity':
  const availableActivities = activities.filter(
    a => a.project_id === null || a.project_id === session.project_id
  )
  return (
    <select
      ref={inputRef as React.RefObject<HTMLSelectElement>}
      value={editValue}
      onChange={e => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className="select w-full py-1 text-sm"
    >
      <option value="">Nessuna attivit\u00e0</option>
      {availableActivities.map(a => (
        <option key={a.id} value={a.id}>
          {a.name}{a.project_id ? '' : ' (Globale)'}
        </option>
      ))}
    </select>
  )
```

**Step 8: Update startEdit for activity**

```typescript
case 'activity':
  setEditValue(session.activity_id?.toString() || '')
  break
```

**Step 9: Update saveEdit for activity**

```typescript
case 'activity': {
  updatedSession.activity_id = editValue ? parseInt(editValue) : null
  break
}
```

**Step 10: Add activity cell to table row**

After the "end" cell and before "notes" cell:

```tsx
<td className="min-w-[150px]">{renderCell(session, 'activity')}</td>
```

**Step 11: Replace notes column with icon button**

Change the notes cell to show an icon instead of text:

```typescript
case 'notes':
  return (
    <div className={`${cellClasses} flex items-center justify-center`}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setNoteViewModal({ note: session.notes || '', sessionId: session.id })
        }}
        className={`p-1.5 rounded transition-colors ${
          session.notes
            ? 'text-[var(--prism-violet)] hover:bg-[var(--prism-violet)]/10'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5'
        }`}
        title={session.notes ? 'Visualizza/modifica nota' : 'Aggiungi nota'}
      >
        <NoteIcon filled={!!session.notes} />
      </button>
    </div>
  )
```

**Step 12: Add NoteIcon component**

```tsx
const NoteIcon = ({ filled }: { filled: boolean }) => (
  <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)
```

**Step 13: Update new row to include activity**

Initialize with activityId:

```typescript
setNewRow({
  projectId: null,
  date: dateStr,
  start: startStr,
  end: '',
  activityId: null,  // Add this
  notes: ''
})
```

Add activity cell in new row:

```tsx
{/* Attivit\u00e0 - select */}
<td className="min-w-[150px] px-1">
  <select
    value={newRow.activityId ?? ''}
    onChange={e => setNewRow({ ...newRow, activityId: e.target.value ? parseInt(e.target.value) : null })}
    className="select w-full py-1 text-sm"
    disabled={!newRow.projectId}
  >
    <option value="">Nessuna</option>
    {activities
      .filter(a => a.project_id === null || a.project_id === newRow.projectId)
      .map(a => (
        <option key={a.id} value={a.id}>
          {a.name}{a.project_id ? '' : ' (Globale)'}
        </option>
      ))
    }
  </select>
</td>
```

**Step 14: Update column header for notes**

Change "Note" header to just an icon or smaller:

```tsx
<th className="text-center px-3 py-3 font-medium text-[var(--text-secondary)] w-12">
  <span title="Note">
    <NoteIcon filled={false} />
  </span>
</th>
```

**Step 15: Update onCreate call to include activityId**

```typescript
await onCreate(
  newRow.projectId!,
  startDate.toISOString(),
  endDate.toISOString(),
  newRow.notes || undefined,
  newRow.activityId
)
```

**Step 16: Commit**

```bash
git add src/renderer/components/SessionsTable.tsx
git commit -m "feat(ui): add Activity column and note icon to SessionsTable"
```

---

## Task 12: Tracking Page - Wire Up Activities

**Files:**
- Modify: `src/renderer/pages/Tracking.tsx`

**Step 1: Import useActivities**

```typescript
import { useActivities } from '../hooks/useActivities'
```

**Step 2: Add activities hook**

After `const { projects } = useProjects()`:

```typescript
const { activities } = useActivities()
```

**Step 3: Update handleCreate to accept activityId**

```typescript
const handleCreate = async (projectId: number, startAt: string, endAt: string, notes?: string, activityId?: number | null) => {
  await create({
    project_id: projectId,
    start_at: startAt,
    end_at: endAt,
    notes,
    activity_id: activityId
  })
}
```

**Step 4: Update handleUpdate to include activity_id**

```typescript
const handleUpdate = async (session: SessionWithProject) => {
  await update({
    id: session.id,
    project_id: session.project_id,
    start_at: session.start_at,
    end_at: session.end_at,
    notes: session.notes,
    activity_id: session.activity_id
  })
}
```

**Step 5: Pass activities to SessionsTable**

```tsx
<SessionsTable
  sessions={filteredSessions}
  totalSessions={sessions.length}
  projects={projects}
  activities={activities}  // Add this
  currentDate={currentDate}
  onUpdate={handleUpdate}
  onCreate={handleCreate}
  onDelete={handleDelete}
/>
```

**Step 6: Pass activities to Timeline**

```tsx
<Timeline
  currentDate={currentDate}
  onDateChange={setCurrentDate}
  clientFilter={clientFilter}
  projectFilter={projectFilter}
  onClientFilterChange={setClientFilter}
  onProjectFilterChange={setProjectFilter}
  activities={activities}  // Add this
/>
```

**Step 7: Commit**

```bash
git add src/renderer/pages/Tracking.tsx
git commit -m "feat(ui): wire up activities to Tracking page"
```

---

## Task 13: Final Integration and Testing

**Step 1: Review all changes**

```bash
git diff main --stat
```

**Step 2: Manual testing checklist**

- [ ] Create a new global activity in Projects > Attivit\u00e0 tab
- [ ] Create a project-specific activity
- [ ] Edit an activity name
- [ ] Delete an activity
- [ ] Draw a session on timeline - modal should open
- [ ] Select activity and add notes in modal
- [ ] Create session from table with activity
- [ ] Edit session activity in table
- [ ] Verify note icon shows correctly (filled vs outline)
- [ ] Click note icon to view/edit notes
- [ ] Verify activity dropdown only shows global + project-specific activities

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete activities feature implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database schema | database.ts |
| 2 | TypeScript types | types.ts |
| 3 | IPC handlers | ipc.ts |
| 4 | Preload API | preload.ts |
| 5 | Activity service | activityService.ts (new) |
| 6 | useActivities hook | useActivities.ts (new) |
| 7 | Projects page tabs | Projects.tsx |
| 8 | Session modal | NoteModal.tsx |
| 9 | TimelineTrack modal trigger | TimelineTrack.tsx |
| 10 | Timeline modal integration | Timeline.tsx |
| 11 | SessionsTable activity column | SessionsTable.tsx |
| 12 | Tracking page wiring | Tracking.tsx |
| 13 | Final integration | All files |
