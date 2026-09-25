import { rng, nearArr, r3, scaledMistake, needVars } from '../../kit/ladder.js'

// Lab 01 practice ladder: one-feature prediction and one gradient-descent update, ending with a full
// training loop. Every expected value was computed by hand and recomputed with NumPy; ladder tests
// recompute them with explicit loops (gradsOf below is written independently of the learner code).

export const gradsOf = (x, y, w, b) => {
  const e = x.map((xi, i) => w * xi + b - y[i]), n = x.length
  return [2 * e.reduce((s, ei, i) => s + ei * x[i], 0) / n, 2 * e.reduce((s, ei) => s + ei, 0) / n]
}
export const stepOf = (x, y, w, b, a) => { const [dw, db] = gradsOf(x, y, w, b); return [w - a * dw, b - a * db] }
export const fitOf = (x, y, a, steps = 100) => { let w = 0, b = 0; for (let t = 0; t < steps; t++) [w, b] = stepOf(x, y, w, b, a); return [w, b] }

const CASES = [
  { x: [1, 3], y: [4, 8], w: 1, b: 0, alpha: 0.05, grad: [-18, -8], step: [1.9, 0.4] },
  { x: [2], y: [5], w: 1, b: 0, alpha: 0.1, grad: [-12, -6], step: [2.2, 0.6] },                    // the lesson's example
  { x: [0, 1, 2, 3], y: [1, 3, 5, 7], w: 2, b: 1, alpha: 0.05, grad: [0, 0], step: [2, 1] },         // an exact fit: no change
  { x: [-1, 0.5, 4], y: [2, 0, 3], w: 0.5, b: -1, alpha: 0.02, grad: [-3.25, -25 / 6], step: [0.565, -11 / 12] },
]
const FIT_CASES = [
  { x: [1, 3], y: [4, 8], alpha: 0.05, expected: [2.0733882442, 1.8228251054] },
  { x: [0, 1, 2, 3], y: [1, 3, 5, 7], alpha: 0.05, expected: [2.0011862115, 0.997467389] },
  { x: [1, 2, 3, 4], y: [2.5, 4.1, 5.9, 7.4], alpha: 0.02, expected: [1.6982903632, 0.7080204434] },
]
const describe = c => `x = [${c.x.join(', ')}], y = [${c.y.join(', ')}], w = ${c.w}, b = ${c.b}`

export function diagnoseGrads(c, got) {
  if ((got.shape ?? []).join() !== '2') return 'Return two numbers, [∂J/∂w, ∂J/∂b], as np.array([dw, db]).'
  const v = got.value, n = c.x.length
  const factors = [[-1, 'Right size, wrong sign: the error is prediction minus target, e = ŷ − y.'], [0.5, 'Half the right size: the 2 from differentiating e² is missing.'], [n, `${n} times too large: the sum was not divided by n (take the mean).`], [n / 2, `${n}/2 times too large: the sum Σ was used where the lesson has (2/n)Σ.`]]
  // Only ∂J/∂w wrong (the usual case when one line is edited): diagnose that entry on its own.
  if (Math.abs(v[1] - c.grad[1]) < 1e-6) {
    const one = scaledMistake([c.grad[0]], [v[0]], factors)
    if (one) return `∂J/∂w: ${one}`
    if (Math.abs(v[0] - c.grad[1]) < 1e-6) return '∂J/∂w equals ∂J/∂b: each error must be multiplied by its x before averaging.'
    return null
  }
  return scaledMistake(c.grad, v, factors)
}
export function diagnoseStep(c, got) {
  if ((got.shape ?? []).join() !== '2') return 'Return the new [w, b] as np.array([w_new, b_new]).'
  const v = got.value, [dw] = gradsOf(c.x, c.y, c.w, c.b), w1 = c.w - c.alpha * dw
  const seq = [w1, c.b - c.alpha * gradsOf(c.x, c.y, w1, c.b)[1]]
  if (!nearArr(seq, c.step) && nearArr(v, seq)) return 'w is right, b is not: b’s gradient was computed after w had already changed. Compute both gradients from the old w and b, then update both.'
  if (nearArr(v, [c.w + c.alpha * c.grad[0], c.b + c.alpha * c.grad[1]])) return 'The parameters moved uphill: a descent step subtracts α times the gradient.'
  if (nearArr(v, [c.w - c.grad[0], c.b - c.grad[1]])) return 'The step used the whole gradient: multiply it by α first.'
  return null
}
export function diagnoseFit(c, got) {
  if ((got.shape ?? []).join() !== '2') return 'Return the final [w, b] as np.array([w, b]).'
  for (const k of [99, 101, 1]) if (nearArr(got.value, fitOf(c.x, c.y, c.alpha, k))) return `That is the result after ${k} step${k === 1 ? '' : 's'}; the contract asks for exactly 100.`
  return null
}

