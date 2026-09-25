import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 13 practice ladder: why averaging helps, the out-of-bag mask, and out-of-bag predictions.

export const avgVarOf = (s2, rho, T) => rho * s2 + (1 - rho) * s2 / T
export const leftOutOf = n => (1 - 1 / n) ** n
export const outOfBagOf = (idx, n) => Array.from({ length: n }, (_, i) => !idx.includes(i))
export function oobPredictOf(preds, inbag) {
  return preds[0].map((_, i) => {
    const out = preds.map((row, t) => [row[i], inbag[t][i]]).filter(([, b]) => !b).map(([v]) => v)
    return out.reduce((a, b) => a + b, 0) / out.length
  })
}

const MASK_CASES = [
  { idx: [0, 0, 2, 3, 3], n: 5 },
  { idx: [1, 1, 1], n: 3 },
  { idx: [4, 2, 0, 1, 3], n: 5 },
  { idx: [5, 0, 5, 2, 0, 5], n: 6 },
].map(c => ({ ...c, expected: outOfBagOf(c.idx, c.n).map(Number) }))
const VAR_CASES = [[2, 0.5, 4], [4, 0.25, 10], [1, 0, 50], [3, 1, 20]].map(([sigma2, rho, T]) => ({ sigma2, rho, T, expected: avgVarOf(sigma2, rho, T) }))
export const OOB_CASES = [
  { preds: [[1, 2, 3], [3, 4, 5], [5, 6, 7]], inbag: [[1, 0, 0], [0, 1, 1], [0, 0, 1]] },
  { preds: [[10, 0], [0, 10], [4, 4], [2, 6]], inbag: [[1, 0], [0, 1], [1, 1], [0, 0]] },
  { preds: [[1, 1, 1, 1], [2, 2, 2, 2]], inbag: [[0, 1, 1, 0], [1, 0, 0, 0]] },
  { preds: [[0.5, 1.5, -1], [2.5, 0.5, 3], [1, 1, 1], [4, -2, 0]], inbag: [[1, 1, 0], [0, 1, 1], [1, 0, 1], [0, 0, 0]] },
].map(c => ({ ...c, expected: oobPredictOf(c.preds, c.inbag) }))

