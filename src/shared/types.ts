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
}
