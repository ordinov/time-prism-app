import { getDatabase } from './database'
import { createBackup, listBackups } from './backup'
import { DEFAULT_BACKUP_CONFIG, type BackupConfig } from '../shared/types'

let schedulerTimeout: NodeJS.Timeout | null = null
let lastBackupCheck: string | null = null

export function getBackupConfig(): BackupConfig {
  const db = getDatabase()

  const getVal = (key: string, defaultVal: string): string => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? defaultVal
  }

  return {
    scheduleTimes: JSON.parse(getVal('backup_schedule_times', JSON.stringify(DEFAULT_BACKUP_CONFIG.scheduleTimes))),
    maxDaily: parseInt(getVal('backup_max_daily', String(DEFAULT_BACKUP_CONFIG.maxDaily)), 10),
    maxWeekly: parseInt(getVal('backup_max_weekly', String(DEFAULT_BACKUP_CONFIG.maxWeekly)), 10),
    maxMonthly: parseInt(getVal('backup_max_monthly', String(DEFAULT_BACKUP_CONFIG.maxMonthly)), 10),
    weeklyDay: parseInt(getVal('backup_weekly_day', String(DEFAULT_BACKUP_CONFIG.weeklyDay)), 10)
  }
}

export function setBackupConfig(config: BackupConfig): void {
  const db = getDatabase()

  const setVal = (key: string, value: string) => {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, value)
  }

  setVal('backup_schedule_times', JSON.stringify(config.scheduleTimes))
  setVal('backup_max_daily', String(config.maxDaily))
  setVal('backup_max_weekly', String(config.maxWeekly))
  setVal('backup_max_monthly', String(config.maxMonthly))
  setVal('backup_weekly_day', String(config.weeklyDay))
}

function getNextScheduledTime(scheduleTimes: string[]): Date | null {
  if (scheduleTimes.length === 0) return null

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Sort times
  const sortedTimes = [...scheduleTimes].sort()

  // Find next time today
  for (const time of sortedTimes) {
    const scheduled = new Date(`${today}T${time}:00`)
    if (scheduled > now) {
      return scheduled
    }
  }

  // Next is tomorrow's first time
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  return new Date(`${tomorrowStr}T${sortedTimes[0]}:00`)
}

function shouldRunMissedBackup(scheduleTimes: string[]): boolean {
  // If no auto backups exist at all, run one now
  const backups = listBackups()
  const hasAutoBackups = backups.some(b => b.name.startsWith('data_'))
  if (!hasAutoBackups) {
    console.log('[BackupScheduler] No automatic backups found')
    return true
  }

  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('backup_last_auto') as { value: string } | undefined

  if (!row) return true // Never ran, run now

  const lastBackup = new Date(row.value)
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Check if any scheduled time passed since last backup
  for (const time of scheduleTimes) {
    const scheduled = new Date(`${today}T${time}:00`)
    if (scheduled > lastBackup && scheduled <= now) {
      return true
    }
  }

  // Check yesterday's times if last backup was before today
  if (lastBackup.toISOString().split('T')[0] < today) {
    return true
  }

  return false
}

function recordBackupTime(): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run('backup_last_auto', new Date().toISOString())
}

function runScheduledBackup(): void {
  try {
    console.log('[BackupScheduler] Running scheduled backup...')
    createBackup()
    recordBackupTime()
    console.log('[BackupScheduler] Backup completed')
  } catch (e) {
    console.error('[BackupScheduler] Backup failed:', e)
  }

  // Schedule next
  scheduleNextBackup()
}

function scheduleNextBackup(): void {
  const config = getBackupConfig()
  const nextTime = getNextScheduledTime(config.scheduleTimes)

  if (!nextTime) {
    console.log('[BackupScheduler] No scheduled times configured')
    return
  }

  const msUntilNext = nextTime.getTime() - Date.now()
  console.log(`[BackupScheduler] Next backup at ${nextTime.toISOString()} (in ${Math.round(msUntilNext / 60000)} minutes)`)

  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout)
  }

  schedulerTimeout = setTimeout(runScheduledBackup, msUntilNext)
}

export function startBackupScheduler(): void {
  console.log('[BackupScheduler] Starting...')

  const config = getBackupConfig()

  // Check if we missed a backup while app was closed
  if (shouldRunMissedBackup(config.scheduleTimes)) {
    console.log('[BackupScheduler] Missed backup detected, running now...')
    try {
      createBackup()
      recordBackupTime()
    } catch (e) {
      console.error('[BackupScheduler] Missed backup failed:', e)
    }
  }

  scheduleNextBackup()
}

export function stopBackupScheduler(): void {
  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout)
    schedulerTimeout = null
  }
  console.log('[BackupScheduler] Stopped')
}

export function restartBackupScheduler(): void {
  stopBackupScheduler()
  scheduleNextBackup()
}
