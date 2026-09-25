// Lesson-notebook runtime. One Pyodide per worker; each notebook gets its own globals dict, so
// cells in one notebook share variables while different notebooks cannot see each other's.
// The page stops runaway code by terminating this worker, which discards every namespace.
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
let py, ready, helpers
const namespaces = new Map()

const HELPERS = `
import ast, base64, io, sys, traceback

def _ml_run(code, ns):
    """Run a cell like Jupyter: execute it, then show the repr of a final bare expression."""
    try:
        tree = ast.parse(code, '<cell>', 'exec')
        last = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last = ast.Expression(tree.body.pop().value)
        exec(compile(tree, '<cell>', 'exec'), ns)
        value = None
        if last is not None:
            v = eval(compile(last, '<cell>', 'eval'), ns)
            if v is not None:
                value = repr(v)
        return {'ok': True, 'value': value}
    except BaseException as e:
        # Keep only the frames from the learner's cell, so the traceback reads like ordinary Python.
        tb = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == '<cell>']
        text = ''.join(traceback.format_list(tb)) + ''.join(traceback.format_exception_only(type(e), e))
        return {'ok': False, 'ename': type(e).__name__, 'evalue': str(e), 'traceback': text}
    finally:
        sys.stdout.flush(); sys.stderr.flush()

def _ml_figures():
    """PNG data for every open matplotlib figure, then close them (only if matplotlib was used)."""
    if 'matplotlib.pyplot' not in sys.modules:
        return []
    plt = sys.modules['matplotlib.pyplot']
    out = []
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format='png', dpi=90, bbox_inches='tight')
        out.append(base64.b64encode(buf.getvalue()).decode())
    plt.close('all')
    return out
`

async function boot() {
  post({ type: 'status', state: 'loading', text: 'Downloading Python (about 10 MB, cached after the first time)…' })
  importScripts(PYODIDE + 'pyodide.js')
  py = await self.loadPyodide({ indexURL: PYODIDE })
  // A worker has no page to draw on: matplotlib must render to images.
  py.runPython("import os; os.environ['MPLBACKEND'] = 'Agg'")
  helpers = py.toPy({})
  py.runPython(HELPERS, { globals: helpers })
  post({ type: 'status', state: 'ready', text: 'Python ready.' })
}

function post(message) { self.postMessage(message) }

function namespace(id) {
  if (!namespaces.has(id)) namespaces.set(id, py.runPython("{'__name__': '__main__'}"))
  return namespaces.get(id)
}

self.onmessage = async ({ data }) => {
  if (data.type === 'reset') {
    namespaces.get(data.ns)?.destroy()
    namespaces.delete(data.ns)
    post({ type: 'reset-done', ns: data.ns })
    return
  }
  if (data.type !== 'run') return
  const { job, ns, code, importsFrom } = data
  try {
    ready ??= boot().catch(error => { ready = null; throw error })   // a failed download can be retried
    await ready
    post({ type: 'status', state: 'running', text: 'Running…', job })
    if (importsFrom) {
      // The learner's code, run from inside a string by the ladder checks: load what it imports.
      // A syntax error here is the learner's to see when the check runs, so it is ignored at this point.
      await py.loadPackagesFromImports(importsFrom).catch(() => {})
    }
    await py.loadPackagesFromImports(code, {
      messageCallback: text => /Loading|Loaded/.test(text) && post({ type: 'status', state: 'running', text: text.replace(/\s+/g, ' ').slice(0, 160), job }),
      errorCallback: text => post({ type: 'stream', job, name: 'stderr', text }),
    })
    py.setStdout({ batched: text => post({ type: 'stream', job, name: 'stdout', text }) })
    py.setStderr({ batched: text => post({ type: 'stream', job, name: 'stderr', text }) })
    const result = helpers.get('_ml_run')(code, namespace(ns))
    const r = result.toJs({ dict_converter: Object.fromEntries }); result.destroy()
    const figs = helpers.get('_ml_figures')()
    const figures = figs.toJs(); figs.destroy()
    post({ type: 'done', job, ...r, figures })
  } catch (error) {
    // Failures of the runtime itself (download, package loading), not of the learner's code.
    post({ type: 'done', job, ok: false, runtimeError: true, ename: 'RuntimeError', evalue: String(error?.message || error), traceback: String(error?.message || error) })
  }
}
