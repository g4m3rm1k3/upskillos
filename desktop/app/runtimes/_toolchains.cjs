// runtimes/_toolchains.cjs
// Finds compilers the learner already has installed, so lessons run on the
// learner's own toolchain first and only fall back to the app-managed one
// (downloaded into userData) when nothing usable is found.
//
// "Found on PATH" is not the same as "works": cpp.cjs's header comment
// documents a WinLibs GCC that could not compile <iostream> on one machine.
// So a C++ compiler only counts once a real probe program compiles, links
// with -static and prints the expected line. Results are cached for the
// session; detection runs again after an app restart.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')

const execFileAsync = promisify(execFile)

async function pathExists(p) {
  try { await fs.access(p); return true } catch { return false }
}

async function whereAll(name) {
  try {
    const [cmd, args] = process.platform === 'win32' ? ['where.exe', [name]] : ['which', ['-a', name]]
    const { stdout } = await execFileAsync(cmd, args, { windowsHide: true, timeout: 5000 })
    return stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

// ── .NET ─────────────────────────────────────────────────────────────────────

// Lessons target net8.0 or later; an older SDK would build them against a
// framework the lessons were never written for.
const MIN_DOTNET_MAJOR = 8

async function listSdks(dotnetExe) {
  const { stdout } = await execFileAsync(dotnetExe, ['--list-sdks'], {
    windowsHide: true, timeout: 15000, env: { ...process.env, DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
  })
  // "10.0.301 [C:\Program Files\dotnet\sdk]"
  return stdout.split(/\r?\n/)
    .map(l => l.match(/^(\d+)\.(\d+)\.(\d+)\S*\s/))
    .filter(Boolean)
    .map(m => ({ version: m[0].trim(), major: Number(m[1]) }))
}

async function detectSystemDotnet() {
  const candidates = [
    ...(await whereAll('dotnet')),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'dotnet', 'dotnet.exe'),
  ]
  for (const exe of [...new Set(candidates)]) {
    if (!(await pathExists(exe))) continue
    try {
      const sdks = (await listSdks(exe)).filter(s => s.major >= MIN_DOTNET_MAJOR)
      if (!sdks.length) continue
      const newest = sdks.sort((a, b) => b.major - a.major)[0]
      return { exe, version: newest.version, major: newest.major }
    } catch {
      // A dotnet.exe with no SDKs (runtime-only install) fails --list-sdks — skip it.
    }
  }
  return null
}

// ── C++ ──────────────────────────────────────────────────────────────────────

const PROBE_SOURCE = [
  '#include <iostream>',
  '#include <string>',
  '#include <vector>',
  'int main() {',
  '    std::vector<std::string> v{"open", "calc"};',
  '    std::cout << "probe-ok " << v.size() << std::endl;',
  '}',
  '',
].join('\n')

async function compilerVersion(exe) {
  try {
    const { stdout } = await execFileAsync(exe, ['--version'], { windowsHide: true, timeout: 10000 })
    return stdout.split(/\r?\n/)[0].trim()
  } catch {
    return null
  }
}

// Compiles and runs the probe with the same flags lessons use. Returns null
// when it works, or the reason it didn't.
async function probeCompiler(exe) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'opencalc-cpp-probe-'))
  try {
    const src = path.join(dir, 'probe.cpp')
    const out = path.join(dir, 'probe.exe')
    await fs.writeFile(src, PROBE_SOURCE, 'utf8')
    await execFileAsync(exe, ['-std=c++17', '-O2', '-static', src, '-o', out], { windowsHide: true, timeout: 60000 })
    const { stdout } = await execFileAsync(out, [], { windowsHide: true, timeout: 10000 })
    return stdout.trim() === 'probe-ok 2' ? null : `unexpected probe output: ${stdout.trim()}`
  } catch (e) {
    return String(e.stderr || e.message || e).split(/\r?\n/).slice(0, 3).join(' ')
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

async function detectSystemCpp() {
  const rejected = []
  for (const name of ['g++', 'clang++']) {
    for (const exe of await whereAll(name)) {
      const problem = await probeCompiler(exe)
      if (!problem) return { found: { exe, version: (await compilerVersion(exe)) || name }, rejected }
      rejected.push({ exe, reason: problem })
    }
  }
  return { found: null, rejected }
}

// ── Python ───────────────────────────────────────────────────────────────────

// Lesson code uses f-strings, the walrus operator and dict ordering; 3.9 is a safe floor.
const MIN_PYTHON = [3, 9]

// Windows puts a python.exe "App Execution Alias" in WindowsApps even when no Python is
// installed; running it then prints "Python was not found" (exit 9009) or opens the Store.
// So an interpreter only counts once it actually runs code and reports its version.
async function detectSystemPython() {
  const candidates = [...(await whereAll('python')), ...(await whereAll('python3'))]
  for (const exe of [...new Set(candidates)]) {
    try {
      const { stdout } = await execFileAsync(exe, ['-c', 'import sys; print("%d.%d.%d" % sys.version_info[:3])'], {
        windowsHide: true, timeout: 15000,
      })
      const version = stdout.trim()
      const [major, minor] = version.split('.').map(Number)
      if (major > MIN_PYTHON[0] || (major === MIN_PYTHON[0] && minor >= MIN_PYTHON[1])) return { exe, version }
    } catch {
      // Not runnable (the Store alias stub, a broken install): try the next one.
    }
  }
  return null
}

// ── GDB and a C compiler (CodeLens on the desktop) ───────────────────────────

// CodeLens drives GDB through its Python API (runtimes/codelens/gdb_tracer.py), so a GDB
// built without Python doesn't count.
async function detectSystemGdb() {
  for (const exe of await whereAll('gdb')) {
    try {
      const { stdout } = await execFileAsync(exe, ['-batch', '-nx', '-ex', 'python print("gdb-python-ok")'], { windowsHide: true, timeout: 20000 })
      if (!stdout.includes('gdb-python-ok')) continue
      const { stdout: versionText } = await execFileAsync(exe, ['--version'], { windowsHide: true, timeout: 10000 })
      return { exe, version: versionText.split(/\r?\n/)[0].match(/(\d+\.\d+(?:\.\d+)?)\s*$/)?.[1] ?? '' }
    } catch {
      // GDB without Python support, or one that won't start: try the next.
    }
  }
  return null
}

const C_PROBE = '#include <stdio.h>\nint main(void) { printf("probe-ok\\n"); return 0; }\n'

async function detectSystemCCompiler() {
  for (const exe of [...(await whereAll('gcc')), ...(await whereAll('clang'))]) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'opencalc-c-probe-'))
    try {
      const src = path.join(dir, 'probe.c')
      const out = path.join(dir, 'probe.exe')
      await fs.writeFile(src, C_PROBE, 'utf8')
      await execFileAsync(exe, ['-g', '-O0', src, '-o', out], { windowsHide: true, timeout: 60000 })
      const { stdout } = await execFileAsync(out, [], { windowsHide: true, timeout: 10000 })
      if (stdout.trim() === 'probe-ok') return { exe, version: (await compilerVersion(exe)) || path.basename(exe) }
    } catch {
      // try the next one
    } finally {
      fs.rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  }
  return null
}

// ── Session cache ────────────────────────────────────────────────────────────

const cache = new Map()

function cached(key, detect) {
  if (!cache.has(key)) cache.set(key, detect().catch(() => null))
  return cache.get(key)
}

module.exports = {
  systemDotnet: () => cached('dotnet', detectSystemDotnet),
  systemCpp: () => cached('cpp', detectSystemCpp),
  systemPython: () => cached('python', detectSystemPython),
  systemGdb: () => cached('gdb', detectSystemGdb),
  systemCCompiler: () => cached('c', detectSystemCCompiler),
}
