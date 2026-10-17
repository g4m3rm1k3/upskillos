// Part 8's engine: python/models.py in JavaScript, every loop in the same order so the floats agree
// (parity.test.js holds it to the Python; agree.test.js holds LINEST, MMULT and MINVERSE to it).
import { Rng } from './data.js'
import { dayOfYear } from './samples.js'
import { mean, std, total } from './summary.js'

export function leastSquares(xs, ys) {
  const mx = mean(xs), my = mean(ys)
  const sxy = total(xs.map((x, k) => (x - mx) * (ys[k] - my)))
  const sxx = total(xs.map(x => (x - mx) ** 2))
  const slope = sxy / sxx
  return [slope, my - slope * mx]
}
export const weekday = date => (dayOfYear(date) + 2) % 7
export const designMatrix = (rows, columns) => rows.map(row => [1, ...columns.map(c => Number(row[c]))])
export const transpose = m => m[0].map((_, j) => m.map(row => row[j]))
export function matMul(a, b) {
  return a.map(rowA => b[0].map((_, j) => { let s = 0; for (let k = 0; k < b.length; k++) s += rowA[k] * b[k][j]; return s }))
}
export function normalEquations(X, y) {
  const Xt = transpose(X)
  return [matMul(Xt, X), matMul(Xt, y.map(v => [v])).map(row => row[0])]
}

// steps (optional): a list that receives each elimination step, for the figure (8.3).
export function solve(A, b, steps = null) {
  const n = A.length, M = A.map((row, i) => [...row, b[i]])
  const scale = Math.max(...A.flat().map(Math.abs))
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    if (Math.abs(M[p][c]) <= 1e-12 * scale) return null
    ;[M[c], M[p]] = [M[p], M[c]]
    steps?.push({ kind: 'swap', column: c, row: p, matrix: M.map(r => [...r]) })
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
      steps?.push({ kind: 'eliminate', column: c, row: r, factor: f, matrix: M.map(x => [...x]) })
    }
  }
  const w = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n]
    for (let k = i + 1; k < n; k++) s -= M[i][k] * w[k]
    w[i] = s / M[i][i]
  }
  return w
}
export function fit(X, y) { const [A, b] = normalEquations(X, y); return solve(A, b) }
export const predict = (X, w) => X.map(row => total(row.map((x, k) => x * w[k])))
export function rSquared(ys, predictions) {
  const m = mean(ys)
  return 1 - total(ys.map((y, k) => (y - predictions[k]) ** 2)) / total(ys.map(y => (y - m) ** 2))
}
export const oneHot = (values, categories) => values.map(v => categories.map(c => (v === c ? 1 : 0)))
export function standardise(column) { const m = mean(column), s = std(column); return [column.map(x => (x - m) / s), m, s] }

export function gradientDescent(X, y, rate, steps, path = null) {
  const n = X.length, k = X[0].length
  let w = Array(k).fill(0)
  for (let s = 0; s < steps; s++) {
    const errors = X.map((row, i) => total(row.map((x, j) => x * w[j])) - y[i])
    const grad = Array.from({ length: k }, (_, j) => (2 / n) * total(errors.map((e, i) => e * X[i][j])))
    w = w.map((v, j) => v - rate * grad[j])
    path?.push(w)
  }
  return w
}
export const polynomial = (xs, degree) => xs.map(x => Array.from({ length: degree + 1 }, (_, k) => x ** k))
export const rmse = (ys, predictions) => Math.sqrt(mean(ys.map((y, k) => (y - predictions[k]) ** 2)))
export function ridge(X, y, lam) {
  const [A, b] = normalEquations(X, y)
  for (let j = 1; j < A.length; j++) A[j][j] += lam
  return solve(A, b)
}

export function kFolds(n, k, seed) {
  const rng = new Rng(seed), order = Array.from({ length: n }, (_, i) => i)
  for (let i = 0; i < n - 1; i++) { const j = i + rng.below(n - i);[order[i], order[j]] = [order[j], order[i]] }
  return Array.from({ length: k }, (_, f) => order.filter((_, i) => i % k === f))
}
export function groupFolds(groups) {
  const folds = new Map()
  groups.forEach((g, i) => { if (!folds.has(g)) folds.set(g, []); folds.get(g).push(i) })
  return [...folds.values()]
}
export function crossValidate(X, y, folds, lam = 0) {
  let squares = 0, count = 0
  for (const fold of folds) {
    const held = new Set(fold), train = X.map((_, i) => i).filter(i => !held.has(i))
    const w = ridge(train.map(i => X[i]), train.map(i => y[i]), lam)
    for (const i of fold) { squares += (total(X[i].map((x, j) => x * w[j])) - y[i]) ** 2; count++ }
  }
  return Math.sqrt(squares / count)
}

export const sigmoid = z => 1 / (1 + Math.exp(-z))
export const logLoss = (ys, ps) => mean(ys.map((y, k) => (y === 1 ? -Math.log(ps[k]) : -Math.log(1 - ps[k]))))
export function logisticFit(X, y, rate, steps) {
  const n = X.length, k = X[0].length
  let w = Array(k).fill(0)
  for (let s = 0; s < steps; s++) {
    const gaps = X.map((row, i) => sigmoid(total(row.map((x, j) => x * w[j]))) - y[i])
    w = w.map((v, j) => v - (rate * total(gaps.map((g, i) => g * X[i][j]))) / n)
  }
  return w
}
export function thresholdAccuracy(xs, ys) {
  const pairs = xs.map((x, k) => [x, ys[k]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), n = pairs.length
  const ones = total(pairs.map(p => p[1]))
  let best = Math.max(ones, n - ones) / n, below = 0
  for (let k = 0; k < n - 1; k++) {
    below += pairs[k][1]
    if (pairs[k][0] === pairs[k + 1][0]) continue
    const left = k + 1, right = n - k - 1
    best = Math.max(best, (left - below + (ones - below)) / n, (below + (right - ones + below)) / n)
  }
  return best
}

// ── For the lessons and figures (not in the Python) ─────────────────
// Powers of x up to degree, each power column put in standard units with the training rows' mean and sd,
// so that the normal equations of a degree-9 curve can still be solved (8.7 to 8.9).
export function scaledPowers(xs, degree, train) {
  const P = polynomial(xs, degree)
  const stats = Array.from({ length: degree }, (_, j) => { const col = train.map(i => P[i][j + 1]); return [mean(col), std(col)] })
  return P.map(row => [1, ...stats.map(([m, s], j) => (row[j + 1] - m) / s)])
}
// How many steps gradient descent takes until every weight is within tol (relative) of the exact answer (8.6).
export function stepsToConverge(X, y, rate, cap = 100000, tol = 1e-6) {
  const target = fit(X, y), n = X.length, k = X[0].length, big = Math.max(1, ...target.map(Math.abs))
  let w = Array(k).fill(0)
  for (let s = 1; s <= cap; s++) {
    const errors = X.map((row, i) => total(row.map((x, j) => x * w[j])) - y[i])
    w = w.map((v, j) => v - rate * (2 / n) * total(errors.map((e, i) => e * X[i][j])))
    if (w.every((v, j) => Math.abs(v - target[j]) < tol * big)) return s
    if (!w.every(Number.isFinite)) return null
  }
  return null
}
