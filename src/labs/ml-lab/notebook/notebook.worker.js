// Lesson-notebook runtime. One Pyodide per worker; each notebook gets its own globals dict, so
// cells in one notebook share variables while different notebooks cannot see each other's.
// The page stops runaway code by terminating this worker, which discards every namespace.
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
let py, ready, helpers
const namespaces = new Map()
// Limits per run, so a runaway print loop or a huge figure cannot exhaust the page's memory.
const TEXT_LIMIT = 100000          // characters of printed output
const VALUE_LIMIT = 20000                 // characters of a final expression's repr
const FIGURE_LIMIT = 6                    // figures per cell
const FIGURE_PX = 1400                    // longest side of a figure, in pixels

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
                if len(value) > VALUE_LIMIT:
                    value = value[:VALUE_LIMIT] + f'\\n… (value cut at {VALUE_LIMIT:,} characters; print a slice to see more)'
        return {'ok': True, 'value': value}
    except BaseException as e:
        # Keep only the frames from the learner's cell, so the traceback reads like ordinary Python.
        tb = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == '<cell>']
        text = ''.join(traceback.format_list(tb)) + ''.join(traceback.format_exception_only(type(e), e))
        return {'ok': False, 'ename': type(e).__name__, 'evalue': str(e), 'traceback': text}
    finally:
        sys.stdout.flush(); sys.stderr.flush()

def _ml_describe(fig):
    """A short text description of a matplotlib figure, for its alt text: titles, axis labels,
    legend entries and what each panel contains."""
    def q(t):
        return '“' + t.strip() + '”'
    def plural(n, word):
        return f'{n} {word}' + ('' if n == 1 else 's')
    parts = []
    sup = getattr(fig, '_suptitle', None)
    if sup is not None and sup.get_text().strip():
        parts.append('Titled ' + q(sup.get_text()) + '.')
    axes = [ax for ax in fig.axes if ax.get_visible() and ax.get_label() != '<colorbar>']
    if len(axes) > 1:
        parts.append(plural(len(axes), 'panel') + '.')
    for i, ax in enumerate(axes):
        bits = []
        if ax.get_title().strip():
            bits.append('titled ' + q(ax.get_title()))
        xl, yl = ax.get_xlabel().strip(), ax.get_ylabel().strip()
        if xl or yl:
            bits.append('x axis ' + (q(xl) if xl else 'unlabelled') + ', y axis ' + (q(yl) if yl else 'unlabelled'))
        lines = [l for l in ax.get_lines() if l.get_visible()]
        points = sum(len(c.get_offsets()) for c in ax.collections if hasattr(c, 'get_offsets') and c.get_visible())
        bars = sum(1 for p in ax.patches if type(p).__name__ == 'Rectangle' and p.get_visible())
        contents = []
        if lines: contents.append(plural(len(lines), 'line'))
        if points: contents.append(plural(points, 'point'))
        if bars: contents.append(plural(bars, 'bar'))
        if ax.images: contents.append(plural(len(ax.images), 'image'))
        if contents: bits.append(', '.join(contents))
        leg = ax.get_legend()
        if leg is not None:
            labels = [t.get_text() for t in leg.get_texts() if t.get_text().strip()]
            if labels: bits.append('legend: ' + ', '.join(labels[:8]) + (' …' if len(labels) > 8 else ''))
        if bits:
            head = f'Panel {i + 1}: ' if len(axes) > 1 else ''
            s = '; '.join(bits)
            parts.append(head + s[0].upper() + s[1:] + '.')
    text = ' '.join(parts) or 'An empty figure.'
    return text[:600]

def _ml_figures():
    """PNG data for the open matplotlib figures (at most FIGURE_LIMIT, none longer than FIGURE_PX
    pixels on a side) with a text description of each, then close them all.
    Returns (images, descriptions, number left out)."""
    if 'matplotlib.pyplot' not in sys.modules:
        return [], [], 0
    plt = sys.modules['matplotlib.pyplot']
    nums = plt.get_fignums()
    out, about = [], []
    for num in nums[:FIGURE_LIMIT]:
        fig = plt.figure(num)
        try:
            about.append(_ml_describe(fig))
        except Exception:
            about.append('')
        dpi = min(90, FIGURE_PX / max(fig.get_size_inches()))
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight')
        out.append(base64.b64encode(buf.getvalue()).decode())
    plt.close('all')
    return out, about, max(0, len(nums) - FIGURE_LIMIT)
`

async function boot() {
  post({ type: 'status', state: 'loading', text: 'Downloading Python (about 10 MB, cached after the first time)…' })
  importScripts(PYODIDE + 'pyodide.js')
  py = await self.loadPyodide({ indexURL: PYODIDE })
  // A worker has no page to draw on: matplotlib must render to images.
  py.runPython("import os; os.environ['MPLBACKEND'] = 'Agg'")
  helpers = py.toPy({ VALUE_LIMIT, FIGURE_LIMIT, FIGURE_PX })
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
    // Package downloads (scikit-learn brings SciPy: tens of MB on a first visit) are reported as
    // 'loading'. The page starts a check's time limit at 'running', so a slow connection is never
    // mistaken for code that never ends.
    post({ type: 'status', state: 'loading', text: 'Loading the packages this code imports…', job })
    if (importsFrom) {
      // The learner's code, run from inside a string by the ladder checks: load what it imports.
      // A syntax error here is the learner's to see when the check runs, so it is ignored at this point.
      await py.loadPackagesFromImports(importsFrom).catch(() => {})
    }
    await py.loadPackagesFromImports(code, {
      messageCallback: text => /Loading|Loaded/.test(text) && post({ type: 'status', state: 'loading', text: text.replace(/\s+/g, ' ').slice(0, 160), job }),
      errorCallback: text => post({ type: 'stream', job, name: 'stderr', text }),
    })
    post({ type: 'status', state: 'running', text: 'Running…', job })
    let printed = 0
    const stream = name => ({ batched: text => {
      if (printed > TEXT_LIMIT) return
      printed += text.length + 1
      if (printed <= TEXT_LIMIT) post({ type: 'stream', job, name, text })
      else post({ type: 'stream', job, name: 'stderr', text: `… output stopped after ${TEXT_LIMIT.toLocaleString('en')} characters. The cell kept running; print less (for example a slice or a summary) to see it all.` })
    } })
    py.setStdout(stream('stdout'))
    py.setStderr(stream('stderr'))
    const result = helpers.get('_ml_run')(code, namespace(ns))
    const r = result.toJs({ dict_converter: Object.fromEntries }); result.destroy()
    const figs = helpers.get('_ml_figures')()
    const [figures, figureAlts, skipped] = figs.toJs(); figs.destroy()
    if (skipped) post({ type: 'stream', job, name: 'stderr', text: `${skipped} more figure${skipped > 1 ? 's were' : ' was'} not shown: a cell shows at most ${FIGURE_LIMIT}.` })
    post({ type: 'done', job, ...r, figures, figureAlts })
  } catch (error) {
    // Failures of the runtime itself (download, package loading), not of the learner's code.
    post({ type: 'done', job, ok: false, runtimeError: true, ename: 'RuntimeError', evalue: String(error?.message || error), traceback: String(error?.message || error) })
  }
}
