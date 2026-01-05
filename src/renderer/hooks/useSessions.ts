import { useState, useEffect, useCallback } from 'react'
import type { SessionWithProject, CreateSessionInput, UpdateSessionInput, SessionQuery } from '@shared/types'

export function useSessions(query: SessionQuery = {}) {
  const [sessions, setSessions] = useState<SessionWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.sessions.list(query)
      setSessions(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [query.start_date, query.end_date, query.project_id])

  useEffect(() => {
    load()
  }, [load])

  const create = async (input: CreateSessionInput) => {
    const session = await window.api.sessions.create(input)
    await load()
    return session
  }

  const update = async (input: UpdateSessionInput) => {
    const session = await window.api.sessions.update(input)
    await load()
    return session
  }

  const remove = async (id: number) => {
    await window.api.sessions.delete(id)
    await load()
  }

  return { sessions, loading, error, create, update, remove, reload: load }
}
