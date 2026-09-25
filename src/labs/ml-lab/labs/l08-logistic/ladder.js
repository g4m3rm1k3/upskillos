import { rng, r3, nearArr, needVars } from '../../kit/ladder.js'

// Lab 08 practice ladder: score, sigmoid, log loss and gradient for logistic regression, and a
// numerically stable loss. Expected values computed by hand and with NumPy; tests recompute them.

export const sigma = z => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)))
const softplus = z => (z > 0 ? z + Math.log1p(Math.exp(-z)) : Math.log1p(Math.exp(z)))        // log(1 + e^z), stable
const dotb = (x, w, b) => x.reduce((s, v, j) => s + v * w[j], b)
export const lossOf = (X, y, w, b) => X.reduce((s, x, i) => { const z = dotb(x, w, b); return s + softplus(z) - y[i] * z }, 0) / X.length
export const gradOf = (X, y, w, b) => {
  const r = X.map((x, i) => sigma(dotb(x, w, b)) - y[i]), n = X.length
  return [...w.map((_, j) => X.reduce((s, x, i) => s + r[i] * x[j], 0) / n), r.reduce((a, c) => a + c, 0) / n]
}
const CASES = [
  { X: [[2, 1]], y: [1], w: [0.5, -1], b: 0.5 },
  { X: [[1, 0], [0, 1], [1, 1]], y: [1, 0, 1], w: [1, -1], b: 0 },
  { X: [[0.5], [-1], [3]], y: [0, 0, 1], w: [2], b: -1 },
  { X: [[100, 0], [-100, 0]], y: [0, 1], w: [1, 0], b: 0 },                 // confidently wrong: the naive loss overflows
]
const describe = c => `${c.X.length} row${c.X.length > 1 ? 's' : ''}, w = [${c.w.join(', ')}], b = ${c.b}`

