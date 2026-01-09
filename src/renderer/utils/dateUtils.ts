/**
 * Centralized date utilities
 * Replaces duplicate implementations in Timeline/utils.ts, SessionsTable.tsx, Tracking.tsx
 */

export type ViewMode = 'day' | 'week' | 'month'

/**
 * Get day boundaries (00:00:00 to 23:59:59)
 */
export function getDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Get week boundaries (Monday 00:00 to Sunday 23:59)
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  const dayOfWeek = start.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  start.setDate(start.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Get month boundaries (1st 00:00 to last day 23:59)
 */
export function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Get view boundaries based on view mode
 * Replaces getViewStartEnd in Timeline/utils.ts
 */
export function getViewBounds(date: Date, mode: ViewMode): { start: Date; end: Date } {
  switch (mode) {
    case 'day':
      return getDayBounds(date)
    case 'week':
      return getWeekBounds(date)
    case 'month':
      return getMonthBounds(date)
  }
}

/**
 * Get total hours in a view (for Timeline calculations)
 */
export function getHoursInView(mode: ViewMode, date?: Date): number {
  switch (mode) {
    case 'day':
      return 24
    case 'week':
      return 24 * 7
    case 'month':
      if (date) {
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        return 24 * daysInMonth
      }
      return 24 * 31
  }
}

/**
 * Check if session spans overnight (crosses midnight)
 * Used in: SessionsTable.tsx, services
 */
export function isOvernight(startAt: string, endAt: string): boolean {
  const start = new Date(startAt)
  const end = new Date(endAt)
  return (
    end.getDate() !== start.getDate() ||
    end.getMonth() !== start.getMonth() ||
    end.getFullYear() !== start.getFullYear()
  )
}

/**
 * Convert date to pixel position (for Timeline)
 */
export function dateToPosition(date: Date, viewStart: Date, pixelsPerHour: number): number {
  const diffMs = date.getTime() - viewStart.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours * pixelsPerHour
}

/**
 * Convert pixel position to date (for Timeline)
 */
export function positionToDate(position: number, viewStart: Date, pixelsPerHour: number): Date {
  const hours = position / pixelsPerHour
  return new Date(viewStart.getTime() + hours * 60 * 60 * 1000)
}

/**
 * Snap a date to the nearest grid interval
 * Used in: Timeline for drag/resize snapping
 */
export function snapToGrid(date: Date, snapMinutes: number = 15): Date {
  const snapped = new Date(date)
  const minutes = snapped.getMinutes()
  const snappedMinutes = Math.round(minutes / snapMinutes) * snapMinutes
  snapped.setMinutes(snappedMinutes, 0, 0)
  return snapped
}

// ============================================
// Date input parsing utilities (for forms)
// ============================================

/**
 * Convert ISO string to DD/MM/YY format for display in inputs
 */
export function toDateInputValue(isoString: string): string {
  const date = new Date(isoString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(-2)
  return `${day}/${month}/${year}`
}

/**
 * Parse DD/MM/YY format to Date object
 * Returns null if invalid
 */
export function parseDateInputValue(value: string): Date | null {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (!match) return null
  const day = parseInt(match[1])
  const month = parseInt(match[2]) - 1
  const year = 2000 + parseInt(match[3])
  const date = new Date(year, month, day)
  if (isNaN(date.getTime())) return null
  return date
}

/**
 * Convert DD/MM/YY to YYYY-MM-DD for storage
 */
export function toDateISOValue(dateStr: string): string {
  const date = parseDateInputValue(dateStr)
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

/**
 * Extract time (HH:MM) from ISO string for time inputs
 */
export function toTimeInputValue(isoString: string): string {
  const date = new Date(isoString)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

/**
 * Create ISO string from date + time parts
 */
export function combineDateAndTime(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}
