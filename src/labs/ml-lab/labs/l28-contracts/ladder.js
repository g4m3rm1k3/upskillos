import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 28 practice ladder: bad-row shares, batch z-scores, quantile checks and run counts.

export const badShareOf = (rows, n) => new Set(rows).size / n
export const zOf = (x, mu, sd) => (x.reduce((a, b) => a + b, 0) / x.length - mu) / (sd / Math.sqrt(x.length))
export function quantileOf(values, q) {
  const s = [...values].sort((a, b) => a - b), pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)                   // linear interpolation, as numpy.quantile does by default
}
export const belowShareOf = (x, train, q) => { const t = quantileOf(train, q); return x.filter(v => v < t).length / x.length }

const SHARE_CASES = [[[3, 7, 7, 11], 60], [[0, 0, 0], 10], [[1, 2, 3, 4, 5], 5], [[9, 2, 9, 2, 5], 25]].map(([rows, n]) => ({ rows, n, expected: badShareOf(rows, n) }))
const Z_CASES = [[[35, 35, 35, 35], 50, 40], [[46, 50, 42], 83, 83], [[10, 20, 30, 40], 25, 10], [[1.5], 2, 1]].map(([x, mu, sd]) => ({ x, mu, sd, expected: zOf(x, mu, sd) }))
const TRAIN_A = [12, 15, 20, 22, 25, 30, 31, 35, 40, 44, 50, 55, 60, 75, 90, 120]
export const Q_CASES = [
  { x: [0.5, 1.2, 30, 40, 50], train: TRAIN_A, q: 0.1 },
  { x: [20, 30, 40], train: TRAIN_A, q: 0.25 },
  { x: [1, 2, 3, 4], train: [0, 10, 20, 30, 40], q: 0.5 },
  { x: [5, 15, 25, 35, 45, 55], train: [10, 20, 30, 40, 50], q: 0.5 },
].map(c => ({ ...c, expected: belowShareOf(c.x, c.train, c.q) }))

