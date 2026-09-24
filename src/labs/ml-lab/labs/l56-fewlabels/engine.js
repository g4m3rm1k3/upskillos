// Learning from few labels: label propagation and self-training (semi-
// supervised), uncertainty sampling (active learning), and contrastive
// self-supervised pretraining evaluated with a linear probe.
import { random, normal, range, mean } from '../../kit/math.js'
import { Dense, ReLU, Sequential, softmaxCE, Adam } from '../../kit/nn.js'
import { digit, D as PIX } from '../l53-vae/engine.js'

// ---------- Two moons with a handful of labels ----------
export function moons(n = 400, seed = 56, noise = 0.12) {
  const rng = random(seed)
  return range(n).map(i => { const c = i % 2, t = Math.PI * rng(); return { x: c ? [1 - Math.cos(t) + noise * normal(rng), 0.5 - Math.sin(t) + noise * normal(rng)] : [Math.cos(t) + noise * normal(rng), Math.sin(t) + noise * normal(rng)], y: c } })
}
export const POOL = moons(400, 56), TESTSET = moons(600, 57)
export function pickLabels(k, seed) { const rng = random(seed), idx = [[], []]; range(POOL.length).sort(() => rng() - 0.5).forEach(i => { if (idx[POOL[i].y].length < k / 2) idx[POOL[i].y].push(i) }); return [...idx[0], ...idx[1]] }

// Random Fourier features + logistic regression: a smooth probabilistic classifier.
function rff(seed, m = 60, gamma = 2) { const rng = random(seed), W = range(m).map(() => [Math.sqrt(2 * gamma) * normal(rng), Math.sqrt(2 * gamma) * normal(rng)]), b = range(m).map(() => 2 * Math.PI * rng()); return x => W.map((w, j) => Math.sqrt(2 / m) * Math.cos(w[0] * x[0] + w[1] * x[1] + b[j])) }
const PHI = rff(5)
export function fitLogistic(points, labels, { l2 = 0.05, steps = 300, weights } = {}) {
  const F = points.map(PHI), m = F[0].length
  let w = Array(m + 1).fill(0)
  const n = points.length, wt = weights ?? points.map(() => 1), tot = wt.reduce((a, b) => a + b, 0)
  for (let s = 0; s < steps; s++) {
    const g = Array(m + 1).fill(0)
    F.forEach((f, i) => { const z = w[m] + f.reduce((t, v, j) => t + v * w[j], 0), e = (1 / (1 + Math.exp(-z)) - labels[i]) * wt[i] / tot; f.forEach((v, j) => { g[j] += e * v }); g[m] += e })
    w = w.map((v, j) => v - 2 * (g[j] + (j < m ? l2 * v / Math.max(n, 1) : 0)))
  }
  return x => 1 / (1 + Math.exp(-(w[m] + PHI(x).reduce((t, v, j) => t + v * w[j], 0))))
}
export const acc = (f, data) => mean(data.map(d => ((f(d.x) >= 0.5 ? 1 : 0) === d.y ? 1 : 0)))

// Label propagation (Zhou et al.): spread label scores over a k-nearest-neighbour graph.
export function labelPropagation(labeled, { k = 10, sigma = 0.3, alpha = 0.99, iters = 60 } = {}) {
  const n = POOL.length, X = POOL.map(p => p.x), W = range(n).map(() => new Map())
  X.forEach((a, i) => { X.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).filter(([, j]) => j !== i).sort((p, q) => p[0] - q[0]).slice(0, k).forEach(([d, j]) => { const w = Math.exp(-d * d / (2 * sigma * sigma)); W[i].set(j, w); W[j].set(i, w) }) })
  const deg = W.map(m => [...m.values()].reduce((a, b) => a + b, 0) || 1)
  const Y = X.map((_, i) => labeled.includes(i) ? (POOL[i].y ? [0, 1] : [1, 0]) : [0, 0])
  let F = Y.map(r => [...r])
  for (let t = 0; t < iters; t++) F = F.map((_, i) => { const s = [0, 0]; W[i].forEach((w, j) => { const c = w / Math.sqrt(deg[i] * deg[j]); s[0] += c * F[j][0]; s[1] += c * F[j][1] }); return [alpha * s[0] + (1 - alpha) * Y[i][0], alpha * s[1] + (1 - alpha) * Y[i][1]] })
  const scores = F.map(f => (f[0] + f[1] > 0 ? f[1] / (f[0] + f[1]) : 0.5))
  // Classify new points by their nearest pool point's score.
  const predict = x => { let best = 0, bd = Infinity; X.forEach((p, i) => { const d = (p[0] - x[0]) ** 2 + (p[1] - x[1]) ** 2; if (d < bd) { bd = d; best = i } }); return scores[best] }
  return { scores, predict }
}
// Self-training: fit on labels, pseudo-label confident pool points, refit; repeat.
export function selfTraining(labeled, { rounds = 5, threshold = 0.9 } = {}) {
  let idx = [...labeled], lab = labeled.map(i => POOL[i].y)
  const history = []
  for (let r = 0; r <= rounds; r++) {
    const f = fitLogistic(idx.map(i => POOL[i].x), lab)
    history.push({ round: r, f, n: idx.length, pseudoAcc: idx.length > labeled.length ? mean(idx.slice(labeled.length).map((i, k) => (lab[labeled.length + k] === POOL[i].y ? 1 : 0))) : 1 })
    if (r === rounds) break
    const add = range(POOL.length).filter(i => !idx.includes(i)).filter(i => { const p = f(POOL[i].x); return p > threshold || p < 1 - threshold })
    add.forEach(i => { idx.push(i); lab.push(f(POOL[i].x) >= 0.5 ? 1 : 0) })
  }
  return history
}

