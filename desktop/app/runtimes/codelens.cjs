// runtimes/codelens.cjs
// CodeLens for compiled languages on the desktop. The result is a CodeLens ExecutionResult
// in the same shape as the JavaScript interpreter and the Python tracer produce, so every
// CodeLens view works.
//   C and C++: compiled with debug information and stepped through under GDB, using GDB's
//     Python API (codelens/gdb_tracer.py).
//   C#: the program is rewritten to report each step and run in a small tracer program
//     built on the .NET SDK's own C# compiler (codelens/csharp/, built once per SDK).
//
// Uses the learner's own GDB, compilers and .NET SDK (found and probed by _toolchains.cjs).
// There is no app-managed fallback: a language whose tools are missing simply isn't offered
// in CodeLens.
//
// runCode(app, payload): payload is JSON { lang: 'c' | 'cpp' | 'csharp', source }. Same contract as
// the other runtimes: returns { ok, runId } at once, then streams output events. The whole
// result arrives as one stdout event holding the JSON, followed by 'exit'.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { spawn, execFile } = require('node:child_process')
const crypto = require('node:crypto')
const { systemGdb, systemCpp, systemCCompiler, systemDotnet } = require('./_toolchains.cjs')

const TRACER = path.join(__dirname, 'codelens', 'gdb_tracer.py')
const CSHARP_HOST_SOURCES = ['Program.cs', 'TraceRuntime.cs'].map(name => path.join(__dirname, 'codelens', 'csharp', name))
// GDB's `step` can't be interrupted from inside the tracer (a program stuck on one line
// never returns from it), so the whole run has a hard limit here; the tracer's own
// limits normally end it well before this.
const HARD_LIMIT_MS = 25000
const TRACE_LIMITS = { maxSteps: 3000, maxRuntimeMs: 15000, maxRecursionDepth: 60, maxHeapObjects: 200, maxSnapshotItems: 40 }

// Included ahead of the learner's file (-include): makes stdout unbuffered before main runs,
// so each step's output reaches the output file as it is printed and the tracer can show
// which line printed it. std::cout writes through stdio by default, so this covers C++ too.
const UNBUFFERED_HEADER = [
  '#include <stdio.h>',
  '__attribute__((constructor)) static void codelens_unbuffered(void) { setvbuf(stdout, NULL, _IONBF, 0); }',
  '',
].join('\n')

const LANGUAGES = {
  c: { file: 'main.c', compiler: () => systemCCompiler(), flags: ['-g', '-O0', '-std=c17', '-include', 'codelens_unbuffered.h'] },
  cpp: { file: 'main.cpp', compiler: async () => (await systemCpp())?.found ?? null, flags: ['-g', '-O0', '-std=c++17', '-include', 'codelens_unbuffered.h'] },
}

function scratchDir(app) {
  return path.join(app.getPath('userData'), 'runtimes', 'codelens', 'scratch')
}

// The SDK's own C# compiler (Roslyn), which the C# tracer is built against.
async function csharpToolchain() {
  const dotnet = await systemDotnet()
  if (!dotnet) return null
  const roslyn = path.join(path.dirname(dotnet.exe), 'sdk', dotnet.version, 'Roslyn', 'bincore')
  try {
    await fs.access(path.join(roslyn, 'Microsoft.CodeAnalysis.CSharp.dll'))
  } catch {
    return null
  }
  return { ...dotnet, roslyn }
}

// Which languages CodeLens can trace on this machine, for its language menu.
async function getStatus() {
  const gdb = await systemGdb()
  const languages = {}
  for (const [lang, spec] of Object.entries(LANGUAGES)) {
    const compiler = gdb ? await spec.compiler() : null
    languages[lang] = compiler ? { compiler: compiler.exe, version: compiler.version } : null
  }
  const csharp = await csharpToolchain()
  languages.csharp = csharp ? { compiler: csharp.exe, version: `.NET SDK ${csharp.version}` } : null
  return {
    installed: Object.values(languages).some(Boolean),
    source: gdb ? 'system' : null,
    version: gdb ? `GDB ${gdb.version}` : null,
    path: gdb?.exe ?? null,
    languages,
  }
}

const runningProcs = new Map()

