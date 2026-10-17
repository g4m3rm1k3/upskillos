// Shared by browser workers and reference-solution tests. Checks execute returned
// values; they do not inspect source keywords. Code runs only in a disposable worker.
export const OUTPUT_LIMIT = 12000
export function canonical(value) {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('Return a JSON-compatible result. Use a decimal string for large exact integers.')
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
export function runJavaScriptCases(code, cases) {
  let output = ''
  const write = (...values) => { if (output.length < OUTPUT_LIMIT) output = (output + values.map(v => typeof v === 'string' ? v : String(canonical(v))).join(' ') + '\n').slice(0, OUTPUT_LIMIT) }
  const console = { log: write, info: write, warn: write, error: write, table: write }
  const rows = []
  try {
    const solve = new Function('console', `"use strict";\n${code}\n;return typeof solve === 'function' ? solve : null;`)(console)
    if (!solve) throw new Error('Define a function named solve with the parameters in the starter.')
    for (const test of cases) {
      try {
        const actual = solve(...structuredClone(test.args))
        if (actual?.then) throw new Error('Return a synchronous result, not a Promise.')
        const shown = canonical(actual)
        rows.push({ passed: shown !== undefined && shown === canonical(test.expected), actual: String(shown).slice(0, 2000) })
      } catch (error) { rows.push({ passed: false, error: String(error.message || error).slice(0, 2000) }) }
    }
    return { rows, passed: rows.length > 0 && rows.every(row => row.passed), output }
  } catch (error) { return { rows, passed: false, output, error: String(error.message || error).slice(0, 2000) } }
}

export async function runPythonCases(py, code, cases) {
  let output = ''
  const write = text => { if (output.length < OUTPUT_LIMIT) output = (output + text + '\n').slice(0, OUTPUT_LIMIT) }
  py.setStdout({ batched: write }); py.setStderr({ batched: write })
  const scope = py.toPy({})
  try {
    await py.runPythonAsync(code, { globals: scope })
    scope.set('_dp_cases_json', JSON.stringify(cases))
    const serialized = await py.runPythonAsync(`
import json as _dp_json
_dp_rows = []
if not callable(globals().get('solve')):
    raise TypeError('Define a function named solve with the parameters in the starter.')
for _dp_case in _dp_json.loads(_dp_cases_json):
    try:
        _dp_actual = solve(*_dp_case['args'])
        _dp_shown = _dp_json.dumps(_dp_actual, sort_keys=True, separators=(',', ':'), allow_nan=False)
        _dp_expected = _dp_json.dumps(_dp_case['expected'], sort_keys=True, separators=(',', ':'), allow_nan=False)
        _dp_rows.append({'passed': _dp_shown == _dp_expected, 'actual': _dp_shown[:2000]})
    except Exception as _dp_error:
        _dp_rows.append({'passed': False, 'error': str(_dp_error)[:2000]})
_dp_json.dumps({'rows': _dp_rows, 'passed': bool(_dp_rows) and all(r['passed'] for r in _dp_rows)})
`, { globals: scope })
    return { ...JSON.parse(serialized), output }
  } catch (error) { return { passed: false, rows: [], output, error: String(error.message || error).trim().split('\n').slice(-4).join('\n').slice(0, 2000) } }
  finally { scope.destroy() }
}

// "Run": no grading. The learner's code runs top to bottom with its print / console.log output
// captured, then (if `args` is given and solve exists) solve(...args) is called once and its
// return value shown. Errors name the line in the learner's own code.
const display = value => {
  if (value === undefined) return 'undefined'
  if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value)
  try { return JSON.stringify(value) ?? String(value) } catch { return String(value) }
}
// V8 numbers Function-built code from the wrapper, three lines above the learner's first line.
export const jsErrorLine = error => { const m = /<anonymous>:(\d+):\d+/.exec(error?.stack ?? ''); return m ? Number(m[1]) - 3 : null }

export function runJavaScriptScratch(code, args) {
  let output = ''
  const write = (...values) => { if (output.length < OUTPUT_LIMIT) output = (output + values.map(v => (typeof v === 'string' ? v : display(v))).join(' ') + '\n').slice(0, OUTPUT_LIMIT) }
  const console = { log: write, info: write, warn: write, error: write, table: write, dir: write }
  try {
    const solve = new Function('console', `"use strict";\n${code}\n;return typeof solve === 'function' ? solve : null;`)(console)
    if (!args) return { output, called: false }
    if (!solve) return { output, called: false, error: 'There is no function named solve to call. Your code ran; its output is above.' }
    const value = solve(...structuredClone(args))
    return { output, called: true, returned: display(value).slice(0, 2000) }
  } catch (error) {
    const line = jsErrorLine(error)
    return { output, error: `${error.name ?? 'Error'}: ${error.message ?? error}${line && line > 0 ? ` (line ${line})` : ''}`.slice(0, 2000) }
  }
}

export async function runPythonScratch(py, code, args) {
  let output = ''
  const write = text => { if (output.length < OUTPUT_LIMIT) output = (output + text + '\n').slice(0, OUTPUT_LIMIT) }
  py.setStdout({ batched: write }); py.setStderr({ batched: write })
  const scope = py.toPy({})
  try {
    await py.runPythonAsync(code, { globals: scope })
    if (!args) return { output, called: false }
    scope.set('_dp_args_json', JSON.stringify(args))
    const result = await py.runPythonAsync(`
import json as _dp_json
if not callable(globals().get('solve')):
    _dp_out = None
else:
    _dp_out = repr(solve(*_dp_json.loads(_dp_args_json)))
_dp_out
`, { globals: scope })
    if (result === undefined || result === null) return { output, called: false, error: 'There is no function named solve to call. Your code ran; its output is above.' }
    return { output, called: true, returned: String(result).slice(0, 2000) }
  } catch (error) {
    // Keep the traceback lines that point into the learner's code ("<exec>"), and the message.
    const lines = String(error.message || error).trim().split('\n')
    const mine = lines.filter(l => l.includes('File "<exec>"')).slice(-2).map(l => l.trim().replace('File "<exec>", ', ''))
    return { output, error: [...mine, lines.at(-1)].join('\n').slice(0, 2000) }
  } finally { scope.destroy() }
}
