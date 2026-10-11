// Part 2's Python programs in JavaScript, operation for operation, with Python's random numbers:
// points2d.py, logistic.py, metrics.py, and tumours.py's data steps. parity.test.js checks them.
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import tumoursCsv from '../python/tumours.csv?raw'
import { shuffle } from './part1.js'

// points2d.py
export function makeBlobs(n = 40, seed = 0) {
  const rng = new PyRandom(seed), u = (a, b) => a + (b - a) * rng.random(), points = [], labels = []
  for (let i = 0; i < n; i++) {
    const label = i % 2, centre = label === 1 ? 1 : -1
    const x = centre + u(-1.8, 1.8), y = centre + u(-1.8, 1.8)
    points.push([x, y]); labels.push(label)
  }
  return [points, labels]
}
export function makeMoons(n = 100, seed = 0) {
  const rng = new PyRandom(seed), u = (a, b) => a + (b - a) * rng.random(), points = [], labels = []
  for (let i = 0; i < n; i++) {
    const label = i % 2, angle = u(0, Math.PI)
    const [x, y] = label === 0 ? [Math.cos(angle), Math.sin(angle)] : [1 - Math.cos(angle), 0.5 - Math.sin(angle)]
    const px = x + u(-0.15, 0.15), py = y + u(-0.15, 0.15)
    points.push([px, py]); labels.push(label)
  }
  return [points, labels]
}

// logistic.py
export const sigmoid = z => 1 / (1 + Math.exp(-z))
export const predictProb = (w, b, p) => sigmoid(w[0] * p[0] + w[1] * p[1] + b)
export const bce = (p, label) => label === 1 ? -Math.log(p) : -Math.log(1 - p)
export function* trainLogistic({ steps = 300, rate = 0.5, seed = 0, data } = {}) {
  const [points, labels] = data ?? makeBlobs(40, seed)
  const w = [0, 0], n = points.length, history = []
  let b = 0
  for (let s = 0; s < steps; s++) {
    const gw = [0, 0]
    let gb = 0, loss = 0
    points.forEach((pt, i) => {
      const p = predictProb(w, b, pt)
      loss += bce(p, labels[i]) / n
      gw[0] += (p - labels[i]) * pt[0] / n
      gw[1] += (p - labels[i]) * pt[1] / n
      gb += (p - labels[i]) / n
    })
    w[0] -= rate * gw[0]; w[1] -= rate * gw[1]; b -= rate * gb
    history.push(loss)
    yield { step: s, w: [...w], b, history, grad: [gw[0], gw[1], gb] }
  }
}
export function accuracy(w, b, points, labels) {
  let correct = 0
  points.forEach((p, i) => { if ((predictProb(w, b, p) >= 0.5 ? 1 : 0) === labels[i]) correct++ })
  return correct / points.length
}

// metrics.py
export function confusion(probs, labels, threshold = 0.5) {
  let tp = 0, fp = 0, tn = 0, fn = 0
  probs.forEach((p, i) => {
    const guess = p >= threshold ? 1 : 0, label = labels[i]
    if (guess === 1 && label === 1) tp++
    else if (guess === 1 && label === 0) fp++
    else if (guess === 0 && label === 0) tn++
    else fn++
  })
  return [tp, fp, tn, fn]
}
export function scores(tp, fp, tn, fn) {
  return [(tp + tn) / (tp + fp + tn + fn), tp + fp ? tp / (tp + fp) : 0, tp + fn ? tp / (tp + fn) : 0]
}

// tumours.py's data steps
const TUMOURS = (() => {
  const [head, ...lines] = tumoursCsv.replace(/\r\n/g, '\n').trim().split('\n')
  return { names: head.split(',').slice(1), rows: lines.map(l => l.split(',')) }
})()
export const TUMOUR_COLUMNS = TUMOURS.names
export function loadTumours(columns = null) {
  const names = columns ?? TUMOURS.names, idx = names.map(n => TUMOURS.names.indexOf(n) + 1)
  return [TUMOURS.rows.map(r => idx.map(i => Number(r[i]))), TUMOURS.rows.map(r => r[0] === 'M' ? 1 : 0), names]
}
export function splitTumours(rows, labels, testFraction = 0.2, seed = 0) {
  const order = shuffle(rows.map((_, i) => i), seed)
  const nTest = Math.trunc(order.length * testFraction), test = order.slice(0, nTest), train = order.slice(nTest)
  return [[train.map(i => rows[i]), train.map(i => labels[i])], [test.map(i => rows[i]), test.map(i => labels[i])]]
}
export function columnStats(rows) {
  return rows[0].map((_, j) => {
    const col = rows.map(r => r[j]), mean = col.reduce((a, b) => a + b, 0) / col.length
    return [mean, Math.sqrt(col.reduce((s, v) => s + (v - mean) ** 2, 0) / col.length)]
  })
}
export const scaleRows = (rows, stats) => rows.map(r => r.map((v, j) => (v - stats[j][0]) / stats[j][1]))
export function tumourData(columns = null, seed = 0) {
  const [rows, labels, names] = loadTumours(columns)
  const [[trainX, trainY], [testX, testY]] = splitTumours(rows, labels, 0.2, seed)
  const stats = columnStats(trainX)
  return { names, stats, X: scaleRows(trainX, stats), Y: trainY.map(y => [y]), Xtest: scaleRows(testX, stats), Ytest: testY.map(y => [y]), rawTest: testX, rawTrain: trainX, trainLabels: trainY, testLabels: testY }
}
