/**
 * Client Service
 * Centralizes all client-related business logic and API calls
 */

import type { Client, CreateClientInput, UpdateClientInput } from '@shared/types'

/**
 * Validation error for client operations
 */
export class ClientValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClientValidationError'
  }
}

/**
 * Validate client input
 */
function validateClientInput(input: { name?: string }): void {
  if (input.name !== undefined && !input.name.trim()) {
    throw new ClientValidationError('Client name is required')
  }
}

export const clientService = {
  // ============================================
  // API Operations
  // ============================================

  /**
   * List all clients
   */
  async list(): Promise<Client[]> {
    return window.api.clients.list()
  },

  /**
   * Create a new client with validation
   */
  async create(input: CreateClientInput): Promise<Client> {
    validateClientInput(input)
    return window.api.clients.create(input)
  },

  /**
   * Update an existing client with validation
   */
  async update(input: UpdateClientInput): Promise<Client> {
    validateClientInput(input)
    return window.api.clients.update(input)
  },

  /**
   * Delete a client by ID
   */
  async delete(id: number): Promise<void> {
    return window.api.clients.delete(id)
  },

  // ============================================
  // Business Logic (Pure Functions)
  // ============================================

  /**
   * Sort clients by name
   */
  sortByName(clients: Client[], direction: 'asc' | 'desc' = 'asc'): Client[] {
    return [...clients].sort((a, b) => {
      const diff = a.name.localeCompare(b.name)
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Sort clients by creation date
   */
  sortByCreatedAt(clients: Client[], direction: 'asc' | 'desc' = 'desc'): Client[] {
    return [...clients].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return direction === 'asc' ? diff : -diff
    })
  },

  /**
   * Search clients by name (case-insensitive)
   */
  searchByName(clients: Client[], query: string): Client[] {
    if (!query.trim()) return clients
    const lowerQuery = query.toLowerCase()
    return clients.filter(c => c.name.toLowerCase().includes(lowerQuery))
  },

  /**
   * Find client by ID
   */
  findById(clients: Client[], id: number): Client | undefined {
    return clients.find(c => c.id === id)
  },

  /**
   * Find client by name (exact match, case-insensitive)
   */
  findByName(clients: Client[], name: string): Client | undefined {
    const lowerName = name.toLowerCase()
    return clients.find(c => c.name.toLowerCase() === lowerName)
  },

  /**
   * Check if a client name already exists
   */
  nameExists(clients: Client[], name: string, excludeId?: number): boolean {
    const lowerName = name.toLowerCase()
    return clients.some(c =>
      c.name.toLowerCase() === lowerName && (excludeId === undefined || c.id !== excludeId)
    )
  },
}
