import { useState, useEffect } from 'react'

export default function StatusBar() {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    setLastSaved(new Date())
  }, [])

  return (
    <div className="h-8 bg-gray-800 text-white text-xs flex items-center px-4 justify-between">
      <div className="flex items-center gap-4">
        <span>⏱ Timer: inattivo</span>
      </div>
      <div>
        {lastSaved && (
          <span className="text-gray-400">
            Salvato alle {lastSaved.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}
