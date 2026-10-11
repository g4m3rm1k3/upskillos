// A number in a few characters: whole numbers plain, tiny ones in e-notation, the rest to `d` decimals.
export const fmt = (x, d = 3) => x == null ? '—' : typeof x !== 'number' ? String(x) : Number.isInteger(x) ? String(x) : Math.abs(x) < 1e-3 && x !== 0 ? x.toExponential(2) : x.toFixed(d)
