import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { getDbPath } from './database'

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

export function cleanOldBackups(): void {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) return

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('data_') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime)

  if (files.length > MAX_BACKUPS) {
    files.slice(MAX_BACKUPS).forEach(f => fs.unlinkSync(f.path))
  }
}

export function listBackups(): { name: string; date: Date }[] {
  const backupDir = getBackupDir()

  if (!fs.existsSync(backupDir)) return []

  return fs.readdirSync(backupDir)
    .filter(f => f.startsWith('data_') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      date: fs.statSync(path.join(backupDir, f)).mtime
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function restoreBackup(backupName: string): void {
  const backupDir = getBackupDir()
  const backupPath = path.join(backupDir, backupName)
  const dbPath = getDbPath()

  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file does not exist')
  }

  fs.copyFileSync(backupPath, dbPath)
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
