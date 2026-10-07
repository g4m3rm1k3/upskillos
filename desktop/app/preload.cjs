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
  runProject:              (runtime, spec) => ipcRenderer.invoke('desktop:run-project', runtime, spec),
  stopRun:                 (runId) => ipcRenderer.invoke('desktop:stop-run', runId),
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

  // Project filesystem — real files in a folder the user picked, used by
  // the Project Studio lab. See desktop/app/project-fs.cjs.
  project: {
    pick:   (scope) => ipcRenderer.invoke('project:pick', scope),
    get:    (scope) => ipcRenderer.invoke('project:get', scope),
    tree:   (scope) => ipcRenderer.invoke('project:tree', scope),
    read:   (relPath, scope) => ipcRenderer.invoke('project:read', relPath, scope),
    write:  (relPath, content, scope) => ipcRenderer.invoke('project:write', relPath, content, scope),
    create: (relPath, scope) => ipcRenderer.invoke('project:create', relPath, scope),
    mkdir:  (relPath, scope) => ipcRenderer.invoke('project:mkdir', relPath, scope),
    remove: (relPath, scope) => ipcRenderer.invoke('project:delete', relPath, scope),
    rename: (fromRel, toRel, scope) => ipcRenderer.invoke('project:rename', fromRel, toRel, scope),
    run:    (runtime, relPath, scope) => ipcRenderer.invoke('project:run', runtime, relPath, scope),
    check:  (checks, scope) => ipcRenderer.invoke('project:check', checks, scope),
  },

  // The notebooks' Python kernel on the learner's own Python, keeping variables between
  // cells. See desktop/app/runtimes/notebook-kernel.cjs.
  kernel: {
    status:          () => ipcRenderer.invoke('kernel:status'),
    run:             (code) => ipcRenderer.invoke('kernel:run', code),
    restart:         () => ipcRenderer.invoke('kernel:restart'),
    chooseFolder:    () => ipcRenderer.invoke('kernel:choose-folder'),
    choosePython:    () => ipcRenderer.invoke('kernel:choose-python'),
    useSystemPython: () => ipcRenderer.invoke('kernel:use-system-python'),
    // Creates the app's notebook environment (numpy … TensorFlow); progress arrives through
    // onOutput as { type: 'setup', text }.
    setupEnvironment: () => ipcRenderer.invoke('kernel:setup-environment'),
    onOutput: (cb) => {
      const handler = (_event, payload) => cb(payload)
      ipcRenderer.on('kernel:output', handler)
      return () => ipcRenderer.off('kernel:output', handler)
    },
  },

  // A real shell in the project folder. See desktop/app/terminal.cjs.
  terminal: {
    start:  (opts)               => ipcRenderer.invoke('terminal:start', opts),
    write:  (id, data)           => ipcRenderer.send('terminal:write', id, data),
    resize: (id, cols, rows)     => ipcRenderer.send('terminal:resize', id, cols, rows),
    kill:   (id)                 => ipcRenderer.send('terminal:kill', id),
    onData: (cb) => {
      const handler = (_event, payload) => cb(payload)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.off('terminal:data', handler)
    },
    onExit: (cb) => {
      const handler = (_event, payload) => cb(payload)
      ipcRenderer.on('terminal:exit', handler)
      return () => ipcRenderer.off('terminal:exit', handler)
    },
  },
})
