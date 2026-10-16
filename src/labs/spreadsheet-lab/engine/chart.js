// Charts: turning a block of cells into series to draw, the way Excel reads a
// selection. A first row of text is the series names; a first column of text
// (or dates) is the categories along the axis; every other column is a series.
// The maths behind the extras (axis ticks, histogram bins, a best-fit line)
// is here too, so it can be tested without drawing anything.
import { isMatrix, isError } from './values.js'

export const CHART_TYPES = {
  column: {
    label: 'Column',
    when: 'Compare amounts across a few categories: sales by month, scores by student.',
  },
  bar: {
    label: 'Bar',
    when: 'The same as a column chart turned sideways. Better when category names are long or there are many of them.',
  },
  line: {
    label: 'Line',
    when: 'Show how something changes over an ordered axis such as time. The line implies the points in between, so use it for ordered data only.',
  },
  scatter: {
    label: 'Scatter',
    when: 'Look for a relationship between two measurements, such as height and weight. Each row is one point: the first column is x, the others y.',
  },
  histogram: {
    label: 'Histogram',
    when: 'See how a single set of numbers is spread out: where most values fall, and whether it is lopsided. The numbers are grouped into ranges (bins) and each bar counts them.',
  },
  pie: {
    label: 'Pie',
    when: 'Show parts of one whole, when there are only a few parts. People compare lengths better than angles, so a column chart is often clearer.',
  },
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isText = (v) => typeof v === 'string' && v.trim() !== ''
const blank = (v) => v === null || v === undefined || v === ''

// rows: the cell values, row by row (a Matrix or a plain array of arrays).
// Returns { categories, series: [{ name, values }], xIsNumber, notes }.
export function readSeries(input, type = 'column') {
  const rows = (isMatrix(input) ? input.rows : input).map((r) => r.map((v) => (isError(v) ? null : v)))
  const height = rows.length
  const width = rows[0]?.length ?? 0
  const notes = []
  if (!height || !width) return { categories: [], series: [], xIsNumber: false, notes: ['The range is empty.'] }

  // Header row: everything in it is text (or blank), and something below is a number.
  const below = rows.slice(1)
  const hasHeader = height > 1 && rows[0].every((v) => blank(v) || isText(v)) && rows[0].some(isText) && below.some((r) => r.some(isNum))
  const body = hasHeader ? below : rows
  const header = hasHeader ? rows[0] : null

  // Category column: text (or blank) down the first column, with numbers to its
  // right; or, for a scatter, the first column is always x.
  const firstCol = body.map((r) => r[0])
  const textCategories = width > 1 && firstCol.some(isText) && firstCol.every((v) => blank(v) || isText(v) || isNum(v)) && firstCol.filter(isText).length >= firstCol.filter(isNum).length
  const blankCorner = header && blank(header[0]) && width > 1
  const xColumn = type === 'scatter' ? width > 1 : (textCategories || blankCorner)
  const first = xColumn ? 1 : 0

  const series = []
  for (let c = first; c < width; c++) {
    const name = header ? (isText(header[c]) ? header[c].trim() : 'Series ' + (c - first + 1)) : 'Series ' + (c - first + 1)
    series.push({ name, values: body.map((r) => (isNum(r[c]) ? r[c] : null)) })
  }
  let categories = xColumn ? firstCol.map((v) => (blank(v) ? '' : v)) : body.map((_, i) => i + 1)
  const xIsNumber = xColumn ? categories.every((v) => isNum(v) || v === '') : true
  if (type === 'scatter' && !xIsNumber) notes.push('A scatter chart needs numbers in the first column for x. Text there has been counted 1, 2, 3… instead.')
  if (type === 'scatter' && !xIsNumber) categories = categories.map((_, i) => i + 1)
  const skipped = body.reduce((n, r) => n + r.slice(first).filter((v) => isText(v)).length, 0)
  if (skipped) notes.push(skipped + ' text value' + (skipped === 1 ? ' was' : 's were') + ' left out: charts plot numbers only.')
  return { categories, series, xIsNumber, notes }
}

// A recommended chart for some data, with the reason, for the Chart button.
export function recommendChart(input) {
  const rows = isMatrix(input) ? input.rows : input
  const { series } = readSeries(input, 'column')
  const values = series.flatMap((x) => x.values).filter(isNum)
  const scatter = readSeries(input, 'scatter')
  const width = rows[0]?.length ?? 0
  if (width === 1 && values.length >= 15) {
    return { type: 'histogram', why: 'One column of many numbers: a histogram shows how they are spread.' }
  }
  if (width >= 2 && scatter.xIsNumber && scatter.notes.every((n) => !/scatter/.test(n))) {
    const xs = scatter.categories.filter(isNum)
    if (xs.length && xs.every((c) => Number.isInteger(c) && c > 1800 && c < 2200)) {
      return { type: 'line', why: 'The first column looks like years, so a line shows the change over time.' }
    }
    return { type: 'scatter', why: 'The first column holds numbers, so each row becomes a point (x, y) to look for a relationship.' }
  }
  return { type: 'column', why: 'Categories down the side and amounts beside them: a column chart compares the amounts.' }
}

// Round axis ticks: 0, 5, 10… or 0, 0.2, 0.4…, covering lo to hi.
export function niceTicks(lo, hi, target = 5) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1]
  if (lo === hi) { const pad = Math.abs(lo) || 1; lo -= pad / 2; hi += pad / 2 }
  const raw = (hi - lo) / target
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power
  const start = Math.floor(lo / step + 1e-9) * step
  const ticks = []
  for (let t = start; t < hi + step - 1e-9 * step; t += step) ticks.push(Number(t.toPrecision(12)))
  return ticks
}

