// Beyond linear projections: independent component analysis (FastICA),
// manifold learning with Isomap (geodesic distances + classical MDS), and
// t-SNE for visualizing neighbourhoods.
import { random, normal, range, mean } from '../../kit/math.js'

// ---------- ICA ----------
export const SOURCE_SETS = {
  signals: { name: 'Sine wave + sawtooth', gen: (t, rng) => [Math.sin(t / 8), ((t / 13) % 2) - 1] },
  speech: { name: 'Two spiky (Laplace) “voices”', gen: (t, rng) => [laplace(rng) * (0.6 + 0.4 * Math.sin(t / 40)), laplace(rng)] },
  gaussian: { name: 'Two Gaussian noises (ICA cannot work)', gen: (t, rng) => [normal(rng), normal(rng)] },
}
function laplace(rng) { const u = rng() - 0.5; return -Math.sign(u) * Math.log(1 - 2 * Math.abs(u)) / Math.SQRT2 }
export const MIX = [[1, 0.6], [0.45, 1]]
export function makeSignals(key, n = 400, seed = 51) {
  const rng = random(seed), S = range(n).map(t => SOURCE_SETS[key].gen(t, rng))
  const std = [0, 1].map(j => { const m = mean(S.map(s => s[j])); return Math.sqrt(mean(S.map(s => (s[j] - m) ** 2))) })
  const Sn = S.map(s => s.map((v, j) => v / std[j]))
  return { S: Sn, X: Sn.map(s => [MIX[0][0] * s[0] + MIX[0][1] * s[1], MIX[1][0] * s[0] + MIX[1][1] * s[1]]) }
}
// Whitening: centre, rotate onto principal axes and rescale to unit variance.
export function whiten(X) {
  const m = [mean(X.map(x => x[0])), mean(X.map(x => x[1]))], C = X.map(x => [x[0] - m[0], x[1] - m[1]])
  const a = mean(C.map(c => c[0] * c[0])), b = mean(C.map(c => c[0] * c[1])), d = mean(C.map(c => c[1] * c[1]))
  const tr = a + d, det = a * d - b * b, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det)
  const v1 = Math.abs(b) > 1e-12 ? norm2([l1 - d, b]) : [1, 0], v2 = [-v1[1], v1[0]]
  return { Z: C.map(c => [(c[0] * v1[0] + c[1] * v1[1]) / Math.sqrt(l1), (c[0] * v2[0] + c[1] * v2[1]) / Math.sqrt(l2)]), pcs: [v1, v2] }
}
const norm2 = v => { const n = Math.hypot(...v); return v.map(x => x / n) }
// FastICA (deflation, g = tanh) on whitened data: find unit w maximizing non-Gaussianity of wᵀz.
export function fastICA(Z, iters = 200, seed = 3) {
  const rng = random(seed), W = []
  for (let c = 0; c < 2; c++) {
    let w = norm2([normal(rng), normal(rng)])
    for (let it = 0; it < iters; it++) {
      const proj = Z.map(z => w[0] * z[0] + w[1] * z[1]), g = proj.map(Math.tanh), gp = g.map(v => 1 - v * v)
      let nw = [mean(Z.map((z, i) => z[0] * g[i])) - mean(gp) * w[0], mean(Z.map((z, i) => z[1] * g[i])) - mean(gp) * w[1]]
      W.forEach(u => { const d = nw[0] * u[0] + nw[1] * u[1]; nw = [nw[0] - d * u[0], nw[1] - d * u[1]] })
      nw = norm2(nw)
      const done = Math.abs(Math.abs(nw[0] * w[0] + nw[1] * w[1]) - 1) < 1e-10
      w = nw
      if (done) break
    }
    W.push(w)
  }
  return { W, Y: Z.map(z => W.map(w => w[0] * z[0] + w[1] * z[1])) }
}
export const corr = (a, b) => { const ma = mean(a), mb = mean(b); return mean(a.map((x, i) => (x - ma) * (b[i] - mb))) / Math.sqrt(mean(a.map(x => (x - ma) ** 2)) * mean(b.map(x => (x - mb) ** 2))) }
export const excessKurtosis = xs => { const m = mean(xs), v = mean(xs.map(x => (x - m) ** 2)); return mean(xs.map(x => (x - m) ** 4)) / (v * v) - 3 }
// Best match of recovered to true sources (up to order and sign).
export function recovery(Y, S) {
  const c = [0, 1].map(i => [0, 1].map(j => Math.abs(corr(Y.map(y => y[i]), S.map(s => s[j])))))
  return Math.max((c[0][0] + c[1][1]) / 2, (c[0][1] + c[1][0]) / 2)
}

