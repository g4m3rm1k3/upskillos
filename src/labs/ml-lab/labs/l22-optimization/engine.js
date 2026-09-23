// Optimizers as small state machines, run on 2D loss surfaces where every
// step can be drawn, plus mini-batch regression and a gallery of failures.
import { random, normal, mean, range } from '../../kit/math.js'

export const SURFACES = {
  valley: { label: 'Elongated valley (ill-conditioned)', start: [-4.5, 2], f: ([x, y], k = 25) => 0.5 * (x * x + k * y * y), g: ([x, y], k = 25) => [x, k * y], range: [[-5, 5], [-3, 3]] },
  rosenbrock: { label: 'Curved banana (Rosenbrock)', start: [-1.5, 2.2], f: ([x, y]) => (1 - x) ** 2 + 10 * (y - x * x) ** 2, g: ([x, y]) => [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)], range: [[-2, 2], [-1, 3]] },
  plateau: { label: 'Flat plateau then steep bowl', start: [-4, 3.5], f: ([x, y]) => Math.log(1 + 0.05 * (x * x + y * y)) + 0.5 * ((x - 2) ** 2 + (y - 1) ** 2) * 0.02, g: ([x, y]) => { const s = 1 + 0.05 * (x * x + y * y); return [0.1 * x / s + 0.02 * (x - 2), 0.1 * y / s + 0.02 * (y - 1)] }, range: [[-5, 5], [-4, 4]] },
}

export const OPTIMIZERS = {
  sgd: { label: 'Gradient descent', color: 'var(--muted)' },
  momentum: { label: 'Momentum (β = 0.9)', color: 'var(--chart-train)' },
  rmsprop: { label: 'RMSProp', color: '#10b981' },
  adam: { label: 'Adam', color: 'var(--chart-val)' },
}

// One update. `s` carries the optimizer's state between steps.
export function update(name, p, g, s, lr, t) {
  if (name === 'sgd') return [p.map((v, i) => v - lr * g[i]), s]
  if (name === 'momentum') { const v = p.map((_, i) => 0.9 * (s.v?.[i] ?? 0) + g[i]); return [p.map((x, i) => x - lr * v[i]), { v }] }
  if (name === 'rmsprop') { const r = p.map((_, i) => 0.9 * (s.r?.[i] ?? 0) + 0.1 * g[i] * g[i]); return [p.map((x, i) => x - lr * g[i] / (Math.sqrt(r[i]) + 1e-8)), { r }] }
  const b1 = 0.9, b2 = 0.999
  const m = p.map((_, i) => b1 * (s.m?.[i] ?? 0) + (1 - b1) * g[i]), v = p.map((_, i) => b2 * (s.v?.[i] ?? 0) + (1 - b2) * g[i] * g[i])
  const mh = m.map(x => x / (1 - b1 ** t)), vh = v.map(x => x / (1 - b2 ** t))
  return [p.map((x, i) => x - lr * mh[i] / (Math.sqrt(vh[i]) + 1e-8)), { m, v }]
}

export function run(surfaceKey, name, { lr, steps = 150, noise = 0, seed = 1, kappa = 25 }) {
  const S = SURFACES[surfaceKey], rng = random(seed)
  let p = [...S.start], s = {}
  const path = [p]
  for (let t = 1; t <= steps; t++) {
    const g = S.g(p, kappa).map(v => v + noise * normal(rng))
    ;[p, s] = update(name, p, g, s, lr, t)
    if (!p.every(Number.isFinite) || Math.abs(p[0]) > 1e6 || Math.abs(p[1]) > 1e6) { path.push(p.map(v => Math.sign(v) * 1e6)); return { path, diverged: true } }
    path.push(p)
  }
  return { path, diverged: false }
}
export const loss = (surfaceKey, p, kappa) => SURFACES[surfaceKey].f(p, kappa)

