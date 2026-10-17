import { def, numbers, flat, criteriaMask, criterion, optBool, integer, toMatrix, Matrix, err, fail, isError, raise, toNumber } from './helpers.js'
import { normCdf, normPdf, normInv, tCdf, tPdf, invert, chisqCdf, fCdf, lnChoose, gammaln } from './distributions.js'
import { compare } from '../evaluate.js'

const C = 'Statistics'
const D = 'Distributions'

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
function need(xs, n, what) { if (xs.length < n) fail('#DIV/0!', what + ' needs at least ' + n + ' number' + (n === 1 ? '' : 's') + '.'); return xs }
function variance(xs, sample) {
  need(xs, sample ? 2 : 1, sample ? 'A sample variance' : 'A population variance')
  const m = mean(xs)
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - (sample ? 1 : 0))
}
function sorted(xs) { return [...xs].sort((a, b) => a - b) }

// Percentile with linear interpolation between closest ranks ("inclusive", as
// PERCENTILE.INC and numpy's default).
function percentileInc(xs, p) {
  if (p < 0 || p > 1) fail('#NUM!', 'The percentile must be between 0 and 1.')
  const s = sorted(need(xs, 1, 'PERCENTILE'))
  const h = (s.length - 1) * p
  const lo = Math.floor(h)
  return s[lo] + (h - lo) * ((s[lo + 1] ?? s[lo]) - s[lo])
}
function percentileExc(xs, p) {
  const s = sorted(need(xs, 1, 'PERCENTILE.EXC'))
  const h = (s.length + 1) * p - 1
  if (h < 0 || h > s.length - 1) fail('#NUM!', 'PERCENTILE.EXC cannot reach that far into the tails with so few values.')
  const lo = Math.floor(h)
  return s[lo] + (h - lo) * ((s[lo + 1] ?? s[lo]) - s[lo])
}

// Paired numbers from two ranges, skipping pairs where either is not a number.
function pairs(a, b) {
  const A = flat([a]), B = flat([b])
  if (A.length !== B.length) fail('#N/A', 'The two ranges must contain the same number of values.')
  const xs = [], ys = []
  A.forEach((x, i) => {
    const y = B[i]
    if (isError(x)) raise(x)
    if (isError(y)) raise(y)
    if (typeof x === 'number' && typeof y === 'number') { xs.push(x); ys.push(y) }
  })
  return [xs, ys]
}
function covariance(xs, ys, sample) {
  const mx = mean(xs), my = mean(ys)
  return xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (xs.length - (sample ? 1 : 0))
}
function correl(xs, ys) {
  need(xs, 2, 'CORREL')
  const mx = mean(xs), my = mean(ys)
  let sxy = 0, sxx = 0, syy = 0
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2 })
  if (sxx === 0 || syy === 0) fail('#DIV/0!', 'Correlation is undefined when one of the variables does not vary.')
  return sxy / Math.sqrt(sxx * syy)
}
function linefit(ky, kx) {
  const [ys, xs] = pairs(ky, kx)
  need(xs, 2, 'A line fit')
  const mx = mean(xs), my = mean(ys)
  let sxy = 0, sxx = 0
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2 })
  if (sxx === 0) fail('#DIV/0!', 'All the x values are the same, so no line can be fitted.')
  const slope = sxy / sxx
  return { slope, intercept: my - slope * mx, xs, ys, mx, my }
}

function ifsMask(rangeArgs) {
  const [target, ...rest] = rangeArgs
  const T = toMatrix(target)
  const pairsList = []
  for (let i = 0; i < rest.length; i += 2) pairsList.push([rest[i], rest[i + 1]])
  const mask = criteriaMask(pairsList, T.height, T.width)
  const out = []
  let i = 0
  for (const v of T.values()) { if (mask[i++]) { if (isError(v)) raise(v); if (typeof v === 'number') out.push(v) } }
  return out
}

function rankOf(x, xs, ascending) {
  const v = toNumber(x)
  if (!xs.includes(v)) fail('#N/A', 'The number is not in the list being ranked.')
  return ascending ? xs.filter((y) => y < v).length + 1 : xs.filter((y) => y > v).length + 1
}

const prob = (p) => { const x = toNumber(p); if (x <= 0 || x >= 1) fail('#NUM!', 'A probability must be strictly between 0 and 1.'); return x }

