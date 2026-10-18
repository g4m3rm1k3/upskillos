import { math } from './math-instance.js'
import { toPlain, toNumericMatrix, normalizeVector, makeDiagonal, realValue, inferSize } from './math-utils.js'

// ── Return-type interfaces ────────────────────────────────────────────────────

export interface RrefResult {
  matrix: number[][]
  pivots: Array<{ row: number; col: number }>
  steps: Array<{ type: 'swap' | 'scale' | 'eliminate'; label: string; matrix: number[][] }>
}

export interface SvdResult {
  U: number[][]
  S: number[][]
  V: number[][]
  /** Multi-return value for MATLAB-style [U,S,V] = svd(A) */
  __multi: [number[][], number[][], number[][]]
}

export interface LuResult {
  L: number[][]
  U: number[][]
  P: number[][]
  /** Multi-return value for MATLAB-style [L,U,P] = lu(A) */
  __multi: [number[][], number[][], number[][]]
}

// ── Row-reduction (RREF) ──────────────────────────────────────────────────────

export function rrefMatrix(value: unknown, tolerance = 1e-10): RrefResult {
  const matrix = toNumericMatrix(value)
  if (!matrix?.length) return { matrix: [], pivots: [], steps: [] }
  const out = matrix.map(row => [...row])
  const rowCount = out.length
  const colCount = Math.max(...out.map(row => row.length), 0)
  out.forEach(row => { while (row.length < colCount) row.push(0) })
  const steps: RrefResult['steps'] = []
  const pivots: RrefResult['pivots'] = []
  let lead = 0
  for (let row = 0; row < rowCount && lead < colCount; row++) {
    let pivotRow = row
    while (pivotRow < rowCount && Math.abs(out[pivotRow][lead]) <= tolerance) pivotRow++
    while (pivotRow === rowCount) {
      lead++
      if (lead >= colCount) return { matrix: out, pivots, steps }
      pivotRow = row
      while (pivotRow < rowCount && Math.abs(out[pivotRow][lead]) <= tolerance) pivotRow++
    }
    if (pivotRow !== row) {
      ;[out[row], out[pivotRow]] = [out[pivotRow], out[row]]
      steps.push({ type: "swap", label: `Swap R${row + 1} and R${pivotRow + 1}`, matrix: out.map(e => [...e]) })
    }
    const pivot = out[row][lead]
    if (Math.abs(pivot - 1) > tolerance) {
      for (let col = 0; col < colCount; col++) out[row][col] /= pivot
      steps.push({ type: "scale", label: `Scale R${row + 1} by 1/${Number(pivot.toFixed(6))}`, matrix: out.map(e => [...e]) })
    }
    for (let other = 0; other < rowCount; other++) {
      if (other === row) continue
      const factor = out[other][lead]
      if (Math.abs(factor) <= tolerance) continue
      for (let col = 0; col < colCount; col++) {
        out[other][col] -= factor * out[row][col]
        if (Math.abs(out[other][col]) <= tolerance) out[other][col] = 0
      }
      steps.push({ type: "eliminate", label: `R${other + 1} = R${other + 1} - (${Number(factor.toFixed(6))}) R${row + 1}`, matrix: out.map(e => [...e]) })
    }
    pivots.push({ row, col: lead })
    lead++
  }
  return { matrix: out, pivots, steps }
}

// ── SVD (with fallback for older mathjs builds) ───────────────────────────────

