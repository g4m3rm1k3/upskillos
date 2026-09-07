// runtimes/cpp.cjs
// Real, local C/C++ compilation — this is what lets the Electron build stop
// depending on Wandbox (a third-party remote compile API) the way
// CppNotebook.jsx does on the web build, which has no local toolchain to
// fall back to at all.
//
// Uses llvm-mingw (https://github.com/mstorsjo/llvm-mingw), a self-contained
// Clang + MinGW-w64 distribution built specifically for portability. This
// was NOT the first choice tried — WinLibs' standalone GCC (the more
// commonly recommended "portable GCC for Windows" distribution) was tested
// first and failed: across three different GCC versions, compiling any
// program that includes <iostream> hit a real, reproducible bug where the
// compiler's own libstdc++ header search couldn't resolve
// `bits/requires_hosted.h` even though the file demonstrably exists right
// next to the header that includes it, and neither explicit -B/-L/-I nor
// --sysroot overrides fixed it. Root cause traced partway to interference
// from a pre-existing, unrelated legacy MinGW install and MSYS2 environment
// variables already present on the machine used to build this — but since
// that kind of leftover toolchain is a realistic thing to find on other
// Windows machines too (Git for Windows, Strawberry Perl, and various IDEs
// all install their own MinGW), WinLibs' GCC was dropped as unreliable
// rather than shipped with an unresolved intermittent failure mode.
// llvm-mingw compiled and ran real C++ correctly on the first try.
//
// One llvm-mingw quirk that DOES need a workaround: without `-static`, the
// compiled .exe fails to launch at all (Windows error 0xC0000135, DLL not
// found) because it dynamically links against libc++/libunwind DLLs that
// live in llvm-mingw's own bin/ directory, not next to the lesson's
// compiled executable. `-static` was confirmed live to produce a fully
// self-contained, working .exe with no DLL dependency to manage.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { spawn, execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { pathExists, downloadFile, extractZip, findFile, errorDetail } = require('./_shared.cjs')

const execFileAsync = promisify(execFile)

// Pinned to a specific dated release for the same reason Python is pinned:
// predictable, tested internal layout. Bump deliberately.
const LLVM_MINGW_RELEASE = '20260826'
const LLVM_MINGW_ZIP_URL = `https://github.com/mstorsjo/llvm-mingw/releases/download/${LLVM_MINGW_RELEASE}/llvm-mingw-${LLVM_MINGW_RELEASE}-ucrt-x86_64.zip`

function runtimeDir(app) {
  return path.join(app.getPath('userData'), 'runtimes', 'cpp')
}

function scratchDir(app) {
  return path.join(runtimeDir(app), 'scratch')
}

async function gppPath(app) {
  return findFile(runtimeDir(app), 'x86_64-w64-mingw32-g++.exe')
}

async function getStatus(app) {
  const gpp = await gppPath(app)
  return { installed: !!gpp }
}

async function install(app, onProgress) {
  const emit = (payload) => onProgress?.(payload)
  const dir = runtimeDir(app)

  try {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir, { recursive: true })
    await fs.mkdir(scratchDir(app), { recursive: true })

    emit({ phase: 'downloading-cpp', percent: 0 })
    const zipPath = path.join(dir, 'llvm-mingw.zip')
    await downloadFile(LLVM_MINGW_ZIP_URL, zipPath, (p) => emit({ phase: 'downloading-cpp', percent: Math.round(p * 0.85) }))

    emit({ phase: 'extracting-cpp', percent: 85 })
    await extractZip(zipPath, dir)
    await fs.rm(zipPath, { force: true })

    if (!(await gppPath(app))) throw new Error('Extraction succeeded but g++ was not found afterward')

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
    const gpp = await gppPath(app)
    if (!gpp) return { ok: false, reason: 'C++ toolchain is not installed' }

    await fs.mkdir(scratchDir(app), { recursive: true })
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const srcPath = path.join(scratchDir(app), `${runId}.cpp`)
    const exePath = path.join(scratchDir(app), `${runId}.exe`)
    await fs.writeFile(srcPath, code, 'utf8')

    let compileResult
    try {
      compileResult = await execFileAsync(gpp, ['-std=c++17', '-O2', '-static', srcPath, '-o', exePath], {
        windowsHide: true, timeout: 30000, maxBuffer: 10 * 1024 * 1024,
      })
    } catch (compileErr) {
      onOutput?.({ runId, stream: 'stderr', text: compileErr.stderr || compileErr.message })
      onOutput?.({ runId, stream: 'exit', code: 1 })
      await fs.rm(srcPath, { force: true }).catch(() => {})
      return { ok: true, runId } // launched (the compile step), just failed — reported via output events
    }
    if (compileResult.stderr) onOutput?.({ runId, stream: 'stderr', text: compileResult.stderr })

    const child = spawn(exePath, [], {
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
      fs.rm(exePath, { force: true }).catch(() => {})
    })
    child.on('error', (err) => {
      runningProcs.delete(runId)
      onOutput?.({ runId, stream: 'stderr', text: `Failed to launch program: ${err.message}` })
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
