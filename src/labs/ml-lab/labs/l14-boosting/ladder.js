import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 14 practice ladder: residuals as negative gradients, shrinkage, early stopping, and a boosting loop.

const mean = a => a.reduce((s, v) => s + v, 0) / a.length
export const signOf = v => (v > 0 ? 1 : v < 0 ? -1 : 0)
export const bestStageOf = e => e.indexOf(Math.min(...e)) + 1
export const firstBumpOf = e => { for (let i = 1; i < e.length; i++) if (e[i] > e[i - 1]) return i; return e.length }
// Boosting with stumps that all split at t: each stage fits the residual mean on each side.
export function boostOf(x, y, t, nu, T) {
  let F = x.map(() => mean(y))
  for (let s = 0; s < T; s++) {
    const r = y.map((v, i) => v - F[i]), L = r.filter((_, i) => x[i] <= t), R = r.filter((_, i) => x[i] > t)
    const mL = L.length ? mean(L) : 0, mR = R.length ? mean(R) : 0
    F = F.map((f, i) => f + nu * (x[i] <= t ? mL : mR))
  }
  return F
}

const SIGN_CASES = [
  { y: [3, 1, 2], F: [1, 2, 2] },
  { y: [0, 0, 10, -4], F: [1, -1, 2, -4] },
  { y: [5], F: [9] },
  { y: [1.5, -2, 0.25], F: [0.5, -1, 0.5] },
].map(c => ({ ...c, expected: c.y.map((v, i) => signOf(v - c.F[i])) }))
const STAGE_CASES = [
  [0.5, 0.45, 0.46, 0.40, 0.41],
  [0.9, 0.8, 0.7, 0.6],
  [0.3, 0.35, 0.2, 0.25, 0.1, 0.15],
  [1.0, 1.2, 1.1],
].map(errors => ({ errors, expected: bestStageOf(errors) }))
export const BOOST_CASES = [
  { x: [1, 2, 3, 4], y: [1, 1, 3, 3], t: 2.5, nu: 0.5, T: 2 },
  { x: [1, 2, 3, 4, 5], y: [2, 4, 3, 8, 8], t: 3.5, nu: 0.1, T: 5 },
  { x: [0, 1, 2], y: [5, -1, 2], t: 0.5, nu: 1, T: 3 },
  { x: [3, 1, 4, 1, 5, 9], y: [1, 0, 2, 0, 3, 7], t: 3.5, nu: 0.3, T: 4 },
].map(c => ({ ...c, expected: boostOf(c.x, c.y, c.t, c.nu, c.T) }))

