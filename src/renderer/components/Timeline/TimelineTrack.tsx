import { useRef, useState } from 'react'
import type { SessionWithProject } from '@shared/types'
import { dateToPosition, positionToDate, snapToGrid, formatTimeRange, formatDuration } from './utils'

interface Props {
  projectId: number
  projectName: string
  projectColor: string
  sessions: SessionWithProject[]
  viewStart: Date
  pixelsPerHour: number
  totalWidth: number
  scrollLeft: number
  onCreateSession: (projectId: number, startAt: Date, endAt: Date) => void
  onUpdateSession: (sessionId: number, startAt: Date, endAt: Date) => void
  onDeleteSession: (sessionId: number) => void
}

export default function TimelineTrack({
  projectId,
  projectName,
  projectColor,
  sessions,
  viewStart,
  pixelsPerHour,
  totalWidth,
  scrollLeft,
  onCreateSession,
  onUpdateSession,
  onDeleteSession
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== trackRef.current) return
    const rect = trackRef.current!.getBoundingClientRect()
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

  return (
    <div className="flex border-b">
      <div className="w-40 flex-shrink-0 p-2 bg-gray-50 border-r flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: projectColor }} />
        <span className="text-sm truncate">{projectName}</span>
      </div>
      <div
        ref={trackRef}
        className="h-12 relative cursor-crosshair"
        style={{ width: totalWidth }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{ transform: `translateX(-${scrollLeft}px)` }} className="absolute inset-0">
          {sessions.map(session => {
            const left = dateToPosition(new Date(session.start_at), viewStart, pixelsPerHour)
            const right = dateToPosition(new Date(session.end_at), viewStart, pixelsPerHour)
            const width = right - left

            return (
              <div
                key={session.id}
                className="absolute top-1 bottom-1 rounded cursor-pointer group"
                style={{
                  left,
                  width: Math.max(width, 4),
                  backgroundColor: projectColor
                }}
                title={`${formatTimeRange(session.start_at, session.end_at)} (${formatDuration(session.start_at, session.end_at)})`}
                onDoubleClick={() => {
                  // TODO: open edit modal
                }}
              >
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(session.id)
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}

          {isDragging && dragStart !== null && dragEnd !== null && (
            <div
              className="absolute top-1 bottom-1 bg-blue-300 opacity-50 rounded"
              style={{
                left: Math.min(dragStart, dragEnd),
                width: Math.abs(dragEnd - dragStart)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
