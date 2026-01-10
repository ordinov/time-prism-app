import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectWithStats, CreateProjectInput, UpdateProjectInput } from '@shared/types'
import { projectService } from '../services/projectService'
import { sessionKeys } from './useSessions'

// ============================================
// Query Keys
// ============================================

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (includeArchived: boolean) => [...projectKeys.lists(), { includeArchived }] as const,
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch projects with stats
 * Uses React Query for caching and automatic refetching
 */
export function useProjects(includeArchived = false) {
  const queryClient = useQueryClient()

  const {
    data: projects = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: projectKeys.list(includeArchived),
    queryFn: () => projectService.list(includeArchived),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateProjectInput) => projectService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      // Also invalidate sessions as they contain project info
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (project: ProjectWithStats) => projectService.toggleArchive(project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })

  return {
    projects,
    loading,
    error: error instanceof Error ? error.message : null,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    archive: archiveMutation.mutateAsync,
    reload: refetch,
    // Expose mutation states for UI feedback
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isArchiving: archiveMutation.isPending,
  }
}

/**
 * Hook to create a project
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

/**
 * Hook to update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => projectService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => projectService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}
