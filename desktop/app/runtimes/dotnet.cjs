// runtimes/dotnet.cjs
// Real, local C# execution via the official .NET SDK. Uses Microsoft's
// stable "latest 8.0.x SDK" redirect (https://aka.ms/dotnet/8.0/dotnet-sdk-win-x64.zip)
// rather than a hand-pinned patch version — confirmed live this resolves
// to a real, current zip.
//
// .NET 8 does NOT support "file-based apps" (`dotnet run app.cs` with no
// project file) — that's a newer SDK feature. Confirmed live: it just
// fails with "Couldn't find a project to run." So instead, each run
// scaffolds a scratch copy of the minimal console-app template checked in
// at runtimes/templates/dotnet/app.csproj, drops the lesson's code in as
// Program.cs, and runs `dotnet run --project <scratch-dir>`— confirmed
// live to work.
//
// One real caveat, also confirmed live: the .NET SDK's own internal
// directory structure is deep enough that under a sufficiently long
// userData path, MSBuild can fail with a confusing "SDK Resolver folder
// exists but without an SDK Resolver DLL" error that is actually just
// Windows' 260-char MAX_PATH being hit, not a broken SDK — this held true
// under a test path but the exact same install worked fine once moved to
// a short one. userData is normally short enough for this not to matter,
// but it's a known sharp edge if it ever resurfaces.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { downloadFile, extractZip, errorDetail } = require('./_shared.cjs')

const DOTNET_SDK_URL = 'https://aka.ms/dotnet/8.0/dotnet-sdk-win-x64.zip'
const TEMPLATE_CSPROJ = path.join(__dirname, 'templates', 'dotnet', 'app.csproj')

function runtimeDir(app) {
  return path.join(app.getPath('userData'), 'runtimes', 'dotnet')
}

function scratchDir(app) {
  return path.join(runtimeDir(app), 'scratch')
}

function dotnetExePath(app) {
  return path.join(runtimeDir(app), 'dotnet.exe')
}

async function pathExists(p) {
  try { await fs.access(p); return true } catch { return false }
}

async function getStatus(app) {
  const installed = await pathExists(dotnetExePath(app))
  return { installed }
}

async function install(app, onProgress) {
  const emit = (payload) => onProgress?.(payload)
  const dir = runtimeDir(app)

  try {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir, { recursive: true })
    await fs.mkdir(scratchDir(app), { recursive: true })

    emit({ phase: 'downloading-dotnet', percent: 0 })
    const zipPath = path.join(dir, 'dotnet-sdk.zip')
    await downloadFile(DOTNET_SDK_URL, zipPath, (p) => emit({ phase: 'downloading-dotnet', percent: Math.round(p * 0.9) }))

    emit({ phase: 'extracting-dotnet', percent: 90 })
    // .NET SDK zips extract flat (dotnet.exe at the root) — no nested
    // wrapper folder to flatten, unlike Temurin's JDK zip.
    await extractZip(zipPath, dir)
    await fs.rm(zipPath, { force: true })

    if (!(await pathExists(dotnetExePath(app)))) throw new Error('Extraction succeeded but dotnet.exe was not found afterward')

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
    const dotnetExe = dotnetExePath(app)
    if (!(await pathExists(dotnetExe))) return { ok: false, reason: '.NET toolchain is not installed' }

    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const runDir = path.join(scratchDir(app), runId)
    await fs.mkdir(runDir, { recursive: true })
    await fs.copyFile(TEMPLATE_CSPROJ, path.join(runDir, 'app.csproj'))
    await fs.writeFile(path.join(runDir, 'Program.cs'), code, 'utf8')

    const child = spawn(dotnetExe, ['run', '--project', runDir], {
      cwd: runDir,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DOTNET_ROOT: runtimeDir(app),
        DOTNET_CLI_TELEMETRY_OPTOUT: '1',
        DOTNET_NOLOGO: '1',
      },
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
      onOutput?.({ runId, stream: 'stderr', text: `Failed to launch dotnet: ${err.message}` })
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
