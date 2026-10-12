// Part 4 in JavaScript: the browser's sample of MNIST (data/mnist-small.dat, made by
// tools/make_mnist_small.py), mnist_net.py's mini-batches, and preprocess.py's steps for turning a
// drawing into an MNIST-style 28 × 28 image. parity.test.js checks the preprocessing against Python.
import { gunzipSync } from 'fflate'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import { oneHot } from './part3.js'
import { lossAndGradients, optimizerStep } from './mlp.js'

// The sample file: 'MNS1', train and test counts (2 bytes each), images (784 bytes each), labels.
export function parseMnistSmall(gz) {
  const bytes = gz instanceof Uint8Array ? gz : new Uint8Array(gz)
  // gzip's first two bytes are 1f 8b; if a server already unpacked it, use it as it is.
  const b = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes
  const nTrain = (b[4] << 8) | b[5], nTest = (b[6] << 8) | b[7]
  const image = i => Array.from(b.subarray(8 + i * 784, 8 + (i + 1) * 784), v => v / 255)
  const labelAt = i => b[8 + (nTrain + nTest) * 784 + i]
  const train = { X: [], labels: [] }, test = { X: [], labels: [] }
  for (let i = 0; i < nTrain; i++) { train.X.push(image(i)); train.labels.push(labelAt(i)) }
  for (let i = 0; i < nTest; i++) { test.X.push(image(nTrain + i)); test.labels.push(labelAt(nTrain + i)) }
  train.Y = train.labels.map(l => oneHot(l, 10)); test.Y = test.labels.map(l => oneHot(l, 10))
  return { train, test }
}

let loading = null
export function loadMnistSmall() {
  loading ??= import('../data/mnist-small.dat?url').then(m => fetch(m.default)).then(r => r.arrayBuffer()).then(parseMnistSmall)
  return loading
}

// mnist_net.py's batches: one epoch's positions, shuffled, in groups.
export function batches(n, batchSize, rng) {
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { const j = rng.randrange(i + 1);[order[i], order[j]] = [order[j], order[i]] }
  const out = []
  for (let i = 0; i < n; i += batchSize) out.push(order.slice(i, i + batchSize))
  return out
}

// Train on mini-batches: one optimiser step per batch. Returns each step's loss.
export function trainEpoch(net, opt, X, Y, batchSize, rng, lossKind = 'ce', maxSteps = Infinity) {
  const losses = []
  for (const batch of batches(X.length, batchSize, rng)) {
    if (losses.length >= maxSteps) break
    const r = lossAndGradients(net, batch.map(i => X[i]), batch.map(i => Y[i]), lossKind)
    optimizerStep(net, opt, r.grads)
    losses.push(r.loss)
  }
  return losses
}
export { PyRandom }

// preprocess.py
export function inkBox(image) {
  const rows = [], cols = []
  image.forEach((row, r) => { if (row.some(v => v > 0)) rows.push(r) })
  for (let c = 0; c < image[0].length; c++) if (image.some(row => row[c] > 0)) cols.push(c)
  return rows.length ? [rows[0], rows.at(-1), cols[0], cols.at(-1)] : null
}
export function shrink(image, size) {
  const height = image.length, width = image[0].length, scale = Math.max(height, width) / size
  const pyRound = x => { const f = Math.floor(x), d = x - f; return d > 0.5 || (d === 0.5 && f % 2 === 1) ? f + 1 : f }
  const newH = Math.max(1, pyRound(height / scale)), newW = Math.max(1, pyRound(width / scale))
  const out = []
  for (let r = 0; r < newH; r++) {
    const row = []
    for (let c = 0; c < newW; c++) {
      const r0 = Math.trunc(r * scale), r1 = Math.max(Math.trunc(r * scale) + 1, Math.trunc((r + 1) * scale))
      const c0 = Math.trunc(c * scale), c1 = Math.max(Math.trunc(c * scale) + 1, Math.trunc((c + 1) * scale))
      let sum = 0, n = 0
      for (let i = r0; i < Math.min(r1, height); i++) for (let j = c0; j < Math.min(c1, width); j++) { sum += image[i][j]; n++ }
      row.push(sum / n)
    }
    out.push(row)
  }
  return out
}
export function centreOfMass(image) {
  // Summed in Python's order: the total row by row, then the weighted sums pixel by pixel.
  const total = image.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0)
  let rs = 0, cs = 0
  image.forEach((row, r) => row.forEach(v => { rs += r * v }))
  image.forEach(row => row.forEach((v, c) => { cs += c * v }))
  return [rs / total, cs / total]
}
const pyRound = x => { const f = Math.floor(x), d = x - f; return d > 0.5 || (d === 0.5 && f % 2 !== 0) ? f + 1 : f }
// Every stage, for the figures: the crop, the 20 × 20 version, the centre of mass, the result.
export function toMnistStages(image) {
  const box = inkBox(image)
  if (!box) return null
  const [top, bottom, left, right] = box
  const crop = image.slice(top, bottom + 1).map(row => row.slice(left, right + 1))
  const small = shrink(crop, 20)
  const [rowMean, colMean] = centreOfMass(small)
  const shiftR = pyRound(14 - rowMean - 0.5), shiftC = pyRound(14 - colMean - 0.5)
  const out = Array.from({ length: 28 }, () => new Array(28).fill(0))
  small.forEach((row, r) => row.forEach((v, c) => { if (r + shiftR >= 0 && r + shiftR < 28 && c + shiftC >= 0 && c + shiftC < 28) out[r + shiftR][c + shiftC] = v }))
  return { box, crop, small, centre: [rowMean, colMean], shift: [shiftR, shiftC], out }
}
export const toMnist = image => toMnistStages(image)?.out ?? null
export function exampleDrawing() {
  const canvas = Array.from({ length: 60 }, () => new Array(60).fill(0))
  for (let c = 5; c < 30; c++) for (let r = 5; r < 9; r++) canvas[r][c] = 1
  for (let step = 0; step < 25; step++) for (let w = 0; w < 4; w++) canvas[8 + step][29 - Math.floor(step / 2) - w] = 1
  return canvas
}

// Small shifts of an image: more examples from few, for training on your own drawings.
export function shifted(image28, dr, dc) {
  return Array.from({ length: 28 }, (_, r) => Array.from({ length: 28 }, (_, c) => image28[r - dr]?.[c - dc] ?? 0))
}
