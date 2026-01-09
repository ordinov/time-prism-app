import { contextBridge, ipcRenderer } from 'electron'
import type {
  Client, Project, Session,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  SessionQuery, ProjectWithClient, SessionWithProject,
  SettingsMap, BackupInfo, RestoreResult, BackupConfig
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
    createManual: (): Promise<string> => ipcRenderer.invoke('backup:createManual'),
    list: (): Promise<BackupInfo[]> => ipcRenderer.invoke('backup:list'),
    restore: (name: string): Promise<RestoreResult> => ipcRenderer.invoke('backup:restore', name),
    delete: (names: string[]): Promise<void> => ipcRenderer.invoke('backup:delete', names),
    download: (name: string): Promise<string | null> => ipcRenderer.invoke('backup:download', name),
    export: (): Promise<string | null> => ipcRenderer.invoke('backup:export'),
    import: (): Promise<boolean> => ipcRenderer.invoke('backup:import'),
    getConfig: (): Promise<BackupConfig> => ipcRenderer.invoke('backup:getConfig'),
    setConfig: (config: BackupConfig): Promise<void> => ipcRenderer.invoke('backup:setConfig', config),
    downloadArchive: (): Promise<string | null> => ipcRenderer.invoke('backup:downloadArchive'),
    uploadBackup: (): Promise<string | null> => ipcRenderer.invoke('backup:uploadBackup'),
    uploadArchive: (): Promise<number> => ipcRenderer.invoke('backup:uploadArchive'),
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
