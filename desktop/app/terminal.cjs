// terminal.cjs
// A real terminal (PowerShell on Windows, the login shell on macOS/Linux) running in the
// project folder, for Project Studio. It is the learner's actual shell through a pseudo-
// terminal (node-pty), not a simulation, so what they learn here works unchanged in VS
// Code's terminal or Windows Terminal afterwards.
//
// node-pty is a native module. Version 1.1.0 ships prebuilt N-API binaries for Windows and
// macOS, which load in this Electron without compiling (measured 2026-10-02 on Electron
// 35.7.5). It is required lazily so a missing or broken binary only disables the terminal,
// not the whole app.
//
// On macOS, node-pty starts each shell through a small program of its own, spawn-helper. npm
// often installs it without permission to run, and every shell then fails with "posix_spawnp
// failed" (seen 2026-10-09). So the permission is set before the first shell starts.
const { execFile } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

let pty = null
let loadError = null
function loadPty() {
  if (pty || loadError) return pty
  try {
    pty = require('node-pty')
    if (process.platform === 'darwin') makeSpawnHelperRunnable()
  } catch (e) {
    loadError = e
  }
  return pty
}

function makeSpawnHelperRunnable() {
  const prebuilds = path.join(path.dirname(require.resolve('node-pty/package.json')), 'prebuilds')
  for (const arch of ['darwin-arm64', 'darwin-x64']) {
    const helper = path.join(prebuilds, arch, 'spawn-helper').replace('app.asar', 'app.asar.unpacked')
    try { fs.chmodSync(helper, 0o755) } catch {}
  }
}

const terminals = new Map()

// The PATH a newly opened terminal would get. The app's own environment is frozen at launch,
// so a tool installed while the app is running (Node, in the first lesson) would be "not
// recognized" in a terminal started from it. A new Windows Terminal reads PATH from the
// registry instead; this does the same. On macOS and Linux a login shell rebuilds PATH from
// the profile files itself.
function freshWindowsPath() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command',
        "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"],
      { windowsHide: true, timeout: 10000 },
      (err, stdout) => resolve(err ? null : stdout.trim()),
    )
  })
}

// `extraPath`: folders appended after the learner's own PATH, such as the app-managed C++
// toolchain. Appended, not prepended, so a tool the learner installed themselves still wins.
async function shellEnv({ extraPath = [] } = {}) {
  const env = { ...process.env }
  // Set inside VS Code's terminals; it would make any Electron-based tool the learner runs
  // behave as plain Node.
  delete env.ELECTRON_RUN_AS_NODE
  if (process.platform === 'win32') {
    const fresh = await freshWindowsPath()
    if (fresh) {
      // Windows environment variable names are case-insensitive, but a copied object keeps
      // whichever spelling the parent used ('Path' usually); replace them all.
      for (const k of Object.keys(env)) if (k.toLowerCase() === 'path') delete env[k]
      env.Path = fresh
    }
  }
  const extra = extraPath.filter(Boolean)
  if (extra.length) {
    const key = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'PATH'
    env[key] = [env[key], ...extra].filter(Boolean).join(path.delimiter)
  }
  env.TERM = env.TERM || 'xterm-256color'
  env.COLORTERM = 'truecolor'
  return env
}

function shellCommand() {
  if (process.platform === 'win32') return { file: 'powershell.exe', args: ['-NoLogo'] }
  return { file: process.env.SHELL || '/bin/zsh', args: ['-l'] }
}

// `owner` identifies the window the terminal belongs to, so its terminals can be closed when
// that window reloads (a reload doesn't run the page's cleanup code).
const owners = new Map()

function killOwner(owner) {
  for (const [id, o] of owners) if (o === owner) kill(id)
}

async function start({ cwd, cols, rows, owner, extraPath }, send) {
  const lib = loadPty()
  if (!lib) return { ok: false, reason: `The terminal couldn't start: ${loadError?.message ?? 'node-pty is missing'}` }
  if (!cwd) return { ok: false, reason: 'No project folder is open' }
  const { file, args } = shellCommand()
  try {
    const proc = lib.spawn(file, args, {
      name: 'xterm-256color',
      cols: Math.max(20, cols | 0 || 80),
      rows: Math.max(5, rows | 0 || 24),
      cwd,
      env: await shellEnv({ extraPath }),
    })
    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    terminals.set(id, proc)
    if (owner != null) owners.set(id, owner)
    proc.onData((data) => send('terminal:data', { id, data }))
    proc.onExit(({ exitCode }) => {
      terminals.delete(id)
      owners.delete(id)
      send('terminal:exit', { id, code: exitCode })
    })
    return { ok: true, id, shell: file }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

function write(id, data) {
  terminals.get(id)?.write(data)
}

function resize(id, cols, rows) {
  const t = terminals.get(id)
  if (!t) return
  try { t.resize(Math.max(20, cols | 0), Math.max(5, rows | 0)) } catch {}
}

function kill(id) {
  const t = terminals.get(id)
  if (!t) return
  terminals.delete(id)
  owners.delete(id)
  try { t.kill() } catch {}
}

function killAll() {
  for (const id of [...terminals.keys()]) kill(id)
}

module.exports = { start, write, resize, kill, killAll, killOwner, shellEnv }
