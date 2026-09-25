import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 05 practice ladder: the standard error, a 95% interval, and what coverage means. Expected values
// computed by hand and with NumPy; tests recompute them with the helpers below.

const mean = v => v.reduce((a, b) => a + b, 0) / v.length
export const sdOf = (v, ddof = 1) => { const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - ddof)) }
export const intervalOf = v => { const se = sdOf(v) / Math.sqrt(v.length), m = mean(v); return [m - 1.96 * se, m + 1.96 * se] }
export const coverageOf = (ivs, mu) => ivs.filter(([lo, hi]) => lo <= mu && mu <= hi).length / ivs.length

const SAMPLES = [[30, 28, 35, 31, 26], [1, 2, 3, 4], [10, 10, 12, 14, 9, 11, 13, 8], [100, 120]]
const IV_CASES = SAMPLES.map(x => ({ x, expected: intervalOf(x) }))
const COV_CASES = [
  { ivs: [[27, 33], [29, 31], [31, 36], [25, 30]], mu: 30, expected: 0.75 },     // [25, 30] contains 30: endpoints count
  { ivs: [[1, 2], [3, 4]], mu: 2.5, expected: 0 },
  { ivs: [[0, 10], [0, 10], [0, 10]], mu: 5, expected: 1 },
  { ivs: [[-1, 1], [0.5, 2], [-3, -0.1], [-0.2, 0.2], [0, 0]], mu: 0, expected: 0.6 },
]
export function diagnoseInterval(c, got) {
  if ((got.shape ?? []).join() !== '2') return 'Return two numbers, np.array([lower, upper]).'
  const m = mean(c.x), se0 = sdOf(c.x, 0) / Math.sqrt(c.x.length), se1 = sdOf(c.x) / Math.sqrt(c.x.length), [lo, hi] = got.value, near = (a, b) => Math.abs(a - b) < 1e-6
  if (near(lo, m - 1.96 * se0)) return 'Slightly too narrow: that standard deviation divides by n. Use n − 1 (ddof=1), which corrects for measuring spread around the sample’s own mean.'
  if (near(lo, m - 1.96 * sdOf(c.x))) return 'Far too wide: that uses the standard deviation of the data, not the standard error of the mean. Divide by √n.'
  if (near(lo, m - se1)) return 'That is ±1 standard error, about a 68% interval. A 95% interval uses ±1.96 standard errors.'
  return null
}
export function diagnoseCoverage(c, got) {
  if ((got.shape ?? []).length) return 'Return one number: the share of intervals that contain μ.'
  const strict = c.ivs.filter(([lo, hi]) => lo < c.mu && c.mu < hi).length / c.ivs.length
  if (Math.abs(got.value - strict) < 1e-9 && strict !== c.expected) return 'An interval whose endpoint equals μ contains it: use ≤, not <.'
  if (Math.abs(got.value - c.expected * c.ivs.length) < 1e-9) return 'That is a count; the contract asks for the share (divide by the number of intervals).'
  return null
}
export function evaluateCoverage(vars) {
  const miss = needVars(vars, ['n', 'covered', 'coverage'])
  if (miss) return { passed: false, message: miss }
  const cov = vars.covered.value, share = cov.reduce((a, b) => a + b, 0) / cov.length, n = Number(vars.n.value)
  if (Math.abs(share - Number(vars.coverage.value)) > 1e-9) return { passed: false, message: '`coverage` should be the share of `covered` that is true. Did an edit change it?' }
  if (n < 50) return { passed: false, message: `With n = ${n} per study, only ${r3(share)} of the “95%” intervals contain μ: on skewed data, the normal approximation is poor for small samples. Set \`n = 50\` and run again.` }
  return { passed: true, message: `With n = ${n}, coverage is ${r3(share)} — much closer to 0.95, though skewed data still falls a little short at this size. An interval’s “95%” is a promise about the method under its assumptions; simulating coverage is how you check it.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['se', 'size', 'meaning']
const CONTEXTS = [{ what: 'build time', unit: 's' }, { what: 'page load time', unit: 'ms' }, { what: 'daily error count', unit: 'errors' }]
const MEANINGS = {
  right: 'If many studies each computed an interval this way, about 95% of those intervals would contain the true mean.',
  data: '95% of the individual observations lie inside the interval.',
  this: 'There is a 95% probability that the true mean is inside this particular interval, as a fixed fact about it.',
  future: '95% of future sample means will fall inside this interval.',
}
export function generate(template, seed) {
  const g = rng(seed * 1907 + TEMPLATES.indexOf(template) * 30011 + 7)
  const ctx = g.pick(CONTEXTS), s = g.pick([4, 6, 8, 10, 12, 20]), n = g.pick([16, 25, 36, 64, 100]), m = g.int(20, 80)
  const base = { template, seed, ctx, s, n, m }
  if (template === 'se') {
    const answer = 1.96 * s / Math.sqrt(n)
    return { ...base, answer, misconceptions: [{ answer: s / Math.sqrt(n), feedback: 'That is the standard error; the 95% half-width is 1.96 of them.' }, { answer: 1.96 * s, feedback: 'That uses the standard deviation of the data. Divide it by √n first.' }, { answer: 1.96 * s / n, feedback: 'Divide by √n, not n.' }].filter(x => Math.abs(x.answer - answer) > 1e-9) }
  }
  if (template === 'size') {
    const k = g.pick([2, 3, 4]), answer = n * k * k
    return { ...base, k, answer, misconceptions: [{ answer: n * k, feedback: `The width shrinks like 1/√n: to divide it by ${k}, multiply n by ${k}² = ${k * k}.` }, { answer: n * Math.sqrt(k), feedback: 'The width shrinks like 1/√n, so n grows with the square of the factor.' }].filter(x => Math.abs(x.answer - answer) > 1e-9) }
  }
  return { ...base, lo: m - 2, hi: m + 3, answer: 'right', options: g.shuffle(Object.keys(MEANINGS)) }
}
export function view(p) {
  const { ctx, s, n } = p
  if (p.template === 'se') return { intro: `A sample of n = ${n} ${ctx.what}s has standard deviation s = ${s} ${ctx.unit}.`, questions: [{ id: 'hw', type: 'number', label: 'What is the half-width of the 95% interval for the mean, 1.96·s/√n? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'size') return { intro: `With n = ${n} ${ctx.what}s the 95% interval for the mean is ${4 * p.k} ${ctx.unit} wide.`, questions: [{ id: 'n', type: 'number', label: `About how many observations would make it ${p.k} times narrower (${4} ${ctx.unit} wide)?`, answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `A report says: mean ${ctx.what} ${p.m} ${ctx.unit}, 95% interval ${p.lo}–${p.hi} ${ctx.unit} (n = ${n}).`, questions: [{ id: 'meaning', type: 'choice', legend: 'Which statement is correct?', options: p.options.map(k => ({ value: k, label: MEANINGS[k] })), answer: 'right', wrong: 'Not that one. The interval is computed from a random sample, so the interval is what varies between studies; the true mean is fixed. “95%” describes how often the method captures it.' }] }
}
export function workedSolution(p) {
  if (p.template === 'se') return `SE = s/√n = ${p.s}/√${p.n} = ${r3(p.s / Math.sqrt(p.n))}; half-width 1.96 × ${r3(p.s / Math.sqrt(p.n))} = **${r3(p.answer)}**.`
  if (p.template === 'size') return `Width ∝ 1/√n, so dividing it by ${p.k} needs n × ${p.k}² = ${p.n} × ${p.k * p.k} = **${p.answer}**.`
  return `**${MEANINGS.right}** The data spread much wider than the interval; future sample means vary around the true mean, not around this interval; and this particular interval either contains the mean or does not.`
}

export const interval = {
  title: 'A 95% interval, and what it promises',
  version: 1,
  templates: TEMPLATES,
  templateNames: { se: 'Half-width', size: 'Sample size', meaning: 'What it means' },
  generate, view, workedSolution,
  intro: 'Seven steps, from an interval by hand to measuring coverage and reading intervals correctly. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Trace an interval by hand',
      prompt: 'Five build times: **[30, 28, 35, 31, 26] s**.',
      fields: [
        { label: 'Mean x̄', answer: 30 },
        { label: 'Standard deviation s with n − 1 (three decimals)', answer: 3.391, tolerance: 0.0006 },
        { label: 'Standard error s/√n (three decimals)', answer: 1.517, tolerance: 0.0006 },
        { label: 'Lower end of x̄ ± 1.96·SE (three decimals)', answer: 27.028, tolerance: 0.0015 },
      ],
      explain: 'Deviations 0, −2, 5, 1, −4; squares sum to 46; s² = 46/4 = 11.5, s ≈ 3.391; SE = 3.391/√5 ≈ 1.517; 30 − 1.96 × 1.517 ≈ 27.03 and the upper end ≈ 32.97.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Measure coverage',
      prompt: '1,000 simulated studies draw skewed build times with true mean 30 and each compute a 95% interval. Run it and read the coverage; then **change `n = 5` to `n = 50`** and run again. Predict first: does “95%” hold at n = 5?',
      starter: `import numpy as np
rng = np.random.default_rng(1)
n, mu = 5, 30.0
covered = []
for study in range(1000):
    x = rng.exponential(mu, n)                          # skewed times with true mean 30
    se = np.std(x, ddof=1) / np.sqrt(n)
    lo, hi = x.mean() - 1.96 * se, x.mean() + 1.96 * se
    covered.append(lo <= mu <= hi)
covered = np.array(covered)
coverage = covered.mean()
print(f"n = {n}: {coverage:.3f} of the intervals contain the true mean")`,
      probe: ['n', 'covered', 'coverage'],
      evaluate: evaluateCoverage,
      done: 'Coverage is a property of the method: run it many times on data like yours and count.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the standard error',
      prompt: 'Replace `___` with the standard error of the mean.',
      starter: `import numpy as np

def interval(x):
    """Approximate 95% interval for the mean of sample x: x̄ ± 1.96·SE. Returns np.array([lo, hi])."""
    se = ___
    return np.array([x.mean() - 1.96 * se, x.mean() + 1.96 * se])`,
      hint: 'The sample standard deviation with n − 1, divided by √n.',
      solution: 'se = np.std(x, ddof=1) / np.sqrt(len(x))',
      check: { fn: 'interval', args: ['x'], cases: IV_CASES, describe: c => `x = [${c.x.join(', ')}]`, diagnose: diagnoseInterval },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For [30, 28, 35, 31, 26] this gives a lower end of **27.34** instead of **27.03**. Find the bug.',
      starter: `import numpy as np

def interval(x):
    """Approximate 95% interval for the mean of sample x: x̄ ± 1.96·SE. Returns np.array([lo, hi])."""
    se = np.std(x) / np.sqrt(len(x))
    return np.array([x.mean() - 1.96 * se, x.mean() + 1.96 * se])`,
      hint: 'What does np.std divide by, unless told otherwise?',
      solution: 'se = np.std(x, ddof=1) / np.sqrt(len(x))',
      check: { fn: 'interval', args: ['x'], cases: IV_CASES, describe: c => `x = [${c.x.join(', ')}]`, diagnose: diagnoseInterval },
      explainChoice: {
        prompt: 'Why was the interval too narrow?',
        options: [
          { text: 'np.std divides by n by default; spread measured around the sample’s own mean is slightly too small, and dividing by n − 1 corrects it. With n = 5 the difference is visible.', correct: true },
          { text: '1.96 should be 2.', feedback: '1.96 is the 97.5th percentile of the normal distribution; the gap here comes from the standard deviation.' },
          { text: 'The mean was computed wrongly.', feedback: 'The mean, 30, is right; only the width changed.' },
          { text: 'The interval should use the median.', feedback: 'This is an interval for the mean.' },
        ],
        rightFeedback: 'The gap shrinks as n grows, which is why it hides in large samples.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the coverage count',
      prompt: 'Write `coverage` from its contract.',
      starter: `import numpy as np

def coverage(intervals, mu):
    """intervals: array of shape (k, 2), one [lower, upper] per study. Return the share of intervals
    that contain mu, counting an endpoint equal to mu as contained.

    Example: coverage(np.array([[27., 33.], [31., 36.]]), 30.0)  ->  0.5
    """
    pass   # replace with your code`,
      hint: 'A boolean array, (lower <= mu) & (mu <= upper), then its mean.',
      solution: 'return np.mean((intervals[:, 0] <= mu) & (mu <= intervals[:, 1]))',
      check: { fn: 'coverage', args: ['ivs', 'mu'], cases: COV_CASES, describe: c => `${c.ivs.length} intervals, μ = ${c.mu}`, diagnose: diagnoseCoverage },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New samples and reports. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