// Least squares with several inputs: the weights w solve (XᵀX) w = Xᵀy.
// Returns LINEST's layout: the coefficients last input first, then the
// intercept; with stats, four more rows as for one input.
function multipleRegression(ys, xRows, useConst, stats) {
  const pairs = ys.map((v, i) => [v, xRows[i]]).filter(([v, r]) => typeof v === 'number' && r.every((x) => typeof x === 'number'))
  const k = xRows[0].length
  const n = pairs.length
  const p = k + (useConst ? 1 : 0)
  if (n <= p) fail('#NUM!', 'LINEST needs more rows of data than it has coefficients to find.')
  const X = pairs.map(([, r]) => (useConst ? [1, ...r] : [...r]))
  const yv = pairs.map(([v]) => v)
  const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((sum, row) => sum + row[i] * row[j], 0)))
  const inv = invertMatrix(XtX)
  if (!inv) fail('#NUM!', 'The x columns are not independent (one can be made from the others), so there is no single best fit.')
  const Xty = Array.from({ length: p }, (_, i) => X.reduce((sum, row, r) => sum + row[i] * yv[r], 0))
  const w = inv.map((row) => row.reduce((sum, v, j) => sum + v * Xty[j], 0))
  const coefs = useConst ? [...w.slice(1).reverse(), w[0]] : [...w.slice().reverse(), 0]
  if (!stats) return new Matrix([coefs])
  const pred = X.map((row) => row.reduce((sum, v, j) => sum + v * w[j], 0))
  const ssres = yv.reduce((sum, v, i) => sum + (v - pred[i]) ** 2, 0)
  const my = mean(yv)
  const sstot = useConst ? yv.reduce((sum, v) => sum + (v - my) ** 2, 0) : yv.reduce((sum, v) => sum + v * v, 0)
  const df = n - p
  const sey = Math.sqrt(ssres / df)
  const se = inv.map((row, i) => sey * Math.sqrt(row[i]))
  const seRow = useConst ? [...se.slice(1).reverse(), se[0]] : [...se.slice().reverse(), err('#N/A')]
  const blank = () => err('#N/A')
  const pad = (row) => [...row, ...Array.from({ length: k + 1 - row.length }, blank)]
  return new Matrix([coefs, seRow, pad([1 - ssres / sstot, sey]), pad([(sstot - ssres) / (p - (useConst ? 1 : 0)) / (ssres / df), df]), pad([sstot - ssres, ssres])])
}

// The inverse of a square matrix by Gauss–Jordan elimination, or null if it has none.
function invertMatrix(A) {
  const n = A.length
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  for (let c = 0; c < n; c++) {
    let best = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[best][c])) best = r
    if (Math.abs(M[best][c]) < 1e-12 * Math.max(1, ...A.map((row) => Math.abs(row[c])))) return null
    ;[M[c], M[best]] = [M[best], M[c]]
    const pivot = M[c][c]
    M[c] = M[c].map((v) => v / pivot)
    for (let r = 0; r < n; r++) if (r !== c && M[r][c] !== 0) { const f = M[r][c]; M[r] = M[r].map((v, j) => v - f * M[c][j]) }
  }
  return M.map((row) => row.slice(n))
}

// The criteria of the IF family, which may each be an array: the function then gives one answer per
// criterion, as Excel does (a column of criteria against a row of them makes a table).
const CRITERIA = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25], CRITERIA_AFTER_SUM = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26]