function computeSvdFallback(A: unknown): { U: number[][]; S: number[][]; V: number[][] } {
  const matrix = toNumericMatrix(A)
  if (!matrix?.length) return { U: [], S: [], V: [] }
  const m = matrix.length
  const n = Math.max(...matrix.map(row => row.length), 0)
  const padded = matrix.map(row => [...row, ...Array(Math.max(0, n - row.length)).fill(0)])
  const AT = toPlain(math.transpose(padded)) as number[][]
  const ATA = toPlain(math.multiply(AT, padded)) as number[][]
  const eig = math.eigs(ATA)
  const eigenPairs = ((eig.eigenvectors as unknown[]) || [])
    .map((entry: unknown, index: number) => {
      const e = entry as { value?: unknown; vector?: unknown }
      const value = Math.max(0, realValue((eig.values as unknown[])?.[index] ?? e.value ?? 0))
      const vector = normalizeVector(e.vector ?? [])
      return { value, sigma: Math.sqrt(value), vector }
    })
    .sort((a, b) => b.sigma - a.sigma)
  const Vcols = eigenPairs.map(pair => {
    const norm = Math.hypot(...pair.vector) || 1
    return pair.vector.map(entry => entry / norm)
  })
  const maxEig = eigenPairs.length ? eigenPairs[0].value : 0
  const eigenTol = maxEig * Math.max(m, n) * 2.22e-16
  const singular = eigenPairs.map(pair => (pair.value <= eigenTol ? 0 : pair.sigma))
  const Ucols = Vcols.map((vCol, index) => {
    const sigma = singular[index]
    const Av = normalizeVector(toPlain(math.multiply(padded, vCol)) as number[])
    if (sigma <= 1e-12) return Array.from({ length: m }, (_, row) => (row === index ? 1 : 0))
    return Av.map(entry => entry / sigma)
  })
  const U = Ucols.length ? toPlain(math.transpose(Ucols)) as number[][] : Array.from({ length: m }, () => [] as number[])
  const V = Vcols.length ? toPlain(math.transpose(Vcols)) as number[][] : Array.from({ length: n }, () => [] as number[])
  return { U, S: makeDiagonal(singular), V }
}

function computeSvd(A: unknown): { U: number[][]; S: number[][]; V: number[][] } {
  if (typeof (math as unknown as Record<string, unknown>).svd === "function") {
    const result = (math as unknown as { svd(m: unknown): { U: unknown; S: unknown; V: unknown } }).svd(A)
    return {
      U: toPlain(result.U) as number[][],
      S: Array.isArray((result.S as unknown[])?.[0])
        ? toPlain(result.S) as number[][]
        : makeDiagonal(toPlain(result.S)),
      V: toPlain(result.V) as number[][],
    }
  }
  return computeSvdFallback(A)
}

export function singularValues(A: unknown): number[] {
  // A single row or column (stored flat) or a scalar has one singular value: its length.
  const plain = toPlain(A) as unknown
  if (typeof plain === "number") return [Math.abs(plain)]
  if (Array.isArray(plain) && !plain.some(Array.isArray)) return [Math.hypot(...(plain as number[]).map(Number))]
  const matrix = toNumericMatrix(A)
  if (!matrix?.length) return []
  return jacobiSingularValues(matrix)
}

// One-sided Jacobi: rotate pairs of columns until all are perpendicular; the column lengths are then
// the singular values. Unlike the eigenvalues of AᵀA, this keeps small singular values accurate,
// which cond and rank depend on.
function jacobiSingularValues(matrix: number[][]): number[] {
  const n0 = Math.max(...matrix.map(row => row.length))
  const rows = matrix.map(row => [...row, ...Array(n0 - row.length).fill(0)].map(Number))
  const wide = rows.length < n0
  const m = wide ? n0 : rows.length, n = wide ? rows.length : n0
  const cols = Array.from({ length: n }, (_, j) => Array.from({ length: m }, (_, i) => (wide ? rows[j][i] : rows[i][j])))
  const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0)
  for (let sweep = 0; sweep < 60; sweep++) {
    let rotated = false
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
      const alpha = dot(cols[i], cols[i]), beta = dot(cols[j], cols[j]), gamma = dot(cols[i], cols[j])
      if (gamma === 0 || Math.abs(gamma) <= 1e-15 * Math.sqrt(alpha * beta)) continue
      rotated = true
      const zeta = (beta - alpha) / (2 * gamma)
      const t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta))
      const c = 1 / Math.sqrt(1 + t * t), s = c * t
      for (let k = 0; k < m; k++) {
        const a = cols[i][k], b = cols[j][k]
        cols[i][k] = c * a - s * b
        cols[j][k] = s * a + c * b
      }
    }
    if (!rotated) break
  }
  return cols.map(col => Math.sqrt(dot(col, col))).sort((a, b) => b - a)
}

