import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 38 practice ladder: budgets, paired intervals, ablations and verdicts by hand; honest reporting; the harness in code.

export const pairedOf = (a, b, t = 2.262) => {
  const d = a.map((v, i) => v - b[i]), n = d.length, m = d.reduce((s, v) => s + v, 0) / n
  const sd = Math.sqrt(d.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1)), half = t * sd / Math.sqrt(n)
  return [m, m - half, m + half]
}
export const verdictOf = (claimed, lo, hi) => (lo <= 0 ? 3 : lo <= claimed && claimed <= hi ? 1 : 2)     // 1 replicated, 2 partial, 3 not supported
export function planOf(costs, reach, budget) {
  const order = costs.map((_, i) => i).sort((i, j) => reach[j] / costs[j] - reach[i] / costs[i] || costs[i] - costs[j] || i - j)
  const bought = []; let spent = 0
  order.forEach(i => { if (spent + costs[i] <= budget) { bought.push(i); spent += costs[i] } })
  return bought.sort((a, b) => a - b)
}

const PAIRED_CASES = [
  { a: [0.90, 0.88, 0.91, 0.87, 0.89], b: [0.86, 0.85, 0.88, 0.85, 0.86], t: 2.776 },
  { a: [1, 2, 3, 4], b: [0, 2, 1, 5], t: 3.182 },
  { a: [0.5, 0.6, 0.7, 0.5, 0.6, 0.7, 0.5, 0.6, 0.7, 0.6], b: [0.4, 0.6, 0.5, 0.5, 0.5, 0.6, 0.4, 0.6, 0.6, 0.5], t: 2.262 },
].map(c => ({ ...c, expected: pairedOf(c.a, c.b, c.t) }))
const VERDICT_CASES = [[5, 2.1, 4.0], [5, -1, 9], [3, 2.1, 4.0], [0.5, -0.2, 0.1], [2, 2.5, 6]].map(([claimed, lo, hi]) => ({ claimed, lo, hi, expected: verdictOf(claimed, lo, hi) }))
export const PLAN_CASES = [
  { costs: [2, 20, 40, 32, 20], reach: [1, 2, 1, 1, 1], budget: 100 },
  { costs: [10, 10, 10], reach: [1, 2, 3], budget: 20 },
  { costs: [50, 60], reach: [1, 1], budget: 40 },
  { costs: [5, 25, 25, 50], reach: [1, 5, 5, 4], budget: 60 },
].map(c => ({ ...c, expected: planOf(c.costs, c.reach, c.budget) }))

