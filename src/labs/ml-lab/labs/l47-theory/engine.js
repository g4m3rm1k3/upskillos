// Learning theory: Hoeffding and union bounds for finite classes, VC dimension
// by shattering, and double descent with minimum-norm interpolation.
import { random, normal, range, mean } from '../../kit/math.js'

// ---------- Finite hypothesis class: thresholds on [0, 1] ----------
// Truth: y = 1 if x > 0.6, with labels flipped with probability `noise`.
// Hypotheses h_t(x) = 1[x > t] for K thresholds; true error is known exactly.
export function thresholdClass(K) { return range(K).map(i => (i + 0.5) / K) }
export const trueError = (t, noise, cut = 0.6) => noise + (1 - 2 * noise) * Math.abs(t - cut)
export function sampleData(n, noise, rng, cut = 0.6) { return range(n).map(() => { const x = rng(), y = (x > cut) !== (rng() < noise) ? 1 : 0; return { x, y } }) }
export const empError = (t, data) => mean(data.map(d => ((d.x > t ? 1 : 0) !== d.y ? 1 : 0)))
export const hoeffdingEps = (n, delta, H = 1) => Math.sqrt((Math.log(H) + Math.log(2 / delta)) / (2 * n))
// Repeat the experiment: the largest gap over the whole class, and ERM's excess error.
export function uniformExperiment({ n = 100, K = 50, noise = 0.1, trials = 300, seed = 47 } = {}) {
  const rng = random(seed), H = thresholdClass(K)
  return range(trials).map(() => {
    const d = sampleData(n, noise, rng), gaps = H.map(t => Math.abs(empError(t, d) - trueError(t, noise)))
    const erm = H.reduce((b, t) => empError(t, d) < empError(b, d) ? t : b, H[0])
    return { maxGap: Math.max(...gaps), singleGap: gaps[Math.floor(K / 2)], excess: trueError(erm, noise) - Math.min(...H.map(t => trueError(t, noise))) }
  })
}
export const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] }

// ---------- Shattering with half-planes in 2D ----------
export const POINT_SETS = {
  three: { name: 'Three points, not on a line', pts: [[-1, -0.6], [1, -0.6], [0, 1]] },
  collinear: { name: 'Three points on a line', pts: [[-1, 0], [0, 0], [1, 0]] },
  four: { name: 'Four points in a square', pts: [[-1, -1], [1, -1], [1, 1], [-1, 1]] },
  inside: { name: 'Four points, one inside the triangle', pts: [[-1.2, -0.8], [1.2, -0.8], [0, 1.2], [0, -0.1]] },
}
// Is the labelling realizable by a half-plane? Perceptron with bias converges iff separable.
export function separable(pts, labels, epochs = 2000) {
  if (labels.every(l => l === labels[0])) return { ok: true, w: [0, 0, labels[0] ? 1 : -1] }
  let w = [0, 0, 0]
  for (let e = 0; e < epochs; e++) {
    let mistakes = 0
    pts.forEach((p, i) => { const y = labels[i] ? 1 : -1; if (y * (w[0] * p[0] + w[1] * p[1] + w[2]) <= 0) { w = [w[0] + y * p[0], w[1] + y * p[1], w[2] + y]; mistakes++ } })
    if (!mistakes) return { ok: true, w }
  }
  return { ok: false, w }
}
export function shatter(pts) {
  const labellings = range(2 ** pts.length).map(m => pts.map((_, i) => (m >> i) & 1))
  const results = labellings.map(l => ({ labels: l, ...separable(pts, l) }))
  return { results, shattered: results.every(r => r.ok), realizable: results.filter(r => r.ok).length }
}

// ---------- Double descent ----------
// Linear target in d = 10 dimensions, n training points; p random ReLU features;
// the minimum-norm least-squares fit (interpolating once p ≥ n).
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j] } }
  return M.map((r, i) => r[n] / r[i])
}
export function minNormFit(Phi, y, ridge = 1e-8) {
  const n = Phi.length, p = Phi[0].length
  if (p <= n) {
    const G = range(p).map(i => range(p).map(j => Phi.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? ridge : 0)))
    return solve(G, range(p).map(i => Phi.reduce((s, r, k) => s + r[i] * y[k], 0)))
  }
  const K = Phi.map((a, i) => Phi.map((b, j) => a.reduce((s, v, k) => s + v * b[k], 0) + (i === j ? ridge : 0)))
  const alpha = solve(K, y)
  return range(p).map(j => Phi.reduce((s, r, i) => s + r[j] * alpha[i], 0))
}
export const PS = [2, 5, 10, 20, 30, 36, 40, 44, 50, 60, 80, 120, 200, 400]
export function doubleDescent({ n = 40, d = 10, noise = 0.5, reps = 12, seed = 7, ridge = 1e-8 } = {}) {
  return PS.map(p => {
    const errs = range(reps).map(r => {
      const rng = random(seed + 101 * r), beta = range(d).map(() => normal(rng) / Math.sqrt(d))
      const W = range(p).map(() => range(d).map(() => normal(rng) / Math.sqrt(d)))
      const feat = x => W.map(w => Math.max(0, w.reduce((s, v, k) => s + v * x[k], 0)))
      const draw = m => range(m).map(() => { const x = range(d).map(() => normal(rng)); return { x, y: x.reduce((s, v, k) => s + v * beta[k], 0) + noise * normal(rng) } })
      const train = draw(n), test = draw(300), w = minNormFit(train.map(t => feat(t.x)), train.map(t => t.y), ridge)
      const pred = x => feat(x).reduce((s, v, k) => s + v * w[k], 0)
      return { train: mean(train.map(t => (pred(t.x) - t.y) ** 2)), test: mean(test.map(t => (pred(t.x) - t.y) ** 2)), norm: Math.sqrt(w.reduce((s, v) => s + v * v, 0)) }
    })
    const med = k => quantile(errs.map(e => e[k]), 0.5)
    return { p, train: med('train'), test: med('test'), norm: med('norm') }
  })
}
