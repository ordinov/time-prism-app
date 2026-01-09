import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  note: string
  onClose: () => void
}

export default function NoteViewModal({ isOpen, note, onClose }: Props) {
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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
                      rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Nota
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="whitespace-pre-wrap text-[var(--text-primary)] text-sm leading-relaxed">
            {note}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-ghost text-sm"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
