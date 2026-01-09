import { useState, useEffect, useCallback } from 'react'
import type { SettingsMap } from '@shared/types'

export function useSettings() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.settings.getAll()
      setSettings(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setSetting = useCallback(async (key: string, value: string) => {
    await window.api.settings.set(key, value)
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const getSetting = useCallback((key: string, defaultValue?: string): string | undefined => {
    return settings[key] ?? defaultValue
  }, [settings])

  return { settings, loading, error, setSetting, getSetting, reload: load }
}
