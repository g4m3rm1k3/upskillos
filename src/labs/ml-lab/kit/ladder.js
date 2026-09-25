// Coding ladders: the pure parts (no React, no worker), so they can be tested and verified with a
// local Python. A ladder takes one skill from tracing a worked example to solving a fresh problem
// and returning to it later. See Ladder.jsx for the steps and LessonFlow for placing one.

// Small seeded generator (mulberry32): the same seed always gives the same fresh problem.
export function rng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: list => list[Math.floor(next() * list.length)],
    shuffle: list => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]] } return out },
  }
}

export const MARKER = '@@LADDER@@'

// Python that runs the learner's code in a fresh dictionary (never the notebook's variables), then
// calls `fn` on each case and prints one JSON line after MARKER. The cases never appear in anything
// the learner sees, and expected values are not sent to Python at all: grading happens in JS.
// `args` names the case fields passed, in order, as float arrays.
// `ints` names arguments passed as Python ints (a count such as k), or integer arrays (a list of lags), not float arrays.
export function buildCheck(source, { fn, args, cases, ints = [] }) {
  const payload = JSON.stringify(cases.map(c => args.map(a => c[a])))
  const intMask = JSON.stringify(args.map(a => ints.includes(a)))
  return `import json as _json, traceback as _tb
import numpy as _np
_src = ${JSON.stringify(source)}
_ns = {'__name__': '__main__'}
_out = {'ok': True}
try:
    exec(compile(_src, '<your code>', 'exec'), _ns)
except BaseException as _e:
    _frames = [f for f in _tb.extract_tb(_e.__traceback__) if f.filename == '<your code>']
    _out = {'ok': False, 'error': ''.join(_tb.format_list(_frames)) + ''.join(_tb.format_exception_only(type(_e), _e))}
if _out['ok']:
    _f = _ns.get(${JSON.stringify(fn)})
    if not callable(_f):
        _out['missing'] = ${JSON.stringify(fn)}
    else:
        _cases = []
        for _raw in _json.loads(${JSON.stringify(payload)}):
            _in = [((_np.array(a, dtype=int) if isinstance(a, list) else int(a)) if _is_int else _np.array(a, dtype=float)) for a, _is_int in zip(_raw, _json.loads(${JSON.stringify(intMask)}))]
            _copies = [a.copy() if hasattr(a, 'copy') else a for a in _in]
            try:
                _v = _f(*_in)
                _r = {'mutated': not all(_np.array_equal(a, b, equal_nan=True) for a, b in zip(_in, _copies))}   # NaN inputs stay equal to themselves
                if _v is None:
                    _r['none'] = True
                else:
                    _a = _np.asarray(_v, dtype=float)
                    _r['shape'] = list(_a.shape)
                    _r['value'] = _a.tolist()
                _cases.append(_r)
            except BaseException as _e:
                _frames = [f for f in _tb.extract_tb(_e.__traceback__) if f.filename == '<your code>']
                _cases.append({'error': ''.join(_tb.format_list(_frames)) + ''.join(_tb.format_exception_only(type(_e), _e))})
        _out['cases'] = _cases
print('\\n${MARKER}' + _json.dumps(_out))
`
}

// Python that runs the learner's code in a fresh dictionary and reports the named variables
// (value and shape), for steps judged on what the code computed rather than on a function.
export function buildProbe(source, names) {
  return `import json as _json, traceback as _tb
import numpy as _np
_src = ${JSON.stringify(source)}
_ns = {'__name__': '__main__'}
_out = {'ok': True, 'vars': {}}
try:
    exec(compile(_src, '<your code>', 'exec'), _ns)
except BaseException as _e:
    _frames = [f for f in _tb.extract_tb(_e.__traceback__) if f.filename == '<your code>']
    _out = {'ok': False, 'error': ''.join(_tb.format_list(_frames)) + ''.join(_tb.format_exception_only(type(_e), _e))}
if _out['ok']:
    for _name in ${JSON.stringify(names)}:
        if _name in _ns:
            try:
                _a = _np.asarray(_ns[_name], dtype=float)
                _out['vars'][_name] = {'shape': list(_a.shape), 'value': _a.tolist()}
            except Exception:
                _out['vars'][_name] = {'unreadable': True}
print('\\n${MARKER}' + _json.dumps(_out))
`
}

// Splits stdout into the learner's own prints and the harness report.
export function parseCheck(stdout) {
  const at = stdout.lastIndexOf(MARKER)
  if (at < 0) return { printed: stdout.trim(), report: null }
  const json = stdout.slice(at + MARKER.length).split('\n')[0].replace(/\bNaN\b/g, 'null').replace(/-?\bInfinity\b/g, 'null')
  try { return { printed: stdout.slice(0, at).trim(), report: JSON.parse(json) } } catch { return { printed: stdout.slice(0, at).trim(), report: null } }
}

