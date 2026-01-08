import { useState } from 'react'

interface Props {
  projectName: string
  sessionCount: number
  isOpen: boolean
  onClose: () => void
  onHide: () => void
  onDeleteAll: () => Promise<void> | void
}

const WarningIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

export default function TrackRemovalModal({
  projectName,
  sessionCount,
  isOpen,
  onClose,
  onHide,
  onDeleteAll
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isOpen) return null

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    await onDeleteAll()
    setShowDeleteConfirm(false)
    onClose()
  }

  const handleClose = () => {
    setShowDeleteConfirm(false)
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
        {!showDeleteConfirm ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Rimuovi progetto
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Cosa vuoi fare con <span className="font-medium text-[var(--text-primary)]">{projectName}</span>?
              </p>
            </div>

            {/* Options */}
            <div className="p-4 space-y-3">
              {/* Hide option */}
              <button
                onClick={() => {
                  onHide()
                  handleClose()
                }}
                className="w-full p-4 rounded-lg border border-[var(--border-subtle)]
                           bg-[var(--bg-surface)] hover:bg-[var(--bg-base)]
                           hover:border-[var(--prism-violet)] transition-all text-left group cursor-pointer"
              >
                <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--prism-violet)]">
                  Nascondi dalla timeline
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  Il progetto non sarà visibile, ma le {sessionCount} sessioni registrate rimarranno salvate.
                </div>
              </button>

              {/* Delete all option */}
              <button
                onClick={handleDeleteClick}
                className="w-full p-4 rounded-lg border border-[var(--border-subtle)]
                           bg-[var(--bg-surface)] hover:bg-[var(--error)]/10
                           hover:border-[var(--error)] transition-all text-left group cursor-pointer"
              >
                <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--error)]">
                  Elimina tutte le sessioni
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  Rimuove definitivamente tutte le {sessionCount} sessioni di questo progetto dalla timeline.
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex justify-end">
              <button
                onClick={handleClose}
                className="btn btn-ghost text-sm"
              >
                Annulla
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Delete confirmation */}
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--error)]/20 text-[var(--error)]
                              flex items-center justify-center mx-auto mb-4">
                <WarningIcon />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Conferma eliminazione
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Stai per eliminare definitivamente <span className="font-bold text-[var(--error)]">{sessionCount} sessioni</span> del progetto "{projectName}".
                <br />
                <span className="text-[var(--error)]">Questa azione non può essere annullata.</span>
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary"
                >
                  Torna indietro
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="btn bg-[var(--error)] hover:bg-[var(--error)]/80 text-white"
                >
                  Elimina definitivamente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
