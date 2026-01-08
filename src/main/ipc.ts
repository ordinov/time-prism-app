import { ipcMain, dialog } from 'electron'
import { getDatabase } from './database'
import { createBackup, listBackups, restoreBackup, exportBackup, importBackup } from './backup'
import type {
  Client, Project, Session,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  SessionQuery, ProjectWithClient, SessionWithProject
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
  ipcMain.handle('db:projects:list', (_, includeArchived = false): ProjectWithClient[] => {
    const db = getDatabase()
    const query = `
      SELECT p.*, c.name as client_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      ${includeArchived ? '' : 'WHERE p.archived = 0'}
      ORDER BY p.name
    `
    return db.prepare(query).all() as ProjectWithClient[]
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
    let sql = `
      SELECT s.*, p.name as project_name, p.color as project_color, c.name as client_name
      FROM sessions s
      JOIN projects p ON s.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (query.start_date) {
      sql += ' AND s.start_at >= ?'
      params.push(query.start_date)
    }
    if (query.end_date) {
      sql += ' AND s.start_at <= ?'
      params.push(query.end_date)
    }
    if (query.project_id) {
      sql += ' AND s.project_id = ?'
      params.push(query.project_id)
    }

    sql += ' ORDER BY s.start_at'
    return db.prepare(sql).all(...params) as SessionWithProject[]
  })

  ipcMain.handle('db:sessions:create', (_, input: CreateSessionInput): Session => {
    const db = getDatabase()
    const result = db.prepare(
      'INSERT INTO sessions (project_id, start_at, end_at) VALUES (?, ?, ?)'
    ).run(input.project_id, input.start_at, input.end_at)
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid) as Session
  })

  ipcMain.handle('db:sessions:update', (_, input: UpdateSessionInput): Session => {
    const db = getDatabase()
    db.prepare(
      'UPDATE sessions SET project_id = ?, start_at = ?, end_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(input.project_id, input.start_at, input.end_at, input.id)
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

  ipcMain.handle('backup:list', (): { name: string; date: Date }[] => {
    return listBackups()
  })

  ipcMain.handle('backup:restore', (_, backupName: string): void => {
    restoreBackup(backupName)
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
}
