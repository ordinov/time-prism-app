import { useState, useEffect, useCallback } from 'react'
import type { ProjectWithStats, CreateProjectInput, UpdateProjectInput } from '@shared/types'
import { projectService } from '../services/projectService'

export function useProjects(includeArchived = false) {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await projectService.list(includeArchived)
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
    const project = await projectService.create(input)
    await load()
    return project
  }

  const update = async (input: UpdateProjectInput) => {
    const project = await projectService.update(input)
    await load()
    return project
  }

  const remove = async (id: number) => {
    await projectService.delete(id)
    await load()
  }

  const archive = async (project: ProjectWithStats) => {
    await projectService.toggleArchive(project)
    await load()
  }

  return { projects, loading, error, create, update, remove, archive, reload: load }
}