function tidyCompilerOutput(text, srcPath, file) {
  return text.split(srcPath).join(file)
}

// Builds a CodeLens ExecutionResult from the tracer's JSON lines. When GDB had to be killed
// there is no final "result" line: the run is reported as stopped at the time limit, with
// every step traced before that.
async function readResult(runDir, killed) {
  const events = []
  let summary = null
  try {
    const text = await fs.readFile(path.join(runDir, 'trace.jsonl'), 'utf8')
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        const item = JSON.parse(line)
        if (item.event) events.push(item.event)
        else if (item.result) summary = item.result
      } catch { /* a line cut off by the kill */ }
    }
  } catch { /* GDB never started tracing */ }
  let output = []
  try {
    const text = (await fs.readFile(path.join(runDir, 'program_output.txt'), 'utf8')).replace(/\r\n/g, '\n').replace(/\n$/, '')
    output = text ? text.split('\n').slice(0, 1000) : []
  } catch { /* no output */ }
  if (summary) return { events, output, ...summary }
  if (killed) {
    return {
      events, output, error: null, status: 'limit',
      limit: { kind: 'timeout', message: `Runtime limit (${HARD_LIMIT_MS / 1000} s) reached: the program was still running, probably a loop that never ends.` },
    }
  }
  return { events, output, status: 'runtime-error', error: { type: 'DebuggerError', message: 'GDB stopped without producing a trace.' } }
}

async function runCode(app, payloadText, onOutput) {
  try {
    const { lang, source, stdin } = JSON.parse(payloadText)
    // The CodeLens Input box's standard input (src/labs/codelens/codelens/scriptedInput.ts).
    const input = typeof stdin === 'string' ? stdin : ''
    if (lang === 'csharp' && typeof source === 'string') return runCSharp(app, source, input, onOutput)
    const spec = LANGUAGES[lang]
    if (!spec || typeof source !== 'string') return { ok: false, reason: `CodeLens can't trace ${lang} on the desktop` }
    const gdb = await systemGdb()
    const compiler = await spec.compiler()
    if (!gdb || !compiler) return { ok: false, reason: `Tracing ${lang} needs GDB with Python support and a ${lang === 'c' ? 'C' : 'C++'} compiler on this computer` }

    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const runDir = path.join(scratchDir(app), runId)
    await fs.mkdir(runDir, { recursive: true })
    const srcPath = path.join(runDir, spec.file)
    await fs.writeFile(srcPath, source, 'utf8')
    // Copied next to the program rather than run from __dirname: in a packaged app this
    // file may sit inside an asar archive, which only Electron (not GDB) can read.
    await fs.writeFile(path.join(runDir, 'gdb_tracer.py'), await fs.readFile(TRACER, 'utf8'), 'utf8')
    await fs.writeFile(path.join(runDir, 'codelens_unbuffered.h'), UNBUFFERED_HEADER, 'utf8')
    await fs.writeFile(path.join(runDir, 'program_input.txt'), input, 'utf8')

    const emit = (stream, text) => onOutput?.({ runId, stream, text })
    const cleanup = () => fs.rm(runDir, { recursive: true, force: true }).catch(() => {})
    const finish = (result) => {
      emit('stdout', JSON.stringify(result) + '\n')
      onOutput?.({ runId, stream: 'exit', code: 0 })
      cleanup()
    }

    const compile = execFile(compiler.exe, [...spec.flags, spec.file, '-o', 'program.exe'], { cwd: runDir, windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 }, (compileError, _stdout, compileStderr) => {
      if (runningProcs.get(runId) !== compile) { onOutput?.({ runId, stream: 'exit', code: null }); cleanup(); return }
      runningProcs.delete(runId)
      if (compileError) {
        const message = tidyCompilerOutput(compileStderr || compileError.message, srcPath, spec.file).trim()
        finish({ events: [], output: [], status: 'syntax-error', error: { type: 'CompileError', message } })
        return
      }
      const tracer = spawn(gdb.exe, ['-batch', '-nx', '-x', 'gdb_tracer.py', '--args', 'program.exe'], {
        cwd: runDir,
        windowsHide: true,
        stdio: ['ignore', 'ignore', 'pipe'],
        env: { ...process.env, CODELENS_SOURCE: spec.file, CODELENS_OUT: 'trace.jsonl', CODELENS_LANG: lang, CODELENS_LIMITS: JSON.stringify(TRACE_LIMITS) },
      })
      runningProcs.set(runId, tracer)
      let killed = false
      const timer = setTimeout(() => { killed = true; killTree(tracer) }, HARD_LIMIT_MS)
      tracer.on('close', async () => {
        clearTimeout(timer)
        const stopped = runningProcs.get(runId) !== tracer
        runningProcs.delete(runId)
        const result = await readResult(runDir, killed || stopped)
        if (stopped && !killed) { result.status = 'stopped'; delete result.limit }
        finish(result)
      })
      tracer.on('error', (error) => {
        clearTimeout(timer)
        runningProcs.delete(runId)
        finish({ events: [], output: [], status: 'runtime-error', error: { type: 'DebuggerError', message: `Could not start GDB: ${error.message}` } })
      })
    })
    runningProcs.set(runId, compile)
    return { ok: true, runId }
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) }
  }
}

