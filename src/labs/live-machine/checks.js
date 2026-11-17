// checks.js
// Runs a level's cases against the learner's function and says, for each, what came back.
// `call(argsList)` resolves to [{ ok, value } | { ok: false, error }], one per args array:
// in the lab that is the worker runner; in tests it is a plain function call.

export function sameValue(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  return ka.length === kb.length && ka.every(k => sameValue(a[k], b[k]))
}

export function show(value) {
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return JSON.stringify(value)
  try { return JSON.stringify(value) } catch { return String(value) }
}

export async function runCases(call, cases) {
  const results = await call(cases.map(c => c.args))
  return cases.map((c, i) => {
    const r = results[i] ?? { ok: false, error: 'no answer' }
    const passed = r.ok && (c.unordered ? sameItems(r.value, c.expect) : sameValue(r.value, c.expect))
    return { label: c.label, why: c.why, args: c.args, expect: c.expect, ...r, passed }
  })
}

// Arrays with the same items in any order (a case marked "unordered": true).
export function sameItems(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  const left = [...b]
  return a.every(x => {
    const i = left.findIndex(y => sameValue(x, y))
    if (i < 0) return false
    left.splice(i, 1)
    return true
  })
}

export const allPassed = results => results.length > 0 && results.every(r => r.passed)

// For tests and Node: build a callable from source without a worker.
export function directCaller(code, entry) {
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict";\n${code}\nreturn typeof ${entry} === 'function' ? ${entry} : null;`)()
  if (!fn) throw new Error(`No function named ${entry}`)
  return async argsList => argsList.map(args => {
    try { return { ok: true, value: fn(...structuredClone(args)) } } catch (e) { return { ok: false, error: e.message } }
  })
}
