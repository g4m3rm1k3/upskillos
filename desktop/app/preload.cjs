// Plain CommonJS on purpose — see main.cjs's top comment for why.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openCalcDesktop', {
  getRuntimeInfo:          () => ipcRenderer.invoke('desktop:get-runtime-info'),
  checkForUpdates:         () => ipcRenderer.invoke('desktop:check-for-updates'),
  downloadPortableUpdate:  (assetUrl) => ipcRenderer.invoke('desktop:download-portable-update', assetUrl),
  openExternal:            (url) => ipcRenderer.invoke('desktop:open-external', url),

  // Contributor mode
  getContributorStatus:    () => ipcRenderer.invoke('desktop:contributor-status'),
  cloneRepo:               () => ipcRenderer.invoke('desktop:clone-repo'),
  setGitHubToken:          (token) => ipcRenderer.invoke('desktop:set-github-token', token),
  getGitHubToken:          () => ipcRenderer.invoke('desktop:get-github-token'),
  onCloneProgress:         (cb) => {
    const handler = (_event, data) => cb(data)
    ipcRenderer.on('desktop:clone-progress', handler)
    return () => ipcRenderer.off('desktop:clone-progress', handler)
  },

  // Desktop-only language runtimes (Python + PySide6) — see
  // desktop/app/runtimes/python.cjs for why this can't run in a browser tab.
  getRuntimeStatus:        (runtime) => ipcRenderer.invoke('desktop:runtime-status', runtime),
  installRuntime:          (runtime) => ipcRenderer.invoke('desktop:install-runtime', runtime),
  runPythonScript:         (code) => ipcRenderer.invoke('desktop:run-python-script', code),
  runCode:                 (runtime, code) => ipcRenderer.invoke('desktop:run-code', runtime, code),
  onRuntimeProgress:       (cb) => {
    const handler = (_event, data) => cb(data)
    ipcRenderer.on('desktop:runtime-progress', handler)
    return () => ipcRenderer.off('desktop:runtime-progress', handler)
  },
  onScriptOutput:          (cb) => {
    const handler = (_event, data) => cb(data)
    ipcRenderer.on('desktop:script-output', handler)
    return () => ipcRenderer.off('desktop:script-output', handler)
  },
})
