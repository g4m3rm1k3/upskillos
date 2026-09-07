const { promises: fs, createWriteStream } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { exec, spawn } = require('node:child_process')
const { promisify } = require('node:util')

// Plain CommonJS on purpose. Electron's main-process 'electron' binding is
// not a real CJS file on disk, and Node's ESM loader crashes trying to
// statically pre-parse its exports for a static `import ... from 'electron'`
// (and a dynamic `require('electron')` via createRequire() from an ESM file
// resolves to the npm package's path-string stub instead of the real API,
// giving `app === undefined`). Plain CJS `require('electron')` is the one
// path Electron reliably intercepts with the real API — this is why this
// file and preload.cjs are .cjs, not .mjs.
const { app, BrowserWindow, dialog, ipcMain, shell, protocol, net } = require('electron')
const pythonRuntime = require('./runtimes/python.cjs')
const cppRuntime = require('./runtimes/cpp.cjs')
const lispRuntime = require('./runtimes/lisp.cjs')
const javaRuntime = require('./runtimes/java.cjs')
const dotnetRuntime = require('./runtimes/dotnet.cjs')

// Keyed dispatch table for the generic runtime IPC handlers below — adding
// a new language means adding one more entry here, not more branches.
// 'python' keeps its own dedicated runPythonScript/desktop:run-python-script
// path (unchanged, already shipped) since PySide6 needs a long-lived
// detached GUI process rather than a run-to-completion one; it's included
// here too so desktop:runtime-status/desktop:install-runtime work uniformly
// across all five.
const RUNTIMES = { python: pythonRuntime, cpp: cppRuntime, lisp: lispRuntime, java: javaRuntime, dotnet: dotnetRuntime }

const execAsync = promisify(exec)

let backendProc = null

const isDev = !app.isPackaged
const updateManifestUrl = process.env.OPEN_CALC_UPDATE_MANIFEST_URL ?? ''

// Register custom scheme before app is ready — required by Electron
protocol.registerSchemesAsPrivileged([
  { scheme: 'opencalc', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } },
])

// Give the V8 heap room to breathe without letting it consume all RAM.
// WebLLM and Pyodide are both memory-heavy; 4 GB is a safe ceiling on
// most modern machines while still leaving headroom for the OS.
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096')

// Some integrated GPUs fail on certain D3D/Vulkan paths. Letting Electron
// pick the best available renderer avoids hard GPU crashes on low-end PCs.
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')

let mainWindow = null

