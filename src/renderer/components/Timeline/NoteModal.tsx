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