export function diagnoseShare(c, got) {
  if (Math.abs(got.value - c.rows.length / c.n) < 1e-9 && new Set(c.rows).size !== c.rows.length) return 'A row with two violations was counted twice. Count distinct rows: len(set(rows)).'
  return null
}
export function diagnoseZ(c, got) {
  const m = c.x.reduce((a, b) => a + b, 0) / c.x.length
  if (Math.abs(got.value - (m - c.mu) / (c.sd / c.x.length)) < 1e-9 && c.x.length > 1) return 'That divides by σ/n. The standard error of a mean is σ/√n.'
  if (Math.abs(got.value - (m - c.mu) / c.sd) < 1e-9 && c.x.length > 1) return 'That compares the mean with the spread of single values. Divide by the standard error, σ/√n.'
  return null
}
export function diagnoseQuantile(c, got) {
  const t = quantileOf(c.train, c.q), inBatch = quantileOf(c.x, c.q)
  if (Math.abs(got.value - c.x.filter(v => v < inBatch).length / c.x.length) < 1e-9 && inBatch !== t) return 'The threshold must come from the training data, not from the batch itself: a batch compared with its own quantile always looks normal.'
  if (Math.abs(got.value - c.x.filter(v => v <= t).length / c.x.length) < 1e-9 && c.x.some(v => v === t)) return 'Use a strict comparison: values below the threshold.'
  return null
}
export function evaluateQuantile(vars) {
  const miss = needVars(vars, ['use_quantile', 'flagged'])
  if (miss) return { passed: false, message: miss }
  if (!Number(vars.use_quantile.value)) return { passed: false, message: `The mean test ${Number(vars.flagged.value) ? 'flags' : 'does not flag'} the batch: the six minute-valued rows are hidden in a noisy mean. Set \`use_quantile = True\` and run again.` }
  return { passed: Number(vars.flagged.value) === 1, message: Number(vars.flagged.value) ? 'The quantile check flags the batch: about one row in nine falls below a value only 1% of training durations reach.' : 'Something changed the data: the quantile check should flag this batch.' }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['share', 'z', 'runs']
export function generate(template, seed) {
  const g = rng(seed * 311 + TEMPLATES.indexOf(template) * 1063 + 89)
  if (template === 'share') {
    const n = g.pick([40, 50, 60, 80, 100, 120]), bad = g.int(2, Math.round(n * 0.4)), limit = g.pick([0.1, 0.15, 0.2, 0.25]), answer = bad / n <= limit ? n - bad : 0
    return { template, seed, n, bad, limit, answer, misconceptions: [{ answer: n - bad, feedback: `${bad}/${n} = ${Math.round((100 * bad) / n)}% is above the limit: the whole batch is rejected.` }, { answer: 0, feedback: `${bad}/${n} = ${Math.round((100 * bad) / n)}% is within the limit: accept the good rows and quarantine the bad ones.` }].filter(m => m.answer !== answer) }
  }
  if (template === 'z') {
    const sd = g.pick([20, 30, 40, 60, 80]), n = g.pick([16, 25, 36, 49, 64, 100]), mu = g.pick([40, 50, 60, 80, 100]), se = sd / Math.sqrt(n), zt = g.pick([-4, -3, -2, 2, 3, 4]), m = mu + zt * se
    return { template, seed, sd, n, mu, m: Math.round(m * 100) / 100, answer: (Math.round(m * 100) / 100 - mu) / se, misconceptions: [{ answer: (Math.round(m * 100) / 100 - mu) / sd, feedback: 'Divide by the standard error σ/√n, not by σ.' }] }
  }
  const d = g.int(2, 5), c = g.int(2, 6), k = g.int(1, 3), answer = d * c * k
  return { template, seed, d, c, k, answer, misconceptions: [{ answer: d + c + k, feedback: 'Every combination gets its own id: multiply the counts.' }].filter(m => m.answer !== answer) }
}
export function view(p) {
  if (p.template === 'share') return { intro: `A batch of ${p.n} rows has ${p.bad} rows with violations. The quarantine policy allows at most ${Math.round(p.limit * 100)}% bad rows.`, questions: [{ id: 'a', type: 'number', label: 'How many rows are accepted?', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'z') return { intro: `Training mean ${p.mu}, training sd ${p.sd}. A batch of ${p.n} rows has mean ${p.m}.`, questions: [{ id: 'z', type: 'number', label: 'What is the z-score of the batch mean? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
  return { intro: `${p.d} data versions, ${p.c} configurations and ${p.k} code version${p.k > 1 ? 's' : ''}.`, questions: [{ id: 'n', type: 'number', label: 'How many distinct run ids can they form?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'share') return `${p.bad}/${p.n} = ${Math.round((100 * p.bad) / p.n)}% ${p.bad / p.n <= p.limit ? `≤ ${Math.round(p.limit * 100)}%: accept ${p.n} − ${p.bad} = **${p.answer}**` : `> ${Math.round(p.limit * 100)}%: reject the batch, **0** accepted`}.`
  if (p.template === 'z') return `Standard error ${p.sd}/√${p.n} = ${r3(p.sd / Math.sqrt(p.n))}; (${p.m} − ${p.mu})/${r3(p.sd / Math.sqrt(p.n))} = **${Math.round(p.answer * 100) / 100}**.`
  return `${p.d} × ${p.c} × ${p.k} = **${p.answer}**.`
}

export const contract = {
  title: 'Contracts, batch checks and lineage',
  version: 1,
  templates: TEMPLATES,
  templateNames: { share: 'A quarantine decision', z: 'A batch z-score', runs: 'Counting run ids' },
  generate, view, workedSolution,
  intro: 'Seven steps: a batch decision by hand, a check that catches a silent unit change, and writing the bad-row share, the batch z-score and a quantile check. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Decide about a batch by hand',
      prompt: 'A batch of 50 rows. Violations were found in rows 4, 9, 9, 17 and 30 (row 9 broke two rules). Quarantine policy with a 10% limit. Training mean 60 s and sd 30 s; the passing rows (n = 36) have mean 45 s.',
      fields: [
        { label: 'Distinct bad rows', answer: 4 },
        { label: 'Bad share', answer: 0.08, tolerance: 1e-9 },
        { label: 'Rows accepted', answer: 46 },
        { label: 'z-score of the passing rows’ mean', answer: -3, tolerance: 1e-9 },
        { label: 'Hexadecimal characters in a SHA-256 hash', answer: 64 },
      ],
      explain: 'Rows 4, 9, 17, 30: four distinct rows (row 9 counts once). 4/50 = 8% ≤ 10%: accept 46, quarantine 4. Standard error 30/√36 = 5, so z = (45 − 60)/5 = −3. SHA-256 is 256 bits, 4 bits per hex character: 64.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Catch the minutes',
      prompt: 'Rows that passed every contract rule, six of them in minutes. Run the mean test as given, then **set `use_quantile = True`** and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(5)
def durations(n, seed):
    r = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * r.normal(size=n)); cache = r.integers(0, 2, n)
    return 20 + 0.9 * size * np.where(cache == 1, 0.25, 1) + 5 * r.normal(size=n)
train = durations(600, 16)                       # the training data
batch = durations(52, 5)                         # the rows that passed the contract
batch[-6:] = batch[-6:] / 60                     # six arrived in minutes

use_quantile = False
if use_quantile:
    q01 = np.quantile(train, 0.01)
    share = np.mean(batch < q01)
    z = (share - 0.01) / np.sqrt(0.01 * 0.99 / len(batch))
else:
    z = (batch.mean() - train.mean()) / (train.std() / np.sqrt(len(batch)))
flagged = int(abs(z) > 3)
print(f"use_quantile = {use_quantile}: z = {z:.2f}, flagged = {bool(flagged)}")`,
      probe: ['use_quantile', 'flagged'],
      evaluate: evaluateQuantile,
      done: 'Use robust, quantile-based checks for heavy-tailed columns; keep the mean test for what it detects well (broad shifts).',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the bad-row share',
      prompt: 'Replace `___` with the share of rows that have at least one violation. `rows` lists the row of every violation, so a row can appear more than once.',
      starter: `import numpy as np

def bad_share(rows, n):
    """rows: the row index of each violation (repeats possible). n: rows in the batch."""
    return ___`,
      hint: 'Count distinct row indices, then divide by n.',
      solution: 'return len(np.unique(rows)) / n',
      check: { fn: 'bad_share', args: ['rows', 'n'], ints: ['n'], cases: SHARE_CASES, describe: c => `rows = [${c.rows.join(', ')}], n = ${c.n}`, diagnose: diagnoseShare },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For a batch of four rows with mean 35, training mean 50 and sd 40, this returns **−1.5**. The z-score is −0.75. Fix it.',
      starter: `import numpy as np

def batch_z(x, mu, sd):
    """z-score of the batch mean against the training mean mu and training sd."""
    return (np.mean(x) - mu) / (sd / len(x))`,
      hint: 'The standard error of a mean of n values is σ/√n.',
      solution: 'return (np.mean(x) - mu) / (sd / np.sqrt(len(x)))',
      check: { fn: 'batch_z', args: ['x', 'mu', 'sd'], cases: Z_CASES, describe: c => `${c.x.length} rows, μ = ${c.mu}, σ = ${c.sd}`, diagnose: diagnoseZ },
      explainChoice: {
        prompt: 'What would the bug do to the check in production?',
        options: [
          { text: 'Its z-scores are too large by a factor of √n, so large batches would raise alarms for tiny, harmless differences — a flood of false alarms.', correct: true },
          { text: 'It would miss real problems.', feedback: 'Dividing by σ/n makes |z| larger, not smaller: it over-alarms.' },
          { text: 'Nothing: the threshold absorbs the difference.', feedback: 'The error depends on n, so no single threshold fixes it.' },
          { text: 'It only matters for small batches.', feedback: 'The distortion is √n; it is worst for large batches.' },
        ],
        rightFeedback: 'Test a monitoring check on historical batches you know were fine before trusting its alarms.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write a quantile check',
      prompt: 'Write `below_share` from its contract.',
      starter: `import numpy as np

def below_share(x, train, q):
    """The share of batch values x strictly below the q-quantile of the training values
    (np.quantile's default interpolation).

    Example: below_share(np.array([1., 2., 3., 4.]), np.array([0., 10., 20., 30., 40.]), 0.5)  ->  1.0
    """
    pass   # replace with your code`,
      hint: 'Threshold t = np.quantile(train, q); then np.mean(x < t).',
      solution: 'return np.mean(x < np.quantile(train, q))',
      check: { fn: 'below_share', args: ['x', 'train', 'q'], cases: Q_CASES, describe: c => `${c.x.length} batch values, q = ${c.q}`, diagnose: diagnoseQuantile },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New batches and registries. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
