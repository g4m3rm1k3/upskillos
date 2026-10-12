// Part 3's Python programs in JavaScript: softmax.py, iris.py, torch_iris.py's confusion matrix and
// digits.py's data steps; plus the drawing pad's preprocessing, which is the data set's own: a 32 × 32
// drawing, cut into 4 × 4 blocks, each block's count of inked pixels (0 to 16) one of 64 numbers.
import irisCsv from '../python/iris.csv?raw'
import digitsCsv from '../python/digits.csv?raw'
import { shuffle } from './part1.js'

// softmax.py
export function softmax(scores) {
  const top = Math.max(...scores)
  const powers = scores.map(s => Math.exp(s - top))
  const total = powers.reduce((a, b) => a + b, 0)
  return powers.map(p => p / total)
}
export const crossEntropy = (probs, label) => -Math.log(probs[label])
export const oneHot = (label, n) => Array.from({ length: n }, (_, i) => i === label ? 1 : 0)

// iris.py
export const SPECIES = ['setosa', 'versicolor', 'virginica']
export const IRIS_COLUMNS = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width']
const IRIS = irisCsv.replace(/\r\n/g, '\n').trim().split('\n').slice(1).map(l => l.split(','))
export function loadIris(columns = ['petal_length', 'petal_width']) {
  const idx = columns.map(c => IRIS_COLUMNS.indexOf(c))
  return [IRIS.map(r => idx.map(i => Number(r[i]))), IRIS.map(r => SPECIES.indexOf(r[4]))]
}
export const scoresFor = (weights, biases, x) => weights.map((row, c) => row.reduce((s, w, j) => s + w * x[j], 0) + biases[c])
export function* trainSoftmax({ steps = 500, rate = 0.1 } = {}) {
  const [rows, labels] = loadIris()
  const n = rows.length, k = 3, m = rows[0].length
  const weights = Array.from({ length: k }, () => new Array(m).fill(0)), biases = new Array(k).fill(0), history = []
  for (let step = 0; step < steps; step++) {
    const gw = Array.from({ length: k }, () => new Array(m).fill(0)), gb = new Array(k).fill(0)
    let loss = 0
    rows.forEach((x, i) => {
      const probs = softmax(scoresFor(weights, biases, x))
      loss += crossEntropy(probs, labels[i]) / n
      const target = oneHot(labels[i], k)
      for (let c = 0; c < k; c++) {
        const slope = probs[c] - target[c]
        gb[c] += slope / n
        for (let j = 0; j < m; j++) gw[c][j] += slope * x[j] / n
      }
    })
    for (let c = 0; c < k; c++) { biases[c] -= rate * gb[c]; for (let j = 0; j < m; j++) weights[c][j] -= rate * gw[c][j] }
    history.push(loss)
    yield { step, weights, biases, history }
  }
}
export function predictSpecies(weights, biases, x) {
  const probs = softmax(scoresFor(weights, biases, x))
  return [probs.indexOf(Math.max(...probs)), probs]
}

// torch_iris.py
export function confusionMatrix(guesses, labels, n) {
  const table = Array.from({ length: n }, () => new Array(n).fill(0))
  guesses.forEach((g, i) => { table[labels[i]][g] += 1 })
  return table
}

// digits.py
const DIGITS = digitsCsv.replace(/\r\n/g, '\n').trim().split('\n').slice(1).map(l => l.split(',').map(Number))
export function loadDigits() { return [DIGITS.map(r => r.slice(0, 64).map(p => p / 16)), DIGITS.map(r => r[64])] }
export function splitDigits(images, labels, testFraction = 0.2, seed = 0) {
  const order = shuffle(images.map((_, i) => i), seed)
  const nTest = Math.trunc(order.length * testFraction), test = order.slice(0, nTest), train = order.slice(nTest)
  return [[train.map(i => images[i]), train.map(i => labels[i])], [test.map(i => images[i]), test.map(i => labels[i])]]
}
export function digitData(seed = 0) {
  const [images, labels] = loadDigits()
  const [[X, trainY], [Xtest, testY]] = splitDigits(images, labels, 0.2, seed)
  return { X, Y: trainY.map(y => oneHot(y, 10)), trainLabels: trainY, Xtest, Ytest: testY.map(y => oneHot(y, 10)), testLabels: testY }
}

// The drawing pad: a 32 × 32 grid of 0/1 cells → 64 block counts (0–16), as the data set was made.
// With fit, the drawing is first cropped to its ink and scaled to fill the grid, as the data set's
// digits were (they fill the box); without it, it is used where you drew it.
export function padToPixels(grid, fit = true) {
  let cells = grid
  if (fit) {
    let r0 = 32, r1 = -1, c0 = 32, c1 = -1
    grid.forEach((row, r) => row.forEach((v, c) => { if (v) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c) } }))
    if (r1 >= 0) {
      const h = r1 - r0 + 1, w = c1 - c0 + 1, scale = 32 / Math.max(h, w)
      const offR = (32 - h * scale) / 2, offC = (32 - w * scale) / 2
      cells = Array.from({ length: 32 }, (_, r) => Array.from({ length: 32 }, (_, c) => {
        const sr = Math.floor((r - offR) / scale) + r0, sc = Math.floor((c - offC) / scale) + c0
        return sr >= r0 && sr <= r1 && sc >= c0 && sc <= c1 ? grid[sr][sc] : 0
      }))
    }
  }
  const out = []
  for (let br = 0; br < 8; br++) for (let bc = 0; bc < 8; bc++) {
    let n = 0
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) n += cells[br * 4 + r][bc * 4 + c] ? 1 : 0
    out.push(n)
  }
  return out
}
