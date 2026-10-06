// Compares what a type-along cell printed with the output its lesson expects.
// Used by PythonNotebook (to tell the learner) and by
// scripts/check_notebook_series.mjs (to prove the expected output is right).
//
// Lines are compared without trailing spaces and trailing blank lines, so
// invisible differences don't count. Returns { matches: true }, or the first
// line (1-based) that differs and both versions of it (undefined when one
// output has run out of lines).
export function compareOutput(actual, expected) {
  const lines = (text) => String(text ?? '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, ''))
  const a = lines(actual)
  const e = lines(expected)
  while (a.length && !a[a.length - 1]) a.pop()
  while (e.length && !e[e.length - 1]) e.pop()
  for (let i = 0; i < Math.max(a.length, e.length); i++) {
    if (a[i] !== e[i]) return { matches: false, line: i + 1, yours: a[i], expected: e[i] }
  }
  return { matches: true }
}
