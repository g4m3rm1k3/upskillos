// runtimes/lisp.cjs
// Real, local Common Lisp execution via SBCL (Steel Bank Common Lisp).
//
// SBCL only publishes a Windows MSI installer, not a portable zip — unlike
// every other runtime here. Confirmed live that `msiexec /a <msi> /qn
// TARGETDIR=<dir>` (an "administrative install") just lays the MSI's files
// out into a target directory with no registry writes, no Program Files
// requirement, and no elevation prompt — functionally equivalent to
// extracting a zip for our purposes. See _shared.cjs's extractMsi().
const { promises: fs } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { downloadFile, extractMsi, findFile, errorDetail } = require('./_shared.cjs')

// Pinned to a specific tested release. Bump deliberately.
const SBCL_VERSION = '2.6.8'
const SBCL_MSI_URL = `https://downloads.sourceforge.net/project/sbcl/sbcl/${SBCL_VERSION}/sbcl-${SBCL_VERSION}-x86-64-windows-binary.msi`

function runtimeDir(app) {
  return path.join(app.getPath('userData'), 'runtimes', 'lisp')
}

function scratchDir(app) {
  return path.join(runtimeDir(app), 'scratch')
}

async function sbclPath(app) {
  return findFile(runtimeDir(app), 'sbcl.exe')
}

async function getStatus(app) {
  const sbcl = await sbclPath(app)
  return { installed: !!sbcl }
}

async function install(app, onProgress) {
  const emit = (payload) => onProgress?.(payload)
  const dir = runtimeDir(app)

  try {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir, { recursive: true })
    await fs.mkdir(scratchDir(app), { recursive: true })

    emit({ phase: 'downloading-lisp', percent: 0 })
    // Downloaded outside `dir` deliberately, not into it — confirmed live
    // that msiexec's administrative install (`/a`) fails when TARGETDIR is
    // the same directory the source .msi itself lives in.
    const msiPath = path.join(os.tmpdir(), `opencalc-sbcl-${Date.now()}.msi`)
    await downloadFile(SBCL_MSI_URL, msiPath, (p) => emit({ phase: 'downloading-lisp', percent: Math.round(p * 0.85) }))

    emit({ phase: 'extracting-lisp', percent: 85 })
    await extractMsi(msiPath, dir)
    await fs.rm(msiPath, { force: true })

    if (!(await sbclPath(app))) throw new Error('Extraction succeeded but sbcl.exe was not found afterward')

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
    const sbcl = await sbclPath(app)
    if (!sbcl) return { ok: false, reason: 'Common Lisp toolchain is not installed' }

    await fs.mkdir(scratchDir(app), { recursive: true })
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const srcPath = path.join(scratchDir(app), `${runId}.lisp`)
    await fs.writeFile(srcPath, code, 'utf8')

    const child = spawn(sbcl, ['--script', srcPath], {
      cwd: scratchDir(app),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    runningProcs.set(runId, child)

    child.stdout.on('data', (chunk) => onOutput?.({ runId, stream: 'stdout', text: chunk.toString() }))
    child.stderr.on('data', (chunk) => onOutput?.({ runId, stream: 'stderr', text: chunk.toString() }))
    child.on('close', (exitCode) => {
      runningProcs.delete(runId)
      onOutput?.({ runId, stream: 'exit', code: exitCode })
      fs.rm(srcPath, { force: true }).catch(() => {})
    })
    child.on('error', (err) => {
      runningProcs.delete(runId)
      onOutput?.({ runId, stream: 'stderr', text: `Failed to launch SBCL: ${err.message}` })
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

module.exports = { getStatus, install, runCode, killAllScripts }
