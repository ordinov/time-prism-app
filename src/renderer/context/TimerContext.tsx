import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import type { ProjectWithClient } from '@shared/types'
import { events, SESSION_CREATED } from '../lib/events'

interface TimerState {
  isRunning: boolean
  projectId: number | null
  projectName: string | null
  startTime: Date | null
  elapsed: number
  sessionId: number | null
}

interface TimerContextValue extends TimerState {
  start: (project: ProjectWithClient) => void
  stop: () => Promise<void>
}

const TimerContext = createContext<TimerContextValue | null>(null)

const STORAGE_KEY = 'time-prism-active-timer'
const AUTO_SAVE_INTERVAL = 60 // seconds

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    projectId: null,
    projectName: null,
    startTime: null,
    elapsed: 0,
    sessionId: null
  })
  const lastSaveMinuteRef = useRef<number>(0)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const startTime = new Date(parsed.startTime)
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
        setState({
          isRunning: true,
          projectId: parsed.projectId,
          projectName: parsed.projectName,
          startTime,
          elapsed,
          sessionId: parsed.sessionId || null
        })
        // Set the last save minute to current minute (to avoid immediate re-save)
        lastSaveMinuteRef.current = Math.floor(elapsed / AUTO_SAVE_INTERVAL)
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

  // Auto-save session every minute (after first minute)
  useEffect(() => {
    if (!state.isRunning || !state.startTime || !state.projectId) return

    const currentMinute = Math.floor(state.elapsed / AUTO_SAVE_INTERVAL)

    // Only save when we cross a new minute boundary and elapsed >= 60 seconds
    if (currentMinute > 0 && currentMinute !== lastSaveMinuteRef.current) {
      lastSaveMinuteRef.current = currentMinute
      const endTime = new Date()

      if (state.sessionId) {
        // Update existing session
        window.api.sessions.update({
          id: state.sessionId,
          project_id: state.projectId,
          start_at: state.startTime.toISOString(),
          end_at: endTime.toISOString()
        }).then(() => {
          events.emit(SESSION_CREATED)
        })
      } else {
        // Create new session (first save after 1 minute)
        window.api.sessions.create({
          project_id: state.projectId,
          start_at: state.startTime.toISOString(),
          end_at: endTime.toISOString()
        }).then((session) => {
          setState(s => ({ ...s, sessionId: session.id }))
          // Update localStorage with sessionId
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            projectId: state.projectId,
            projectName: state.projectName,
            startTime: state.startTime!.toISOString(),
            sessionId: session.id
          }))
          events.emit(SESSION_CREATED)
        })
      }
    }
  }, [state.elapsed, state.isRunning, state.startTime, state.projectId, state.projectName, state.sessionId])

  const start = useCallback((project: ProjectWithClient) => {
    const startTime = new Date()
    lastSaveMinuteRef.current = 0
    setState({
      isRunning: true,
      projectId: project.id,
      projectName: project.name,
      startTime,
      elapsed: 0,
      sessionId: null
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      startTime: startTime.toISOString(),
      sessionId: null
    }))
  }, [])

  const stop = useCallback(async () => {
    if (!state.isRunning || !state.projectId || !state.startTime) return

    const endTime = new Date()

    if (state.sessionId) {
      // Update existing session with final end time
      await window.api.sessions.update({
        id: state.sessionId,
        project_id: state.projectId,
        start_at: state.startTime.toISOString(),
        end_at: endTime.toISOString()
      })
      events.emit(SESSION_CREATED)
    }
    // If no sessionId (timer < 1 minute), don't save anything

    setState({
      isRunning: false,
      projectId: null,
      projectName: null,
      startTime: null,
      elapsed: 0,
      sessionId: null
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
