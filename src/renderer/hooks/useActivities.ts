import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ActivityWithProject, CreateActivityInput, UpdateActivityInput, ActivityQuery } from '@shared/types'
import { activityService } from '../services/activityService'
import { sessionKeys } from './useSessions'

// ============================================
// Query Keys
// ============================================

export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (query: ActivityQuery) => [...activityKeys.lists(), query] as const,
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch activities
 * Uses React Query for caching and automatic refetching
 */
export function useActivities(query: ActivityQuery = {}) {
  const queryClient = useQueryClient()

  const {
    data: activities = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: activityKeys.list(query),
    queryFn: () => activityService.list(query),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateActivityInput) => activityService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateActivityInput) => activityService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      // Also invalidate sessions as they contain activity info
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => activityService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  return {
    activities,
    loading,
    error: error instanceof Error ? error.message : null,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    reload: refetch,
    // Expose mutation states for UI feedback
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

/**
 * Hook to create an activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateActivityInput) => activityService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })
}

/**
 * Hook to update an activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateActivityInput) => activityService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

/**
 * Hook to delete an activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => activityService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}