export function diagnosePaired(c, got) {
  const d = c.a.map((v, i) => v - c.b[i]), n = d.length, m = d.reduce((s, v) => s + v, 0) / n
  const sd0 = Math.sqrt(d.reduce((s, v) => s + (v - m) ** 2, 0) / n), half0 = c.t * sd0 / Math.sqrt(n)
  if (Array.isArray(got.value) && Math.abs(got.value[1] - (m - half0)) < 1e-9) return 'Use the sample standard deviation (ddof=1) of the differences.'
  const sdd = Math.sqrt(d.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1))
  if (Array.isArray(got.value) && Math.abs(got.value[1] - (m - c.t * sdd)) < 1e-9) return 'Divide by √n: the interval is for the mean difference, not for a single seed.'
  return null
}
export function diagnoseVerdict(c, got) {
  if (got.value === 1 && c.lo <= 0 && c.lo <= c.claimed && c.claimed <= c.hi) return 'An interval that includes 0 does not support any effect, even if it also includes the claim: check low <= 0 first.'
  return null
}
export function diagnosePlan(c, got) {
  const byOrder = []; let spent = 0
  c.costs.forEach((cost, i) => { if (spent + cost <= c.budget) { byOrder.push(i); spent += cost } })
  if (Array.isArray(got.value) && got.value.length === byOrder.length && got.value.every((v, i) => v === byOrder[i]) && byOrder.join() !== c.expected.join()) return 'This buys experiments in list order. Rank them by claims reached per run first, then buy while the budget allows.'
  return null
}
export function evaluateReport(vars) {
  const miss = needVars(vars, ['reported_gain', 'lo', 'hi'])
  if (miss) return { passed: false, message: miss }
  const g = Number(vars.reported_gain.value), lo = Number(vars.lo.value), hi = Number(vars.hi.value)
  if (!(hi > lo)) return { passed: false, message: `A single number, ${r3(100 * g)} points, from the most favourable of 20 seeds: an optimistic selection, with no interval. Set \`report = "mean"\` so all seeds are reported with an interval, and run again.` }
  return { passed: true, message: `${r3(100 * g)} points [${r3(100 * lo)}, ${r3(100 * hi)}] over 20 seeds: a real gain, but less than a third of the best single run. Fix the seeds in advance and report them all.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['overrun', 'halfwidth', 'verdict']
export function generate(template, seed) {
  const g = rng(seed * 251 + TEMPLATES.indexOf(template) * 4201 + 83)
  if (template === 'overrun') {
    const costs = [g.pick([2, 4]), g.pick([10, 20]), g.pick([30, 40]), g.pick([24, 32]), g.pick([20, 30])], budget = g.pick([80, 100]), total = costs.reduce((a, b) => a + b, 0)
    if (total <= budget) return generate(template, seed + 1000)
    return { template, seed, costs, budget, answer: total - budget }
  }
  if (template === 'halfwidth') {
    const sd = g.pick([0.8, 1.2, 1.5, 2, 3]), answer = 2.262 * sd / Math.sqrt(10)
    return { template, seed, sd, answer, misconceptions: [{ answer: 2.262 * sd, feedback: 'Divide by √10: the interval is for the mean of 10 differences.' }] }
  }
  const claimed = g.pick([3, 5, 8]), lo = g.pick([-0.5, 1.2, 2.1, 4]), hi = lo + g.pick([1.5, 3, 5])
  return { template, seed, claimed, lo, hi: Math.round(hi * 10) / 10, answer: verdictOf(claimed, lo, Math.round(hi * 10) / 10) }
}
export function view(p) {
  if (p.template === 'overrun') return { intro: `Five experiments cost ${p.costs.join(', ')} training runs. The budget is ${p.budget}.`, questions: [{ id: 'o', type: 'number', label: 'How many runs over budget would running all of them be?', answer: p.answer }] }
  if (p.template === 'halfwidth') return { intro: `Ten paired differences have standard deviation ${p.sd} points.`, questions: [{ id: 'h', type: 'number', label: 'What is the half-width of the 95% interval, 2.262 × sd/√10? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
  return { intro: `A paper claims a gain of ${p.claimed} points; your paired interval is [${p.lo}, ${p.hi}]. Rule: not supported if low ≤ 0; replicated if the claim is inside; otherwise partially replicated.`, questions: [{ id: 'v', type: 'number', label: 'Verdict? (1 = replicated, 2 = partially replicated, 3 = not supported)', answer: p.answer }] }
}
export function workedSolution(p) {
  if (p.template === 'overrun') return `${p.costs.join(' + ')} = ${p.costs.reduce((a, b) => a + b, 0)}; minus ${p.budget} = **${p.answer}**.`
  if (p.template === 'halfwidth') return `2.262 × ${p.sd} / 3.162 = **${Math.round(p.answer * 100) / 100}**.`
  return p.lo <= 0 ? `low = ${p.lo} ≤ 0: **not supported (3)**.` : `low > 0; ${p.claimed} is ${p.lo <= p.claimed && p.claimed <= p.hi ? 'inside' : 'outside'} [${p.lo}, ${p.hi}]: **${p.answer === 1 ? 'replicated (1)' : 'partially replicated (2)'}**.`
}

export const replicate = {
  title: 'Replicating: budgets, paired intervals and verdicts',
  version: 1,
  templates: TEMPLATES,
  templateNames: { overrun: 'Compute budget', halfwidth: 'Paired interval', verdict: 'Verdict from an interval' },
  generate, view, workedSolution,
  intro: 'Seven steps: replication arithmetic by hand, reporting all seeds instead of the best, and writing a paired interval, the verdict rule and a budget plan. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Replication arithmetic by hand',
      prompt: 'Five experiments cost 2, 20, 40, 32 and 20 runs against a budget of 100. Ten paired differences have mean 0.034 and sd 0.015. Full method 88.8%, without cubic features 85.3%. A claimed gain of 5 points against an interval of [2.1, 4.0].',
      fields: [
        { label: 'Runs over budget if all five are run', answer: 14 },
        { label: 'Upper end of the 95% interval, 0.034 + 2.262 × 0.015/√10 (four decimals)', answer: 0.034 + 2.262 * 0.015 / Math.sqrt(10), tolerance: 0.00006 },
        { label: 'Points contributed by the cubic features', answer: 3.5, tolerance: 1e-9 },
        { label: 'Verdict (1 = replicated, 2 = partially, 3 = not supported)', answer: 2 },
      ],
      explain: '114 − 100 = 14. 2.262 × 0.015/3.162 = 0.0107, so the upper end is 0.0447. 88.8 − 85.3 = 3.5. The interval is above 0 but excludes 5: partially replicated.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Report every seed',
      prompt: 'The harness reports the gain of the most favourable of 20 seeds, as the paper did. **Set `report = "mean"`** to report all 20 with an interval, and run again.',
      starter: `import numpy as np

def train_eval(cubic, seed):
    """One training run: 40 points from two curved classes, logistic regression, accuracy on a fixed test set."""
    def draw(n, rng):
        y = rng.integers(0, 2, n); a = rng.uniform(0, np.pi, n)
        X = np.column_stack([np.cos(a) + y, np.sin(a) * (1 - 2 * y) + 0.5 * y]) + 0.3 * rng.normal(size=(n, 2))
        return X, y
    feats = lambda X: np.column_stack([X, X ** 2, X[:, :1] * X[:, 1:], X ** 3]) if cubic else X
    X, y = draw(40, np.random.default_rng(seed)); Xt, yt = draw(1000, np.random.default_rng(999))
    Z = feats(X); mu, sd = Z.mean(axis=0), Z.std(axis=0); Z = (Z - mu) / sd
    w, b = np.zeros(Z.shape[1]), 0.0
    for _ in range(300):
        e = 1 / (1 + np.exp(-(Z @ w + b))) - y; w -= 0.5 * Z.T @ e / 40; b -= 0.5 * e.mean()
    return float(np.mean(((((feats(Xt) - mu) / sd) @ w + b) > 0) == yt))

gains = np.array([train_eval(True, s) - train_eval(False, s) for s in range(20)])

report = "best"           # "best": report the most favourable seed, as the paper did; "mean": all seeds with an interval
if report == "best":
    reported_gain = float(gains.max()); lo = hi = reported_gain
else:
    reported_gain = float(gains.mean()); half = 2.093 * gains.std(ddof=1) / np.sqrt(len(gains))   # t for 19 df
    lo, hi = reported_gain - half, reported_gain + half
print(f"report = {report!r}: gain {reported_gain * 100:.1f} points, interval [{lo * 100:.1f}, {hi * 100:.1f}]")`,
      probe: ['reported_gain', 'lo', 'hi'],
      evaluate: evaluateReport,
      done: 'The best of many runs is optimistic by construction — the same selection effect as the winner’s curse (Lab 36).',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the paired interval',
      prompt: 'Replace `___` with the half-width of the interval for the mean paired difference.',
      starter: `import numpy as np

def paired_interval(a, b, t):
    """[mean, low, high] of the per-seed differences a - b, with half-width t · sd / sqrt(n) (sample sd)."""
    d = a - b
    half = ___
    return [d.mean(), d.mean() - half, d.mean() + half]`,
      hint: 't times the sample standard deviation of d, divided by √n.',
      solution: 'half = t * d.std(ddof=1) / np.sqrt(len(d))',
      check: { fn: 'paired_interval', args: ['a', 'b', 't'], cases: PAIRED_CASES, describe: c => `${c.a.length} seeds, t = ${c.t}`, diagnose: diagnosePaired },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For a claimed gain of 5 and an interval of [−1, 9] this returns **1 (replicated)**; the interval includes no effect at all. Fix it.',
      starter: `def verdict(claimed, low, high):
    """1 = replicated (claim inside the interval), 2 = partially replicated (above 0 but excludes the claim),
    3 = not supported (low <= 0)."""
    if low <= claimed <= high:
        return 1
    if low <= 0:
        return 3
    return 2`,
      hint: 'The order of the checks matters: whether any effect is supported comes before its size.',
      solution: 'if low <= 0:\n    return 3\nif low <= claimed <= high:\n    return 1\nreturn 2',
      check: { fn: 'verdict', args: ['claimed', 'low', 'high'], cases: VERDICT_CASES.map(c => ({ ...c, low: c.lo, high: c.hi })), describe: c => `claimed ${c.claimed}, interval [${c.lo}, ${c.hi}]`, diagnose: diagnoseVerdict },
      explainChoice: {
        prompt: 'Why is a very wide interval that contains the claim not a replication?',
        options: [
          { text: 'It also contains 0 and many other values: the data are compatible with no effect, so they cannot confirm this one. A wide interval means the experiment was too small to decide.', correct: true },
          { text: 'Because wide intervals are always wrong.', feedback: 'They are honest — they say the data cannot decide.' },
          { text: 'Because the claim must equal the mean exactly.', feedback: 'No: a claim inside a narrow interval above 0 is a replication.' },
          { text: 'Because only bootstrap intervals count.', feedback: 't and bootstrap intervals answer the same question here.' },
        ],
        rightFeedback: 'Report such a claim as not supported by this experiment, with the interval, and say what sample would decide it.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Spend the budget',
      prompt: 'Write `plan` from its contract.',
      starter: `def plan(costs, reach, budget):
    """Rank experiments by reach / cost (claims they can change per run; ties: cheaper first, then lower index),
    buy them in that order while the total stays within budget, and return the bought indices in increasing order.

    Example: plan([2, 20, 40, 32, 20], [1, 2, 1, 1, 1], 100)  ->  [0, 1, 3, 4]
    """
    pass   # replace with your code`,
      hint: 'sorted(range(n), key=lambda i: (-reach[i] / costs[i], costs[i], i)); then add each index whose cost still fits.',
      solution: 'order = sorted(range(len(costs)), key=lambda i: (-reach[i] / costs[i], costs[i], i))\nbought, spent = [], 0\nfor i in order:\n    if spent + costs[i] <= budget:\n        bought.append(i); spent += costs[i]\nreturn sorted(bought)',
      check: { fn: 'plan', args: ['costs', 'reach', 'budget'], ints: ['costs', 'reach', 'budget'], cases: PLAN_CASES, describe: c => `costs [${c.costs.join(', ')}], reach [${c.reach.join(', ')}], budget ${c.budget}`, diagnose: diagnosePlan },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New budgets, intervals and claims. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
