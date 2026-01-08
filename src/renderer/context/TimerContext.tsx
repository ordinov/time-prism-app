import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { ProjectWithClient } from '@shared/types'
import { events, SESSION_CREATED } from '../lib/events'

interface TimerState {
  isRunning: boolean
  projectId: number | null
  projectName: string | null
  startTime: Date | null
  elapsed: number
}

interface TimerContextValue extends TimerState {
  start: (project: ProjectWithClient) => void
  stop: () => Promise<void>
}

const TimerContext = createContext<TimerContextValue | null>(null)

const STORAGE_KEY = 'time-prism-active-timer'

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    projectId: null,
    projectName: null,
    startTime: null,
    elapsed: 0
  })

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const startTime = new Date(parsed.startTime)
        setState({
          isRunning: true,
          projectId: parsed.projectId,
          projectName: parsed.projectName,
          startTime,
          elapsed: Math.floor((Date.now() - startTime.getTime()) / 1000)
        })
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Update elapsed every second
  useEffect(() => {
    if (!state.isRunning || !state.startTime) return

    const interval = setInterval(() => {
      setState(s => ({
        ...s,
        elapsed: Math.floor((Date.now() - s.startTime!.getTime()) / 1000)
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [state.isRunning, state.startTime])

  const start = useCallback((project: ProjectWithClient) => {
    const startTime = new Date()
    setState({
      isRunning: true,
      projectId: project.id,
      projectName: project.name,
      startTime,
      elapsed: 0
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      startTime: startTime.toISOString()
    }))
  }, [])

  const stop = useCallback(async () => {
    if (!state.isRunning || !state.projectId || !state.startTime) return

    const endTime = new Date()
    await window.api.sessions.create({
      project_id: state.projectId,
      start_at: state.startTime.toISOString(),
      end_at: endTime.toISOString()
    })

    // Notify listeners that a session was created
    events.emit(SESSION_CREATED)

    setState({
      isRunning: false,
      projectId: null,
      projectName: null,
      startTime: null,
      elapsed: 0
    })
    localStorage.removeItem(STORAGE_KEY)
  }, [state])

  return (
    <TimerContext.Provider value={{ ...state, start, stop }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider')
  }
  return context
}
