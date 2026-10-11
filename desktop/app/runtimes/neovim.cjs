// runtimes/neovim.cjs
// Neovim, the terminal text editor Project Studio offers beside Monaco (Editor: Neovim in the
// editor's tab strip). It runs inside a real terminal (terminal.cjs) over the same project
// files Monaco edits, so the learner can switch editors at any time.
//
// The learner's own Neovim wins when it is new enough; otherwise the app downloads the
// official prebuilt release into userData, with no installer, no admin rights and no Homebrew.
// The download also goes on the PATH of every Project Studio terminal (main.cjs
// learnerToolPaths), so `nvim` typed in a terminal is the same program the editor pane runs.
//
// Each editor session starts with `--listen <address>`. The app then drives that Neovim from
// outside with `nvim --server <address> --remote-expr ...` (clicking a file in the tree opens
// it, Run writes unsaved buffers first) instead of typing keys into the terminal, which would
// go wrong whenever the learner is in Insert mode or halfway through a command.
const { promises: fs } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { pathExists, downloadFile, extractZip, findFile, errorDetail } = require('./_shared.cjs')

const execFileAsync = promisify(execFile)

// Pinned to a tested release for a predictable archive layout. Bump deliberately.
const NVIM_VERSION = 'v0.12.6'
// --remote-expr and the default colour scheme the lessons describe both need 0.10 or later.
const MIN_SYSTEM = [0, 10]

const isWin = process.platform === 'win32'
const exeName = isWin ? 'nvim.exe' : 'nvim'

// The release archive for this computer, or null where Neovim publishes none.
function releaseAsset() {
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x86_64' : null
  if (!arch) return null
  if (process.platform === 'darwin') return `nvim-macos-${arch}.tar.gz`
  if (process.platform === 'linux') return `nvim-linux-${arch}.tar.gz`
  if (isWin) return arch === 'arm64' ? 'nvim-win-arm64.zip' : 'nvim-win64.zip'
  return null
}

function runtimeDir(app) {
  return path.join(app.getPath('userData'), 'runtimes', 'neovim')
}

async function appNvim(app) {
  return findFile(runtimeDir(app), exeName)
}

// "NVIM v0.12.6" → [0, 12, 6]
async function versionOf(exe) {
  try {
    const { stdout } = await execFileAsync(exe, ['--version'], { windowsHide: true, timeout: 10000 })
    const m = stdout.match(/NVIM v(\d+)\.(\d+)\.(\d+)/)
    return m ? { text: m[0].slice(5), parts: m.slice(1).map(Number) } : null
  } catch {
    return null
  }
}

const atLeast = (parts, min) => parts[0] > min[0] || (parts[0] === min[0] && parts[1] >= min[1])

// Where a Neovim the learner installed might be. An app started from the Dock or Finder gets a
// short PATH without Homebrew's folders, so those are searched as well.
function searchDirs() {
  const fromPath = (process.env.PATH || process.env.Path || '').split(path.delimiter)
  const extra = isWin
    ? [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Neovim', 'bin'),
       path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Neovim', 'bin')]
    : ['/opt/homebrew/bin', '/usr/local/bin', '/opt/local/bin', path.join(os.homedir(), '.local', 'bin')]
  return [...new Set([...fromPath, ...extra].filter(Boolean))]
}

let systemCache
async function systemNvim() {
  if (systemCache !== undefined) return systemCache
  systemCache = null
  for (const dir of searchDirs()) {
    const exe = path.join(dir, exeName)
    if (!(await pathExists(exe))) continue
    const version = await versionOf(exe)
    if (version && atLeast(version.parts, MIN_SYSTEM)) { systemCache = { exe, version: version.text }; break }
  }
  return systemCache
}

async function resolveNvim(app) {
  const system = await systemNvim()
  if (system) return { source: 'system', exe: system.exe, version: system.version }
  const exe = await appNvim(app)
  if (exe) return { source: 'app', exe, version: NVIM_VERSION.slice(1) }
  return null
}

// The folder holding the app-managed nvim, for terminal PATHs; null when it isn't installed.
async function binDir(app) {
  const exe = await appNvim(app)
  return exe ? path.dirname(exe) : null
}

async function getStatus(app) {
  const nvim = await resolveNvim(app)
  return {
    installed: !!nvim,
    source: nvim?.source ?? null,
    version: nvim?.version ?? null,
    path: nvim?.exe ?? null,
    supported: !!releaseAsset() || !!nvim,
  }
}

async function install(app, onProgress) {
  const emit = (payload) => onProgress?.(payload)
  const asset = releaseAsset()
  if (!asset) {
    const reason = `There is no prebuilt Neovim for ${process.platform} ${process.arch}. Install it yourself, then restart the app.`
    emit({ phase: 'error', error: reason })
    return { ok: false, reason }
  }
  const dir = runtimeDir(app)
  const archive = path.join(os.tmpdir(), `upskillos-${Date.now()}-${asset}`)
  try {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir, { recursive: true })

    emit({ phase: 'downloading-neovim', percent: 0 })
    const url = `https://github.com/neovim/neovim/releases/download/${NVIM_VERSION}/${asset}`
    await downloadFile(url, archive, (p) => emit({ phase: 'downloading-neovim', percent: Math.round(p * 0.9) }))

    emit({ phase: 'extracting-neovim', percent: 90 })
    if (isWin) await extractZip(archive, dir)
    else await execFileAsync('tar', ['-xzf', archive, '-C', dir], { timeout: 120000 })

    const exe = await appNvim(app)
    if (!exe) throw new Error('The download unpacked, but nvim was not found in it')
    if (!(await versionOf(exe))) throw new Error(`The downloaded nvim did not start: ${exe}`)

    emit({ phase: 'done', percent: 100 })
    return { ok: true }
  } catch (e) {
    const detail = errorDetail(e)
    emit({ phase: 'error', error: detail })
    return { ok: false, reason: detail }
  } finally {
    fs.rm(archive, { force: true }).catch(() => {})
  }
}

