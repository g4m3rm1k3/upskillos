// Dense linear algebra for small symmetric positive-definite systems:
// Cholesky factorization, triangular solves, log-determinants and Gaussian
// samples. Used by Gaussian processes, mixtures and samplers.
import { normal } from './math.js'

// Lower-triangular L with A = LLᵀ. `jitter` is added to the diagonal.
export function cholesky(A, jitter = 0) {
  const n = A.length, L = Array.from({ length: n }, () => new Float64Array(n))
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j] + (i === j ? jitter : 0)
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
    if (i === j) { if (s <= 0) throw new Error('Matrix is not positive definite'); L[i][i] = Math.sqrt(s) } else L[i][j] = s / L[j][j]
  }
  return L
}
export function forwardSolve(L, b) { const n = L.length, z = new Float64Array(n); for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * z[k]; z[i] = s / L[i][i] } return z }
export function backSolve(L, z) { const n = L.length, x = new Float64Array(n); for (let i = n - 1; i >= 0; i--) { let s = z[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i] } return x }
// Solve (LLᵀ)x = b.
export const cholSolve = (L, b) => backSolve(L, forwardSolve(L, b))
export const logDet = L => 2 * L.reduce((s, row, i) => s + Math.log(row[i]), 0)
// A sample from N(mean, LLᵀ).
export function gaussianSample(mean, L, rng) { const z = mean.map(() => normal(rng)); return mean.map((m, i) => { let s = m; for (let k = 0; k <= i; k++) s += L[i][k] * z[k]; return s }) }
