const path = require('node:path')
const { app, BrowserWindow, ipcMain } = require('electron')

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    title: 'MiniDesk',
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'index.html'))
}

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  platform: process.platform,
  packaged: app.isPackaged,
}))

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
