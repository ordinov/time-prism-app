import { useTimer } from '../context/TimerContext'
import { useProjects } from '../hooks/useProjects'

// Icons
const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
)

const StopIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

export default function StatusBar() {
  const { isRunning, projectName, elapsed, start, stop } = useTimer()
  const { projects } = useProjects()

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const activeProjects = projects.filter(p => !p.archived)

  return (
    <div className="h-14 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]
                    flex items-center px-5 justify-between">
      <div className="flex items-center gap-4">
        {isRunning ? (
          <>
            {/* Recording indicator */}
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)]" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-ping-slow" />
            </div>

            {/* Timer display */}
            <div className="font-mono text-xl tracking-wider text-[var(--text-primary)] tabular-nums">
              {formatElapsed(elapsed)}
            </div>

            {/* Project badge */}
            <div className="badge badge-prism">
              {projectName}
            </div>

            {/* Stop button */}
            <button
              onClick={stop}
              className="btn btn-danger ml-2"
            >
              <StopIcon />
              <span>Stop</span>
            </button>
          </>
        ) : (
          <>
            {/* Idle indicator */}
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-disabled)]" />

            {/* Quick start dropdown */}
            <div className="relative group">
              <select
                className="select w-56 pr-8"
                value=""
                onChange={e => {
                  const project = activeProjects.find(p => p.id === Number(e.target.value))
                  if (project) start(project)
                }}
              >
                <option value="">Avvia timer...</option>
                {activeProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Start hint */}
            <span className="text-[var(--text-muted)] text-sm">
              Seleziona un progetto per iniziare
            </span>
          </>
        )}
      </div>

      {/* Right side - version */}
      <div className="flex items-center gap-3">
        <div className="h-4 w-px bg-[var(--border-subtle)]" />
        <span className="text-[var(--text-disabled)] text-xs font-medium">
          Time Prism v0.1.0
        </span>
      </div>
    </div>
  )
}