app.whenReady().then(async () => {
  // Serve the built dist/ through a custom scheme so file:// security
  // restrictions never apply, regardless of where the portable exe extracts.
  protocol.handle('opencalc', (request) => {
    const url = new URL(request.url)
    // Strip leading slash so path.join works correctly on Windows
    const relative = url.pathname.replace(/^\//, '')
    const filePath = path.join(resolveDistDir(), relative || 'index.html')
    return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`)
  })

  // Auto-start backend so /api/dev-fs is available in packaged builds.
  // In dev mode the Vite plugin handles these routes — skip spawning.
  if (!isDev) spawnBackend()

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  backendProc?.kill()
  for (const mod of Object.values(RUNTIMES)) mod.killAllScripts?.()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('desktop:get-runtime-info', async () => ({
  isDesktop: true,
  isPackaged: app.isPackaged,
  version: app.getVersion(),
  updateManifestUrl,
}))

ipcMain.handle('desktop:check-for-updates', async () => {
  if (!updateManifestUrl) return { ok: false, reason: 'No update manifest URL configured' }
  try {
    const response = await fetch(updateManifestUrl)
    if (!response.ok) return { ok: false, reason: `Manifest request failed: ${response.status}` }
    const manifest = await response.json()
    const currentVersion = app.getVersion()
    return { ok: true, currentVersion, manifest, updateAvailable: isVersionNewer(manifest.version, currentVersion) }
  } catch (e) {
    return { ok: false, reason: String(e) }
  }
})

ipcMain.handle('desktop:download-portable-update', async (_event, assetUrl) => {
  if (!assetUrl) return { ok: false, reason: 'Missing asset URL' }
  try {
    const response = await fetch(assetUrl)
    if (!response.ok) return { ok: false, reason: `Download failed: ${response.status}` }
    const buffer = Buffer.from(await response.arrayBuffer())
    const downloadsDir = path.join(os.homedir(), 'Downloads')
    await fs.mkdir(downloadsDir, { recursive: true })
    const filename = path.basename(new URL(assetUrl).pathname)
    const outputPath = path.join(downloadsDir, filename)
    await fs.writeFile(outputPath, buffer)
    await shell.showItemInFolder(outputPath)
    return { ok: true, outputPath }
  } catch (e) {
    return { ok: false, reason: String(e) }
  }
})

ipcMain.handle('desktop:open-external', async (_event, url) => {
  if (!url) return { ok: false }
  await shell.openExternal(url)
  return { ok: true }
})

// ── Contributor mode ────────────────────────────────────────────────────────

const GITHUB_ZIP_URL = 'https://codeload.github.com/g4m3rm1k3/upskillos/zip/refs/heads/main'
const EXTRACTED_FOLDER = 'upskillos-main'

function contribConfigPath() {
  return path.join(app.getPath('userData'), 'contrib-config.json')
}

async function loadContribConfig() {
  try {
    return JSON.parse(await fs.readFile(contribConfigPath(), 'utf8'))
  } catch {
    return {}
  }
}

async function saveContribConfig(data) {
  await fs.writeFile(contribConfigPath(), JSON.stringify(data, null, 2), 'utf8')
}

ipcMain.handle('desktop:contributor-status', async () => {
  const cfg = await loadContribConfig()
  const repoPath = cfg.repoPath ?? null
  let cloned = false
  if (repoPath) {
    try { await fs.access(path.join(repoPath, 'src')); cloned = true } catch {}
  }
  return { cloned, repoPath }
})

ipcMain.handle('desktop:clone-repo', async () => {
  const userData = app.getPath('userData')
  const zipPath  = path.join(userData, 'repo-download.zip')
  const extractDir = path.join(userData, 'repo-extract')
  const repoDir  = path.join(userData, 'repo')
  const emit = (payload) => mainWindow?.webContents.send('desktop:clone-progress', payload)

  try {
    emit({ phase: 'downloading', percent: 0 })
    const response = await fetch(GITHUB_ZIP_URL)
    if (!response.ok) throw new Error(`Download failed: ${response.status}`)

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    const chunks = []
    let received = 0
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(Buffer.from(value))
      received += value.length
      if (contentLength > 0) {
        emit({ phase: 'downloading', percent: Math.round((received / contentLength) * 80) })
      }
    }

    await fs.writeFile(zipPath, Buffer.concat(chunks))
    emit({ phase: 'extracting', percent: 85 })

    await fs.rm(extractDir, { recursive: true, force: true })
    await fs.mkdir(extractDir, { recursive: true })

    if (process.platform === 'win32') {
      await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`)
    } else {
      await execAsync(`unzip -o "${zipPath}" -d "${extractDir}"`)
    }

    emit({ phase: 'extracting', percent: 95 })
    await fs.rm(repoDir, { recursive: true, force: true })
    await fs.rename(path.join(extractDir, EXTRACTED_FOLDER), repoDir)
    await fs.rm(extractDir, { recursive: true, force: true })
    await fs.rm(zipPath, { force: true })

    const cfg = await loadContribConfig()
    await saveContribConfig({ ...cfg, repoPath: repoDir, clonedAt: new Date().toISOString() })

    if (!isDev) restartBackend()

    emit({ phase: 'done', percent: 100 })
    return { ok: true, repoPath: repoDir }
  } catch (e) {
    emit({ phase: 'error', error: String(e) })
    return { ok: false, reason: String(e) }
  }
})

ipcMain.handle('desktop:set-github-token', async (_event, token) => {
  const cfg = await loadContribConfig()
  await saveContribConfig({ ...cfg, githubToken: token })
  return { ok: true }
})

ipcMain.handle('desktop:get-github-token', async () => {
  const cfg = await loadContribConfig()
  return { token: cfg.githubToken ?? '' }
})

// ── End contributor mode ────────────────────────────────────────────────────

// ── Desktop-only language runtimes (Python + PySide6) ───────────────────────
// See runtimes/python.cjs for the full rationale — this is a private,
// sandboxed interpreter under userData, autonomously downloaded and
// installed on request, needed because PySide6 draws a real native OS
// window that neither a browser tab nor Pyodide's WASM sandbox can do.

