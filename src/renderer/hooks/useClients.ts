import { useState, useEffect, useCallback } from 'react'
import type { Client, CreateClientInput, UpdateClientInput } from '@shared/types'
import { clientService } from '../services/clientService'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await clientService.list()
      setClients(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async (input: CreateClientInput): Promise<Client> => {
    const client = await clientService.create(input)
    await load()
    return client
  }

  const update = async (input: UpdateClientInput): Promise<Client> => {
    const client = await clientService.update(input)
    await load()
    return client
  }

  const remove = async (id: number): Promise<void> => {
    await clientService.delete(id)
    await load()
  }

  return { clients, loading, error, create, update, remove, reload: load }
}
