/**
 * Activity Service
 * Centralizes all activity-related business logic and API calls
 */

import type {
  Activity,
  ActivityWithProject,
  CreateActivityInput,
  UpdateActivityInput,
  ActivityQuery,
} from '@shared/types'

/**
 * Validation error for activity operations
 */
export class ActivityValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActivityValidationError'
  }
}

/**
 * Validate activity input
 */
function validateActivityInput(input: { name?: string }): void {
  if (input.name !== undefined && !input.name.trim()) {
    throw new ActivityValidationError('Activity name is required')
  }
}

export const activityService = {
  // ============================================
  // API Operations
  // ============================================

  /**
   * List activities with optional filtering
   */
  async list(query: ActivityQuery = {}): Promise<ActivityWithProject[]> {
    return window.api.activities.list(query)
  },

  /**
   * Create a new activity with validation
   */
  async create(input: CreateActivityInput): Promise<Activity> {
    validateActivityInput(input)
    return window.api.activities.create(input)
  },

  /**
   * Update an existing activity with validation
   */
  async update(input: UpdateActivityInput): Promise<Activity> {
    validateActivityInput(input)
    return window.api.activities.update(input)
  },

  /**
   * Delete an activity by ID
   */
  async delete(id: number): Promise<void> {
    return window.api.activities.delete(id)
  },

  // ============================================
  // Business Logic (Pure Functions)
  // ============================================

  /**
   * Filter global activities (no project association)
   */
  filterGlobal(activities: ActivityWithProject[]): ActivityWithProject[] {
    return activities.filter(a => a.project_id === null)
  },

  /**
   * Filter activities by project ID
   */
  filterByProject(activities: ActivityWithProject[], projectId: number): ActivityWithProject[] {
    return activities.filter(a => a.project_id === projectId)
  },

  /**
   * Get activities available for a specific project
   * (global activities + project-specific activities)
   */
  getAvailableForProject(activities: ActivityWithProject[], projectId: number): ActivityWithProject[] {
    return activities.filter(a => a.project_id === null || a.project_id === projectId)
  },

  /**
   * Sort activities by name
   */
  sortByName(activities: ActivityWithProject[], direction: 'asc' | 'desc' = 'asc'): ActivityWithProject[] {
    return [...activities].sort((a, b) => {
      const diff = a.name.localeCompare(b.name)
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Search activities by name (case-insensitive)
   */
  searchByName(activities: ActivityWithProject[], query: string): ActivityWithProject[] {
    if (!query.trim()) return activities
    const lowerQuery = query.toLowerCase()
    return activities.filter(a => a.name.toLowerCase().includes(lowerQuery))
  },
}
