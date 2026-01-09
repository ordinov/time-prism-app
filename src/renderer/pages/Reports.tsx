import { useState, useMemo } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useProjects } from '../hooks/useProjects'
import SessionsTable from '../components/SessionsTable'
import type { SessionWithProject } from '@shared/types'

type Tab = 'tracker' | 'tabella'

export default function Reports() {
  const [tab, setTab] = useState<Tab>('tracker')

  // Default: start of current month to today
  const defaultStart = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }, [])

  const defaultEnd = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const [customStart, setCustomStart] = useState(defaultStart)
  const [customEnd, setCustomEnd] = useState(defaultEnd)

  const { start_date, end_date } = useMemo(() => {
    const start = customStart ? new Date(customStart) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const end = customEnd ? new Date(customEnd) : new Date()
    end.setHours(23, 59, 59, 999)

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    }
  }, [customStart, customEnd])

  const { sessions, loading, create, update, remove } = useSessions({ start_date, end_date })
  const { projects } = useProjects()

  const projectStats = useMemo(() => {
    const stats: Record<number, { name: string; client: string | null; minutes: number }> = {}

    sessions.forEach(s => {
      const duration = (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / (1000 * 60)
      if (!stats[s.project_id]) {
        stats[s.project_id] = { name: s.project_name, client: s.client_name, minutes: 0 }
      }
      stats[s.project_id].minutes += duration
    })

    return Object.values(stats).sort((a, b) => b.minutes - a.minutes)
  }, [sessions])

  const dateStats = useMemo(() => {
    const stats: Record<string, number> = {}

    sessions.forEach(s => {
      const date = new Date(s.start_at).toLocaleDateString('it-IT')
      const duration = (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / (1000 * 60)
      stats[date] = (stats[date] || 0) + duration
    })

    return Object.entries(stats)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime())
  }, [sessions])

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  const formatDays = (minutes: number) => (minutes / 60 / 8).toFixed(2)

  const totalMinutes = projectStats.reduce((sum, p) => sum + p.minutes, 0)

  // Handler functions for SessionsTable
  const handleUpdate = async (session: SessionWithProject) => {
    await update({
      id: session.id,
      project_id: session.project_id,
      start_at: session.start_at,
      end_at: session.end_at,
      notes: session.notes
    })
  }

  const handleCreate = async (projectId: number, startAt: string, endAt: string, notes?: string) => {
    await create({
      project_id: projectId,
      start_at: startAt,
      end_at: endAt,
      notes
    })
  }

  const handleDelete = async (id: number) => {
    await remove(id)
  }

  if (loading) return <div className="p-4">Caricamento...</div>

  return (
    <div className="h-full overflow-auto">
      <h1 className="text-2xl font-bold mb-4">Report</h1>

      {/* Tab buttons */}
      <div className="flex gap-1 mb-6 border-b border-subtle">
        <button
          onClick={() => setTab('tracker')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'tracker'
              ? 'border-prism-violet text-primary'
              : 'border-transparent text-muted hover:text-secondary'
          }`}
        >
          Tracker
        </button>
        <button
          onClick={() => setTab('tabella')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'tabella'
              ? 'border-prism-violet text-primary'
              : 'border-transparent text-muted hover:text-secondary'
          }`}
        >
          Tabella
        </button>
      </div>

      {/* Date range filters */}
      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="text-sm text-secondary block mb-1">Da</label>
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="text-sm text-secondary block mb-1">A</label>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Tab content */}
      {tab === 'tracker' ? (
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Riepilogo per Progetto</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Progetto</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2 text-right">Ore</th>
                  <th className="py-2 text-right">Giorni (8h)</th>
                </tr>
              </thead>
              <tbody>
                {projectStats.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-secondary">{p.client || '—'}</td>
                    <td className="py-2 text-right">{formatMinutes(p.minutes)}</td>
                    <td className="py-2 text-right">{formatDays(p.minutes)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2">TOTALE</td>
                  <td></td>
                  <td className="py-2 text-right">{formatMinutes(totalMinutes)}</td>
                  <td className="py-2 text-right">{formatDays(totalMinutes)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Riepilogo per Data</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Data</th>
                  <th className="py-2 text-right">Ore</th>
                  <th className="py-2 text-right">Giorni (8h)</th>
                </tr>
              </thead>
              <tbody>
                {dateStats.map((d, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{d.date}</td>
                    <td className="py-2 text-right">{formatMinutes(d.minutes)}</td>
                    <td className="py-2 text-right">{formatDays(d.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <SessionsTable
          sessions={sessions}
          projects={projects}
          onUpdate={handleUpdate}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
