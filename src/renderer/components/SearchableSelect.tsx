import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

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

const XIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export interface SelectOption {
  value: string | number
  label: string
  sublabel?: string
  color?: string
}

interface Props {
  options: SelectOption[]
  value: string | number | null
  onChange: (value: string | number | null) => void
  placeholder: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  alignRight?: boolean
  icon?: React.ReactNode
  iconOnly?: boolean
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Cerca...',
  emptyMessage = 'Nessun risultato',
  className = '',
  alignRight = false,
  icon,
  iconOnly = false
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(o => o.value === value)

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const term = search.toLowerCase()
    return options.filter(o =>
      o.label.toLowerCase().includes(term) ||
      o.sublabel?.toLowerCase().includes(term)
    )
  }, [options, search])

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 256 // w-64 = 16rem = 256px
      setDropdownPosition({
        top: rect.bottom + 4,
        left: alignRight ? rect.right - dropdownWidth : rect.left,
        width: dropdownWidth
      })
    }
  }, [isOpen, alignRight])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearch('')
      }
    }

    // Delay to avoid immediate close on open click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (option: SelectOption) => {
    onChange(option.value)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setIsOpen(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0])
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {iconOnly ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center justify-center w-9 h-9 rounded-lg
                     bg-[var(--bg-elevated)] border transition-colors cursor-pointer
                     ${selectedOption
                       ? 'border-[var(--prism-violet)] text-[var(--prism-violet)]'
                       : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--prism-violet)] hover:text-[var(--text-secondary)]'}`}
          title={selectedOption ? `${placeholder}: ${selectedOption.label}` : placeholder}
        >
          {icon}
          {selectedOption && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--prism-violet)] border-2 border-[var(--bg-base)]" />
          )}
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg
                     bg-[var(--bg-elevated)] border border-[var(--border-default)]
                     hover:border-[var(--prism-violet)] transition-colors cursor-pointer
                     min-w-[140px] ${selectedOption ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          {selectedOption?.color && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className="flex-1 text-left truncate">
            {selectedOption?.label || placeholder}
          </span>
          {selectedOption ? (
            <span
              onClick={handleClear}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              <XIcon />
            </span>
          ) : (
            <ChevronDownIcon />
          )}
        </button>
      )}

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-[var(--bg-overlay)] border border-[var(--border-subtle)]
                     rounded-lg shadow-[var(--shadow-lg)] z-[9999] overflow-hidden"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width
          }}
        >
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
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md
                           bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                           text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                           focus:outline-none focus:border-[var(--prism-violet)]"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[var(--text-muted)] text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2
                             hover:bg-white/5 transition-colors
                             ${option.value === value ? 'bg-white/5' : ''}`}
                >
                  {option.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--text-primary)] truncate">
                      {option.label}
                    </div>
                    {option.sublabel && (
                      <div className="text-xs text-[var(--text-muted)] truncate">
                        {option.sublabel}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
