import { rng, r3, nearArr, needVars } from '../../kit/ladder.js'

// Lab 07 practice ladder: shrink weights with ridge, zero them with the lasso’s soft threshold, and
// choose λ on validation data. Expected values computed by hand and with NumPy; tests recompute them.

export const ridge1dOf = (x, y, lam) => x.reduce((s, v, i) => s + v * y[i], 0) / (x.reduce((s, v) => s + v * v, 0) + x.length * lam)
export const softOf = (z, t) => Math.sign(z) * Math.max(Math.abs(z) - t, 0)
// (XᵀX/n + λI) w = Xᵀy/n, solved by Gaussian elimination (independent of the learner's NumPy code).
export function ridgeOf(X, y, lam) {
  const n = X.length, p = X[0].length
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) / n + (i === j ? lam : 0)))
  const b = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0) / n)
  for (let c = 0; c < p; c++) {
    let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    ;[A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]]
    for (let r = c + 1; r < p; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < p; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c] }
  }
  const w = Array(p).fill(0)
  for (let r = p - 1; r >= 0; r--) w[r] = (b[r] - A[r].slice(r + 1).reduce((s, v, k) => s + v * w[r + 1 + k], 0)) / A[r][r]
  return w
}

const R1_CASES = [{ x: [1, 2, 3], y: [2, 3, 7], lam: 1 }, { x: [1, 2, 3], y: [2, 3, 7], lam: 0 }, { x: [-1, 1, 2], y: [1, -2, 5], lam: 0.5 }, { x: [2, 4], y: [1, 3], lam: 10 }].map(c => ({ ...c, expected: ridge1dOf(c.x, c.y, c.lam) }))
const SOFT_CASES = [{ z: [3, 0.4, -2.5, 1, -0.2], t: 1 }, { z: [0.5, -0.5, 2], t: 0.5 }, { z: [10, -10], t: 3 }].map(c => ({ ...c, expected: c.z.map(v => softOf(v, c.t)) }))
const RIDGE_CASES = [
  { X: [[1, 2], [2, 1], [3, 4], [4, 3]], y: [5, 4, 11, 10], lam: 0.1 },
  { X: [[1, 1], [1, 1.01], [2, 2]], y: [2, 2.01, 4], lam: 0.5 },          // nearly collinear columns
  { X: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]], y: [1, 2, 3, 6], lam: 1 },
].map(c => ({ ...c, expected: ridgeOf(c.X, c.y, c.lam) }))

