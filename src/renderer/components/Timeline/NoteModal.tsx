import { useState, useEffect, useRef, useCallback } from 'react'
import { formatTimeRange } from './utils'
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

export default function NoteModal({
  isOpen,
  sessionId,
  startAt,
  endAt,
  currentNote,
  currentActivityId,
  activities,
  onSave,
  onClose
}: Props) {
  const [note, setNote] = useState(currentNote ?? '')
  const [activityId, setActivityId] = useState<number | null>(currentActivityId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset note and activity when modal opens with new session
  useEffect(() => {
    if (isOpen) {
      setNote(currentNote ?? '')
      setActivityId(currentActivityId)
      // Focus textarea after render
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isOpen, sessionId, currentNote, currentActivityId])

  const handleSave = useCallback(() => {
    const trimmedNote = note.trim()
    onSave(sessionId, trimmedNote || null, activityId)
    onClose()
  }, [note, activityId, sessionId, onSave, onClose])

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
  }, [isOpen, onClose, handleSave])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-[var(--bg-elevated)] border border-[var(--border-subtle)]
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
        <div className="p-6 space-y-4">
          {/* Activity select */}
          <div>
            <label className="text-sm text-[var(--text-muted)] mb-2 block">
              Attività (opzionale)
            </label>
            <select
              value={activityId ?? ''}
              onChange={(e) => setActivityId(e.target.value ? Number(e.target.value) : null)}
              className="select w-full"
            >
              <option value="">Nessuna attività</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.project_id ? '' : ' (Globale)'}
                </option>
              ))}
            </select>
          </div>

          {/* Notes textarea */}
          <div>
            <label className="text-sm text-[var(--text-muted)] mb-2 block">
              Note (opzionale)
            </label>
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
          </div>

          <p className="text-xs text-[var(--text-muted)]">
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
