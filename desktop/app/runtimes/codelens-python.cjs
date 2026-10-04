// runtimes/codelens-python.cjs
// CodeLens's own Python environment on the desktop: a virtual environment (.venv) made
// from the learner's Python, kept in the app's data folder, so a traced program can import
// pygame, numpy and the like without touching the learner's own installation.
//
// Before each trace, the program's imports are checked inside the environment. A missing
// package is installed automatically when it is one of KNOWN_PACKAGES below; its progress
// is reported as it happens. Any other missing import is left to fail with Python's own
// ModuleNotFoundError, plus a note pointing to the Packages menu: installing whatever name
// an import happens to have would let a typo (`import requets`) install a look-alike
// package from PyPI. The Packages menu (src/labs/codelens/codelens/PackagesDialog.tsx)
// lists what is installed and installs, upgrades or removes a package by name and version.
//
// One entry point, runCode, with a JSON payload, so it goes through the existing
// desktop:run-code channel:
//   { action: 'trace', script, source }  check imports, install known missing packages, run script
//   { action: 'list' }                    installed packages, as JSON on stdout
//   { action: 'install', requirement }    pip install "name" or "name==1.2.3" (also >=, <=, ~=, !=)
//   { action: 'uninstall', name }
// Output streams as { runId, stream: 'stdout' | 'stderr' | 'progress', text } then 'exit'.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { pathExists } = require('./_shared.cjs')
const { systemPython } = require('./_toolchains.cjs')

// Import name -> the package that provides it on PyPI. Only these are installed without
// asking. pygame is pygame-ce: the same `import pygame`, with wheels for current Pythons.
const KNOWN_PACKAGES = {
  pygame: 'pygame-ce',
  numpy: 'numpy',
  pandas: 'pandas',
  matplotlib: 'matplotlib',
  scipy: 'scipy',
  sympy: 'sympy',
  sklearn: 'scikit-learn',
  skimage: 'scikit-image',
  statsmodels: 'statsmodels',
  networkx: 'networkx',
  PIL: 'pillow',
  cv2: 'opencv-python',
  yaml: 'pyyaml',
  bs4: 'beautifulsoup4',
  requests: 'requests',
  httpx: 'httpx',
  rich: 'rich',
  click: 'click',
  attrs: 'attrs',
  pydantic: 'pydantic',
  gymnasium: 'gymnasium',
  torch: 'torch',
  seaborn: 'seaborn',
  plotly: 'plotly',
  tqdm: 'tqdm',
  pytest: 'pytest',
  dateutil: 'python-dateutil',
  regex: 'regex',
  shapely: 'shapely',
  numba: 'numba',
  sqlalchemy: 'sqlalchemy',
  flask: 'flask',
  fastapi: 'fastapi',
  jinja2: 'jinja2',
  tabulate: 'tabulate',
  arcade: 'arcade',
  pyglet: 'pyglet',
}

// "name", "name[extra]", "name==1.2.3", "name>=1.2,<2": what the Packages menu may install.
// Nothing else (no URLs, paths or pip options) reaches pip.
const REQUIREMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*(\[[A-Za-z0-9._,-]+\])?(\s*(==|>=|<=|~=|!=|<|>)\s*[A-Za-z0-9.*+!_-]+(\s*,\s*(==|>=|<=|~=|!=|<|>)\s*[A-Za-z0-9.*+!_-]+)*)?$/
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const INSTALL_TIMEOUT_MS = 15 * 60 * 1000   // torch is large
const ENV = { PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1', PIP_DISABLE_PIP_VERSION_CHECK: '1' }

function envDir(app) {
  return path.join(app.getPath('userData'), 'runtimes', 'codelens-python')
}

function venvPython(app) {
  const venv = path.join(envDir(app), '.venv')
  return process.platform === 'win32' ? path.join(venv, 'Scripts', 'python.exe') : path.join(venv, 'bin', 'python')
}

async function getStatus(app) {
  const base = await systemPython()
  const exists = await pathExists(venvPython(app))
  return {
    // CodeLens can trace with it once it exists, or can make it from the learner's Python.
    installed: exists || !!base,
    created: exists,
    base: base ? { exe: base.exe, version: base.version } : null,
    path: exists ? venvPython(app) : null,
  }
}

// Runs a command, streaming its output; resolves with { code, stdout, stderr }.
function run(exe, args, { onLine, timeout = INSTALL_TIMEOUT_MS, track } = {}) {
  return new Promise((resolve) => {
    const child = spawn(exe, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...ENV } })
    track?.(child)
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill(), timeout)
    const lines = (chunk, sink) => {
      const text = chunk.toString()
      sink(text)
      for (const line of text.split(/\r?\n/)) if (line.trim()) onLine?.(line)
    }
    child.stdout.on('data', (chunk) => lines(chunk, (t) => { stdout += t }))
    child.stderr.on('data', (chunk) => lines(chunk, (t) => { stderr += t }))
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }) })
    child.on('error', (error) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: stderr + error.message }) })
  })
}

async function ensureVenv(app, progress, track) {
  const python = venvPython(app)
  if (await pathExists(python)) return python
  const base = await systemPython()
  if (!base) throw new Error('CodeLens needs Python on this computer to make its environment. Install Python 3.12 or newer from python.org.')
  progress(`Making CodeLens's Python environment (${base.version}), once…`)
  await fs.mkdir(envDir(app), { recursive: true })
  const made = await run(base.exe, ['-m', 'venv', path.join(envDir(app), '.venv')], { timeout: 180000, track })
  if (made.code !== 0) throw new Error(`Could not make the environment: ${made.stderr.trim() || made.stdout.trim()}`)
  return python
}

