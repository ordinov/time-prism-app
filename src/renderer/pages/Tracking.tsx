import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Timeline from '../components/Timeline'
import SessionsTable from '../components/SessionsTable'
import DateNavHeader from '../components/DateNavHeader'
import SearchableSelect, { type SelectOption } from '../components/SearchableSelect'
import { useSessions } from '../hooks/useSessions'
import { useProjects } from '../hooks/useProjects'
import type { SessionWithProject } from '@shared/types'

// Filter icons
const ClientIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
)

const ProjectIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
)

const ClearFiltersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

type Tab = 'track' | 'tabella'
type ViewMode = 'day' | 'week' | 'month'

export default function Tracking() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const urlTab = searchParams.get('tab')
    return urlTab === 'tabella' ? 'tabella' : 'track'
  })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [clientFilter, setClientFilter] = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState<number | null>(() => {
    const urlProjectId = searchParams.get('projectId')
    return urlProjectId ? parseInt(urlProjectId, 10) : null
  })
  const [textSearch, setTextSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Clear URL params after reading them
  useEffect(() => {
    if (searchParams.has('tab') || searchParams.has('projectId')) {
      setSearchParams({}, { replace: true })
    }
  }, [])

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

  // Build filter options from sessions
  const clientOptions: SelectOption[] = useMemo(() => {
    const uniqueClients = new Map<string, string>()
    sessions.forEach(s => {
      if (s.client_name && !uniqueClients.has(s.client_name)) {
        uniqueClients.set(s.client_name, s.client_name)
      }
    })
    return Array.from(uniqueClients.values())
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({ value: name, label: name }))
  }, [sessions])

  const projectOptions: SelectOption[] = useMemo(() => {
    const uniqueProjects = new Map<number, { name: string; color: string; client: string | null }>()
    sessions.forEach(s => {
      if (!uniqueProjects.has(s.project_id)) {
        uniqueProjects.set(s.project_id, {
          name: s.project_name,
          color: s.project_color,
          client: s.client_name
        })
      }
    })
    return Array.from(uniqueProjects.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, p]) => ({
        value: id,
        label: p.name,
        sublabel: p.client || undefined,
        color: p.color
      }))
  }, [sessions])

  // Filter sessions based on selected filters
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (clientFilter && s.client_name !== clientFilter) return false
      if (projectFilter && s.project_id !== projectFilter) return false
      if (textSearch) {
        const searchLower = textSearch.toLowerCase()
        const matchesClient = s.client_name?.toLowerCase().includes(searchLower)
        const matchesProject = s.project_name.toLowerCase().includes(searchLower)
        if (!matchesClient && !matchesProject) return false
      }
      return true
    })
  }, [sessions, clientFilter, projectFilter, textSearch])

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

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
      <div className="flex justify-between items-center px-4 pt-2 border-b border-subtle shrink-0">
        <div className="flex gap-1">
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
        <span className="text-xs text-[var(--text-secondary)] italic flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          Mouse wheel per navigare &nbsp; | &nbsp; CTRL + mouse wheel per zoomare
        </span>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'track' ? (
          <Timeline
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            clientFilter={clientFilter}
            projectFilter={projectFilter}
            onClientFilterChange={setClientFilter}
            onProjectFilterChange={setProjectFilter}
          />
        ) : (
          <div className="h-full flex flex-col">
            {/* Date navigation header with filters for table view */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between gap-4">
                <DateNavHeader
                  currentDate={currentDate}
                  viewMode={viewMode}
                  onDateChange={setCurrentDate}
                  onViewModeChange={setViewMode}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onToday={handleToday}
                />
                <div className="flex items-center gap-1">
                  {/* Text search */}
                  {isSearchOpen ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={textSearch}
                        onChange={e => setTextSearch(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            setIsSearchOpen(false)
                            if (!textSearch) setTextSearch('')
                          }
                        }}
                        placeholder="Cerca..."
                        className="w-32 px-2 py-1.5 text-sm rounded-lg
                                   bg-[var(--bg-elevated)] border border-[var(--prism-violet)]
                                   text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                                   focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          setIsSearchOpen(false)
                          if (!textSearch) setTextSearch('')
                        }}
                        className="flex items-center justify-center w-9 h-9 rounded-lg
                                   text-[var(--text-muted)] hover:text-[var(--text-primary)]
                                   transition-colors"
                        title="Chiudi ricerca"
                      >
                        <ClearFiltersIcon />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className={`relative flex items-center justify-center w-9 h-9 rounded-lg
                                 bg-[var(--bg-elevated)] border transition-colors cursor-pointer
                                 ${textSearch
                                   ? 'border-[var(--prism-violet)] text-[var(--prism-violet)]'
                                   : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--prism-violet)] hover:text-[var(--text-secondary)]'}`}
                      title={textSearch ? `Ricerca: ${textSearch}` : 'Cerca'}
                    >
                      <SearchIcon />
                      {textSearch && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--prism-violet)] border-2 border-[var(--bg-base)]" />
                      )}
                    </button>
                  )}
                  <SearchableSelect
                    options={clientOptions}
                    value={clientFilter}
                    onChange={(v) => setClientFilter(v as string | null)}
                    placeholder="Cliente"
                    searchPlaceholder="Cerca cliente..."
                    emptyMessage="Nessun cliente"
                    alignRight
                    iconOnly
                    icon={<ClientIcon />}
                  />
                  <SearchableSelect
                    options={projectOptions}
                    value={projectFilter}
                    onChange={(v) => setProjectFilter(v as number | null)}
                    placeholder="Progetto"
                    searchPlaceholder="Cerca progetto..."
                    emptyMessage="Nessun progetto"
                    alignRight
                    iconOnly
                    icon={<ProjectIcon />}
                  />
                  {(clientFilter || projectFilter || textSearch) && (
                    <button
                      onClick={() => {
                        setClientFilter(null)
                        setProjectFilter(null)
                        setTextSearch('')
                        setIsSearchOpen(false)
                      }}
                      className="flex items-center justify-center w-9 h-9 rounded-lg
                                 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10
                                 transition-colors"
                      title="Pulisci filtri"
                    >
                      <ClearFiltersIcon />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
              <SessionsTable
                sessions={filteredSessions}
                totalSessions={sessions.length}
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
