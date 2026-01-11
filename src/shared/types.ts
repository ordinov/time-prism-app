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
  activity_id: number | null
  start_at: string
  end_at: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: number
  name: string
  project_id: number | null
  created_at: string
}

export interface ActivityWithProject extends Activity {
  project_name: string | null
  project_color: string | null
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
  activity_name: string | null
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
  activity_id?: number | null
}

export interface UpdateSessionInput {
  id: number
  project_id: number
  start_at: string
  end_at: string
  notes?: string | null
  activity_id?: number | null
}

export interface CreateActivityInput {
  name: string
  project_id?: number | null
}

export interface UpdateActivityInput {
  id: number
  name: string
  project_id?: number | null
}

export interface ActivityQuery {
  project_id?: number | null
  includeGlobal?: boolean
}

// Query types
export interface SessionQuery {
  start_date?: string
  end_date?: string
  project_id?: number
  includeArchived?: boolean
  // Pagination (optional)
  limit?: number
  offset?: number
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
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
