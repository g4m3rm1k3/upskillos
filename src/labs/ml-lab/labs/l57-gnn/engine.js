// Graph neural networks: message passing and graph convolution for semi-
// supervised node classification on a graph with communities, compared with a
// features-only network; plus over-smoothing as layers are stacked.
import { random, normal, range, mean } from '../../kit/math.js'
import { Dense, ReLU, Sequential, softmaxCE, Adam } from '../../kit/nn.js'

// Stochastic block model: 3 communities; noisy node features weakly indicate the community.
export function makeGraph({ n = 90, k = 3, pIn = 0.16, pOut = 0.012, featNoise = 1.6, dim = 8, seed = 57 } = {}) {
  const rng = random(seed), y = range(n).map(i => i % k)
  const edges = []
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rng() < (y[i] === y[j] ? pIn : pOut)) edges.push([i, j])
  const protos = range(k).map(() => range(dim).map(() => normal(rng)))
  const X = y.map(c => Float64Array.from(protos[c], v => 0.6 * v + featNoise * normal(rng)))
  return { n, k, y, edges, X }
}
// Normalized adjacency with self-loops: Â = D^(−1/2)(A + I)D^(−1/2), stored as neighbour lists.
export function normAdj(g) {
  const nb = range(g.n).map(i => [i]); g.edges.forEach(([a, b]) => { nb[a].push(b); nb[b].push(a) })
  const deg = nb.map(l => l.length)
  return nb.map((l, i) => l.map(j => [j, 1 / Math.sqrt(deg[i] * deg[j])]))
}
export const propagate = (A, H) => A.map(row => { const out = new Float64Array(H[0].length); row.forEach(([j, w]) => { const h = H[j]; for (let k = 0; k < out.length; k++) out[k] += w * h[k] }); return out })

// A graph convolution: aggregate neighbours with Â, then apply a dense layer.
class GraphConv {
  constructor(A, nin, nout, rng) { this.A = A; this.dense = new Dense(nin, nout, rng, { init: 'xavier' }) }
  forward(H) { return this.dense.forward(propagate(this.A, H)) }
  backward(dY) { return propagate(this.A, this.dense.backward(dY)) } // Â is symmetric
  params() { return this.dense.params() }
}
export function labeledIdx(g, perClass, seed = 1) {
  const rng = random(seed), out = []
  range(g.k).forEach(c => { const pool = range(g.n).filter(i => g.y[i] === c).sort(() => rng() - 0.5); out.push(...pool.slice(0, perClass)) })
  return out
}
// Train on the labelled nodes only (the whole graph is visible — transductive setting).
export function train(g, kind, { perClass = 2, hidden = 16, epochs = 200, seed = 1, layers = 2, labelSeed = 1 } = {}) {
  const rng = random(seed), A = normAdj(g), L = labeledIdx(g, perClass, labelSeed)
  const dims = [g.X[0].length, ...range(layers - 1).map(() => hidden), g.k], mods = []
  dims.slice(1).forEach((d, i) => { mods.push(kind === 'gcn' ? new GraphConv(A, dims[i], d, rng) : new Dense(dims[i], d, rng, { init: 'xavier' })); if (i < dims.length - 2) mods.push(ReLU()) })
  const net = new Sequential(mods), opt = new Adam(net.params(), { lr: 0.02, weightDecay: 5e-3 })
  const labelSet = new Set(L)
  for (let e = 0; e < epochs; e++) {
    net.zeroGrad()
    const out = net.forward(g.X), r = softmaxCE(L.map(i => out[i]), L.map(i => g.y[i]))
    const grad = out.map(() => new Float64Array(g.k)); L.forEach((i, t) => { grad[i] = r.grad[t] })
    net.backward(grad); opt.step()
  }
  const out = net.forward(g.X), pred = out.map(z => z.indexOf(Math.max(...z)))
  const unl = range(g.n).filter(i => !labelSet.has(i))
  return { pred, labeled: L, acc: mean(unl.map(i => (pred[i] === g.y[i] ? 1 : 0))) }
}
// Over-smoothing: repeated propagation makes node features indistinguishable.
export function smoothing(g, maxK = 32) {
  const A = normAdj(g)
  let H = g.X.map(x => Float64Array.from(x))
  const out = []
  for (let k = 0; k <= maxK; k++) {
    if ([0, 1, 2, 4, 8, 16, 32].includes(k)) {
      const m = range(H[0].length).map(j => mean(H.map(h => h[j]))), spread = mean(H.map(h => h.reduce((s, v, j) => s + (v - m[j]) ** 2, 0)))
      const cm = range(g.k).map(c => { const rows = H.filter((_, i) => g.y[i] === c); return range(H[0].length).map(j => mean(rows.map(r => r[j]))) })
      const within = mean(H.map((h, i) => h.reduce((s, v, j) => s + (v - cm[g.y[i]][j]) ** 2, 0)))
      out.push({ k, spread, ratio: within / Math.max(spread, 1e-12), acc: centroidAcc(H, g) })
    }
    H = propagate(A, H)
  }
  return out
}
// Nearest-centroid accuracy using centroids of 2 labelled nodes per class (a simple probe).
function centroidAcc(H, g) {
  const L = labeledIdx(g, 2, 1), cent = range(g.k).map(c => { const rows = L.filter(i => g.y[i] === c).map(i => H[i]); return range(H[0].length).map(j => mean(rows.map(r => r[j]))) })
  return mean(H.map((h, i) => { const d = cent.map(c => c.reduce((s, v, j) => s + (v - h[j]) ** 2, 0)); return d.indexOf(Math.min(...d)) === g.y[i] ? 1 : 0 }))
}
// Force-directed layout for drawing (deterministic).
export function layout(g, iters = 300, seed = 3) {
  const rng = random(seed), P = range(g.n).map(i => [Math.cos(2 * Math.PI * g.y[i] / g.k) + 0.8 * rng(), Math.sin(2 * Math.PI * g.y[i] / g.k) + 0.8 * rng()])
  for (let t = 0; t < iters; t++) {
    const F = P.map(() => [0, 0]), temp = 0.05 * (1 - t / iters) + 0.005
    for (let i = 0; i < g.n; i++) for (let j = i + 1; j < g.n; j++) { const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1], d2 = dx * dx + dy * dy + 1e-3, f = 0.01 / d2; F[i][0] += f * dx; F[i][1] += f * dy; F[j][0] -= f * dx; F[j][1] -= f * dy }
    g.edges.forEach(([a, b]) => { const dx = P[a][0] - P[b][0], dy = P[a][1] - P[b][1]; F[a][0] -= 0.1 * dx; F[a][1] -= 0.1 * dy; F[b][0] += 0.1 * dx; F[b][1] += 0.1 * dy })
    P.forEach((p, i) => { const f = F[i], m = Math.hypot(...f) || 1, s = Math.min(m, temp) / m; p[0] += f[0] * s; p[1] += f[1] * s })
  }
  return P
}
export function hops(g, src, maxHops = 3) {
  const nb = range(g.n).map(() => []); g.edges.forEach(([a, b]) => { nb[a].push(b); nb[b].push(a) })
  const dist = Array(g.n).fill(Infinity); dist[src] = 0
  let frontier = [src]
  for (let h = 1; h <= maxHops; h++) { const next = []; frontier.forEach(u => nb[u].forEach(v => { if (dist[v] === Infinity) { dist[v] = h; next.push(v) } })); frontier = next }
  return dist
}
