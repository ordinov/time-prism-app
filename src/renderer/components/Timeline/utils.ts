export type ViewMode = 'day' | 'week' | 'month'

export function getViewStartEnd(date: Date, mode: ViewMode): { start: Date; end: Date } {
  const start = new Date(date)
  const end = new Date(date)

  switch (mode) {
    case 'day':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'week':
      const dayOfWeek = start.getDay()
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      start.setDate(start.getDate() + diffToMonday)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      break
  }

  return { start, end }
}

export function getHoursInView(mode: ViewMode, date?: Date): number {
  switch (mode) {
    case 'day':
      return 24
    case 'week':
      return 24 * 7
    case 'month':
      // Calculate actual days in the month
      if (date) {
        const year = date.getFullYear()
        const month = date.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        return 24 * daysInMonth
      }
      return 24 * 31
  }
}

export function dateToPosition(date: Date, viewStart: Date, pixelsPerHour: number): number {
  const diffMs = date.getTime() - viewStart.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours * pixelsPerHour
}

export function positionToDate(x: number, viewStart: Date, pixelsPerHour: number): Date {
  const hours = x / pixelsPerHour
  const date = new Date(viewStart.getTime() + hours * 60 * 60 * 1000)
  return date
}

export function formatDuration(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const diffMs = end.getTime() - start.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

export function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const fmt = (d: Date) => d.toLocaleTimeString('it-IT', { hour: 'numeric', minute: '2-digit' })
  return `${fmt(start)} - ${fmt(end)}`
}

export function snapToGrid(date: Date, snapMinutes: number = 15): Date {
  const snapped = new Date(date)
  const minutes = snapped.getMinutes()
  const snappedMinutes = Math.round(minutes / snapMinutes) * snapMinutes
  snapped.setMinutes(snappedMinutes, 0, 0)
  return snapped
}