export function diagnoseGrad(c, got) {
  const v = got.value, lin = (() => { const r = c.X.map((x, i) => dotb(x, c.w, c.b) - c.y[i]), n = c.X.length; return [...c.w.map((_, j) => c.X.reduce((s, x, i) => s + r[i] * x[j], 0) / n), r.reduce((a, x) => a + x, 0) / n] })()
  if (!v || v.length !== c.w.length + 1) return 'Return the weights’ gradient followed by the bias’s: np.append(grad_w, grad_b).'
  if (nearArr(v, lin) && !nearArr(lin, c.expected)) return 'That used the raw score z as the prediction: the error must be σ(z) − y, the probability minus the label.'
  if (nearArr(v, c.expected.map(x => -x))) return 'Right size, wrong sign: the error is p − y.'
  return null
}
export function diagnoseLoss(c, got) {
  const v = got.value
  if (v == null || !Number.isFinite(v)) return 'The loss came out infinite or NaN: σ(z) rounded to exactly 0 or 1 and the logarithm blew up. Compute log(1 + e^z) − y·z with np.logaddexp(0, z) instead.'
  if (Math.abs(v - c.expected * c.X.length) < 1e-9 && c.X.length > 1) return 'That is the total; the log loss is the mean over rows.'
  return null
}
export function evaluateStable(vars) {
  const miss = needVars(vars, ['z', 'y', 'loss'])
  if (miss) return { passed: false, message: miss }
  const z = vars.z.value, y = vars.y.value, l = vars.loss.value
  const want = z.reduce((s, zi, i) => s + softplus(zi) - y[i] * zi, 0) / z.length
  if (l == null || !Number.isFinite(l)) return { passed: false, message: 'The loss is infinite: at z = 800, σ(z) rounds to exactly 1 and log(1 − 1) = −∞. Replace the loss line with `loss = np.mean(np.logaddexp(0, z) - y * z)` and run again.' }
  if (Math.abs(l - want) > 1e-6) return { passed: false, message: `The loss should be ${r3(want)}.` }
  return { passed: true, message: `A finite loss, ${r3(want)}: log(1 + e^z) − y·z never forms σ(z) = 1 or 0, so it survives scores of ±800. The confidently wrong example at z = −800 with y = 1 contributes its full 800.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['prob', 'loss', 'grad']
const CONTEXTS = [{ what: 'a login', yes: 'fraudulent' }, { what: 'a build', yes: 'going to fail' }, { what: 'an email', yes: 'spam' }]
export function generate(template, seed) {
  const g = rng(seed * 1297 + TEMPLATES.indexOf(template) * 9001 + 5)
  const ctx = g.pick(CONTEXTS), w = [g.pick([-1, -0.5, 0.5, 1, 1.5]), g.pick([-2, -1, 0.5, 1, 2])], b = g.pick([-1, -0.5, 0, 0.5, 1]), x = [g.int(0, 3), g.int(-2, 2)], y = g.int(0, 1)
  const z = dotb(x, w, b), p = sigma(z), base = { template, seed, ctx, w, b, x, y, z, p }
  if (template === 'prob') return { ...base, answer: p, misconceptions: [{ answer: z, feedback: 'That is the score z. The probability is σ(z) = 1/(1 + e^(−z)).' }, { answer: 1 - p, feedback: 'That is P(no). σ(z) is the probability of the yes class.' }].filter(m => Math.abs(m.answer - p) > 0.0006) }
  const pt = y === 1 ? p : 1 - p
  if (template === 'loss') return { ...base, answer: -Math.log(pt), misconceptions: [{ answer: -Math.log(y === 1 ? 1 - p : p), feedback: 'That scores the wrong label: use the probability the model gave to what actually happened.' }, { answer: (p - y) ** 2, feedback: 'That is the squared error. Log loss is −log(probability given to the truth).' }].filter(m => Math.abs(m.answer + Math.log(pt)) > 0.0006) }
  const answer = (p - y) * x[0]
  return { ...base, answer, misconceptions: [{ answer: (z - y) * x[0], feedback: 'Use the probability σ(z), not the score z, as the prediction.' }, { answer: p - y, feedback: 'That is ∂ℓ/∂b. Multiply by x₁ for ∂ℓ/∂w₁.' }, { answer: (y - p) * x[0], feedback: 'Right size, wrong sign: the error is p − y.' }].filter((m, i, a) => Math.abs(m.answer - answer) > 0.0006 && a.findIndex(o => Math.abs(o.answer - m.answer) < 0.0006) === i) }
}
export function view(p) {
  const intro = `A logistic model scores whether ${p.ctx.what} is ${p.ctx.yes}: z = w₁x₁ + w₂x₂ + b with w = (${p.w.join(', ')}) and b = ${p.b}. This one has x = (${p.x.join(', ')})${p.template === 'prob' ? '' : ` and the true label is y = ${p.y}`}.`
  const q = { prob: 'What probability does the model give to “yes”, σ(z)? (Three decimals.)', loss: 'What is its log loss, −log(probability given to the true label)? (Three decimals.)', grad: 'What is ∂ℓ/∂w₁ = (σ(z) − y)·x₁? (Three decimals.)' }[p.template]
  return { intro, questions: [{ id: 'a', type: 'number', label: q, answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  const zs = `z = ${p.w[0]}×${p.x[0]} + ${p.w[1]}×${p.x[1]} + ${p.b} = ${r3(p.z)}; σ(z) = 1/(1 + e^(−z)) = ${r3(p.p)}.`
  if (p.template === 'prob') return `${zs} Probability of yes: **${r3(p.answer)}**.`
  if (p.template === 'loss') return `${zs} The true label is ${p.y}, so the probability given to it is ${r3(p.y === 1 ? p.p : 1 - p.p)}; −log of that is **${r3(p.answer)}**.`
  return `${zs} (σ(z) − y)·x₁ = (${r3(p.p)} − ${p.y}) × ${p.x[0]} = **${r3(p.answer)}**.`
}

export const logistic = {
  title: 'Score, probability, loss and gradient',
  version: 1,
  templates: TEMPLATES,
  templateNames: { prob: 'Probability', loss: 'Log loss', grad: 'Gradient entry' },
  generate, view, workedSolution,
  intro: 'Seven steps: one example by hand, a numerically stable loss, the gradient, and new examples to score. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'One example by hand',
      prompt: 'x = (2, 1), w = (0.5, −1), b = 0.5, and the true label is y = 1.',
      fields: [
        { label: 'Score z = w·x + b', answer: 0.5 },
        { label: 'Probability p = σ(z), three decimals', answer: 0.622, tolerance: 0.0006 },
        { label: 'Log loss −log p, three decimals', answer: 0.474, tolerance: 0.0006 },
        { label: '∂ℓ/∂w₁ = (p − y)·x₁, three decimals', answer: -0.755, tolerance: 0.0006 },
      ],
      explain: 'z = 1 − 1 + 0.5 = 0.5; σ(0.5) ≈ 0.6225; −log 0.6225 ≈ 0.474; (0.6225 − 1) × 2 ≈ −0.755. The gradient is negative, so raising w₁ would raise p toward the true label.',
    },
    {
      id: 'agree', kind: 'probe', title: 'A loss that survives big scores',
      prompt: 'Three scores, one of them confidently wrong. The textbook formula gives an infinite loss. Run it; then **replace the loss line with the stable form from the lesson**, `np.mean(np.logaddexp(0, z) - y * z)`, and run again.',
      starter: `import numpy as np
z = np.array([-800.0, 0.0, 800.0])       # scores
y = np.array([1.0, 0.0, 1.0])            # true labels
p = 1 / (1 + np.exp(-z))                 # σ(z); NumPy will warn about overflow
loss = -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))
print("p =", p, "  loss =", loss)`,
      probe: ['z', 'y', 'loss'],
      evaluate: evaluateStable,
      done: 'log(1 + e^z) − y·z is the same function written so that no step rounds to 0 or 1 first: np.logaddexp computes log(e⁰ + eᶻ) safely.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the gradient',
      prompt: 'Replace `___` with the weights’ gradient of the mean log loss.',
      starter: `import numpy as np

