/**
 * Report Service
 * Centralizes all reporting, aggregation, and statistics logic
 */

import type { SessionWithProject } from '@shared/types'
import {
  calculateSessionDuration,
  calculateTotalMinutes,
  aggregateByProject,
  aggregateByDate,
  type ProjectAggregate,
  type DateAggregate,
} from '../utils/calculations'

// ============================================
// Types
// ============================================

export interface ProjectStats extends ProjectAggregate {
  percentage: number
}

export interface PeriodStats {
  totalMinutes: number
  totalHours: number
  totalDays: number
  sessionCount: number
  averageSessionMinutes: number
  projectBreakdown: ProjectStats[]
  dailyBreakdown: DailyStats[]
}

export interface DailyStats extends DateAggregate {
  hours: number
  days: number
}

export interface PeriodComparison {
  currentMinutes: number
  previousMinutes: number
  changeMinutes: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

// ============================================
// Service
// ============================================

export const reportService = {
  // ============================================
  // Period Statistics
  // ============================================

  /**
   * Calculate comprehensive statistics for a period
   */
  calculatePeriodStats(sessions: SessionWithProject[], hoursPerDay = 8): PeriodStats {
    const totalMinutes = calculateTotalMinutes(sessions)
    const totalHours = totalMinutes / 60
    const totalDays = totalHours / hoursPerDay

    // Project breakdown
    const projectMap = aggregateByProject(sessions)
    const projectBreakdown: ProjectStats[] = Array.from(projectMap.values())
      .map(p => ({
        ...p,
        percentage: totalMinutes > 0 ? (p.totalMinutes / totalMinutes) * 100 : 0,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)

    // Daily breakdown
    const dateMap = aggregateByDate(sessions)
    const dailyBreakdown: DailyStats[] = Array.from(dateMap.values())
      .map(d => ({
        ...d,
        hours: d.totalMinutes / 60,
        days: d.totalMinutes / 60 / hoursPerDay,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalMinutes,
      totalHours,
      totalDays,
      sessionCount: sessions.length,
      averageSessionMinutes: sessions.length > 0 ? totalMinutes / sessions.length : 0,
      projectBreakdown,
      dailyBreakdown,
    }
  },

  /**
   * Calculate quick stats (lightweight version)
   */
  calculateQuickStats(sessions: SessionWithProject[]): {
    totalMinutes: number
    totalHours: number
    sessionCount: number
  } {
    const totalMinutes = calculateTotalMinutes(sessions)
    return {
      totalMinutes,
      totalHours: totalMinutes / 60,
      sessionCount: sessions.length,
    }
  },

  // ============================================
  // Period Comparison
  // ============================================

  /**
   * Compare two periods (e.g., this week vs last week)
   */
  comparePeriods(
    currentSessions: SessionWithProject[],
    previousSessions: SessionWithProject[]
  ): PeriodComparison {
    const currentMinutes = calculateTotalMinutes(currentSessions)
    const previousMinutes = calculateTotalMinutes(previousSessions)
    const changeMinutes = currentMinutes - previousMinutes
    const changePercent = previousMinutes > 0
      ? (changeMinutes / previousMinutes) * 100
      : currentMinutes > 0 ? 100 : 0

    let trend: 'up' | 'down' | 'stable'
    if (changePercent > 5) trend = 'up'
    else if (changePercent < -5) trend = 'down'
    else trend = 'stable'

    return {
      currentMinutes,
      previousMinutes,
      changeMinutes,
      changePercent,
      trend,
    }
  },

  // ============================================
  // Aggregation Helpers
  // ============================================

  /**
   * Get top N projects by time spent
   */
  getTopProjects(sessions: SessionWithProject[], limit = 5): ProjectStats[] {
    const stats = this.calculatePeriodStats(sessions)
    return stats.projectBreakdown.slice(0, limit)
  },

  /**
   * Get sessions grouped by day for a date range
   */
  getSessionsByDay(sessions: SessionWithProject[]): Map<string, SessionWithProject[]> {
    const map = new Map<string, SessionWithProject[]>()

    for (const session of sessions) {
      const dateKey = new Date(session.start_at).toISOString().split('T')[0]
      const existing = map.get(dateKey) || []
      existing.push(session)
      map.set(dateKey, existing)
    }

    return map
  },

  /**
   * Get sessions grouped by week
   */
  getSessionsByWeek(sessions: SessionWithProject[]): Map<string, SessionWithProject[]> {
    const map = new Map<string, SessionWithProject[]>()

    for (const session of sessions) {
      const date = new Date(session.start_at)
      // Get Monday of the week
      const day = date.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const monday = new Date(date)
      monday.setDate(monday.getDate() + diff)
      const weekKey = monday.toISOString().split('T')[0]

      const existing = map.get(weekKey) || []
      existing.push(session)
      map.set(weekKey, existing)
    }

    return map
  },

  /**
   * Calculate average daily hours for a period
   */
  calculateAverageDailyHours(sessions: SessionWithProject[]): number {
    const dateMap = aggregateByDate(sessions)
    if (dateMap.size === 0) return 0

    const totalMinutes = calculateTotalMinutes(sessions)
    return (totalMinutes / 60) / dateMap.size
  },

  /**
   * Calculate productivity score (hours worked vs target)
   */
  calculateProductivityScore(
    sessions: SessionWithProject[],
    targetHoursPerDay: number,
    workingDays: number
  ): number {
    const totalHours = calculateTotalMinutes(sessions) / 60
    const targetHours = targetHoursPerDay * workingDays
    if (targetHours === 0) return 0
    return Math.min((totalHours / targetHours) * 100, 100)
  },

  // ============================================
  // Export Helpers
  // ============================================

  /**
   * Format period stats for CSV export
   */
  formatForCSV(stats: PeriodStats): string {
    const lines: string[] = []

    // Header
    lines.push('Progetto,Cliente,Ore,Giorni,Percentuale')

    // Project rows
    for (const p of stats.projectBreakdown) {
      const hours = (p.totalMinutes / 60).toFixed(2)
      const days = (p.totalMinutes / 60 / 8).toFixed(2)
      const pct = p.percentage.toFixed(1)
      lines.push(`"${p.projectName}","${p.clientName || ''}",${hours},${days},${pct}%`)
    }

    // Total row
    lines.push(`"TOTALE","",${stats.totalHours.toFixed(2)},${stats.totalDays.toFixed(2)},100%`)

    return lines.join('\n')
  },

  /**
   * Format daily stats for CSV export
   */
  formatDailyForCSV(stats: PeriodStats): string {
    const lines: string[] = []

    // Header
    lines.push('Data,Ore,Giorni,Sessioni')

    // Daily rows
    for (const d of stats.dailyBreakdown) {
      lines.push(`${d.date},${d.hours.toFixed(2)},${d.days.toFixed(2)},${d.sessionCount}`)
    }

    return lines.join('\n')
  },
}
