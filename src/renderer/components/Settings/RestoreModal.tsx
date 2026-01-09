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
