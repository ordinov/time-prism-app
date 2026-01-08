import { useMemo } from 'react'
import type { ViewMode } from './utils'

interface Props {
  viewStart: Date
  viewEnd: Date
  viewMode: ViewMode
  pixelsPerHour: number
  scrollLeft: number
}

// Determine detail level based on pixels per hour
type DetailLevel = 'days-only' | 'hours-compact' | 'hours-full' | 'hours-with-half' | 'hours-with-quarters'

function getDetailLevel(pixelsPerHour: number): DetailLevel {
  if (pixelsPerHour < 8) return 'days-only'
  if (pixelsPerHour < 25) return 'hours-compact'
  if (pixelsPerHour < 90) return 'hours-full'
  if (pixelsPerHour < 180) return 'hours-with-half'
  return 'hours-with-quarters'
}

function formatHour(hour: number, detail: DetailLevel): string {
  if (detail === 'hours-compact' || detail === 'days-only') {
    return hour.toString()
  }
  return `${hour.toString().padStart(2, '0')}:00`
}

function formatMinute(minute: number): string {
  return `:${minute.toString().padStart(2, '0')}`
}

type MarkerType = 'day' | 'hour' | 'minute'

export default function TimelineRuler({ viewStart, viewEnd, viewMode, pixelsPerHour, scrollLeft }: Props) {
  const markers = useMemo(() => {
    const result: { position: number; label: string; type: MarkerType }[] = []
    const detail = getDetailLevel(pixelsPerHour)

    const getPosition = (date: Date) =>
      ((date.getTime() - viewStart.getTime()) / (1000 * 60 * 60)) * pixelsPerHour

    // Always add day markers if visible
    const currentDay = new Date(viewStart)
    currentDay.setHours(0, 0, 0, 0)

    while (currentDay <= viewEnd) {
      const position = getPosition(currentDay)
      if (position >= 0) {
        const dayLabel = viewMode === 'month'
          ? currentDay.getDate().toString()
          : currentDay.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })

        result.push({
          position,
          label: dayLabel,
          type: 'day'
        })
      }
      currentDay.setDate(currentDay.getDate() + 1)
    }

    // Add hour markers if detail level allows
    if (detail !== 'days-only') {
      const currentHour = new Date(viewStart)
      currentHour.setMinutes(0, 0, 0)

      while (currentHour <= viewEnd) {
        const hour = currentHour.getHours()
        const position = getPosition(currentHour)

        // Skip midnight (already added as day marker)
        if (hour !== 0 && position >= 0) {
          result.push({
            position,
            label: formatHour(hour, detail),
            type: 'hour'
          })
        }
        currentHour.setHours(currentHour.getHours() + 1)
      }
    }

    // Add 30-minute markers
    if (detail === 'hours-with-half' || detail === 'hours-with-quarters') {
      const current30 = new Date(viewStart)
      current30.setMinutes(30, 0, 0)

      while (current30 <= viewEnd) {
        const position = getPosition(current30)
        if (position >= 0) {
          result.push({
            position,
            label: formatMinute(30),
            type: 'minute'
          })
        }
        current30.setHours(current30.getHours() + 1)
      }
    }

    // Add 15/45-minute markers
    if (detail === 'hours-with-quarters') {
      for (const minute of [15, 45]) {
        const current15 = new Date(viewStart)
        current15.setMinutes(minute, 0, 0)

        while (current15 <= viewEnd) {
          const position = getPosition(current15)
          if (position >= 0) {
            result.push({
              position,
              label: formatMinute(minute),
              type: 'minute'
            })
          }
          current15.setHours(current15.getHours() + 1)
        }
      }
    }

    // Sort by position
    return result.sort((a, b) => a.position - b.position)
  }, [viewStart, viewEnd, viewMode, pixelsPerHour])

  return (
    <div className="h-12 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] relative overflow-hidden">
      <div style={{ transform: `translateX(-${scrollLeft}px)` }} className="absolute inset-0">
        {markers.map((marker, i) => (
          <div
            key={i}
            className="absolute h-full"
            style={{ left: marker.position }}
          >
            {marker.type === 'day' ? (
              /* Day label - positioned at top */
              <span className="absolute top-1 left-1.5 whitespace-nowrap font-mono text-xs text-[var(--text-primary)] font-semibold">
                {marker.label}
              </span>
            ) : (
              /* Hour/minute label - all aligned at same height */
              <>
                <span
                  className={`
                    absolute bottom-3 left-1 whitespace-nowrap font-mono
                    ${marker.type === 'hour'
                      ? 'text-[11px] text-[var(--text-primary)]'
                      : 'text-[10px] text-[var(--text-secondary)]'
                    }
                  `}
                >
                  {marker.label}
                </span>
                <div
                  className={`absolute bottom-1 left-0.5 w-px ${
                    marker.type === 'hour'
                      ? 'h-1.5 bg-[var(--text-muted)]'
                      : 'h-1 bg-[var(--border-default)]'
                  }`}
                />
              </>
            )}
          </div>
        ))}

        {/* Background grid lines for days */}
        {markers.filter(m => m.type === 'day').map((marker, i) => (
          <div
            key={`grid-${i}`}
            className="absolute top-0 bottom-0 w-px bg-[var(--prism-violet)]/30"
            style={{ left: marker.position }}
          />
        ))}
      </div>
    </div>
  )
}