// ---------- Swiss roll and Isomap ----------
export function swissRoll(n = 300, seed = 5) {
  const rng = random(seed)
  return range(n).map(() => { const t = 1.5 * Math.PI * (1 + 2 * rng()), h = 12 * rng(); return { x: [t * Math.cos(t), h, t * Math.sin(t)], t, h } })
}
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
export function geodesic(points, k = 8) {
  const n = points.length, D = points.map(a => points.map(b => dist(a, b)))
  const nbr = D.map(row => row.map((d, j) => [d, j]).sort((a, b) => a[0] - b[0]).slice(1, k + 1))
  const adj = range(n).map(() => [])
  nbr.forEach((ns, i) => ns.forEach(([d, j]) => { adj[i].push([j, d]); adj[j].push([i, d]) }))
  return range(n).map(src => { const g = Array(n).fill(Infinity), done = Array(n).fill(false); g[src] = 0
    for (let it = 0; it < n; it++) { let u = -1; for (let v = 0; v < n; v++) if (!done[v] && (u < 0 || g[v] < g[u])) u = v; if (g[u] === Infinity) break; done[u] = true; adj[u].forEach(([v, w]) => { if (g[u] + w < g[v]) g[v] = g[u] + w }) }
    return g })
}
// Classical MDS: double-centre −½D² and take the top eigenvectors.
export function classicalMDS(D, k = 2, iters = 200) {
  const n = D.length, B0 = D.map(r => r.map(d => -0.5 * (Number.isFinite(d) ? d : 0) ** 2)), rm = B0.map(r => mean(r)), all = mean(rm)
  let B = B0.map((r, i) => r.map((v, j) => v - rm[i] - rm[j] + all))
  const out = range(n).map(() => []), rng = random(9)
  for (let c = 0; c < k; c++) {
    let v = range(n).map(() => normal(rng)), lam = 0
    for (let t = 0; t < iters; t++) { const u = B.map(r => r.reduce((s, x, j) => s + x * v[j], 0)), nr = Math.hypot(...u) || 1; lam = u.reduce((s, x, i) => s + x * v[i], 0); v = u.map(x => x / nr) }
    v.forEach((x, i) => out[i].push(x * Math.sqrt(Math.max(lam, 0))))
    B = B.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j]))
  }
  return out
}
export function pca2(points) {
  const d = points[0].length, m = range(d).map(j => mean(points.map(p => p[j]))), C = points.map(p => p.map((v, j) => v - m[j]))
  const D = C.map(a => C.map(b => dist(a, b)))
  return classicalMDS(D, 2)
}
// Spearman-style check: how well does an embedding coordinate track a known latent value?
export function rankCorr(a, b) { const r = xs => { const idx = xs.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), out = []; idx.forEach(([, i], k) => { out[i] = k }); return out }; return corr(r(a), r(b)) }

// ---------- t-SNE ----------
export function tsneData(seed = 7) {
  const rng = random(seed), d = 10, centers = [range(d).map(() => 0), range(d).map((_, j) => (j === 0 ? 6 : 0)), range(d).map((_, j) => (j === 1 ? 25 : 0))]
  const spec = [[60, 0.5], [60, 2], [30, 0.5]], pts = []
  spec.forEach(([n, sd], c) => range(n).forEach(() => pts.push({ x: centers[c].map(v => v + sd * normal(rng)), c })))
  return pts
}
function conditionalP(D2, perplexity) {
  const n = D2.length, P = range(n).map(() => Array(n).fill(0)), target = Math.log(perplexity)
  for (let i = 0; i < n; i++) {
    let lo = -Infinity, hi = Infinity, beta = 1
    for (let it = 0; it < 60; it++) {
      let sum = 0, H = 0
      for (let j = 0; j < n; j++) if (j !== i) { const p = Math.exp(-D2[i][j] * beta); P[i][j] = p; sum += p }
      for (let j = 0; j < n; j++) if (j !== i) { P[i][j] /= sum || 1e-300; if (P[i][j] > 1e-300) H -= P[i][j] * Math.log(P[i][j]) }
      if (Math.abs(H - target) < 1e-5) break
      if (H > target) { lo = beta; beta = hi === Infinity ? beta * 2 : (beta + hi) / 2 } else { hi = beta; beta = lo === -Infinity ? beta / 2 : (beta + lo) / 2 }
    }
  }
  return P
}
export function tsne(points, { perplexity = 20, iters = 400, seed = 1, lr = 50 } = {}) {
  const n = points.length, D2 = points.map(a => points.map(b => { const d = dist(a, b); return d * d }))
  const Pc = conditionalP(D2, perplexity), P = Pc.map((r, i) => r.map((v, j) => Math.max((v + Pc[j][i]) / (2 * n), 1e-12)))
  const rng = random(seed)
  let Y = range(n).map(() => [1e-2 * normal(rng), 1e-2 * normal(rng)]), V = range(n).map(() => [0, 0])
  for (let it = 0; it < iters; it++) {
    const ex = it < 100 ? 12 : 1, mom = it < 100 ? 0.5 : 0.8
    const num = Y.map(a => Y.map(b => 1 / (1 + (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)))
    let Z = 0; num.forEach((r, i) => r.forEach((v, j) => { if (i !== j) Z += v }))
    const G = Y.map((a, i) => { let g0 = 0, g1 = 0; for (let j = 0; j < n; j++) if (j !== i) { const m = (ex * P[i][j] - num[i][j] / Z) * num[i][j]; g0 += m * (a[0] - Y[j][0]); g1 += m * (a[1] - Y[j][1]) } return [4 * g0, 4 * g1] })
    V = V.map((v, i) => [mom * v[0] - lr * G[i][0], mom * v[1] - lr * G[i][1]])
    Y = Y.map((y, i) => [y[0] + V[i][0], y[1] + V[i][1]])
  }
  return Y
}
export const centroid = pts => [mean(pts.map(p => p[0])), mean(pts.map(p => p[1]))]
export const spread = pts => { const c = centroid(pts); return Math.sqrt(mean(pts.map(p => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2))) }
