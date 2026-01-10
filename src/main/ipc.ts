import { ipcMain, dialog } from 'electron'
import { getDatabase } from './database'
import { createBackup, listBackups, restoreBackup, exportBackup, importBackup, deleteBackups, createManualBackup, downloadBackup, downloadArchive, uploadBackup, uploadArchive } from './backup'
import { getBackupConfig, setBackupConfig, restartBackupScheduler } from './backup-scheduler'
import type {
  Client, Project, Session,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  SessionQuery, ProjectWithClient, ProjectWithStats, SessionWithProject,
  Setting, SettingsMap, BackupConfig
} from '../shared/types'

export function registerIpcHandlers(): void {
  // Clients
  ipcMain.handle('db:clients:list', (): Client[] => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM clients ORDER BY name').all() as Client[]
  })

  ipcMain.handle('db:clients:create', (_, input: CreateClientInput): Client => {
    const db = getDatabase()
    const result = db.prepare('INSERT INTO clients (name) VALUES (?)').run(input.name)
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid) as Client
  })

  ipcMain.handle('db:clients:update', (_, input: UpdateClientInput): Client => {
    const db = getDatabase()
    db.prepare('UPDATE clients SET name = ? WHERE id = ?').run(input.name, input.id)
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(input.id) as Client
  })

  ipcMain.handle('db:clients:delete', (_, id: number): void => {
    const db = getDatabase()
    db.prepare('DELETE FROM clients WHERE id = ?').run(id)
  })

  // Projects
  ipcMain.handle('db:projects:list', (_, includeArchived = false): ProjectWithStats[] => {
    const db = getDatabase()

    // Single optimized query with SQL aggregation
    // Uses LEFT JOIN to include projects with no sessions (count/minutes = 0)
    // Calculates duration in SQL: (julianday(end_at) - julianday(start_at)) * 24 * 60
    const sql = `
      SELECT
        p.*,
        c.name as client_name,
        COALESCE(stats.session_count, 0) as session_count,
        COALESCE(stats.total_minutes, 0) as total_minutes
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN (
        SELECT
          project_id,
          COUNT(*) as session_count,
          SUM((julianday(end_at) - julianday(start_at)) * 24 * 60) as total_minutes
        FROM sessions
        GROUP BY project_id
      ) stats ON p.id = stats.project_id
      ${includeArchived ? '' : 'WHERE p.archived = 0'}
      ORDER BY p.name
    `

    return db.prepare(sql).all() as ProjectWithStats[]
  })

  ipcMain.handle('db:projects:create', (_, input: CreateProjectInput): Project => {
    const db = getDatabase()
    const result = db.prepare(
      'INSERT INTO projects (name, client_id, color) VALUES (?, ?, ?)'
    ).run(input.name, input.client_id, input.color)
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid) as Project
  })

  ipcMain.handle('db:projects:update', (_, input: UpdateProjectInput): Project => {
    const db = getDatabase()
    db.prepare(
      'UPDATE projects SET name = ?, client_id = ?, color = ?, archived = ? WHERE id = ?'
    ).run(input.name, input.client_id, input.color, input.archived ? 1 : 0, input.id)
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(input.id) as Project
  })

  ipcMain.handle('db:projects:delete', (_, id: number): void => {
    const db = getDatabase()
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  })

  // Sessions
  ipcMain.handle('db:sessions:list', (_, query: SessionQuery = {}): SessionWithProject[] => {
    const db = getDatabase()

    // Build WHERE clause
    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    // Exclude archived projects by default
    if (!query.includeArchived) {
      conditions.push('p.archived = 0')
    }

    if (query.start_date) {
      conditions.push('s.end_at > ?')
      params.push(query.start_date)
    }
    if (query.end_date) {
      conditions.push('s.start_at < ?')
      params.push(query.end_date)
    }
    if (query.project_id) {
      conditions.push('s.project_id = ?')
      params.push(query.project_id)
    }

    const whereClause = conditions.join(' AND ')

    let sql = `
      SELECT s.*, p.name as project_name, p.color as project_color, c.name as client_name
      FROM sessions s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE ${whereClause}
      ORDER BY s.start_at
    `

    // Add pagination if specified
    if (query.limit !== undefined) {
      sql += ` LIMIT ${query.limit}`
      if (query.offset !== undefined) {
        sql += ` OFFSET ${query.offset}`
      }
    }

    return db.prepare(sql).all(...params) as SessionWithProject[]
  })

  // Sessions count (for pagination)
  ipcMain.handle('db:sessions:count', (_, query: SessionQuery = {}): number => {
    const db = getDatabase()

    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    if (!query.includeArchived) {
      conditions.push('p.archived = 0')
    }
    if (query.start_date) {
      conditions.push('s.end_at > ?')
      params.push(query.start_date)
    }
    if (query.end_date) {
      conditions.push('s.start_at < ?')
      params.push(query.end_date)
    }
    if (query.project_id) {
      conditions.push('s.project_id = ?')
      params.push(query.project_id)
    }

    const sql = `
      SELECT COUNT(*) as count
      FROM sessions s
      JOIN projects p ON s.project_id = p.id
      WHERE ${conditions.join(' AND ')}
    `

    const result = db.prepare(sql).get(...params) as { count: number }
    return result.count
  })

  ipcMain.handle('db:sessions:create', (_, input: CreateSessionInput): Session => {
    const db = getDatabase()
    const result = db.prepare(
      'INSERT INTO sessions (project_id, start_at, end_at, notes) VALUES (?, ?, ?, ?)'
    ).run(input.project_id, input.start_at, input.end_at, input.notes ?? null)
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid) as Session
  })

  ipcMain.handle('db:sessions:update', (_, input: UpdateSessionInput): Session => {
    const db = getDatabase()
    db.prepare(
      'UPDATE sessions SET project_id = ?, start_at = ?, end_at = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(input.project_id, input.start_at, input.end_at, input.notes ?? null, input.id)
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(input.id) as Session
  })

  ipcMain.handle('db:sessions:delete', (_, id: number): void => {
    const db = getDatabase()
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
  })

  ipcMain.handle('db:sessions:deleteByProject', (_, projectId: number): number => {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM sessions WHERE project_id = ?').run(projectId)
    return result.changes
  })

  // Backup
  ipcMain.handle('backup:create', (): string => {
    return createBackup()
  })

  ipcMain.handle('backup:list', (): { name: string; date: Date; size: number }[] => {
    return listBackups()
  })

  ipcMain.handle('backup:restore', (_, backupName: string): { success: boolean; safetyBackupName: string } => {
    return restoreBackup(backupName)
  })

  ipcMain.handle('backup:delete', (_, names: string[]): void => {
    deleteBackups(names)
  })

  ipcMain.handle('backup:createManual', (): string => {
    return createManualBackup()
  })

  ipcMain.handle('backup:download', async (_, backupName: string): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      title: 'Scarica backup',
      defaultPath: backupName,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })
    if (!result.canceled && result.filePath) {
      downloadBackup(backupName, result.filePath)
      return result.filePath
    }
    return null
  })

  ipcMain.handle('backup:export', async (): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      title: 'Esporta backup',
      defaultPath: `time-prism-backup-${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })
    if (!result.canceled && result.filePath) {
      exportBackup(result.filePath)
      return result.filePath
    }
    return null
  })

  ipcMain.handle('backup:import', async (): Promise<boolean> => {
    const result = await dialog.showOpenDialog({
      title: 'Importa backup',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      importBackup(result.filePaths[0])
      return true
    }
    return false
  })

  ipcMain.handle('backup:getConfig', (): BackupConfig => {
    return getBackupConfig()
  })

  ipcMain.handle('backup:setConfig', (_, config: BackupConfig): void => {
    setBackupConfig(config)
    restartBackupScheduler()
  })

  ipcMain.handle('backup:downloadArchive', async (): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      title: 'Scarica archivio backup',
      defaultPath: `time-prism-backups-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    })
    if (!result.canceled && result.filePath) {
      await downloadArchive(result.filePath)
      return result.filePath
    }
    return null
  })

  ipcMain.handle('backup:uploadBackup', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Importa backup',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return uploadBackup(result.filePaths[0])
    }
    return null
  })

  ipcMain.handle('backup:uploadArchive', async (): Promise<number> => {
    const result = await dialog.showOpenDialog({
      title: 'Importa archivio backup',
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return uploadArchive(result.filePaths[0])
    }
    return 0
  })

  // Settings
  ipcMain.handle('db:settings:getAll', (): SettingsMap => {
    const db = getDatabase()
    const rows = db.prepare('SELECT key, value FROM settings').all() as Setting[]
    const map: SettingsMap = {}
    for (const row of rows) {
      map[row.key] = row.value
    }
    return map
  })

  ipcMain.handle('db:settings:get', (_, key: string): string | null => {
    const db = getDatabase()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  })

  ipcMain.handle('db:settings:set', (_, key: string, value: string): void => {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, value)
  })
}
