// 2D convolution (cross-correlation, as deep-learning libraries define it),
// receptive fields, and a translation experiment: raw pixels versus
// convolution + pooling features on shifted digit images.
import { random, normal, range } from '../../kit/math.js'
import { init, trainSteps, accuracy } from '../l21-mlp/engine.js'

export const KERNELS = {
  identity: { label: 'Identity', k: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
  blur: { label: 'Box blur (average)', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map(r => r.map(v => v / 9)) },
  sharpen: { label: 'Sharpen', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
  vertical: { label: 'Vertical edges (Sobel x)', k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
  horizontal: { label: 'Horizontal edges (Sobel y)', k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] },
  diagonal: { label: 'Diagonal lines', k: [[2, -1, -1], [-1, 2, -1], [-1, -1, 2]] },
}

export const outputSize = (n, k, stride, pad) => Math.floor((n + 2 * pad - k) / stride) + 1
export function conv2d(img, kernel, stride = 1, pad = 0) {
  const H = img.length, W = img[0].length, k = kernel.length, oh = outputSize(H, k, stride, pad), ow = outputSize(W, k, stride, pad)
  const at = (r, c) => (r < 0 || c < 0 || r >= H || c >= W ? 0 : img[r][c])
  return range(oh).map(i => range(ow).map(j => { let s = 0; for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) s += kernel[a][b] * at(i * stride - pad + a, j * stride - pad + b); return s }))
}
// Input pixels that influence output (i, j) of a single layer.
export function receptiveField(i, j, k, stride, pad) {
  const cells = []
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) cells.push([i * stride - pad + a, j * stride - pad + b])
  return cells
}
// Receptive-field size after L stacked layers with the same kernel and stride.
export function stackedRF(layers, k, stride) { let rf = 1, jump = 1; for (let l = 0; l < layers; l++) { rf += (k - 1) * jump; jump *= stride } return rf }
export const maxPool = (m, s = 2) => range(Math.floor(m.length / s)).map(i => range(Math.floor(m[0].length / s)).map(j => Math.max(...range(s * s).map(q => m[i * s + Math.floor(q / s)][j * s + (q % s)]))))

// 10×10 digit images: a 5×7 glyph placed at a chosen horizontal shift.
const FONT = ['01110100011001110101110011000101110', '00100011000010000100001000010001110', '01110100010000100010001000100011111', '11111000100010000010000011000101110', '00010001100101010010111110001000010', '11111100001111000001000011000101110', '00110010001000011110100011000101110', '11111000010001000100010000100001000', '01110100011000101110100011000101110', '01110100011000101111000010001001100']
export function digitImage(d, dx, dy, rng, noise = 0.1) {
  const img = range(10).map(() => Array(10).fill(0))
  for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (FONT[d][r * 5 + c] === '1') img[r + dy][c + dx] = 0.8 + 0.2 * rng()
  return img.map(row => row.map(v => Math.max(0, Math.min(1, v + noise * normal(rng)))))
}
export function digitSet(n, shifts, seed) {
  const rng = random(seed)
  return range(n).map(i => { const d = i % 10, dx = shifts[Math.floor(rng() * shifts.length)], dy = 1 + Math.floor(rng() * 2); return { d, img: digitImage(d, dx, dy, rng) } })
}

// Features: raw pixels, or four edge filters → ReLU → 2×2 max-pool → global sums per region.
const BANK = ['vertical', 'horizontal', 'diagonal', 'sharpen'].map(k => KERNELS[k].k)
export function features(img, kind) {
  if (kind === 'pixels') return img.flat()
  return BANK.flatMap(k => maxPool(conv2d(img, k, 1, 1).map(r => r.map(v => Math.max(0, v))), 2).flatMap(row => {
    // Coarse horizontal summary: row-wise max over columns keeps "where vertically" but forgets "where horizontally".
    return [Math.max(...row)]
  }))
}
export function shiftExperiment({ kind = 'pixels', augment = false, seed = 3, steps = 300 }) {
  const train = digitSet(300, augment ? [0, 1, 2, 3, 4, 5] : [0, 1], seed), test = digitSet(300, [4, 5], seed + 1), same = digitSet(200, [0, 1], seed + 2)
  const X = train.map(t => features(t.img, kind)), y = train.map(t => t.d)
  const layers = trainSteps(init([X[0].length, 10], 'xavier', seed), X, y, { act: 'relu', rate: 0.5, steps })
  const acc = set => accuracy(layers, set.map(t => features(t.img, kind)), set.map(t => t.d), 'relu')
  return { trainAcc: acc(train), sameAcc: acc(same), shiftedAcc: acc(test), featureCount: X[0].length }
}
