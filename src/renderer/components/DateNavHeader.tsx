import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import DatePicker, { registerLocale } from 'react-datepicker'
import { it } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

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

interface Props {
  currentDate: Date
  onDateChange: (date: Date) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export default function DateNavHeader({
  currentDate,
  onDateChange,
  onPrev,
  onNext,
  onToday
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
    return currentDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <button
          onClick={onPrev}
          className="btn btn-ghost btn-icon"
          title="Giorno precedente"
        >
          <ChevronLeftIcon />
        </button>
        <button
          onClick={onNext}
          className="btn btn-ghost btn-icon"
          title="Giorno successivo"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <button
        onClick={onToday}
        className="btn btn-secondary text-sm"
      >
        Oggi
      </button>

      {/* Date selector */}
      <div className="relative ml-2">
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
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}