// Rules for a histogram's bin width, from the values alone. Each gives a raw width; the chart then
// rounds it up to a readable step (1, 2, 2.5 or 5 × a power of ten).
export const BIN_RULES = {
  scott: { label: "Scott's rule", formula: '3.5 σ / n^(1/3)', why: "Excel's default. Assumes a roughly bell-shaped spread; widens with the standard deviation." },
  fd: { label: 'Freedman–Diaconis', formula: '2 IQR / n^(1/3)', why: 'Like Scott, but from the interquartile range, so a few huge values (outliers) do not make every bin wide.' },
  sturges: { label: "Sturges' rule", formula: 'range / (log₂ n + 1)', why: 'The oldest rule: log₂ n + 1 bins. Too few bins for large data, where it hides detail.' },
}
const sampleSd = (v) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, v.length - 1)) }
// The quartile by PERCENTILE.INC's rule: position q(n − 1) in the sorted values, interpolated.
const quartile = (sorted, q) => { const p = q * (sorted.length - 1), i = Math.floor(p); return sorted[i] + (p - i) * ((sorted[Math.min(i + 1, sorted.length - 1)]) - sorted[i]) }
export function ruleWidth(values, rule = 'scott') {
  const v = values.filter(isNum), n = v.length
  if (n < 2) return 0
  if (rule === 'fd') { const s = [...v].sort((a, b) => a - b); return (2 * (quartile(s, 0.75) - quartile(s, 0.25))) / Math.cbrt(n) }
  if (rule === 'sturges') return (Math.max(...v) - Math.min(...v)) / (Math.ceil(Math.log2(n)) + 1)
  return (3.5 * sampleSd(v)) / Math.cbrt(n)
}

export const MAX_BINS = 200
// Histogram bins: the width from a rule (Scott's by default, as Excel), rounded to a readable step
// and started on a multiple of it. count overrides the number of bins.
export function histogramBins(values, count = null, rule = 'scott') {
  const v = values.filter(isNum)
  if (!v.length) return { bins: [], width: 0 }
  const min = Math.min(...v), max = Math.max(...v)
  let width
  if (count) width = (max - min) / count || 1
  else {
    const raw = ruleWidth(v, BIN_RULES[rule] ? rule : 'scott')
    width = raw > 0 ? niceStep(raw) : 1
    // A narrow width over a huge range (one far-off value) would make thousands of bars: at most MAX_BINS.
    if ((max - min) / width > MAX_BINS) width = niceStep((max - min) / MAX_BINS)
  }
  const start = count ? min : Math.floor(min / width) * width
  const n = Math.max(1, count ?? Math.ceil((max - start) / width + 1e-9))
  const bins = Array.from({ length: n }, (_, i) => ({ from: start + i * width, to: start + (i + 1) * width, count: 0 }))
  for (const x of v) {
    let i = Math.floor((x - start) / width + 1e-9)
    if (i >= n) i = n - 1 // the maximum goes in the last bin
    bins[Math.max(0, i)].count++
  }
  return { bins: bins.map((b) => ({ ...b, from: Number(b.from.toPrecision(12)), to: Number(b.to.toPrecision(12)) })), width }
}