export function diagnoseSign(c, got) {
  const raw = c.y.map((v, i) => v - c.F[i])
  if (got.value?.every((v, i) => Math.abs(v - raw[i]) < 1e-9) && raw.some(v => Math.abs(v) !== 1 && v !== 0)) return 'That is the squared-loss residual y − F. Under absolute loss the negative gradient keeps only its sign.'
  if (got.value?.every((v, i) => v === -c.expected[i]) && c.expected.some(v => v)) return 'The sign is flipped: the next tree should push F toward y, so use sign(y − F).'
  return null
}
export function diagnoseStage(c, got) {
  if (got.value === firstBumpOf(c.errors) && got.value !== c.expected) return 'That stops at the first stage where the error rises. Validation curves are bumpy: keep the lowest error seen, which may come after a bump.'
  if (got.value === c.expected - 1) return 'Stages are numbered from 1, not from 0.'
  return null
}
export function diagnoseBoost(c, got) {
  const full = boostOf(c.x, c.y, c.t, 1, c.T), near = a => a?.length === c.expected.length && a.every((v, i) => Math.abs(v - full[i]) < 1e-9)
  if (c.nu !== 1 && near(got.value)) return 'The learning rate is missing: add ν times each stump’s prediction, not the whole of it.'
  const one = boostOf(c.x, c.y, c.t, c.nu, 1)
  if (c.T > 1 && got.value?.length === one.length && got.value.every((v, i) => Math.abs(v - one[i]) < 1e-9)) return 'Only one stage ran. Recompute the residuals y − F after every update, T times.'
  return null
}
export function evaluateRate(vars) {
  const miss = needVars(vars, ['learning_rate', 'train_mse', 'val_mse', 'best_stage', 'best_val'])
  if (miss) return { passed: false, message: miss }
  const lr = Number(vars.learning_rate.value)
  if (lr > 0.2) return { passed: false, message: `At ν = ${lr} the model fits the training rows to MSE ${r3(vars.train_mse.value)}, and its validation MSE after 300 stages is ${r3(vars.val_mse.value)} — the best stage was ${vars.best_stage.value}. Set \`learning_rate = 0.05\` and run again.` }
  return { passed: true, message: `At ν = ${lr}: training MSE ${r3(vars.train_mse.value)}, validation ${r3(vars.val_mse.value)} after 300 stages, and ${r3(vars.best_val.value)} at the best stage, ${vars.best_stage.value}. Small steps take more stages but overfit far more slowly — and early stopping picks the stage for you.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['update', 'absolute', 'stage']
export function generate(template, seed) {
  const g = rng(seed * 587 + TEMPLATES.indexOf(template) * 6007 + 29)
  if (template === 'update') {
    const F = g.int(2, 20), y = g.int(2, 20), nu = g.pick([0.05, 0.1, 0.2, 0.5]), h = y - F
    if (h === 0) return generate(template, seed + 1000)
    const answer = F + nu * h
    return { template, seed, F, y, nu, answer, misconceptions: [{ answer: y, feedback: 'The whole correction would jump straight to y. Shrinkage adds only ν of it.' }, { answer: nu * h, feedback: 'That is the step. Add it to the current prediction F.' }, { answer: F - nu * h, feedback: 'The residual is y − F; add ν times it, which moves F toward y.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  if (template === 'absolute') {
    const y = g.int(-9, 9), F = g.int(-9, 9)
    if (y === F) return generate(template, seed + 1000)
    const answer = signOf(y - F)
    return { template, seed, y, F, answer, misconceptions: [{ answer: y - F, feedback: 'That is the squared-loss residual. Absolute loss keeps only its sign.' }, { answer: -answer, feedback: 'The negative gradient points from F toward y: sign(y − F).' }].filter(m => m.answer !== answer) }
  }
  for (;;) {
    const errors = Array.from({ length: 5 }, () => g.int(20, 60) / 100)
    if (new Set(errors).size < 5) continue
    const answer = bestStageOf(errors) * 100, bump = firstBumpOf(errors) * 100
    return { template, seed, errors, answer, misconceptions: bump !== answer ? [{ answer: bump, feedback: 'That is where the error first rose. Keep the lowest error seen.' }] : [] }
  }
}
export function view(p) {
  if (p.template === 'update') return { intro: `The ensemble predicts F = ${p.F} for a point with target y = ${p.y}. The next tree fits the residual exactly; the learning rate is ν = ${p.nu}.`, questions: [{ id: 'f', type: 'number', label: 'What does the ensemble predict for the point after this stage? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'absolute') return { intro: `Absolute loss |y − F|, with y = ${p.y} and current prediction F = ${p.F}.`, questions: [{ id: 'g', type: 'number', label: 'What is the negative gradient the next tree fits at this point?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: 'Validation MSE after each block of 100 stages:', table: { head: ['Stage', 'Validation MSE'], rows: p.errors.map((e, i) => [String((i + 1) * 100), e.toFixed(2)]) }, questions: [{ id: 's', type: 'number', label: 'Which stage does early stopping keep?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'update') return `Residual ${p.y} − ${p.F} = ${p.y - p.F}. New prediction ${p.F} + ${p.nu} × ${p.y - p.F} = **${r3(p.answer)}**.`
  if (p.template === 'absolute') return `−∂|y − F|/∂F = sign(y − F) = sign(${p.y - p.F}) = **${p.answer}**.`
  return `The lowest validation error, ${Math.min(...p.errors).toFixed(2)}, is at stage **${p.answer}**.`
}

export const boost = {
  title: 'Residuals, shrinkage and early stopping',
  version: 1,
  templates: TEMPLATES,
  templateNames: { update: 'One shrunken stage', absolute: 'Absolute-loss gradient', stage: 'Early-stopping stage' },
  generate, view, workedSolution,
  intro: 'Seven steps: one boosting stage by hand, the learning rate, and writing the loop. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'One stage by hand',
      prompt: 'Targets y = [3, 5, 10] at x = [1, 2, 3]. The ensemble starts at the mean. The first stump splits at x = 2.5 and predicts the mean residual on each side. Learning rate ν = 0.5.',
      fields: [
        { label: 'Starting prediction F₀', answer: 6 },
        { label: 'Residual at x = 1', answer: -3 },
        { label: 'Stump’s prediction on the left side (x ≤ 2.5)', answer: -2 },
        { label: 'New prediction at x = 1 after the stage', answer: 5 },
      ],
      explain: 'F₀ = (3 + 5 + 10)/3 = 6. Residuals y − F₀ = [−3, −1, 4]. Left of 2.5 the stump predicts the mean of −3 and −1, which is −2; right, 4. At x = 1: 6 + 0.5 × (−2) = 5 — halfway toward the stump’s correction, not all the way.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Change the learning rate',
      prompt: 'Gradient boosting with 300 depth-3 trees. Run it at `learning_rate = 1.0`, then **set `learning_rate = 0.05`** and run again. Predict first: which fits the training rows better, and which does better on validation?',
      starter: `import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
rng = np.random.default_rng(0)
X = rng.uniform(0, 6, (200, 1))
y = np.sin(X[:, 0]) + rng.normal(0, 0.4, 200)
Xtr, ytr, Xva, yva = X[:150], y[:150], X[150:], y[150:]

learning_rate = 1.0
model = GradientBoostingRegressor(learning_rate=learning_rate, n_estimators=300, max_depth=3, random_state=0).fit(Xtr, ytr)
train_mse = np.mean((model.predict(Xtr) - ytr) ** 2)
val_mse = np.mean((model.predict(Xva) - yva) ** 2)
curve = [np.mean((p - yva) ** 2) for p in model.staged_predict(Xva)]
best_stage, best_val = int(np.argmin(curve)) + 1, min(curve)
print(f"nu = {learning_rate}: train MSE {train_mse:.3f}, validation MSE {val_mse:.3f}")
print(f"best stage {best_stage}: validation MSE {best_val:.3f}")`,
      probe: ['learning_rate', 'train_mse', 'val_mse', 'best_stage', 'best_val'],
      evaluate: evaluateRate,
      done: 'The noise variance here is 0.16. Big steps overshoot within a few stages; small ones approach the floor slowly and give early stopping a wide, safe window.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the absolute-loss gradient',
      prompt: 'Replace `___` with the negative gradient of the absolute loss |y − F| with respect to F.',
      starter: `import numpy as np

def pseudo_residual(y, F):
    """What the next tree fits under absolute loss: -dL/dF for L = |y - F|."""
    return ___`,
      hint: 'The slope of |y − F| in F is ±1; its negative points from F toward y.',
      solution: 'return np.sign(y - F)',
      check: { fn: 'pseudo_residual', args: ['y', 'F'], cases: SIGN_CASES, describe: c => `y = [${c.y.join(', ')}], F = [${c.F.join(', ')}]`, diagnose: diagnoseSign },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For validation errors [0.5, 0.45, 0.46, 0.40, 0.41] this returns stage **2**, but stage 4 has the lowest error. Fix it.',
      starter: `import numpy as np

def best_stage(errors):
    """errors[i]: validation error after stage i + 1. Return the stage (counting from 1) to keep."""
    for i in range(1, len(errors)):
        if errors[i] > errors[i - 1]:
            return i
    return len(errors)`,
      hint: 'Keep the stage with the smallest error over the whole curve.',
      solution: 'return int(np.argmin(errors)) + 1',
      check: { fn: 'best_stage', args: ['errors'], cases: STAGE_CASES, describe: c => `errors = [${c.errors.join(', ')}]`, diagnose: diagnoseStage },
      explainChoice: {
        prompt: 'Real early stopping cannot see the whole curve in advance. What do libraries do instead?',
        options: [
          { text: 'Keep going until the error has not improved for a set number of stages (the patience), then return the best stage seen so far.', correct: true },
          { text: 'Stop at the first rise, as the buggy version did.', feedback: 'One noisy bump would stop training far too early.' },
          { text: 'Always train the maximum number of stages and keep the last.', feedback: 'That keeps the overfit model early stopping exists to avoid.' },
          { text: 'Pick the stage with the lowest training error.', feedback: 'Training error keeps falling; only held-out error shows overfitting.' },
        ],
        rightFeedback: 'Patience tolerates bumps; keeping the best stage seen undoes the stages after it.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write a boosting loop',
      prompt: 'Write `boost` from its contract: squared loss, and every stump splits at the same threshold t.',
      starter: `import numpy as np

def boost(x, y, t, nu, T):
    """Start from F = mean(y) at every point. Repeat T times: residuals r = y - F; the stump predicts the
    mean of r over points with x <= t on that side, and the mean over x > t on the other; F += nu * stump.
    Return F at the training points.

    Example: boost(np.array([1., 2., 3., 4.]), np.array([1., 1., 3., 3.]), 2.5, 0.5, 2)  ->  array([1.25, 1.25, 2.75, 2.75])
    """
    pass   # replace with your code`,
      hint: 'Inside the loop: left = x <= t; step = np.where(left, r[left].mean(), r[~left].mean()); F = F + nu * step.',
      solution: 'F = np.full(len(y), y.mean())\nleft = x <= t\nfor _ in range(T):\n    r = y - F\n    F = F + nu * np.where(left, r[left].mean(), r[~left].mean())\nreturn F',
      check: { fn: 'boost', args: ['x', 'y', 't', 'nu', 'T'], ints: ['T'], cases: BOOST_CASES, describe: c => `t = ${c.t}, ν = ${c.nu}, T = ${c.T}`, diagnose: diagnoseBoost },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New stages and curves. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
