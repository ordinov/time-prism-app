import { useState, useEffect, useCallback } from 'react'
import type { SessionWithProject, CreateSessionInput, UpdateSessionInput, SessionQuery } from '@shared/types'
import { events, SESSION_CREATED, SESSION_UPDATED, SESSION_DELETED } from '../lib/events'
import { sessionService } from '../services/sessionService'

export function useSessions(query: SessionQuery = {}) {
  const [sessions, setSessions] = useState<SessionWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await sessionService.list(query)
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

  // Listen for session events to sync across components
  useEffect(() => {
    const unsubscribe1 = events.on(SESSION_CREATED, load)
    const unsubscribe2 = events.on(SESSION_UPDATED, load)
    const unsubscribe3 = events.on(SESSION_DELETED, load)
    return () => {
      unsubscribe1()
      unsubscribe2()
      unsubscribe3()
    }
  }, [load])

  const create = async (input: CreateSessionInput) => {
    const session = await sessionService.create(input)
    events.emit(SESSION_CREATED)
    return session
  }

  const update = async (input: UpdateSessionInput) => {
    const session = await sessionService.update(input)
    events.emit(SESSION_UPDATED)
    return session
  }

  const remove = async (id: number) => {
    await sessionService.delete(id)
    events.emit(SESSION_DELETED)
  }

  const removeByProject = async (projectId: number) => {
    const count = await sessionService.deleteByProject(projectId)
    events.emit(SESSION_DELETED)
    return count
  }

  return { sessions, loading, error, create, update, remove, removeByProject, reload: load }
}
