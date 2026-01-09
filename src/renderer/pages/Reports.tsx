import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import DatePicker, { registerLocale } from 'react-datepicker'
import { it } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { useSessions } from '../hooks/useSessions'
import { formatDuration, formatWorkdays } from '../utils/formatters'
import { calculateSessionDuration } from '../utils/calculations'
import { parseDateInputValue } from '../utils/dateUtils'

registerLocale('it', it)

type Preset = 'week' | 'month' | '30days' | 'custom'

export default function Reports() {
  const [preset, setPreset] = useState<Preset>('month')
  const [customStart, setCustomStart] = useState('')  // DD/MM/YY format
  const [customEnd, setCustomEnd] = useState('')      // DD/MM/YY format
  const [calendarOpen, setCalendarOpen] = useState<'start' | 'end' | null>(null)
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 })
  const calendarRef = useRef<HTMLDivElement>(null)
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)

  const { start_date, end_date } = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date = new Date(now)
    end.setHours(23, 59, 59, 999)

    switch (preset) {
      case 'week':
        start = new Date(now)
        const day = start.getDay()
        start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
        start.setHours(0, 0, 0, 0)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '30days':
        start = new Date(now)
        start.setDate(start.getDate() - 30)
        break
      case 'custom':
        start = customStart ? parseDateInputValue(customStart) || new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 1)
        end = customEnd ? parseDateInputValue(customEnd) || now : now
        end.setHours(23, 59, 59, 999)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    }
  }, [preset, customStart, customEnd])

  const { sessions, loading } = useSessions({ start_date, end_date })

  // Handle click outside for calendar
  useEffect(() => {
    if (!calendarOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const inputRef = calendarOpen === 'start' ? startInputRef : endInputRef
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        calendarRef.current && !calendarRef.current.contains(target)
      ) {
        setCalendarOpen(null)
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [calendarOpen])

  // Open calendar at input position
  const openCalendar = (type: 'start' | 'end', inputElement: HTMLInputElement) => {
    const rect = inputElement.getBoundingClientRect()
    setCalendarPosition({
      top: rect.bottom + 8,
      left: rect.left
    })
    setCalendarOpen(type)
  }

  // Handle calendar date selection
  const handleCalendarSelect = (date: Date | null) => {
    if (date) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear().toString().slice(-2)
      const formatted = `${day}/${month}/${year}`
      if (calendarOpen === 'start') {
        setCustomStart(formatted)
      } else {
        setCustomEnd(formatted)
      }
    }
    setCalendarOpen(null)
  }

  const projectStats = useMemo(() => {
    const stats: Record<number, { name: string; client: string | null; minutes: number }> = {}

    sessions.forEach(s => {
      const duration = calculateSessionDuration(s)
      if (!stats[s.project_id]) {
        stats[s.project_id] = { name: s.project_name, client: s.client_name, minutes: 0 }
      }
      stats[s.project_id].minutes += duration
    })

    return Object.values(stats).sort((a, b) => b.minutes - a.minutes)
  }, [sessions])

  const dateStats = useMemo(() => {
    const stats: Record<string, number> = {}

    sessions.forEach(s => {
      const date = new Date(s.start_at).toLocaleDateString('it-IT')
      const duration = calculateSessionDuration(s)
      stats[date] = (stats[date] || 0) + duration
    })

    return Object.entries(stats)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime())
  }, [sessions])


  const totalMinutes = projectStats.reduce((sum, p) => sum + p.minutes, 0)

  if (loading) return <div className="p-4 text-secondary">Caricamento...</div>

  return (
    <div className="h-full overflow-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Report</h1>

      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="text-sm text-secondary block mb-1">Periodo</label>
          <select
            value={preset}
            onChange={e => setPreset(e.target.value as Preset)}
            className="select"
          >
            <option value="week">Questa settimana</option>
            <option value="month">Questo mese</option>
            <option value="30days">Ultimi 30 giorni</option>
            <option value="custom">Personalizzato</option>
          </select>
        </div>

        {preset === 'custom' && (
          <>
            <div>
              <label className="text-sm text-secondary block mb-1">Da</label>
              <input
                ref={startInputRef}
                type="text"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                onClick={(e) => openCalendar('start', e.currentTarget)}
                placeholder="GG/MM/AA"
                className="input cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm text-secondary block mb-1">A</label>
              <input
                ref={endInputRef}
                type="text"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                onClick={(e) => openCalendar('end', e.currentTarget)}
                placeholder="GG/MM/AA"
                className="input cursor-pointer"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">Riepilogo per Progetto</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-subtle text-left">
                <th className="py-2 text-secondary font-medium">Progetto</th>
                <th className="py-2 text-secondary font-medium">Cliente</th>
                <th className="py-2 text-right text-secondary font-medium">Ore</th>
                <th className="py-2 text-right text-secondary font-medium">Giorni</th>
              </tr>
            </thead>
            <tbody>
              {projectStats.map((p, i) => (
                <tr key={i} className="border-b border-subtle">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-secondary">{p.client || '—'}</td>
                  <td className="py-2 text-right font-mono">{formatDuration(p.minutes)}</td>
                  <td className="py-2 text-right font-mono">{formatWorkdays(p.minutes)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2">TOTALE</td>
                <td></td>
                <td className="py-2 text-right font-mono">{formatDuration(totalMinutes)}</td>
                <td className="py-2 text-right font-mono">{formatWorkdays(totalMinutes)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">Riepilogo per Data</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-subtle text-left">
                <th className="py-2 text-secondary font-medium">Data</th>
                <th className="py-2 text-right text-secondary font-medium">Ore</th>
                <th className="py-2 text-right text-secondary font-medium">Giorni</th>
              </tr>
            </thead>
            <tbody>
              {dateStats.map((d, i) => (
                <tr key={i} className="border-b border-subtle">
                  <td className="py-2">{d.date}</td>
                  <td className="py-2 text-right font-mono">{formatDuration(d.minutes)}</td>
                  <td className="py-2 text-right font-mono">{formatWorkdays(d.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calendar portal */}
      {calendarOpen && createPortal(
        <div
          ref={calendarRef}
          className="fixed z-[9999] animate-scale-in"
          style={{ top: calendarPosition.top, left: calendarPosition.left }}
        >
          <DatePicker
            selected={(() => {
              const dateStr = calendarOpen === 'start' ? customStart : customEnd
              if (!dateStr) return new Date()
              const parsed = parseDateInputValue(dateStr)
              return parsed || new Date()
            })()}
            onChange={handleCalendarSelect}
            inline
            locale="it"
          />
        </div>,
        document.body
      )}
    </div>
  )
}
