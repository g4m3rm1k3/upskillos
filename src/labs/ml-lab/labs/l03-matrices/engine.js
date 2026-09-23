// Two-feature least squares. Features are centered with training means (so the
// intercept separates from the weights), optionally divided by training std.
import { random, normal, mean, std, eig2, solve } from '../../kit/math.js'

// y = 3·x1 + 2·x2(in original units) + 5 + noise. corr controls how strongly
// x2 follows x1; scale expresses x2 in larger units (e.g. KB instead of MB).
export function generate({ seed = 3, n = 60, corr = 0.3, scale = 1, noise = 1 } = {}) {
  const rng = random(seed), rows = []
  for (let i = 0; i < n; i++) {
    const a = normal(rng), b = normal(rng)
    const x1 = 2 + a, x2base = 1 + corr * a + Math.sqrt(Math.max(0, 1 - corr * corr)) * b
    rows.push({ x1, x2: x2base * scale, y: 5 + 3 * x1 + 2 * x2base + noise * normal(rng) })
  }
  return rows
}

export function prepare(rows, standardize) {
  const m1 = mean(rows.map(r => r.x1)), m2 = mean(rows.map(r => r.x2))
  const s1 = standardize ? std(rows.map(r => r.x1)) || 1 : 1, s2 = standardize ? std(rows.map(r => r.x2)) || 1 : 1
  const X = rows.map(r => [(r.x1 - m1) / s1, (r.x2 - m2) / s2]), y = rows.map(r => r.y)
  return { X, y, stats: { m1, m2, s1, s2 }, ybar: mean(y) }
}

// A = XᵀX / n (2×2). The MSE is L(w) = L* + (w − w*)ᵀ A (w − w*) for centered X.
export function curvature(X) {
  const n = X.length
  const a = X.reduce((t, r) => t + r[0] * r[0], 0) / n, b = X.reduce((t, r) => t + r[0] * r[1], 0) / n, d = X.reduce((t, r) => t + r[1] * r[1], 0) / n
  const e = eig2(a, b, d)
  return { A: [[a, b], [b, d]], eigen: e, condition: e.values[1] > 1e-12 ? e.values[0] / e.values[1] : Infinity, rank: e.values[1] > 1e-9 * Math.max(1, e.values[0]) ? 2 : 1 }
}

export function leastSquares(X, y) {
  const { A, rank } = curvature(X), n = X.length, ybar = mean(y)
  const c = [X.reduce((t, r, i) => t + r[0] * (y[i] - ybar), 0) / n, X.reduce((t, r, i) => t + r[1] * (y[i] - ybar), 0) / n]
  if (rank < 2) return { w: null, b: ybar, rank }
  return { w: solve(A, c), b: ybar, rank }
}

export const mse = (X, y, w, b) => mean(X.map((r, i) => (r[0] * w[0] + r[1] * w[1] + b - y[i]) ** 2))
export function gradient(X, y, w, b) {
  const e = X.map((r, i) => r[0] * w[0] + r[1] * w[1] + b - y[i])
  return { w: [2 * mean(e.map((v, i) => v * X[i][0])), 2 * mean(e.map((v, i) => v * X[i][1]))], b: 2 * mean(e) }
}
export function descend(X, y, rate, steps) {
  let w = [0, 0], b = 0
  const path = [{ w: [...w], b, loss: mse(X, y, w, b) }]
  for (let k = 0; k < steps; k++) {
    const g = gradient(X, y, w, b)
    w = [w[0] - rate * g.w[0], w[1] - rate * g.w[1]]; b -= rate * g.b
    const loss = mse(X, y, w, b)
    if (!Number.isFinite(loss) || loss > 1e12) return { path, diverged: true }
    path.push({ w: [...w], b, loss })
  }
  return { path, diverged: false }
}

// Refit on bootstrap resamples: how much would the weights move with other data?
export function resampledFits(rows, standardize, count = 30, seed = 11) {
  const rng = random(seed), fits = []
  for (let k = 0; k < count; k++) {
    const sample = rows.map(() => rows[Math.floor(rng() * rows.length)])
    const { X, y } = prepare(sample, standardize), fit = leastSquares(X, y)
    if (fit.w) fits.push(fit.w)
  }
  return fits
}

// Ellipse {w : (w − w*)ᵀ A (w − w*) = level} as a polyline.
export function levelCurve(center, eigen, level, points = 72) {
  const [l1, l2] = eigen.values, [v1, v2] = eigen.vectors
  if (l2 <= 1e-12) return []
  const r1 = Math.sqrt(level / l1), r2 = Math.sqrt(level / l2)
  return Array.from({ length: points + 1 }, (_, i) => {
    const t = 2 * Math.PI * i / points, a = r1 * Math.cos(t), c = r2 * Math.sin(t)
    return [center[0] + a * v1[0] + c * v2[0], center[1] + a * v1[1] + c * v2[1]]
  })
}
