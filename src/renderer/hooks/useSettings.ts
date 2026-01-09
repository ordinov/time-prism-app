import { useState, useEffect, useCallback } from 'react'
import type { SettingsMap } from '@shared/types'

export function useSettings() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    // Check if settings API is available (preload might not be rebuilt yet)
    if (!window.api?.settings) {
      setLoading(false)
      return
    }
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
    // Check if settings API is available
    if (!window.api?.settings) {
      console.warn('Settings API not available - preload needs rebuild')
      return
    }
    await window.api.settings.set(key, value)
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const getSetting = useCallback((key: string, defaultValue?: string): string | undefined => {
    return settings[key] ?? defaultValue
  }, [settings])

  return { settings, loading, error, setSetting, getSetting, reload: load }
}
