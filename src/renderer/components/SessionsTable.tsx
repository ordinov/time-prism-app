import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import DatePicker, { registerLocale } from 'react-datepicker'
import { it } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import type { SessionWithProject, ProjectWithClient } from '@shared/types'
import ConfirmModal from './ConfirmModal'
import NoteViewModal from './NoteViewModal'

registerLocale('it', it)

// Icons
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

// Types
type SortKey = 'client' | 'project' | 'date' | 'start' | 'end' | 'notes' | 'hours' | 'days'
type SortDirection = 'asc' | 'desc'

interface EditingCell {
  sessionId: number
  field: 'project' | 'date' | 'start' | 'end' | 'notes'
}

interface NewRowData {
  projectId: number | null
  date: string  // YYYY-MM-DD format
  start: string // HH:MM format
  end: string   // HH:MM format
  notes: string
}

interface Props {
  sessions: SessionWithProject[]
  projects: ProjectWithClient[]
  currentDate: Date
  onUpdate: (session: SessionWithProject) => Promise<void>
  onCreate: (projectId: number, startAt: string, endAt: string, notes?: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

// Helper functions
function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function toDateInputValue(isoString: string): string {
  const date = new Date(isoString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(-2)
  return `${day}/${month}/${year}`
}

function parseDateInputValue(value: string): Date | null {
  // Parse DD/MM/YY format
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (!match) return null
  const day = parseInt(match[1])
  const month = parseInt(match[2]) - 1
  const year = 2000 + parseInt(match[3])
  const date = new Date(year, month, day)
  if (isNaN(date.getTime())) return null
  return date
}

function toDateISOValue(dateStr: string): string {
  // Convert DD/MM/YY to YYYY-MM-DD for storage
  const date = parseDateInputValue(dateStr)
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

function toTimeInputValue(isoString: string): string {
  const date = new Date(isoString)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function calculateHours(startAt: string, endAt: string): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  return (end - start) / (1000 * 60 * 60)
}

function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}

function calculateDays(hours: number): number {
  return hours / 8
}

export default function SessionsTable({ sessions, projects, currentDate, onUpdate, onCreate, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [deleteModal, setDeleteModal] = useState<{ session: SessionWithProject } | null>(null)
  const [newRow, setNewRow] = useState<NewRowData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [validationError, setValidationError] = useState<number | null>(null)
  const [calendarOpen, setCalendarOpen] = useState<'edit' | 'new' | null>(null)
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 })

  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const calendarInputRef = useRef<HTMLInputElement | null>(null)
  const newRowRef = useRef<HTMLTableRowElement>(null)

  // Sort sessions
  const sortedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case 'client':
          comparison = (a.client_name || '').localeCompare(b.client_name || '')
          break
        case 'project':
          comparison = a.project_name.localeCompare(b.project_name)
          break
        case 'date':
        case 'start':
          comparison = new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
          break
        case 'end':
          comparison = new Date(a.end_at).getTime() - new Date(b.end_at).getTime()
          break
        case 'notes':
          comparison = (a.notes || '').localeCompare(b.notes || '')
          break
        case 'hours':
        case 'days':
          const hoursA = calculateHours(a.start_at, a.end_at)
          const hoursB = calculateHours(b.start_at, b.end_at)
          comparison = hoursA - hoursB
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [sessions, sortKey, sortDirection])

  // Save edit - defined before useEffect that uses it
  const saveEdit = useCallback(async () => {
    if (!editingCell) return

    const session = sessions.find(s => s.id === editingCell.sessionId)
    if (!session) {
      setEditingCell(null)
      return
    }

    let updatedSession = { ...session }

    switch (editingCell.field) {
      case 'project': {
        const projectId = parseInt(editValue)
        const project = projects.find(p => p.id === projectId)
        if (project) {
          updatedSession.project_id = projectId
          updatedSession.project_name = project.name
          updatedSession.project_color = project.color
          updatedSession.client_name = project.client_name
        }
        break
      }
      case 'date': {
        const newDate = parseDateInputValue(editValue)
        if (!newDate) {
          setEditingCell(null)
          return
        }
        const oldStart = new Date(session.start_at)
        const oldEnd = new Date(session.end_at)

        const newStart = new Date(newDate)
        newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0)

        const newEnd = new Date(newDate)
        newEnd.setHours(oldEnd.getHours(), oldEnd.getMinutes(), 0, 0)

        updatedSession.start_at = newStart.toISOString()
        updatedSession.end_at = newEnd.toISOString()
        break
      }
      case 'start': {
        const [hours, minutes] = editValue.split(':').map(Number)
        const newStart = new Date(session.start_at)
        newStart.setHours(hours, minutes, 0, 0)

        if (newStart.getTime() >= new Date(session.end_at).getTime()) {
          setValidationError(session.id)
          setEditingCell(null)
          return
        }

        updatedSession.start_at = newStart.toISOString()
        break
      }
      case 'end': {
        const [hours, minutes] = editValue.split(':').map(Number)
        const newEnd = new Date(session.end_at)
        newEnd.setHours(hours, minutes, 0, 0)

        if (newEnd.getTime() <= new Date(session.start_at).getTime()) {
          setValidationError(session.id)
          setEditingCell(null)
          return
        }

        updatedSession.end_at = newEnd.toISOString()
        break
      }
      case 'notes':
        updatedSession.notes = editValue || null
        break
    }

    setEditingCell(null)
    setValidationError(null)

    try {
      await onUpdate(updatedSession)
    } catch (err) {
      console.error('Failed to update session:', err)
    }
  }, [editingCell, editValue, sessions, projects, onUpdate])

