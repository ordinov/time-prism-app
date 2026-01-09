import { useState, useMemo, useCallback } from 'react'
import Timeline from '../components/Timeline'
import SessionsTable from '../components/SessionsTable'
import DateNavHeader from '../components/DateNavHeader'
import { useSessions } from '../hooks/useSessions'
import { useProjects } from '../hooks/useProjects'
import type { SessionWithProject } from '@shared/types'

type Tab = 'track' | 'tabella'
type ViewMode = 'day' | 'week' | 'month'

export default function Tracking() {
  const [tab, setTab] = useState<Tab>('track')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')

  // Date range based on view mode
  const { start_date, end_date } = useMemo(() => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (viewMode) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        // Start of week (Monday)
        const dayOfWeek = start.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0
        start.setDate(start.getDate() - diff)
        start.setHours(0, 0, 0, 0)
        // End of week (Sunday)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        // Start of month
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        // End of month
        end.setMonth(end.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        break
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    }
  }, [currentDate, viewMode])

  const { sessions, create, update, remove } = useSessions({ start_date, end_date })
  const { projects } = useProjects()

  const handleUpdate = async (session: SessionWithProject) => {
    await update({
      id: session.id,
      project_id: session.project_id,
      start_at: session.start_at,
      end_at: session.end_at,
      notes: session.notes
    })
  }

  const handleCreate = async (projectId: number, startAt: string, endAt: string, notes?: string) => {
    await create({
      project_id: projectId,
      start_at: startAt,
      end_at: endAt,
      notes
    })
  }

  const handleDelete = async (id: number) => {
    await remove(id)
  }

  // Date navigation handlers based on view mode
  const handlePrev = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, viewMode])

  const handleNext = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, viewMode])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Tab buttons */}
      <div className="flex gap-1 px-4 pt-2 border-b border-subtle shrink-0">
        <button
          onClick={() => setTab('track')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'track'
              ? 'border-prism-violet text-primary'
              : 'border-transparent text-muted hover:text-secondary'
          }`}
        >
          Track
        </button>
        <button
          onClick={() => setTab('tabella')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'tabella'
              ? 'border-prism-violet text-primary'
              : 'border-transparent text-muted hover:text-secondary'
          }`}
        >
          Tabella
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'track' ? (
          <Timeline
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />
        ) : (
          <div className="h-full flex flex-col">
            {/* Date navigation header for table view */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <DateNavHeader
                currentDate={currentDate}
                viewMode={viewMode}
                onDateChange={setCurrentDate}
                onViewModeChange={setViewMode}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
              />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
              <SessionsTable
                sessions={sessions}
                projects={projects}
                currentDate={currentDate}
                onUpdate={handleUpdate}
                onCreate={handleCreate}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
