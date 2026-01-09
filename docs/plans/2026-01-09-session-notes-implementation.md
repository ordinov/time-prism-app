# Session Notes - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add notes field to tracking sessions with hover tooltip and modal editing.

**Architecture:** Extend sessions table with nullable notes column. Update types and IPC handlers. Add NoteModal component for editing. Enhance TimelineTrack with tooltip and inline preview.

**Tech Stack:** SQLite, TypeScript, React, Tailwind CSS

---

## Task 1: Database Migration

**Files:**
- Modify: `src/main/database.ts:18-46`

**Step 1: Add notes column to sessions table**

In `initDatabase()`, after the existing `CREATE TABLE IF NOT EXISTS sessions` block, add migration:

```typescript
// After the existing db.exec(...) block, add:

// Migration: add notes column if not exists
const hasNotesColumn = db.prepare(`
  SELECT COUNT(*) as count FROM pragma_table_info('sessions') WHERE name='notes'
`).get() as { count: number }

if (hasNotesColumn.count === 0) {
  db.exec(`ALTER TABLE sessions ADD COLUMN notes TEXT DEFAULT NULL`)
}
```

**Step 2: Verify migration works**

The migration is idempotent - runs only if column doesn't exist.

**Step 3: Commit**

```bash
git add src/main/database.ts
git commit -m "feat(db): add notes column to sessions table"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/shared/types.ts:17-24` (Session interface)
- Modify: `src/shared/types.ts:61-72` (Input types)

**Step 1: Add notes to Session interface**

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

**Step 2: Add notes to CreateSessionInput**

```typescript
export interface CreateSessionInput {
  project_id: number
  start_at: string
  end_at: string
  notes?: string  // ADD THIS LINE
}
```

**Step 3: Add notes to UpdateSessionInput**

```typescript
export interface UpdateSessionInput {
  id: number
  project_id: number
  start_at: string
  end_at: string
  notes?: string | null  // ADD THIS LINE
}
```