export function diagnoseMask(c, got) {
  const inb = outOfBagOf(c.idx, c.n).map(b => Number(!b))
  if (got.value?.length === c.n && got.value.every((v, i) => Number(v) === inb[i])) return 'That marks the rows that WERE drawn. Out of bag means never drawn: negate it.'
  return null
}
export function diagnoseVar(c, got) {
  if (Math.abs(got.value - c.sigma2 / c.T) < 1e-9 && c.sigma2 / c.T !== c.expected) return 'σ²/T is the variance for independent trees. Trees trained on the same data are correlated, and the ρσ² part never averages away.'
  return null
}
export function diagnoseOob(c, got) {
  const all = c.preds[0].map((_, i) => c.preds.reduce((a, r) => a + r[i], 0) / c.preds.length)
  const inb = c.preds[0].map((_, i) => { const v = c.preds.filter((_, t) => c.inbag[t][i]).map(r => r[i]); return v.reduce((a, b) => a + b, 0) / v.length })
  const near = (a, b) => a?.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
  if (near(got.value, all)) return 'That averages every tree. For row i, use only the trees whose bootstrap sample did NOT contain i — otherwise the score is measured on training rows.'
  if (near(got.value, inb.map(v => (Number.isNaN(v) ? null : v)))) return 'Those are the trees that trained on the row. Use the others: inbag[t, i] == 0.'
  return null
}
export function evaluateBag(vars) {
  const miss = needVars(vars, ['n_trees', 'single_mse', 'bagged_mse'])
  if (miss) return { passed: false, message: miss }
  const n = Number(vars.n_trees.value), s = r3(vars.single_mse.value), b = r3(vars.bagged_mse.value)
  if (n < 20) return { passed: false, message: `With ${n} bagged tree${n === 1 ? '' : 's'} the validation MSE is ${b}, against ${s} for one tree on all the rows. Set \`n_trees = 50\` and run again.` }
  return { passed: true, message: `${n} trees: validation MSE ${b}, against ${s} for a single tree. Each bootstrap tree is noisy (one alone did worse than the plain tree), but their errors partly cancel in the average.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['variance', 'leftout', 'oobtrees']
export function generate(template, seed) {
  const g = rng(seed * 409 + TEMPLATES.indexOf(template) * 7001 + 23)
  if (template === 'variance') {
    const s2 = g.pick([1, 2, 4, 5]), rho = g.pick([0.1, 0.2, 0.25, 0.4, 0.5]), T = g.pick([4, 5, 10, 20, 50])
    const answer = avgVarOf(s2, rho, T)
    return { template, seed, s2, rho, T, answer, misconceptions: [{ answer: s2 / T, feedback: 'σ²/T assumes independent trees. Add the correlated part ρσ².' }, { answer: rho * s2, feedback: 'That is the limit as T grows. With finitely many trees add (1 − ρ)σ²/T.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  if (template === 'leftout') {
    const n = g.int(2, 8), answer = leftOutOf(n)
    return { template, seed, n, answer, misconceptions: [{ answer: 1 / n, feedback: 'The row must be missed on every one of the n draws: (1 − 1/n)ⁿ.' }, { answer: 1 - 1 / n, feedback: 'That is one draw. There are n draws, all of which must miss it.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  const T = g.pick([50, 100, 200, 300, 500]), n = g.pick([4, 5, 10, 1000]), answer = T * leftOutOf(n)
  return { template, seed, T, n, answer, misconceptions: [{ answer: T * (1 - leftOutOf(n)), feedback: 'Those trees DID draw the row. Out of bag means left out: T·(1 − 1/n)ⁿ.' }].filter(m => Math.abs(m.answer - answer) > 0.6) }
}
export function view(p) {
  if (p.template === 'variance') return { intro: `Each tree’s prediction has variance σ² = ${p.s2}; two trees correlate with ρ = ${p.rho}. The forest averages T = ${p.T} of them.`, questions: [{ id: 'v', type: 'number', label: 'What is the variance of the average, ρσ² + (1 − ρ)σ²/T? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'leftout') return { intro: `A bootstrap sample draws n = ${p.n} times, with replacement, from ${p.n} rows.`, questions: [{ id: 'q', type: 'number', label: 'What is the probability that one particular row is never drawn? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `A forest of T = ${p.T} trees, each on a bootstrap sample of the n = ${p.n} training rows.`, questions: [{ id: 't', type: 'number', label: 'On average, for how many trees is a given row out of bag? (Nearest tenth.)', answer: p.answer, tolerance: 0.06, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'variance') return `${p.rho} × ${p.s2} + (1 − ${p.rho}) × ${p.s2}/${p.T} = ${r3(p.rho * p.s2)} + ${r3((1 - p.rho) * p.s2 / p.T)} = **${r3(p.answer)}**.`
  if (p.template === 'leftout') return `Each draw misses the row with probability 1 − 1/${p.n}; all ${p.n} draws: (1 − 1/${p.n})^${p.n} = **${r3(p.answer)}**.`
  return `The chance a row is left out of one tree’s sample is (1 − 1/${p.n})^${p.n} = ${r3(leftOutOf(p.n))}. Times ${p.T} trees: **${Math.round(p.answer * 10) / 10}**.`
}

export const bag = {
  title: 'Averaging trees and out-of-bag scores',
  version: 1,
  templates: TEMPLATES,
  templateNames: { variance: 'Variance of an average', leftout: 'Chance a row is left out', oobtrees: 'Out-of-bag trees per row' },
  generate, view, workedSolution,
  intro: 'Seven steps: the variance of an average by hand, watching bagging work, and writing the out-of-bag bookkeeping. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Work it by hand',
      prompt: 'Each tree’s prediction has variance σ² = 4, and two trees correlate with ρ = 0.25. Separately, a bootstrap sample draws 3 times from 3 rows.',
      fields: [
        { label: 'Variance of the average of T = 10 trees', answer: 1.3, tolerance: 1e-9 },
        { label: 'The limit as T grows without bound', answer: 1 },
        { label: 'Probability one particular row of the 3 is never drawn (three decimals)', answer: 8 / 27, tolerance: 0.0006 },
      ],
      explain: 'ρσ² + (1 − ρ)σ²/T = 0.25 × 4 + 0.75 × 4/10 = 1 + 0.3 = 1.3. As T grows the second term vanishes and 1.0 = ρσ² remains: more trees cannot remove the correlated part. A row is missed by each draw with probability 2/3, so by all three with (2/3)³ = 8/27 ≈ 0.296.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Add trees to the bag',
      prompt: 'One deep regression tree on all the training rows, against a bag of `n_trees` deep trees, each on a bootstrap sample. Run it with `n_trees = 1`, then **set `n_trees = 50`** and run again. Predict first: does one bootstrap tree beat the plain tree? Do fifty?',
      starter: `import numpy as np
from sklearn.ensemble import BaggingRegressor
from sklearn.tree import DecisionTreeRegressor
rng = np.random.default_rng(0)
X = rng.uniform(0, 6, (200, 1))
y = np.sin(X[:, 0]) + rng.normal(0, 0.4, 200)
Xtr, ytr, Xva, yva = X[:150], y[:150], X[150:], y[150:]

single = DecisionTreeRegressor(random_state=0).fit(Xtr, ytr)
single_mse = np.mean((single.predict(Xva) - yva) ** 2)

n_trees = 1
bag = BaggingRegressor(DecisionTreeRegressor(), n_estimators=n_trees, random_state=0).fit(Xtr, ytr)
bagged_mse = np.mean((bag.predict(Xva) - yva) ** 2)
print(f"one tree, all rows:  validation MSE {single_mse:.3f}")
print(f"{n_trees} bootstrap trees:   validation MSE {bagged_mse:.3f}")`,
      probe: ['n_trees', 'single_mse', 'bagged_mse'],
      evaluate: evaluateBag,
      done: 'The noise here has variance 0.16, the floor any model can reach. Fifty averaged trees get most of the way there; one deep tree cannot.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the out-of-bag mask',
      prompt: 'Replace `___` so the function marks the rows a bootstrap sample never drew.',
      starter: `import numpy as np

def out_of_bag(idx, n):
    """idx: the row numbers a bootstrap sample drew (with repeats). Return a boolean array of length n,
    True for each row that was never drawn."""
    return ___`,
      hint: '`np.isin(np.arange(n), idx)` is True for the rows that were drawn.',
      solution: 'return ~np.isin(np.arange(n), idx)',
      check: { fn: 'out_of_bag', args: ['idx', 'n'], ints: ['n'], cases: MASK_CASES, describe: c => `idx = [${c.idx.join(', ')}], n = ${c.n}`, diagnose: diagnoseMask },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'With σ² = 2, ρ = 0.5 and T = 4 trees this returns **0.5**, promising that enough trees drive the variance to zero. The true value is 1.25. Fix it.',
      starter: `def avg_variance(sigma2, rho, T):
    """Variance of the average of T predictors, each with variance sigma2 and pairwise correlation rho."""
    return sigma2 / T`,
      hint: 'Only the uncorrelated share (1 − ρ) of the variance shrinks with T.',
      solution: 'return rho * sigma2 + (1 - rho) * sigma2 / T',
      check: { fn: 'avg_variance', args: ['sigma2', 'rho', 'T'], cases: VAR_CASES, describe: c => `σ² = ${c.sigma2}, ρ = ${c.rho}, T = ${c.T}`, diagnose: diagnoseVar },
      explainChoice: {
        prompt: 'Why does a random forest consider only a random subset of features at each split?',
        options: [
          { text: 'To lower ρ: trees that cannot all split on the same strong feature disagree more, so the part of the variance that never averages away gets smaller.', correct: true },
          { text: 'To make each tree more accurate.', feedback: 'Each tree usually gets a little worse. The gain comes from the average.' },
          { text: 'To make σ² smaller for each tree.', feedback: 'Fewer choices per split tend to raise each tree’s error; the forest wins through ρ.' },
          { text: 'Only to train faster.', feedback: 'It is faster, but the reason it helps accuracy is decorrelation.' },
        ],
        rightFeedback: 'Averaging removes (1 − ρ)σ²/T; feature subsampling attacks the ρσ² floor that more trees cannot.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write out-of-bag predictions',
      prompt: 'Write `oob_predict` from its contract. In the checks every row is out of bag for at least one tree.',
      starter: `import numpy as np

def oob_predict(preds, inbag):
    """preds[t, i]: tree t's prediction for training row i. inbag[t, i]: 1 if row i was in tree t's
    bootstrap sample, else 0. Return, for each row, the mean prediction of the trees that did NOT train on it.

    Example: oob_predict(np.array([[1., 2.], [3., 4.]]), np.array([[1., 0.], [0., 0.]]))  ->  array([3., 3.])
    """
    pass   # replace with your code`,
      hint: 'Make a 0/1 matrix out = 1 − inbag. Then the mean over trees is (preds · out).sum(axis=0) / out.sum(axis=0).',
      solution: 'out = 1 - inbag\nreturn (preds * out).sum(axis=0) / out.sum(axis=0)',
      check: { fn: 'oob_predict', args: ['preds', 'inbag'], cases: OOB_CASES, describe: c => `${c.preds.length} trees, ${c.preds[0].length} rows`, diagnose: diagnoseOob },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New forests and samples. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
