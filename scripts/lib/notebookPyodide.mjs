// Runs Notebook Lab cells in Node the way PythonNotebook runs them in the
// browser: same Pyodide, same preloaded packages, same output capture and the
// same text under a cell. Shared by scripts/check_notebook_series.mjs and
// scripts/make_type_along.mjs, so both agree on what a cell prints.
import { loadPyodide } from 'pyodide'

// The text the notebook shows under a cell: printed text, then the last
// expression's value. An opencalc figure is drawn, not shown as text: a
// returned one, or else the last printed one.
export function notebookOutput(printed, resultStr) {
  const isFigure = s => /^\{"type":\s*"opencalc_figure"/.test(s.trim())
  let text = printed
  if (!isFigure(resultStr)) {
    const lines = text.split('\n')
    const idx = lines.map(isFigure).lastIndexOf(true)
    if (idx !== -1) { lines.splice(idx, 1); text = lines.join('\n') }
  }
  return [text.trimEnd(), resultStr && !isFigure(resultStr) ? resultStr : ''].filter(Boolean).join('\n')
}

export async function createNotebookRunner() {
  const py = await loadPyodide()
  // Same capture as PythonNotebook: raw writes, flushed after every run, so
  // output without a trailing new line (print(x, end=" ")) is not lost.
  let captured = ''
  const decoder = new TextDecoder()
  const capture = { write: buf => { captured += decoder.decode(buf, { stream: true }); return buf.length } }
  py.setStdout(capture)
  py.setStderr(capture)
  const flushOutput = () => py.runPythonAsync("__import__('sys').stdout.flush(); __import__('sys').stderr.flush()")
  // Same packages PythonNotebook preloads (so code that relies on one without
  // importing it, like sklearn's as_frame=True needing pandas, behaves the
  // same), and the same matplotlib setup: Agg backend, plt.show() a no-op (the
  // notebook captures open figures itself after each cell).
  await py.loadPackage(['numpy', 'pandas', 'matplotlib', 'scikit-learn', 'scipy', 'statsmodels', 'sqlite3', 'sympy'], { messageCallback: () => {} })
  await py.runPythonAsync(`
import warnings
# scikit-learn's threadpoolctl calls a Pyodide API deprecated in 0.29; the
# RuntimeWarning it prints on first use (e.g. KMeans) means nothing to learners.
warnings.filterwarnings('ignore', message='JsProxy.as_object_map', category=RuntimeWarning)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.show = lambda *_a, **_k: None
`)

  async function run(code, ns) {
    await py.loadPackagesFromImports(code, { messageCallback: () => {} })
    captured = ''
    let result
    try {
      result = await py.runPythonAsync(code, { globals: ns })
    } finally {
      await flushOutput()
    }
    const shown = result !== undefined && result !== null
    const output = notebookOutput(captured, shown ? String(result) : '')
    if (result?.destroy) result.destroy()
    return { stdout: captured, shown, output }
  }

  // How many matplotlib figures the cell left open (the notebook draws them); closes them.
  async function figuresOpen(ns) {
    return py.runPythonAsync(`
import sys as _sys
_n = 0
if 'matplotlib.pyplot' in _sys.modules:
    _plt = _sys.modules['matplotlib.pyplot']
    _n = len(_plt.get_fignums())
    _plt.close('all')
_n`, { globals: ns })
  }

  return { py, run, figuresOpen, newNamespace: () => py.globals.get('dict')() }
}
