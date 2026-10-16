// Numbers written the way the lessons show them: at most 4 decimals, no trailing zeros.
export const f = (x, d = 4) => typeof x !== 'number' ? String(x) : Number.isInteger(x) ? String(x) : String(Number(x.toFixed(d)))