export function diagnoseRidge1d(c, got) {
  const v = got.value, sxy = c.x.reduce((s, x, i) => s + x * c.y[i], 0), sxx = c.x.reduce((s, x) => s + x * x, 0)
  if (c.lam > 0 && Math.abs(v - sxy / sxx) < 1e-9) return 'That is least squares: λ never entered. The penalty adds nλ to the denominator.'
  if (c.lam > 0 && Math.abs(v - sxy / (sxx + c.lam)) < 1e-9) return 'The penalty term is nλ, not λ: the loss averages over n rows, so the penalty is scaled by n in this form.'
  return null
}
export function diagnoseSoft(c, got) {
  const v = got.value, noMax = c.z.map(z => Math.sign(z) * (Math.abs(z) - c.t))
  if (nearArr(v, noMax) && !nearArr(noMax, c.expected)) return 'Small inputs changed sign instead of becoming 0: the shrunken size |z| − t must be clipped at 0.'
  if (nearArr(v, c.z.map(z => z - c.t))) return 'Every value moved down by t, including negative ones. Shrink toward zero: subtract t from the size, keep the sign.'
  return null
}
export function diagnoseRidge(c, got) {
  const v = got.value
  if (!v || v.length !== c.X[0].length) return 'Return one weight per column of X.'
  const noN = ridgeOf(c.X.map(r => r.map(x => x * Math.sqrt(c.X.length))), c.y.map(y => y * Math.sqrt(c.X.length)), c.lam)   // XᵀX + λI form
  if (nearArr(v, noN, 1e-5)) return 'That solves (XᵀX + λI)w = Xᵀy. The lesson averages over rows: (XᵀX/n + λI)w = Xᵀy/n.'
  if (nearArr(v, ridgeOf(c.X, c.y, 0), 1e-5)) return 'That is least squares: add λ to the diagonal.'
  return null
}
export function evaluateChoice(vars) {
  const miss = needVars(vars, ['lambdas', 'train_mse', 'val_mse', 'chosen'])
  if (miss) return { passed: false, message: miss }
  const L = vars.lambdas.value, tr = vars.train_mse.value, va = vars.val_mse.value, ch = Number(vars.chosen.value)
  const byTrain = L[tr.indexOf(Math.min(...tr))], byVal = L[va.indexOf(Math.min(...va))]
  if (Math.abs(ch - byTrain) < 1e-15 && byTrain !== byVal) return { passed: false, message: `λ = ${ch} has the lowest TRAINING error — of course: less penalty always fits the training rows better. Its validation MSE is ${r3(va[L.indexOf(byTrain)])}. Change the choice to use \`val_mse\`, and run again.` }
  if (Math.abs(ch - byVal) > 1e-15) return { passed: false, message: `\`chosen\` should be the λ with the smallest validation MSE, ${byVal}.` }
  return { passed: true, message: `λ = ${ch}: validation MSE ${r3(Math.min(...va))}, against ${r3(va[L.indexOf(byTrain)])} for the λ training error would pick. The penalty is a hyperparameter, so it is chosen on data the fit did not see.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['ridge', 'soft', 'which']
const SCENARIOS = [
  { text: 'Hundreds of log counters each nudge latency a little; you want stable predictions.', answer: 'ridge' },
  { text: 'You expect only a handful of 200 candidate features to matter and need a compact, explainable model.', answer: 'lasso' },
  { text: 'Groups of strongly correlated sensors, and you want to drop useless groups while keeping stable weights within a group.', answer: 'enet' },
]
const PEN = { ridge: 'Ridge (L2): shrink every weight', lasso: 'Lasso (L1): set many weights exactly to zero', enet: 'Elastic net: both penalties together' }
export function generate(template, seed) {
  const g = rng(seed * 1453 + TEMPLATES.indexOf(template) * 10007 + 11)
  if (template === 'ridge') {
    for (let a = 0; a < 100; a++) {
      const x = [g.int(1, 4), g.int(1, 4), g.int(-2, 4)], y = x.map(v => 2 * v + g.int(-2, 2)), lam = g.pick([0.5, 1, 2, 5])
      const sxx = x.reduce((s, v) => s + v * v, 0), sxy = x.reduce((s, v, i) => s + v * y[i], 0)
      if (sxy === 0) continue
      const answer = sxy / (sxx + 3 * lam)
      return { template, seed, x, y, lam, answer, misconceptions: [{ answer: sxy / sxx, feedback: 'That is least squares: the penalty adds nλ to the denominator.' }, { answer: sxy / (sxx + lam), feedback: 'Add nλ, not λ: the loss is a mean over n rows.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
    }
  }
  if (template === 'soft') {
    const t = g.pick([0.5, 1, 2]), z = g.pick([-1, 1]) * g.pick([0.2, 0.4, 1.5, 2.5, 3, 4.5])
    const answer = softOf(z, t) + 0
    return { template, seed, z, t, answer, misconceptions: [{ answer: Math.sign(z) * (Math.abs(z) - t), feedback: 'Clip at zero: when |z| < t the weight becomes exactly 0.' }, { answer: z - t, feedback: 'Shrink the size toward zero and keep the sign: sign(z)·max(|z| − t, 0).' }].filter(m => Math.abs(m.answer - answer) > 1e-9) }
  }
  const sc = g.pick(SCENARIOS)
  return { template, seed, scenario: sc, answer: sc.answer, options: g.shuffle(Object.keys(PEN)) }
}
export function view(p) {
  if (p.template === 'ridge') return { intro: `One feature, no intercept: x = [${p.x.join(', ')}], y = [${p.y.join(', ')}] (n = 3). Ridge minimizes mean((y − wx)²) + λw² with λ = ${p.lam}.`, questions: [{ id: 'w', type: 'number', label: 'What is the ridge weight w = Σxy / (Σx² + nλ)? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'soft') return { intro: `Coordinate descent for the lasso computed a least-squares value z = ${p.z} for one weight; the threshold is t = ${p.t}.`, questions: [{ id: 's', type: 'number', label: 'What is the new weight S(z, t) = sign(z)·max(|z| − t, 0)?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: p.scenario.text, questions: [{ id: 'pen', type: 'choice', legend: 'Which penalty fits best?', options: p.options.map(k => ({ value: k, label: PEN[k] })), answer: p.answer, wrong: 'Not the best fit. Ridge spreads weight and keeps everything; the lasso zeroes weights but picks arbitrarily among correlated features; elastic net zeroes while staying stable across correlated ones.' }] }
}
export function workedSolution(p) {
  if (p.template === 'ridge') { const sxy = p.x.reduce((s, v, i) => s + v * p.y[i], 0), sxx = p.x.reduce((s, v) => s + v * v, 0); return `Σxy = ${sxy}, Σx² = ${sxx}, nλ = 3 × ${p.lam} = ${3 * p.lam}; w = ${sxy}/(${sxx} + ${3 * p.lam}) = **${r3(p.answer)}** (least squares would give ${r3(sxy / sxx)}).` }
  if (p.template === 'soft') return `|z| = ${Math.abs(p.z)}; |z| − t = ${r3(Math.abs(p.z) - p.t)}; clipped at 0 and given z’s sign: **${r3(p.answer)}**.`
  return `**${PEN[p.answer]}.**`
}

export const shrink = {
  title: 'Shrink, zero, and choose λ',
  version: 1,
  templates: TEMPLATES,
  templateNames: { ridge: 'Ridge weight', soft: 'Soft threshold', which: 'Choose the penalty' },
  generate, view, workedSolution,
  intro: 'Seven steps: ridge and the soft threshold by hand, choosing λ honestly, and writing the ridge solve. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Shrink by hand',
      prompt: 'One feature, no intercept: x = [1, 2, 3], y = [2, 3, 7].',
      fields: [
        { label: 'Σxy', answer: 29 },
        { label: 'Σx²', answer: 14 },
        { label: 'Ridge weight with λ = 1: Σxy/(Σx² + nλ), three decimals', answer: 1.706, tolerance: 0.0006 },
        { label: 'Soft threshold S(−2.5, 1)', answer: -1.5 },
      ],
      explain: 'Least squares gives 29/14 ≈ 2.071; with λ = 1 the denominator grows by nλ = 3, giving 29/17 ≈ 1.706 — shrunk toward 0. S(−2.5, 1) keeps the sign and reduces the size by 1: −1.5; S(0.4, 1) would be exactly 0.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Choose λ on validation data',
      prompt: 'A degree-9 polynomial with ridge, for six values of λ. This picks the λ with the lowest **training** error. Run it, then **change the choice to use `val_mse`** and run again. Predict first: which λ will training error pick, whatever the data?',
      starter: `import numpy as np
rng = np.random.default_rng(3)
f = lambda x: np.sin(np.pi * x) + 0.4 * x
x_tr = rng.uniform(-1, 1, 20); y_tr = f(x_tr) + 0.25 * rng.normal(size=20)
x_va = rng.uniform(-1, 1, 200); y_va = f(x_va) + 0.25 * rng.normal(size=200)
P = lambda x: np.column_stack([x ** k for k in range(1, 10)])
mu, sd = P(x_tr).mean(0), P(x_tr).std(0)                  # standardize with training statistics
Z = lambda x: (P(x) - mu) / sd

lambdas = np.array([1e-6, 1e-4, 1e-3, 1e-2, 1e-1, 1.0])
train_mse, val_mse = [], []
for lam in lambdas:
    w = np.linalg.solve(Z(x_tr).T @ Z(x_tr) / 20 + lam * np.eye(9), Z(x_tr).T @ (y_tr - y_tr.mean()) / 20)
    train_mse.append(np.mean((Z(x_tr) @ w + y_tr.mean() - y_tr) ** 2))
    val_mse.append(np.mean((Z(x_va) @ w + y_tr.mean() - y_va) ** 2))
train_mse, val_mse = np.array(train_mse), np.array(val_mse)
chosen = lambdas[np.argmin(train_mse)]
print("training MSE  ", np.round(train_mse, 3))
print("validation MSE", np.round(val_mse, 3))
print("chosen λ:", chosen)`,
      probe: ['lambdas', 'train_mse', 'val_mse', 'chosen'],
      evaluate: evaluateChoice,
      done: 'Training error always prefers the smallest penalty; only data the fit did not see can tell you how much to regularize.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the ridge weight',
      prompt: 'Replace `___` with the one-feature ridge estimate.',
      starter: `import numpy as np

def ridge_1d(x, y, lam):
    """argmin over w of mean((y − w·x)²) + lam·w² (one feature, no intercept)."""
    return ___`,
      hint: 'Least squares is Σxy/Σx². The penalty adds n·λ to the denominator.',
      solution: 'return np.sum(x * y) / (np.sum(x * x) + len(x) * lam)',
      check: { fn: 'ridge_1d', args: ['x', 'y', 'lam'], cases: R1_CASES, describe: c => `x = [${c.x.join(', ')}], y = [${c.y.join(', ')}], λ = ${c.lam}`, diagnose: diagnoseRidge1d },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For z = [3, 0.4, −2.5, 1, −0.2] and t = 1 this returns [2, **−0.6**, −1.5, 0, **0.8**] instead of [2, 0, −1.5, 0, 0]. Fix it.',
      starter: `import numpy as np

def soft_threshold(z, t):
    """Lasso’s soft threshold: shrink each value toward 0 by t; values within t of 0 become exactly 0."""
    return np.sign(z) * (np.abs(z) - t)`,
      hint: 'What should happen when |z| − t is negative?',
      solution: 'return np.sign(z) * np.maximum(np.abs(z) - t, 0)',
      check: { fn: 'soft_threshold', args: ['z', 't'], cases: SOFT_CASES, describe: c => `z = [${c.z.join(', ')}], t = ${c.t}`, diagnose: diagnoseSoft },
      explainChoice: {
        prompt: 'Why were 0.4 and −0.2 wrong?',
        options: [
          { text: 'Their size was below the threshold, so |z| − t was negative and flipped their sign; clipping it at 0 is exactly what sets small weights to zero and makes the lasso select features.', correct: true },
          { text: 'np.sign is wrong for small numbers.', feedback: 'np.sign is right; the size term went negative.' },
          { text: 't should be squared.', feedback: 'The threshold is t itself; squaring belongs to ridge’s penalty.' },
          { text: 'Rounding error.', feedback: '−0.6 where 0 was expected is not a rounding error.' },
        ],
        rightFeedback: 'That clip at zero is the whole difference between shrinking and selecting.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the ridge solve',
      prompt: 'Write `ridge` from its contract. One case has two nearly identical columns: ridge still solves it.',
      starter: `import numpy as np

def ridge(X, y, lam):
    """Weights minimizing mean((y − X w)²) + lam·‖w‖² (no intercept): solve (XᵀX/n + lam·I) w = Xᵀy/n.

    Example: ridge(np.eye(3)[[0, 1, 2]] * 1.0, np.array([1., 2., 3.]), 0.0)  ->  array([1., 2., 3.])
    """
    pass   # replace with your code`,
      hint: 'np.linalg.solve(A, b) with A = X.T @ X / n + lam * np.eye(p) and b = X.T @ y / n.',
      solution: 'n, p = X.shape\nreturn np.linalg.solve(X.T @ X / n + lam * np.eye(p), X.T @ y / n)',
      check: { fn: 'ridge', args: ['X', 'y', 'lam'], cases: RIDGE_CASES, describe: c => `X shape (${c.X.length}, ${c.X[0].length}), λ = ${c.lam}`, diagnose: diagnoseRidge, tolerance: 1e-6 },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New data and situations. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
