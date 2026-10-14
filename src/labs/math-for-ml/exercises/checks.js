// Shared by every exercise's checks: `expect(got, want, what)` compares numbers (to a relative
// tolerance), Fractions, booleans, strings and nested lists or tuples, and fails with a message that
// says what was called, what came back and what was expected.
const PRELUDE = String.raw`import math
from fractions import Fraction

def _same(a, b, tol):
    if isinstance(b, (list, tuple)):
        return isinstance(a, (list, tuple)) and len(a) == len(b) and all(_same(x, y, tol) for x, y in zip(a, b))
    if isinstance(b, bool) or b is None or isinstance(b, str):
        return a is b or (a == b and type(a) is type(b))
    try:
        return abs(a - b) <= tol * max(1.0, abs(b))
    except TypeError:
        return False

def expect(got, want, what, tol=1e-9):
    assert _same(got, want, tol), f"{what} gave {got!r}; expected {want!r}"
`

export const checks = source => `${PRELUDE}\n${source.trim()}\n`

// The tag every exercise file writes its text with: raw, so Python and LaTeX backslashes survive, except
// that \` (needed to put a backtick inside a template) becomes a plain backtick for Markdown code.
export const py = (strings, ...values) => String.raw(strings, ...values).replace(/\\`/g, '`')
