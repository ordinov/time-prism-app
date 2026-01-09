import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import DatePicker, { registerLocale } from 'react-datepicker'
import { it } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import type { ViewMode } from './utils'

registerLocale('it', it)

// Icons
const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)

const ZoomInIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
  </svg>
)

const ZoomOutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
  </svg>
)

interface Props {
  currentDate: Date
  viewMode: ViewMode
  zoom: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onDateChange: (date: Date) => void
  onViewModeChange: (mode: ViewMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
  children?: React.ReactNode
}

export default function TimelineHeader({
  currentDate,
  viewMode,
  zoom,
  onPrev,
  onNext,
  onToday,
  onDateChange,
  onViewModeChange,
  onZoomIn,
  onZoomOut,
  children
}: Props) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Update calendar position when opening
  useEffect(() => {
    if (isCalendarOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCalendarPosition({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
  }, [isCalendarOpen])

  useEffect(() => {
    if (!isCalendarOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        calendarRef.current && !calendarRef.current.contains(target)
      ) {
        setIsCalendarOpen(false)
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isCalendarOpen])

  const formatDate = () => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      case 'week': {
        // Calculate start of week (Monday)
        const start = new Date(currentDate)
        const dayOfWeek = start.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        start.setDate(start.getDate() - diff)
        // End of week (Sunday)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)

        const startDay = start.getDate()
        const endDay = end.getDate()
        // If same month, show "2-8 Gennaio 2025"
        // If different months, show "30 Dic - 5 Gen 2025"
        if (start.getMonth() === end.getMonth()) {
          const monthYear = end.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
          return `${startDay}-${endDay} ${monthYear}`
        } else {
          const startMonth = start.toLocaleDateString('it-IT', { month: 'short' })
          const endMonthYear = end.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
          return `${startDay} ${startMonth} - ${endDay} ${endMonthYear}`
        }
      }
      case 'month':
        return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    }
  }

  const viewModes: { mode: ViewMode; label: string }[] = [
    { mode: 'day', label: 'Giorno' },
    { mode: 'week', label: 'Settimana' },
    { mode: 'month', label: 'Mese' }
  ]

  return (
    <div className="flex items-center justify-between px-4 py-3
                    bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToday}
          className="btn btn-secondary text-sm"
        >
          Oggi
        </button>

        {/* Prev arrow */}
        <button
          onClick={onPrev}
          className="btn btn-ghost btn-icon"
          title="Precedente"
        >
          <ChevronLeftIcon />
        </button>

        {/* Date selector */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                       text-[var(--text-primary)] font-medium
                       hover:bg-white/5 transition-colors cursor-pointer"
          >
            <CalendarIcon />
            <span className="capitalize">{formatDate()}</span>
          </button>
          {isCalendarOpen && createPortal(
            <div
              ref={calendarRef}
              className="fixed z-[9999] animate-scale-in"
              style={{ top: calendarPosition.top, left: calendarPosition.left }}
            >
              {viewMode === 'day' && (
                <DatePicker
                  selected={currentDate}
                  onChange={(date: Date | null) => {
                    if (date) {
                      onDateChange(date)
                      setIsCalendarOpen(false)
                    }
                  }}
                  inline
                  locale="it"
                />
              )}
              {viewMode === 'week' && (
                <DatePicker
                  selected={currentDate}
                  onChange={(date: Date | null) => {
                    if (date) {
                      onDateChange(date)
                      setIsCalendarOpen(false)
                    }
                  }}
                  inline
                  locale="it"
                  showWeekNumbers
                  showWeekPicker
                  calendarStartDay={1}
                />
              )}
              {viewMode === 'month' && (
                <DatePicker
                  selected={currentDate}
                  onChange={(date: Date | null) => {
                    if (date) {
                      onDateChange(date)
                      setIsCalendarOpen(false)
                    }
                  }}
                  inline
                  locale="it"
                  showMonthYearPicker
                  dateFormat="MM/yyyy"
                />
              )}
            </div>,
            document.body
          )}
        </div>

        {/* Next arrow */}
        <button
          onClick={onNext}
          className="btn btn-ghost btn-icon"
          title="Successivo"
        >
          <ChevronRightIcon />
        </button>

        {/* View mode toggle - next to calendar like in Tabella view */}
        <div className="flex p-1 ml-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
          {viewModes.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                ${viewMode === mode
                  ? 'bg-gradient-to-r from-[var(--prism-violet)] to-[var(--prism-indigo)] text-white shadow-lg'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Filters & Zoom */}
      <div className="flex items-center gap-4">
        {/* Optional children (e.g., filters) */}
        {children}

        {/* Zoom controls */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
          <button
            onClick={onZoomOut}
            className="btn btn-ghost btn-icon"
            title="Riduci zoom"
          >
            <ZoomOutIcon />
          </button>
          <span className="text-sm text-[var(--text-secondary)] w-12 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="btn btn-ghost btn-icon"
            title="Aumenta zoom"
          >
            <ZoomInIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
