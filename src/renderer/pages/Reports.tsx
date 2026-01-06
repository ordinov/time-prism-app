import { useState, useMemo } from 'react'
import { useSessions } from '../hooks/useSessions'

type Preset = 'week' | 'month' | '30days' | 'custom'

export default function Reports() {
  const [preset, setPreset] = useState<Preset>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { start_date, end_date } = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date = new Date(now)
    end.setHours(23, 59, 59, 999)

    switch (preset) {
      case 'week':
        start = new Date(now)
        const day = start.getDay()
        start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
        start.setHours(0, 0, 0, 0)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '30days':
        start = new Date(now)
        start.setDate(start.getDate() - 30)
        break
      case 'custom':
        start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1)
        end = customEnd ? new Date(customEnd) : now
        end.setHours(23, 59, 59, 999)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    }
  }, [preset, customStart, customEnd])

  const { sessions, loading } = useSessions({ start_date, end_date })

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

  if (loading) return <div className="p-4">Caricamento...</div>

  return (
    <div className="h-full overflow-auto">
      <h1 className="text-2xl font-bold mb-4">Report</h1>

      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Periodo</label>
          <select
            value={preset}
            onChange={e => setPreset(e.target.value as Preset)}
            className="border rounded px-3 py-2"
          >
            <option value="week">Questa settimana</option>
            <option value="month">Questo mese</option>
            <option value="30days">Ultimi 30 giorni</option>
            <option value="custom">Personalizzato</option>
          </select>
        </div>

        {preset === 'custom' && (
          <>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Da</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">A</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded shadow p-4">
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
                  <td className="py-2 text-gray-500">{p.client || '—'}</td>
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

        <div className="bg-white rounded shadow p-4">
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
    </div>
  )
}