// ── C# ───────────────────────────────────────────────────────────────────────

const DOTNET_ENV = { DOTNET_NOLOGO: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1' }

// The tracer program (codelens/csharp), built once for this SDK and kept in the app's data
// folder; rebuilt when its sources or the SDK change. The first build takes a while (about
// half a minute); later runs start in about a second.
const hostBuilds = new Map()
async function ensureCSharpHost(app, toolchain) {
  const sources = await Promise.all(CSHARP_HOST_SOURCES.map(file => fs.readFile(file, 'utf8')))
  const hash = crypto.createHash('sha256').update(toolchain.version).update(toolchain.roslyn).update(sources.join('\0')).digest('hex').slice(0, 16)
  const dir = path.join(app.getPath('userData'), 'runtimes', 'codelens', 'csharp-host', hash)
  const dll = path.join(dir, 'bin', 'CodeLensTracer.dll')
  try {
    await fs.access(dll)
    return dll
  } catch { /* not built yet */ }
  if (!hostBuilds.has(dir)) {
    hostBuilds.set(dir, buildCSharpHost(dir, toolchain, sources).finally(() => hostBuilds.delete(dir)))
  }
  await hostBuilds.get(dir)
  return dll
}

async function buildCSharpHost(dir, toolchain, sources) {
  await fs.mkdir(dir, { recursive: true })
  const roslyn = toolchain.roslyn.replace(/&/g, '&amp;')
  await fs.writeFile(path.join(dir, 'CodeLensTracer.csproj'), [
    '<Project Sdk="Microsoft.NET.Sdk">',
    '  <PropertyGroup>',
    '    <OutputType>Exe</OutputType>',
    `    <TargetFramework>net${toolchain.major}.0</TargetFramework>`,
    '    <ImplicitUsings>enable</ImplicitUsings>',
    '    <Nullable>enable</Nullable>',
    '    <SatelliteResourceLanguages>en</SatelliteResourceLanguages>',
    '  </PropertyGroup>',
    '  <ItemGroup>',
    `    <Reference Include="Microsoft.CodeAnalysis"><HintPath>${path.join(roslyn, 'Microsoft.CodeAnalysis.dll')}</HintPath></Reference>`,
    `    <Reference Include="Microsoft.CodeAnalysis.CSharp"><HintPath>${path.join(roslyn, 'Microsoft.CodeAnalysis.CSharp.dll')}</HintPath></Reference>`,
    '    <!-- Compiled into each traced program, not into the tracer. -->',
    '    <Compile Remove="TraceRuntime.cs" />',
    '    <None Include="TraceRuntime.cs" CopyToOutputDirectory="PreserveNewest" />',
    '  </ItemGroup>',
    '</Project>',
    '',
  ].join('\n'), 'utf8')
  await fs.writeFile(path.join(dir, 'Program.cs'), sources[0], 'utf8')
  await fs.writeFile(path.join(dir, 'TraceRuntime.cs'), sources[1], 'utf8')
  await new Promise((resolve, reject) => {
    execFile(toolchain.exe, ['build', '-c', 'Release', '-o', 'bin', '--nologo', '-v', 'q'], {
      cwd: dir, windowsHide: true, timeout: 240000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, ...DOTNET_ENV },
    }, (error, stdout, stderr) => {
      if (error) reject(new Error(`Building the C# tracer failed: ${(stdout + stderr).trim().split('\n').slice(-8).join('\n')}`))
      else resolve()
    })
  })
}

