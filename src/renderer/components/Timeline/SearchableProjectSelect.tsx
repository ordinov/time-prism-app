import { useState, useRef, useEffect, useMemo } from 'react'

interface Project {
  id: number
  name: string
  client_name?: string | null
  color?: string
}

interface SearchableProjectSelectProps {
  projects: Project[]
  onSelect: (projectId: number) => void
}

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

export default function SearchableProjectSelect({ projects, onSelect }: SearchableProjectSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects
    const term = search.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.client_name?.toLowerCase().includes(term)
    )
  }, [projects, search])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (projectId: number) => {
    onSelect(projectId)
    setIsOpen(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    } else if (e.key === 'Enter' && filteredProjects.length === 1) {
      handleSelect(filteredProjects[0].id)
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                   bg-[var(--bg-surface)] border border-[var(--border-default)]
                   hover:border-[var(--prism-violet)] transition-colors cursor-pointer
                   text-[var(--text-secondary)]"
      >
        <PlusIcon />
        <span>Aggiungi progetto</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64
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
                  onClick={() => handleSelect(project.id)}
                  className="w-full px-3 py-2 text-left flex items-center gap-2
                             hover:bg-white/5 transition-colors"
                >
                  {project.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
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
  )
}
