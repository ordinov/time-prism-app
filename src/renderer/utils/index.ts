/**
 * Centralized utilities exports
 */

// Formatters
export {
  formatDuration,
  formatWorkdays,
  formatDurationFromRange,
  formatTimeRange,
  formatTime,
  formatDate,
  formatDateISO,
  formatHours,
} from './formatters'

// Date utilities
export {
  type ViewMode,
  getDayBounds,
  getWeekBounds,
  getMonthBounds,
  getViewBounds,
  getHoursInView,
  isOvernight,
  dateToPosition,
  positionToDate,
  snapToGrid,
  toDateInputValue,
  parseDateInputValue,
  toDateISOValue,
  toTimeInputValue,
  combineDateAndTime,
} from './dateUtils'

// Calculations
export {
  calculateSessionDuration,
  calculateSessionHours,
  calculateWorkdays,
  calculateTotalMinutes,
  calculateTotalHours,
  aggregateByProject,
  aggregateByDate,
  aggregateByClient,
  calculatePeriodStats,
  type ProjectAggregate,
  type DateAggregate,
  type ClientAggregate,
  type PeriodStats,
} from './calculations'