export function evaluateOvershoot(vars) {
  const miss = needVars(vars, ['x', 'y', 'alpha', 'J_before', 'J_after'])
  if (miss) return { passed: false, message: miss }
  const x = vars.x.value, y = vars.y.value, a = Number(vars.alpha.value)
  const [w, b] = stepOf(x, y, 1, 0, a), J = (w_, b_) => x.reduce((s, xi, i) => s + (w_ * xi + b_ - y[i]) ** 2, 0) / x.length
  if (Math.abs(vars.J_before.value - J(1, 0)) > 1e-9 || Math.abs(vars.J_after.value - J(w, b)) > 1e-9) return { passed: false, message: `For α = ${a} the loss should go from ${r3(J(1, 0))} to ${r3(J(w, b))}. Did an edit change the update?` }
  if (Math.abs(a - 0.5) > 1e-12) return { passed: false, message: a === 0.05 ? `At α = 0.05 the loss falls from ${r3(J(1, 0))} to ${r3(J(w, b))}. Now set \`alpha = 0.5\` and run again.` : 'The step asks for α = 0.5; set that and run again.' }
  return { passed: true, message: `At α = 0.5 the loss jumps from ${r3(J(1, 0))} to ${r3(J(w, b))}: the step overshot the minimum so far that the fit got worse. The gradient only describes the loss near the current point.` }
}

