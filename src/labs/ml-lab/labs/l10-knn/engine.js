// k-nearest neighbours: no training step, all work at prediction time.
import { random, mean, std, range } from '../../kit/math.js'

export const distance = (a, b, metric = 'euclidean') => metric === 'manhattan' ? Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) : Math.hypot(a[0] - b[0], a[1] - b[1])

// Returns the k nearest training rows (with distances) and the class-1 vote share.
export function neighbours(train, q, k, metric = 'euclidean', scale = [1, 1]) {
  const d = train.map((p, i) => ({ i, d: distance([p.x1 / scale[0], p.x2 / scale[1]], [q[0] / scale[0], q[1] / scale[1]], metric), label: p.label }))
  d.sort((a, b) => a.d - b.d || a.i - b.i)
  const near = d.slice(0, k)
  return { near, vote: mean(near.map(n => n.label)) }
}
export const knnProb = (train, k, metric, scale) => (a, b) => neighbours(train, [a, b], k, metric, scale).vote
export const accuracy = (train, test, k, metric, scale) => mean(test.map(p => ((neighbours(train, [p.x1, p.x2], k, metric, scale).vote > 0.5 ? 1 : 0) === p.label ? 1 : 0)))

// Rescale x2 to simulate recording a feature in much larger units.
export const inUnits = (points, factor) => points.map(p => ({ ...p, x2: p.x2 * factor }))
export function standardizer(train) {
  const s = [std(train.map(p => p.x1)) || 1, std(train.map(p => p.x2)) || 1]
  return s
}

// Curse of dimensionality: with d uniform features, how different are the
// nearest and farthest neighbours of a random query?
export function distanceContrast(d, n = 400, seed = 1) {
  const rng = random(seed), pts = range(n).map(() => range(d).map(() => rng())), q = range(d).map(() => rng())
  const ds = pts.map(p => Math.sqrt(p.reduce((t, v, j) => t + (v - q[j]) ** 2, 0)))
  const lo = Math.min(...ds), hi = Math.max(...ds)
  return { min: lo, max: hi, ratio: hi / lo, relative: (hi - lo) / lo }
}
