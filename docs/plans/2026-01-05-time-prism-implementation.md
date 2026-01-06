# Time Prism Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cross-platform (Windows/Mac) time tracking app with a DAW-style timeline interface.

**Architecture:** Electron app with React renderer, SQLite database via better-sqlite3, IPC communication between main and renderer processes. Monolithic structure with sidebar navigation and 4 main pages.

**Tech Stack:** Electron 28+, React 18, TypeScript, Vite, Tailwind CSS, better-sqlite3, Vitest

---

## Phase 1: Project Setup

### Task 1: Initialize npm project

**Files:**
- Create: `package.json`

**Step 1: Initialize project**

Run:
```bash
npm init -y
```

**Step 2: Update package.json with project info**

Edit `package.json`:
```json
{
  "name": "time-prism",
  "version": "0.1.0",
  "description": "Time tracking app with DAW-style timeline",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "author": "",
  "license": "MIT"
}
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: initialize npm project"
```

---

### Task 2: Install core dependencies

**Step 1: Install Electron and build tools**

Run:
```bash
npm install --save-dev electron electron-builder vite @vitejs/plugin-react typescript
```

**Step 2: Install React and runtime deps**

Run:
```bash
npm install react react-dom react-router-dom better-sqlite3
npm install --save-dev @types/react @types/react-dom @types/better-sqlite3
```

**Step 3: Install Tailwind**

Run:
```bash
npm install --save-dev tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 4: Install testing tools**

Run:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install dependencies"
```

---

### Task 3: Configure TypeScript

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`

**Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/renderer"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 2: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "dist/main",
    "rootDir": "src/main",
    "skipLibCheck": true
  },
  "include": ["src/main", "src/shared", "vite.config.ts", "electron.vite.config.ts"]
}
```

**Step 3: Commit**

```bash
git add tsconfig.json tsconfig.node.json
git commit -m "chore: configure TypeScript"
```

---

### Task 4: Configure Vite for Electron

**Files:**
- Create: `vite.config.ts`
- Create: `electron-builder.json`

**Step 1: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
})
```

**Step 2: Create electron-builder.json**

```json
{
  "appId": "com.timeprism.app",
  "productName": "Time Prism",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*"
  ],
  "mac": {
    "target": "dmg"
  },
  "win": {
    "target": "nsis"
  }
}
```

**Step 3: Commit**

```bash
git add vite.config.ts electron-builder.json
git commit -m "chore: configure Vite and electron-builder"
```

---

### Task 5: Configure Tailwind

**Files:**
- Modify: `tailwind.config.js`
- Create: `src/renderer/index.css`

**Step 1: Update tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 2: Create src/renderer/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

**Step 3: Commit**

```bash
git add tailwind.config.js src/renderer/index.css
git commit -m "chore: configure Tailwind CSS"
```

---

### Task 6: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/renderer/test/setup.ts`

**Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/renderer/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
})
```

**Step 2: Create test setup file**

Create `src/renderer/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

**Step 3: Update package.json scripts**

Add to scripts in `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

**Step 4: Commit**

```bash
git add vitest.config.ts src/renderer/test/setup.ts package.json
git commit -m "chore: configure Vitest"
```

---

## Phase 2: Electron Main Process

### Task 7: Create shared types

**Files:**
- Create: `src/shared/types.ts`

**Step 1: Create types file**

```typescript
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
}

export interface UpdateSessionInput {
  id: number
  project_id: number
  start_at: string
  end_at: string
}