const shapeOf = v => Array.isArray(v) ? [v.length, ...(v.length && Array.isArray(v[0]) ? shapeOf(v[0]) : [])] : []
const fmt = v => Array.isArray(v) ? `[${v.map(fmt).join(', ')}]` : v == null ? 'NaN' : String(Math.round(v * 1e6) / 1e6)
const shapeText = s => `(${s.join(', ')}${s.length === 1 ? ',' : ''})`
const close = (a, b, tol) => Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((x, i) => close(x, b[i], tol)) : a != null && b != null && Math.abs(a - b) <= tol

// Grades a harness report against cases with known answers. Each case gets one line saying what
// went in, what was expected and what came back; `diagnose(case, got)` may add the likely cause —
// a named misconception, never the corrected code.
export function grade(report, cases, { describe, diagnose, tolerance = 1e-6 } = {}) {
  if (!report) return { passed: false, summary: 'The check did not finish. Run it again; if it keeps failing, press Stop and check for an endless loop.', lines: [] }
  if (!report.ok) return { passed: false, summary: 'Your code raised an error before the checks could call it.', error: report.error, lines: [] }
  if (report.missing) return { passed: false, summary: `No function called \`${report.missing}\` was defined. Keep the name and arguments from the starter code.`, lines: [] }
  const lines = cases.map((c, i) => {
    const r = report.cases?.[i] ?? {}, label = `Case ${i + 1}${describe ? ` (${describe(c)})` : ''}`
    if (r.error) return { ok: false, text: `${label}: raised an error.`, error: r.error }
    if (r.none) return { ok: false, text: `${label}: returned None. Did the function end without a \`return\`?` }
    const want = c.expected, wantShape = shapeOf(want)
    if ((r.shape ?? []).join() !== wantShape.join()) return { ok: false, text: `${label}: expected shape ${shapeText(wantShape)}, got ${shapeText(r.shape ?? [])}.`, hint: diagnose?.(c, r) }
    if (r.mutated) return { ok: false, text: `${label}: the values are right, but the function changed one of its input arrays. The contract says it must not.` }
    if (!close(r.value, want, c.tolerance ?? tolerance)) return { ok: false, text: `${label}: expected ${fmt(want)}, got ${fmt(r.value)}.`, hint: diagnose?.(c, r) }
    return { ok: true, text: `${label}: ${fmt(r.value)} ✓` }
  })
  const passed = lines.every(l => l.ok)
  return { passed, summary: passed ? `All ${cases.length} cases agree with the expected values.` : `${lines.filter(l => !l.ok).length} of ${cases.length} cases disagree.`, lines }
}

// Evidence is kept by kind and never merged into one score: a practice step done, a step done
// without hints or the worked answer, a fresh problem solved unassisted, and a delayed return.
export const REVIEW_DAYS = [1, 3, 7, 21]
const DAY = 86400000
export function nextReview(history, now = Date.now()) {
  // Consecutive successful returns lengthen the gap; a miss brings the next one back to a day.
  let streak = 0
  for (const h of [...history].reverse()) { if (!h.correct) break; streak++ }
  const last = history[history.length - 1]
  const days = last && !last.correct ? 1 : REVIEW_DAYS[Math.min(streak, REVIEW_DAYS.length - 1)]
  return now + days * DAY
}

// Every ladder a learner has started, with its next review date, for the lab's review list.
export function dueReviews(labs, progress, now = Date.now()) {
  const out = []
  for (const lab of labs) for (const lesson of lab.lessons) {
    const ladders = progress[lesson.id]?.ladders ?? {}
    for (const [name, state] of Object.entries(ladders)) {
      if (!state?.review?.due) continue
      const spec = lab.ladders?.[name]
      out.push({ lab: lab.number, lessonIndex: lab.lessons.indexOf(lesson), lessonId: lesson.id, name, title: spec?.title ?? name, due: state.review.due, isDue: state.review.due <= now })
    }
  }
  return out.sort((a, b) => a.due - b.due)
}

// ---- Helpers shared by the labs' ladder specs ----------------------------------------------------
export const nearArr = (a, b, tol = 1e-6) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= tol)
export const r3 = v => String(Math.round(v * 1000) / 1000)
// When a result has the expected shape but is a fixed multiple of the answer (wrong sign, a lost factor
// of 2, a sum instead of a mean…), name that mistake. factors: [[k, message], …]; checked in order.
export function scaledMistake(want, got, factors, tol = 1e-6) {
  if (!Array.isArray(got) || got.length !== want.length || want.every(v => Math.abs(v) < 1e-12)) return null
  for (const [k, message] of factors) if (nearArr(got, want.map(v => v * k), tol)) return message
  return null
}
// For probe steps: the variables the check needs, or a message naming the missing ones.
export function needVars(vars, names) {
  const missing = names.filter(n => !vars[n])
  return missing.length ? `Keep the names ${missing.map(n => `\`${n}\``).join(', ')}: the check reads them after your code runs.` : null
}
