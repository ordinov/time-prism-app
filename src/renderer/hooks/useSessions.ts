import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SessionWithProject, CreateSessionInput, UpdateSessionInput, SessionQuery } from '@shared/types'
import { sessionService } from '../services/sessionService'

// ============================================
// Query Keys
// ============================================

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (query: SessionQuery) => [...sessionKeys.lists(), query] as const,
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch sessions with optional filters
 * Uses React Query for caching and automatic refetching
 */
export function useSessions(query: SessionQuery = {}) {
  const queryClient = useQueryClient()

  const {
    data: sessions = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: sessionKeys.list(query),
    queryFn: () => sessionService.list(query),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateSessionInput) => sessionService.create(input),
    onSuccess: () => {
      // Invalidate all session queries to refetch
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateSessionInput) => sessionService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sessionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  const deleteByProjectMutation = useMutation({
    mutationFn: (projectId: number) => sessionService.deleteByProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  return {
    sessions,
    loading,
    error: error instanceof Error ? error.message : null,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    removeByProject: deleteByProjectMutation.mutateAsync,
    reload: refetch,
    // Expose mutation states for UI feedback
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

/**
 * Hook to create a session
 * Standalone mutation hook for components that don't need the full list
 */
export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSessionInput) => sessionService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

/**
 * Hook to update a session
 */
export function useUpdateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateSessionInput) => sessionService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

/**
 * Hook to delete a session
 */
export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => sessionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}