// Query types
export interface SessionQuery {
  start_date?: string
  end_date?: string
  project_id?: number
}
```

**Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 8: Create database module

**Files:**
- Create: `src/main/database.ts`

**Step 1: Create database module**

```typescript
import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'data.db')
}

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id),
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      archived INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      start_at DATETIME NOT NULL,
      end_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions(start_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
  `)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
```

**Step 2: Commit**

```bash
git add src/main/database.ts
git commit -m "feat: add SQLite database module"
```

---

### Task 9: Create backup module

**Files:**
- Create: `src/main/backup.ts`

**Step 1: Create backup module**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/main/backup.ts
git commit -m "feat: add backup module"
```

---

### Task 10: Create IPC handlers

**Files:**
- Create: `src/main/ipc.ts`

**Step 1: Create IPC handlers**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat: add IPC handlers for clients, projects, sessions, backup"
```

---

### Task 11: Create Electron main entry point

**Files:**
- Create: `src/main/index.ts`

**Step 1: Create main entry**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { createBackup } from './backup'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()

  // Auto backup on startup
  try {
    createBackup()
  } catch (e) {
    console.error('Failed to create startup backup:', e)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

**Step 2: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add Electron main entry point"
```

---

### Task 12: Create preload script

**Files:**
- Create: `src/main/preload.ts`

**Step 1: Create preload script**

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type {
  Client, Project, Session,
  CreateClientInput, UpdateClientInput,
  CreateProjectInput, UpdateProjectInput,
  CreateSessionInput, UpdateSessionInput,
  SessionQuery, ProjectWithClient, SessionWithProject
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
  },
  backup: {
    create: (): Promise<string> => ipcRenderer.invoke('backup:create'),
    list: (): Promise<{ name: string; date: Date }[]> => ipcRenderer.invoke('backup:list'),
    restore: (name: string): Promise<void> => ipcRenderer.invoke('backup:restore', name),
    export: (): Promise<string | null> => ipcRenderer.invoke('backup:export'),
    import: (): Promise<boolean> => ipcRenderer.invoke('backup:import'),
  }
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
```

**Step 2: Commit**

```bash
git add src/main/preload.ts
git commit -m "feat: add preload script with typed API"
```

---

## Phase 3: React Renderer Base

### Task 13: Create HTML entry point

**Files:**
- Create: `src/renderer/index.html`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
    <title>Time Prism</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**Step 2: Commit**

```bash
git add src/renderer/index.html
git commit -m "feat: add HTML entry point"
```

---

### Task 14: Create React entry point

**Files:**
- Create: `src/renderer/main.tsx`

**Step 1: Create main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
```

**Step 2: Commit**

```bash
git add src/renderer/main.tsx
git commit -m "feat: add React entry point"
```

---

### Task 15: Create App component with routing

**Files:**
- Create: `src/renderer/App.tsx`

**Step 1: Create App.tsx**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Tracking from './pages/Tracking'
import Projects from './pages/Projects'
import Clients from './pages/Clients'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/tracking" replace />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="projects" element={<Projects />} />
        <Route path="clients" element={<Clients />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: add App component with routing"
```

---

### Task 16: Create Layout component

**Files:**
- Create: `src/renderer/components/Layout.tsx`

**Step 1: Create Layout.tsx**

```typescript
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Layout.tsx
git commit -m "feat: add Layout component"
```

---

### Task 17: Create Sidebar component

**Files:**
- Create: `src/renderer/components/Sidebar.tsx`

**Step 1: Create Sidebar.tsx**

```typescript
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/tracking', label: 'Track', icon: '📅' },
  { to: '/projects', label: 'Progetti', icon: '📁' },
  { to: '/clients', label: 'Clienti', icon: '👤' },
  { to: '/reports', label: 'Report', icon: '📊' },
]

export default function Sidebar() {
  return (
    <nav className="w-20 bg-gray-800 text-white flex flex-col">
      <div className="p-2 text-center border-b border-gray-700">
        <span className="text-xs font-bold">Time Prism</span>
      </div>
      <div className="flex-1 py-4">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-3 px-2 hover:bg-gray-700 transition-colors ${
                isActive ? 'bg-gray-700 border-l-2 border-blue-400' : ''
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Sidebar.tsx
git commit -m "feat: add Sidebar component"
```

---

### Task 18: Create StatusBar component

**Files:**
- Create: `src/renderer/components/StatusBar.tsx`

**Step 1: Create StatusBar.tsx**

```typescript
import { useState, useEffect } from 'react'

export default function StatusBar() {
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    setLastSaved(new Date())
  }, [])

  return (
    <div className="h-8 bg-gray-800 text-white text-xs flex items-center px-4 justify-between">
      <div className="flex items-center gap-4">
        <span>⏱ Timer: inattivo</span>
      </div>
      <div>
        {lastSaved && (
          <span className="text-gray-400">
            Salvato alle {lastSaved.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/StatusBar.tsx
git commit -m "feat: add StatusBar component"
```

---

### Task 19: Create placeholder pages

**Files:**
- Create: `src/renderer/pages/Tracking.tsx`
- Create: `src/renderer/pages/Projects.tsx`
- Create: `src/renderer/pages/Clients.tsx`
- Create: `src/renderer/pages/Reports.tsx`

**Step 1: Create Tracking.tsx**

```typescript
export default function Tracking() {
  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold mb-4">Tracking</h1>
      <p className="text-gray-600">Timeline coming soon...</p>
    </div>
  )
}
```

**Step 2: Create Projects.tsx**

```typescript
export default function Projects() {
  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold mb-4">Progetti</h1>
      <p className="text-gray-600">Project list coming soon...</p>
    </div>
  )
}
```

**Step 3: Create Clients.tsx**

```typescript
export default function Clients() {
  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold mb-4">Clienti</h1>
      <p className="text-gray-600">Client list coming soon...</p>
    </div>
  )
}
```

**Step 4: Create Reports.tsx**

```typescript
export default function Reports() {
  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold mb-4">Report</h1>
      <p className="text-gray-600">Reports coming soon...</p>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add src/renderer/pages/
git commit -m "feat: add placeholder pages"
```

---

### Task 20: Update package.json scripts for development

**Files:**
- Modify: `package.json`

**Step 1: Update scripts**

Update `package.json` scripts section:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build": "tsc -p tsconfig.node.json && vite build",
    "build:electron": "electron-builder",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "main": "dist/main/index.js"
}
```

**Step 2: Install concurrently and wait-on**

Run:
```bash
npm install --save-dev concurrently wait-on
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: update dev scripts"
```

---

## Phase 4: Clients CRUD Page

### Task 21: Create useClients hook

**Files:**
- Create: `src/renderer/hooks/useClients.ts`

**Step 1: Write test**

Create `src/renderer/hooks/useClients.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useClients } from './useClients'

const mockClients = [
  { id: 1, name: 'Acme Corp', created_at: '2026-01-01' },
  { id: 2, name: 'Beta Inc', created_at: '2026-01-02' },
]

