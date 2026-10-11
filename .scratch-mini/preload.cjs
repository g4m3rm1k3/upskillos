const { contextBridge, ipcRenderer } = require('electron')

// The only door between the page and the computer. Add a line here and the page can do one more thing.
contextBridge.exposeInMainWorld('desk', {
  info: () => ipcRenderer.invoke('app:info'),
  project: {
    open: () => ipcRenderer.invoke('project:open'),
    list: (rel) => ipcRenderer.invoke('project:list', rel),
    read: (rel) => ipcRenderer.invoke('project:read', rel),
    write: (rel, text) => ipcRenderer.invoke('project:write', rel, text),
  },
  terminal: {
    start: () => ipcRenderer.invoke('terminal:start'),
    write: (id, data) => ipcRenderer.send('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', id, cols, rows),
    onData: (cb) => {
      const handler = (_event, payload) => cb(payload)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.off('terminal:data', handler)
    },
  },
})
