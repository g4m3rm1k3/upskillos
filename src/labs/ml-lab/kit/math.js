// Small, inspectable numeric helpers shared by every lab engine.
// Deterministic: every random quantity comes from a seeded generator so a
// learner can reproduce a run exactly by keeping the seed.
import { random } from '../engine.js'

export { random }
export const sum = values => values.reduce((total, v) => total + v, 0)
export const mean = values => values.length ? sum(values) / values.length : NaN
export function variance(values, ddof = 0) {
  const m = mean(values)
  return sum(values.map(v => (v - m) ** 2)) / (values.length - ddof)
}
export const std = (values, ddof = 0) => Math.sqrt(variance(values, ddof))
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const range = n => Array.from({ length: n }, (_, i) => i)
export const linspace = (a, b, n) => range(n).map(i => n === 1 ? a : a + (b - a) * i / (n - 1))
export const argmax = values => values.reduce((best, v, i) => v > values[best] ? i : best, 0)
export const argmin = values => values.reduce((best, v, i) => v < values[best] ? i : best, 0)
export const sigmoid = z => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z))
export const dot = (a, b) => a.reduce((total, v, i) => total + v * b[i], 0)

// Box–Muller transform: two uniforms → one standard normal draw.
export function normal(rng) {
  return Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng())
}
// Fisher–Yates shuffle of a copy; the input is never mutated.
export function shuffle(items, rng) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]] }
  return out
}
export function quantile(values, q) {
  const s = [...values].sort((a, b) => a - b), pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}
export const median = values => quantile(values, 0.5)

// Matrices are arrays of row arrays. Kept deliberately small and explicit.
export const transpose = A => A[0].map((_, j) => A.map(row => row[j]))
export const matmul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((t, v, k) => t + v * B[k][j], 0)))
export const matvec = (A, v) => A.map(row => dot(row, v))
// Solve A x = b by Gaussian elimination with partial pivoting.
export function solve(A, b) {
  const n = A.length, M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    if (Math.abs(M[p][c]) < 1e-12) throw new Error('Matrix is singular or nearly singular')
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k] }
  }
  const x = Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) x[r] = (M[r][n] - sum(range(n - r - 1).map(i => M[r][r + 1 + i] * x[r + 1 + i]))) / M[r][r]
  return x
}
// Symmetric 2×2 eigen-decomposition (closed form); eigenvalues descending.
export function eig2(a, b, d) {
  const tr = a + d, det = a * d - b * b, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det))
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc
  const vec = l => Math.abs(b) > 1e-12 ? norm2([l - d, b]) : (a >= d ? (l === l1 ? [1, 0] : [0, 1]) : (l === l1 ? [0, 1] : [1, 0]))
  return { values: [l1, l2], vectors: [vec(l1), vec(l2)] }
}
function norm2([x, y]) { const n = Math.hypot(x, y); return [x / n, y / n] }

export const fmt = (n, digits = 4) => Number.isFinite(n) ? (Math.abs(n) >= 10000 ? n.toExponential(2) : Number(n.toFixed(digits)).toString()) : '—'
export const pct = n => Number.isFinite(n) ? `${(100 * n).toFixed(1)}%` : '—'

// Symmetric eigen-decomposition by cyclic Jacobi rotations. Returns eigenvalues
// in descending order and the matching unit eigenvectors (as rows).
export function symmetricEigen(S, sweeps = 60) {
  const n = S.length, A = S.map(r => [...r]), V = range(n).map(i => range(n).map(j => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q]
    if (off < 1e-20) break
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-15) continue
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
      const c = 1 / Math.sqrt(t * t + 1), s = t * c
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq }
    }
  }
  const order = range(n).sort((a, b) => A[b][b] - A[a][a])
  return { values: order.map(i => A[i][i]), vectors: order.map(i => V.map(row => row[i])) }
}