// The program's top-level imports that the environment can't find, as reported by Python
// itself (ast + importlib), so `import a.b`, `from a import b` and the standard library are
// all handled the way Python handles them.
const FIND_MISSING = `
import ast, importlib.util, json, sys
source = sys.stdin.read()
names = set()
try:
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            names.update(alias.name.split('.')[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names.add(node.module.split('.')[0])
except SyntaxError:
    pass
missing = sorted(n for n in names if n not in sys.stdlib_module_names and importlib.util.find_spec(n) is None)
print(json.dumps(missing))
`

function findMissing(python, source) {
  return new Promise((resolve) => {
    const child = spawn(python, ['-c', FIND_MISSING], { windowsHide: true, env: { ...process.env, ...ENV } })
    let out = ''
    child.stdout.on('data', (c) => { out += c })
    child.on('close', () => { try { resolve(JSON.parse(out.trim().split('\n').pop())) } catch { resolve([]) } })
    child.on('error', () => resolve([]))
    child.stdin.end(source)
  })
}

const runningProcs = new Map()

async function runCode(app, payloadText, onOutput) {
  let payload
  try { payload = JSON.parse(payloadText) } catch { return { ok: false, reason: 'Bad request' } }
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const emit = (stream, text) => onOutput?.({ runId, stream, text })
  const progress = (text) => emit('progress', text)
  const track = (child) => runningProcs.set(runId, child)
  const done = (code) => { runningProcs.delete(runId); onOutput?.({ runId, stream: 'exit', code }) }

  ;(async () => {
    try {
      const python = await ensureVenv(app, progress, track)
      const pip = (args) => run(python, ['-m', 'pip', ...args], { onLine: progress, track })

      if (payload.action === 'list') {
        const listed = await run(python, ['-m', 'pip', 'list', '--format=json'], { track })
        emit('stdout', listed.stdout)
        if (listed.code !== 0) emit('stderr', listed.stderr)
        return done(listed.code)
      }
      if (payload.action === 'install') {
        const requirement = String(payload.requirement ?? '').trim()
        if (!REQUIREMENT.test(requirement)) { emit('stderr', `"${requirement}" isn't a package name with an optional version, such as pygame-ce or numpy==2.2.5.`); return done(1) }
        progress(`Installing ${requirement}…`)
        const result = await pip(['install', requirement])
        if (result.code !== 0) emit('stderr', result.stderr.trim().split('\n').slice(-8).join('\n'))
        return done(result.code)
      }
      if (payload.action === 'uninstall') {
        const name = String(payload.name ?? '').trim()
        if (!NAME.test(name)) { emit('stderr', `"${name}" isn't a package name.`); return done(1) }
        progress(`Removing ${name}…`)
        const result = await pip(['uninstall', '-y', name])
        if (result.code !== 0) emit('stderr', result.stderr.trim())
        return done(result.code)
      }
      if (payload.action !== 'trace' || typeof payload.script !== 'string') { emit('stderr', 'Unknown request'); return done(1) }

      // Install the known packages the program imports and the environment lacks.
      const missing = await findMissing(python, String(payload.source ?? ''))
      const installable = missing.filter((name) => KNOWN_PACKAGES[name])
      const unknown = missing.filter((name) => !KNOWN_PACKAGES[name])
      if (installable.length) {
        const packages = installable.map((name) => KNOWN_PACKAGES[name])
        progress(`Installing ${packages.join(', ')} into CodeLens's Python environment…`)
        const result = await pip(['install', ...packages])
        if (result.code !== 0) progress(`Installing ${packages.join(', ')} failed: ${result.stderr.trim().split('\n').pop()}`)
      }
      if (unknown.length) {
        emit('notice', `Not installed automatically: ${unknown.join(', ')}. If it's a package on PyPI, install it from CodeLens's Packages menu (by its PyPI name, which can differ from the import name).`)
      }

      progress('Tracing…')
      await fs.mkdir(path.join(envDir(app), 'scratch'), { recursive: true })
      const scriptPath = path.join(envDir(app), 'scratch', `${runId}.py`)
      await fs.writeFile(scriptPath, payload.script, 'utf8')
      const child = spawn(python, [scriptPath], { cwd: path.dirname(scriptPath), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...ENV } })
      track(child)
      child.stdout.on('data', (chunk) => emit('stdout', chunk.toString()))
      child.stderr.on('data', (chunk) => emit('stderr', chunk.toString()))
      child.on('close', (code) => { fs.rm(scriptPath, { force: true }).catch(() => {}); done(code) })
      child.on('error', (error) => { emit('stderr', `Failed to start Python: ${error.message}`); done(1) })
    } catch (error) {
      emit('stderr', String(error?.message ?? error))
      done(1)
    }
  })()

  return { ok: true, runId }
}

// The environment is made on first use; "install" from the runtime menu makes it now.
async function install(app, onProgress) {
  try {
    await ensureVenv(app, (text) => onProgress?.({ phase: 'creating', message: text }))
    onProgress?.({ phase: 'done', percent: 100 })
    return { ok: true }
  } catch (error) {
    onProgress?.({ phase: 'error', error: String(error?.message ?? error) })
    return { ok: false, reason: String(error?.message ?? error) }
  }
}

function killRun(runId) {
  const child = runningProcs.get(runId)
  if (!child) return false
  child.kill()
  runningProcs.delete(runId)
  return true
}

function killAllScripts() {
  for (const child of runningProcs.values()) child.kill()
  runningProcs.clear()
}

module.exports = { getStatus, install, runCode, killRun, killAllScripts, KNOWN_PACKAGES, REQUIREMENT }
