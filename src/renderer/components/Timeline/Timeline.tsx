import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import TimelineHeader from './TimelineHeader'
import TimelineRuler from './TimelineRuler'
import TimelineTrack from './TimelineTrack'
import TrackRemovalModal from './TrackRemovalModal'
import SearchableProjectSelect from './SearchableProjectSelect'
import { useSessions } from '../../hooks/useSessions'
import { useProjects } from '../../hooks/useProjects'
import type { ViewMode } from './utils'
import { getViewStartEnd, getHoursInView, dateToPosition } from './utils'

const BASE_PIXELS_PER_HOUR = 60
const MAX_ZOOM = 4
const SIDEBAR_WIDTH = 176 // w-44 = 11rem = 176px

const STORAGE_KEY_ACTIVE = 'timeline:activeProjectIds'
const STORAGE_KEY_REMOVED = 'timeline:removedProjectIds'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export default function Timeline() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  // Combined state for atomic updates - prevents jumpy zoom
  const [viewState, setViewState] = useState({ zoom: 1, scrollLeft: 0 })
  const [activeProjectIds, setActiveProjectIds] = useState<number[]>(() => loadFromStorage(STORAGE_KEY_ACTIVE, []))
  const [removedProjectIds, setRemovedProjectIds] = useState<number[]>(() => loadFromStorage(STORAGE_KEY_REMOVED, []))
  const [containerWidth, setContainerWidth] = useState(0)
  const [now, setNow] = useState(new Date())
  const [removalModal, setRemovalModal] = useState<{ projectId: number } | null>(null)

  // Persist active/removed project IDs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeProjectIds))
  }, [activeProjectIds])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REMOVED, JSON.stringify(removedProjectIds))
  }, [removedProjectIds])

  // Destructure for convenience
  const { zoom, scrollLeft } = viewState

  const containerRef = useRef<HTMLDivElement>(null)

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const { start: viewStart, end: viewEnd } = getViewStartEnd(currentDate, viewMode)
  const hoursInView = getHoursInView(viewMode, currentDate)
  const pixelsPerHour = BASE_PIXELS_PER_HOUR * zoom
  const totalWidth = hoursInView * pixelsPerHour

  // Calculate minimum zoom so timeline fills the available width
  const availableWidth = Math.max(containerWidth - SIDEBAR_WIDTH, 100)
  const minZoom = availableWidth / (hoursInView * BASE_PIXELS_PER_HOUR)

  // Track container width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => setContainerWidth(container.clientWidth)
    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // Adjust zoom if it falls below minimum (e.g., after resize)
  useEffect(() => {
    if (containerWidth > 0 && zoom < minZoom) {
      const newTotalWidth = hoursInView * BASE_PIXELS_PER_HOUR * minZoom
      const maxScroll = Math.max(0, newTotalWidth - availableWidth)
      setViewState(prev => ({
        zoom: minZoom,
        scrollLeft: Math.min(prev.scrollLeft, maxScroll)
      }))
    }
  }, [minZoom, containerWidth, zoom, hoursInView, availableWidth])

  // Reset zoom to fit full width when view mode changes
  const prevViewModeRef = useRef(viewMode)
  useEffect(() => {
    if (containerWidth > 0 && viewMode !== prevViewModeRef.current) {
      prevViewModeRef.current = viewMode
      setViewState({ zoom: minZoom, scrollLeft: 0 })
    }
  }, [viewMode, minZoom, containerWidth])

  // Ensure scrollLeft is always within valid bounds
  useEffect(() => {
    const maxScroll = Math.max(0, totalWidth - availableWidth)
    if (scrollLeft > maxScroll) {
      setViewState(prev => ({ ...prev, scrollLeft: maxScroll }))
    }
  }, [totalWidth, availableWidth, scrollLeft])

  const { sessions, create, update, remove, removeByProject } = useSessions({
    start_date: viewStart.toISOString(),
    end_date: viewEnd.toISOString()
  })

  const { projects } = useProjects()

  // Add projects that have sessions in view
  // If a project has new sessions, remove it from removedProjectIds so it shows again
  useEffect(() => {
    const projectIdsWithSessions = [...new Set(sessions.map(s => s.project_id))]

    // Remove projects with sessions from the "removed" list
    const projectsToRestore = projectIdsWithSessions.filter(id => removedProjectIds.includes(id))
    if (projectsToRestore.length > 0) {
      setRemovedProjectIds(prev => prev.filter(id => !projectsToRestore.includes(id)))
    }

    // Add all projects with sessions to active list
    setActiveProjectIds(prev => {
      const combined = [...new Set([...prev, ...projectIdsWithSessions])]
      return combined
    })
  }, [sessions])

  // Calculate grid lines based on view mode
  const gridLines = useMemo(() => {
    const lines: number[] = []

    if (viewMode === 'day') {
      // Hourly lines - 24 hours
      for (let hour = 0; hour <= 24; hour++) {
        const pos = hour * pixelsPerHour
        lines.push(pos)
      }
    } else if (viewMode === 'week') {
      // Daily lines - 7 days
      for (let day = 0; day <= 7; day++) {
        const pos = day * 24 * pixelsPerHour
        lines.push(pos)
      }
    } else {
      // Weekly lines for month view
      const current = new Date(viewStart)
      current.setHours(0, 0, 0, 0)
      // Find first Monday
      const dayOfWeek = current.getDay()
      const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : (8 - dayOfWeek)
      current.setDate(current.getDate() + daysToMonday)
      while (current <= viewEnd) {
        const pos = dateToPosition(current, viewStart, pixelsPerHour)
        if (pos >= 0) lines.push(pos)
        current.setDate(current.getDate() + 7)
      }
    }
    return lines
  }, [viewStart, viewEnd, viewMode, pixelsPerHour])

  // Current time position
  const nowPosition = useMemo(() => {
    if (now < viewStart || now > viewEnd) return null
    return dateToPosition(now, viewStart, pixelsPerHour)
  }, [now, viewStart, viewEnd, pixelsPerHour])

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() - 1)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7)
    else newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + 1)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7)
    else newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const handleToday = () => setCurrentDate(new Date())

  // Zoom centered on a specific X position (relative to timeline content)
  // factor: 1.08 for smooth wheel zoom, 1.3 for button clicks
  const zoomAtPosition = useCallback((zoomIn: boolean, mouseXInTimeline: number, factor = 1.08) => {
    setViewState(prev => {
      const oldZoom = prev.zoom
      const newZoom = zoomIn
        ? Math.min(oldZoom * factor, MAX_ZOOM)
        : Math.max(oldZoom / factor, minZoom)

      if (newZoom === oldZoom) return prev

      // Calculate the time offset at mouse position
      const oldPixelsPerHour = BASE_PIXELS_PER_HOUR * oldZoom
      const timeOffset = (prev.scrollLeft + mouseXInTimeline) / oldPixelsPerHour

      // Calculate new scroll to keep the same time under the mouse
      const newPixelsPerHour = BASE_PIXELS_PER_HOUR * newZoom
      const newScrollLeft = (timeOffset * newPixelsPerHour) - mouseXInTimeline

      // Calculate max scroll for new zoom
      const newTotalWidth = hoursInView * newPixelsPerHour
      const maxScroll = Math.max(0, newTotalWidth - availableWidth)

      return {
        zoom: newZoom,
        scrollLeft: Math.max(0, Math.min(newScrollLeft, maxScroll))
      }
    })
  }, [minZoom, hoursInView, availableWidth])

  // Zoom from header buttons - center on visible area, use larger factor
  const handleZoomIn = useCallback(() => {
    zoomAtPosition(true, availableWidth / 2, 1.3)
  }, [zoomAtPosition, availableWidth])

  const handleZoomOut = useCallback(() => {
    zoomAtPosition(false, availableWidth / 2, 1.3)
  }, [zoomAtPosition, availableWidth])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey) {
      // Get mouse position relative to the timeline content area
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        const mouseXInTimeline = e.clientX - rect.left - SIDEBAR_WIDTH
        zoomAtPosition(e.deltaY < 0, mouseXInTimeline)
      }
    } else {
      const maxScroll = Math.max(0, totalWidth - availableWidth)
      setViewState(prev => ({
        ...prev,
        scrollLeft: Math.max(0, Math.min(prev.scrollLeft + e.deltaY, maxScroll))
      }))
    }
  }, [totalWidth, availableWidth, zoomAtPosition])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const handleCreateSession = async (projectId: number, startAt: Date, endAt: Date) => {
    await create({
      project_id: projectId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString()
    })
  }

  const handleUpdateSession = async (sessionId: number, startAt: Date, endAt: Date) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    await update({
      id: sessionId,
      project_id: session.project_id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString()
    })
  }

  const handleDeleteSession = async (sessionId: number) => {
    if (confirm('Eliminare questa sessione?')) {
      await remove(sessionId)
    }
  }

  const handleUpdateSessionNote = async (sessionId: number, notes: string | null) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    await update({
      id: sessionId,
      project_id: session.project_id,
      start_at: session.start_at,
      end_at: session.end_at,
      notes
    })
  }

  const handleAddProject = (projectId: number) => {
    if (!activeProjectIds.includes(projectId)) {
      setActiveProjectIds([...activeProjectIds, projectId])
      // Remove from removed list so it can be auto-added again in future
      setRemovedProjectIds(prev => prev.filter(id => id !== projectId))
    }
  }

  // Open the removal modal instead of directly removing
  const handleRemoveTrackRequest = (projectId: number) => {
    setRemovalModal({ projectId })
  }

  // Hide track from timeline (keep sessions in DB)
  const handleHideTrack = (projectId: number) => {
    setActiveProjectIds(prev => prev.filter(id => id !== projectId))
    // Track as manually removed so it won't be auto-added again
    setRemovedProjectIds(prev => [...prev, projectId])
  }

  // Delete all sessions for a project
  const handleDeleteAllSessions = async (projectId: number) => {
    await removeByProject(projectId)
    setActiveProjectIds(prev => prev.filter(id => id !== projectId))
    setRemovedProjectIds(prev => [...prev, projectId])
  }

  const availableProjects = projects.filter(p => !activeProjectIds.includes(p.id) && !p.archived)
  const activeProjects = projects.filter(p => activeProjectIds.includes(p.id))

  // Get the project being removed for the modal
  const removalProject = removalModal
    ? projects.find(p => p.id === removalModal.projectId)
    : null
  const removalSessionCount = removalModal
    ? sessions.filter(s => s.project_id === removalModal.projectId).length
    : 0

  return (
    <div className="h-full flex flex-col gap-4">
      <div
        ref={containerRef}
        className="flex-1 flex flex-col bg-[var(--bg-surface)] rounded-xl
                   border border-[var(--border-subtle)] overflow-hidden"
      >
      <TimelineHeader
        currentDate={currentDate}
        viewMode={viewMode}
        zoom={zoom}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onDateChange={setCurrentDate}
        onViewModeChange={setViewMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* Ruler */}
      <div className="flex">
        <div className="w-44 flex-shrink-0 bg-[var(--bg-elevated)] border-r border-[var(--border-subtle)] relative z-10" />
        <div className="flex-1 overflow-hidden">
          <TimelineRuler
            viewStart={viewStart}
            viewEnd={viewEnd}
            viewMode={viewMode}
            pixelsPerHour={pixelsPerHour}
            scrollLeft={scrollLeft}
          />
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Project tracks */}
        {activeProjects.map(project => (
          <TimelineTrack
            key={project.id}
            projectId={project.id}
            projectName={project.name}
            projectColor={project.color}
            clientName={project.client_name}
            sessions={sessions.filter(s => s.project_id === project.id)}
            viewStart={viewStart}
            pixelsPerHour={pixelsPerHour}
            totalWidth={totalWidth}
            scrollLeft={scrollLeft}
            gridLines={gridLines}
            nowPosition={nowPosition}
            onCreateSession={handleCreateSession}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
            onRemoveTrack={handleRemoveTrackRequest}
            onUpdateSessionNote={handleUpdateSessionNote}
          />
        ))}

        {/* Empty state hint */}
        {activeProjects.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
            <p className="text-sm">Seleziona un progetto per iniziare</p>
          </div>
        )}
      </div>
      </div>

      {/* Add project button - floating outside the timeline container */}
      {availableProjects.length > 0 && (
        <div className="flex justify-center">
          <SearchableProjectSelect
            projects={availableProjects}
            onSelect={handleAddProject}
          />
        </div>
      )}

      {/* Track removal modal */}
      <TrackRemovalModal
        projectName={removalProject?.name ?? ''}
        sessionCount={removalSessionCount}
        isOpen={removalModal !== null}
        onClose={() => setRemovalModal(null)}
        onHide={() => {
          if (removalModal) handleHideTrack(removalModal.projectId)
        }}
        onDeleteAll={async () => {
          if (removalModal) await handleDeleteAllSessions(removalModal.projectId)
        }}
      />
    </div>
  )
}
