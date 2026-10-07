// runtimes/notebook-kernel.cjs
// A Python kernel for the notebooks, on the learner's own Python: one process that stays
// alive between cells, so names defined in one cell exist in the next (like Jupyter). It
// exists for what the browser's Pyodide can't do: packages Pyodide doesn't have
// (TensorFlow, Keras, gymnasium, PyTorch), long training runs that would freeze a browser
// tab, and importing the learner's own files (a course's TreasureMaze.py) from a folder.
//
// The learner's Python, not the app's private one (runtimes/python.cjs): the point is the
// packages they installed. The kernel runs in a working folder they choose, so imports and
// open() find their files.
//
// Protocol: one JSON object per line. The app sends {"id", "code"}; the kernel answers with
// {"id", "type": "stream", "text"} while the cell runs (output arrives as it is printed),
// then any {"type": "figure", "png"}, then {"type": "result", "text"} for the cell's last
// expression, or {"type": "error", "text"}, and always {"type": "done"} last. The kernel
// writes its messages to the stdout it started with; the cell's print() goes to a writer
// that turns text into stream messages, so the two never mix.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { spawn, execFile } = require('node:child_process')
const { promisify } = require('node:util')
const readline = require('node:readline')
const { systemPython } = require('./_toolchains.cjs')

const execFileAsync = promisify(execFile)

const KERNEL_PY = String.raw`
import ast, base64, builtins, io, json, linecache, sys, traceback, warnings

_out = sys.stdout
def _send(msg):
    _out.write(json.dumps(msg) + "\n")
    _out.flush()

class _Stream(io.TextIOBase):
    """print() inside a cell: each write becomes a stream message, sent straight away."""
    def __init__(self, cell):
        self.cell = cell
    def writable(self):
        return True
    def write(self, text):
        if text:
            _send({"id": self.cell, "type": "stream", "text": text})
        return len(text)
    def flush(self):
        pass

def _no_input(prompt=""):
    raise RuntimeError("input() can't read from the notebook: put the value in a variable instead")

builtins.input = _no_input
warnings.filterwarnings("ignore", message=".*non-interactive.*")   # plt.show() under the Agg backend
namespace = {"__name__": "__main__"}

def _figures(cell):
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format="png", dpi=90, bbox_inches="tight")
        _send({"id": cell, "type": "figure", "png": base64.b64encode(buf.getvalue()).decode()})
    plt.close("all")

def _shown(value):
    """A cell's last value as the browser notebook shows it, so a lesson's expected output
    matches either way: Pyodide hands values to JavaScript first, so text has no quotes,
    True is "true" and a whole float has no ".0"; anything else shows as str() does."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and value.is_integer() and abs(value) < 1e21:
        return str(int(value))
    return value if isinstance(value, str) else str(value)

def _run(cell, code):
    sys.stdout = sys.stderr = _Stream(cell)
    # So tracebacks can show the cell's own lines.
    linecache.cache["<cell>"] = (len(code), None, code.splitlines(True), "<cell>")
    try:
        tree = ast.parse(code, "<cell>", "exec")
        last = tree.body[-1] if tree.body and isinstance(tree.body[-1], ast.Expr) else None
        if last is not None:
            tree.body = tree.body[:-1]
        exec(compile(tree, "<cell>", "exec"), namespace)
        value = None
        if last is not None:
            value = eval(compile(ast.Expression(last.value), "<cell>", "eval"), namespace)
        _figures(cell)
        if value is not None:
            _send({"id": cell, "type": "result", "text": _shown(value)})
    except BaseException as err:
        # Skip the kernel's own frames: the traceback starts at the cell's first line that ran
        # (a SyntaxError has none, and shows just the error and where it is).
        tb = err.__traceback__
        while tb is not None and tb.tb_frame.f_code.co_filename != "<cell>":
            tb = tb.tb_next
        text = "".join(traceback.format_exception(type(err), err, tb)).rstrip()
        _send({"id": cell, "type": "error", "text": text})
    finally:
        sys.stdout, sys.stderr = _out, sys.__stderr__
        _send({"id": cell, "type": "done"})

_send({"type": "ready", "version": sys.version.split()[0], "executable": sys.executable})
for line in sys.stdin:
    if line.strip():
        msg = json.loads(line)
        _run(msg["id"], msg["code"])
`

let kernel = null          // { proc, pending: Map<id, {resolve, messages}>, info, cwd }
let nextId = 1

function kernelFile(app) {
  return path.join(app.getPath('userData'), 'notebook-kernel', 'kernel.py')
}

