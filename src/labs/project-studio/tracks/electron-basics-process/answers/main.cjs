const path = require('node:path')
const { app, BrowserWindow } = require('electron')

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    title: 'MiniDesk',
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
