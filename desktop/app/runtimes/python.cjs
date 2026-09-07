// runtimes/python.cjs
// Provisions a private, sandboxed Python + PySide6 + pygame environment
// for the desktop app — no admin rights, no touching any Python the user
// already has installed. Lives entirely under Electron's userData
// directory, exactly like the existing contributor-mode repo clone in
// main.cjs.
//
// Why "private": PySide6 needs a REAL Python interpreter that can open a
// REAL native OS window — that's impossible in a browser tab or in Pyodide
// (WASM has no OS windowing access at all). The desktop app is the only
// place this can work, and it has to be a python.exe we fully control so
// "click Install" can be genuinely autonomous rather than "please go
// install Python yourself first." pygame rides along in the same
// environment — the pyside6 course's Chapter 2 (an embedded-viewport,
// Godot-style editor) renders pygame into a PySide6 widget, so both
// packages are always installed together as one environment, not tracked
// as separate per-lesson dependencies.
//
// Windows-only for now (the official embeddable zip is a Windows-specific
// artifact with no admin-install step). macOS/Linux would need a different
// mechanism (system python3 + venv) — not attempted here.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { spawn, execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { pathExists, downloadFile, extractZip, errorDetail } = require('./_shared.cjs')

const execFileAsync = promisify(execFile)

// Pinned, known-good embeddable Python build. Bump deliberately, not
// automatically — an embeddable zip's internal layout (the exact `._pth`
// filename) is version-specific, so this isn't a "just grab latest" URL.
const PYTHON_VERSION = '3.12.7'
const PYTHON_ZIP_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`
const GET_PIP_URL = 'https://bootstrap.pypa.io/get-pip.py'

function runtimeDir(app) {
  return path.join(app.getPath('userData'), 'runtimes', 'python')
}

function scratchDir(app) {
  return path.join(runtimeDir(app), 'scratch')
}

function pythonExePath(app) {
  return path.join(runtimeDir(app), 'python.exe')
}

async function getStatus(app) {
  const pythonExe = pythonExePath(app)
  const pythonInstalled = await pathExists(pythonExe)
  if (!pythonInstalled) return { pythonInstalled: false, pysideInstalled: false, pygameInstalled: false }

  try {
    await execFileAsync(pythonExe, ['-c', 'import PySide6, pygame'], { timeout: 10000, windowsHide: true })
    return { pythonInstalled: true, pysideInstalled: true, pygameInstalled: true }
  } catch {
    // Don't distinguish which of the two is missing here — install() always
    // installs both together, so "not both present" just means "needs
    // (re)install," same single Install button either way.
    return { pythonInstalled: true, pysideInstalled: false, pygameInstalled: false }
  }
}

// Embeddable Python ships with a `import site` line commented out in its
// `._pth` file. Without uncommenting it, `site-packages` (and therefore
// pip and every installed package) is silently invisible to the
// interpreter — this is a well-documented, easy-to-miss embeddable-Python
// gotcha, not an edge case.
async function enableSitePackages(dir) {
  const entries = await fs.readdir(dir)
  const pthFile = entries.find((f) => /^python\d+\._pth$/.test(f))
  if (!pthFile) throw new Error('Could not find the embeddable Python ._pth file to patch')
  const pthPath = path.join(dir, pthFile)
  const text = await fs.readFile(pthPath, 'utf8')
  const patched = text.replace(/^#\s*import site/m, 'import site')
  await fs.writeFile(pthPath, patched, 'utf8')
}

async function install(app, onProgress) {
  const emit = (payload) => onProgress?.(payload)
  const dir = runtimeDir(app)

  try {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir, { recursive: true })
    await fs.mkdir(scratchDir(app), { recursive: true })

    emit({ phase: 'downloading-python', percent: 0 })
    const zipPath = path.join(dir, 'python-embed.zip')
    await downloadFile(PYTHON_ZIP_URL, zipPath, (p) => emit({ phase: 'downloading-python', percent: Math.round(p * 0.3) }))

    emit({ phase: 'extracting-python', percent: 30 })
    await extractZip(zipPath, dir)
    await fs.rm(zipPath, { force: true })

    emit({ phase: 'configuring-python', percent: 40 })
    await enableSitePackages(dir)

    emit({ phase: 'bootstrapping-pip', percent: 45 })
    const getPipPath = path.join(dir, 'get-pip.py')
    await downloadFile(GET_PIP_URL, getPipPath, (p) => emit({ phase: 'bootstrapping-pip', percent: 45 + Math.round(p * 0.1) }))
    await execFileAsync(pythonExePath(app), [getPipPath, '--no-warn-script-location'], {
      cwd: dir, windowsHide: true, timeout: 120000, maxBuffer: 20 * 1024 * 1024,
    })
    await fs.rm(getPipPath, { force: true })

    // Installed together, one pip call: every lesson in the pyside6 course
    // shares this one private environment, and the Godot-like-editor
    // project (Chapter 2) needs pygame for the embedded viewport alongside
    // PySide6 for the surrounding window/panels — simpler to guarantee
    // both are always present than to track per-lesson dependency flags.
    emit({ phase: 'installing-pyside6', percent: 55 })
    await execFileAsync(pythonExePath(app), ['-m', 'pip', 'install', 'PySide6', 'pygame', '--no-warn-script-location'], {
      cwd: dir, windowsHide: true, timeout: 900000, maxBuffer: 20 * 1024 * 1024,
    })

    emit({ phase: 'done', percent: 100 })
    return { ok: true }
  } catch (e) {
    const detail = errorDetail(e)
    emit({ phase: 'error', error: detail })
    return { ok: false, reason: detail }
  }
}

// Tracks in-flight script runs so they can be killed on app quit rather
// than orphaned as background processes once Electron closes.
const runningScripts = new Map()

async function runScript(app, code, onOutput) {
  try {
    await fs.mkdir(scratchDir(app), { recursive: true })
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const scriptPath = path.join(scratchDir(app), `${runId}.py`)
    await fs.writeFile(scriptPath, code, 'utf8')

    const child = spawn(pythonExePath(app), [scriptPath], {
      cwd: scratchDir(app),
      windowsHide: false, // the whole point is a real, visible native window
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    runningScripts.set(runId, child)

    child.stdout.on('data', (chunk) => onOutput?.({ runId, stream: 'stdout', text: chunk.toString() }))
    child.stderr.on('data', (chunk) => onOutput?.({ runId, stream: 'stderr', text: chunk.toString() }))
    child.on('close', (code) => {
      runningScripts.delete(runId)
      onOutput?.({ runId, stream: 'exit', code })
      fs.rm(scriptPath, { force: true }).catch(() => {})
    })
    child.on('error', (err) => {
      runningScripts.delete(runId)
      onOutput?.({ runId, stream: 'stderr', text: `Failed to launch Python: ${err.message}` })
    })

    return { ok: true, runId }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

function killAllScripts() {
  for (const child of runningScripts.values()) {
    try { child.kill() } catch {}
  }
  runningScripts.clear()
}

module.exports = { getStatus, install, runScript, killAllScripts }
