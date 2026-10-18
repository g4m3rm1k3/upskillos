// Runs the learner's Python, in a worker (runner.js) in the page and directly in tests.
// The program is: the prelude (constants, helpers, earlier pieces), then the learner's code,
// then either the hidden cases (Run & check) or one call they chose (Run). Answers are compared
// after _ml_norm, so a tuple and a list, or 0.30000000000000004 and 0.3, count as the same.
import { NORMALIZE } from '../python/pieces.js'

export const OUTPUT_LIMIT = 12000

function capture(py) {
  let output = ''
  const write = text => { if (output.length < OUTPUT_LIMIT) output = (output + text + '\n').slice(0, OUTPUT_LIMIT) }
  py.setStdout({ batched: write }); py.setStderr({ batched: write })
  return () => output
}

// Keep the traceback lines that point into the learner's code ("<exec>"), and the message.
export function pythonError(error) {
  const lines = String(error?.message || error).trim().split('\n')
  const mine = lines.filter(l => l.includes('File "<exec>"')).slice(-2).map(l => l.trim().replace('File "<exec>", ', ''))
  return [...mine, lines.at(-1)].join('\n').slice(0, 2000)
}

async function setUp(py, scope, prelude) {
  await py.runPythonAsync(NORMALIZE, { globals: scope })
  if (prelude) await py.runPythonAsync(prelude, { globals: scope })
}

export async function runPythonCases(py, { prelude, code, cases }) {
  const output = capture(py)
  const scope = py.toPy({})
  try {
    await setUp(py, scope, prelude)
    try { await py.runPythonAsync(code, { globals: scope }) } catch (error) { return { passed: false, rows: [], output: output(), error: pythonError(error) } }
    scope.set('_ml_cases_json', JSON.stringify(cases.map(c => ({ call: c.call, expected: c.expected }))))
    const serialized = await py.runPythonAsync(`
import json as _ml_json
_ml_rows = []
for _ml_case in _ml_json.loads(_ml_cases_json):
    try:
        _ml_actual = eval(_ml_case['call'])
        _ml_ok = _ml_same(_ml_norm(_ml_actual), _ml_norm(_ml_case['expected']))
        _ml_rows.append({'passed': bool(_ml_ok), 'actual': repr(_ml_actual)[:1500]})
    except Exception as _ml_error:
        _ml_rows.append({'passed': False, 'error': type(_ml_error).__name__ + ': ' + str(_ml_error)[:1500]})
_ml_json.dumps({'rows': _ml_rows, 'passed': bool(_ml_rows) and all(r['passed'] for r in _ml_rows)})
`, { globals: scope })
    return { ...JSON.parse(serialized), output: output() }
  } catch (error) { return { passed: false, rows: [], output: output(), error: pythonError(error) } }
  finally { scope.destroy() }
}

// "Run": not graded. The code runs top to bottom with its prints shown; then `call` (a Python
// expression such as legal_moves(parse_map(TINY), (0, 0))) is evaluated and its repr shown.
export async function runPythonScratch(py, { prelude, code, call }) {
  const output = capture(py)
  const scope = py.toPy({})
  try {
    await setUp(py, scope, prelude)
    await py.runPythonAsync(code, { globals: scope })
    if (!call?.trim()) return { output: output(), called: false }
    scope.set('_ml_call', call)
    const shown = await py.runPythonAsync('repr(eval(_ml_call))', { globals: scope })
    return { output: output(), called: true, returned: String(shown).slice(0, 4000) }
  } catch (error) { return { output: output(), error: pythonError(error) } }
  finally { scope.destroy() }
}

// The same rounding in JavaScript, for writing expected answers (tests use it too).
export function norm(x) {
  if (x === null || typeof x === 'boolean' || typeof x === 'string') return x
  if (typeof x === 'number') { const y = Math.round(x * 1e6) / 1e6; return Object.is(y, -0) ? 0 : y }
  if (Array.isArray(x)) return x.map(norm)
  if (typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, norm(v)]))
  return String(x)
}
