// "Write it yourself" checks. A write block names a function and some calls of it; the expected
// answers come from the JavaScript engine (which parity.test.js holds to the real Python). This
// builds the Python that runs after the learner's code, in the browser's Python, and reads back
// what it printed: one PASS| or FAIL| line per call, as JSON.

const pyString = value => JSON.stringify(JSON.stringify(value))   // a Python str literal holding JSON

// spec: { fn, cases: [{ args: [...], expected }] }
export function checkScript(spec) {
  const cases = spec.cases.map(c => [c.args, c.expected])
  return `
import json as _json
def _plain(value):
    return _json.loads(_json.dumps(value))
def _close(a, b):
    # Floats to within 1e-9 (the expected answers come from JavaScript, whose log and exp can
    # differ from Python's in the last digit); everything else exactly.
    if isinstance(a, float) or isinstance(b, float):
        return isinstance(a, (int, float)) and isinstance(b, (int, float)) and abs(a - b) <= 1e-9 * max(1.0, abs(b))
    if isinstance(b, list):
        return isinstance(a, list) and len(a) == len(b) and all(_close(x, y) for x, y in zip(a, b))
    if isinstance(b, dict):
        return isinstance(a, dict) and set(a) == set(b) and all(_close(a[k], b[k]) for k in b)
    return a == b
_cases = _json.loads(${pyString(cases)})
_failed = 0
for _args, _expected in _cases:
    _call = ${JSON.stringify(spec.fn)} + "(" + ", ".join(repr(a) for a in _args) + ")"
    try:
        _fn = globals().get(${JSON.stringify(spec.fn)})
        if _fn is None:
            raise NameError("there is no function called " + ${JSON.stringify(spec.fn)} + " yet")
        _got = _fn(*_args)
        try:
            _got = _plain(_got)
        except TypeError:
            _got = repr(_got)
    except Exception as _e:
        _failed += 1
        print("FAIL|" + _json.dumps({"call": _call, "error": type(_e).__name__ + ": " + str(_e), "expected": _expected}))
        continue
    if _close(_got, _expected):
        print("PASS|" + _json.dumps({"call": _call, "got": _got}))
    else:
        _failed += 1
        print("FAIL|" + _json.dumps({"call": _call, "got": _got, "expected": _expected}))
if _failed:
    raise AssertionError(str(_failed) + " of " + str(len(_cases)) + " checks failed")
`
}

// The results the script printed, from the Python output text.
export function readResults(output) {
  return output.split('\n').flatMap(line => {
    const m = /^(PASS|FAIL)\|(.*)$/.exec(line.trim())
    if (!m) return []
    try { return [{ pass: m[1] === 'PASS', ...JSON.parse(m[2]) }] } catch { return [] }
  })
}

// Things a write block forbids (e.g. ".split(" when you are writing split yourself), found in the code.
export const forbiddenIn = (code, forbid = []) => forbid.filter(([text]) => code.includes(text))
