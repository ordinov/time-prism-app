/**
 * Session Service
 * Centralizes all session-related business logic and API calls
 */

import type {
  SessionWithProject,
  CreateSessionInput,
  UpdateSessionInput,
  SessionQuery,
} from '@shared/types'
import { calculateSessionDuration } from '../utils/calculations'
import { isOvernight } from '../utils/dateUtils'

/**
 * Validation error for session operations
 */
export class SessionValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionValidationError'
  }
}

/**
 * Validate session time range
 */
function validateTimeRange(startAt: string, endAt: string): void {
  const start = new Date(startAt)
  const end = new Date(endAt)

  if (isNaN(start.getTime())) {
    throw new SessionValidationError('Invalid start time')
  }
  if (isNaN(end.getTime())) {
    throw new SessionValidationError('Invalid end time')
  }
  if (end.getTime() <= start.getTime()) {
    throw new SessionValidationError('End time must be after start time')
  }
}

export const sessionService = {
  // ============================================
  // API Operations
  // ============================================

  /**
   * List sessions with optional filters
   */
  async list(query: SessionQuery = {}): Promise<SessionWithProject[]> {
    return window.api.sessions.list(query)
  },

  /**
   * Count sessions matching filters (for pagination)
   */
  async count(query: SessionQuery = {}): Promise<number> {
    return window.api.sessions.count(query)
  },

  /**
   * Create a new session with validation
   */
  async create(input: CreateSessionInput): Promise<SessionWithProject> {
    validateTimeRange(input.start_at, input.end_at)

    if (!input.project_id) {
      throw new SessionValidationError('Project is required')
    }

    return window.api.sessions.create(input)
  },

  /**
   * Update an existing session with validation
   */
  async update(input: UpdateSessionInput): Promise<SessionWithProject> {
    validateTimeRange(input.start_at, input.end_at)
    return window.api.sessions.update(input)
  },

  /**
   * Delete a session by ID
   */
  async delete(id: number): Promise<void> {
    return window.api.sessions.delete(id)
  },

  /**
   * Delete all sessions for a project
   */
  async deleteByProject(projectId: number): Promise<number> {
    return window.api.sessions.deleteByProject(projectId)
  },

  // ============================================
  // Business Logic (Pure Functions)
  // ============================================

  /**
   * Get session duration in minutes
   */
  getDuration(session: SessionWithProject): number {
    return calculateSessionDuration(session)
  },

  /**
   * Get session duration in hours
   */
  getDurationHours(session: SessionWithProject): number {
    return calculateSessionDuration(session) / 60
  },

  /**
   * Check if session spans overnight
   */
  isOvernight(session: SessionWithProject): boolean {
    return isOvernight(session.start_at, session.end_at)
  },

  /**
   * Filter sessions by project IDs
   */
  filterByProject(sessions: SessionWithProject[], projectIds: number[]): SessionWithProject[] {
    if (projectIds.length === 0) return sessions
    return sessions.filter(s => projectIds.includes(s.project_id))
  },

  /**
   * Filter sessions by client names (since we don't have client_id in SessionWithProject)
   */
  filterByClient(sessions: SessionWithProject[], clientNames: string[]): SessionWithProject[] {
    if (clientNames.length === 0) return sessions
    return sessions.filter(s => s.client_name && clientNames.includes(s.client_name))
  },

  /**
   * Sort sessions by start time
   */
  sortByStartTime(sessions: SessionWithProject[], direction: 'asc' | 'desc' = 'asc'): SessionWithProject[] {
    return [...sessions].sort((a, b) => {
      const diff = new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Sort sessions by duration
   */
  sortByDuration(sessions: SessionWithProject[], direction: 'asc' | 'desc' = 'desc'): SessionWithProject[] {
    return [...sessions].sort((a, b) => {
      const diff = calculateSessionDuration(a) - calculateSessionDuration(b)
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Get unique project IDs from sessions
   */
  getUniqueProjectIds(sessions: SessionWithProject[]): number[] {
    return [...new Set(sessions.map(s => s.project_id))]
  },

  /**
   * Get unique client names from sessions
   */
  getUniqueClientNames(sessions: SessionWithProject[]): string[] {
    return [...new Set(sessions.map(s => s.client_name).filter((name): name is string => name !== null))]
  },
}