beforeEach(() => {
  vi.stubGlobal('window', {
    api: {
      clients: {
        list: vi.fn().mockResolvedValue(mockClients),
        create: vi.fn().mockResolvedValue({ id: 3, name: 'New Client', created_at: '2026-01-03' }),
        update: vi.fn().mockResolvedValue({ id: 1, name: 'Updated', created_at: '2026-01-01' }),
        delete: vi.fn().mockResolvedValue(undefined),
      }
    }
  })
})

describe('useClients', () => {
  it('loads clients on mount', async () => {
    const { result } = renderHook(() => useClients())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.clients).toEqual(mockClients)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/renderer/hooks/useClients.test.ts`
Expected: FAIL (module not found)

**Step 3: Create hook**

Create `src/renderer/hooks/useClients.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import type { Client, CreateClientInput, UpdateClientInput } from '@shared/types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.clients.list()
      setClients(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async (input: CreateClientInput): Promise<Client> => {
    const client = await window.api.clients.create(input)
    await load()
    return client
  }

  const update = async (input: UpdateClientInput): Promise<Client> => {
    const client = await window.api.clients.update(input)
    await load()
    return client
  }

  const remove = async (id: number): Promise<void> => {
    await window.api.clients.delete(id)
    await load()
  }

  return { clients, loading, error, create, update, remove, reload: load }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/renderer/hooks/useClients.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/hooks/
git commit -m "feat: add useClients hook"
```

---

### Task 22: Implement Clients page

**Files:**
- Modify: `src/renderer/pages/Clients.tsx`

**Step 1: Implement Clients page**

```typescript
import { useState } from 'react'
import { useClients } from '../hooks/useClients'
import type { Client } from '@shared/types'

export default function Clients() {
  const { clients, loading, error, create, update, remove } = useClients()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newName.trim()) return
    await create({ name: newName.trim() })
    setNewName('')
    setIsAdding(false)
  }

  const handleUpdate = async (client: Client) => {
    if (!editName.trim()) return
    await update({ id: client.id, name: editName.trim() })
    setEditingId(null)
    setEditName('')
  }

  const handleDelete = async (id: number) => {
    if (confirm('Eliminare questo cliente?')) {
      await remove(id)
    }
  }

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setEditName(client.name)
  }

  if (loading) {
    return <div className="p-4">Caricamento...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">Errore: {error}</div>
  }

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Clienti</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Nuovo
        </button>
      </div>

      <input
        type="text"
        placeholder="Cerca..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 border rounded mb-4"
      />

      {isAdding && (
        <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded">
          <input
            type="text"
            placeholder="Nome cliente"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="flex-1 px-3 py-2 border rounded"
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Salva
          </button>
          <button
            onClick={() => { setIsAdding(false); setNewName('') }}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Annulla
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filteredClients.map(client => (
          <div
            key={client.id}
            className="flex items-center justify-between p-3 bg-white rounded shadow-sm"
          >
            {editingId === client.id ? (
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(client)}
                  className="flex-1 px-3 py-1 border rounded"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(client)}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                >
                  Salva
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 bg-gray-300 rounded text-sm"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <>
                <span>{client.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(client)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Modifica"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Elimina"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {filteredClients.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            {search ? 'Nessun cliente trovato' : 'Nessun cliente. Creane uno!'}
          </p>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/Clients.tsx
git commit -m "feat: implement Clients CRUD page"
```

---

## Phase 5: Projects CRUD Page

### Task 23: Create useProjects hook

**Files:**
- Create: `src/renderer/hooks/useProjects.ts`

**Step 1: Create hook**

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { ProjectWithClient, CreateProjectInput, UpdateProjectInput } from '@shared/types'

export function useProjects(includeArchived = false) {
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.projects.list(includeArchived)
      setProjects(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [includeArchived])

  useEffect(() => {
    load()
  }, [load])

  const create = async (input: CreateProjectInput) => {
    const project = await window.api.projects.create(input)
    await load()
    return project
  }

  const update = async (input: UpdateProjectInput) => {
    const project = await window.api.projects.update(input)
    await load()
    return project
  }

  const remove = async (id: number) => {
    await window.api.projects.delete(id)
    await load()
  }

  const archive = async (project: ProjectWithClient) => {
    await update({ ...project, archived: !project.archived })
  }

  return { projects, loading, error, create, update, remove, archive, reload: load }
}
```

**Step 2: Commit**

```bash
git add src/renderer/hooks/useProjects.ts
git commit -m "feat: add useProjects hook"
```

---

### Task 24: Implement Projects page

**Files:**
- Modify: `src/renderer/pages/Projects.tsx`

**Step 1: Implement Projects page**

```typescript
import { useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useClients } from '../hooks/useClients'
import type { ProjectWithClient } from '@shared/types'

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899'
]

export default function Projects() {
  const [showArchived, setShowArchived] = useState(false)
  const { projects, loading, error, create, update, remove, archive } = useProjects(showArchived)
  const { clients } = useClients()

  const [search, setSearch] = useState('')
  const [filterClientId, setFilterClientId] = useState<number | ''>('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formName, setFormName] = useState('')
  const [formClientId, setFormClientId] = useState<number | null>(null)
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])

  const filteredProjects = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterClientId && p.client_id !== filterClientId) return false
    return true
  })

  const resetForm = () => {
    setFormName('')
    setFormClientId(null)
    setFormColor(PRESET_COLORS[0])
    setIsAdding(false)
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!formName.trim()) return
    await create({ name: formName.trim(), client_id: formClientId, color: formColor })
    resetForm()
  }

  const handleUpdate = async () => {
    if (!formName.trim() || !editingId) return
    const project = projects.find(p => p.id === editingId)
    if (!project) return
    await update({
      id: editingId,
      name: formName.trim(),
      client_id: formClientId,
      color: formColor,
      archived: project.archived
    })
    resetForm()
  }

  const startEdit = (project: ProjectWithClient) => {
    setEditingId(project.id)
    setFormName(project.name)
    setFormClientId(project.client_id)
    setFormColor(project.color)
    setIsAdding(false)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Eliminare questo progetto?')) {
      await remove(id)
    }
  }

  if (loading) return <div className="p-4">Caricamento...</div>
  if (error) return <div className="p-4 text-red-600">Errore: {error}</div>

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Progetti</h1>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null) }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Nuovo
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Cerca..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
        />
        <select
          value={filterClientId}
          onChange={e => setFilterClientId(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border rounded"
        >
          <option value="">Tutti i clienti</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
          />
          <span className="text-sm">Archiviati</span>
        </label>
      </div>

      {(isAdding || editingId) && (
        <div className="p-4 bg-gray-50 rounded mb-4 space-y-3">
          <input
            type="text"
            placeholder="Nome progetto"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            autoFocus
          />
          <select
            value={formClientId ?? ''}
            onChange={e => setFormClientId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Nessun cliente</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setFormColor(color)}
                className={`w-8 h-8 rounded-full border-2 ${formColor === color ? 'border-gray-800' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              {editingId ? 'Aggiorna' : 'Crea'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
              Annulla
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filteredProjects.map(project => (
          <div
            key={project.id}
            className={`flex items-center justify-between p-3 bg-white rounded shadow-sm ${project.archived ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="font-medium">{project.name}</span>
              <span className="text-gray-500 text-sm">{project.client_name ?? '—'}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(project)} className="p-1 hover:bg-gray-100 rounded" title="Modifica">✏️</button>
              <button onClick={() => archive(project)} className="p-1 hover:bg-gray-100 rounded" title={project.archived ? 'Ripristina' : 'Archivia'}>📦</button>
              <button onClick={() => handleDelete(project.id)} className="p-1 hover:bg-gray-100 rounded" title="Elimina">🗑️</button>
            </div>
          </div>
        ))}
        {filteredProjects.length === 0 && (
          <p className="text-gray-500 text-center py-8">Nessun progetto trovato</p>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/Projects.tsx
git commit -m "feat: implement Projects CRUD page"
```

---

## Phase 6: Timeline Component (Core Feature)

### Task 25: Create useSessions hook

**Files:**
- Create: `src/renderer/hooks/useSessions.ts`

**Step 1: Create hook**

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { SessionWithProject, CreateSessionInput, UpdateSessionInput, SessionQuery } from '@shared/types'

export function useSessions(query: SessionQuery = {}) {
  const [sessions, setSessions] = useState<SessionWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.sessions.list(query)
      setSessions(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [query.start_date, query.end_date, query.project_id])

  useEffect(() => {
    load()
  }, [load])

  const create = async (input: CreateSessionInput) => {
    const session = await window.api.sessions.create(input)
    await load()
    return session
  }

  const update = async (input: UpdateSessionInput) => {
    const session = await window.api.sessions.update(input)
    await load()
    return session
  }

  const remove = async (id: number) => {
    await window.api.sessions.delete(id)
    await load()
  }

  return { sessions, loading, error, create, update, remove, reload: load }
}
```

**Step 2: Commit**

```bash
git add src/renderer/hooks/useSessions.ts
git commit -m "feat: add useSessions hook"
```

---

### Task 26: Create Timeline utilities

**Files:**
- Create: `src/renderer/components/Timeline/utils.ts`

**Step 1: Create utilities**

```typescript
export type ViewMode = 'day' | 'week' | 'month'

export function getViewStartEnd(date: Date, mode: ViewMode): { start: Date; end: Date } {
  const start = new Date(date)
  const end = new Date(date)

  switch (mode) {
    case 'day':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'week':
      const dayOfWeek = start.getDay()
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      start.setDate(start.getDate() + diffToMonday)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      break
  }

  return { start, end }
}

export function getHoursInView(mode: ViewMode): number {
  switch (mode) {
    case 'day': return 24
    case 'week': return 24 * 7
    case 'month': return 24 * 31
  }
}

export function dateToPosition(date: Date, viewStart: Date, pixelsPerHour: number): number {
  const diffMs = date.getTime() - viewStart.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours * pixelsPerHour
}

export function positionToDate(x: number, viewStart: Date, pixelsPerHour: number): Date {
  const hours = x / pixelsPerHour
  const date = new Date(viewStart.getTime() + hours * 60 * 60 * 1000)
  return date
}

export function formatDuration(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const diffMs = end.getTime() - start.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

export function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const fmt = (d: Date) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return `${fmt(start)} - ${fmt(end)}`
}

export function snapToGrid(date: Date, snapMinutes: number = 15): Date {
  const snapped = new Date(date)
  const minutes = snapped.getMinutes()
  const snappedMinutes = Math.round(minutes / snapMinutes) * snapMinutes
  snapped.setMinutes(snappedMinutes, 0, 0)
  return snapped
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Timeline/utils.ts
git commit -m "feat: add Timeline utilities"
```

---

### Task 27: Create TimelineHeader component

**Files:**
- Create: `src/renderer/components/Timeline/TimelineHeader.tsx`

**Step 1: Create component**

```typescript
import type { ViewMode } from './utils'

interface Props {
  currentDate: Date
  viewMode: ViewMode
  zoom: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewModeChange: (mode: ViewMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
}

export default function TimelineHeader({
  currentDate,
  viewMode,
  zoom,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onZoomIn,
  onZoomOut
}: Props) {
  const formatDate = () => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      case 'week':
        return `Settimana del ${currentDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`
      case 'month':
        return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    }
  }

  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
      <div className="flex items-center gap-2">
        <button onClick={onPrev} className="px-2 py-1 hover:bg-gray-200 rounded">◀</button>
        <button onClick={onToday} className="px-3 py-1 hover:bg-gray-200 rounded text-sm">Oggi</button>
        <button onClick={onNext} className="px-2 py-1 hover:bg-gray-200 rounded">▶</button>
        <span className="ml-2 font-medium">{formatDate()}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex border rounded overflow-hidden">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1 text-sm ${viewMode === mode ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
            >
              {mode === 'day' ? 'Giorno' : mode === 'week' ? 'Settimana' : 'Mese'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={onZoomOut} className="px-2 py-1 hover:bg-gray-200 rounded">−</button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} className="px-2 py-1 hover:bg-gray-200 rounded">+</button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Timeline/TimelineHeader.tsx
git commit -m "feat: add TimelineHeader component"
```

---

### Task 28: Create TimelineRuler component

**Files:**
- Create: `src/renderer/components/Timeline/TimelineRuler.tsx`

**Step 1: Create component**

```typescript
import { useMemo } from 'react'
import type { ViewMode } from './utils'

interface Props {
  viewStart: Date
  viewEnd: Date
  viewMode: ViewMode
  pixelsPerHour: number
  scrollLeft: number
}

export default function TimelineRuler({ viewStart, viewEnd, viewMode, pixelsPerHour, scrollLeft }: Props) {
  const markers = useMemo(() => {
    const result: { position: number; label: string; isMajor: boolean }[] = []
    const current = new Date(viewStart)

    while (current <= viewEnd) {
      const position = ((current.getTime() - viewStart.getTime()) / (1000 * 60 * 60)) * pixelsPerHour
      const hour = current.getHours()

      if (viewMode === 'day') {
        result.push({
          position,
          label: `${hour.toString().padStart(2, '0')}:00`,
          isMajor: hour % 6 === 0
        })
        current.setHours(current.getHours() + 1)
      } else if (viewMode === 'week') {
        if (hour === 0) {
          result.push({
            position,
            label: current.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }),
            isMajor: true
          })
        } else if (hour % 6 === 0) {
          result.push({
            position,
            label: `${hour}:00`,
            isMajor: false
          })
        }
        current.setHours(current.getHours() + 3)
      } else {
        if (hour === 0) {
          result.push({
            position,
            label: current.getDate().toString(),
            isMajor: current.getDay() === 1
          })
        }
        current.setDate(current.getDate() + 1)
      }
    }

    return result
  }, [viewStart, viewEnd, viewMode, pixelsPerHour])

  return (
    <div className="h-8 bg-gray-50 border-b relative overflow-hidden">
      <div style={{ transform: `translateX(-${scrollLeft}px)` }} className="absolute inset-0">
        {markers.map((marker, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex flex-col justify-end"
            style={{ left: marker.position }}
          >
            <div className={`border-l ${marker.isMajor ? 'border-gray-400 h-4' : 'border-gray-300 h-2'}`} />
            <span className={`text-xs ${marker.isMajor ? 'text-gray-700' : 'text-gray-400'} whitespace-nowrap pl-1`}>
              {marker.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Timeline/TimelineRuler.tsx
git commit -m "feat: add TimelineRuler component"
```

---

### Task 29: Create TimelineTrack component

**Files:**
- Create: `src/renderer/components/Timeline/TimelineTrack.tsx`

**Step 1: Create component**

```typescript
import { useRef, useState } from 'react'
import type { SessionWithProject } from '@shared/types'
import { dateToPosition, positionToDate, snapToGrid, formatTimeRange, formatDuration } from './utils'

interface Props {
  projectId: number
  projectName: string
  projectColor: string
  sessions: SessionWithProject[]
  viewStart: Date
  pixelsPerHour: number
  totalWidth: number
  scrollLeft: number
  onCreateSession: (projectId: number, startAt: Date, endAt: Date) => void
  onUpdateSession: (sessionId: number, startAt: Date, endAt: Date) => void
  onDeleteSession: (sessionId: number) => void
}

export default function TimelineTrack({
  projectId,
  projectName,
  projectColor,
  sessions,
  viewStart,
  pixelsPerHour,
  totalWidth,
  scrollLeft,
  onCreateSession,
  onUpdateSession,
  onDeleteSession
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== trackRef.current) return
    const rect = trackRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    setIsDragging(true)
    setDragStart(x)
    setDragEnd(x)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    setDragEnd(x)
  }

  const handleMouseUp = () => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const startX = Math.min(dragStart, dragEnd)
      const endX = Math.max(dragStart, dragEnd)
      if (endX - startX > 10) {
        const startDate = snapToGrid(positionToDate(startX, viewStart, pixelsPerHour))
        const endDate = snapToGrid(positionToDate(endX, viewStart, pixelsPerHour))
        onCreateSession(projectId, startDate, endDate)
      }
    }
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  return (
    <div className="flex border-b">
      <div className="w-40 flex-shrink-0 p-2 bg-gray-50 border-r flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: projectColor }} />
        <span className="text-sm truncate">{projectName}</span>
      </div>
      <div
        ref={trackRef}
        className="h-12 relative cursor-crosshair"
        style={{ width: totalWidth }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{ transform: `translateX(-${scrollLeft}px)` }} className="absolute inset-0">
          {sessions.map(session => {
            const left = dateToPosition(new Date(session.start_at), viewStart, pixelsPerHour)
            const right = dateToPosition(new Date(session.end_at), viewStart, pixelsPerHour)
            const width = right - left

            return (
              <div
                key={session.id}
                className="absolute top-1 bottom-1 rounded cursor-pointer group"
                style={{
                  left,
                  width: Math.max(width, 4),
                  backgroundColor: projectColor
                }}
                title={`${formatTimeRange(session.start_at, session.end_at)} (${formatDuration(session.start_at, session.end_at)})`}
                onDoubleClick={() => {
                  // TODO: open edit modal
                }}
              >
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(session.id)
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}

          {isDragging && dragStart !== null && dragEnd !== null && (
            <div
              className="absolute top-1 bottom-1 bg-blue-300 opacity-50 rounded"
              style={{
                left: Math.min(dragStart, dragEnd),
                width: Math.abs(dragEnd - dragStart)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Timeline/TimelineTrack.tsx
git commit -m "feat: add TimelineTrack component"
```

---

### Task 30: Create Timeline main component

**Files:**
- Create: `src/renderer/components/Timeline/Timeline.tsx`
- Create: `src/renderer/components/Timeline/index.ts`

**Step 1: Create Timeline.tsx**

```typescript
import { useState, useRef, useCallback, useEffect } from 'react'
import TimelineHeader from './TimelineHeader'
import TimelineRuler from './TimelineRuler'
import TimelineTrack from './TimelineTrack'
import { useSessions } from '../../hooks/useSessions'
import { useProjects } from '../../hooks/useProjects'
import type { ViewMode } from './utils'
import { getViewStartEnd, getHoursInView } from './utils'

const BASE_PIXELS_PER_HOUR = 60
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4

export default function Timeline() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [zoom, setZoom] = useState(1)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [activeProjectIds, setActiveProjectIds] = useState<number[]>([])

  const containerRef = useRef<HTMLDivElement>(null)

  const { start: viewStart, end: viewEnd } = getViewStartEnd(currentDate, viewMode)
  const pixelsPerHour = BASE_PIXELS_PER_HOUR * zoom
  const totalWidth = getHoursInView(viewMode) * pixelsPerHour

  const { sessions, create, update, remove } = useSessions({
    start_date: viewStart.toISOString(),
    end_date: viewEnd.toISOString()
  })

  const { projects } = useProjects()

  // Add projects that have sessions in view
  useEffect(() => {
    const projectIdsWithSessions = [...new Set(sessions.map(s => s.project_id))]
    setActiveProjectIds(prev => {
      const combined = [...new Set([...prev, ...projectIdsWithSessions])]
      return combined
    })
  }, [sessions])

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() - 1)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7)
    else newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + 1)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7)
    else newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const handleToday = () => setCurrentDate(new Date())

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.5, MAX_ZOOM))
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.5, MIN_ZOOM))

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft)
  }

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      if (e.deltaY < 0) handleZoomIn()
      else handleZoomOut()
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const handleCreateSession = async (projectId: number, startAt: Date, endAt: Date) => {
    await create({
      project_id: projectId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString()
    })
  }

  const handleUpdateSession = async (sessionId: number, startAt: Date, endAt: Date) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    await update({
      id: sessionId,
      project_id: session.project_id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString()
    })
  }

  const handleDeleteSession = async (sessionId: number) => {
    if (confirm('Eliminare questa sessione?')) {
      await remove(sessionId)
    }
  }

  const handleAddProject = (projectId: number) => {
    if (!activeProjectIds.includes(projectId)) {
      setActiveProjectIds([...activeProjectIds, projectId])
    }
  }

  const availableProjects = projects.filter(p => !activeProjectIds.includes(p.id) && !p.archived)
  const activeProjects = projects.filter(p => activeProjectIds.includes(p.id))

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-white rounded shadow">
      <TimelineHeader
        currentDate={currentDate}
        viewMode={viewMode}
        zoom={zoom}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewModeChange={setViewMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      <div className="flex">
        <div className="w-40 flex-shrink-0" />
        <div className="flex-1 overflow-x-auto" onScroll={handleScroll}>
          <TimelineRuler
            viewStart={viewStart}
            viewEnd={viewEnd}
            viewMode={viewMode}
            pixelsPerHour={pixelsPerHour}
            scrollLeft={scrollLeft}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto" onScroll={handleScroll}>
        <div className="flex border-b">
          <div className="w-40 flex-shrink-0 p-2 bg-gray-50 border-r">
            <select
              className="w-full text-sm border rounded px-2 py-1"
              value=""
              onChange={e => {
                if (e.target.value) handleAddProject(Number(e.target.value))
              }}
            >
              <option value="">+ Aggiungi progetto</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ width: totalWidth }} />
        </div>

        {activeProjects.map(project => (
          <TimelineTrack
            key={project.id}
            projectId={project.id}
            projectName={project.name}
            projectColor={project.color}
            sessions={sessions.filter(s => s.project_id === project.id)}
            viewStart={viewStart}
            pixelsPerHour={pixelsPerHour}
            totalWidth={totalWidth}
            scrollLeft={scrollLeft}
            onCreateSession={handleCreateSession}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Create index.ts**

```typescript
export { default } from './Timeline'
```

**Step 3: Commit**

```bash
git add src/renderer/components/Timeline/
git commit -m "feat: add Timeline main component"
```

---

### Task 31: Update Tracking page to use Timeline

**Files:**
- Modify: `src/renderer/pages/Tracking.tsx`

**Step 1: Update Tracking.tsx**

```typescript
import Timeline from '../components/Timeline'

export default function Tracking() {
  return (
    <div className="h-full">
      <Timeline />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/Tracking.tsx
git commit -m "feat: integrate Timeline into Tracking page"
```

---

## Phase 7: Reports Page

### Task 32: Implement Reports page

**Files:**
- Modify: `src/renderer/pages/Reports.tsx`

**Step 1: Implement Reports page**

```typescript
import { useState, useMemo } from 'react'
import { useSessions } from '../hooks/useSessions'

type Preset = 'week' | 'month' | '30days' | 'custom'

export default function Reports() {
  const [preset, setPreset] = useState<Preset>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { start_date, end_date } = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date = new Date(now)
    end.setHours(23, 59, 59, 999)

    switch (preset) {
      case 'week':
        start = new Date(now)
        const day = start.getDay()
        start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
        start.setHours(0, 0, 0, 0)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '30days':
        start = new Date(now)
        start.setDate(start.getDate() - 30)
        break
      case 'custom':
        start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1)
        end = customEnd ? new Date(customEnd) : now
        end.setHours(23, 59, 59, 999)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    }
  }, [preset, customStart, customEnd])

  const { sessions, loading } = useSessions({ start_date, end_date })

  const projectStats = useMemo(() => {
    const stats: Record<number, { name: string; client: string | null; minutes: number }> = {}

    sessions.forEach(s => {
      const duration = (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / (1000 * 60)
      if (!stats[s.project_id]) {
        stats[s.project_id] = { name: s.project_name, client: s.client_name, minutes: 0 }
      }
      stats[s.project_id].minutes += duration
    })

    return Object.values(stats).sort((a, b) => b.minutes - a.minutes)
  }, [sessions])

  const dateStats = useMemo(() => {
    const stats: Record<string, number> = {}

    sessions.forEach(s => {
      const date = new Date(s.start_at).toLocaleDateString('it-IT')
      const duration = (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / (1000 * 60)
      stats[date] = (stats[date] || 0) + duration
    })

    return Object.entries(stats)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime())
  }, [sessions])

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  const formatDays = (minutes: number) => (minutes / 60 / 8).toFixed(2)

  const totalMinutes = projectStats.reduce((sum, p) => sum + p.minutes, 0)

  if (loading) return <div className="p-4">Caricamento...</div>

  return (
    <div className="h-full overflow-auto">
      <h1 className="text-2xl font-bold mb-4">Report</h1>

      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Periodo</label>
          <select
            value={preset}
            onChange={e => setPreset(e.target.value as Preset)}
            className="border rounded px-3 py-2"
          >
            <option value="week">Questa settimana</option>
            <option value="month">Questo mese</option>
            <option value="30days">Ultimi 30 giorni</option>
            <option value="custom">Personalizzato</option>
          </select>
        </div>

        {preset === 'custom' && (
          <>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Da</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">A</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Riepilogo per Progetto</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Progetto</th>
                <th className="py-2">Cliente</th>
                <th className="py-2 text-right">Ore</th>
                <th className="py-2 text-right">Giorni (8h)</th>
              </tr>
            </thead>
            <tbody>
              {projectStats.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-gray-500">{p.client || '—'}</td>
                  <td className="py-2 text-right">{formatMinutes(p.minutes)}</td>
                  <td className="py-2 text-right">{formatDays(p.minutes)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2">TOTALE</td>
                <td></td>
                <td className="py-2 text-right">{formatMinutes(totalMinutes)}</td>
                <td className="py-2 text-right">{formatDays(totalMinutes)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Riepilogo per Data</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Data</th>
                <th className="py-2 text-right">Ore</th>
                <th className="py-2 text-right">Giorni (8h)</th>
              </tr>
            </thead>
            <tbody>
              {dateStats.map((d, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{d.date}</td>
                  <td className="py-2 text-right">{formatMinutes(d.minutes)}</td>
                  <td className="py-2 text-right">{formatDays(d.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/pages/Reports.tsx
git commit -m "feat: implement Reports page with project and date summaries"
```

---

## Phase 8: Timer Feature

### Task 33: Create Timer context

**Files:**
- Create: `src/renderer/context/TimerContext.tsx`

**Step 1: Create TimerContext**

```typescript
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { ProjectWithClient } from '@shared/types'

interface TimerState {
  isRunning: boolean
  projectId: number | null
  projectName: string | null
  startTime: Date | null
  elapsed: number
}

interface TimerContextValue extends TimerState {
  start: (project: ProjectWithClient) => void
  stop: () => Promise<void>
}

const TimerContext = createContext<TimerContextValue | null>(null)

const STORAGE_KEY = 'time-prism-active-timer'

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    projectId: null,
    projectName: null,
    startTime: null,
    elapsed: 0
  })

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const startTime = new Date(parsed.startTime)
        setState({
          isRunning: true,
          projectId: parsed.projectId,
          projectName: parsed.projectName,
          startTime,
          elapsed: Math.floor((Date.now() - startTime.getTime()) / 1000)
        })
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Update elapsed every second
  useEffect(() => {
    if (!state.isRunning || !state.startTime) return

    const interval = setInterval(() => {
      setState(s => ({
        ...s,
        elapsed: Math.floor((Date.now() - s.startTime!.getTime()) / 1000)
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [state.isRunning, state.startTime])

  const start = useCallback((project: ProjectWithClient) => {
    const startTime = new Date()
    setState({
      isRunning: true,
      projectId: project.id,
      projectName: project.name,
      startTime,
      elapsed: 0
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      startTime: startTime.toISOString()
    }))
  }, [])

  const stop = useCallback(async () => {
    if (!state.isRunning || !state.projectId || !state.startTime) return

    const endTime = new Date()
    await window.api.sessions.create({
      project_id: state.projectId,
      start_at: state.startTime.toISOString(),
      end_at: endTime.toISOString()
    })

    setState({
      isRunning: false,
      projectId: null,
      projectName: null,
      startTime: null,
      elapsed: 0
    })
    localStorage.removeItem(STORAGE_KEY)
  }, [state])

  return (
    <TimerContext.Provider value={{ ...state, start, stop }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider')
  }
  return context
}
```

**Step 2: Commit**

```bash
git add src/renderer/context/TimerContext.tsx
git commit -m "feat: add Timer context with localStorage persistence"
```

---

### Task 34: Update StatusBar with timer functionality

**Files:**
- Modify: `src/renderer/components/StatusBar.tsx`

**Step 1: Update StatusBar**

```typescript
import { useTimer } from '../context/TimerContext'
import { useProjects } from '../hooks/useProjects'

export default function StatusBar() {
  const { isRunning, projectName, elapsed, start, stop } = useTimer()
  const { projects } = useProjects()

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const activeProjects = projects.filter(p => !p.archived)

  return (
    <div className="h-10 bg-gray-800 text-white text-sm flex items-center px-4 justify-between">
      <div className="flex items-center gap-3">
        {isRunning ? (
          <>
            <span className="text-green-400">⏱</span>
            <span className="font-medium">{projectName}</span>
            <span className="font-mono">{formatElapsed(elapsed)}</span>
            <button
              onClick={stop}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-xs"
            >
              ⏹ Stop
            </button>
          </>
        ) : (
          <>
            <span className="text-gray-400">⏱</span>
            <select
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 border-none"
              value=""
              onChange={e => {
                const project = activeProjects.find(p => p.id === Number(e.target.value))
                if (project) start(project)
              }}
            >
              <option value="">Seleziona progetto...</option>
              {activeProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </>
        )}
      </div>
      <div className="text-gray-400 text-xs">
        Time Prism v0.1.0
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/StatusBar.tsx
git commit -m "feat: add timer controls to StatusBar"
```

---

### Task 35: Wrap app with TimerProvider

**Files:**
- Modify: `src/renderer/main.tsx`

**Step 1: Update main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { TimerProvider } from './context/TimerContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <TimerProvider>
        <App />
      </TimerProvider>
    </HashRouter>
  </React.StrictMode>
)
```

**Step 2: Commit**

```bash
git add src/renderer/main.tsx
git commit -m "feat: wrap app with TimerProvider"
```

---

## Phase 9: Final Setup

### Task 36: Create .gitignore

**Files:**
- Create: `.gitignore`

**Step 1: Create .gitignore**

```
node_modules/
dist/
release/
*.log
.DS_Store
Thumbs.db
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

### Task 37: Test the application

**Step 1: Run build**

```bash
npm run build
```

Expected: Build completes without errors

**Step 2: Run dev**

```bash
npm run dev
```

Expected: App opens in development mode

**Step 3: Manual testing checklist**

- [ ] App window opens
- [ ] Sidebar navigation works
- [ ] Can create/edit/delete clients
- [ ] Can create/edit/delete projects
- [ ] Timeline displays correctly
- [ ] Can draw sessions on timeline
- [ ] Timer start/stop works
- [ ] Reports show correct data

**Step 4: Commit any fixes needed**

---

### Task 38: Final commit

**Step 1: Ensure all files are committed**

```bash
git status
git add .
git commit -m "feat: complete Time Prism v0.1.0"
```

---

## Summary

This plan implements Time Prism with:

1. **Phase 1-2**: Project setup with Electron, React, TypeScript, Vite, Tailwind, SQLite
2. **Phase 3**: React app structure with routing and layout
3. **Phase 4-5**: CRUD pages for Clients and Projects
4. **Phase 6**: DAW-style Timeline component with drag-to-create sessions
5. **Phase 7**: Reports page with project and date summaries
6. **Phase 8**: Timer with start/stop and localStorage persistence
7. **Phase 9**: Final setup and testing

Total: 38 tasks across 9 phases