// ---------- Active learning ----------
export function activeLearning(strategy, { start = 4, budget = 30, seed = 1 } = {}) {
  const rng = random(seed), labeled = pickLabels(start, seed), curve = []
  for (let q = 0; q <= budget; q++) {
    const f = fitLogistic(labeled.map(i => POOL[i].x), labeled.map(i => POOL[i].y), { steps: 200 })
    curve.push({ labels: labeled.length, acc: acc(f, TESTSET) })
    if (q === budget) break
    const cand = range(POOL.length).filter(i => !labeled.includes(i))
    const pick = strategy === 'random' ? cand[Math.floor(rng() * cand.length)] : cand.reduce((b, i) => (Math.abs(f(POOL[i].x) - 0.5) < Math.abs(f(POOL[b].x) - 0.5) ? i : b), cand[0])
    labeled.push(pick)
  }
  return { curve, labeled }
}
export function activeCurves(runs = 6, budget = 30) {
  return Object.fromEntries(['random', 'uncertainty'].map(s => { const rs = range(runs).map(r => activeLearning(s, { seed: r + 1, budget })); return [s, rs[0].curve.map((c, k) => ({ labels: c.labels, acc: mean(rs.map(x => x.curve[k].acc)) }))] }))
}

// ---------- Contrastive pretraining on digits ----------
// Augmentation: shift the 5×7 glyph by one pixel and add ink noise.
function augment(x, rng) {
  const dx = Math.floor(rng() * 3) - 1, dy = Math.floor(rng() * 3) - 1, out = new Float64Array(PIX)
  for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) { const sr = r - dy, sc = c - dx; out[r * 5 + c] = sr >= 0 && sr < 7 && sc >= 0 && sc < 5 ? x[sr * 5 + sc] : 0 }
  return out.map(v => Math.min(1, Math.max(0, v + 0.15 * normal(rng))))
}
export function digitData(n, seed) { const rng = random(seed); return range(n).map(i => { const d = i % 10, base = digit(d, rng); return { d, x: augment(base, rng) } }) }
export const UNLABELED = digitData(500, 71), DTEST = digitData(300, 72)
// SimCLR-style InfoNCE: two augmented views per image; each view must pick out its partner.
export function trainContrastive({ epochs = 60, dim = 16, tau = 0.3, seed = 1, batch = 50 } = {}) {
  const rng = random(seed), enc = new Sequential([new Dense(PIX, 48, rng), ReLU(), new Dense(48, dim, rng)]), opt = new Adam(enc.params(), { lr: 5e-3 }), losses = []
  for (let e = 0; e < epochs; e++) {
    const order = range(UNLABELED.length).sort(() => rng() - 0.5)
    let tot = 0
    for (let b = 0; b + batch <= order.length; b += batch) {
      const imgs = order.slice(b, b + batch).map(i => UNLABELED[i].x), views = [...imgs.map(x => augment(x, rng)), ...imgs.map(x => augment(x, rng))], N = views.length
      enc.zeroGrad()
      const H = enc.forward(views), norms = H.map(h => Math.hypot(...h) || 1e-9), U = H.map((h, i) => h.map(v => v / norms[i]))
      const S = U.map(a => U.map(b2 => a.reduce((s, v, k) => s + v * b2[k], 0) / tau))
      const dS = range(N).map(() => new Float64Array(N)); let loss = 0
      for (let i = 0; i < N; i++) {
        const pos = (i + batch) % N, row = S[i].map((v, j) => (j === i ? -Infinity : v)), m = Math.max(...row), ex = row.map(v => Math.exp(v - m)), Z = ex.reduce((a, c) => a + c, 0)
        loss += (-(row[pos] - m) + Math.log(Z)) / N
        for (let j = 0; j < N; j++) if (j !== i) dS[i][j] += (ex[j] / Z - (j === pos ? 1 : 0)) / N
      }
      const dU = U.map((_, i) => { const g = new Float64Array(dim); for (let j = 0; j < N; j++) { const c = (dS[i][j] + dS[j][i]) / tau; if (c) for (let k = 0; k < dim; k++) g[k] += c * U[j][k] } return g })
      const dH = dU.map((g, i) => { const dot = g.reduce((s, v, k) => s + v * U[i][k], 0); return g.map((v, k) => (v - U[i][k] * dot) / norms[i]) })
      enc.backward(dH); opt.step(); tot += loss
    }
    losses.push(tot / Math.floor(order.length / batch))
  }
  return { enc, losses, embed: x => { const h = enc.forward([x])[0], n = Math.hypot(...h) || 1; return Array.from(h, v => v / n) } }
}
// Linear probe: softmax regression on features from `feat`, trained on `perClass` labels per digit.
export function linearProbe(feat, perClass, seed = 3) {
  const rng = random(seed), pool = digitData(200, 80 + seed), lab = range(10).flatMap(d => pool.filter(p => p.d === d).slice(0, perClass))
  const X = lab.map(p => feat(p.x)), dim = X[0].length, net = new Sequential([new Dense(dim, 10, rng, { init: 'xavier' })]), opt = new Adam(net.params(), { lr: 0.05, weightDecay: 0.01 })
  for (let s = 0; s < 300; s++) { net.zeroGrad(); const r = softmaxCE(net.forward(X), lab.map(p => p.d)); net.backward(r.grad); opt.step() }
  return mean(DTEST.map(t => { const z = net.forward([feat(t.x)])[0]; return z.indexOf(Math.max(...z)) === t.d ? 1 : 0 }))
}
