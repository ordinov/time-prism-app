import { useTimer } from '../context/TimerContext'
import { useProjects } from '../hooks/useProjects'

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
    <div className="h-10 bg-gray-800 text-white text-sm flex items-center px-4 justify-between">
      <div className="flex items-center gap-3">
        {isRunning ? (
          <>
            <span className="text-green-400">⏱</span>
            <span className="font-medium">{projectName}</span>
            <span className="font-mono">{formatElapsed(elapsed)}</span>
            <button
              onClick={stop}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-xs"
            >
              ⏹ Stop
            </button>
          </>
        ) : (
          <>
            <span className="text-gray-400">⏱</span>
            <select
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 border-none"
              value=""
              onChange={e => {
                const project = activeProjects.find(p => p.id === Number(e.target.value))
                if (project) start(project)
              }}
            >
              <option value="">Seleziona progetto...</option>
              {activeProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </>
        )}
      </div>
      <div className="text-gray-400 text-xs">
        Time Prism v0.1.0
      </div>
    </div>
  )
}
