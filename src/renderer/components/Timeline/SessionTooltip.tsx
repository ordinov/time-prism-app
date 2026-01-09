import { formatTimeRange, formatDuration } from './utils'

interface Props {
  startAt: string
  endAt: string
  notes: string | null
  position: { x: number; y: number }
  direction?: 'up' | 'down'
}

export default function SessionTooltip({ startAt, endAt, notes, position, direction = 'up' }: Props) {
  const isUp = direction === 'up'

  return (
    <div
      className="fixed z-50 pointer-events-none animate-fade-in"
      style={{
        left: position.x,
        top: isUp ? position.y - 8 : position.y + 8,
        transform: isUp ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
      }}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl px-3 py-2 max-w-xs">
        <div className="flex items-center gap-2 text-sm text-white">
          <span>{formatTimeRange(startAt, endAt)}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-300">{formatDuration(startAt, endAt)}</span>
        </div>
        {notes && (
          <p className="text-sm text-gray-300 mt-1.5 pt-1.5 border-t border-gray-700 whitespace-pre-wrap">
            {notes}
          </p>
        )}
      </div>
      {/* Arrow */}
      {isUp ? (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-gray-800 border-r border-b border-gray-700 rotate-45" />
      ) : (
        <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-gray-800 border-l border-t border-gray-700 rotate-45" />
      )}
    </div>
  )
}