// ---- Fresh problems -------------------------------------------------------------------------------
const CONTEXTS = [
  { noun: 'file', x: 'size (MB)', y: 'processing time (s)', wUnit: 's per MB', bUnit: 's', w: [0.5, 1, 1.5, 2, 2.5], b: [1, 2, 3, 4], xs: [1, 9] },
  { noun: 'order', x: 'items', y: 'packing time (min)', wUnit: 'min per item', bUnit: 'min', w: [1, 2, 3], b: [2, 3, 5], xs: [1, 8] },
  { noun: 'page', x: 'images', y: 'load time (s)', wUnit: 's per image', bUnit: 's', w: [0.5, 1, 1.5], b: [1, 2], xs: [0, 10] },
]
export const TEMPLATES = ['predict', 'gradient', 'update']
export function generate(template, seed) {
  const g = rng(seed * 4099 + TEMPLATES.indexOf(template) * 70001 + 3)
  for (let attempt = 0; attempt < 200; attempt++) {
    const ctx = g.pick(CONTEXTS), w = g.pick(ctx.w), b = g.pick(ctx.b), base = { template, seed, ctx, w, b }
    if (template === 'predict') {
      const x = g.int(...ctx.xs), answer = w * x + b
      const mis = [{ answer: w * x, feedback: `That leaves out b = ${b} ${ctx.bUnit}: the prediction at x = 0 is b, not 0.` }, { answer: b * x + w, feedback: 'The weights are swapped: w multiplies x, and b is added.' }]
      return { ...base, x, answer, misconceptions: mis.filter(m => Math.abs(m.answer - answer) > 1e-9) }
    }
    const x = [g.int(...ctx.xs), g.int(...ctx.xs)]
    if (x[0] === x[1]) continue
    const y = x.map(xi => w * xi + b + g.int(-3, 3))
    const grad = gradsOf(x, y, w, b)
    if (grad.some(v => v === 0)) continue
    if (template === 'gradient') {
      const answer = grad[0], mis = [
        { answer: grad[0] / 2, feedback: 'Half the size: the 2 from differentiating e² is missing.' },
        { answer: -grad[0], feedback: 'Right size, wrong sign: the error is ŷ − y, prediction minus target.' },
        { answer: grad[1], feedback: 'That is ∂J/∂b. For ∂J/∂w each error is multiplied by its x.' },
        { answer: grad[0] * 2, feedback: 'That is the sum; average it over the 2 observations.' },
      ]
      return { ...base, x, y, grad, answer, misconceptions: mis.filter((m, i, arr) => Math.abs(m.answer - answer) > 1e-9 && arr.findIndex(o => Math.abs(o.answer - m.answer) < 1e-9) === i) }
    }
    const alpha = g.pick([0.01, 0.02, 0.05, 0.1]), answer = b - alpha * grad[1]
    const mis = [{ answer: b + alpha * grad[1], feedback: 'That moves uphill: subtract α times the gradient.' }, { answer: b - grad[1], feedback: 'That uses the whole gradient: multiply it by α first.' }, { answer: w - alpha * grad[0], feedback: 'That is the new w. The question asks for b.' }]
    return { ...base, x, y, grad, alpha, answer, misconceptions: mis.filter((m, i, arr) => Math.abs(m.answer - answer) > 1e-9 && arr.findIndex(o => Math.abs(o.answer - m.answer) < 1e-9) === i) }
  }
  throw new Error(`No valid ${template} problem for seed ${seed}`)
}
export function view(p) {
  const { ctx, w, b } = p, model = `A model predicts ${ctx.y} from ${ctx.x}: **ŷ = w·x + b**, with w = ${w} ${ctx.wUnit} and b = ${b} ${ctx.bUnit}.`
  if (p.template === 'predict') return { intro: model, questions: [{ id: 'y', type: 'number', label: `Predict ŷ for a ${ctx.noun} with x = **${p.x}** (${ctx.x}).`, answer: p.answer, misconceptions: p.misconceptions }] }
  const table = { caption: 'Two observations', head: [ctx.noun, `x: ${ctx.x}`, `y: ${ctx.y}`], rows: p.x.map((xi, i) => [String.fromCharCode(65 + i), xi, p.y[i]]) }
  const loss = ' The loss is J = (1/n)Σ(ŷᵢ − yᵢ)².'
  if (p.template === 'gradient') return { intro: model + loss, table, questions: [{ id: 'dw', type: 'number', label: 'What is **∂J/∂w** = (2/n)·Σ eᵢxᵢ, with eᵢ = ŷᵢ − yᵢ?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `${model}${loss} At these values ∂J/∂w = ${r3(p.grad[0])} and ∂J/∂b = ${r3(p.grad[1])}.`, table, questions: [{ id: 'b', type: 'number', label: `After one gradient-descent step with α = ${p.alpha}, what is the new **b**?`, answer: p.answer, tolerance: 1e-6, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  const { w, b } = p
  if (p.template === 'predict') return `ŷ = w·x + b = ${w} × ${p.x} + ${b} = **${r3(p.answer)}**.`
  const e = p.x.map((xi, i) => w * xi + b - p.y[i])
  const errs = `Predictions ${p.x.map(xi => r3(w * xi + b)).join(' and ')}; errors e = ŷ − y: ${e.map(r3).join(' and ')}.`
  if (p.template === 'gradient') return `${errs} Σe·x = ${e.map((ei, i) => `${r3(ei)}×${p.x[i]}`).join(' + ')} = ${r3(e.reduce((s, ei, i) => s + ei * p.x[i], 0))}; times 2/2: **${r3(p.grad[0])}**.`
  return `b ← b − α·∂J/∂b = ${b} − ${p.alpha} × (${r3(p.grad[1])}) = **${r3(p.answer)}**.`
}

export const update = {
  title: 'One prediction, one gradient step',
  version: 1,
  templates: TEMPLATES,
  templateNames: { predict: 'Predict', gradient: 'Compute ∂J/∂w', update: 'Update b' },
  generate, view, workedSolution,
  intro: 'Seven steps, from one prediction and one gradient step by hand to writing the whole training loop and solving problems you have not seen. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Trace one step by hand',
      prompt: 'Two observations: x = [1, 3], y = [4, 8]. Start at w = 1, b = 0 and use α = 0.05. Work out each quantity in order.',
      fields: [
        { label: 'Prediction ŷ for x = 3', answer: 3 },
        { label: 'Its error e = ŷ − y', answer: -5 },
        { label: '∂J/∂w = (2/2)·(e₁·1 + e₂·3)', answer: -18 },
        { label: '∂J/∂b = (2/2)·(e₁ + e₂)', answer: -8 },
        { label: 'New w = w − α·∂J/∂w', answer: 1.9 },
      ],
      explain: 'ŷ = [1, 3]; e = [−3, −5]; ∂J/∂w = −3 − 15 = −18; ∂J/∂b = −8; w = 1 + 0.05 × 18 = 1.9 and b = 0 + 0.05 × 8 = 0.4. Both gradients are negative, so both parameters grow.',
    },
    {
      id: 'agree', kind: 'probe', title: 'A step that is too big',
      prompt: 'This takes the step from the trace and prints the loss before and after. Run it: the loss falls. Then **change `alpha = 0.05` to `alpha = 0.5`** and run again. Before you do, predict whether a ten-times-bigger step lowers the loss ten times as much.',
      starter: `import numpy as np
x = np.array([1., 3.])
y = np.array([4., 8.])
w, b = 1.0, 0.0
alpha = 0.05

def J(w, b):
    return np.mean((w * x + b - y) ** 2)

e = w * x + b - y
dw, db = 2 * np.mean(e * x), 2 * np.mean(e)      # both gradients from the OLD w and b
J_before = J(w, b)
w_new, b_new = w - alpha * dw, b - alpha * db
J_after = J(w_new, b_new)
print(f"gradient [{dw}, {db}]   new w, b = {w_new:.3f}, {b_new:.3f}")
print(f"loss {J_before:.2f} → {J_after:.2f}")`,
      probe: ['x', 'y', 'alpha', 'J_before', 'J_after'],
      evaluate: evaluateOvershoot,
      done: 'The gradient says which way is downhill right here; it says nothing about how far the valley goes. That is why α is chosen small and checked, and why Lesson 01.6 watches the loss every step.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in ∂J/∂w',
      prompt: 'The bias derivative is written; replace `___` with ∂J/∂w. Any correct expression is accepted.',
      starter: `import numpy as np

def gradients(x, y, w, b):
    """[∂J/∂w, ∂J/∂b] for J = mean((w·x + b − y)²). x, y: arrays of the same length."""
    e = w * x + b - y
    dw = ___
    db = 2 * np.mean(e)
    return np.array([dw, db])`,
      hint: 'Compare with db: the weight’s derivative multiplies each error by its x before averaging.',
      solution: 'dw = 2 * np.mean(e * x)',
      check: { fn: 'gradients', args: ['x', 'y', 'w', 'b'], cases: CASES.map(c => ({ ...c, expected: c.grad })), describe, diagnose: diagnoseGrads },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'This step function runs, but for x = [1, 3], y = [4, 8], w = 1, b = 0, α = 0.05 it returns b = 0.22 instead of **0.4**. Find the bug and fix it with as small a change as you can.',
      starter: `import numpy as np

def step(x, y, w, b, alpha):
    """One gradient-descent step on J = mean((w·x + b − y)²). Returns np.array([w_new, b_new])."""
    w = w - alpha * 2 * np.mean((w * x + b - y) * x)
    b = b - alpha * 2 * np.mean(w * x + b - y)
    return np.array([w, b])`,
      hint: 'w is right and b is not. Which value of w does the second line use?',
      solution: 'e = w * x + b - y\ndw, db = 2 * np.mean(e * x), 2 * np.mean(e)      # both from the old w and b\nreturn np.array([w - alpha * dw, b - alpha * db])',
      check: { fn: 'step', args: ['x', 'y', 'w', 'b', 'alpha'], cases: CASES.map(c => ({ ...c, expected: c.step })), describe: c => `${describe(c)}, α = ${c.alpha}`, diagnose: diagnoseStep },
      explainChoice: {
        prompt: 'Why was b wrong?',
        options: [
          { text: 'The second line used the new w, so b’s gradient was computed at a point the algorithm never stood on.', correct: true },
          { text: 'b’s gradient needs a factor of x.', feedback: 'That is w’s gradient. ∂e/∂b = 1, so b’s gradient is 2·mean(e).' },
          { text: 'α was too large.', feedback: 'With α = 0.05 the correct step gives b = 0.4; the size of α is not what changed b.' },
          { text: 'Rounding error.', feedback: '0.22 against 0.4 is far too large a difference for rounding.' },
        ],
        rightFeedback: 'Compute both gradients first, from the same point, then update both.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the training loop',
      prompt: 'Write `fit` from its contract. The checks use tables you have not seen.',
      starter: `import numpy as np

def fit(x, y, alpha):
    """Start at w = 0, b = 0 and take exactly 100 gradient-descent steps on J = mean((w·x + b − y)²)
    with learning rate alpha, updating w and b together. Return np.array([w, b]).

    Example:
        fit(np.array([1., 3.]), np.array([4., 8.]), 0.05)   ->  about array([2.0734, 1.8228])
    """
    pass   # replace with your code`,
      hint: 'A for-loop of 100 iterations; in each, compute both gradients from the current w and b, then update both.',
      solution: 'w, b = 0.0, 0.0\nfor _ in range(100):\n    e = w * x + b - y\n    w, b = w - alpha * 2 * np.mean(e * x), b - alpha * 2 * np.mean(e)\nreturn np.array([w, b])',
      check: { fn: 'fit', args: ['x', 'y', 'alpha'], cases: FIT_CASES, describe: c => `x = [${c.x.join(', ')}], α = ${c.alpha}`, diagnose: diagnoseFit },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New situations with their own units. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
