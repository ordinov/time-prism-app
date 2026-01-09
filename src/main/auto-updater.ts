import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { app } from 'electron'

let mainWindow: BrowserWindow | null = null

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates on startup (after a delay)
  setTimeout(() => {
    if (process.env.NODE_ENV !== 'development') {
      autoUpdater.checkForUpdates().catch(err => {
        console.log('Update check failed:', err.message)
      })
    }
  }, 5000)

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking-for-update')
  })

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('update-not-available', info)
  })

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('update-error', err.message)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('update-downloaded', info)
  })
}

export function registerAutoUpdaterIpc(): void {
  ipcMain.handle('updater:check', async () => {
    if (process.env.NODE_ENV === 'development') {
      return { updateAvailable: false, message: 'Updates disabled in development' }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { updateAvailable: result?.updateInfo != null, info: result?.updateInfo }
    } catch (error) {
      return { updateAvailable: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })
}

function sendStatusToWindow(status: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { status, data })
  }
}
