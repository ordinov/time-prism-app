// Database entities
export interface Client {
  id: number
  name: string
  created_at: string
}

export interface Project {
  id: number
  client_id: number | null
  name: string
  color: string
  archived: boolean
  created_at: string
}

export interface Session {
  id: number
  project_id: number
  start_at: string
  end_at: string
  notes: string | null
  created_at: string
  updated_at: string
}

// With relations
export interface ProjectWithClient extends Project {
  client_name: string | null
}

export interface ProjectWithStats extends ProjectWithClient {
  session_count: number
  total_minutes: number
}

export interface SessionWithProject extends Session {
  project_name: string
  project_color: string
  client_name: string | null
}

// Input types
export interface CreateClientInput {
  name: string
}

export interface UpdateClientInput {
  id: number
  name: string
}

export interface CreateProjectInput {
  name: string
  client_id: number | null
  color: string
}

export interface UpdateProjectInput {
  id: number
  name: string
  client_id: number | null
  color: string
  archived: boolean
}

export interface CreateSessionInput {
  project_id: number
  start_at: string
  end_at: string
  notes?: string | null
}

export interface UpdateSessionInput {
  id: number
  project_id: number
  start_at: string
  end_at: string
  notes?: string | null
}

// Query types
export interface SessionQuery {
  start_date?: string
  end_date?: string
  project_id?: number
  includeArchived?: boolean
}

// Settings
export interface Setting {
  key: string
  value: string
  updated_at: string
}

export type SettingsMap = Record<string, string>

// Backup
export interface BackupInfo {
  name: string
  date: Date
  size: number
}

export interface RestoreResult {
  success: boolean
  safetyBackupName: string
}

// Backup Configuration
export interface BackupConfig {
  scheduleTimes: string[]    // ["09:00", "13:00", "18:00"]
  maxDaily: number           // max daily backups to keep
  maxWeekly: number          // max weekly backups to keep
  maxMonthly: number         // max monthly backups to keep
  weeklyDay: number          // 0=Sun, 1=Mon, ..., 6=Sat
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  scheduleTimes: ['09:00', '13:00', '18:00'],
  maxDaily: 1,
  maxWeekly: 2,
  maxMonthly: 3,
  weeklyDay: 1  // Monday
}
