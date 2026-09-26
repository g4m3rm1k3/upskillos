import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 33 practice ladder: reading paired folds, a time-ordered test set, and the decision rule.

export const decideOf = (lo, point, thr) => (lo > thr ? 1 : point > thr ? 2 : 3)          // 1 ship, 2 inconclusive, 3 reject
export function forwardSplitsOf(n, k) {
  const sizes = Array.from({ length: k }, (_, f) => Math.floor(n / k) + (f < n % k ? 1 : 0))
  const starts = sizes.map((_, f) => sizes.slice(0, f).reduce((a, b) => a + b, 0))
  return starts.slice(1).map((s, j) => [s, s + sizes[j + 1]])
}

const START_CASES = [[100, 0.2], [3000, 0.2], [10, 0.25], [7, 0.5]].map(([n, f]) => ({ n, test_fraction: f, expected: n - Math.floor(n * f) }))
const DECIDE_CASES = [[26.32, 29.86, 2], [0.9, 2.38, 2], [26.32, 29.86, 30], [-0.5, 1.0, 0.5], [2.1, 3.0, 2]].map(([lo, point, thr]) => ({ lo, point, thr, expected: decideOf(lo, point, thr) }))
export const SPLIT_CASES = [[10, 5], [11, 3], [48, 5], [7, 7]].map(([n, k]) => ({ n, k, expected: forwardSplitsOf(n, k) }))