def gradient(X, y, w, b):
    """[∇_w J, ∂J/∂b] for the mean log loss of logistic regression. Returns shape (features + 1,)."""
    p = 1 / (1 + np.exp(-(X @ w + b)))
    grad_w = ___
    grad_b = np.mean(p - y)
    return np.append(grad_w, grad_b)`,
      hint: 'Prediction error times input, averaged: Xᵀ(p − y)/n.',
      solution: 'grad_w = X.T @ (p - y) / len(y)',
      check: { fn: 'gradient', args: ['X', 'y', 'w', 'b'], cases: CASES.map(c => ({ ...c, expected: gradOf(c.X, c.y, c.w, c.b) })), describe, diagnose: diagnoseGrad },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For x = (2, 1), w = (0.5, −1), b = 0.5, y = 1 this returns [−1, −0.5, −0.5] instead of about [−0.755, −0.378, −0.378]. Fix it.',
      starter: `import numpy as np

def gradient(X, y, w, b):
    """[∇_w J, ∂J/∂b] for the mean log loss of logistic regression. Returns shape (features + 1,)."""
    p = X @ w + b
    return np.append(X.T @ (p - y) / len(y), np.mean(p - y))`,
      hint: 'Is p a probability?',
      solution: 'p = 1 / (1 + np.exp(-(X @ w + b)))',
      check: { fn: 'gradient', args: ['X', 'y', 'w', 'b'], cases: CASES.map(c => ({ ...c, expected: gradOf(c.X, c.y, c.w, c.b) })), describe, diagnose: diagnoseGrad },
      explainChoice: {
        prompt: 'What was the original computing?',
        options: [
          { text: 'The least-squares gradient: without σ, the “prediction” is the raw score, which can be any number, so it measured the wrong error and would train a linear regression on 0/1 labels.', correct: true },
          { text: 'The right gradient with the wrong sign.', feedback: 'The sign is right; the prediction is not a probability.' },
          { text: 'The Hessian.', feedback: 'It is still a gradient — of a different loss.' },
          { text: 'Nothing: σ is optional.', feedback: 'Without σ the model cannot output probabilities, and the loss it descends is not log loss.' },
        ],
        rightFeedback: 'The same “error times input” shape, with the probability as the prediction.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write a stable log loss',
      prompt: 'Write `log_loss` from its contract. One case has scores of ±100 with the wrong label: the naive formula returns infinity there.',
      starter: `import numpy as np

def log_loss(X, y, w, b):
    """Mean binary cross-entropy of logistic regression, computed stably for any score.

    Example: log_loss(np.array([[2., 1.]]), np.array([1.]), np.array([0.5, -1.]), 0.5)  ->  about 0.474
    """
    pass   # replace with your code`,
      hint: 'With z = X @ w + b, each example’s loss is log(1 + e^z) − y·z; np.logaddexp(0, z) computes log(1 + e^z) without overflow.',
      solution: 'z = X @ w + b\nreturn np.mean(np.logaddexp(0, z) - y * z)',
      check: { fn: 'log_loss', args: ['X', 'y', 'w', 'b'], cases: CASES.map(c => ({ ...c, expected: lossOf(c.X, c.y, c.w, c.b) })), describe, diagnose: diagnoseLoss },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New models and examples. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
