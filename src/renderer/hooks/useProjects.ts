import { useState, useEffect, useCallback } from 'react'
import type { ProjectWithClient, CreateProjectInput, UpdateProjectInput } from '@shared/types'

export function useProjects(includeArchived = false) {
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.projects.list(includeArchived)
      setProjects(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [includeArchived])

  useEffect(() => {
    load()
  }, [load])

  const create = async (input: CreateProjectInput) => {
    const project = await window.api.projects.create(input)
    await load()
    return project
  }

  const update = async (input: UpdateProjectInput) => {
    const project = await window.api.projects.update(input)
    await load()
    return project
  }

  const remove = async (id: number) => {
    await window.api.projects.delete(id)
    await load()
  }

  const archive = async (project: ProjectWithClient) => {
    await update({ ...project, archived: !project.archived })
  }

  return { projects, loading, error, create, update, remove, archive, reload: load }
}
