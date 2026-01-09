import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { startBackupScheduler, stopBackupScheduler } from './backup-scheduler'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  })

  if (process.env.NODE_ENV === 'development') {
    // Disable cache in development
    mainWindow.webContents.session.clearCache()
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

  // Start backup scheduler (handles missed backups automatically)
  startBackupScheduler()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopBackupScheduler()
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
