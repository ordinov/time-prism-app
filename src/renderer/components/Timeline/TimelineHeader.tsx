import type { ViewMode } from './utils'

interface Props {
  currentDate: Date
  viewMode: ViewMode
  zoom: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewModeChange: (mode: ViewMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
}

export default function TimelineHeader({
  currentDate,
  viewMode,
  zoom,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onZoomIn,
  onZoomOut
}: Props) {
  const formatDate = () => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      case 'week':
        return `Settimana del ${currentDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`
      case 'month':
        return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    }
  }

  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
      <div className="flex items-center gap-2">
        <button onClick={onPrev} className="px-2 py-1 hover:bg-gray-200 rounded">◀</button>
        <button onClick={onToday} className="px-3 py-1 hover:bg-gray-200 rounded text-sm">Oggi</button>
        <button onClick={onNext} className="px-2 py-1 hover:bg-gray-200 rounded">▶</button>
        <span className="ml-2 font-medium">{formatDate()}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex border rounded overflow-hidden">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1 text-sm ${viewMode === mode ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
            >
              {mode === 'day' ? 'Giorno' : mode === 'week' ? 'Settimana' : 'Mese'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={onZoomOut} className="px-2 py-1 hover:bg-gray-200 rounded">−</button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} className="px-2 py-1 hover:bg-gray-200 rounded">+</button>
        </div>
      </div>
    </div>
  )
}
