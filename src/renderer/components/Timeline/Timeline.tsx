import { useState, useRef, useCallback, useEffect } from 'react'
import TimelineHeader from './TimelineHeader'
import TimelineRuler from './TimelineRuler'
import TimelineTrack from './TimelineTrack'
import { useSessions } from '../../hooks/useSessions'
import { useProjects } from '../../hooks/useProjects'
import type { ViewMode } from './utils'
import { getViewStartEnd, getHoursInView } from './utils'

const BASE_PIXELS_PER_HOUR = 60
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4

export default function Timeline() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [zoom, setZoom] = useState(1)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [activeProjectIds, setActiveProjectIds] = useState<number[]>([])

  const containerRef = useRef<HTMLDivElement>(null)

  const { start: viewStart, end: viewEnd } = getViewStartEnd(currentDate, viewMode)
  const pixelsPerHour = BASE_PIXELS_PER_HOUR * zoom
  const totalWidth = getHoursInView(viewMode) * pixelsPerHour

  const { sessions, create, update, remove } = useSessions({
    start_date: viewStart.toISOString(),
    end_date: viewEnd.toISOString()
  })

  const { projects } = useProjects()

  // Add projects that have sessions in view
  useEffect(() => {
    const projectIdsWithSessions = [...new Set(sessions.map(s => s.project_id))]
    setActiveProjectIds(prev => {
      const combined = [...new Set([...prev, ...projectIdsWithSessions])]
      return combined
    })
  }, [sessions])

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

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.5, MAX_ZOOM))
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.5, MIN_ZOOM))

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft)
  }

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      if (e.deltaY < 0) handleZoomIn()
      else handleZoomOut()
    }
  }, [])

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

  const handleAddProject = (projectId: number) => {
    if (!activeProjectIds.includes(projectId)) {
      setActiveProjectIds([...activeProjectIds, projectId])
    }
  }

  const availableProjects = projects.filter(p => !activeProjectIds.includes(p.id) && !p.archived)
  const activeProjects = projects.filter(p => activeProjectIds.includes(p.id))

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-white rounded shadow">
      <TimelineHeader
        currentDate={currentDate}
        viewMode={viewMode}
        zoom={zoom}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewModeChange={setViewMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      <div className="flex">
        <div className="w-40 flex-shrink-0" />
        <div className="flex-1 overflow-x-auto" onScroll={handleScroll}>
          <TimelineRuler
            viewStart={viewStart}
            viewEnd={viewEnd}
            viewMode={viewMode}
            pixelsPerHour={pixelsPerHour}
            scrollLeft={scrollLeft}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto" onScroll={handleScroll}>
        <div className="flex border-b">
          <div className="w-40 flex-shrink-0 p-2 bg-gray-50 border-r">
            <select
              className="w-full text-sm border rounded px-2 py-1"
              value=""
              onChange={e => {
                if (e.target.value) handleAddProject(Number(e.target.value))
              }}
            >
              <option value="">+ Aggiungi progetto</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ width: totalWidth }} />
        </div>

        {activeProjects.map(project => (
          <TimelineTrack
            key={project.id}
            projectId={project.id}
            projectName={project.name}
            projectColor={project.color}
            sessions={sessions.filter(s => s.project_id === project.id)}
            viewStart={viewStart}
            pixelsPerHour={pixelsPerHour}
            totalWidth={totalWidth}
            scrollLeft={scrollLeft}
            onCreateSession={handleCreateSession}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
          />
        ))}
      </div>
    </div>
  )
}
