import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 21 practice ladder: shapes, stable softmax, the dense layer's backward pass, and breaking symmetry.

export const nParams = widths => widths.slice(1).reduce((s, m, l) => s + widths[l] * m + m, 0)
export const softmaxOf = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) }
const matmul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((t, v, k) => t + v * B[k][j], 0)))
const T = A => A[0].map((_, j) => A.map(row => row[j]))
export const denseGradOf = (A, D) => matmul(T(A), D)
export const hiddenDeltaOf = (D, W, Z) => matmul(D, T(W)).map((row, i) => row.map((v, j) => (Z[i][j] > 0 ? v : 0)))

const SOFT_CASES = [[2, 1, 0], [1000, 1001, 1002], [-3, 0, 3, 0], [5, 5]].map(z => ({ z, expected: softmaxOf(z) }))
const DENSE_CASES = [
  { A: [[1, 2], [3, 4], [0, 1]], D: [[1, 0, -1], [0, 2, 1], [1, 1, 1]] },
  { A: [[0.5, -1, 2]], D: [[2, -2]] },
  { A: [[1, 0], [0, 1], [1, 1], [2, -1]], D: [[1], [2], [3], [4]] },
  { A: [[1, 2, 3], [4, 5, 6]], D: [[1, -1], [0.5, 0.5]] },
].map(c => ({ ...c, expected: denseGradOf(c.A, c.D) }))
export const DELTA_CASES = [
  { D: [[1, -1]], W: [[1, 2], [3, 4], [5, 6]], Z: [[0.5, -0.2, 1]] },
  { D: [[0.1, 0.2], [0.3, -0.4]], W: [[1, 0], [0, 1]], Z: [[1, -1], [-1, 1]] },
  { D: [[2], [1], [-1]], W: [[0.5], [-0.5], [1]], Z: [[1, 1, -1], [-2, 3, 0.5], [0.1, 0.1, 0.1]] },
  { D: [[1, 2, 3]], W: [[1, 1, 1], [2, 0, -1]], Z: [[3, -3]] },
].map(c => ({ ...c, expected: hiddenDeltaOf(c.D, c.W, c.Z) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : v != null && Math.abs(v - b[i]) < 1e-9))
export function diagnoseSoftmax(c, got) {
  if (Array.isArray(got.value) && got.value.some(v => v == null)) return 'The result contains nan: e^1000 overflowed. Subtract the largest score before exponentiating (that is what e holds).'
  const e = c.z.map(v => Math.exp(v - Math.max(...c.z)))
  if (near(got.value, e)) return 'Those are the exponentials. Divide them by their sum so the probabilities add to 1.'
  return null
}
export function diagnoseDense(c, got) {
  if (near(got.value, T(c.expected))) return `That is (∂L/∂W)ᵀ, shape (${c.D[0].length}, ${c.A[0].length}). W has one row per input and one column per unit: use A_prev.T @ delta.`
  return null
}
export function diagnoseDelta(c, got) {
  const noRelu = matmul(c.D, T(c.W))
  if (near(got.value, noRelu) && !near(noRelu, c.expected)) return 'The ReLU step is missing: after delta @ W.T, zero every entry where Z ≤ 0 (the unit passed nothing forward, so it passes nothing back).'
  const wrongMask = matmul(c.D, T(c.W)).map((row, i) => row.map((v, j) => (c.Z[i][j] > 0 ? v * c.Z[i][j] : 0)))
  if (near(got.value, wrongMask) && !near(wrongMask, c.expected)) return 'ReLU’s slope is 1 where Z > 0, not Z itself: multiply by (Z > 0).'
  return null
}
export function evaluateInit(vars) {
  const miss = needVars(vars, ['scale', 'loss', 'distinct'])
  if (miss) return { passed: false, message: miss }
  const s = Number(vars.scale.value), L = Number(vars.loss.value), d = Number(vars.distinct.value)
  if (d < 2 || L > 0.3) return { passed: false, message: `scale = ${s}: after 1,000 steps the loss is ${r3(L)} and the four hidden units are ${d === 1 ? 'all the same' : `only ${d} distinct`}. Identical starting weights get identical gradients forever. Set \`scale = 1.0\` and run again.` }
  return { passed: true, message: `scale = ${s}: loss ${r3(L)}, ${d} distinct hidden units, XOR solved. Random starting weights make the units different, so they can learn different features.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['params', 'softmax2', 'he']
export function generate(template, seed) {
  const g = rng(seed * 719 + TEMPLATES.indexOf(template) * 3011 + 59)
  if (template === 'params') {
    const widths = [g.int(2, 20), g.pick([4, 8, 16, 32]), ...(g.int(0, 1) ? [g.pick([4, 8, 16])] : []), g.int(2, 10)]
    const answer = nParams(widths), weightsOnly = widths.slice(1).reduce((s, m, l) => s + widths[l] * m, 0)
    return { template, seed, widths, answer, misconceptions: [{ answer: weightsOnly, feedback: 'That counts the weights only. Each unit also has a bias.' }] }
  }
  if (template === 'softmax2') {
    const z0 = g.int(-3, 3), z1 = g.int(-3, 3)
    if (z0 === z1) return generate(template, seed + 1000)
    const answer = softmaxOf([z0, z1])[0]
    return { template, seed, z0, z1, answer, misconceptions: [{ answer: z0 / (z0 + z1 || 1), feedback: 'Softmax divides exponentials, not the scores themselves: e^z₀ / (e^z₀ + e^z₁).' }, { answer: 1 - answer, feedback: 'That is the probability of class 1.' }].filter(m => Number.isFinite(m.answer) && Math.abs(m.answer - answer) > 0.0006) }
  }
  const fanIn = g.pick([2, 8, 18, 32, 50, 72, 128, 200, 512]), answer = Math.sqrt(2 / fanIn)
  return { template, seed, fanIn, answer, misconceptions: [{ answer: 2 / fanIn, feedback: 'That is the variance, 2/fan_in. The standard deviation is its square root.' }, { answer: Math.sqrt(1 / fanIn), feedback: 'That is 1/fan_in’s square root (LeCun’s rule). He uses 2/fan_in for ReLU.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
}
export function view(p) {
  if (p.template === 'params') return { intro: `A dense network with layer widths ${p.widths.join(' → ')} (input first).`, questions: [{ id: 'n', type: 'number', label: 'How many parameters (weights and biases) does it have?', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'softmax2') return { intro: `Two classes with scores z₀ = ${p.z0} and z₁ = ${p.z1}.`, questions: [{ id: 'p', type: 'number', label: 'What probability does softmax give class 0? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `A ReLU layer with fan_in = ${p.fanIn} inputs, initialized with He’s rule N(0, 2/fan_in).`, questions: [{ id: 's', type: 'number', label: 'What standard deviation do its weights have? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'params') return `${p.widths.slice(1).map((m, l) => `${p.widths[l]} × ${m} + ${m}`).join(' + ')} = **${p.answer}**.`
  if (p.template === 'softmax2') return `e^${p.z0} / (e^${p.z0} + e^${p.z1}) = 1 / (1 + e^(${p.z1} − ${p.z0})) = **${r3(p.answer)}**.`
  return `√(2/${p.fanIn}) = **${r3(p.answer)}**.`
}

export const mlp = {
  title: 'Dense layers forward and backward',
  version: 1,
  templates: TEMPLATES,
  templateNames: { params: 'Counting parameters', softmax2: 'Softmax with two classes', he: 'He initialization' },
  generate, view, workedSolution,
  intro: 'Seven steps: shapes and a softmax gradient by hand, why weights must start random, a stable softmax, and the matrix backward pass. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Shapes and a gradient by hand',
      prompt: 'A 3 → 4 → 2 network on a batch of n = 5 examples. Separately, one example’s softmax probabilities are p = (0.7, 0.2, 0.1) and its true class is 1.',
      fields: [
        { label: 'Entries in W₁', answer: 12 },
        { label: 'Parameters in the whole network', answer: 26 },
        { label: 'Numbers in the hidden activations A₁', answer: 20 },
        { label: '∂L/∂z₁ for the example', answer: -0.8, tolerance: 1e-9 },
        { label: '∂L/∂z₀ for the example', answer: 0.7, tolerance: 1e-9 },
      ],
      explain: 'W₁ is (3, 4): 12 entries. Parameters: 3 × 4 + 4 + 4 × 2 + 2 = 26. A₁ is (5, 4): 20 numbers. The softmax–cross-entropy gradient is p minus the one-hot truth: (0.7, 0.2 − 1, 0.1) = (0.7, −0.8, 0.1).',
    },
    {
      id: 'agree', kind: 'probe', title: 'Break the symmetry',
      prompt: 'A 2 → 4 → 2 tanh network trained on XOR for 1,000 steps, with every weight starting at `scale × random`. Run it at `scale = 0.0`, then **set `scale = 1.0`** and run again. Predict first: how many of the four hidden units end up different at scale 0?',
      starter: `import numpy as np
X = np.array([[0., 0.], [0., 1.], [1., 0.], [1., 1.]]); y = np.array([0, 1, 1, 0]); Y = np.eye(2)[y]
scale = 0.0                                       # the spread of the first weights
rng = np.random.default_rng(0)
W1, b1 = scale * rng.normal(size=(2, 4)), np.zeros(4)
W2, b2 = scale * rng.normal(size=(4, 2)), np.zeros(2)
for step in range(1000):
    A1 = np.tanh(X @ W1 + b1); Z2 = A1 @ W2 + b2
    P = np.exp(Z2 - Z2.max(1, keepdims=True)); P /= P.sum(1, keepdims=True)
    D2 = (P - Y) / 4; D1 = (D2 @ W2.T) * (1 - A1 ** 2)
    W2 -= 1.0 * A1.T @ D2; b2 -= 1.0 * D2.sum(0); W1 -= 1.0 * X.T @ D1; b1 -= 1.0 * D1.sum(0)
loss = -np.mean(np.log(P[np.arange(4), y]))
distinct = len({tuple(np.round(W1[:, j], 6)) for j in range(4)})   # how many different hidden units
print(f"scale {scale}: loss {loss:.4f}, distinct hidden units {distinct} of 4, predictions {P.argmax(1)}")`,
      probe: ['scale', 'loss', 'distinct'],
      evaluate: evaluateInit,
      done: 'Every framework initializes weights randomly, at a scale chosen for the activation (He for ReLU), and biases at zero.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in a stable softmax',
      prompt: 'Replace `___` so the function returns softmax probabilities, even for scores near 1000.',
      starter: `import numpy as np

def softmax(z):
    """Probabilities from a vector of scores."""
    e = np.exp(z - z.max())      # every exponent is at most 0: no overflow
    return ___`,
      hint: 'Divide each exponential by the sum of them all.',
      solution: 'return e / e.sum()',
      check: { fn: 'softmax', args: ['z'], cases: SOFT_CASES, describe: c => `z = [${c.z.join(', ')}]`, diagnose: diagnoseSoftmax },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For A_prev of shape (3, 2) and delta of shape (3, 3), this returns a **(3, 2)** array; the layer’s W is (2, 3), so its gradient must be (2, 3). Fix it.',
      starter: `import numpy as np

def dense_weight_grad(A_prev, delta):
    """Z = A_prev @ W + b. Return dL/dW given delta = dL/dZ."""
    return delta.T @ A_prev`,
      hint: 'The gradient has W’s shape: rows are inputs, columns are units. Which product gives (inputs, units)?',
      solution: 'return A_prev.T @ delta',
      check: { fn: 'dense_weight_grad', args: ['A_prev', 'delta'], cases: DENSE_CASES.map(c => ({ ...c, A_prev: c.A, delta: c.D })), describe: c => `A_prev ${c.A.length}×${c.A[0].length}, delta ${c.D.length}×${c.D[0].length}`, diagnose: diagnoseDense },
      explainChoice: {
        prompt: 'Why is writing down every shape the quickest way to find this kind of bug?',
        options: [
          { text: 'A gradient always has the shape of the thing it is the gradient of, so a wrong product usually gives a wrong shape — which is visible before any number is checked.', correct: true },
          { text: 'NumPy raises an error for every transposed product.', feedback: 'Not when the shapes happen to fit: a square layer would hide this bug completely.' },
          { text: 'Shapes do not matter as long as the loss goes down.', feedback: 'A transposed gradient updates the wrong weights; training may crash later or silently learn nothing.' },
          { text: 'It is quicker to compare against finite differences.', feedback: 'That also works, but costs two forward passes per weight; the shape check is instant.' },
        ],
        rightFeedback: 'And when a layer is square, a finite-difference check on a few weights catches what the shape check cannot.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Pass the error back through a ReLU layer',
      prompt: 'Write `hidden_delta` from its contract: the step that turns one layer’s Δ into the Δ of the layer below.',
      starter: `import numpy as np

def hidden_delta(delta, W, Z_prev):
    """delta = dL/dZ of this layer, shape (n, m). W: this layer's weights, (d, m).
    Z_prev: the layer below's pre-activations, (n, d), whose activation is ReLU. Return dL/dZ_prev, (n, d).

    Example: hidden_delta(np.array([[1., -1.]]), np.array([[1., 2.], [3., 4.], [5., 6.]]), np.array([[0.5, -0.2, 1.]]))
             ->  array([[-1.,  0., -1.]])
    """
    pass   # replace with your code`,
      hint: 'Back through the weights with delta @ W.T, then back through ReLU: keep the entries where Z_prev > 0.',
      solution: 'return (delta @ W.T) * (Z_prev > 0)',
      check: { fn: 'hidden_delta', args: ['delta', 'W', 'Z_prev'], cases: DELTA_CASES.map(c => ({ ...c, delta: c.D, Z_prev: c.Z })), describe: c => `delta ${c.D.length}×${c.D[0].length}, W ${c.W.length}×${c.W[0].length}`, diagnose: diagnoseDelta },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New networks and scores. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
