import { contextBridge, ipcRenderer } from 'electron'
import type {
  Client, Project, Session,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  SessionQuery, ProjectWithClient, SessionWithProject,
  SettingsMap
} from '../shared/types'

const api = {
  clients: {
    list: (): Promise<Client[]> => ipcRenderer.invoke('db:clients:list'),
    create: (input: CreateClientInput): Promise<Client> => ipcRenderer.invoke('db:clients:create', input),
    update: (input: UpdateClientInput): Promise<Client> => ipcRenderer.invoke('db:clients:update', input),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('db:clients:delete', id),
  },
  projects: {
    list: (includeArchived?: boolean): Promise<ProjectWithClient[]> =>
      ipcRenderer.invoke('db:projects:list', includeArchived),
    create: (input: CreateProjectInput): Promise<Project> => ipcRenderer.invoke('db:projects:create', input),
    update: (input: UpdateProjectInput): Promise<Project> => ipcRenderer.invoke('db:projects:update', input),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('db:projects:delete', id),
  },
  sessions: {
    list: (query?: SessionQuery): Promise<SessionWithProject[]> => ipcRenderer.invoke('db:sessions:list', query),
    create: (input: CreateSessionInput): Promise<Session> => ipcRenderer.invoke('db:sessions:create', input),
    update: (input: UpdateSessionInput): Promise<Session> => ipcRenderer.invoke('db:sessions:update', input),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('db:sessions:delete', id),
    deleteByProject: (projectId: number): Promise<number> => ipcRenderer.invoke('db:sessions:deleteByProject', projectId),
  },
  backup: {
    create: (): Promise<string> => ipcRenderer.invoke('backup:create'),
    list: (): Promise<{ name: string; date: Date }[]> => ipcRenderer.invoke('backup:list'),
    restore: (name: string): Promise<void> => ipcRenderer.invoke('backup:restore', name),
    export: (): Promise<string | null> => ipcRenderer.invoke('backup:export'),
    import: (): Promise<boolean> => ipcRenderer.invoke('backup:import'),
  },
  settings: {
    getAll: (): Promise<SettingsMap> => ipcRenderer.invoke('db:settings:getAll'),
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('db:settings:get', key),
    set: (key: string, value: string): Promise<void> => ipcRenderer.invoke('db:settings:set', key, value),
  }
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
