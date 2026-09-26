import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 24 practice ladder: convolution by hand, output sizes, cross-correlation, pooling, and shifted digits.

export const outSizeOf = (n, k, s, p) => Math.floor((n + 2 * p - k) / s) + 1
export function xcorrOf(img, K, flip = false) {
  const k = K.length, n = img.length - k + 1, W = flip ? K.map(r => [...r].reverse()).reverse() : K
  return Array.from({ length: n }, (_, i) => Array.from({ length: img[0].length - k + 1 }, (_, j) => W.reduce((t, row, a) => t + row.reduce((u, v, b) => u + v * img[i + a][j + b], 0), 0)))
}
export function maxPoolOf(m, s) {
  return Array.from({ length: Math.floor(m.length / s) }, (_, i) => Array.from({ length: Math.floor(m[0].length / s) }, (_, j) => {
    let best = -Infinity
    for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) best = Math.max(best, m[i * s + a][j * s + b])
    return best
  }))
}

const SIZE_CASES = [[12, 3, 1, 1], [12, 3, 2, 1], [32, 3, 1, 0], [28, 5, 2, 2], [7, 3, 3, 0]].map(([n, k, s, p]) => ({ n, k, s, p, expected: outSizeOf(n, k, s, p) }))
export const XCORR_CASES = [
  { img: [[1, 2, 0], [0, 1, 3], [2, 1, 0]], K: [[1, 0], [0, -1]] },
  { img: [[0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]], K: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] },
  { img: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]], K: [[1, 2], [3, 4]] },
  { img: [[2, 0], [1, 3]], K: [[0, 1], [2, 0]] },
].map(c => ({ ...c, expected: xcorrOf(c.img, c.K) }))
const POOL_CASES = [
  { m: [[1, 3, 2, 0], [4, 2, 1, 1], [0, 1, 5, 6], [2, 2, 7, 1]], s: 2 },
  { m: [[-1, -2], [-3, -4]], s: 2 },
  { m: [[1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1], [0, 0, 9, 0, 0, 0], [1, 1, 1, 1, 1, 8], [2, 2, 2, 2, 2, 2], [0, 7, 0, 0, 0, 0]], s: 3 },
  { m: [[5, 1, 1, 9], [1, 1, 1, 1]], s: 2 },
].map(c => ({ ...c, expected: maxPoolOf(c.m, c.s) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : Math.abs(v - b[i]) < 1e-9))
export function diagnoseSize(c, got) {
  const v = got.value
  if (v === Math.floor((c.n - c.k) / c.s) + 1 && c.p > 0) return 'The padding is missing: it adds p pixels on each side, 2p in total.'
  if (v === Math.floor((c.n + c.p - c.k) / c.s) + 1 && c.p > 0) return 'Padding goes on both sides: n + 2p.'
  if (v === (c.n + 2 * c.p - c.k) / c.s + 1 && !Number.isInteger(v)) return 'Round down: a partial step does not produce an output (integer division).'
  if (v === Math.floor((c.n + 2 * c.p - c.k) / c.s) && c.s > 0) return 'Add 1: the first position counts too.'
  return null
}
export function diagnoseXcorr(c, got) {
  if (near(got.value, xcorrOf(c.img, c.K, true)) && !near(xcorrOf(c.img, c.K, true), c.expected)) return 'The kernel is flipped: that is the textbook convolution. Deep-learning libraries compute cross-correlation — multiply each patch by the kernel as it is.'
  return null
}
export function diagnosePool(c, got) {
  const avg = Array.from({ length: Math.floor(c.m.length / c.s) }, (_, i) => Array.from({ length: Math.floor(c.m[0].length / c.s) }, (_, j) => {
    let t = 0; for (let a = 0; a < c.s; a++) for (let b = 0; b < c.s; b++) t += c.m[i * c.s + a][j * c.s + b]; return t / (c.s * c.s)
  }))
  if (near(got.value, avg)) return 'That is average pooling. Max-pooling keeps the largest value in each block.'
  return null
}
export function evaluateShift(vars) {
  const miss = needVars(vars, ['use_conv', 'shifted_acc'])
  if (miss) return { passed: false, message: miss }
  const acc = Number(vars.shifted_acc.value)
  if (!Number(vars.use_conv.value)) return { passed: false, message: `Raw pixels: ${r3(acc)} on the moved digits — near chance (0.1). Every pixel weight is tied to one position. Set \`use_conv = 1\` and run again.` }
  return { passed: true, message: `Convolution features: ${r3(acc)} on the moved digits. The same filters run at every position, and pooling forgets where along the row a feature was.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['outsize', 'params', 'rf']
export function generate(template, seed) {
  const g = rng(seed * 331 + TEMPLATES.indexOf(template) * 7019 + 71)
  if (template === 'outsize') {
    const n = g.pick([7, 10, 12, 16, 28, 32, 64]), k = g.pick([3, 5]), s = g.pick([1, 2, 3]), p = g.int(0, 2)
    if (n + 2 * p < k) return generate(template, seed + 1000)
    const answer = outSizeOf(n, k, s, p)
    return { template, seed, n, k, s, p, answer, misconceptions: [{ answer: Math.floor((n - k) / s) + 1, feedback: 'Padding adds 2p to the input size.' }, { answer: Math.floor((n + 2 * p - k) / s), feedback: 'Add 1 for the first position.' }].filter(m => m.answer !== answer) }
  }
  if (template === 'params') {
    const k = g.pick([1, 3, 5]), cin = g.pick([1, 3, 16, 32, 64]), cout = g.pick([8, 16, 32, 64, 128]), answer = k * k * cin * cout + cout
    return { template, seed, k, cin, cout, answer, misconceptions: [{ answer: k * k * cin * cout, feedback: 'Add one bias per output channel.' }, { answer: k * k * cout + cout, feedback: 'Each kernel spans all input channels: k × k × C_in weights.' }].filter(m => m.answer !== answer) }
  }
  const L = g.int(2, 6), k = g.pick([3, 5, 7]), answer = 1 + L * (k - 1)
  return { template, seed, L, k, answer, misconceptions: [{ answer: L * k, feedback: 'Layers overlap: each adds k − 1, starting from 1.' }, { answer: k + L, feedback: 'Each layer adds k − 1 pixels, not 1.' }].filter(m => m.answer !== answer) }
}
export function view(p) {
  if (p.template === 'outsize') return { intro: `An ${p.n} × ${p.n} input, a ${p.k} × ${p.k} kernel, stride ${p.s}, padding ${p.p}.`, questions: [{ id: 'n', type: 'number', label: 'What is the output width?', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'params') return { intro: `A ${p.k} × ${p.k} convolution from ${p.cin} to ${p.cout} channels.`, questions: [{ id: 'n', type: 'number', label: 'How many parameters, including biases?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `${p.L} stacked ${p.k} × ${p.k} convolutions with stride 1.`, questions: [{ id: 'r', type: 'number', label: 'What is the receptive field size of one output?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'outsize') return `⌊(${p.n} + 2·${p.p} − ${p.k})/${p.s}⌋ + 1 = **${p.answer}**.`
  if (p.template === 'params') return `${p.k} × ${p.k} × ${p.cin} × ${p.cout} + ${p.cout} = **${p.answer}**.`
  return `1 + ${p.L} × (${p.k} − 1) = **${p.answer}**.`
}

export const conv = {
  title: 'Convolutions, sizes and pooling',
  version: 1,
  templates: TEMPLATES,
  templateNames: { outsize: 'Output size', params: 'Parameters of a convolution', rf: 'Receptive field' },
  generate, view, workedSolution,
  intro: 'Seven steps: a convolution and its sizes by hand, why convolution features survive a shift, and writing the output-size rule, cross-correlation and max-pooling. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'A convolution by hand',
      prompt: 'The image [[1, 2, 0], [0, 1, 3], [2, 1, 0]] and the kernel [[1, 0], [0, −1]], stride 1, no padding (cross-correlation, as libraries compute it).',
      fields: [
        { label: 'Output at row 0, column 0', answer: 0 },
        { label: 'Output at row 0, column 1', answer: -1 },
        { label: 'Output at row 1, column 1', answer: 1 },
        { label: 'Output width for n = 9, k = 3, s = 2, p = 1', answer: 5 },
        { label: 'Parameters of a 3 × 3 convolution from 3 to 8 channels', answer: 224 },
      ],
      explain: 'Top-left patch [[1, 2], [0, 1]]: 1·1 + 0·2 + 0·0 − 1·1 = 0. Next patch [[2, 0], [1, 3]]: 2 − 3 = −1. Bottom-right [[1, 3], [1, 0]]: 1 − 0 = 1. ⌊(9 + 2 − 3)/2⌋ + 1 = 5. 3·3·3·8 + 8 = 224.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Move the digits',
      prompt: 'Train on digits near the left edge, test on the same digits moved right. Run it with raw pixels (`use_conv = 0`), then **set `use_conv = 1`** and run again. Predict first.',
      starter: `import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from sklearn.linear_model import LogisticRegression
FONT = ["01110100011001110101110011000101110", "00100011000010000100001000010001110", "01110100010000100010001000100011111",
        "11111000100010000010000011000101110", "00010001100101010010111110001000010", "11111100001111000001000011000101110",
        "00110010001000011110100011000101110", "11111000010001000100010000100001000", "01110100011000101110100011000101110",
        "01110100011000101111000010001001100"]
def digit_set(n, shifts, seed):
    rng = np.random.default_rng(seed); imgs = np.zeros((n, 10, 10))
    for i in range(n):
        g = np.array([int(c) for c in FONT[i % 10]], float).reshape(7, 5)
        dx, dy = rng.choice(shifts), 1 + rng.integers(0, 2)
        imgs[i, dy:dy + 7, dx:dx + 5] = g * (0.8 + 0.2 * rng.random((7, 5)))
    return np.clip(imgs + 0.1 * rng.normal(size=imgs.shape), 0, 1), np.arange(n) % 10
KERNELS = np.array([[[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
                    [[2, -1, -1], [-1, 2, -1], [-1, -1, 2]], [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]])
def conv_features(imgs):
    windows = sliding_window_view(np.pad(imgs, ((0, 0), (1, 1), (1, 1))), (3, 3), axis=(1, 2))   # (n, 10, 10, 3, 3)
    maps = np.maximum(0, np.einsum("nijab,kab->nkij", windows, KERNELS))                         # 4 feature maps
    pooled = maps.reshape(len(imgs), 4, 5, 2, 5, 2).max(axis=(3, 5))                              # 2×2 max-pool
    return pooled.max(axis=3).reshape(len(imgs), -1)                                              # max over columns

use_conv = 0                    # 0: raw pixels, 1: convolution features
train_x, train_y = digit_set(300, [0, 1], seed=3)
test_x, test_y = digit_set(300, [4, 5], seed=4)
features = conv_features if use_conv else (lambda imgs: imgs.reshape(len(imgs), -1))
model = LogisticRegression(max_iter=3000).fit(features(train_x), train_y)
train_acc, shifted_acc = model.score(features(train_x), train_y), model.score(features(test_x), test_y)
print(f"use_conv = {use_conv}: training positions {train_acc:.2f}, digits moved right {shifted_acc:.2f}")`,
      probe: ['use_conv', 'shifted_acc'],
      evaluate: evaluateShift,
      done: 'A learned CNN finds its own filters, but the reason it generalizes across positions is the same: shared weights and pooling.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the output size',
      prompt: 'Replace `___` with the output width of a convolution.',
      starter: `def out_size(n, k, s, p):
    """Input width n, kernel width k, stride s, padding p (on each side)."""
    return ___`,
      hint: 'Pad both sides, subtract the kernel, divide by the stride and round down, then count the first position.',
      solution: 'return (n + 2 * p - k) // s + 1',
      check: { fn: 'out_size', args: ['n', 'k', 's', 'p'], ints: ['n', 'k', 's', 'p'], cases: SIZE_CASES, describe: c => `n = ${c.n}, k = ${c.k}, s = ${c.s}, p = ${c.p}`, diagnose: diagnoseSize },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'On the trace’s image and kernel this returns **[[0, 1], [1, −1]]** instead of [[0, −1], [−1, 1]]. Fix it.',
      starter: `import numpy as np

def xcorr2d(img, K):
    """Slide K over img with stride 1 and no padding, as deep-learning libraries do."""
    k = K.shape[0]
    h, w = img.shape[0] - k + 1, img.shape[1] - k + 1
    out = np.zeros((h, w))
    for i in range(h):
        for j in range(w):
            out[i, j] = np.sum(img[i:i + k, j:j + k] * K[::-1, ::-1])
    return out`,
      hint: 'Libraries do not flip the kernel.',
      solution: 'out[i, j] = np.sum(img[i:i + k, j:j + k] * K)',
      check: { fn: 'xcorr2d', args: ['img', 'K'], cases: XCORR_CASES, describe: c => `${c.img.length}×${c.img[0].length} image, ${c.K.length}×${c.K.length} kernel`, diagnose: diagnoseXcorr },
      explainChoice: {
        prompt: 'For a trained network, does it matter whether a library flips the kernel?',
        options: [
          { text: 'Not for what the network can learn — training would simply learn the flipped kernel — but it matters as soon as you copy weights between conventions or read a kernel as a feature detector.', correct: true },
          { text: 'Yes: a flipped convolution cannot learn edge detectors.', feedback: 'It can: it would learn the flipped weights.' },
          { text: 'No, never.', feedback: 'Copying weights from one convention into the other gives wrong outputs, as this bug shows.' },
          { text: 'Only for symmetric kernels.', feedback: 'The opposite: symmetric kernels give the same result either way; asymmetric ones do not.' },
        ],
        rightFeedback: 'Same idea as nn.Linear’s transposed weight in Lab 23: conventions matter when weights cross between tools.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write max-pooling',
      prompt: 'Write `max_pool` from its contract.',
      starter: `import numpy as np

def max_pool(m, s):
    """Non-overlapping s × s blocks (the sides of m are multiples of s). Return the largest value in each block.

    Example: max_pool(np.array([[1., 3., 2., 0.], [4., 2., 1., 1.], [0., 1., 5., 6.], [2., 2., 7., 1.]]), 2)
             ->  array([[4., 2.], [2., 7.]])
    """
    pass   # replace with your code`,
      hint: 'm.reshape(h // s, s, w // s, s) puts each block on axes 1 and 3; take the max over them.',
      solution: 'h, w = m.shape\nreturn m.reshape(h // s, s, w // s, s).max(axis=(1, 3))',
      check: { fn: 'max_pool', args: ['m', 's'], ints: ['s'], cases: POOL_CASES, describe: c => `${c.m.length}×${c.m[0].length}, s = ${c.s}`, diagnose: diagnosePool },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New layers and inputs. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
