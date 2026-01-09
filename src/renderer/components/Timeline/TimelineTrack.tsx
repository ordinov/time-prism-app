import { useRef, useState, useEffect } from 'react'
import type { SessionWithProject } from '@shared/types'
import { dateToPosition, positionToDate, snapToGrid, formatTimeRange, formatDuration } from './utils'
import SessionTooltip from './SessionTooltip'
import NoteModal from './NoteModal'
import ConfirmModal from '../ConfirmModal'

// Icons
const XMarkIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

interface Props {
  projectId: number
  projectName: string
  projectColor: string
  clientName: string | null
  sessions: SessionWithProject[]
  viewStart: Date
  pixelsPerHour: number
  totalWidth: number
  scrollLeft: number
  gridLines: number[]
  nowPosition: number | null
  sidebarWidth: number
  onCreateSession: (projectId: number, startAt: Date, endAt: Date) => void
  onUpdateSession: (sessionId: number, startAt: Date, endAt: Date) => void
  onDeleteSession: (sessionId: number) => void
  onUpdateSessionNote: (sessionId: number, notes: string | null) => void
  onRemoveTrack: (projectId: number) => void
}

export default function TimelineTrack({
  projectId,
  projectName,
  projectColor,
  clientName,
  sessions,
  viewStart,
  pixelsPerHour,
  totalWidth,
  scrollLeft,
  gridLines,
  nowPosition,
  sidebarWidth,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onUpdateSessionNote,
  onRemoveTrack
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  // Resize state
  const [resizing, setResizing] = useState<{
    sessionId: number
    handle: 'start' | 'end'
    originalStart: Date
    originalEnd: Date
    initialX: number
    currentStart: Date
    currentEnd: Date
  } | null>(null)

  // Move state
  const [moving, setMoving] = useState<{
    sessionId: number
    originalStart: Date
    originalEnd: Date
    initialX: number
    currentStart: Date
    currentEnd: Date
  } | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    sessionId: number
    x: number
    y: number
  } | null>(null)

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    session: SessionWithProject
    x: number
    y: number
    direction: 'up' | 'down'
  } | null>(null)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Note modal state
  const [noteModal, setNoteModal] = useState<{
    session: SessionWithProject
  } | null>(null)

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    session: SessionWithProject
  } | null>(null)

  // Selected session state
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  // Hide tooltip when drag/resize/move starts
  useEffect(() => {
    if (isDragging || resizing || moving) {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
        tooltipTimeoutRef.current = null
      }
      setTooltip(null)
    }
  }, [isDragging, resizing, moving])

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [contextMenu])

  // Handle Delete key for selected session
  useEffect(() => {
    if (!selectedSessionId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const session = sessions.find(s => s.id === selectedSessionId)
        if (session) {
          setDeleteModal({ session })
        }
      } else if (e.key === 'Escape') {
        setSelectedSessionId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSessionId, sessions])

  // Deselect when clicking outside sessions (but not during drag operations)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't deselect during drag/resize operations
      if (moving || resizing) return

      const target = e.target as HTMLElement
      if (!target.closest('[data-session-block]')) {
        setSelectedSessionId(null)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [moving, resizing])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return
    if (e.button !== 0) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    setIsDragging(true)
    setDragStart(x)
    setDragEnd(x)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    setDragEnd(x)
  }

  const handleMouseUp = () => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const startX = Math.min(dragStart, dragEnd)
      const endX = Math.max(dragStart, dragEnd)
      if (endX - startX > 10) {
        const startDate = snapToGrid(positionToDate(startX, viewStart, pixelsPerHour))
        const endDate = snapToGrid(positionToDate(endX, viewStart, pixelsPerHour))
        onCreateSession(projectId, startDate, endDate)
      }
    }
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  // Resize handlers
  const handleResizeStart = (
    e: React.MouseEvent,
    sessionId: number,
    handle: 'start' | 'end',
    session: SessionWithProject
  ) => {
    // Only start resize on left-click
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    if (!trackRef.current) return

    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft

    setResizing({
      sessionId,
      handle,
      originalStart: new Date(session.start_at),
      originalEnd: new Date(session.end_at),
      initialX: x,
      currentStart: new Date(session.start_at),
      currentEnd: new Date(session.end_at)
    })
  }

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!resizing || !trackRef.current) return

    const rect = trackRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left + scrollLeft
    const deltaX = currentX - resizing.initialX

    let newStart = resizing.originalStart
    let newEnd = resizing.originalEnd

    if (resizing.handle === 'start') {
      const newStartX = dateToPosition(resizing.originalStart, viewStart, pixelsPerHour) + deltaX
      newStart = snapToGrid(positionToDate(newStartX, viewStart, pixelsPerHour))
      // Don't let start go past end
      if (newStart >= newEnd) {
        newStart = new Date(newEnd.getTime() - 5 * 60 * 1000) // min 5 min
      }
    } else {
      const newEndX = dateToPosition(resizing.originalEnd, viewStart, pixelsPerHour) + deltaX
      newEnd = snapToGrid(positionToDate(newEndX, viewStart, pixelsPerHour))
      // Don't let end go before start
      if (newEnd <= newStart) {
        newEnd = new Date(newStart.getTime() + 5 * 60 * 1000) // min 5 min
      }
    }

    // Only update if values actually changed (prevents infinite re-render loop)
    if (newStart.getTime() !== resizing.currentStart.getTime() ||
        newEnd.getTime() !== resizing.currentEnd.getTime()) {
      setResizing(prev => prev ? { ...prev, currentStart: newStart, currentEnd: newEnd } : null)
    }
  }

  const handleResizeEnd = () => {
    if (resizing) {
      // Check if size actually changed
      const hasChanged = resizing.currentStart.getTime() !== resizing.originalStart.getTime() ||
                         resizing.currentEnd.getTime() !== resizing.originalEnd.getTime()
      if (hasChanged) {
        // Save to database only if there was actual resize
        onUpdateSession(resizing.sessionId, resizing.currentStart, resizing.currentEnd)
      }
    }
    setResizing(null)
  }

  // Move handlers
  const handleMoveStart = (e: React.MouseEvent, session: SessionWithProject) => {
    // Only start move on left-click
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    if (!trackRef.current) return

    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft

    setMoving({
      sessionId: session.id,
      originalStart: new Date(session.start_at),
      originalEnd: new Date(session.end_at),
      initialX: x,
      currentStart: new Date(session.start_at),
      currentEnd: new Date(session.end_at)
    })
  }

  const handleMoveMove = (e: React.MouseEvent) => {
    if (!moving || !trackRef.current) return

    const rect = trackRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left + scrollLeft
    const deltaX = currentX - moving.initialX

    const duration = moving.originalEnd.getTime() - moving.originalStart.getTime()
    const newStartX = dateToPosition(moving.originalStart, viewStart, pixelsPerHour) + deltaX
    const newStart = snapToGrid(positionToDate(newStartX, viewStart, pixelsPerHour))
    const newEnd = new Date(newStart.getTime() + duration)

    // Only update if values actually changed (prevents infinite re-render loop)
    if (newStart.getTime() !== moving.currentStart.getTime() ||
        newEnd.getTime() !== moving.currentEnd.getTime()) {
      setMoving(prev => prev ? { ...prev, currentStart: newStart, currentEnd: newEnd } : null)
    }
  }

  const handleMoveEnd = () => {
    if (moving) {
      // Check if position actually changed
      const hasChanged = moving.currentStart.getTime() !== moving.originalStart.getTime() ||
                         moving.currentEnd.getTime() !== moving.originalEnd.getTime()
      if (hasChanged) {
        // Save to database only if there was actual movement
        onUpdateSession(moving.sessionId, moving.currentStart, moving.currentEnd)
      } else {
        // It was just a click, select the session
        setSelectedSessionId(moving.sessionId)
      }
    }
    setMoving(null)
  }

  // Combined mouse move handler
  const handleTrackMouseMove = (e: React.MouseEvent) => {
    if (resizing) {
      handleResizeMove(e)
    } else if (moving) {
      handleMoveMove(e)
    } else {
      handleMouseMove(e)
    }
  }

  // Combined mouse up handler
  const handleTrackMouseUp = () => {
    if (resizing) {
      handleResizeEnd()
    } else if (moving) {
      handleMoveEnd()
    } else {
      handleMouseUp()
    }
  }

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent, sessionId: number) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      sessionId,
      x: e.clientX,
      y: e.clientY
    })
  }

  // Tooltip handlers
  const handleSessionMouseEnter = (e: React.MouseEvent, session: SessionWithProject) => {
    // Don't show tooltip during drag operations
    if (isDragging || resizing || moving) return

    const rect = e.currentTarget.getBoundingClientRect()
    // Calculate if track is in upper or lower half of viewport
    const viewportHeight = window.innerHeight
    const trackCenterY = rect.top + rect.height / 2
    const direction: 'up' | 'down' = trackCenterY < viewportHeight / 2 ? 'down' : 'up'

    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip({
        session,
        x: rect.left + rect.width / 2,
        y: direction === 'up' ? rect.top : rect.bottom,
        direction
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

  // Create a slightly darker version of the color for the border
  const darkenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max((num >> 16) - amt, 0)
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
    const B = Math.max((num & 0x0000FF) - amt, 0)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }

  // Calculate contrasting text color (black or white) based on background luminance
  const getContrastTextColor = (hex: string) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = (num >> 16) / 255
    const g = ((num >> 8) & 0x00FF) / 255
    const b = (num & 0x0000FF) / 255
    // Calculate relative luminance (WCAG formula)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luminance > 0.5 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)'
  }

  const textColor = getContrastTextColor(projectColor)
  const textColorMuted = getContrastTextColor(projectColor).replace(/[\d.]+\)$/, '0.8)')

  return (
    <div className="flex border-b border-[var(--border-subtle)] group/track hover:bg-white/[0.02] transition-colors">
      {/* Project label */}
      <div
        className="flex-shrink-0 py-2 pr-3 pl-2 bg-[var(--bg-elevated)] border-r border-[var(--border-subtle)]
                   flex items-center gap-2 relative z-10"
        style={{ width: sidebarWidth, borderLeft: `4px solid ${projectColor}` }}
      >
        <button
          onClick={() => onRemoveTrack(projectId)}
          className="p-1 rounded text-[var(--text-muted)] opacity-0 group-hover/track:opacity-100
                     hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-all flex-shrink-0"
          title="Rimuovi dalla timeline"
        >
          <XMarkIcon />
        </button>
        <div className="flex flex-col min-w-0 flex-1 items-end text-right">
          {clientName && (
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider truncate font-medium">
              {clientName}
            </span>
          )}
          <span className="text-sm text-[var(--text-primary)] truncate font-medium">
            {projectName}
          </span>
        </div>
      </div>

      {/* Track content */}
      <div
        ref={trackRef}
        className={`h-14 relative bg-[var(--bg-base)] ${resizing ? 'cursor-ew-resize' : moving ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        style={{ width: totalWidth }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleTrackMouseMove}
        onMouseUp={handleTrackMouseUp}
        onMouseLeave={handleTrackMouseUp}
      >
        <div style={{ transform: `translateX(-${scrollLeft}px)` }} className="absolute inset-0">
          {/* Grid lines */}
          {gridLines.map((pos, i) => (
            <div
              key={`grid-${i}`}
              className="absolute top-0 bottom-0 w-px bg-white/[0.12]"
              style={{ left: pos }}
            />
          ))}

          {/* Current time indicator */}
          {nowPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--prism-cyan)] z-20"
              style={{ left: nowPosition }}
            />
          )}

          {sessions.map(session => {
            // Use preview position during drag/resize, otherwise use actual session data
            const isMoving = moving?.sessionId === session.id
            const isResizing = resizing?.sessionId === session.id
            const isSelected = selectedSessionId === session.id
            const displayStart = isMoving ? moving.currentStart
              : isResizing ? resizing.currentStart
              : new Date(session.start_at)
            const displayEnd = isMoving ? moving.currentEnd
              : isResizing ? resizing.currentEnd
              : new Date(session.end_at)

            const left = dateToPosition(displayStart, viewStart, pixelsPerHour)
            const right = dateToPosition(displayEnd, viewStart, pixelsPerHour)
            const width = right - left

            return (
              <div
                key={session.id}
                data-session-block
                className={`absolute top-2 bottom-2 rounded-md group/session
                           ${isMoving || isResizing ? '' : 'transition-all duration-150'} hover:scale-y-110 hover:z-10
                           ${isMoving ? 'cursor-grabbing' : 'cursor-grab'}
                           ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent z-20' : ''}`}
                style={{
                  left,
                  width: Math.max(width, 6),
                  backgroundColor: projectColor,
                  borderLeft: `2px solid ${darkenColor(projectColor, 20)}`,
                  boxShadow: `0 2px 8px ${projectColor}40, inset 0 1px 0 rgba(255,255,255,0.15)`
                }}
                onMouseEnter={(e) => handleSessionMouseEnter(e, session)}
                onMouseLeave={handleSessionMouseLeave}
                onMouseDown={(e) => handleMoveStart(e, session)}
                onContextMenu={(e) => handleContextMenu(e, session.id)}
              >
                {/* Time label inside block (if wide enough) */}
                {width > 60 && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-medium"
                    style={{ color: textColor }}
                  >
                    {formatDuration(displayStart.toISOString(), displayEnd.toISOString())}
                  </span>
                )}

                {/* Note indicator */}
                {session.notes && (
                  <div
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: textColor }}
                  />
                )}

                {/* Note preview (if wide enough) */}
                {width > 100 && session.notes && (
                  <span
                    className="absolute bottom-0.5 left-2 right-2 text-[10px] truncate"
                    style={{ color: textColorMuted }}
                  >
                    {session.notes}
                  </span>
                )}

                {/* Resize handle - Start */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize
                             hover:bg-black/10 rounded-l-md"
                  onMouseDown={(e) => handleResizeStart(e, session.id, 'start', session)}
                >
                  <div
                    className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                    style={{ backgroundColor: textColor }}
                  />
                </div>

                {/* Resize handle - End */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize
                             hover:bg-black/10 rounded-r-md"
                  onMouseDown={(e) => handleResizeStart(e, session.id, 'end', session)}
                >
                  <div
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                    style={{ backgroundColor: textColor }}
                  />
                </div>
              </div>
            )
          })}

          {/* Drag preview */}
          {isDragging && dragStart !== null && dragEnd !== null && (
            <div
              className="absolute top-2 bottom-2 rounded-md pointer-events-none"
              style={{
                left: Math.min(dragStart, dragEnd),
                width: Math.abs(dragEnd - dragStart),
                background: `linear-gradient(135deg, var(--prism-violet), var(--prism-indigo))`,
                opacity: 0.6,
                boxShadow: 'var(--glow-prism)'
              }}
            />
          )}
        </div>
      </div>

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
              const session = sessions.find(s => s.id === contextMenu.sessionId)
              if (session) {
                setDeleteModal({ session })
              }
              setContextMenu(null)
            }}
          >
            Elimina
          </button>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <SessionTooltip
          startAt={tooltip.session.start_at}
          endAt={tooltip.session.end_at}
          notes={tooltip.session.notes}
          position={{ x: tooltip.x, y: tooltip.y }}
          direction={tooltip.direction}
        />
      )}

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

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <ConfirmModal
          isOpen={true}
          title="Elimina sessione"
          message={`Vuoi eliminare la sessione ${formatTimeRange(deleteModal.session.start_at, deleteModal.session.end_at)}?`}
          confirmLabel="Elimina"
          cancelLabel="Annulla"
          danger
          onConfirm={() => onDeleteSession(deleteModal.session.id)}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  )
}
