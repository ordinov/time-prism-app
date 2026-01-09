/**
 * Centralized formatting utilities
 * Replaces duplicate implementations in Projects.tsx, SessionsTable.tsx, Timeline/utils.ts
 */

/**
 * Format minutes as H:MM (e.g., 90 -> "1:30")
 * Used in: Projects.tsx, SessionsTable.tsx
 */
export function formatDuration(minutes: number): string {
  const mins = minutes || 0
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

/**
 * Format minutes as work days (8 hours = 1 day)
 * Used in: Projects.tsx, SessionsTable.tsx
 */
export function formatWorkdays(minutes: number, hoursPerDay = 8): string {
  return ((minutes || 0) / 60 / hoursPerDay).toFixed(2)
}

/**
 * Format a duration from start/end timestamps as "Xh XXm"
 * Used in: Timeline/utils.ts (tooltip display)
 */
export function formatDurationFromRange(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const diffMs = end.getTime() - start.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

/**
 * Format a time range as "HH:MM - HH:MM"
 * Used in: Timeline/utils.ts
 */
export function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const fmt = (d: Date) => d.toLocaleTimeString('it-IT', { hour: 'numeric', minute: '2-digit' })
  return `${fmt(start)} - ${fmt(end)}`
}

/**
 * Format time from ISO string as HH:MM
 * Used in: SessionsTable.tsx
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format date from ISO string as DD/MM/YY
 * Used in: SessionsTable.tsx
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/**
 * Format date as YYYY-MM-DD for storage/comparison
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Format hours as H:MM (e.g., 1.5 -> "1:30")
 * Used in: SessionsTable.tsx
 */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}