// Mini-batch SGD on one-feature linear regression, with a learning-rate schedule.
export function minibatch({ batch = 8, lr = 0.05, epochs = 20, schedule = 'constant', seed = 3 }) {
  const rng = random(seed), n = 256, X = range(n).map(() => -2 + 4 * rng()), Y = X.map(x => 3 * x - 1 + 0.6 * normal(rng))
  let w = 0, b = 0, updates = 0
  const curve = [], total = epochs * Math.ceil(n / batch)
  const full = () => mean(X.map((x, i) => (w * x + b - Y[i]) ** 2))
  curve.push([0, full()])
  for (let e = 0; e < epochs; e++) {
    const order = range(n).sort(() => rng() - 0.5)
    for (let s = 0; s < n; s += batch) {
      const idx = order.slice(s, s + batch), err = idx.map(i => w * X[i] + b - Y[i])
      const rate = schedule === 'constant' ? lr : schedule === 'step' ? lr * (updates < total / 2 ? 1 : 0.1) : lr * 0.5 * (1 + Math.cos(Math.PI * updates / total))
      w -= rate * 2 * mean(err.map((v, q) => v * X[idx[q]])); b -= rate * 2 * mean(err); updates++
      curve.push([updates * batch / n, full()])
    }
  }
  return { curve, w, b, updates, final: full() }
}

// Training-failure gallery: the Lab 21 network on noisy two-moons data,
// run under settings that each produce a recognizable loss-curve signature.
import { init, forward, backward, step, loss as ce } from '../l21-mlp/engine.js'
import { classification, split } from '../../kit/datasets.js'

export const SCENARIOS = {
  healthy: { label: 'A', truth: 'Healthy training', cause: 'Reasonable learning rate, He initialization, enough data: both losses fall and level off together.', opts: { rate: 0.5, steps: 400 } },
  high: { label: 'B', truth: 'Learning rate far too high', cause: 'Updates overshoot: the loss jumps around or explodes to NaN. Lower the rate (by 10×) or use gradient clipping.', opts: { rate: 40, steps: 400 } },
  low: { label: 'C', truth: 'Learning rate far too low', cause: 'The loss creeps down so slowly that it looks flat. Nothing is broken; the steps are just tiny — raise the rate.', opts: { rate: 0.002, steps: 800 } },
  sign: { label: 'D', truth: 'Bug: gradient sign flipped (ascent)', cause: 'The loss rises steadily from the first step. Rising training loss is a code bug until proven otherwise — gradient-check it.', opts: { rate: 0.5, steps: 300, sign: -1 } },
  overfit: { label: 'E', truth: 'Overfitting (tiny training set, big network)', cause: 'Training loss goes to ~0 while validation loss turns upward. More data, regularization or early stopping — not optimizer changes.', opts: { rate: 0.5, steps: 1500, tiny: true, width: 48, depth: 2 } },
  saturated: { label: 'F', truth: 'Vanishing gradients in a deep sigmoid network', cause: 'Six sigmoid layers multiply derivatives of at most 0.25: almost no gradient reaches the early layers, so the loss sits on a long plateau near log 2 before (maybe) moving. Use ReLU, good initialization, normalization or residual connections.', opts: { rate: 0.5, steps: 400, act: 'sigmoid', scheme: 'xavier', depth: 6, width: 10 } },
}
export function runScenario(key, seed = 1) {
  const o = { width: 16, depth: 1, act: 'relu', scheme: 'he', sign: 1, ...SCENARIOS[key].opts }
  const pts = classification('moons', { seed, n: o.tiny ? 60 : 300, noise: 0.25 }), { train, validation } = split(pts, o.tiny ? 0.34 : 0.7, seed)
  const X = train.map(p => [p.x1, p.x2]), y = train.map(p => p.label), Xv = validation.map(p => [p.x1, p.x2]), yv = validation.map(p => p.label)
  let layers = init([2, ...Array(o.depth).fill(o.width), 2], o.scheme, seed)
  const curve = []
  for (let s = 0; s <= o.steps; s++) {
    const c = forward(layers, X, o.act)
    if (s % Math.max(1, Math.round(o.steps / 80)) === 0) { const tr = ce(c.at(-1).a, y), va = ce(forward(layers, Xv, o.act).at(-1).a, yv); curve.push([s, Number.isFinite(tr) ? tr : NaN, Number.isFinite(va) ? va : NaN]) }
    layers = step(layers, backward(layers, c, y, o.act), o.sign * o.rate)
  }
  return curve
}
