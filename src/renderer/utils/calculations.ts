/**
 * Centralized calculation utilities
 * Replaces duplicate implementations in SessionsTable.tsx, Reports.tsx, ipc.ts
 */

import type { SessionWithProject } from '@shared/types'

/**
 * Calculate session duration in minutes
 * Used everywhere sessions are displayed/aggregated
 */
export function calculateSessionDuration(session: { start_at: string; end_at: string }): number {
  const start = new Date(session.start_at)
  const end = new Date(session.end_at)
  return (end.getTime() - start.getTime()) / (1000 * 60)
}

/**
 * Calculate session duration in hours
 * Used in: SessionsTable.tsx
 */
export function calculateSessionHours(session: { start_at: string; end_at: string }): number {
  return calculateSessionDuration(session) / 60
}

/**
 * Calculate work days from hours (8 hours = 1 day)
 */
export function calculateWorkdays(hours: number, hoursPerDay = 8): number {
  return hours / hoursPerDay
}

/**
 * Calculate total minutes from a list of sessions
 */
export function calculateTotalMinutes(sessions: { start_at: string; end_at: string }[]): number {
  return sessions.reduce((sum, s) => sum + calculateSessionDuration(s), 0)
}

/**
 * Calculate total hours from a list of sessions
 */
export function calculateTotalHours(sessions: { start_at: string; end_at: string }[]): number {
  return calculateTotalMinutes(sessions) / 60
}

// ============================================
// Aggregation utilities (for Reports)
// ============================================

export interface ProjectAggregate {
  projectId: number
  projectName: string
  projectColor: string
  clientName: string | null
  totalMinutes: number
  sessionCount: number
}

/**
 * Aggregate sessions by project
 * Used in: Reports.tsx, ipc.ts
 */
export function aggregateByProject(sessions: SessionWithProject[]): Map<number, ProjectAggregate> {
  const map = new Map<number, ProjectAggregate>()

  for (const session of sessions) {
    const existing = map.get(session.project_id)

    if (existing) {
      existing.totalMinutes += calculateSessionDuration(session)
      existing.sessionCount += 1
    } else {
      map.set(session.project_id, {
        projectId: session.project_id,
        projectName: session.project_name,
        projectColor: session.project_color,
        clientName: session.client_name,
        totalMinutes: calculateSessionDuration(session),
        sessionCount: 1,
      })
    }
  }

  return map
}

export interface DateAggregate {
  date: string
  totalMinutes: number
  sessionCount: number
}

/**
 * Aggregate sessions by date
 * Used in: Reports.tsx for daily breakdown
 */
export function aggregateByDate(sessions: { start_at: string; end_at: string }[]): Map<string, DateAggregate> {
  const map = new Map<string, DateAggregate>()

  for (const session of sessions) {
    const dateKey = new Date(session.start_at).toISOString().split('T')[0]
    const duration = calculateSessionDuration(session)
    const existing = map.get(dateKey)

    if (existing) {
      existing.totalMinutes += duration
      existing.sessionCount += 1
    } else {
      map.set(dateKey, {
        date: dateKey,
        totalMinutes: duration,
        sessionCount: 1,
      })
    }
  }

  return map
}

export interface ClientAggregate {
  clientId: number | null
  clientName: string | null
  totalMinutes: number
  sessionCount: number
}

/**
 * Aggregate sessions by client
 */
export function aggregateByClient(sessions: SessionWithProject[]): Map<number | null, ClientAggregate> {
  const map = new Map<number | null, ClientAggregate>()

  for (const session of sessions) {
    // We need to derive client_id - for now we'll use client_name as key
    const clientKey = session.client_name
    const existing = map.get(clientKey as unknown as number | null)

    if (existing) {
      existing.totalMinutes += calculateSessionDuration(session)
      existing.sessionCount += 1
    } else {
      map.set(clientKey as unknown as number | null, {
        clientId: null, // We don't have client_id in SessionWithProject
        clientName: session.client_name,
        totalMinutes: calculateSessionDuration(session),
        sessionCount: 1,
      })
    }
  }

  return map
}

// ============================================
// Statistics utilities
// ============================================

export interface PeriodStats {
  totalMinutes: number
  totalHours: number
  sessionCount: number
  averageSessionMinutes: number
}

/**
 * Calculate quick stats for a period
 */
export function calculatePeriodStats(sessions: { start_at: string; end_at: string }[]): PeriodStats {
  const totalMinutes = calculateTotalMinutes(sessions)
  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
    sessionCount: sessions.length,
    averageSessionMinutes: sessions.length > 0 ? totalMinutes / sessions.length : 0,
  }
}
