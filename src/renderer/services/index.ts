/**
 * Centralized services exports
 */

export { sessionService, SessionValidationError } from './sessionService'
export { projectService, ProjectValidationError } from './projectService'
export { clientService, ClientValidationError } from './clientService'
export {
  reportService,
  type ProjectStats,
  type PeriodStats,
  type DailyStats,
  type PeriodComparison,
} from './reportService'
