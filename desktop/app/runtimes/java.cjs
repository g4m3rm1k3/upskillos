// runtimes/java.cjs
// Real, local Java execution via Eclipse Temurin (the Adoptium project's
// OpenJDK builds). Uses Adoptium's "always latest 21.x" API redirect
// (https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse)
// instead of a hand-pinned version+URL — confirmed live this resolves to a
// real zip and, unlike the other toolchains here, doesn't need bumping by
// hand as patch releases ship.
//
// Runs code via single-file source execution (`java Main.java` directly,
// no separate `javac` step) — a real JDK feature since JEP 330 (Java 11),
// confirmed live against Temurin 21. The lesson's top-level class must be
// named `Main` (the file gets written as Main.java) — documented in
// NativeRunNotebook.jsx, not something a lesson author can name arbitrarily.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { downloadFile, extractZip, findFile, errorDetail } = require('./_shared.cjs')

const JDK_LATEST_URL = 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse'

function runtimeDir(app) {
  return path.join(app.getPath('userData'), 'runtimes', 'java')
}

function scratchDir(app) {
  return path.join(runtimeDir(app), 'scratch')
}

async function javaPath(app) {
  return findFile(runtimeDir(app), 'java.exe')
}

async function getStatus(app) {
  const java = await javaPath(app)
  return { installed: !!java }
}

async function install(app, onProgress) {
  const emit = (payload) => onProgress?.(payload)
  const dir = runtimeDir(app)

  try {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir, { recursive: true })
    await fs.mkdir(scratchDir(app), { recursive: true })

    emit({ phase: 'downloading-java', percent: 0 })
    const zipPath = path.join(dir, 'jdk.zip')
    await downloadFile(JDK_LATEST_URL, zipPath, (p) => emit({ phase: 'downloading-java', percent: Math.round(p * 0.85) }))

    emit({ phase: 'extracting-java', percent: 85 })
    // Temurin zips extract into one nested version-named folder (e.g.
    // jdk-21.0.12.1+1/) rather than flat — confirmed live. findFile()
    // locates java.exe wherever it landed rather than assuming the exact
    // version-string folder name, so a patch-version bump never breaks this.
    await extractZip(zipPath, dir)
    await fs.rm(zipPath, { force: true })

    if (!(await javaPath(app))) throw new Error('Extraction succeeded but java.exe was not found afterward')

    emit({ phase: 'done', percent: 100 })
    return { ok: true }
  } catch (e) {
    const detail = errorDetail(e)
    emit({ phase: 'error', error: detail })
    return { ok: false, reason: detail }
  }
}

const runningProcs = new Map()

async function runCode(app, code, onOutput) {
  try {
    const java = await javaPath(app)
    if (!java) return { ok: false, reason: 'Java toolchain is not installed' }

    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const runDir = path.join(scratchDir(app), runId)
    await fs.mkdir(runDir, { recursive: true })
    // Single-file source execution requires the filename to match the
    // public top-level class name — Main.java is the fixed convention.
    const srcPath = path.join(runDir, 'Main.java')
    await fs.writeFile(srcPath, code, 'utf8')

    const child = spawn(java, [srcPath], {
      cwd: runDir,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    runningProcs.set(runId, child)

    child.stdout.on('data', (chunk) => onOutput?.({ runId, stream: 'stdout', text: chunk.toString() }))
    child.stderr.on('data', (chunk) => onOutput?.({ runId, stream: 'stderr', text: chunk.toString() }))
    child.on('close', (exitCode) => {
      runningProcs.delete(runId)
      onOutput?.({ runId, stream: 'exit', code: exitCode })
      fs.rm(runDir, { recursive: true, force: true }).catch(() => {})
    })
    child.on('error', (err) => {
      runningProcs.delete(runId)
      onOutput?.({ runId, stream: 'stderr', text: `Failed to launch Java: ${err.message}` })
    })

    return { ok: true, runId }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

function killAllScripts() {
  for (const child of runningProcs.values()) {
    try { child.kill() } catch {}
  }
  runningProcs.clear()
}

// See python.cjs's projectCommand for why this exists. Single-file source
// execution (JEP 330) means a .java file in a project runs directly, with
// no javac step — but only for a single file; a real multi-file Java
// project would need a build, which is why this stays this simple for now.
async function projectCommand(app, absFile) {
  const java = await javaPath(app)
  if (!java) return null
  return { command: java, args: [absFile] }
}

module.exports = { getStatus, install, runCode, killAllScripts, projectCommand }