ipcMain.handle('desktop:runtime-status', async (_event, runtime) => {
  const mod = RUNTIMES[runtime]
  if (!mod) return { ok: false, reason: `Unknown runtime: ${runtime}` }
  return { ok: true, status: await mod.getStatus(app) }
})

ipcMain.handle('desktop:install-runtime', async (_event, runtime) => {
  const mod = RUNTIMES[runtime]
  if (!mod) return { ok: false, reason: `Unknown runtime: ${runtime}` }
  const emit = (payload) => mainWindow?.webContents.send('desktop:runtime-progress', { runtime, ...payload })
  return mod.install(app, emit)
})

ipcMain.handle('desktop:run-python-script', async (_event, code) => {
  const emit = (payload) => mainWindow?.webContents.send('desktop:script-output', payload)
  return pythonRuntime.runScript(app, code, emit)
})

// Generic run path for the compile-and-run-to-completion languages
// (C/C++, Common Lisp, Java, .NET) — python keeps its own dedicated
// runPythonScript handler above since PySide6 needs a detached, long-lived
// GUI process rather than a run-to-completion one.
ipcMain.handle('desktop:run-code', async (_event, runtime, code) => {
  const mod = RUNTIMES[runtime]
  if (!mod || !mod.runCode) return { ok: false, reason: `No runnable runtime: ${runtime}` }
  const emit = (payload) => mainWindow?.webContents.send('desktop:script-output', payload)
  return mod.runCode(app, code, emit)
})

// ── End desktop-only language runtimes ──────────────────────────────────────

async function spawnBackend() {
  const backendScript = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'server.mjs')
    : path.join(__dirname, '..', '..', 'backend', 'server.mjs')

  try {
    await fs.access(backendScript)
  } catch {
    return // backend not bundled — skip (dev-fs won't be available in packaged build)
  }

  const cfg = await loadContribConfig()
  const env = { ...process.env }
  if (cfg.repoPath) env.OPEN_CALC_RUNTIME_ROOT = cfg.repoPath
  if (cfg.githubToken) env.GITHUB_TOKEN = cfg.githubToken

  backendProc = spawn(process.execPath, [backendScript], {
    env,
    stdio: 'ignore',
    detached: false,
  })

  backendProc.on('error', () => {}) // silently absorb spawn errors
}

function restartBackend() {
  backendProc?.kill()
  backendProc = null
  spawnBackend()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: '#07111e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Allow WebAssembly (needed by Pyodide) and WebGL (Three.js / D3)
      webSecurity: true,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // If the renderer process crashes (OOM, GPU fault, etc.) show a recovery
  // dialog rather than silently leaving the user with a blank window.
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'error',
      title: 'OpenCalc stopped responding',
      message: 'The app ran into a problem and needs to restart.',
      detail: `Reason: ${details.reason}\n\nTip: if this keeps happening, try closing other apps to free up memory — the AI Tutor and Python sandbox are memory-intensive features.`,
      buttons: ['Restart', 'Quit'],
      defaultId: 0,
    })
    if (choice === 0) {
      app.relaunch()
    }
    app.quit()
  })

  // Catch a frozen (but not yet crashed) renderer and offer to restart.
  mainWindow.on('unresponsive', () => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      title: 'OpenCalc is not responding',
      message: 'The app is not responding. This can happen when loading large AI models or running heavy Python computations.',
      buttons: ['Wait', 'Restart'],
      defaultId: 0,
    })
    if (choice === 1) {
      app.relaunch()
      app.quit()
    }
  })

  if (isDev) {
    const devPort = process.env.VITE_PORT ?? 5173
    mainWindow.loadURL(`http://localhost:${devPort}`)
  } else {
    mainWindow.loadURL('opencalc://app/index.html')
  }
}

function resolveDistDir() {
  if (isDev) return path.resolve(__dirname, '..', '..', 'dist')
  return path.join(process.resourcesPath, 'dist')
}

function isVersionNewer(candidate, current) {
  const a = String(candidate || '').split('.').map(Number)
  const b = String(current || '').split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true
    if ((a[i] || 0) < (b[i] || 0)) return false
  }
  return false
}