export function niceStep(x) {
  const power = 10 ** Math.floor(Math.log10(x))
  return ([1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= x) ?? 10 * power)
}

// Least-squares straight line through (x, y): y = slope·x + intercept, and R²
// (the share of the variation in y the line explains), as Excel's trendline.
export function linearFit(xs, ys) {
  const pts = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => isNum(x) && isNum(y))
  const n = pts.length
  if (n < 2) return null
  const mx = pts.reduce((s, p) => s + p[0], 0) / n
  const my = pts.reduce((s, p) => s + p[1], 0) / n
  let sxx = 0, sxy = 0, syy = 0
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); syy += (y - my) ** 2 }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const intercept = my - slope * mx
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy)
  return { slope, intercept, r2, n }
}


// Excel's "current region": the block of filled cells around a cell, grown
// until it is bordered by empty rows and columns. has(row, col) says whether
// a cell holds anything.
export function currentRegion(has, row, col, limit = 5000) {
  let r1 = row, r2 = row, c1 = col, c2 = col
  const rowHas = (r, a, b) => { if (r < 0) return false; for (let c = Math.max(0, a); c <= b; c++) if (has(r, c)) return true; return false }
  const colHas = (c, a, b) => { if (c < 0) return false; for (let r = Math.max(0, a); r <= b; r++) if (has(r, c)) return true; return false }
  for (let grew = true; grew && r2 - r1 < limit && c2 - c1 < limit;) {
    grew = false
    if (rowHas(r1 - 1, c1 - 1, c2 + 1)) { r1--; grew = true }
    if (rowHas(r2 + 1, c1 - 1, c2 + 1)) { r2++; grew = true }
    if (colHas(c1 - 1, r1 - 1, r2 + 1)) { c1--; grew = true }
    if (colHas(c2 + 1, r1 - 1, r2 + 1)) { c2++; grew = true }
  }
  return { r1, c1, r2, c2 }
}

// What to know about drawing this data this way: the notes from reading it,
// plus where the chosen type hides or distorts something.
export function chartAdvice(type, data, maxSeries = 8) {
  const out = [...data.notes]
  const { series, categories } = data
  if (series.length > maxSeries && type !== 'histogram') out.push('Only the first ' + maxSeries + ' series are drawn: more colours than that cannot be told apart. Chart fewer columns, or make several charts.')
  if (type === 'pie') {
    if (series.length > 1) out.push('A pie shows one series, so only "' + series[0].name + '" is drawn.')
    const v = series[0]?.values ?? []
    if (v.some((x) => Number.isFinite(x) && x < 0)) out.push('Negative values cannot be slices of a whole, so they are left out. A column chart can show them.')
    if (v.filter((x) => Number.isFinite(x) && x > 0).length > 7) out.push('Past seven slices the small ones are grouped as "Other": thin slices cannot be compared.')
  }
  if (type === 'line' && categories.length > 1 && categories.every((c) => typeof c === 'string') && !categories.every(looksOrdered)) {
    out.push('A line joins the points in order, which suggests the categories follow one another, like months. If yours are separate things, such as names, a column chart is more honest.')
  }
  if ((type === 'column' || type === 'bar') && categories.length > 30) out.push('With ' + categories.length + ' categories the bars get very thin. A line or a histogram may read better.')
  if (type === 'histogram') {
    const n = series.flatMap((s) => s.values).filter(Number.isFinite).length
    if (n < 10) out.push('A histogram needs plenty of values to show a shape; with ' + n + ' it says little.')
  }
  return out
}

const MONTHS = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|mon|tue|wed|thu|fri|sat|sun|q[1-4]|week|day|year|term|step|round)/i
const looksOrdered = (c) => MONTHS.test(c.trim()) || /\d/.test(c)