// ── Editor sessions ───────────────────────────────────────────────────────────

// The program and arguments for one editor session, and the address it listens on. A Unix
// socket path must stay under about 100 characters, so the name is short.
async function sessionCommand(app, absFile) {
  const nvim = await resolveNvim(app)
  if (!nvim) return null
  const tag = Math.random().toString(36).slice(2, 10)
  const address = isWin ? `\\\\.\\pipe\\upskillos-nvim-${tag}` : path.join(os.tmpdir(), `usos-nvim-${tag}.sock`)
  const practice = await practiceScript(app)
  return {
    file: nvim.exe,
    args: ['--listen', address, ...(practice ? ['--cmd', `lua dofile(${luaString(practice)})`] : []), ...(absFile ? [absFile] : [])],
    address,
    exe: nvim.exe,
  }
}

// The keystroke recorder for the Neovim series' drills (neovim-practice.lua). Neovim can't read
// a file inside the packaged app's archive, so it's copied out to userData first. Loaded with
// --cmd, before the learner's own configuration, and harmless outside the drills.
async function practiceScript(app) {
  try {
    const dest = path.join(runtimeDir(app), 'practice.lua')
    await fs.mkdir(runtimeDir(app), { recursive: true })
    await fs.writeFile(dest, await fs.readFile(path.join(__dirname, 'neovim-practice.lua'), 'utf8'))
    return dest
  } catch {
    return null
  }
}

// A Lua long string, which needs no escaping for paths with spaces, quotes or backslashes.
const luaString = (s) => `[==[${s}]==]`

// A Vim script string literal: single quotes, with any single quote doubled.
const vimString = (s) => `'${String(s).replace(/'/g, "''")}'`

// Evaluates one Vim script expression in a running session. The session may still be starting,
// so a refused connection is retried for a moment.
async function remoteExpr(exe, address, expr) {
  let lastError
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await execFileAsync(exe, ['--server', address, '--remote-expr', expr], { windowsHide: true, timeout: 5000 })
      return { ok: true }
    } catch (e) {
      lastError = e
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  return { ok: false, reason: errorDetail(lastError) }
}

// What the app asks a session to do. `silent!` keeps a refusal (a buffer with no file name,
// say) from leaving a message the learner has to press Enter past.
const EXPRS = {
  // Show a file, switching to its buffer if it is already open.
  open: (absFile) => `execute('drop ' . fnameescape(${vimString(absFile)}))`,
  // Write every changed buffer, as Monaco's autosave would have, before a run or a check.
  writeAll: () => `execute('silent! wall')`,
  // Reload buffers whose files the app changed on disk (a provided file, a reload).
  checktime: () => `execute('silent! checktime')`,
}

module.exports = { getStatus, install, binDir, sessionCommand, remoteExpr, EXPRS, NVIM_VERSION }