  // Handle click outside for editing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editingCell && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        saveEdit()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingCell, editValue, saveEdit])

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      if ('select' in inputRef.current && editingCell.field !== 'project') {
        (inputRef.current as HTMLInputElement).select()
      }
    }
  }, [editingCell])

  // Handle click outside for calendar
  useEffect(() => {
    if (!calendarOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        calendarInputRef.current && !calendarInputRef.current.contains(target) &&
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

  // Handle ESC key and click outside for new row
  useEffect(() => {
    if (!newRow) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNewRow(null)
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      // Don't cancel if clicking on calendar
      if (calendarRef.current?.contains(target)) return
      // Don't cancel if clicking inside the new row
      if (newRowRef.current?.contains(target)) return
      // Cancel the new row
      setNewRow(null)
      setCalendarOpen(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    // Use a small delay to avoid immediate cancellation when clicking the button
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [newRow])

  // Open calendar at input position
  const openCalendar = (type: 'edit' | 'new', inputElement: HTMLInputElement) => {
    calendarInputRef.current = inputElement
    const rect = inputElement.getBoundingClientRect()
    setCalendarPosition({
      top: rect.bottom + 8,
      left: rect.left
    })
    setCalendarOpen(type)
  }

  // Handle calendar date selection for edit mode
  const handleCalendarSelectEdit = (date: Date | null) => {
    if (date) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear().toString().slice(-2)
      setEditValue(`${day}/${month}/${year}`)
    }
    setCalendarOpen(null)
  }

  // Handle calendar date selection for new row
  const handleCalendarSelectNew = (date: Date | null) => {
    if (date && newRow) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear().toString().slice(-2)
      setNewRow({ ...newRow, date: `${day}/${month}/${year}` })
    }
    setCalendarOpen(null)
  }

  // Handle sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // Get sort indicator
  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  // Start editing a cell
  const startEdit = (session: SessionWithProject, field: EditingCell['field']) => {
    setEditingCell({ sessionId: session.id, field })
    setValidationError(null)

    switch (field) {
      case 'project':
        setEditValue(session.project_id.toString())
        break
      case 'date':
        setEditValue(toDateInputValue(session.start_at))
        break
      case 'start':
        setEditValue(toTimeInputValue(session.start_at))
        break
      case 'end':
        setEditValue(toTimeInputValue(session.end_at))
        break
      case 'notes':
        setEditValue(session.notes || '')
        break
    }
  }

  // Handle key down in edit mode
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setValidationError(null)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      await saveEdit()
      // Move to next cell
      if (editingCell) {
        const session = sessions.find(s => s.id === editingCell.sessionId)
        if (session) {
          const fields: EditingCell['field'][] = ['project', 'date', 'start', 'end', 'notes']
          const currentIndex = fields.indexOf(editingCell.field)
          const nextIndex = (currentIndex + 1) % fields.length

          if (nextIndex > currentIndex) {
            setTimeout(() => startEdit(session, fields[nextIndex]), 0)
          }
        }
      }
    }
  }

  // Initialize new row with pre-filled date and start time
  const handleStartCreate = () => {
    if (projects.length === 0) return
    if (newRow) return // Already creating

    const now = new Date()
    const day = currentDate.getDate().toString().padStart(2, '0')
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    const year = currentDate.getFullYear().toString().slice(-2)
    const dateStr = `${day}/${month}/${year}`
    const startStr = `${now.getHours().toString().padStart(2, '0')}:00`

    setNewRow({
      projectId: null,
      date: dateStr,
      start: startStr,
      end: '',
      notes: ''
    })
  }

  // Check if new row is valid (can be saved)
  const isNewRowValid = newRow && newRow.projectId !== null && newRow.end !== ''

  // Save the new row
  const handleSaveNewRow = async () => {
    if (!newRow || !isNewRowValid) return

    const parsedDate = parseDateInputValue(newRow.date)
    if (!parsedDate) return

    const [startHours, startMinutes] = newRow.start.split(':').map(Number)
    const [endHours, endMinutes] = newRow.end.split(':').map(Number)

    const startDate = new Date(parsedDate)
    startDate.setHours(startHours, startMinutes, 0, 0)

    const endDate = new Date(parsedDate)
    endDate.setHours(endHours, endMinutes, 0, 0)

    // Validate end > start
    if (endDate.getTime() <= startDate.getTime()) {
      return // Invalid time range
    }

    try {
      setIsSaving(true)
      await onCreate(
        newRow.projectId!,
        startDate.toISOString(),
        endDate.toISOString(),
        newRow.notes || undefined
      )
      setNewRow(null)
    } catch (err) {
      console.error('Failed to create session:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Cancel new row creation
  const handleCancelNewRow = () => {
    setNewRow(null)
  }

  // Get selected project for new row
  const newRowProject = newRow?.projectId
    ? projects.find(p => p.id === newRow.projectId)
    : null

  // Delete session
  const handleDelete = async (id: number) => {
    try {
      await onDelete(id)
      setDeleteModal(null)
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  // Render cell content
  const renderCell = (session: SessionWithProject, field: EditingCell['field']) => {
    const isEditing = editingCell?.sessionId === session.id && editingCell?.field === field
    const hasError = validationError === session.id && (field === 'start' || field === 'end')

    if (isEditing) {
      switch (field) {
        case 'project':
          return (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="select w-full py-1 text-sm"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.client_name ? `(${p.client_name})` : ''}
                </option>
              ))}
            </select>
          )
        case 'date':
          return (
            <div className="relative">
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => openCalendar('edit', e.currentTarget)}
                placeholder="GG/MM/AA"
                className="input py-1 text-sm w-full cursor-pointer"
              />
            </div>
          )
        case 'start':
        case 'end':
          return (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="time"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input py-1 text-sm font-mono w-full"
            />
          )
        case 'notes':
          return (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Aggiungi nota..."
              className="input py-1 text-sm w-full"
            />
          )
      }
    }

    // Display mode
    const cellClasses = `cursor-pointer hover:bg-white/5 px-3 py-2 transition-colors ${
      hasError ? 'border border-[var(--error)] rounded' : ''
    }`

    switch (field) {
      case 'project':
        return (
          <div
            onClick={() => startEdit(session, field)}
            className={cellClasses}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: session.project_color }}
              />
              <span className="truncate">{session.project_name}</span>
            </div>
          </div>
        )
      case 'date':
        return (
          <div onClick={() => startEdit(session, field)} className={cellClasses}>
            {formatDate(session.start_at)}
          </div>
        )
      case 'start':
        return (
          <div onClick={() => startEdit(session, field)} className={`${cellClasses} font-mono`}>
            {formatTime(session.start_at)}
          </div>
        )
      case 'end':
        return (
          <div onClick={() => startEdit(session, field)} className={`${cellClasses} font-mono`}>
            {formatTime(session.end_at)}
          </div>
        )
      case 'notes':
        return (
          <div onClick={() => startEdit(session, field)} className={`${cellClasses} max-w-[200px] xl:max-w-[400px] 2xl:max-w-[600px]`}>
            <span className={`block truncate ${session.notes ? '' : 'text-[var(--text-muted)]'}`} title={session.notes || ''}>
              {session.notes || '—'}
            </span>
          </div>
        )
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Header with add button */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--border-subtle)]">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">
          {sessions.length} sessioni
        </h3>
        <button
          onClick={handleStartCreate}
          disabled={newRow !== null || projects.length === 0}
          className="btn btn-primary text-sm py-1.5 px-3"
        >
          + Nuova sessione
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <th
                onClick={() => handleSort('client')}
                className="text-left px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
              >
                <span className="flex items-center gap-2">
                  Cliente
                  <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('client')}</span>
                </span>
              </th>
              <th
                onClick={() => handleSort('project')}
                className="text-left px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
              >
                <span className="flex items-center gap-2">
                  Progetto
                  <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('project')}</span>
                </span>
              </th>
              <th
                onClick={() => handleSort('date')}
                className="text-left px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
              >
                <span className="flex items-center gap-2">
                  Data
                  <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('date')}</span>
                </span>
              </th>
              <th
                onClick={() => handleSort('start')}
                className="text-left px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
              >
                <span className="flex items-center gap-2">
                  Inizio
                  <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('start')}</span>
                </span>
              </th>
              <th
                onClick={() => handleSort('end')}
                className="text-left px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
              >
                <span className="flex items-center gap-2">
                  Fine
                  <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('end')}</span>
                </span>
              </th>
              <th
                onClick={() => handleSort('notes')}
                className="text-left px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
              >
                <span className="flex items-center gap-2">
                  Note
                  <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('notes')}</span>
                </span>
              </th>
              <th
                onClick={() => handleSort('hours')}
                className="text-right px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none bg-[var(--bg-overlay)]"
              >
                <span className="flex items-center justify-end gap-2">
                  Ore
                  <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('hours')}</span>
                </span>
              </th>
              <th
                onClick={() => handleSort('days')}
                className="text-right px-3 py-3 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none bg-[var(--bg-overlay)]"
              >
                <span className="flex items-center justify-end gap-2">
                  Giorni
                  <span className="text-[var(--text-muted)] text-xs">{getSortIndicator('days')}</span>
                </span>
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {/* New row being created */}
            {newRow && (
              <tr ref={newRowRef} className="border-b border-[var(--border-subtle)] bg-[var(--prism-violet)]/5">
                {/* Cliente - derived from project */}
                <td className="px-3 py-2 min-w-[150px] text-[var(--text-muted)]">
                  {newRowProject?.client_name || '—'}
                </td>
                {/* Progetto - select */}
                <td className="min-w-[200px] px-1">
                  <select
                    value={newRow.projectId ?? ''}
                    onChange={e => setNewRow({ ...newRow, projectId: e.target.value ? parseInt(e.target.value) : null })}
                    className={`select w-full py-1 text-sm ${!newRow.projectId ? 'text-[var(--text-muted)]' : ''}`}
                  >
                    <option value="">Seleziona progetto...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.client_name ? `(${p.client_name})` : ''}
                      </option>
                    ))}
                  </select>
                </td>
                {/* Data - pre-filled */}
                <td className="min-w-[100px] px-1">
                  <input
                    type="text"
                    value={newRow.date}
                    onChange={e => setNewRow({ ...newRow, date: e.target.value })}
                    onClick={(e) => openCalendar('new', e.currentTarget as HTMLInputElement)}
                    placeholder="GG/MM/AA"
                    className="input py-1 text-sm w-full cursor-pointer"
                  />
                </td>
                {/* Inizio - pre-filled */}
                <td className="min-w-[80px] px-1">
                  <input
                    type="time"
                    value={newRow.start}
                    onChange={e => setNewRow({ ...newRow, start: e.target.value })}
                    className="input py-1 text-sm font-mono w-full"
                  />
                </td>
                {/* Fine - empty */}
                <td className="min-w-[80px] px-1">
                  <input
                    type="time"
                    value={newRow.end}
                    onChange={e => setNewRow({ ...newRow, end: e.target.value })}
                    className={`input py-1 text-sm font-mono w-full ${!newRow.end ? 'border-[var(--warning)]' : ''}`}
                    placeholder="--:--"
                  />
                </td>
                {/* Note - optional */}
                <td className="min-w-[150px] px-1">
                  <input
                    type="text"
                    value={newRow.notes}
                    onChange={e => setNewRow({ ...newRow, notes: e.target.value })}
                    placeholder="Note..."
                    className="input py-1 text-sm w-full"
                  />
                </td>
                {/* Ore - calculated or empty */}
                <td className="px-3 py-2 text-right font-mono text-[var(--text-muted)] bg-[var(--bg-overlay)]">
                  {newRow.start && newRow.end ? (() => {
                    const [sh, sm] = newRow.start.split(':').map(Number)
                    const [eh, em] = newRow.end.split(':').map(Number)
                    const hours = (eh * 60 + em - sh * 60 - sm) / 60
                    return hours > 0 ? formatHours(hours) : '—'
                  })() : '—'}
                </td>
                {/* Giorni - calculated or empty */}
                <td className="px-3 py-2 text-right font-mono text-[var(--text-muted)] bg-[var(--bg-overlay)]">
                  {newRow.start && newRow.end ? (() => {
                    const [sh, sm] = newRow.start.split(':').map(Number)
                    const [eh, em] = newRow.end.split(':').map(Number)
                    const hours = (eh * 60 + em - sh * 60 - sm) / 60
                    return hours > 0 ? (hours / 8).toFixed(2) : '—'
                  })() : '—'}
                </td>
                {/* Actions */}
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSaveNewRow}
                      disabled={!isNewRowValid || isSaving}
                      className={`btn btn-ghost btn-icon text-xs ${isNewRowValid ? 'text-[var(--success)] hover:bg-[var(--success)]/10' : 'text-[var(--text-muted)] cursor-not-allowed'}`}
                      title="Salva"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelNewRow}
                      className="btn btn-ghost btn-icon text-xs text-[var(--text-muted)] hover:text-[var(--error)]"
                      title="Annulla"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {sortedSessions.map((session) => {
              const hours = calculateHours(session.start_at, session.end_at)
              const days = calculateDays(hours)

              return (
                <tr
                  key={session.id}
                  className="border-b border-[var(--border-subtle)] hover:bg-white/[0.02] group"
                >
                  <td className="px-3 py-2 min-w-[150px] text-[var(--text-secondary)]">
                    {session.client_name || '—'}
                  </td>
                  <td className="min-w-[200px]">{renderCell(session, 'project')}</td>
                  <td className="min-w-[120px]">{renderCell(session, 'date')}</td>
                  <td className="min-w-[80px]">{renderCell(session, 'start')}</td>
                  <td className="min-w-[80px]">{renderCell(session, 'end')}</td>
                  <td className="min-w-[150px]">{renderCell(session, 'notes')}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)] bg-[var(--bg-overlay)]">
                    {formatHours(hours)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--text-secondary)] bg-[var(--bg-overlay)]">
                    {days.toFixed(2)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => setDeleteModal({ session })}
                      className="btn btn-ghost btn-icon opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error)] transition-all"
                      title="Elimina"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Empty state */}
        {sessions.length === 0 && !newRow && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
            <p className="text-lg">Nessuna sessione</p>
            <p className="text-sm mt-1">Crea la tua prima sessione</p>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <ConfirmModal
          isOpen={true}
          title="Elimina sessione"
          message={`Vuoi eliminare la sessione del ${formatDate(deleteModal.session.start_at)} (${formatTime(deleteModal.session.start_at)} - ${formatTime(deleteModal.session.end_at)})?`}
          confirmLabel="Elimina"
          cancelLabel="Annulla"
          danger
          onConfirm={() => handleDelete(deleteModal.session.id)}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {/* Calendar portal */}
      {calendarOpen && createPortal(
        <div
          ref={calendarRef}
          className="fixed z-[9999] animate-scale-in"
          style={{ top: calendarPosition.top, left: calendarPosition.left }}
        >
          <DatePicker
            selected={(() => {
              const dateStr = calendarOpen === 'edit' ? editValue : newRow?.date
              if (!dateStr) return new Date()
              const parsed = parseDateInputValue(dateStr)
              return parsed || new Date()
            })()}
            onChange={calendarOpen === 'edit' ? handleCalendarSelectEdit : handleCalendarSelectNew}
            inline
            locale="it"
          />
        </div>,
        document.body
      )}
    </div>
  )
}