**Step 4: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add notes field to Session types"
```

---

## Task 3: Update IPC Handlers

**Files:**
- Modify: `src/main/ipc.ts:99-113`

**Step 1: Update db:sessions:create handler**

Replace lines 99-105:

```typescript
ipcMain.handle('db:sessions:create', (_, input: CreateSessionInput): Session => {
  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO sessions (project_id, start_at, end_at, notes) VALUES (?, ?, ?, ?)'
  ).run(input.project_id, input.start_at, input.end_at, input.notes ?? null)
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid) as Session
})
```

**Step 2: Update db:sessions:update handler**

Replace lines 107-113:

```typescript
ipcMain.handle('db:sessions:update', (_, input: UpdateSessionInput): Session => {
  const db = getDatabase()
  db.prepare(
    'UPDATE sessions SET project_id = ?, start_at = ?, end_at = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(input.project_id, input.start_at, input.end_at, input.notes ?? null, input.id)
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(input.id) as Session
})
```

**Step 3: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat(ipc): handle notes field in session CRUD"
```

---

## Task 4: Create NoteModal Component

**Files:**
- Create: `src/renderer/components/Timeline/NoteModal.tsx`

**Step 1: Create the modal component**

```tsx
import { useState, useEffect, useRef } from 'react'
import { formatTimeRange } from './utils'

interface Props {
  isOpen: boolean
  sessionId: number
  startAt: string
  endAt: string
  currentNote: string | null
  onSave: (sessionId: number, notes: string | null) => void
  onClose: () => void
}

export default function NoteModal({
  isOpen,
  sessionId,
  startAt,
  endAt,
  currentNote,
  onSave,
  onClose
}: Props) {
  const [note, setNote] = useState(currentNote ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset note when modal opens with new session
  useEffect(() => {
    if (isOpen) {
      setNote(currentNote ?? '')
      // Focus textarea after render
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isOpen, sessionId, currentNote])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, note])

  const handleSave = () => {
    const trimmedNote = note.trim()
    onSave(sessionId, trimmedNote || null)
    onClose()
  }

  if (!isOpen) return null

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
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Nota sessione
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {formatTimeRange(startAt, endAt)}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Descrivi l'attività svolta..."
            className="w-full h-36 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                       rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)]
                       focus:outline-none focus:border-[var(--prism-violet)] focus:ring-1 focus:ring-[var(--prism-violet)]
                       resize-none"
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Ctrl+Enter per salvare, Esc per annullare
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn btn-ghost text-sm"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary text-sm"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Timeline/NoteModal.tsx
git commit -m "feat(ui): add NoteModal component for session notes"
```

---

## Task 5: Create SessionTooltip Component

**Files:**
- Create: `src/renderer/components/Timeline/SessionTooltip.tsx`

**Step 1: Create the tooltip component**

```tsx
import { formatTimeRange, formatDuration } from './utils'

interface Props {
  startAt: string
  endAt: string
  notes: string | null
  position: { x: number; y: number }
}

export default function SessionTooltip({ startAt, endAt, notes, position }: Props) {
  return (
    <div
      className="fixed z-50 pointer-events-none animate-fade-in"
      style={{
        left: position.x,
        top: position.y - 8,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl px-3 py-2 max-w-xs">
        <div className="flex items-center gap-2 text-sm text-white">
          <span>{formatTimeRange(startAt, endAt)}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-300">{formatDuration(startAt, endAt)}</span>
        </div>
        {notes && (
          <p className="text-sm text-gray-300 mt-1.5 pt-1.5 border-t border-gray-700 whitespace-pre-wrap">
            {notes}
          </p>
        )}
      </div>
      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-gray-800 border-r border-b border-gray-700 rotate-45" />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Timeline/SessionTooltip.tsx
git commit -m "feat(ui): add SessionTooltip component for hover display"
```

---

## Task 6: Update TimelineTrack - Add Note Indicator and Tooltip

**Files:**
- Modify: `src/renderer/components/Timeline/TimelineTrack.tsx`

**Step 1: Add imports and state**

At top of file, add import:

```typescript
import SessionTooltip from './SessionTooltip'
```

Inside the component, after the `contextMenu` state (line ~74), add:

```typescript
// Tooltip state
const [tooltip, setTooltip] = useState<{
  session: SessionWithProject
  x: number
  y: number
} | null>(null)
const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
```

**Step 2: Add tooltip handlers**

After the context menu handler (around line 240), add:

```typescript
// Tooltip handlers
const handleSessionMouseEnter = (e: React.MouseEvent, session: SessionWithProject) => {
  const rect = e.currentTarget.getBoundingClientRect()
  tooltipTimeoutRef.current = setTimeout(() => {
    setTooltip({
      session,
      x: rect.left + rect.width / 2,
      y: rect.top
    })
  }, 300)
}

const handleSessionMouseLeave = () => {
  if (tooltipTimeoutRef.current) {
    clearTimeout(tooltipTimeoutRef.current)
    tooltipTimeoutRef.current = null
  }
  setTooltip(null)
}
```

**Step 3: Update session block rendering**

In the session map (around line 308-355), update the session div to include:

1. Add mouse handlers to the session div:

```typescript
onMouseEnter={(e) => handleSessionMouseEnter(e, session)}
onMouseLeave={handleSessionMouseLeave}
```

2. Replace the title attribute with nothing (tooltip replaces it):

Remove this line:
```typescript
title={`${formatTimeRange(session.start_at, session.end_at)} (${formatDuration(session.start_at, session.end_at)})`}
```

3. Add note indicator and inline preview. Inside the session div, after the time label block and before resize handles:

```tsx
{/* Note indicator */}
{session.notes && (
  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/70" />
)}

{/* Note preview (if wide enough) */}
{width > 100 && session.notes && (
  <span className="absolute bottom-0.5 left-2 right-2 text-[10px] text-white/60 truncate">
    {session.notes}
  </span>
)}
```

**Step 4: Render tooltip**

At the end of the return statement, after the context menu (before closing `</div>`):

```tsx
{/* Tooltip */}
{tooltip && (
  <SessionTooltip
    startAt={tooltip.session.start_at}
    endAt={tooltip.session.end_at}
    notes={tooltip.session.notes}
    position={{ x: tooltip.x, y: tooltip.y }}
  />
)}
```

**Step 5: Commit**

```bash
git add src/renderer/components/Timeline/TimelineTrack.tsx
git commit -m "feat(ui): add tooltip and note indicator to session blocks"
```

---

## Task 7: Update TimelineTrack - Add Context Menu and Modal Integration

**Files:**
- Modify: `src/renderer/components/Timeline/TimelineTrack.tsx`

**Step 1: Add NoteModal import**

```typescript
import NoteModal from './NoteModal'
```

**Step 2: Add props for note update**

Update the Props interface to add:

```typescript
onUpdateSessionNote: (sessionId: number, notes: string | null) => void
```

Add to destructured props:

```typescript
onUpdateSessionNote
```

**Step 3: Add note modal state**

After the tooltip state, add:

```typescript
// Note modal state
const [noteModal, setNoteModal] = useState<{
  session: SessionWithProject
} | null>(null)
```

**Step 4: Update context menu to include note option**

Replace the context menu JSX (lines 375-393) with:

```tsx
{/* Context menu */}
{contextMenu && (
  <div
    className="fixed z-50 bg-[var(--bg-elevated)] border border-[var(--border-subtle)]
               rounded-lg shadow-xl py-1 min-w-40"
    style={{ left: contextMenu.x, top: contextMenu.y }}
    onClick={(e) => e.stopPropagation()}
  >
    <button
      className="w-full px-3 py-1.5 text-sm text-left text-[var(--text-primary)]
                 hover:bg-[var(--bg-surface)] transition-colors"
      onClick={() => {
        const session = sessions.find(s => s.id === contextMenu.sessionId)
        if (session) {
          setNoteModal({ session })
        }
        setContextMenu(null)
      }}
    >
      {sessions.find(s => s.id === contextMenu.sessionId)?.notes
        ? 'Modifica nota'
        : 'Aggiungi nota'}
    </button>
    <div className="h-px bg-[var(--border-subtle)] my-1" />
    <button
      className="w-full px-3 py-1.5 text-sm text-left text-[var(--error)]
                 hover:bg-[var(--error)]/10 transition-colors"
      onClick={() => {
        onDeleteSession(contextMenu.sessionId)
        setContextMenu(null)
      }}
    >
      Elimina
    </button>
  </div>
)}
```

**Step 5: Add NoteModal render**

After the tooltip render, add:

```tsx
{/* Note Modal */}
{noteModal && (
  <NoteModal
    isOpen={true}
    sessionId={noteModal.session.id}
    startAt={noteModal.session.start_at}
    endAt={noteModal.session.end_at}
    currentNote={noteModal.session.notes}
    onSave={onUpdateSessionNote}
    onClose={() => setNoteModal(null)}
  />
)}
```

**Step 6: Commit**

```bash
git add src/renderer/components/Timeline/TimelineTrack.tsx
git commit -m "feat(ui): integrate note editing via context menu and modal"
```

---

## Task 8: Update Timeline Component to Wire Note Updates

**Files:**
- Modify: `src/renderer/components/Timeline/Timeline.tsx`

**Step 1: Find where TimelineTrack is rendered and add the onUpdateSessionNote prop**

Find the `<TimelineTrack>` component usage and add:

```typescript
onUpdateSessionNote={async (sessionId, notes) => {
  const session = sessions.find(s => s.id === sessionId)
  if (session) {
    await update({
      id: sessionId,
      project_id: session.project_id,
      start_at: session.start_at,
      end_at: session.end_at,
      notes
    })
  }
}}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Timeline/Timeline.tsx
git commit -m "feat(timeline): wire note update callback to TimelineTrack"
```

---

## Task 9: Add CSS Animation

**Files:**
- Check for existing animations, add if needed

**Step 1: Verify animate-fade-in exists**

Check if `animate-fade-in` is defined in the CSS/Tailwind config. If not, add to global CSS or tailwind config:

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fade-in 150ms ease-out;
}
```

**Step 2: Commit if changes made**

```bash
git add src/renderer/index.css  # or tailwind.config.js
git commit -m "feat(css): add fade-in animation for tooltip"
```

---

## Task 10: Final Testing

**Steps:**
1. Inform user to rebuild and test the application
2. Test creating a session and adding a note via context menu
3. Test hover tooltip displays note
4. Test inline preview on wide blocks
5. Test editing existing note
6. Test clearing a note (save empty)

---

## Summary

Files modified:
- `src/main/database.ts` - Migration
- `src/shared/types.ts` - Types
- `src/main/ipc.ts` - IPC handlers
- `src/renderer/components/Timeline/TimelineTrack.tsx` - UI integration
- `src/renderer/components/Timeline/Timeline.tsx` - Wire callback

Files created:
- `src/renderer/components/Timeline/NoteModal.tsx` - Modal component
- `src/renderer/components/Timeline/SessionTooltip.tsx` - Tooltip component
