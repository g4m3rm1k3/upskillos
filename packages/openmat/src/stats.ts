import { math } from './math-instance.js'
import { toPlain, realValue, isMatrix, isCollection, mapDeep, normalizeVector } from './math-utils.js'

// ── Descriptive statistics ────────────────────────────────────────────────────

export function statMean(value: unknown): number {
  const v = normalizeVector(value)
  return v.reduce((a, b) => a + b, 0) / v.length
}

export function statMedian(value: unknown): number {
  const v = [...normalizeVector(value)].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 === 0 ? (v[m - 1] + v[m]) / 2 : v[m]
}

export function statStd(value: unknown, flag = 0): number {
  const v = normalizeVector(value)
  const mu = statMean(v)
  const denom = flag === 1 ? v.length : v.length - 1
  return Math.sqrt(v.reduce((s, x) => s + (x - mu) ** 2, 0) / denom)
}

export function statVar(value: unknown, flag = 0): number { return statStd(value, flag) ** 2 }

export function statMin(value: unknown): number {
  const v = normalizeVector(value)
  return Array.isArray(toPlain(value)) ? Math.min(...v) : v[0]
}

export function statMax(value: unknown): number {
  const v = normalizeVector(value)
  return Array.isArray(toPlain(value)) ? Math.max(...v) : v[0]
}

export function statSum(value: unknown): number { return normalizeVector(value).reduce((a, b) => a + b, 0) }
export function statProd(value: unknown): number { return normalizeVector(value).reduce((a, b) => a * b, 1) }

export function statSort(value: unknown, dir = "ascend"): number[] {
  const v = [...normalizeVector(value)]
  v.sort((a, b) => a - b)
  return dir === "descend" ? v.reverse() : v
}

export function statUnique(value: unknown): number[] {
  return [...new Set(normalizeVector(value))].sort((a, b) => a - b)
}

export function statMod(a: unknown, b: unknown): number {
  return ((Number(a) % Number(b)) + Number(b)) % Number(b)
}

export function statRem(a: unknown, b: unknown): number { return Number(a) % Number(b) }

export function statFix(value: unknown): unknown {
  const fn = (x: number) => x >= 0 ? Math.floor(x) : Math.ceil(x)
  return isCollection(value) ? mapDeep(value, x => fn(Number(x))) : fn(Number(value))
}

export function statAny(value: unknown): 0 | 1 { return normalizeVector(value).some(Boolean) ? 1 : 0 }
export function statAll(value: unknown): 0 | 1 { return normalizeVector(value).every(Boolean) ? 1 : 0 }

export function statFind(value: unknown): number[] {
  const v = normalizeVector(value)
  return v.map((x, i) => (x ? i + 1 : null)).filter((x): x is number => x !== null)
}

// ── Array reshaping ───────────────────────────────────────────────────────────

// As in MATLAB: elements are read and written column by column, so reshape([1 2 3 4], 2, 2) is
// [1 3; 2 4]. One size may be [] and is then worked out from the element count.
export function reshapeArray(value: unknown, rows: unknown, cols: unknown): number[][] {
  const plain = toPlain(value)
  const grid = Array.isArray(plain) && Array.isArray(plain[0]) ? (plain as unknown[][]) : null
  const flat = grid
    ? grid[0].flatMap((_, j) => grid.map(row => realValue(row[j])))
    : normalizeVector(value)
  const blank = (size: unknown) => Array.isArray(toPlain(size)) && (toPlain(size) as unknown[]).length === 0
  let r = Number(rows), c = Number(cols)
  if (blank(rows)) r = flat.length / c
  if (blank(cols)) c = flat.length / r
  if (!Number.isInteger(r) || !Number.isInteger(c) || r * c !== flat.length)
    throw new Error(`reshape needs ${flat.length} elements to fill ${blank(rows) ? "[]" : rows} × ${blank(cols) ? "[]" : cols}; the sizes must multiply to the number of elements.`)
  return Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => flat[j * r + i]))
}

export function repmatArray(value: unknown, m: unknown, n: unknown): number[][] {
  const plain = toPlain(value)
  const isVec = !isMatrix(plain)
  const mat = isVec ? [normalizeVector(plain)] : (plain as number[][])
  const rowRep = Array.from({ length: Number(m) }, () => mat).flat()
  return rowRep.map(row => Array.from({ length: Number(n) }, () => row).flat())
}

// ── Histogram ─────────────────────────────────────────────────────────────────

export function histArray(value: unknown, bins: unknown = 10): { __histData: { centers: number[]; counts: number[] } } {
  const v = normalizeVector(value)
  const mn = Math.min(...v), mx = Math.max(...v)
  const w = (mx - mn) / Number(bins)
  const counts = Array<number>(Number(bins)).fill(0)
  v.forEach(x => {
    const i = Math.min(Math.floor((x - mn) / w), Number(bins) - 1)
    counts[i]++
  })
  const centers = Array.from({ length: Number(bins) }, (_, i) => mn + w * (i + 0.5))
  return { __histData: { centers, counts } }
}

// ── Polynomial roots via companion matrix ─────────────────────────────────────

export function companionRoots(coefficients: unknown): unknown[] {
  const coeffs = normalizeVector(coefficients).map(Number)
  while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-12) coeffs.shift()
  const degree = coeffs.length - 1
  if (degree <= 0) return []
  if (degree === 1) return [-coeffs[1] / coeffs[0]]
  const lead = coeffs[0]
  const companion = Array.from({ length: degree }, (_, row) =>
    Array.from({ length: degree }, (_, col) => {
      if (row === 0) return -(coeffs[col + 1] ?? 0) / lead
      return col === row - 1 ? 1 : 0
    }),
  )
  const eigen = math.eigs(companion as number[][])
  return toPlain(eigen.values ?? []) as unknown[]
}
