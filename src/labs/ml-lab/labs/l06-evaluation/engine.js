// Leaky versus honest evaluation, run for real on synthetic data where the
// correct answer is known in advance.
import { random, normal, shuffle, mean, std, range } from '../../kit/math.js'

export function kfold(n, k, seed = 1) {
  const order = shuffle(range(n), random(seed))
  return range(k).map(f => {
    const val = order.filter((_, i) => i % k === f), inVal = new Set(val)
    return { train: order.filter(i => !inVal.has(i)), val }
  })
}
export function groupKfold(groups, k) {
  const unique = [...new Set(groups)]
  return range(k).map(f => {
    const held = new Set(unique.filter((_, i) => i % k === f))
    return { train: groups.map((g, i) => held.has(g) ? -1 : i).filter(i => i >= 0), val: groups.map((g, i) => held.has(g) ? i : -1).filter(i => i >= 0) }
  })
}
// Expanding window: train on everything before each validation block.
export function forwardChain(n, folds, minTrain) {
  const block = Math.floor((n - minTrain) / folds)
  return range(folds).map(f => ({ train: range(minTrain + f * block), val: range(block).map(i => minTrain + f * block + i) }))
}

// ---- Scenario 1: selecting features using all the data (labels are noise) ----
export function noiseData({ n = 60, p = 500, seed = 1 }) {
  const rng = random(seed)
  const X = range(n).map(() => range(p).map(() => normal(rng)))
  const y = shuffle(range(n).map(i => i % 2), random(seed + 99)) // balanced, unrelated to X
  return { X, y }
}
function correlationRank(X, y, rows) {
  const ys = rows.map(i => y[i]), my = mean(ys), p = X[0].length
  return range(p).map(j => {
    const xs = rows.map(i => X[i][j]), mx = mean(xs)
    let sxy = 0, sxx = 0, syy = 0
    xs.forEach((x, t) => { sxy += (x - mx) * (ys[t] - my); sxx += (x - mx) ** 2; syy += (ys[t] - my) ** 2 })
    return { j, r: Math.abs(sxy / Math.sqrt(sxx * syy || 1)) }
  }).sort((a, b) => b.r - a.r)
}
function centroidAccuracy(X, y, features, train, val) {
  const cent = [0, 1].map(c => features.map(j => mean(train.filter(i => y[i] === c).map(i => X[i][j]))))
  const hits = val.filter(i => {
    const d = cent.map(m => features.reduce((t, j, q) => t + (X[i][j] - m[q]) ** 2, 0))
    return (d[1] < d[0] ? 1 : 0) === y[i]
  }).length
  return hits / val.length
}
export function selectionExperiment({ n = 60, p = 500, k = 10, folds = 5, seed = 1 } = {}) {
  const { X, y } = noiseData({ n, p, seed }), splits = kfold(n, folds, seed + 7)
  const all = range(n), leakyFeatures = correlationRank(X, y, all).slice(0, k).map(f => f.j)
  const leaky = splits.map(s => centroidAccuracy(X, y, leakyFeatures, s.train, s.val))
  const honest = splits.map(s => centroidAccuracy(X, y, correlationRank(X, y, s.train).slice(0, k).map(f => f.j), s.train, s.val))
  return { leaky, honest }
}

// ---- Scenario 2: repeated measurements of the same machines ----
export function machineData({ machines = 12, perMachine = 10, seed = 2 }) {
  const rng = random(seed), rows = []
  for (let m = 0; m < machines; m++) {
    const offset = 8 * normal(rng), load0 = 20 + 60 * rng() // each machine runs in its own typical load range
    for (let r = 0; r < perMachine; r++) {
      const load = load0 + 2.5 * normal(rng)
      rows.push({ group: m, x: load, y: 50 + 0.5 * load + offset + 1.5 * normal(rng) })
    }
  }
  return rows
}
// 1-nearest-neighbour regression: memorizes whatever it has seen.
function nnMSE(rows, train, val) {
  return mean(val.map(i => { let best = train[0]; for (const t of train) if (Math.abs(rows[t].x - rows[i].x) < Math.abs(rows[best].x - rows[i].x)) best = t; return (rows[best].y - rows[i].y) ** 2 }))
}
function lineMSE(rows, train, val) {
  const xs = train.map(i => rows[i].x), ys = train.map(i => rows[i].y), mx = mean(xs), my = mean(ys)
  const w = xs.reduce((t, x, q) => t + (x - mx) * (ys[q] - my), 0) / xs.reduce((t, x) => t + (x - mx) ** 2, 0)
  return mean(val.map(i => (w * rows[i].x + my - w * mx - rows[i].y) ** 2))
}
export function groupExperiment({ seed = 2, folds = 4 } = {}) {
  const rows = machineData({ seed }), groups = rows.map(r => r.group)
  const rowFolds = kfold(rows.length, folds, seed), grpFolds = groupKfold(groups, folds)
  return {
    rows,
    rowSplit: { nn: mean(rowFolds.map(s => nnMSE(rows, s.train, s.val))), line: mean(rowFolds.map(s => lineMSE(rows, s.train, s.val))) },
    groupSplit: { nn: mean(grpFolds.map(s => nnMSE(rows, s.train, s.val))), line: mean(grpFolds.map(s => lineMSE(rows, s.train, s.val))) },
  }
}

// ---- Scenario 3: time-ordered data with drift ----
export function seriesData({ n = 120, seed = 3 }) {
  const rng = random(seed)
  return range(n).map(t => ({ t, y: 20 + 0.25 * t + 6 * Math.sin(t / 6) + 2 * normal(rng) }))
}
export function timeExperiment({ seed = 3 } = {}) {
  const s = seriesData({ seed }), rows = s.map(r => ({ x: r.t, y: r.y }))
  const random5 = kfold(s.length, 5, seed), forward = forwardChain(s.length, 5, 60)
  return { series: s, forward, random: mean(random5.map(f => nnMSE(rows, f.train, f.val))), forwardMSE: mean(forward.map(f => nnMSE(rows, f.train, f.val))) }
}

// ---- Scenario 4: pick the best of M equally useless models on one test set ----
export function winnersCurse({ models = 20, testSize = 100, trueAccuracy = 0.7, seed = 4 } = {}) {
  const rng = random(seed), score = () => range(testSize).filter(() => rng() < trueAccuracy).length / testSize
  const test = range(models).map(score), best = test.indexOf(Math.max(...test))
  return { test, best, fresh: score(), trueAccuracy }
}
export { mean, std }