// ── Rank / condition number / determinant ─────────────────────────────────────

export function matrixRank(A: unknown, tolerance: number | null = null): number {
  const s = singularValues(A)
  const max = Math.max(...s, 0)
  const tol = tolerance == null ? max * Math.max(inferSize(A)[0], inferSize(A)[1]) * 1e-10 : Number(tolerance)
  return s.filter(entry => entry > tol).length
}

export function conditionNumber(A: unknown): number {
  // Every singular value counts: a zero one makes the matrix singular, so cond is infinite.
  const s = singularValues(A)
  if (!s.length || Math.min(...s) === 0) return Infinity
  return Math.max(...s) / Math.min(...s)
}

export function determinantValue(value: unknown): number | null {
  const matrix = toNumericMatrix(value)
  if (!matrix?.length || !matrix.every(row => row.length === matrix.length)) return null
  try { return realValue(toPlain(math.det(matrix))) } catch { return null }
}

// ── LU decomposition ──────────────────────────────────────────────────────────

export function luFactorization(value: unknown, tolerance = 1e-12): LuResult {
  const matrix = toNumericMatrix(value)
  if (!matrix?.length || !matrix.every(row => row.length === matrix.length))
    throw new Error("lu(A) requires a square numeric matrix.")
  const n = matrix.length
  const U = matrix.map(row => [...row])
  const L: number[][] = Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, col) => (row === col ? 1 : 0)))
  const P: number[][] = Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, col) => (row === col ? 1 : 0)))
  for (let pivot = 0; pivot < n; pivot++) {
    let pivotRow = pivot, maxEntry = Math.abs(U[pivot][pivot])
    for (let row = pivot + 1; row < n; row++) {
      const entry = Math.abs(U[row][pivot])
      if (entry > maxEntry) { maxEntry = entry; pivotRow = row }
    }
    if (maxEntry <= tolerance) throw new Error("lu(A) failed because the matrix is singular or nearly singular.")
    if (pivotRow !== pivot) {
      ;[U[pivot], U[pivotRow]] = [U[pivotRow], U[pivot]]
      ;[P[pivot], P[pivotRow]] = [P[pivotRow], P[pivot]]
      for (let col = 0; col < pivot; col++) {
        const tmp = L[pivot][col]; L[pivot][col] = L[pivotRow][col]; L[pivotRow][col] = tmp
      }
    }
    for (let row = pivot + 1; row < n; row++) {
      const factor = U[row][pivot] / U[pivot][pivot]
      L[row][pivot] = factor
      for (let col = pivot; col < n; col++) U[row][col] -= factor * U[pivot][col]
    }
  }
  return { __multi: [L, U, P], L, U, P }
}

// ── Orthonormal basis (orth / null) ───────────────────────────────────────────

export function orthonormalBasis(A: unknown, mode = "orth"): number[][] {
  const { U, V, S } = computeSvd(A)
  const singular = normalizeVector(math.diag(S)).map(entry => Math.abs(Number(entry)))
  const tol = Math.max(...singular, 0) * Math.max(inferSize(A)[0], inferSize(A)[1]) * 1e-10
  const source = toPlain(mode === "null" ? V : U) as number[][]
  const rowCount = Array.isArray(source) ? source.length : 0
  const colCount = rowCount ? Math.max(...source.map(row => (Array.isArray(row) ? row.length : 0)), 0) : 0
  const columns = Array.from({ length: colCount }, (_, col) =>
    Array.from({ length: rowCount }, (_, row) => realValue(source[row]?.[col] ?? 0)),
  )
  const keep = columns.filter((column, index) => {
    if (!column.some(value => Number.isFinite(value))) return false
    const sv = index < singular.length ? singular[index] : 0
    return mode === "null" ? sv <= tol : sv > tol
  })
  return keep.length
    ? Array.from({ length: keep[0].length }, (_, row) => keep.map(col => col[row] ?? 0))
    : []
}

// ── SVD public export ─────────────────────────────────────────────────────────

export function svdDecomp(A: unknown): SvdResult {
  const { U, S, V } = computeSvd(A)
  return { __multi: [U, S, V], U, S, V }
}
