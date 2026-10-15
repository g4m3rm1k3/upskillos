/**
 * Python execution tracer for CodeLens.
 * Runs user code inside Pyodide with sys.settrace(), producing the same
 * event-stream format the JS interpreter emits. Returns { events, output, error }.
 */
import { getPyodide } from '../../../../utils/pyodideRuntime.js'
import type { ExecutionResult } from '../types'

const CL = '###CL###'
const MAX_EVENTS = 8000

// ── Python harness (injected as a string, runs inside Pyodide) ────────────────
const HARNESS = `
import sys as _sys, json as _json

_CL = '###CL###'
_MAX = ${MAX_EVENTS}
_cnt = [0]

# Names that should never appear in the stack or trigger events
_SKIP = frozenset({
    '_trace_fn', '_serialize', '_stack', '_args', '_emit',
    '<listcomp>', '<dictcomp>', '<genexpr>', '<setcomp>',
})

def _serialize(v, d=0):
    if d > 2:
        return '...'
    if v is None or isinstance(v, bool):
        return v
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        if v != v or v == float('inf') or v == float('-inf'):
            return str(v)
        return v
    if isinstance(v, str):
        return v if len(v) <= 48 else v[:47] + '\\u2026'
    if isinstance(v, (list, tuple)):
        return {'$type': 'list', '$len': len(v)}
    if isinstance(v, dict):
        return {'$type': 'dict', '$len': len(v)}
    return {'$type': type(v).__name__}

def _stack(frame):
    frames = []
    f = frame
    while f is not None:
        n = f.f_code.co_name
        if n not in _SKIP:
            locs = {}
            # Module level: read the globals. On Python 3.12, reading f_locals here sets a
            # running comprehension's loop variables to None (see codelens_tracer.py, frame_vars).
            for k, v in (f.f_globals if n == '<module>' else f.f_locals).items():
                if not k.startswith('_'):
                    try:
                        locs[k] = _serialize(v)
                    except Exception:
                        pass
            frames.append({
                'name': '(global)' if n == '<module>' else n,
                'line': f.f_lineno,
                'locals': locs,
            })
        f = f.f_back
    frames.reverse()   # outermost first — matches JS interpreter convention
    return frames

def _args(frame):
    try:
        import inspect as _i
        ai = _i.getargvalues(frame)
        return [_serialize(frame.f_locals.get(a)) for a in ai.args[:5]]
    except Exception:
        return []

def _emit(obj):
    if _cnt[0] >= _MAX:
        return
    _cnt[0] += 1
    try:
        print(_CL + _json.dumps(obj, ensure_ascii=False))
    except Exception:
        pass

def _trace_fn(frame, event, arg):
    name = frame.f_code.co_name
    if name in _SKIP:
        return _trace_fn
    s = _stack(frame)
    ln = frame.f_lineno
    if event == 'call':
        _emit({
            'type': 'function_call',
            'functionName': name if name != '<module>' else '(global)',
            'args': _args(frame),
            'line': ln,
            'sourceLocation': {'line': ln},
            'stackSnapshot': s,
        })
    elif event == 'return':
        _emit({
            'type': 'function_return',
            'functionName': name if name != '<module>' else '(global)',
            'returnValue': _serialize(arg),
            'line': ln,
            'sourceLocation': {'line': ln},
            'stackSnapshot': s,
        })
    elif event == 'line':
        _emit({
            'type': 'statement_enter',
            'line': ln,
            'sourceLocation': {'line': ln},
            'stackSnapshot': s,
        })
    return _trace_fn

_sys.settrace(_trace_fn)
try:
    exec(compile(_user_code_, '<codelens>', 'exec'), {'__name__': '__main__'})
except SystemExit:
    pass
except Exception as _e:
    import traceback as _tb
    _emit({
        'type': 'error_thrown',
        'errorType': type(_e).__name__,
        'message': str(_e),
        'line': None,
        'sourceLocation': None,
        'stackSnapshot': [],
    })
finally:
    _sys.settrace(None)
`

// ── Exported runner ───────────────────────────────────────────────────────────

export async function runPython(source: string): Promise<ExecutionResult> {
  const pyodide = await getPyodide()

  const events: ExecutionResult['events'] = []
  const output: string[] = []

  pyodide.setStdout({
    batched: (text: string) => {
      for (const line of text.split('\n')) {
        if (!line) continue
        if (line.startsWith(CL)) {
          try { events.push(JSON.parse(line.slice(CL.length))) } catch {}
        } else {
          output.push(line)
        }
      }
    },
  })

  pyodide.setStderr({
    batched: (text: string) => {
      for (const line of text.split('\n')) {
        if (line.trim()) output.push(`[error] ${line}`)
      }
    },
  })

  pyodide.globals.set('_user_code_', source)

  let error: ExecutionResult['error'] = null
  try {
    await pyodide.runPythonAsync(HARNESS)
  } catch (e) {
    const msg = String(e)
    if (!/SystemExit/.test(msg)) {
      error = { type: 'PythonError', message: msg }
    }
  }

  return { events, output, error }
}
