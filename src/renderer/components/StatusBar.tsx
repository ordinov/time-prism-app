import { useState, useRef, useEffect, useMemo } from 'react'
import { useTimer } from '../context/TimerContext'
import { useProjects } from '../hooks/useProjects'
import { APP_NAME, APP_VERSION } from '../lib/config'

// Icons
const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
)

const StopIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

export default function StatusBar() {
  const { isRunning, projectName, elapsed, start, stop } = useTimer()
  const { projects } = useProjects()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const activeProjects = projects.filter(p => !p.archived)

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return activeProjects
    const term = search.toLowerCase()
    return activeProjects.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.client_name?.toLowerCase().includes(term)
    )
  }, [activeProjects, search])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isDropdownOpen])

  const handleSelectProject = (project: typeof activeProjects[0]) => {
    start(project)
    setIsDropdownOpen(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false)
      setSearch('')
    } else if (e.key === 'Enter' && filteredProjects.length === 1) {
      handleSelectProject(filteredProjects[0])
    }
  }

  return (
    <div className="h-14 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]
                    grid grid-cols-3 items-center px-5">
      {/* Left side - empty for balance */}
      <div />

      {/* Center - Timer */}
      <div className="flex items-center justify-center gap-4">
        {isRunning ? (
          <>
            {/* Recording indicator */}
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)]" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-ping-slow" />
            </div>

            {/* Timer display */}
            <div className="font-mono text-xl tracking-wider text-[var(--text-primary)] tabular-nums">
              {formatElapsed(elapsed)}
            </div>

            {/* Project badge */}
            <div className="badge badge-prism">
              {projectName}
            </div>

            {/* Stop button */}
            <button
              onClick={stop}
              className="btn btn-danger ml-2"
            >
              <StopIcon />
              <span>Stop</span>
            </button>
          </>
        ) : (
          <>
            {/* Idle indicator */}
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-disabled)]" />

            {/* Quick start dropdown with search */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg
                           bg-[var(--bg-elevated)] border border-[var(--border-default)]
                           hover:border-[var(--prism-violet)] transition-colors cursor-pointer
                           text-[var(--text-secondary)] min-w-[200px]"
              >
                <PlayIcon />
                <span className="flex-1 text-left">Avvia timer</span>
                <ChevronDownIcon />
              </button>

              {/* Dropdown - opens upward */}
              {isDropdownOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72
                                bg-[var(--bg-overlay)] border border-[var(--border-subtle)]
                                rounded-lg shadow-[var(--shadow-lg)] z-50 overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b border-[var(--border-subtle)]">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        <SearchIcon />
                      </span>
                      <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Cerca progetto..."
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-md
                                   bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                                   text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                                   focus:outline-none focus:border-[var(--prism-violet)]"
                      />
                    </div>
                  </div>

                  {/* Project list */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredProjects.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-[var(--text-muted)] text-center">
                        Nessun progetto trovato
                      </div>
                    ) : (
                      filteredProjects.map(project => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => handleSelectProject(project)}
                          className="w-full px-3 py-2 text-left flex items-center gap-2
                                     hover:bg-white/5 transition-colors"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-[var(--text-primary)] truncate">
                              {project.name}
                            </div>
                            {project.client_name && (
                              <div className="text-xs text-[var(--text-muted)] truncate">
                                {project.client_name}
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Start hint */}
            <span className="text-[var(--text-muted)] text-sm whitespace-nowrap">
              Crea una sessione in realtime - minimo 00:01
            </span>
          </>
        )}
      </div>

      {/* Right side - version */}
      <div className="flex items-center justify-end gap-3">
        <div className="h-4 w-px bg-[var(--border-subtle)]" />
        <span className="text-[var(--text-disabled)] text-xs font-medium">
          {APP_NAME} v{APP_VERSION}
        </span>
      </div>
    </div>
  )
}
