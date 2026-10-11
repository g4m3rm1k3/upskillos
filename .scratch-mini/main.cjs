const path = require('node:path')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const projectFs = require('./lib/project-fs.cjs')
const terminal = require('./lib/terminal.cjs')

// Tests give the app its own data folder and project so they never touch yours.
if (process.env.MINIDESK_USER_DATA) app.setPath('userData', process.env.MINIDESK_USER_DATA)

let win = null
let projectRoot = process.env.MINIDESK_PROJECT || null

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 760,
    title: 'MiniDesk',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'index.html'))
}

function needRoot() {
  if (!projectRoot) throw new Error('No project folder is open')
  return projectRoot
}

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  packaged: app.isPackaged,
  userData: app.getPath('userData'),
  project: projectRoot,
}))

ipcMain.handle('project:open', async () => {
  if (!projectRoot) {
    const picked = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    if (picked.canceled) return null
    projectRoot = picked.filePaths[0]
  }
  return projectRoot
})
ipcMain.handle('project:list', (_e, rel) => projectFs.list(needRoot(), rel))
ipcMain.handle('project:read', (_e, rel) => projectFs.read(needRoot(), rel))
ipcMain.handle('project:write', (_e, rel, text) => projectFs.write(needRoot(), rel, text))

ipcMain.handle('terminal:start', (event) => {
  const sender = event.sender
  return terminal.start({ cwd: needRoot() }, (channel, payload) => {
    if (!sender.isDestroyed()) sender.send(channel, payload)
  })
})
ipcMain.on('terminal:write', (_e, id, data) => terminal.write(id, data))
ipcMain.on('terminal:resize', (_e, id, cols, rows) => terminal.resize(id, cols, rows))

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  terminal.killAll()
  app.quit()
})
