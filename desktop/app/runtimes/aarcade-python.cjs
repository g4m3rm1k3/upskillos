// A-Arcade Python: runs a learner's real Python program one line at a time.
//
// The lab has its own virtual environment (<appData>/UpSkillOS/aarcade-python/venv) with NumPy, Gymnasium
// and the CPU build of PyTorch, separate from the notebooks' environment. One long-lived Python
// process runs aarcade_stepper.py: the program is paused inside it between commands, so stepping
// is live, not a replay. Commands and replies are JSON lines (see aarcade_stepper.py).
const path = require('node:path')
const fs = require('node:fs/promises')
const readline = require('node:readline')
const { spawn } = require('node:child_process')
const { systemPython } = require('./_toolchains.cjs')

// The CPU build of PyTorch: a few hundred MB instead of several GB, and these networks are tiny.
const PACKAGES = [['numpy', 'gymnasium[classic-control]'], ['torch', '--index-url', 'https://download.pytorch.org/whl/cpu']]
const CHECK = 'import numpy, gymnasium, torch; print("numpy", numpy.__version__, "· gymnasium", gymnasium.__version__, "· torch", torch.__version__)'

// A fixed place, not userData: run from source the app's data folder is "Electron", packaged it
// is "UpSkillOS", and the ~300 MB environment shouldn't be downloaded twice.
const dir = app => path.join(app.getPath('appData'), 'UpSkillOS', 'aarcade-python')
const venvPython = app => path.join(dir(app), 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
// One thread for NumPy and PyTorch: a training run must never freeze the learner's PC.
const ENV = { PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', PIP_DISABLE_PIP_VERSION_CHECK: '1', OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1' }

function streamed(exe, args, emit) {
  return new Promise(resolve => {
    const proc = spawn(exe, args, { windowsHide: true, env: { ...process.env, ...ENV } })
    const send = chunk => emit({ type: 'setup', text: String(chunk) })
    proc.stdout.on('data', send)
    proc.stderr.on('data', send)
    proc.on('error', err => { send(`${err.message}\n`); resolve(-1) })
    proc.on('exit', code => resolve(code ?? -1))
  })
}

function check(exe) {
  return new Promise(resolve => {
    const proc = spawn(exe, ['-c', CHECK], { windowsHide: true, env: { ...process.env, ...ENV } })
    let out = ''
    proc.stdout.on('data', d => { out += d })
    proc.on('error', () => resolve(null))
    proc.on('exit', code => resolve(code === 0 ? out.trim() : null))
  })
}

/** Whether the lab's environment exists and imports, with its package versions. */
async function status(app) {
  const versions = await check(venvPython(app))
  return { ready: !!versions, versions, folder: dir(app) }
}

let setupRun = null
/** Creates the environment and installs NumPy, Gymnasium and PyTorch (CPU). Safe to run again. */
async function setup(app, emit) {
  if (setupRun) return setupRun
  setupRun = (async () => {
    const say = text => emit({ type: 'setup', text })
    const base = await systemPython()
    if (!base) return { ok: false, reason: 'No Python 3 found to build the environment from. Install Python from python.org (tick "Add python.exe to PATH"), then try again.' }
    stop()
    say(`Creating a Python ${base.version} environment in ${path.join(dir(app), 'venv')}\n`)
    if (await streamed(base.exe, ['-m', 'venv', path.join(dir(app), 'venv')], emit) !== 0) return { ok: false, reason: 'Could not create the virtual environment (see the log).' }
    const py = venvPython(app)
    await streamed(py, ['-m', 'pip', 'install', '--upgrade', 'pip'], emit)
    for (const args of PACKAGES) {
      say(`\nInstalling ${args[0]}${args.length > 2 ? ` ${args[1]} (CPU build)` : ` and ${args[1]}`}\n`)
      if (await streamed(py, ['-m', 'pip', 'install', ...args], emit) !== 0) return { ok: false, reason: 'Installing the packages failed (see the log). Check the internet connection and try again.' }
    }
    const versions = await check(py)
    if (!versions) return { ok: false, reason: 'The packages installed but did not import (see the log).' }
    say(`\nReady: ${versions}\n`)
    return { ok: true, versions }
  })()
  try { return await setupRun } finally { setupRun = null }
}

let stepper = null   // { proc, pending: Map<id, resolve>, info }
let nextId = 1

async function start(app) {
  if (stepper) return stepper.info
  const exe = venvPython(app)
  try { await fs.access(exe) } catch { return { ok: false, reason: 'The A-Arcade Python environment isn\'t set up yet.' } }
  const file = path.join(dir(app), 'aarcade_stepper.py')
  await fs.mkdir(dir(app), { recursive: true })
  await fs.writeFile(file, await fs.readFile(path.join(__dirname, 'aarcade_stepper.py'), 'utf8'), 'utf8')
  const proc = spawn(exe, ['-u', file], { windowsHide: true, cwd: dir(app), env: { ...process.env, ...ENV, AARCADE_PROGRAM_DIR: path.join(dir(app), 'program') } })
  const state = { proc, pending: new Map(), info: null, stderr: '' }
  stepper = state
  const ready = new Promise(resolve => {
    readline.createInterface({ input: proc.stdout }).on('line', line => {
      let msg
      try { msg = JSON.parse(line) } catch { return }
      if (msg.type === 'ready') { state.info = { ok: true, version: msg.version, executable: msg.executable }; resolve(state.info); return }
      const job = state.pending.get(msg.id)
      if (job) { state.pending.delete(msg.id); job(msg) }
    })
  })
  proc.stderr.on('data', chunk => { state.stderr = (state.stderr + chunk).slice(-4000) })
  proc.on('exit', code => {
    for (const job of state.pending.values()) job({ type: 'error', error: `Python stopped (exit code ${code}).${state.stderr ? `\n${state.stderr.trim()}` : ''}` })
    state.pending.clear()
    if (stepper === state) stepper = null
  })
  const timeout = new Promise(resolve => setTimeout(() => resolve({ ok: false, reason: `Python didn't start.${state.stderr ? `\n${state.stderr.trim()}` : ''}` }), 30000))
  const info = await Promise.race([ready, timeout])
  if (!info.ok) stop()
  return info
}

/** Sends one command to the stepper and resolves with its reply. */
async function send(app, command) {
  const info = await start(app)
  if (!info.ok) return { type: 'error', error: info.reason }
  const id = nextId++
  const state = stepper
  const reply = new Promise(resolve => state.pending.set(id, resolve))
  state.proc.stdin.write(JSON.stringify({ ...command, id }) + '\n')
  return reply
}

function stop() {
  if (!stepper) return
  const { proc } = stepper
  stepper = null
  try { proc.kill() } catch { /* already gone */ }
}

/** Ends the Python process (also how a long run is interrupted); the next command starts a new one. */
function restart() { stop(); return { ok: true } }

module.exports = { status, setup, send, restart, stop }
