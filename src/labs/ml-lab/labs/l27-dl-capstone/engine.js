// Deep-learning investigation: compare pipelines on shifted digit images over
// several seeds, ablate components, count compute, and inspect errors.
import { random, mean, std, range } from '../../kit/math.js'
import { init, trainSteps, forward, countParams } from '../l21-mlp/engine.js'
import { digitImage, conv2d, maxPool, KERNELS } from '../l24-convolution/engine.js'

export function dataset(n, seed, shifts = [0, 1, 2, 3, 4, 5]) {
  const rng = random(seed)
  return range(n).map(i => { const d = i % 10; return { d, img: digitImage(d, shifts[Math.floor(rng() * shifts.length)], Math.floor(rng() * 3), rng, 0.15) } })
}
const BANK = ['vertical', 'horizontal', 'diagonal', 'sharpen'].map(k => KERNELS[k].k)
const convFeatures = img => BANK.flatMap(k => maxPool(conv2d(img, k, 1, 1).map(r => r.map(v => Math.max(0, v))), 2).map(row => Math.max(...row)))
const shift = (img, dx) => img.map(row => row.map((_, j) => row[j - dx] ?? 0))

export const COMPONENTS = { conv: 'convolutional features', hidden: 'hidden layer (16 ReLU units)', augment: 'shift augmentation' }
export const CONFIGS = {
  linear: { label: 'Linear on pixels (baseline)', conv: false, hidden: false, augment: false },
  augment: { label: 'Linear on pixels + augmentation', conv: false, hidden: false, augment: true },
  mlp: { label: 'MLP on pixels', conv: false, hidden: true, augment: false },
  conv: { label: 'Linear on conv features', conv: true, hidden: false, augment: false },
  full: { label: 'MLP on conv features + augmentation', conv: true, hidden: true, augment: true },
}
export function runConfig(cfg, seed, { steps = 250 } = {}) {
  const t0 = performance.now(), train = dataset(200, seed * 11 + 1, [0, 1, 2, 3]), test = dataset(300, 999, [0, 1, 2, 3, 4, 5])
  const rng = random(seed + 5)
  const trainImgs = cfg.augment ? train.flatMap(t => [t, { d: t.d, img: shift(t.img, Math.floor(rng() * 3)) }]) : train
  const feat = img => (cfg.conv ? convFeatures(img) : img.flat())
  const raw = trainImgs.map(t => feat(t.img)), y = trainImgs.map(t => t.d)
  // Standardize every feature with training statistics only (Lab 02).
  const mu = raw[0].map((_, j) => mean(raw.map(r => r[j]))), sd = raw[0].map((_, j) => std(raw.map(r => r[j])) || 1)
  const norm = r => r.map((v, j) => (v - mu[j]) / sd[j]), X = raw.map(norm)
  const sizes = cfg.hidden ? [X[0].length, 16, 10] : [X[0].length, 10]
  const layers = trainSteps(init(sizes, 'he', seed), X, y, { act: 'relu', rate: 0.2, steps })
  const P = forward(layers, test.map(t => norm(feat(t.img))), 'relu').at(-1).a, pred = P.map(p => p.indexOf(Math.max(...p)))
  const macsPerExample = (cfg.conv ? BANK.length * 100 * 9 : 0) + sizes.slice(1).reduce((t, s, i) => t + s * sizes[i], 0)
  return { acc: mean(pred.map((p, i) => (p === test[i].d ? 1 : 0))), pred, test, params: countParams(layers), macs: macsPerExample, ms: performance.now() - t0 }
}
export function summarize(runs) { const a = runs.map(r => r.acc); return { mean: mean(a), sd: runs.length > 1 ? std(a, 1) : 0, params: runs[0].params, macs: runs[0].macs, ms: mean(runs.map(r => r.ms)) } }
export function confusion(pred, test) { const m = range(10).map(() => Array(10).fill(0)); pred.forEach((p, i) => { m[test[i].d][p]++ }); return m }