export default {
  AVERAGE: def(C, 'AVERAGE(number1, [number2], …)', 'The arithmetic mean: the sum divided by the count.', (args) => mean(need(numbers(args), 1, 'AVERAGE')), {
    min: 1, example: ['=AVERAGE(2, 4, 9)', '5'],
    learn: 'Blank cells and text are left out of both the sum and the count. A cell containing 0 is included. That is why AVERAGE of a column with empty cells is not the same as the sum divided by the number of rows.',
  }),
  AVERAGEA: def(C, 'AVERAGEA(value1, [value2], …)', 'The mean, counting text as 0 and TRUE as 1.', (args) => mean(need(numbers(args, { includeLogicalInRanges: true, textAsZero: true }), 1, 'AVERAGEA')), { min: 1 }),
  AVERAGEIF: def(C, 'AVERAGEIF(range, criteria, [average_range])', 'The mean of the cells that meet a condition.', ([r, c, a]) => {
    const R = toMatrix(r), A = a === undefined ? R : toMatrix(a)
    const mask = criteriaMask([[R, c]], R.height, R.width)
    const xs = []
    let i = 0
    for (const v of A.values()) { if (mask[i++] && typeof v === 'number') xs.push(v) }
    return mean(need(xs, 1, 'AVERAGEIF'))
  }, { scalar: [1], example: ['=AVERAGEIF(A2:A9, "North", B2:B9)', 'the mean of B where A is North'] }),
  AVERAGEIFS: def(C, 'AVERAGEIFS(average_range, criteria_range1, criteria1, …)', 'The mean of the cells that meet every condition.', (args) => mean(need(ifsMask(args), 1, 'AVERAGEIFS')), { min: 3, scalar: CRITERIA_AFTER_SUM }),
  COUNT: def(C, 'COUNT(value1, [value2], …)', 'Counts the cells that contain numbers.', (args) => {
    let n = 0
    for (const a of args) {
      if (a instanceof Matrix) { for (const v of a.values()) if (typeof v === 'number') n++ }
      else if (typeof a === 'number' || typeof a === 'boolean' || (typeof a === 'string' && !Number.isNaN(Number(a)) && a.trim() !== '')) n++
    }
    return n
  }, { min: 1, example: ['=COUNT(A1:A10)', 'how many numbers'], learn: 'COUNT counts numbers only (dates are numbers too). Use COUNTA to count every non-empty cell.' }),
  COUNTA: def(C, 'COUNTA(value1, [value2], …)', 'Counts the cells that are not empty.', (args) => {
    let n = 0
    for (const a of args) {
      if (a instanceof Matrix) { for (const v of a.values()) if (v !== null && v !== undefined) n++ }
      else if (a !== undefined && a !== null) n++
    }
    return n
  }, { min: 1, example: ['=COUNTA(A1:A10)', 'how many filled cells'], learn: 'A cell containing "" (empty text, often returned by a formula) is not empty, so COUNTA counts it.' }),
  COUNTBLANK: def(C, 'COUNTBLANK(range)', 'Counts the empty cells.', ([r]) => { let n = 0; for (const v of toMatrix(r).values()) if (v === null || v === '') n++; return n }),
  COUNTIF: def(C, 'COUNTIF(range, criteria)', 'Counts the cells that meet a condition.', ([r, c]) => {
    const test = criterion(c)
    let n = 0
    for (const v of toMatrix(r).values()) if (test(v)) n++
    return n
  }, { scalar: [1], example: ['=COUNTIF(B2:B30, ">=50")', 'how many scores are 50 or more'], learn: 'Criteria can be a value (5, "Yes"), a comparison as text (">=50"), or a pattern with wildcards ("A*" starts with A, "?at" is any three-letter word ending in "at").' }),
  COUNTIFS: def(C, 'COUNTIFS(criteria_range1, criteria1, …)', 'Counts the rows that meet every condition.', (args) => {
    if (args.length % 2) fail('#VALUE!', 'Criteria come in pairs: a range and its condition.')
    const first = toMatrix(args[0])
    const list = []
    for (let i = 0; i < args.length; i += 2) list.push([args[i], args[i + 1]])
    return criteriaMask(list, first.height, first.width).filter(Boolean).length
  }, { min: 2, scalar: CRITERIA, learn: 'Given an array of conditions, COUNTIFS counts once for each, as Excel does: =COUNTIFS(A2:A9, {"North";"South"}, B2:B9, {"yes","no"}) is a 2 × 2 table of counts, a column of conditions against a row of them.' }),
  MAX: def(C, 'MAX(number1, [number2], …)', 'The largest number.', (args) => { const xs = numbers(args); return xs.length ? Math.max(...xs) : 0 }, { min: 1, example: ['=MAX(3, 9, 4)', '9'] }),
  MIN: def(C, 'MIN(number1, [number2], …)', 'The smallest number.', (args) => { const xs = numbers(args); return xs.length ? Math.min(...xs) : 0 }, { min: 1, example: ['=MIN(3, 9, 4)', '3'] }),
  MAXIFS: def(C, 'MAXIFS(max_range, criteria_range1, criteria1, …)', 'The largest number among cells that meet every condition.', (args) => { const xs = ifsMask(args); return xs.length ? Math.max(...xs) : 0 }, { min: 3, scalar: CRITERIA_AFTER_SUM }),
  MINIFS: def(C, 'MINIFS(min_range, criteria_range1, criteria1, …)', 'The smallest number among cells that meet every condition.', (args) => { const xs = ifsMask(args); return xs.length ? Math.min(...xs) : 0 }, { min: 3, scalar: CRITERIA_AFTER_SUM }),
  MEDIAN: def(C, 'MEDIAN(number1, [number2], …)', 'The middle value.', (args) => percentileInc(need(numbers(args), 1, 'MEDIAN'), 0.5), { min: 1, example: ['=MEDIAN(1, 3, 100)', '3'], learn: 'With an even count, MEDIAN averages the two middle values. Unlike the mean, one extreme value hardly moves it.' }),
  'MODE.SNGL': def(C, 'MODE.SNGL(number1, [number2], …)', 'The most frequent value.', (args) => {
    const xs = numbers(args), counts = new Map()
    let best = null, bestN = 1
    for (const x of xs) { const n = (counts.get(x) ?? 0) + 1; counts.set(x, n); if (n > bestN) { bestN = n; best = x } }
    if (best === null) fail('#N/A', 'No value appears more than once.')
    return best
  }, { min: 1, example: ['=MODE.SNGL(1, 2, 2, 3)', '2'] }),
  'STDEV.S': def(C, 'STDEV.S(number1, [number2], …)', 'The standard deviation of a sample (divides by n − 1).', (args) => Math.sqrt(variance(numbers(args), true)), {
    min: 1, example: ['=STDEV.S(2, 4, 4, 4, 5, 5, 7, 9)', '2.138'],
    learn: 'Use STDEV.S when your data is a sample from a larger population (the usual case) and STDEV.P when it is the entire population. Dividing by n − 1 (Bessel\'s correction) makes the sample variance an unbiased estimate of the population variance.',
  }),
  'STDEV.P': def(C, 'STDEV.P(number1, [number2], …)', 'The standard deviation of a whole population (divides by n).', (args) => Math.sqrt(variance(numbers(args), false)), { min: 1, example: ['=STDEV.P(2, 4, 4, 4, 5, 5, 7, 9)', '2'] }),
  'VAR.S': def(C, 'VAR.S(number1, [number2], …)', 'The variance of a sample (divides by n − 1).', (args) => variance(numbers(args), true), { min: 1 }),
  'VAR.P': def(C, 'VAR.P(number1, [number2], …)', 'The variance of a whole population (divides by n).', (args) => variance(numbers(args), false), { min: 1 }),
  LARGE: def(C, 'LARGE(array, k)', 'The k-th largest value.', ([a, k]) => { const s = sorted(numbers([toMatrix(a)])); const n = integer(k); if (n < 1 || n > s.length) fail('#NUM!', 'k must be between 1 and the number of values.'); return s[s.length - n] }, { example: ['=LARGE(A1:A10, 2)', 'the second largest'] }),
  SMALL: def(C, 'SMALL(array, k)', 'The k-th smallest value.', ([a, k]) => { const s = sorted(numbers([toMatrix(a)])); const n = integer(k); if (n < 1 || n > s.length) fail('#NUM!', 'k must be between 1 and the number of values.'); return s[n - 1] }),
  // Given a range of numbers, both rank each one (scalar: [0]), as Excel does: =RANK.AVG(A2:A20, A2:A20, 1).
  'RANK.EQ': def(C, 'RANK.EQ(number, ref, [order])', 'The rank of a number in a list (ties share the best rank).', ([x, r, o]) => rankOf(x, numbers([toMatrix(r)]), optBool(o, false)), { scalar: [0], example: ['=RANK.EQ(B2, B$2:B$20)', 'B2\'s position, largest = 1'] }),
  'RANK.AVG': def(C, 'RANK.AVG(number, ref, [order])', 'The rank of a number, with ties given their average rank.', ([x, r, o]) => {
    const xs = numbers([toMatrix(r)]), v = toNumber(x), asc = optBool(o, false)
    const first = rankOf(v, xs, asc), ties = xs.filter((y) => y === v).length
    return first + (ties - 1) / 2
  }, {
    scalar: [0], example: ['=CORREL(RANK.AVG(A2:A20, A2:A20, 1), RANK.AVG(B2:B20, B2:B20, 1))', 'Spearman’s rank correlation of the two columns'],
    learn: 'Given a whole range as the number, it ranks every value at once. Ties share the mean of the places they take up: two values tied for 3rd and 4th both get 3.5. The correlation of two columns’ ranks is Spearman’s correlation, which one far-off value can move only one place.',
  }),
  'PERCENTILE.INC': def(C, 'PERCENTILE.INC(array, k)', 'The value below which a fraction k of the data falls (0 ≤ k ≤ 1).', ([a, k]) => percentileInc(numbers([toMatrix(a)]), toNumber(k)), { example: ['=PERCENTILE.INC(A1:A100, 0.9)', 'the 90th percentile'] }),
  'PERCENTILE.EXC': def(C, 'PERCENTILE.EXC(array, k)', 'Percentile, excluding the end points (0 < k < 1).', ([a, k]) => percentileExc(numbers([toMatrix(a)]), toNumber(k))),
  'QUARTILE.INC': def(C, 'QUARTILE.INC(array, quart)', 'A quartile: 0 = min, 1 = Q1, 2 = median, 3 = Q3, 4 = max.', ([a, q]) => { const n = integer(q); if (n < 0 || n > 4) fail('#NUM!', 'quart must be 0, 1, 2, 3 or 4.'); return percentileInc(numbers([toMatrix(a)]), n / 4) }),
  'QUARTILE.EXC': def(C, 'QUARTILE.EXC(array, quart)', 'A quartile, excluding the end points (quart 1 to 3).', ([a, q]) => percentileExc(numbers([toMatrix(a)]), integer(q) / 4)),
  CORREL: def(C, 'CORREL(array1, array2)', 'Pearson\'s correlation coefficient r, from −1 to 1.', ([a, b]) => correl(...pairs(a, b)), {
    example: ['=CORREL(A2:A50, B2:B50)', 'how strongly the two columns move together'],
    learn: 'r measures straight-line association only. A perfect curve can have r near 0, and one outlier can create a strong r. Always look at a scatter chart too. And correlation is not causation.',
  }),
  PEARSON: def(C, 'PEARSON(array1, array2)', 'Same as CORREL.', ([a, b]) => correl(...pairs(a, b))),
  RSQ: def(C, 'RSQ(known_ys, known_xs)', 'r², the fraction of variance in y explained by a straight line in x.', ([y, x]) => correl(...pairs(x, y)) ** 2),
  'COVARIANCE.S': def(C, 'COVARIANCE.S(array1, array2)', 'Sample covariance.', ([a, b]) => { const [x, y] = pairs(a, b); need(x, 2, 'COVARIANCE.S'); return covariance(x, y, true) }),
  'COVARIANCE.P': def(C, 'COVARIANCE.P(array1, array2)', 'Population covariance.', ([a, b]) => { const [x, y] = pairs(a, b); need(x, 1, 'COVARIANCE.P'); return covariance(x, y, false) }),
  SLOPE: def(C, 'SLOPE(known_ys, known_xs)', 'The slope of the least-squares line.', ([y, x]) => linefit(y, x).slope, { example: ['=SLOPE(B2:B20, A2:A20)', 'how much y changes per unit of x'], learn: 'Note the order: y values first, then x values.' }),
  INTERCEPT: def(C, 'INTERCEPT(known_ys, known_xs)', 'Where the least-squares line crosses x = 0.', ([y, x]) => linefit(y, x).intercept),
  'FORECAST.LINEAR': def(C, 'FORECAST.LINEAR(x, known_ys, known_xs)', 'Predicts y at x using the least-squares line.', ([x, y, xs]) => { const f = linefit(y, xs); return f.intercept + f.slope * toNumber(x) }, { scalar: [0], example: ['=FORECAST.LINEAR(13, B2:B13, A2:A13)', 'next month\'s prediction'] }),
  STEYX: def(C, 'STEYX(known_ys, known_xs)', 'The standard error of the predicted y values.', ([y, x]) => {
    const f = linefit(y, x)
    need(f.xs, 3, 'STEYX')
    const sse = f.xs.reduce((s, xv, i) => s + (f.ys[i] - (f.intercept + f.slope * xv)) ** 2, 0)
    return Math.sqrt(sse / (f.xs.length - 2))
  }),
  TREND: def(C, "TREND(known_ys, [known_xs], [new_xs])", 'Values along the least-squares line, for new x values.', ([y, x, nx]) => {
    const Y = toMatrix(y)
    const X = x === undefined ? Matrix.fill(Y.height, Y.width, (r, c) => r * Y.width + c + 1) : toMatrix(x)
    const f = linefit(Y, X)
    const N = nx === undefined ? X : toMatrix(nx)
    return N.map((v) => f.intercept + f.slope * toNumber(v))
  }, { returnsArray: true }),
  LINEST: def(C, 'LINEST(known_ys, [known_xs], [const], [stats])', 'Least-squares fit of a straight line; returns {slope, intercept} (more with stats).', ([y, x, cst, st]) => {
    const Y = toMatrix(y)
    const X = x === undefined ? Matrix.fill(Y.height, Y.width, (r, c) => r * Y.width + c + 1) : toMatrix(x)
    // Several x columns (or rows): multiple regression.
    if (Y.width === 1 && X.height === Y.height && X.width > 1) return multipleRegression(Y.rows.map((r) => r[0]), X.rows, optBool(cst, true), optBool(st, false))
    if (Y.height === 1 && X.width === Y.width && X.height > 1) return multipleRegression(Y.rows[0], X.rows[0].map((_, c) => X.rows.map((r) => r[c])), optBool(cst, true), optBool(st, false))
    const f = linefit(Y, X)
    const useConst = optBool(cst, true)
    let slope = f.slope, intercept = f.intercept
    if (!useConst) { slope = f.xs.reduce((s, xv, i) => s + xv * f.ys[i], 0) / f.xs.reduce((s, xv) => s + xv * xv, 0); intercept = 0 }
    if (!optBool(st, false)) return new Matrix([[slope, intercept]])
    const n = f.xs.length, df = n - (useConst ? 2 : 1)
    const pred = f.xs.map((xv) => intercept + slope * xv)
    const ssres = f.ys.reduce((s, yv, i) => s + (yv - pred[i]) ** 2, 0)
    const sstot = useConst ? f.ys.reduce((s, yv) => s + (yv - f.my) ** 2, 0) : f.ys.reduce((s, yv) => s + yv * yv, 0)
    const sey = Math.sqrt(ssres / df)
    const sxx = useConst ? f.xs.reduce((s, xv) => s + (xv - f.mx) ** 2, 0) : f.xs.reduce((s, xv) => s + xv * xv, 0)
    const seSlope = sey / Math.sqrt(sxx)
    const seInt = useConst ? sey * Math.sqrt(1 / n + f.mx ** 2 / sxx) : err('#N/A')
    const r2 = 1 - ssres / sstot
    const fstat = (sstot - ssres) / (ssres / df)
    return new Matrix([[slope, intercept], [seSlope, seInt], [r2, sey], [fstat, df], [sstot - ssres, ssres]])
  }, { returnsArray: true, learn: 'With stats = TRUE, LINEST returns a 5×2 block: slope and intercept; their standard errors; R² and the standard error of y; the F statistic and degrees of freedom; the regression and residual sums of squares.' }),
  GEOMEAN: def(C, 'GEOMEAN(number1, [number2], …)', 'The geometric mean: the n-th root of the product.', (args) => { const xs = numbers(args); if (xs.some((x) => x <= 0)) fail('#NUM!', 'GEOMEAN needs positive numbers.'); return Math.exp(mean(xs.map(Math.log))) }, { min: 1, learn: 'Use the geometric mean for rates that multiply, such as average growth over several years.' }),
  HARMEAN: def(C, 'HARMEAN(number1, [number2], …)', 'The harmonic mean.', (args) => { const xs = numbers(args); if (xs.some((x) => x <= 0)) fail('#NUM!'); return xs.length / xs.reduce((s, x) => s + 1 / x, 0) }, { min: 1 }),
  AVEDEV: def(C, 'AVEDEV(number1, [number2], …)', 'The mean absolute deviation from the mean.', (args) => { const xs = need(numbers(args), 1, 'AVEDEV'), m = mean(xs); return mean(xs.map((x) => Math.abs(x - m))) }, { min: 1 }),
  DEVSQ: def(C, 'DEVSQ(number1, [number2], …)', 'The sum of squared deviations from the mean.', (args) => { const xs = numbers(args), m = mean(xs); return xs.reduce((s, x) => s + (x - m) ** 2, 0) }, { min: 1 }),
  SKEW: def(C, 'SKEW(number1, [number2], …)', 'Skewness: how lopsided the distribution is.', (args) => {
    const xs = need(numbers(args), 3, 'SKEW'), n = xs.length, m = mean(xs), s = Math.sqrt(variance(xs, true))
    if (s === 0) fail('#DIV/0!')
    return (n / ((n - 1) * (n - 2))) * xs.reduce((a, x) => a + ((x - m) / s) ** 3, 0)
  }, { min: 1, learn: 'Positive skew means a long tail to the right (incomes, house prices); the mean is then above the median.' }),
  KURT: def(C, 'KURT(number1, [number2], …)', 'Excess kurtosis: how heavy the tails are compared with a normal distribution.', (args) => {
    const xs = need(numbers(args), 4, 'KURT'), n = xs.length, m = mean(xs), s = Math.sqrt(variance(xs, true))
    if (s === 0) fail('#DIV/0!')
    const sum4 = xs.reduce((a, x) => a + ((x - m) / s) ** 4, 0)
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4 - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
  }, { min: 1 }),
  STANDARDIZE: def(C, 'STANDARDIZE(x, mean, standard_dev)', 'The z-score: how many standard deviations x is from the mean.', ([x, m, s]) => { const sd = toNumber(s); if (sd <= 0) fail('#NUM!', 'The standard deviation must be positive.'); return (toNumber(x) - toNumber(m)) / sd }, { scalar: true, example: ['=STANDARDIZE(80, 70, 5)', '2'] }),
  FREQUENCY: def(C, 'FREQUENCY(data_array, bins_array)', 'Counts how many values fall into each bin; returns a column one longer than the bins.', ([d, b]) => {
    const xs = numbers([toMatrix(d)]), bins = sorted(numbers([toMatrix(b)]))
    const counts = new Array(bins.length + 1).fill(0)
    for (const x of xs) { let i = bins.findIndex((edge) => x <= edge); if (i < 0) i = bins.length; counts[i]++ }
    return new Matrix(counts.map((n) => [n]))
  }, { returnsArray: true, learn: 'Each bin counts values greater than the previous bin edge and up to and including its own. The extra last count is everything above the top edge.' }),

  // ── Distributions ───────────────────────────────────────────────────────
  'NORM.DIST': def(D, 'NORM.DIST(x, mean, standard_dev, cumulative)', 'The normal distribution: density, or probability of a value ≤ x.', ([x, m, s, c]) => {
    const sd = toNumber(s); if (sd <= 0) fail('#NUM!', 'The standard deviation must be positive.')
    const z = (toNumber(x) - toNumber(m)) / sd
    return optBool(c, false) ? normCdf(z) : normPdf(z) / sd
  }, { scalar: true, example: ['=NORM.DIST(1.96, 0, 1, TRUE)', '0.975'], learn: 'With cumulative TRUE it gives P(X ≤ x), the area under the bell curve to the left of x. With FALSE it gives the height of the curve (the density), which is not itself a probability.' }),
  'NORM.INV': def(D, 'NORM.INV(probability, mean, standard_dev)', 'The x with P(X ≤ x) = probability, for a normal distribution.', ([p, m, s]) => { const sd = toNumber(s); if (sd <= 0) fail('#NUM!'); return toNumber(m) + sd * normInv(prob(p)) }, { scalar: true, example: ['=NORM.INV(0.975, 0, 1)', '1.96'] }),
  'NORM.S.DIST': def(D, 'NORM.S.DIST(z, cumulative)', 'The standard normal distribution (mean 0, SD 1).', ([z, c]) => (optBool(c, false) ? normCdf(toNumber(z)) : normPdf(toNumber(z))), { scalar: true }),
  'NORM.S.INV': def(D, 'NORM.S.INV(probability)', 'The z with P(Z ≤ z) = probability.', ([p]) => normInv(prob(p)), { scalar: true, example: ['=NORM.S.INV(0.95)', '1.645'] }),
  'T.DIST': def(D, 'T.DIST(x, deg_freedom, cumulative)', 'Student\'s t distribution (left tail).', ([x, df, c]) => { const k = toNumber(df); if (k < 1) fail('#NUM!', 'Degrees of freedom must be at least 1.'); return optBool(c, false) ? tCdf(toNumber(x), k) : tPdf(toNumber(x), k) }, { scalar: true, learn: 'The t distribution is the normal curve with heavier tails, used when the standard deviation is estimated from a small sample. As the degrees of freedom grow it approaches the normal.' }),
  'T.DIST.2T': def(D, 'T.DIST.2T(x, deg_freedom)', 'Two-tailed probability of a t value at least this far from 0.', ([x, df]) => { const t = toNumber(x); if (t < 0) fail('#NUM!', 'x must be ≥ 0.'); return 2 * (1 - tCdf(t, toNumber(df))) }, { scalar: true }),
  'T.DIST.RT': def(D, 'T.DIST.RT(x, deg_freedom)', 'Right-tailed t probability.', ([x, df]) => 1 - tCdf(toNumber(x), toNumber(df)), { scalar: true }),
  'T.INV': def(D, 'T.INV(probability, deg_freedom)', 'The left-tailed inverse of the t distribution.', ([p, df]) => { const q = prob(p), k = toNumber(df); return invert((t) => tCdf(t, k), q, -1e3, 1e3) }, { scalar: true }),
  'T.INV.2T': def(D, 'T.INV.2T(probability, deg_freedom)', 'The two-tailed inverse: the critical t value for a confidence interval.', ([p, df]) => { const q = prob(p), k = toNumber(df); return invert((t) => tCdf(t, k), 1 - q / 2, 0, 1e3) }, { scalar: true, example: ['=T.INV.2T(0.05, 10)', '2.228'], learn: 'For a 95% confidence interval for a mean from n values, use =T.INV.2T(0.05, n-1) as the multiplier of the standard error.' }),
  'T.TEST': def(D, 'T.TEST(array1, array2, tails, type)', 'The p-value of a t-test comparing two samples.', ([a, b, tl, ty]) => {
    const tails = integer(tl), type = integer(ty)
    if (![1, 2].includes(tails) || ![1, 2, 3].includes(type)) fail('#NUM!', 'tails must be 1 or 2; type must be 1 (paired), 2 (equal variances) or 3 (unequal variances).')
    let t, df
    if (type === 1) {
      const [x, y] = pairs(a, b)
      const d = x.map((v, i) => v - y[i])
      need(d, 2, 'A paired t-test')
      t = mean(d) / Math.sqrt(variance(d, true) / d.length); df = d.length - 1
    } else {
      const x = numbers([toMatrix(a)]), y = numbers([toMatrix(b)])
      need(x, 2, 'T.TEST'); need(y, 2, 'T.TEST')
      const vx = variance(x, true), vy = variance(y, true), nx = x.length, ny = y.length
      if (type === 2) {
        const sp = ((nx - 1) * vx + (ny - 1) * vy) / (nx + ny - 2)
        t = (mean(x) - mean(y)) / Math.sqrt(sp * (1 / nx + 1 / ny)); df = nx + ny - 2
      } else {
        const se2 = vx / nx + vy / ny
        t = (mean(x) - mean(y)) / Math.sqrt(se2)
        df = se2 ** 2 / ((vx / nx) ** 2 / (nx - 1) + (vy / ny) ** 2 / (ny - 1))
      }
    }
    const one = 1 - tCdf(Math.abs(t), df)
    return tails === 2 ? 2 * one : one
  }, { learn: 'The p-value is the probability of a difference at least this large if the two groups really had the same mean. Type 3 (Welch\'s test) is the safer default when the groups may have different spreads.' }),
  'CHISQ.DIST': def(D, 'CHISQ.DIST(x, deg_freedom, cumulative)', 'The chi-squared distribution.', ([x, df, c]) => {
    const v = toNumber(x), k = toNumber(df)
    if (v < 0 || k < 1) fail('#NUM!')
    if (optBool(c, false)) return chisqCdf(v, k)
    return Math.exp((k / 2 - 1) * Math.log(v) - v / 2 - (k / 2) * Math.log(2) - gammaln(k / 2))
  }, { scalar: true }),
  'CHISQ.DIST.RT': def(D, 'CHISQ.DIST.RT(x, deg_freedom)', 'Right-tailed chi-squared probability (the p-value of a chi-squared test statistic).', ([x, df]) => 1 - chisqCdf(toNumber(x), toNumber(df)), { scalar: true }),
  'CHISQ.INV.RT': def(D, 'CHISQ.INV.RT(probability, deg_freedom)', 'The chi-squared critical value for a right tail.', ([p, df]) => { const q = prob(p), k = toNumber(df); return invert((x) => chisqCdf(x, k), 1 - q, 0, 1e4) }, { scalar: true }),
  'CHISQ.TEST': def(D, 'CHISQ.TEST(actual_range, expected_range)', 'The p-value of a chi-squared test of observed against expected counts.', ([a, e]) => {
    const A = toMatrix(a), E = toMatrix(e)
    if (A.height !== E.height || A.width !== E.width) fail('#N/A', 'The observed and expected ranges must be the same size.')
    let chi = 0
    for (let r = 0; r < A.height; r++) for (let c = 0; c < A.width; c++) { const o = toNumber(A.get(r, c)), x = toNumber(E.get(r, c)); if (x <= 0) fail('#DIV/0!'); chi += (o - x) ** 2 / x }
    const df = A.height > 1 && A.width > 1 ? (A.height - 1) * (A.width - 1) : Math.max(A.height, A.width) - 1
    return 1 - chisqCdf(chi, df)
  }),
  'F.DIST': def(D, 'F.DIST(x, deg_freedom1, deg_freedom2, cumulative)', 'The F distribution, used to compare two variances (as in ANOVA).', ([x, a, b, c]) => {
    const v = toNumber(x), d1 = toNumber(a), d2 = toNumber(b)
    if (v < 0 || d1 < 1 || d2 < 1) fail('#NUM!')
    if (optBool(c, false)) return fCdf(v, d1, d2)
    if (v === 0) return d1 < 2 ? fail('#NUM!') : d1 === 2 ? 1 : 0
    const lnBeta = gammaln(d1 / 2) + gammaln(d2 / 2) - gammaln((d1 + d2) / 2)
    return Math.exp(0.5 * (d1 * Math.log(d1 * v) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * v + d2)) - Math.log(v) - lnBeta)
  }, { scalar: true }),
  'F.DIST.RT': def(D, 'F.DIST.RT(x, deg_freedom1, deg_freedom2)', 'Right-tailed F probability.', ([x, a, b]) => 1 - fCdf(toNumber(x), toNumber(a), toNumber(b)), { scalar: true }),
  'BINOM.DIST': def(D, 'BINOM.DIST(number_s, trials, probability_s, cumulative)', 'The binomial distribution: the probability of exactly (or at most) k successes in n trials.', ([k, n, p, c]) => {
    const s = Math.floor(toNumber(k)), t = Math.floor(toNumber(n)), q = toNumber(p)
    if (s < 0 || s > t || q < 0 || q > 1) fail('#NUM!')
    const pmf = (i) => (q === 0 ? (i === 0 ? 1 : 0) : q === 1 ? (i === t ? 1 : 0) : Math.exp(lnChoose(t, i) + i * Math.log(q) + (t - i) * Math.log(1 - q)))
    if (!optBool(c, false)) return pmf(s)
    let sum = 0
    for (let i = 0; i <= s; i++) sum += pmf(i)
    return Math.min(1, sum)
  }, { scalar: true, example: ['=BINOM.DIST(3, 10, 0.5, FALSE)', '0.117: three heads in ten fair flips'] }),
  'POISSON.DIST': def(D, 'POISSON.DIST(x, mean, cumulative)', 'The Poisson distribution: counts of events in a fixed interval.', ([x, m, c]) => {
    const k = Math.floor(toNumber(x)), lam = toNumber(m)
    if (k < 0 || lam < 0) fail('#NUM!')
    const pmf = (i) => Math.exp(-lam + i * Math.log(lam) - gammaln(i + 1))
    if (!optBool(c, false)) return lam === 0 ? (k === 0 ? 1 : 0) : pmf(k)
    let sum = 0
    for (let i = 0; i <= k; i++) sum += lam === 0 ? (i === 0 ? 1 : 0) : pmf(i)
    return Math.min(1, sum)
  }, { scalar: true }),
  'EXPON.DIST': def(D, 'EXPON.DIST(x, lambda, cumulative)', 'The exponential distribution: waiting times between events.', ([x, l, c]) => { const v = toNumber(x), lam = toNumber(l); if (v < 0 || lam <= 0) fail('#NUM!'); return optBool(c, false) ? 1 - Math.exp(-lam * v) : lam * Math.exp(-lam * v) }, { scalar: true }),
  'CONFIDENCE.NORM': def(D, 'CONFIDENCE.NORM(alpha, standard_dev, size)', 'Half-width of a confidence interval for a mean, using the normal distribution.', ([a, s, n]) => normInv(1 - prob(a) / 2) * toNumber(s) / Math.sqrt(toNumber(n)), { scalar: true }),
  'CONFIDENCE.T': def(D, 'CONFIDENCE.T(alpha, standard_dev, size)', 'Half-width of a confidence interval for a mean, using the t distribution.', ([a, s, n]) => { const k = toNumber(n) - 1; const q = prob(a); return invert((t) => tCdf(t, k), 1 - q / 2, 0, 1e3) * toNumber(s) / Math.sqrt(toNumber(n)) }, { scalar: true }),
}

// Older names Excel still accepts.
const aliases = { STDEV: 'STDEV.S', STDEVP: 'STDEV.P', VAR: 'VAR.S', VARP: 'VAR.P', MODE: 'MODE.SNGL', RANK: 'RANK.EQ', PERCENTILE: 'PERCENTILE.INC', QUARTILE: 'QUARTILE.INC', FORECAST: 'FORECAST.LINEAR', NORMDIST: 'NORM.DIST', NORMINV: 'NORM.INV', NORMSINV: 'NORM.S.INV', TTEST: 'T.TEST', COVAR: 'COVARIANCE.P' }
export const statAliases = aliases
export { mean, variance, compare }
