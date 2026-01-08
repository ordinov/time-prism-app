import { useRef, useState, useEffect } from 'react'
import type { SessionWithProject } from '@shared/types'
import { dateToPosition, positionToDate, snapToGrid, formatTimeRange, formatDuration } from './utils'

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
  onCreateSession: (projectId: number, startAt: Date, endAt: Date) => void
  onUpdateSession: (sessionId: number, startAt: Date, endAt: Date) => void
  onDeleteSession: (sessionId: number) => void
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
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
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
  } | null>(null)

  // Move state
  const [moving, setMoving] = useState<{
    sessionId: number
    originalStart: Date
    originalEnd: Date
    initialX: number
  } | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    sessionId: number
    x: number
    y: number
  } | null>(null)

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [contextMenu])

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
      initialX: x
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

    // Update session immediately for visual feedback
    onUpdateSession(resizing.sessionId, newStart, newEnd)
  }

  const handleResizeEnd = () => {
    setResizing(null)
  }

  // Move handlers
  const handleMoveStart = (e: React.MouseEvent, session: SessionWithProject) => {
    e.stopPropagation()
    e.preventDefault()
    if (!trackRef.current) return

    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft

    setMoving({
      sessionId: session.id,
      originalStart: new Date(session.start_at),
      originalEnd: new Date(session.end_at),
      initialX: x
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

    onUpdateSession(moving.sessionId, newStart, newEnd)
  }

  const handleMoveEnd = () => {
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

  // Create a slightly darker version of the color for the border
  const darkenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max((num >> 16) - amt, 0)
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
    const B = Math.max((num & 0x0000FF) - amt, 0)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }

  return (
    <div className="flex border-b border-[var(--border-subtle)] group/track hover:bg-white/[0.02] transition-colors">
      {/* Project label */}
      <div
        className="w-44 flex-shrink-0 py-2 pr-3 pl-2 bg-[var(--bg-elevated)] border-r border-[var(--border-subtle)]
                   flex items-center gap-2 relative z-10"
        style={{ borderLeft: `4px solid ${projectColor}` }}
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
            const left = dateToPosition(new Date(session.start_at), viewStart, pixelsPerHour)
            const right = dateToPosition(new Date(session.end_at), viewStart, pixelsPerHour)
            const width = right - left

            return (
              <div
                key={session.id}
                className={`absolute top-2 bottom-2 rounded-md group/session
                           transition-all duration-150 hover:scale-y-110 hover:z-10
                           ${moving?.sessionId === session.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{
                  left,
                  width: Math.max(width, 6),
                  backgroundColor: projectColor,
                  borderLeft: `2px solid ${darkenColor(projectColor, 20)}`,
                  boxShadow: `0 2px 8px ${projectColor}40, inset 0 1px 0 rgba(255,255,255,0.15)`
                }}
                title={`${formatTimeRange(session.start_at, session.end_at)} (${formatDuration(session.start_at, session.end_at)})`}
                onMouseDown={(e) => handleMoveStart(e, session)}
                onContextMenu={(e) => handleContextMenu(e, session.id)}
              >
                {/* Time label inside block (if wide enough) */}
                {width > 60 && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/90">
                    {formatDuration(session.start_at, session.end_at)}
                  </span>
                )}

                {/* Resize handle - Start */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize
                             hover:bg-white/30 rounded-l-md"
                  onMouseDown={(e) => handleResizeStart(e, session.id, 'start', session)}
                >
                  <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/80 rounded-full" />
                </div>

                {/* Resize handle - End */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize
                             hover:bg-white/30 rounded-r-md"
                  onMouseDown={(e) => handleResizeStart(e, session.id, 'end', session)}
                >
                  <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/80 rounded-full" />
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
                     rounded-lg shadow-xl py-1 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
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
    </div>
  )
}
