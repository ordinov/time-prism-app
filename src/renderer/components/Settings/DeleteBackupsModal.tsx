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
