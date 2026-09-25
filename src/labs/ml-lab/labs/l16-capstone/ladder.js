import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 16 practice ladder: MAE against RMSE, honest out-of-fold predictions, and errors by segment.

const mean = a => a.reduce((s, v) => s + v, 0) / a.length
export const maeOf = (y, p) => mean(y.map((v, i) => Math.abs(v - p[i])))
export const rmseOf = (y, p) => Math.sqrt(mean(y.map((v, i) => (v - p[i]) ** 2)))
export function lineFit(x, y) {
  const mx = mean(x), my = mean(y), sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0)
  const slope = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / sxx
  return [slope, my - slope * mx]
}
export function oofOf(x, y, folds, honest = true) {
  return x.map((xi, i) => {
    const tr = x.map((_, j) => j).filter(j => !honest || folds[j] !== folds[i])
    const [a, b] = lineFit(tr.map(j => x[j]), tr.map(j => y[j]))
    return a * xi + b
  })
}
export const segmentOf = (y, p, seg, S) => Array.from({ length: S }, (_, s) => maeOf(y.filter((_, i) => seg[i] === s), p.filter((_, i) => seg[i] === s)))

const RMSE_CASES = [
  { y: [80, 90, 70], pred: [100, 90, 60] },
  { y: [1, 2, 3, 4], pred: [1, 2, 3, 8] },
  { y: [10], pred: [7] },
  { y: [5, 5, 5, 5, 5], pred: [4, 6, 4, 6, 5] },
].map(c => ({ ...c, expected: rmseOf(c.y, c.pred) }))
export const OOF_CASES = [
  { x: [1, 2, 3, 4, 5, 6], y: [2, 4, 5, 9, 10, 12], folds: [0, 1, 2, 0, 1, 2] },
  { x: [0, 1, 2, 3], y: [1, 3, 2, 10], folds: [0, 0, 1, 1] },
  { x: [2, 4, 6, 8, 10], y: [3, 3, 7, 7, 20], folds: [0, 1, 0, 1, 0] },
  { x: [1, 3, 5, 7, 9, 11], y: [1, 2, 6, 5, 9, 8], folds: [2, 1, 0, 2, 1, 0] },
].map(c => ({ ...c, expected: oofOf(c.x, c.y, c.folds) }))
export const SEG_CASES = [
  { y: [10, 20, 30, 40], pred: [12, 18, 30, 50], seg: [0, 0, 1, 1], S: 2 },
  { y: [5, 5, 5, 5, 5], pred: [3, 5, 9, 5, 35], seg: [0, 1, 0, 1, 2], S: 3 },
  { y: [1, 2, 3], pred: [2, 2, 2], seg: [1, 0, 1], S: 2 },
  { y: [100, 90, 80, 70, 60, 50], pred: [98, 95, 80, 40, 61, 50], seg: [2, 2, 0, 1, 0, 1], S: 3 },
].map(c => ({ ...c, expected: segmentOf(c.y, c.pred, c.seg, c.S) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
export function diagnoseRmse(c, got) {
  if (Math.abs(got.value - maeOf(c.y, c.pred)) < 1e-9 && Math.abs(c.expected - maeOf(c.y, c.pred)) > 1e-9) return 'That is the MAE. RMSE squares the errors before averaging, then takes the square root.'
  if (Math.abs(got.value - c.expected ** 2) < 1e-9 && c.expected !== 1 && c.expected !== 0) return 'That is the mean squared error. Take its square root to get back to seconds.'
  return null
}
export function diagnoseOof(c, got) {
  if (near(got.value, oofOf(c.x, c.y, c.folds, false))) return 'Each prediction came from a line fitted on ALL the rows, its own included. Fit on the other folds only, or the errors look smaller than they will be on new jobs.'
  return null
}
export function diagnoseSeg(c, got) {
  const rmse = Array.from({ length: c.S }, (_, s) => rmseOf(c.y.filter((_, i) => c.seg[i] === s), c.pred.filter((_, i) => c.seg[i] === s)))
  if (near(got.value, rmse) && !near(rmse, c.expected)) return 'That is RMSE per segment. The project’s metric is MAE: the mean absolute error.'
  const signed = Array.from({ length: c.S }, (_, s) => mean(c.y.map((v, i) => c.pred[i] - v).filter((_, i) => c.seg[i] === s)))
  if (near(got.value, signed) && !near(signed, c.expected)) return 'Positive and negative errors cancelled. Take absolute values before averaging.'
  return null
}
export function evaluateLeak(vars) {
  const miss = needVars(vars, ['use_failed_tests', 'cv_mae', 'baseline_mae'])
  if (miss) return { passed: false, message: miss }
  if (Number(vars.use_failed_tests.value)) return { passed: false, message: `With \`failed_tests\` the cross-validated MAE is ${r3(vars.cv_mae.value)} s, against ${r3(vars.baseline_mae.value)} s for the mean. But the count of failed tests exists only after the build has run. Set \`use_failed_tests = 0\` and run again.` }
  return { passed: true, message: `Without it: ${r3(vars.cv_mae.value)} s. That is the number the model can actually deliver when a build is queued. The leaky score was about half of it, and no deployed model could ever reproduce it.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['mae', 'rmse', 'interaction']
export function generate(template, seed) {
  const g = rng(seed * 263 + TEMPLATES.indexOf(template) * 9001 + 37)
  if (template === 'mae' || template === 'rmse') {
    const n = g.int(3, 4), y = Array.from({ length: n }, () => g.int(4, 12) * 10), err = Array.from({ length: n }, () => g.pick([-30, -20, -10, 0, 10, 20, 40]))
    const pred = y.map((v, i) => v + err[i]), mae = maeOf(y, pred), rmse = rmseOf(y, pred)
    if (mae === 0) return generate(template, seed + 1000)
    const answer = template === 'mae' ? mae : rmse, other = template === 'mae' ? rmse : mae
    const signed = Math.abs(mean(err))
    return { template, seed, y, pred, answer, misconceptions: [{ answer: other, feedback: template === 'mae' ? 'That is the RMSE. MAE averages the absolute errors.' : 'That is the MAE. RMSE squares, averages, then takes the root.' }, { answer: signed, feedback: 'Positive and negative errors cancelled. Take absolute values (or squares) first.' }, ...(template === 'rmse' ? [{ answer: rmse ** 2, feedback: 'That is the mean squared error. Take its square root.' }] : [])].filter(m => Math.abs(m.answer - answer) > 0.006) }
  }
  const size = g.int(5, 80), shared = g.int(0, 1), cache = g.int(0, 1), which = g.pick(['size × shared', 'size × (1 − cache)'])
  const answer = which === 'size × shared' ? size * shared : size * (1 - cache)
  const wrong = which === 'size × shared' ? size * (1 - shared) : size * cache
  return { template, seed, size, shared, cache, which, answer, misconceptions: [{ answer: wrong, feedback: which === 'size × shared' ? 'size × shared is the size when the runner is shared, and 0 otherwise.' : 'size × (1 − cache) is the size on a cache MISS (cache = 0), and 0 on a hit.' }, { answer: size, feedback: 'The indicator multiplies the size: check whether it is 0 or 1 here.' }].filter(m => m.answer !== answer) }
}
export function view(p) {
  if (p.template === 'interaction') return { intro: `A job of ${p.size} MB, shared runner = ${p.shared}, cache hit = ${p.cache}.`, questions: [{ id: 'f', type: 'number', label: `What is its value for the feature ${p.which}?`, answer: p.answer, misconceptions: p.misconceptions }] }
  return {
    intro: 'Predicted and actual build durations, in seconds:',
    table: { head: ['Job', 'Actual', 'Predicted'], rows: p.y.map((v, i) => [String(i + 1), String(v), String(p.pred[i])]) },
    questions: [{ id: 'e', type: 'number', label: p.template === 'mae' ? 'What is the MAE in seconds? (Two decimals.)' : 'What is the RMSE in seconds? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }],
  }
}
export function workedSolution(p) {
  if (p.template === 'interaction') return `${p.which} = ${p.size} × ${p.which === 'size × shared' ? p.shared : `(1 − ${p.cache})`} = **${p.answer}**.`
  const e = p.y.map((v, i) => p.pred[i] - v)
  if (p.template === 'mae') return `Errors ${e.join(', ')}; absolute ${e.map(Math.abs).join(', ')}; mean **${Math.round(p.answer * 100) / 100}**.`
  return `Squared errors ${e.map(v => v * v).join(', ')}; mean ${Math.round(p.answer ** 2 * 100) / 100}; square root **${Math.round(p.answer * 100) / 100}**.`
}

export const oof = {
  title: 'Honest errors for the build-time model',
  version: 1,
  templates: TEMPLATES,
  templateNames: { mae: 'MAE', rmse: 'RMSE', interaction: 'Interaction feature' },
  generate, view, workedSolution,
  intro: 'Seven steps: the two error summaries by hand, a leaky feature, and writing out-of-fold predictions and per-segment errors. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Summarize errors by hand',
      prompt: 'Predictions [100, 90, 60] seconds for actual durations [80, 90, 70]. Then a segment of five jobs with absolute errors 2, 4, 6, 8 and 30 seconds.',
      fields: [
        { label: 'MAE of the three predictions', answer: 10 },
        { label: 'RMSE of the three predictions (three decimals)', answer: Math.sqrt(500 / 3), tolerance: 0.0006 },
        { label: 'MAE of the segment', answer: 10 },
        { label: 'The segment’s MAE without the 30-second job', answer: 5 },
      ],
      explain: 'Errors 20, 0, −10: MAE = 30/3 = 10; RMSE = √((400 + 0 + 100)/3) = √166.7 ≈ 12.910 — larger, because squaring weights the 20-second miss more. The segment’s MAE is 50/5 = 10, but 20/4 = 5 without its one bad job: look at the worst cases before trusting a segment average.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Remove a feature from the future',
      prompt: 'A linear model with the lab’s interaction features, cross-validated on 400 builds. One candidate feature is the number of failed tests. Run it with `use_failed_tests = 1`, then **set `use_failed_tests = 0`** and run again. Predict first: which MAE is lower, and which one can the deployed model achieve?',
      starter: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_score, KFold
rng = np.random.default_rng(16)
n = 400
size = np.exp(np.log(40) + 0.9 * rng.normal(size=n))
cache = (rng.random(n) < 0.6).astype(float)
shared = (rng.random(n) < 0.5).astype(float)
duration = 20 + np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0) + 8 * rng.normal(size=n)
failed_tests = np.round(duration / 10 + rng.normal(0, 0.5, n))   # counted when the build finishes

use_failed_tests = 1
columns = [size, cache, shared, size * shared, size * (1 - cache)]
if use_failed_tests:
    columns.append(failed_tests)
X = np.column_stack(columns)
cv = KFold(5, shuffle=True, random_state=0)
cv_mae = -cross_val_score(LinearRegression(), X, duration, cv=cv, scoring="neg_mean_absolute_error").mean()
baseline_mae = np.mean(np.abs(duration - duration.mean()))
print(f"cross-validated MAE {cv_mae:.2f} s   (predicting the mean: {baseline_mae:.2f} s)")`,
      probe: ['use_failed_tests', 'cv_mae', 'baseline_mae'],
      evaluate: evaluateLeak,
      done: 'Cross-validation cannot catch this: every fold has the leaky column. Only asking “is this known when the prediction is made?” does.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the RMSE',
      prompt: 'Replace `___` with the root mean squared error.',
      starter: `import numpy as np

def rmse(y, pred):
    """Root mean squared error, in the units of y."""
    return ___`,
      hint: 'Square the errors, average them, take the square root.',
      solution: 'return np.sqrt(np.mean((y - pred) ** 2))',
      check: { fn: 'rmse', args: ['y', 'pred'], cases: RMSE_CASES, describe: c => `y = [${c.y.join(', ')}], pred = [${c.pred.join(', ')}]`, diagnose: diagnoseRmse },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For x = [0, 1, 2, 3], y = [1, 3, 2, 10] and folds [0, 0, 1, 1], this gives an MAE of **1.65**. Honest out-of-fold predictions have an MAE of 7.5. Fix it.',
      starter: `import numpy as np

def oof_predict(x, y, folds):
    """For each fold f, fit a straight line on the rows NOT in f and predict the rows in f."""
    pred = np.zeros(len(y))
    for f in np.unique(folds):
        test = folds == f
        slope, intercept = np.polyfit(x, y, 1)
        pred[test] = slope * x[test] + intercept
    return pred`,
      hint: 'The line for fold f must never see fold f’s rows.',
      solution: 'slope, intercept = np.polyfit(x[~test], y[~test], 1)',
      check: { fn: 'oof_predict', args: ['x', 'y', 'folds'], cases: OOF_CASES, describe: c => `x = [${c.x.join(', ')}], folds = [${c.folds.join(', ')}]`, diagnose: diagnoseOof },
      explainChoice: {
        prompt: 'Why does the per-segment error analysis in 16.4 use out-of-fold predictions rather than predictions on the training rows?',
        options: [
          { text: 'A model scored on rows it trained on looks better than it is, and most so where it memorized — so in-sample errors would hide exactly the segments where it fails.', correct: true },
          { text: 'Out-of-fold predictions are faster to compute.', feedback: 'They cost k fits instead of one.' },
          { text: 'It makes no difference for a linear model.', feedback: 'Here a straight line fitted on four rows gave an in-sample MAE of 1.65 against 7.5 out of fold.' },
          { text: 'To avoid touching the test set.', feedback: 'That is also true, but training-row predictions do not touch it either. The issue is optimism.' },
        ],
        rightFeedback: 'Every development job gets a prediction from a model that never saw it — the same guarantee the test set gives, reused for diagnosis.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write errors by segment',
      prompt: 'Write `segment_mae` from its contract. Every segment in the checks has at least one job.',
      starter: `import numpy as np

def segment_mae(y, pred, seg, S):
    """seg[i] in 0..S-1 is job i's segment. Return an array of S values: the MAE within each segment.

    Example: segment_mae(np.array([10., 20., 30., 40.]), np.array([12., 18., 30., 50.]), np.array([0, 0, 1, 1]), 2)  ->  array([2., 5.])
    """
    pass   # replace with your code`,
      hint: 'For each s in range(S), select the jobs with seg == s and average their absolute errors.',
      solution: 'err = np.abs(y - pred)\nreturn np.array([err[seg == s].mean() for s in range(S)])',
      check: { fn: 'segment_mae', args: ['y', 'pred', 'seg', 'S'], ints: ['S'], cases: SEG_CASES, describe: c => `${c.y.length} jobs, ${c.S} segments`, diagnose: diagnoseSeg },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New jobs and predictions. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