// The Python and folder the learner chose, remembered between sessions.
function settingsFile(app) {
  return path.join(app.getPath('userData'), 'notebook-kernel', 'settings.json')
}
async function readSettings(app) {
  try { return JSON.parse(await fs.readFile(settingsFile(app), 'utf8')) } catch { return {} }
}
async function writeSettings(app, change) {
  const next = { ...(await readSettings(app)), ...change }
  await fs.mkdir(path.dirname(settingsFile(app)), { recursive: true })
  await fs.writeFile(settingsFile(app), JSON.stringify(next, null, 2), 'utf8')
  return next
}

// ── The app's own notebook environment ───────────────────────────────────────
// A virtual environment the app creates from the learner's Python and fills with what the
// notebooks need, so TensorFlow and gymnasium work without the learner managing installs
// (and without touching any other Python they have). gymnasium[classic-control] brings
// pygame, for CartPole's window; Keras comes with TensorFlow.
const ENV_PACKAGES = ['numpy', 'pandas', 'matplotlib', 'scikit-learn', 'scipy', 'gymnasium[classic-control]', 'tensorflow']
const ENV_CHECK = 'import numpy, pandas, matplotlib, sklearn, gymnasium, tensorflow; print("tensorflow", tensorflow.__version__, "gymnasium", gymnasium.__version__)'
let setupRun = null   // the setup in progress, so a second request waits for it

function envDir(app) {
  return path.join(app.getPath('userData'), 'notebook-kernel', 'env')
}
function envPython(app) {
  return process.platform === 'win32' ? path.join(envDir(app), 'Scripts', 'python.exe') : path.join(envDir(app), 'bin', 'python')
}

async function versionOf(exe) {
  try {
    const { stdout } = await execFileAsync(exe, ['-c', 'import sys; print("%d.%d.%d" % sys.version_info[:3])'], { windowsHide: true, timeout: 15000 })
    return stdout.trim()
  } catch { return null }
}

