import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import { getDbPath } from './database'
import type { BackupConfig } from '../shared/types'

const MAX_BACKUPS = 7

export function getBackupDir(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'backups')
}

export function createBackup(): string {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database file does not exist')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFileName = `data_${timestamp}.db`
  const backupPath = path.join(backupDir, backupFileName)

  fs.copyFileSync(dbPath, backupPath)

  cleanOldBackups()

  return backupPath
}

export function createManualBackup(): string {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database file does not exist')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFileName = `backup_${timestamp}.db`
  const backupPath = path.join(backupDir, backupFileName)

  fs.copyFileSync(dbPath, backupPath)

  return backupFileName
}

export function cleanupWithRetentionPolicy(config: BackupConfig): void {
  const backupDir = getBackupDir()
  if (!fs.existsSync(backupDir)) return

  // Get all automatic backups (data_*.db), sorted newest first
  const allBackups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('data_') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      date: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  if (allBackups.length === 0) return

  const toKeep = new Set<string>()

  // 1. Keep daily backups (first backup of each day, up to maxDaily days)
  const dailyKept = new Map<string, typeof allBackups[0]>()
  for (const backup of allBackups) {
    const dayKey = backup.date.toISOString().split('T')[0]
    if (!dailyKept.has(dayKey) && dailyKept.size < config.maxDaily) {
      dailyKept.set(dayKey, backup)
      toKeep.add(backup.name)
    }
  }

  // 2. Keep weekly backups (prefer configured day, fallback to first available)
  const weeklyKept = new Map<string, typeof allBackups[0]>()
  for (const backup of allBackups) {
    const weekKey = getWeekKey(backup.date)
    if (!weeklyKept.has(weekKey) && weeklyKept.size < config.maxWeekly) {
      const dayOfWeek = backup.date.getDay()
      const existing = weeklyKept.get(weekKey)

      if (!existing) {
        weeklyKept.set(weekKey, backup)
        toKeep.add(backup.name)
      } else if (dayOfWeek === config.weeklyDay && existing.date.getDay() !== config.weeklyDay) {
        // Replace with preferred day
        weeklyKept.set(weekKey, backup)
        toKeep.add(backup.name)
      }
    }
  }

  // 3. Keep monthly backups (first available of each month)
  const monthlyKept = new Map<string, typeof allBackups[0]>()
  for (const backup of allBackups) {
    const monthKey = backup.date.toISOString().slice(0, 7) // YYYY-MM
    if (!monthlyKept.has(monthKey) && monthlyKept.size < config.maxMonthly) {
      monthlyKept.set(monthKey, backup)
      toKeep.add(backup.name)
    }
  }

  // Delete backups not in any retention category
  for (const backup of allBackups) {
    if (!toKeep.has(backup.name)) {
      try {
        fs.unlinkSync(backup.path)
        console.log(`[Backup] Deleted: ${backup.name}`)
      } catch (e) {
        console.error(`[Backup] Failed to delete ${backup.name}:`, e)
      }
    }
  }
}

function getWeekKey(date: Date): string {
  // Get ISO week number
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

// Keep old function for backwards compatibility but use new logic
export function cleanOldBackups(): void {
  // Import here to avoid circular dependency
  const { getBackupConfig } = require('./backup-scheduler')
  const config = getBackupConfig()
  cleanupWithRetentionPolicy(config)
}

export function listBackups(): { name: string; date: Date; size: number }[] {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) return []

  return fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stats = fs.statSync(path.join(backupDir, f))
      return {
        name: f,
        date: stats.mtime,
        size: stats.size
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function restoreBackup(backupName: string): { success: boolean; safetyBackupName: string } {
  const backupDir = getBackupDir()
  const backupPath = path.join(backupDir, backupName)
  const dbPath = getDbPath()

  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file does not exist')
  }

  // Create safety backup before restore
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safetyBackupName = `pre-restore_${timestamp}.db`
  const safetyBackupPath = path.join(backupDir, safetyBackupName)

  fs.copyFileSync(dbPath, safetyBackupPath)
  fs.copyFileSync(backupPath, dbPath)

  return { success: true, safetyBackupName }
}

export function deleteBackups(names: string[]): void {
  const backupDir = getBackupDir()

  for (const name of names) {
    const backupPath = path.join(backupDir, name)
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }
  }
}

export function downloadBackup(backupName: string, destinationPath: string): void {
  const backupDir = getBackupDir()
  const backupPath = path.join(backupDir, backupName)

  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file does not exist')
  }

  fs.copyFileSync(backupPath, destinationPath)
}

export function exportBackup(destinationPath: string): void {
  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database file does not exist')
  }
  fs.copyFileSync(dbPath, destinationPath)
}

export function importBackup(sourcePath: string): void {
  const dbPath = getDbPath()
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Source file does not exist')
  }
  fs.copyFileSync(sourcePath, dbPath)
}

export function downloadArchive(destinationPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const backupDir = getBackupDir()
    if (!fs.existsSync(backupDir)) {
      reject(new Error('No backups directory'))
      return
    }

    const backups = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'))
    if (backups.length === 0) {
      reject(new Error('No backups to archive'))
      return
    }

    const output = fs.createWriteStream(destinationPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', (err) => reject(err))

    archive.pipe(output)

    for (const backup of backups) {
      archive.file(path.join(backupDir, backup), { name: backup })
    }

    archive.finalize()
  })
}

export function uploadBackup(sourcePath: string): string {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  if (!fs.existsSync(sourcePath)) {
    throw new Error('Source file does not exist')
  }

  const fileName = path.basename(sourcePath)
  const destPath = path.join(backupDir, fileName)

  // If file with same name exists, add timestamp
  let finalPath = destPath
  if (fs.existsSync(destPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const ext = path.extname(fileName)
    const base = path.basename(fileName, ext)
    finalPath = path.join(backupDir, `${base}_${timestamp}${ext}`)
  }

  fs.copyFileSync(sourcePath, finalPath)
  return path.basename(finalPath)
}

export function uploadArchive(sourcePath: string): number {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  if (!fs.existsSync(sourcePath)) {
    throw new Error('Archive file does not exist')
  }

  const zip = new AdmZip(sourcePath)
  const entries = zip.getEntries()

  let importedCount = 0
  for (const entry of entries) {
    if (entry.entryName.endsWith('.db') && !entry.isDirectory) {
      const fileName = path.basename(entry.entryName)
      let destPath = path.join(backupDir, fileName)

      // If file with same name exists, add timestamp
      if (fs.existsSync(destPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const ext = path.extname(fileName)
        const base = path.basename(fileName, ext)
        destPath = path.join(backupDir, `${base}_${timestamp}${ext}`)
      }

      zip.extractEntryTo(entry, backupDir, false, true, false, path.basename(destPath))
      importedCount++
    }
  }

  return importedCount
}