export function diagnoseStart(c, got) {
  if (got.value === Math.floor(c.n * c.test_fraction) && got.value !== c.expected) return 'That is the size of the test set. The test set is the last rows, so it starts at n − that size.'
  return null
}
export function diagnoseDecide(c, got) {
  const byPoint = c.point > c.thr ? 1 : 3
  if (got.value === byPoint && byPoint !== c.expected) return 'This decides on the point estimate alone. Ship needs the interval’s lower bound above the threshold; a point estimate above it with a lower bound below it is inconclusive.'
  return null
}
export function diagnoseSplits(c, got) {
  if (Array.isArray(got.value) && got.value.length === c.k) return 'Leave out the first block: with forward chaining it has no past to train on, so there are k − 1 folds.'
  return null
}
export function evaluateTimeSplit(vars) {
  const miss = needVars(vars, ['time_order', 'test_mae', 'future_mae'])
  if (miss) return { passed: false, message: miss }
  const t = Number(vars.test_mae.value), f = Number(vars.future_mae.value)
  if (!Number(vars.time_order.value)) return { passed: false, message: `The random test set promises ${r3(t)} s, but the next 100 builds get ${r3(f)} s: random rows mix the future into training. Set \`time_order = 1\` so the test set is the most recent 20%, and run again.` }
  return { passed: true, message: `The most recent 20% gives ${r3(t)} s against ${r3(f)} s on the next 100 builds — a far smaller surprise than the random split’s. When the data change over time, test on the latest period, as deployment will.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['paired', 'decision', 'relative']
export function generate(template, seed) {
  const g = rng(seed * 229 + TEMPLATES.indexOf(template) * 4133 + 67)
  if (template === 'paired') {
    const d = Array.from({ length: 5 }, () => Math.round((g.pick([-1, 0.5, 1, 2, 3, 4, 5]) + g.pick([-0.3, 0, 0.2, 0.4])) * 10) / 10), answer = d.reduce((a, b) => a + b, 0) / 5
    return { template, seed, d, answer, misconceptions: [{ answer: d.filter(v => v > 0).length, feedback: 'That is the win count. The question asks for the mean difference: its size matters, not how many folds were won.' }].filter(m => Math.abs(m.answer - answer) > 0.006) }
  }
  if (template === 'decision') {
    const point = g.pick([1.5, 2.4, 3.2, 5.0, 8.1]), half = g.pick([0.6, 1.2, 2.5]), thr = g.pick([1, 2, 3])
    return { template, seed, point, lo: Math.round((point - half) * 100) / 100, hi: Math.round((point + half) * 100) / 100, thr, answer: decideOf(Math.round((point - half) * 100) / 100, point, thr) }
  }
  const base = g.pick([20, 30, 37.9, 45, 60]), cut = g.pick([0.1, 0.25, 0.4, 0.6, 0.79]), model = Math.round(base * (1 - cut) * 100) / 100, answer = 100 * (1 - model / base)
  return { template, seed, base, model, answer, misconceptions: [{ answer: 100 * model / base, feedback: 'That is the model’s error as a share of the baseline’s. The reduction is 100 minus that.' }] }
}
export function view(p) {
  if (p.template === 'paired') return { intro: `On the same five folds, baseline MAE minus model MAE is ${p.d.map(v => (v >= 0 ? '+' : '') + v).join(', ')} seconds.`, questions: [{ id: 'm', type: 'number', label: 'What is the mean paired difference? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
  if (p.template === 'decision') return { intro: `The test improvement is ${p.point} s with a 95% interval of ${p.lo} to ${p.hi} s. The threshold, set before modelling, is ${p.thr} s. Ship needs the lower bound above the threshold; inconclusive needs the point estimate above it; otherwise reject.`, questions: [{ id: 'd', type: 'number', label: 'Decision? (1 = ship, 2 = inconclusive, 3 = reject)', answer: p.answer }] }
  return { intro: `On the test period the baseline has MAE ${p.base} s and the model ${p.model} s.`, questions: [{ id: 'r', type: 'number', label: 'By what percentage is the error lower? (One decimal.)', answer: p.answer, tolerance: 0.06, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'paired') return `(${p.d.join(' + ').replace(/\+ -/g, '− ')})/5 = **${Math.round(p.answer * 100) / 100}**.`
  if (p.template === 'decision') return `Lower bound ${p.lo} ${p.lo > p.thr ? '>' : '≤'} ${p.thr}${p.lo > p.thr ? '' : `; point ${p.point} ${p.point > p.thr ? '>' : '≤'} ${p.thr}`}: **${['ship', 'inconclusive', 'reject'][p.answer - 1]} (${p.answer})**.`
  return `1 − ${p.model}/${p.base} = **${Math.round(p.answer * 10) / 10}%**.`
}

export const capstone = {
  title: 'Evidence: folds, test periods and decisions',
  version: 1,
  templates: TEMPLATES,
  templateNames: { paired: 'Paired fold differences', decision: 'The decision rule', relative: 'Relative improvement' },
  generate, view, workedSolution,
  intro: 'Seven steps: evidence arithmetic by hand, a test set that matches deployment, and writing the test split, the decision rule and forward-chaining folds. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Evidence arithmetic by hand',
      prompt: 'On the same five folds, baseline MAE minus model MAE is +4.1, +3.8, +5.0, −0.4 and −0.6 s. Separately, a log of 3,000 builds keeps its last 20% as the test set, and a test improvement of 2.38 s has a 95% interval of 0.9 to 3.9 s against a threshold of 2 s.',
      fields: [
        { label: 'Mean paired difference (s)', answer: 2.38, tolerance: 1e-9 },
        { label: 'Folds the model won', answer: 3 },
        { label: 'Index of the first test row (0-based)', answer: 2400 },
        { label: 'Decision (1 = ship, 2 = inconclusive, 3 = reject)', answer: 2 },
      ],
      explain: '(4.1 + 3.8 + 5.0 − 0.4 − 0.6)/5 = 2.38 s; 3 of 5 folds won — a count that hides that the wins are large and the losses small. 3,000 − 600 = 2,400. The point estimate 2.38 is above 2 but the lower bound 0.9 is not: inconclusive.',
    },
    {
      id: 'agree', kind: 'probe', title: 'A test set that matches deployment',
      prompt: 'Builds arrive in time order and shared runners keep getting busier. Run it: the random test set promises far less error than the next 100 builds get. **Set `time_order = 1`** so the test set is the most recent 20%, and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(33)
n = 600                                                     # builds in time order; shared runners get busier over time
size = np.exp(np.log(40) + 0.8 * rng.normal(size=n)); cache = rng.integers(0, 2, n); shared = rng.integers(0, 2, n)
queue = 10 + 60 * np.arange(n) / n
y = 20 + 0.8 * size + 30 * (1 - cache) + shared * queue + 5 * rng.normal(size=n)
X = np.column_stack([np.ones(n), size, cache, shared])
# What deployment will actually see: the next 100 builds.
m = np.arange(n, n + 100)
future_queue = 10 + 60 * m / n
fs, fc, fsh = np.exp(np.log(40) + 0.8 * rng.normal(size=100)), rng.integers(0, 2, 100), rng.integers(0, 2, 100)
fy = 20 + 0.8 * fs + 30 * (1 - fc) + fsh * future_queue + 5 * rng.normal(size=100)

time_order = 0                                              # 0: a random 20% test set; 1: the most recent 20%
if time_order:
    test = np.arange(n) >= int(0.8 * n)
else:
    test = np.zeros(n, bool); test[rng.permutation(n)[:int(0.2 * n)]] = True
w = np.linalg.lstsq(X[~test], y[~test], rcond=None)[0]
test_mae = float(np.mean(np.abs(X[test] @ w - y[test])))

future_mae = float(np.mean(np.abs(np.column_stack([np.ones(100), fs, fc, fsh]) @ w - fy)))
print(f"time_order = {time_order}: test MAE {test_mae:.1f} s; MAE on the next 100 builds {future_mae:.1f} s")`,
      probe: ['time_order', 'test_mae', 'future_mae'],
      evaluate: evaluateTimeSplit,
      done: 'The same reasoning chooses forward-chaining folds for model selection on the development data (Lab 19).',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the test split',
      prompt: 'Replace `___` with the index of the first test row when the last `int(n * test_fraction)` rows are the test set.',
      starter: `def test_start(n, test_fraction):
    """Rows test_start(n, f) .. n-1 are the test set: the most recent int(n * f) rows."""
    return ___`,
      hint: 'The test set has int(n * test_fraction) rows at the end.',
      solution: 'return n - int(n * test_fraction)',
      check: { fn: 'test_start', args: ['n', 'test_fraction'], ints: ['n'], cases: START_CASES, describe: c => `n = ${c.n}, test fraction ${c.test_fraction}`, diagnose: diagnoseStart },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For an improvement of 2.38 s with interval 0.9 to 3.9 s and a threshold of 2 s this returns **1 (ship)**; the interval says the true improvement may be below the threshold. Fix it.',
      starter: `def decide(lo, point, threshold):
    """1 = ship if the interval's lower bound exceeds the threshold; 2 = inconclusive if only the point
    estimate does; 3 = reject otherwise."""
    if point > threshold:
        return 1
    return 3`,
      hint: 'Ship depends on the lower bound; the point estimate decides between inconclusive and reject.',
      solution: 'if lo > threshold:\n    return 1\nif point > threshold:\n    return 2\nreturn 3',
      check: { fn: 'decide', args: ['lo', 'point', 'threshold'], cases: DECIDE_CASES.map(c => ({ ...c, threshold: c.thr })), describe: c => `interval from ${c.lo}, point ${c.point}, threshold ${c.thr}`, diagnose: diagnoseDecide },
      explainChoice: {
        prompt: 'Why is “inconclusive” a useful answer rather than a failure?',
        options: [
          { text: 'It says the data cannot yet tell whether the model clears the bar: collect more test data, or accept the risk explicitly — instead of shipping on a lucky estimate or rejecting a real gain.', correct: true },
          { text: 'Because it lets you ship anyway.', feedback: 'Shipping on an inconclusive result is a decision someone must take and record, not the default.' },
          { text: 'Because the threshold was wrong.', feedback: 'The threshold was set before modelling on purpose; moving it now would defeat it.' },
          { text: 'Because the model is worse than the baseline.', feedback: 'The point estimate is above the threshold; the uncertainty is the problem, not the direction.' },
        ],
        rightFeedback: 'An honest “we do not know yet” protects the users and the credibility of every later claim.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Forward-chaining folds',
      prompt: 'Write `forward_splits` from its contract.',
      starter: `def forward_splits(n, k):
    """Split rows 0..n-1 into k consecutive blocks as np.array_split does (the first n % k blocks get one extra row).
    For each block after the first, return [start, end]: train on rows < start, validate on rows start..end-1.

    Example: forward_splits(10, 5)  ->  [[2, 4], [4, 6], [6, 8], [8, 10]]
    """
    pass   # replace with your code`,
      hint: 'Compute the block sizes, then each block’s start as the sum of the sizes before it. Skip block 0.',
      solution: 'sizes = [n // k + (1 if f < n % k else 0) for f in range(k)]\nstarts = [sum(sizes[:f]) for f in range(k)]\nreturn [[starts[f], starts[f] + sizes[f]] for f in range(1, k)]',
      check: { fn: 'forward_splits', args: ['n', 'k'], ints: ['n', 'k'], cases: SPLIT_CASES, describe: c => `n = ${c.n}, k = ${c.k}`, diagnose: diagnoseSplits },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New folds, intervals and baselines. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
