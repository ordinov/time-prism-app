import { useMemo } from 'react'
import type { ViewMode } from './utils'

interface Props {
  viewStart: Date
  viewEnd: Date
  viewMode: ViewMode
  pixelsPerHour: number
  scrollLeft: number
}

export default function TimelineRuler({ viewStart, viewEnd, viewMode, pixelsPerHour, scrollLeft }: Props) {
  const markers = useMemo(() => {
    const result: { position: number; label: string; isMajor: boolean }[] = []
    const current = new Date(viewStart)

    while (current <= viewEnd) {
      const position = ((current.getTime() - viewStart.getTime()) / (1000 * 60 * 60)) * pixelsPerHour
      const hour = current.getHours()

      if (viewMode === 'day') {
        result.push({
          position,
          label: `${hour.toString().padStart(2, '0')}:00`,
          isMajor: hour % 6 === 0
        })
        current.setHours(current.getHours() + 1)
      } else if (viewMode === 'week') {
        if (hour === 0) {
          result.push({
            position,
            label: current.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }),
            isMajor: true
          })
        } else if (hour % 6 === 0) {
          result.push({
            position,
            label: `${hour}:00`,
            isMajor: false
          })
        }
        current.setHours(current.getHours() + 3)
      } else {
        if (hour === 0) {
          result.push({
            position,
            label: current.getDate().toString(),
            isMajor: current.getDay() === 1
          })
        }
        current.setDate(current.getDate() + 1)
      }
    }

    return result
  }, [viewStart, viewEnd, viewMode, pixelsPerHour])

  return (
    <div className="h-8 bg-gray-50 border-b relative overflow-hidden">
      <div style={{ transform: `translateX(-${scrollLeft}px)` }} className="absolute inset-0">
        {markers.map((marker, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex flex-col justify-end"
            style={{ left: marker.position }}
          >
            <div className={`border-l ${marker.isMajor ? 'border-gray-400 h-4' : 'border-gray-300 h-2'}`} />
            <span className={`text-xs ${marker.isMajor ? 'text-gray-700' : 'text-gray-400'} whitespace-nowrap pl-1`}>
              {marker.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
