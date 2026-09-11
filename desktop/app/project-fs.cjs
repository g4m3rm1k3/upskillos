// project-fs.cjs
// Real filesystem access, scoped to ONE folder the user explicitly picked.
//
// Why this exists rather than reusing the backend's /api/dev-fs: that API
// has only ping/list/read/write, its `list` is single-level and
// extension-filtered, its writes are hard-capped to the repo's own src/
// and public/, and it's reimplemented a second time as a Vite middleware
// plugin (vite.config.js) so every new action has to be written twice.
// None of that fits "the learner owns a real project folder somewhere on
// their disk and builds a multi-file app in it."
//
// Everything here is confined to the picked root by resolveInRoot(). The
// user chooses that root through a native folder dialog, so the app never
// invents a path the user didn't approve.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { dialog } = require('electron')

// Directories that would swamp the tree and that nobody is editing by
// hand in a lesson.
const IGNORED_DIRS = new Set(['.git', '__pycache__', '.venv', 'venv', 'node_modules', '.idea', '.vscode', 'dist', 'build'])

function configPath(app) {
  return path.join(app.getPath('userData'), 'project-config.json')
}

async function loadConfig(app) {
  try {
    return JSON.parse(await fs.readFile(configPath(app), 'utf8'))
  } catch {
    return {}
  }
}

async function saveConfig(app, data) {
  await fs.writeFile(configPath(app), JSON.stringify(data, null, 2), 'utf8')
}

async function pathExists(p) {
  try { await fs.access(p); return true } catch { return false }
}

// Resolve a caller-supplied relative path against the project root and
// refuse anything that escapes it.
//
// The `=== root ||` + `root + path.sep` shape matters: a bare
// `resolved.startsWith(root)` (which is what the existing dev-fs guard in
// backend/server.mjs does) also accepts a *sibling* directory whose name
// merely starts with the root's name — "C:\dev\game" would let
// "C:\dev\game-secrets" through. Comparing against root + separator only
// admits genuine descendants.
function resolveInRoot(root, relPath) {
  if (!root) throw new Error('No project folder is open')
  const resolved = path.resolve(root, relPath || '.')
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path escapes the project folder: ${relPath}`)
  }
  return resolved
}

async function getProject(app) {
  const cfg = await loadConfig(app)
  const root = cfg.projectRoot || null
  if (!root) return { root: null }
  // A remembered folder can be deleted or on a disconnected drive between
  // sessions — report that rather than handing back a dead path.
  if (!(await pathExists(root))) return { root: null, missing: cfg.projectRoot }
  return { root }
}

async function pickFolder(app, mainWindow) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a project folder',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || !result.filePaths?.length) return { ok: false, canceled: true }

  const root = result.filePaths[0]
  const cfg = await loadConfig(app)
  await saveConfig(app, { ...cfg, projectRoot: root })
  return { ok: true, root }
}

async function tree(app) {
  const { root } = await getProject(app)
  if (!root) return { ok: false, reason: 'No project folder is open' }

  async function walk(absDir, relDir) {
    const entries = await fs.readdir(absDir, { withFileTypes: true })
    const out = []
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        out.push({ name: entry.name, rel, type: 'dir', children: await walk(path.join(absDir, entry.name), rel) })
      } else if (entry.isFile()) {
        out.push({ name: entry.name, rel, type: 'file' })
      }
    }
    // Directories first, then alphabetical — the ordering every file
    // explorer uses, so the tree reads the way people expect.
    out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
    return out
  }

  try {
    return { ok: true, root, entries: await walk(root, '') }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

async function readFile(app, relPath) {
  const { root } = await getProject(app)
  try {
    const abs = resolveInRoot(root, relPath)
    if (!(await pathExists(abs))) return { ok: true, content: '', missing: true }
    return { ok: true, content: await fs.readFile(abs, 'utf8') }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

async function writeFile(app, relPath, content) {
  const { root } = await getProject(app)
  try {
    const abs = resolveInRoot(root, relPath)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content ?? '', 'utf8')
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

async function mkdir(app, relPath) {
  const { root } = await getProject(app)
  try {
    await fs.mkdir(resolveInRoot(root, relPath), { recursive: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

async function remove(app, relPath) {
  const { root } = await getProject(app)
  try {
    const abs = resolveInRoot(root, relPath)
    if (abs === root) return { ok: false, reason: 'Refusing to delete the project root' }
    await fs.rm(abs, { recursive: true, force: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

async function rename(app, fromRel, toRel) {
  const { root } = await getProject(app)
  try {
    const absFrom = resolveInRoot(root, fromRel)
    const absTo = resolveInRoot(root, toRel)
    await fs.mkdir(path.dirname(absTo), { recursive: true })
    await fs.rename(absFrom, absTo)
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

// ── Running a real file in the project ─────────────────────────────────────
// Deliberately NOT runtimes/python.cjs's runScript(): that one writes an
// ephemeral file into a scratch dir, runs it with cwd set there, and
// deletes it when the process exits. A project needs the opposite — run
// the file where it actually lives, with cwd at the project root, so that
// `import` of a sibling module resolves and nothing is cleaned up
// afterward.
const runningProcs = new Map()

async function runProjectFile(app, runtimes, runtimeKey, relPath, onOutput) {
  const { root } = await getProject(app)
  if (!root) return { ok: false, reason: 'No project folder is open' }

  const mod = runtimes[runtimeKey]
  if (!mod?.projectCommand) {
    return { ok: false, reason: `Running project files isn't supported for "${runtimeKey}" yet` }
  }

  try {
    const abs = resolveInRoot(root, relPath)
    if (!(await pathExists(abs))) return { ok: false, reason: `${relPath} doesn't exist yet` }

    const cmd = await mod.projectCommand(app, abs)
    if (!cmd) return { ok: false, reason: `The ${runtimeKey} runtime isn't installed` }

    const runId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const child = spawn(cmd.command, cmd.args, {
      cwd: root,
      windowsHide: false, // GUI projects are the point — let their windows show
      stdio: ['ignore', 'pipe', 'pipe'],
      // A runtime can ask for extra env — Python needs PYTHONUNBUFFERED so a
      // long-running GUI's print() output actually streams instead of
      // sitting in a block buffer until the process exits.
      env: { ...process.env, ...(cmd.env || {}) },
    })
    runningProcs.set(runId, child)

    child.stdout.on('data', (chunk) => onOutput?.({ runId, stream: 'stdout', text: chunk.toString() }))
    child.stderr.on('data', (chunk) => onOutput?.({ runId, stream: 'stderr', text: chunk.toString() }))
    child.on('close', (code) => {
      runningProcs.delete(runId)
      onOutput?.({ runId, stream: 'exit', code })
    })
    child.on('error', (err) => {
      runningProcs.delete(runId)
      onOutput?.({ runId, stream: 'stderr', text: `Failed to launch: ${err.message}` })
    })

    return { ok: true, runId }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

function killAllProjectRuns() {
  for (const child of runningProcs.values()) {
    try { child.kill() } catch {}
  }
  runningProcs.clear()
}

module.exports = {
  pickFolder, getProject, tree, readFile, writeFile, mkdir, remove, rename,
  runProjectFile, killAllProjectRuns,
}
