// Helpers for the lessons' line notes: numbers written the way the calculations show them.
// f: at most 6 significant digits; s: the same, in brackets when negative; v: a list.
export const f = x => typeof x !== 'number' ? String(x) : Number.isInteger(x) ? String(x) : Math.abs(x) < 1e-4 && x !== 0 ? x.toExponential(3) : String(Number(x.toPrecision(6)))
export const s = x => typeof x === 'number' && x < 0 ? `(${f(x)})` : f(x)
export const v = xs => `[${xs.map(f).join(', ')}]`
