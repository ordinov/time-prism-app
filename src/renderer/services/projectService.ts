/**
 * Project Service
 * Centralizes all project-related business logic and API calls
 */

import type {
  Project,
  ProjectWithClient,
  ProjectWithStats,
  CreateProjectInput,
  UpdateProjectInput,
} from '@shared/types'

/**
 * Validation error for project operations
 */
export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectValidationError'
  }
}

/**
 * Validate project input
 */
function validateProjectInput(input: { name?: string }): void {
  if (input.name !== undefined && !input.name.trim()) {
    throw new ProjectValidationError('Project name is required')
  }
}

export const projectService = {
  // ============================================
  // API Operations
  // ============================================

  /**
   * List all projects with stats
   */
  async list(includeArchived = false): Promise<ProjectWithStats[]> {
    return window.api.projects.list(includeArchived)
  },

  /**
   * Create a new project with validation
   */
  async create(input: CreateProjectInput): Promise<Project> {
    validateProjectInput(input)
    return window.api.projects.create(input)
  },

  /**
   * Update an existing project with validation
   */
  async update(input: UpdateProjectInput): Promise<Project> {
    validateProjectInput(input)
    return window.api.projects.update(input)
  },

  /**
   * Delete a project by ID
   */
  async delete(id: number): Promise<void> {
    return window.api.projects.delete(id)
  },

  /**
   * Toggle archive status
   */
  async toggleArchive(project: ProjectWithStats): Promise<Project> {
    return this.update({
      id: project.id,
      name: project.name,
      client_id: project.client_id,
      color: project.color,
      archived: !project.archived,
    })
  },

  // ============================================
  // Business Logic (Pure Functions)
  // ============================================

  /**
   * Filter projects by client ID
   */
  filterByClient(projects: ProjectWithStats[], clientId: number | null): ProjectWithStats[] {
    if (clientId === null) return projects
    return projects.filter(p => p.client_id === clientId)
  },

  /**
   * Filter active (non-archived) projects
   */
  filterActive(projects: ProjectWithStats[]): ProjectWithStats[] {
    return projects.filter(p => !p.archived)
  },

  /**
   * Filter archived projects
   */
  filterArchived(projects: ProjectWithStats[]): ProjectWithStats[] {
    return projects.filter(p => p.archived)
  },

  /**
   * Sort projects by name
   */
  sortByName(projects: ProjectWithStats[], direction: 'asc' | 'desc' = 'asc'): ProjectWithStats[] {
    return [...projects].sort((a, b) => {
      const diff = a.name.localeCompare(b.name)
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Sort projects by total time tracked
   */
  sortByTotalTime(projects: ProjectWithStats[], direction: 'asc' | 'desc' = 'desc'): ProjectWithStats[] {
    return [...projects].sort((a, b) => {
      const diff = (a.total_minutes || 0) - (b.total_minutes || 0)
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Sort projects by session count
   */
  sortBySessionCount(projects: ProjectWithStats[], direction: 'asc' | 'desc' = 'desc'): ProjectWithStats[] {
    return [...projects].sort((a, b) => {
      const diff = (a.session_count || 0) - (b.session_count || 0)
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Search projects by name (case-insensitive)
   */
  searchByName(projects: ProjectWithStats[], query: string): ProjectWithStats[] {
    if (!query.trim()) return projects
    const lowerQuery = query.toLowerCase()
    return projects.filter(p => p.name.toLowerCase().includes(lowerQuery))
  },

  /**
   * Get unique client IDs from projects
   */
  getUniqueClientIds(projects: ProjectWithStats[]): number[] {
    return [...new Set(
      projects
        .map(p => p.client_id)
        .filter((id): id is number => id !== null)
    )]
  },

  /**
   * Group projects by client
   */
  groupByClient(projects: ProjectWithStats[]): Map<number | null, ProjectWithStats[]> {
    const map = new Map<number | null, ProjectWithStats[]>()

    for (const project of projects) {
      const clientId = project.client_id
      const existing = map.get(clientId) || []
      existing.push(project)
      map.set(clientId, existing)
    }

    return map
  },

  /**
   * Calculate total minutes across all projects
   */
  getTotalMinutes(projects: ProjectWithStats[]): number {
    return projects.reduce((sum, p) => sum + (p.total_minutes || 0), 0)
  },

  /**
   * Calculate total session count across all projects
   */
  getTotalSessionCount(projects: ProjectWithStats[]): number {
    return projects.reduce((sum, p) => sum + (p.session_count || 0), 0)
  },
}