/** Runs a command, sending its output as setup messages line by line; resolves with its exit code. */
function streamed(exe, args, emit) {
  return new Promise((resolve) => {
    const proc = spawn(exe, args, { windowsHide: true, env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', PIP_DISABLE_PIP_VERSION_CHECK: '1' } })
    const send = (chunk) => emit({ type: 'setup', text: String(chunk) })
    proc.stdout.on('data', send)
    proc.stderr.on('data', send)
    proc.on('error', (err) => { send(`${err.message}\n`); resolve(-1) })
    proc.on('exit', (code) => resolve(code ?? -1))
  })
}

/** Creates the environment and installs the packages (a download of about 1 GB, mostly
 *  TensorFlow), then checks they import. Safe to run again: it finishes a broken setup. */
async function setupEnvironment(app, emit) {
  if (setupRun) return setupRun
  setupRun = (async () => {
    const say = (text) => emit({ type: 'setup', text })
    const base = await systemPython()
    if (!base) return { ok: false, reason: 'No Python 3 found to build the environment from. Install Python from python.org (tick "Add python.exe to PATH"), then try again.' }
    await writeSettings(app, { envReady: false })
    say(`Creating a Python ${base.version} environment in ${envDir(app)}\n`)
    if (await streamed(base.exe, ['-m', 'venv', envDir(app)], emit) !== 0) return { ok: false, reason: 'Could not create the virtual environment (see the log).' }
    const py = envPython(app)
    say('\nUpdating pip\n')
    await streamed(py, ['-m', 'pip', 'install', '--upgrade', 'pip'], emit)
    say(`\nInstalling ${ENV_PACKAGES.join(', ')} (about 1 GB; this takes a few minutes)\n`)
    if (await streamed(py, ['-m', 'pip', 'install', ...ENV_PACKAGES], emit) !== 0) return { ok: false, reason: 'Installing the packages failed (see the log). Check the internet connection and try again.' }
    say('\nChecking that everything imports\n')
    if (await streamed(py, ['-c', ENV_CHECK], emit) !== 0) return { ok: false, reason: 'The packages installed but did not import (see the log).' }
    await writeSettings(app, { envReady: true })
    say('\nThe notebook environment is ready.\n')
    // The next cell runs in the new environment.
    stop()
    return { ok: true }
  })()
  try { return await setupRun } finally { setupRun = null }
}

/** Which Python runs the cells: one the learner chose, else the app's environment once it is
 *  set up, else the one on PATH. */
async function pythonFor(app) {
  const { python, envReady } = await readSettings(app)
  if (python) {
    const version = await versionOf(python)
    if (version) return { exe: python, version, chosen: true }
    // Moved or deleted: fall through.
  }
  if (envReady) {
    const version = await versionOf(envPython(app))
    if (version) return { exe: envPython(app), version, chosen: false, appEnv: true }
  }
  const system = await systemPython()
  return system ? { ...system, chosen: false } : null
}

async function start(app, emit) {
  if (kernel) return kernel.info
  const python = await pythonFor(app)
  if (!python) return { ok: false, reason: 'No Python 3 found on this computer. Install it from python.org (tick "Add python.exe to PATH"), or choose a python.exe, then try again.' }
  const file = kernelFile(app)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, KERNEL_PY, 'utf8')
  const cwd = (await readSettings(app)).folder ?? app.getPath('documents')
  const proc = spawn(python.exe, ['-u', file], {
    cwd,
    windowsHide: true,
    // Agg: figures are drawn to images and sent back, not opened as windows.
    env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8', MPLBACKEND: 'Agg' },
  })
  const state = { proc, pending: new Map(), info: null, cwd, stderr: '' }
  kernel = state
  const ready = new Promise((resolve) => {
    const lines = readline.createInterface({ input: proc.stdout })
    lines.on('line', (line) => {
      let msg
      try { msg = JSON.parse(line) } catch { return }
      if (msg.type === 'ready') {
        state.info = { ok: true, version: msg.version, executable: msg.executable, cwd }
        resolve(state.info)
        return
      }
      const job = state.pending.get(msg.id)
      if (!job) return
      if (msg.type !== 'done') emit({ cellRun: msg.id, ...msg })
      job.messages.push(msg)
      if (msg.type === 'done') { state.pending.delete(msg.id); job.resolve({ ok: true, messages: job.messages }) }
    })
  })
  proc.stderr.on('data', (chunk) => { state.stderr = (state.stderr + chunk).slice(-4000) })
  proc.on('exit', (code) => {
    // A crash (or Stop) ends every cell still waiting.
    for (const job of state.pending.values()) job.resolve({ ok: false, reason: `Python stopped (exit code ${code}).${state.stderr ? '\n' + state.stderr.trim() : ''}` })
    state.pending.clear()
    if (kernel === state) kernel = null
  })
  const timeout = new Promise((resolve) => setTimeout(() => resolve({ ok: false, reason: `Python didn't start.${state.stderr ? '\n' + state.stderr.trim() : ''}` }), 20000))
  const info = await Promise.race([ready, timeout])
  if (!info.ok) stop()
  return info
}

/** Runs one cell; resolves when it finishes, with every message it sent. */
async function run(app, code, emit) {
  const info = await start(app, emit)
  if (!info.ok) return info
  const id = nextId++
  const state = kernel
  const result = new Promise((resolve) => state.pending.set(id, { resolve, messages: [] }))
  state.proc.stdin.write(JSON.stringify({ id, code }) + '\n')
  return { ...(await result), runId: id }
}

function stop() {
  if (!kernel) return
  const { proc } = kernel
  kernel = null
  try { proc.kill() } catch { /* already gone */ }
}

/** Forgets every variable: a fresh Python process (also how a runaway cell is stopped). */
async function restart(app, emit) {
  stop()
  return start(app, emit)
}

async function status(app) {
  const python = await pythonFor(app)
  const settings = await readSettings(app)
  return {
    python: python ? { exe: python.exe, version: python.version, chosen: python.chosen, appEnv: !!python.appEnv } : null,
    running: !!kernel?.info,
    cwd: kernel?.cwd ?? settings.folder ?? app.getPath('documents'),
    env: { ready: !!settings.envReady, installing: !!setupRun, dir: envDir(app), packages: ENV_PACKAGES },
  }
}

/** The folder cells run in: imports and open() find files there. Restarts the kernel. */
async function chooseFolder(app, dialog, window, emit) {
  const picked = await dialog.showOpenDialog(window, { title: 'Folder the notebook runs in', properties: ['openDirectory'] })
  if (picked.canceled || !picked.filePaths[0]) return { ok: false, canceled: true }
  await writeSettings(app, { folder: picked.filePaths[0] })
  return restart(app, emit)
}

/** Which python.exe runs the cells (a virtual environment's, say, with TensorFlow in it). */
async function choosePython(app, dialog, window, emit) {
  const picked = await dialog.showOpenDialog(window, {
    title: "Python to run the notebook with (python.exe, e.g. in a virtual environment's Scripts folder)",
    properties: ['openFile'],
    filters: process.platform === 'win32' ? [{ name: 'Python', extensions: ['exe'] }] : [],
  })
  if (picked.canceled || !picked.filePaths[0]) return { ok: false, canceled: true }
  await writeSettings(app, { python: picked.filePaths[0] })
  return restart(app, emit)
}

/** Back to the Python on PATH. */
async function useSystemPython(app, emit) {
  await writeSettings(app, { python: null })
  return restart(app, emit)
}

module.exports = { run, restart, stop, status, chooseFolder, choosePython, useSystemPython, setupEnvironment }
