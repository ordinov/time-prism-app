import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Client, CreateClientInput, UpdateClientInput } from '@shared/types'
import { clientService } from '../services/clientService'
import { projectKeys } from './useProjects'
import { sessionKeys } from './useSessions'

// ============================================
// Query Keys
// ============================================

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: () => [...clientKeys.lists()] as const,
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch all clients
 * Uses React Query for caching and automatic refetching
 */
export function useClients() {
  const queryClient = useQueryClient()

  const {
    data: clients = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: clientKeys.list(),
    queryFn: () => clientService.list(),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateClientInput) => clientService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateClientInput) => clientService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
      // Also invalidate projects and sessions as they contain client info
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })

  return {
    clients,
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
 * Hook to create a client
 */
export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateClientInput) => clientService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
    },
  })
}

/**
 * Hook to update a client
 */
export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateClientInput) => clientService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

/**
 * Hook to delete a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all })
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}