// Attaches each step's statement info (what kind of statement it is), by the statement's
// position in the source (`at`), to its event.
async function attachStatements(runDir, result) {
  try {
    const statements = JSON.parse(await fs.readFile(path.join(runDir, 'statements.json'), 'utf8'))
    for (const event of result.events) {
      if (event.type === 'statement_enter' && statements[event.at]) event.statement = statements[event.at]
    }
  } catch { /* a compile error: no statements */ }
  return result
}

async function runCSharp(app, source, input, onOutput) {
  const toolchain = await csharpToolchain()
  if (!toolchain) return { ok: false, reason: 'Tracing C# needs the .NET SDK (8 or later) on this computer' }
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const runDir = path.join(scratchDir(app), runId)
  await fs.mkdir(runDir, { recursive: true })
  await fs.writeFile(path.join(runDir, 'Program.cs'), source, 'utf8')
  await fs.writeFile(path.join(runDir, 'program_input.txt'), input, 'utf8')

  const cleanup = () => fs.rm(runDir, { recursive: true, force: true }).catch(() => {})
  const finish = (result) => {
    onOutput?.({ runId, stream: 'stdout', text: JSON.stringify(result) + '\n' })
    onOutput?.({ runId, stream: 'exit', code: 0 })
    cleanup()
  }
  const failed = (message) => finish({ events: [], output: [], status: 'runtime-error', error: { type: 'TracerError', message } })

  // Registered before the (first-time) build, so Stop works during it too.
  const pendingBuild = { pid: null }
  runningProcs.set(runId, pendingBuild)
  ensureCSharpHost(app, toolchain).then((dll) => {
    if (runningProcs.get(runId) !== pendingBuild) { onOutput?.({ runId, stream: 'exit', code: null }); cleanup(); return }
    const tracer = spawn(toolchain.exe, ['exec', dll, 'Program.cs'], {
      cwd: runDir,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, ...DOTNET_ENV, CODELENS_LIMITS: JSON.stringify(TRACE_LIMITS) },
    })
    runningProcs.set(runId, tracer)
    let stderr = ''
    tracer.stderr.on('data', chunk => { stderr += chunk })
    let killed = false
    const timer = setTimeout(() => { killed = true; killTree(tracer) }, HARD_LIMIT_MS)
    tracer.on('close', async () => {
      clearTimeout(timer)
      const stopped = runningProcs.get(runId) !== tracer
      runningProcs.delete(runId)
      const result = await readResult(runDir, killed || stopped)
      if (stopped && !killed) { result.status = 'stopped'; delete result.limit }
      if (result.error?.type === 'DebuggerError') {
        result.error = { type: 'TracerError', message: stderr.trim().split('\n').slice(0, 12).join('\n') || 'The C# tracer stopped without producing a trace.' }
      }
      finish(await attachStatements(runDir, result))
    })
    tracer.on('error', (error) => {
      clearTimeout(timer)
      runningProcs.delete(runId)
      failed(`Could not start the C# tracer: ${error.message}`)
    })
  }).catch((error) => {
    runningProcs.delete(runId)
    failed(error.message)
  })
  return { ok: true, runId }
}

// GDB starts the program as its own child; killing only GDB on Windows can leave the
// program running (a stuck loop keeps using a CPU core). taskkill /T ends the whole tree.
function killTree(child) {
  if (process.platform === 'win32' && child.pid) {
    execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {})
  } else {
    try { child.kill('SIGKILL') } catch {}
  }
}

function killRun(runId) {
  const child = runningProcs.get(runId)
  if (!child) return false
  runningProcs.delete(runId)
  killTree(child)
  return true
}

function killAllScripts() {
  for (const child of runningProcs.values()) killTree(child)
  runningProcs.clear()
}

module.exports = { getStatus, runCode, killRun, killAllScripts }
