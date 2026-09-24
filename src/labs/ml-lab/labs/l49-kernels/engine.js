// Kernel methods: feature maps and kernels, positive-definiteness of Gram
// matrices, kernel ridge regression (and its equivalence to explicit
// features), kernel PCA, and choosing kernel parameters by cross-validation.
import { random, normal, range, mean } from '../../kit/math.js'
import { cholesky, cholSolve } from '../../kit/linalg.js'

export const KERNELS = {
  linear: { name: 'Linear x·z', k: (a, b) => dot(a, b), valid: true },
  poly: { name: 'Polynomial (1 + x·z)^d', k: (a, b, h) => (1 + dot(a, b)) ** h.degree, valid: true },
  rbf: { name: 'RBF exp(−γ‖x − z‖²)', k: (a, b, h) => Math.exp(-h.gamma * dist2(a, b)), valid: true },
  laplace: { name: 'Laplacian exp(−γ‖x − z‖)', k: (a, b, h) => Math.exp(-h.gamma * Math.sqrt(dist2(a, b))), valid: true },
  tanh: { name: 'tanh(x·z − 1) — not a valid kernel', k: (a, b) => Math.tanh(dot(a, b) - 1), valid: false },
}
function dot(a, b) { return Array.isArray(a) ? a.reduce((s, v, i) => s + v * b[i], 0) : a * b }
function dist2(a, b) { return Array.isArray(a) ? a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) : (a - b) ** 2 }
export const gram = (X, key, h) => X.map(a => X.map(b => KERNELS[key].k(a, b, h)))

// ---------- 1D regression data ----------
export const target = x => Math.sin(3 * x) + 0.3 * x * x
export function regData(n = 30, seed = 49, noise = 0.2) { const rng = random(seed); return range(n).map(() => { const x = -2 + 4 * rng(); return { x, y: target(x) + noise * normal(rng) } }) }
// Kernel ridge regression: α = (K + λI)⁻¹ y,  f(x) = Σ αᵢ k(xᵢ, x).
export function krr(data, key, h, lambda) {
  const X = data.map(d => d.x), K = gram(X, key, h).map((r, i) => r.map((v, j) => v + (i === j ? lambda : 0)))
  const alpha = Array.from(cholSolve(cholesky(K, 1e-10), data.map(d => d.y)))
  return { alpha, predict: x => X.reduce((s, xi, i) => s + alpha[i] * KERNELS[key].k(xi, x, h), 0) }
}
// The same model with explicit polynomial features of (1 + xz)^d (scaled monomials).
export function explicitPolyRidge(data, degree, lambda) {
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r }
  const phi = x => range(degree + 1).map(k => Math.sqrt(binom(degree, k)) * x ** k)
  const P = data.map(d => phi(d.x)), m = degree + 1
  const A = range(m).map(i => range(m).map(j => P.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? lambda : 0)))
  const w = Array.from(cholSolve(cholesky(A, 1e-12), range(m).map(i => P.reduce((s, r, k) => s + r[i] * data[k].y, 0))))
  return { w, predict: x => phi(x).reduce((s, v, i) => s + v * w[i], 0) }
}
export function kfoldError(data, key, h, lambda, folds = 5) {
  return mean(range(folds).map(f => {
    const test = data.filter((_, i) => i % folds === f), train = data.filter((_, i) => i % folds !== f), m = krr(train, key, h, lambda)
    return mean(test.map(d => (m.predict(d.x) - d.y) ** 2))
  }))
}
export const GAMMAS = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30]
export const LAMBDAS = [1e-4, 1e-3, 1e-2, 0.1, 1]

// ---------- Eigenvalues of a Gram matrix (power iteration with deflation) ----------
export function topEigen(M, k, iters = 300, seed = 3) {
  const n = M.length, rng = random(seed), vals = [], vecs = []
  let A = M.map(r => [...r])
  for (let c = 0; c < k; c++) {
    let v = range(n).map(() => normal(rng)), lam = 0
    for (let t = 0; t < iters; t++) {
      const u = A.map(r => r.reduce((s, x, j) => s + x * v[j], 0)), nrm = Math.hypot(...u) || 1
      lam = u.reduce((s, x, i) => s + x * v[i], 0); v = u.map(x => x / nrm)
    }
    vals.push(lam); vecs.push(v)
    A = A.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j]))
  }
  return { vals, vecs }
}
// All eigenvalues of a small symmetric matrix (Jacobi rotations).
export function eigenvalues(S, sweeps = 50) {
  const n = S.length, A = S.map(r => [...r])
  for (let s = 0; s < sweeps; s++) for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
    if (Math.abs(A[p][q]) < 1e-12) continue
    const th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]), c = Math.cos(th), sn = Math.sin(th)
    for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - sn * akq; A[k][q] = sn * akp + c * akq }
    for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - sn * aqk; A[q][k] = sn * apk + c * aqk }
  }
  return range(n).map(i => A[i][i]).sort((a, b) => b - a)
}

// ---------- Kernel PCA on concentric circles ----------
export function circles(n = 150, seed = 4) {
  const rng = random(seed)
  return range(n).map(i => { const ring = i % 2, r = ring ? 2.2 : 0.8, t = 2 * Math.PI * rng(); return { x: [r * Math.cos(t) + 0.12 * normal(rng), r * Math.sin(t) + 0.12 * normal(rng)], ring } })
}
export function centerGram(K) {
  const n = K.length, rowMean = K.map(r => mean(r)), all = mean(rowMean)
  return K.map((r, i) => r.map((v, j) => v - rowMean[i] - rowMean[j] + all))
}
export function kernelPCA(pts, key, h, k = 2) {
  const Kc = centerGram(gram(pts.map(p => p.x), key, h)), { vals, vecs } = topEigen(Kc, k)
  // Projection of training point i on component c: √λ_c · v_c[i].
  return { vals, proj: pts.map((_, i) => vecs.map((v, c) => Math.sqrt(Math.max(vals[c], 0)) * v[i])) }
}
// Separability of the rings along one coordinate: best threshold accuracy.
export function thresholdAccuracy(values, labels) {
  const idx = values.map((v, i) => i).sort((a, b) => values[a] - values[b]), n = values.length, ones = labels.reduce((s, l) => s + l, 0)
  let best = Math.max(ones, n - ones), left1 = 0
  idx.forEach((i, k) => { left1 += labels[i]; const left0 = k + 1 - left1; best = Math.max(best, left0 + (ones - left1), left1 + (n - k - 1 - (ones - left1))) })
  return best / n
}
