// k-means (with the full assign/update history), k-means++, DBSCAN,
// silhouette, stability across seeds, and distance-based anomaly scores.
import { random, mean, range } from '../../kit/math.js'

const d2 = (p, c) => (p.x1 - c[0]) ** 2 + (p.x2 - c[1]) ** 2

export function initCentroids(points, k, method, rng) {
  if (method === 'random') return range(k).map(() => { const p = points[Math.floor(rng() * points.length)]; return [p.x1, p.x2] })
  // k-means++: each new centre is drawn with probability proportional to squared distance.
  const first = points[Math.floor(rng() * points.length)], cs = [[first.x1, first.x2]]
  while (cs.length < k) {
    const w = points.map(p => Math.min(...cs.map(c => d2(p, c)))), total = w.reduce((a, b) => a + b, 0)
    let u = rng() * total, i = 0
    while (i < points.length - 1 && u > w[i]) { u -= w[i]; i++ }
    cs.push([points[i].x1, points[i].x2])
  }
  return cs
}
export const assign = (points, cs) => points.map(p => { let best = 0; cs.forEach((c, j) => { if (d2(p, c) < d2(p, cs[best])) best = j }); return best })
export function update(points, labels, cs) {
  return cs.map((c, j) => { const mine = points.filter((_, i) => labels[i] === j); return mine.length ? [mean(mine.map(p => p.x1)), mean(mine.map(p => p.x2))] : c })
}
export const inertia = (points, labels, cs) => points.reduce((t, p, i) => t + d2(p, cs[labels[i]]), 0)

// Every half-step recorded so the UI can replay assign → update → assign …
export function kmeans(points, k, { init = 'plusplus', seed = 1, maxIter = 50 } = {}) {
  const rng = random(seed)
  let cs = initCentroids(points, k, init, rng), labels = assign(points, cs)
  const history = [{ phase: 'init', cs, labels, inertia: inertia(points, labels, cs) }]
  for (let it = 0; it < maxIter; it++) {
    const next = update(points, labels, cs)
    history.push({ phase: 'update', cs: next, labels, inertia: inertia(points, labels, next) })
    const nl = assign(points, next)
    history.push({ phase: 'assign', cs: next, labels: nl, inertia: inertia(points, nl, next) })
    const done = nl.every((l, i) => l === labels[i])
    cs = next; labels = nl
    if (done) break
  }
  return { cs, labels, inertia: inertia(points, labels, cs), history }
}
export function bestOf(points, k, restarts, init, seed) {
  let best = null
  for (let r = 0; r < restarts; r++) { const m = kmeans(points, k, { init, seed: seed * 101 + r }); if (!best || m.inertia < best.inertia) best = m }
  return best
}

export function silhouette(points, labels) {
  const k = Math.max(...labels) + 1
  if (k < 2) return NaN
  const s = points.map((p, i) => {
    const byCluster = range(k).map(c => { const ds = points.filter((_, j) => j !== i && labels[j] === c).map(q => Math.sqrt(d2(p, [q.x1, q.x2]))); return ds.length ? mean(ds) : NaN })
    const a = byCluster[labels[i]], b = Math.min(...byCluster.filter((v, c) => c !== labels[i] && Number.isFinite(v)))
    return Number.isFinite(a) && Number.isFinite(b) ? (b - a) / Math.max(a, b) : 0
  })
  return mean(s)
}
// Rand index: fraction of point pairs on which two clusterings agree (same/different).
export function randIndex(a, b) {
  let agree = 0, total = 0
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { agree += ((a[i] === a[j]) === (b[i] === b[j])) ? 1 : 0; total++ }
  return agree / total
}
export function stability(points, k, init, seeds = 8) {
  const runs = range(seeds).map(s => kmeans(points, k, { init, seed: 1000 + s }).labels)
  const vals = []
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) vals.push(randIndex(runs[i], runs[j]))
  return mean(vals)
}

// DBSCAN: core points have ≥ minPts neighbours within eps; clusters grow through cores.
export function dbscan(points, eps, minPts) {
  const n = points.length, labels = Array(n).fill(-2), e2 = eps * eps
  const nb = i => range(n).filter(j => d2(points[i], [points[j].x1, points[j].x2]) <= e2)
  let c = 0
  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2) continue
    const seedSet = nb(i)
    if (seedSet.length < minPts) { labels[i] = -1; continue }
    labels[i] = c
    const queue = seedSet.filter(j => j !== i)
    while (queue.length) {
      const j = queue.shift()
      if (labels[j] === -1) labels[j] = c
      if (labels[j] !== -2) continue
      labels[j] = c
      const more = nb(j)
      if (more.length >= minPts) queue.push(...more)
    }
    c++
  }
  return { labels, clusters: c, noise: labels.filter(l => l === -1).length }
}

export const anomalyScores = (points, labels, cs) => points.map((p, i) => Math.sqrt(d2(p, cs[labels[i]])))
