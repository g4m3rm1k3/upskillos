import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 36 practice ladder: bias, weights and sample sizes by hand; randomizing; IPW, sample size and a difference in means in code.

export const ipwOf = (y, t, e) => {
  let a = 0, wa = 0, b = 0, wb = 0
  y.forEach((v, i) => { if (t[i]) { a += v / e[i]; wa += 1 / e[i] } else { b += v / (1 - e[i]); wb += 1 / (1 - e[i]) } })
  return a / wa - b / wb
}
export const sampleSizeOf = (sd, mde) => Math.ceil(2 * (1.959964 + 0.841621) ** 2 * sd * sd / (mde * mde))
export function diffOf(y, t) {
  const a = y.filter((_, i) => t[i]), b = y.filter((_, i) => !t[i]), m = x => x.reduce((s, v) => s + v, 0) / x.length
  const v = x => { const mu = m(x); return x.reduce((s, q) => s + (q - mu) ** 2, 0) / (x.length - 1) }
  const est = m(a) - m(b), se = Math.sqrt(v(a) / a.length + v(b) / b.length)
  return [est, est - 1.96 * se, est + 1.96 * se]
}

const IPW_CASES = [
  { y: [6, 8, 4, 5], t: [1, 1, 0, 0], e: [0.5, 0.5, 0.5, 0.5] },
  { y: [6, 8, 4, 5], t: [1, 1, 0, 0], e: [0.8, 0.4, 0.6, 0.2] },
  { y: [10, 2, 7, 3, 9], t: [1, 0, 1, 0, 0], e: [0.9, 0.1, 0.5, 0.3, 0.7] },
].map(c => ({ ...c, expected: ipwOf(c.y, c.t, c.e) }))
const SS_CASES = [[2.5, 0.3], [2, 0.5], [1.5, 0.25], [10, 1]].map(([sd, mde]) => ({ sd, mde, expected: sampleSizeOf(sd, mde) }))
export const DIFF_CASES = [
  { y: [7, 9, 8, 4, 6, 5], t: [1, 1, 1, 0, 0, 0] },
  { y: [3, 5, 4, 6, 2, 10], t: [0, 1, 0, 1, 0, 1] },
  { y: [1, 1, 2, 2, 3, 3, 4, 4], t: [0, 1, 0, 1, 0, 1, 0, 1] },
].map(c => ({ ...c, expected: diffOf(c.y, c.t) }))

export function diagnoseIpw(c, got) {
  const a = c.y.filter((_, i) => c.t[i]), b = c.y.filter((_, i) => !c.t[i]), m = x => x.reduce((s, v) => s + v, 0) / x.length
  if (Math.abs(got.value - (m(a) - m(b))) < 1e-9 && Math.abs(m(a) - m(b) - c.expected) > 1e-9) return 'That is the unweighted difference. Weight each treated learner by 1/e and each untreated one by 1/(1 − e).'
  let a2 = 0, wa2 = 0, b2 = 0, wb2 = 0
  c.y.forEach((v, i) => { if (c.t[i]) { a2 += v / c.e[i]; wa2 += 1 / c.e[i] } else { b2 += v / c.e[i]; wb2 += 1 / c.e[i] } })
  if (Math.abs(got.value - (a2 / wa2 - b2 / wb2)) < 1e-9 && Math.abs(a2 / wa2 - b2 / wb2 - c.expected) > 1e-9) return 'Untreated learners are weighted by 1/(1 − e), not 1/e: they stand in for the learners who were likely to be treated.'
  return null
}
export function diagnoseSs(c, got) {
  const raw = 2 * (1.959964 + 0.841621) ** 2 * c.sd * c.sd / (c.mde * c.mde)
  if (got.value === Math.floor(raw) && Math.floor(raw) !== c.expected) return 'Round up, not down: rounding down leaves the experiment slightly below 80% power.'
  return null
}
export function diagnoseDiff(c, got) {
  if (Array.isArray(got.value) && Math.abs(got.value[0] + c.expected[0]) < 1e-9 && c.expected[0] !== 0) return 'Treated minus untreated: the sign is flipped.'
  const a = c.y.filter((_, i) => c.t[i]), b = c.y.filter((_, i) => !c.t[i]), m = x => x.reduce((s, v) => s + v, 0) / x.length
  const v0 = x => { const mu = m(x); return x.reduce((s, q) => s + (q - mu) ** 2, 0) / x.length }
  const se0 = Math.sqrt(v0(a) / a.length + v0(b) / b.length), est = m(a) - m(b)
  if (Array.isArray(got.value) && Math.abs(got.value[1] - (est - 1.96 * se0)) < 1e-9) return 'Use sample variances (ddof=1): the population formula understates the standard error in small groups.'
  return null
}
export function evaluateRandomized(vars) {
  const miss = needVars(vars, ['randomized', 'estimate'])
  if (miss) return { passed: false, message: miss }
  const est = Number(vars.estimate.value)
  if (!Number(vars.randomized.value)) return { passed: false, message: `Difference ${r3(est)} lessons for an effect that is truly 1.00: motivated learners opted in and would have completed more anyway. Set \`randomized = 1\` so a coin flip decides, and run again.` }
  return { passed: true, message: `Difference ${r3(est)}: close to the true 1.00. The coin balances motivation — and every other confounder, measured or not — between the groups.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['bias', 'weight', 'samplesize']
export function generate(template, seed) {
  const g = rng(seed * 241 + TEMPLATES.indexOf(template) * 4177 + 79)
  if (template === 'bias') {
    const control = g.pick([4, 5, 6.5, 7]), effect = g.pick([0.5, 1, 1.5]), bias = g.pick([0.8, 1.6, 2.1, 3]), treated = Math.round((control + effect + bias) * 10) / 10
    return { template, seed, control, treated, effect, answer: Math.round((treated - control - effect) * 10) / 10, misconceptions: [{ answer: Math.round((treated - control) * 10) / 10, feedback: 'That is the whole naive difference. Subtract the true effect to leave the bias.' }] }
  }
  if (template === 'weight') {
    const e = g.pick([0.1, 0.2, 0.25, 0.4, 0.8, 0.9]), treated = g.pick([true, false]), answer = treated ? 1 / e : 1 / (1 - e)
    return { template, seed, e, treated, answer, misconceptions: [{ answer: treated ? 1 / (1 - e) : 1 / e, feedback: treated ? 'Treated learners get 1/e.' : 'Untreated learners get 1/(1 − e).' }].filter(m => Math.abs(m.answer - answer) > 0.006) }
  }
  const sd = g.pick([1, 1.5, 2, 2.5, 3]), mde = g.pick([0.2, 0.25, 0.4, 0.5]), raw = 2 * 2.8 ** 2 * sd * sd / (mde * mde), answer = Math.ceil(raw - 1e-9)
  return { template, seed, sd, mde, raw, answer }
}
export function view(p) {
  if (p.template === 'bias') return { intro: `Opted-in learners complete ${p.treated} lessons on average and the others ${p.control}. The true effect of reminders is ${p.effect}.`, questions: [{ id: 'b', type: 'number', label: 'How large is the selection bias in the naive difference? (One decimal.)', answer: p.answer, tolerance: 0.051, misconceptions: p.misconceptions }] }
  if (p.template === 'weight') return { intro: `A${p.treated ? ' treated' : 'n untreated'} learner has propensity e = ${p.e}.`, questions: [{ id: 'w', type: 'number', label: 'What IPW weight does that learner get? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
  return { intro: `Outcome standard deviation ${p.sd}, smallest effect worth detecting ${p.mde}. Use n ≈ 2 × 2.8² × σ² / δ².`, questions: [{ id: 'n', type: 'number', label: 'How many users per arm? (Round up.)', answer: p.answer }] }
}
export function workedSolution(p) {
  if (p.template === 'bias') return `${p.treated} − ${p.control} = ${Math.round((p.treated - p.control) * 10) / 10} = ${p.effect} (effect) + **${p.answer}** (bias).`
  if (p.template === 'weight') return `${p.treated ? `1/${p.e}` : `1/(1 − ${p.e})`} = **${Math.round(p.answer * 100) / 100}**.`
  return `2 × 7.84 × ${p.sd}² / ${p.mde}² = ${Math.round(p.raw * 100) / 100} → **${p.answer}**.`
}

export const causal = {
  title: 'Causal estimates: bias, weights and experiments',
  version: 1,
  templates: TEMPLATES,
  templateNames: { bias: 'Selection bias', weight: 'Propensity weights', samplesize: 'Sample size per arm' },
  generate, view, workedSolution,
  intro: 'Seven steps: causal arithmetic by hand, a coin flip against confounding, and writing IPW, a sample size and a difference in means with its interval. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Causal arithmetic by hand',
      prompt: 'Opted-in learners complete 8.1 lessons, others 5.0, and the true effect is 1.0. Separately: an untreated learner with propensity 0.8; an experiment with σ = 2 and smallest effect 0.5 (use 2 × 2.8² × σ²/δ²); and 20 metrics, none affected, tested at 5%.',
      fields: [
        { label: 'Selection bias in the naive difference', answer: 2.1, tolerance: 1e-9 },
        { label: 'IPW weight of the untreated learner', answer: 5, tolerance: 1e-9 },
        { label: 'Users per arm (rounded up)', answer: 251 },
        { label: 'Expected number of false “significant” metrics', answer: 1, tolerance: 1e-9 },
      ],
      explain: '8.1 − 5.0 = 3.1 = 1.0 + 2.1. Untreated weight 1/(1 − 0.8) = 5. 2 × 7.84 × 4 / 0.25 = 250.9 → 251. 20 × 0.05 = 1.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Let a coin decide',
      prompt: 'Learners choose whether to get reminders, and motivation drives both the choice and the outcome. Run it: the difference is three times the true effect. **Set `randomized = 1`** and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(36)
n = 4000
motivation = rng.normal(size=n)                            # never recorded in real life
randomized = 0            # 0: learners opt in themselves; 1: a coin flip decides who gets reminders
p = np.full(n, 0.5) if randomized else 1 / (1 + np.exp(-1.5 * motivation))
t = (rng.random(n) < p).astype(int)
y = 5 + 2 * motivation + 1.0 * t + 1.5 * rng.normal(size=n)  # the true effect of reminders is 1.0 lesson
estimate = float(y[t == 1].mean() - y[t == 0].mean())
print(f"randomized = {randomized}: difference in means {estimate:.2f} lessons (true effect 1.00)")`,
      probe: ['randomized', 'estimate'],
      evaluate: evaluateRandomized,
      done: 'Where you can randomize, do; adjustment methods rest on the assumption that every confounder was measured, and the data cannot confirm it.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the IPW estimate',
      prompt: 'Replace `___` with the normalized inverse-propensity-weighted difference.',
      starter: `import numpy as np

def ipw(y, t, e):
    """Weight treated learners by 1/e and untreated ones by 1/(1 - e); difference of the weighted means."""
    return ___`,
      hint: 'np.sum(t * y / e) / np.sum(t / e) minus the same for the untreated with 1 − t and 1 − e.',
      solution: 'return np.sum(t * y / e) / np.sum(t / e) - np.sum((1 - t) * y / (1 - e)) / np.sum((1 - t) / (1 - e))',
      check: { fn: 'ipw', args: ['y', 't', 'e'], ints: ['t'], cases: IPW_CASES, describe: c => `y [${c.y.join(', ')}], t [${c.t.join(', ')}], e [${c.e.join(', ')}]`, diagnose: diagnoseIpw },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For σ = 2.5 and δ = 0.3 this returns **1090**; the formula gives 1090.1, and an experiment must not fall short of 80% power. It should return 1091. Fix it.',
      starter: `def sample_size(sd, mde):
    """Users per arm for a two-sided 5% test with 80% power."""
    z_a, z_b = 1.959964, 0.841621
    return int(2 * (z_a + z_b) ** 2 * sd ** 2 / mde ** 2)`,
      hint: 'int() rounds toward zero. You need the next whole user above the formula’s value.',
      solution: 'import math at the top, then: return math.ceil(2 * (z_a + z_b) ** 2 * sd ** 2 / mde ** 2)',
      check: { fn: 'sample_size', args: ['sd', 'mde'], cases: SS_CASES, describe: c => `σ = ${c.sd}, δ = ${c.mde}`, diagnose: diagnoseSs },
      explainChoice: {
        prompt: 'Why fix the sample size before the experiment starts?',
        options: [
          { text: 'So the stopping point cannot depend on the results: stopping when the p-value first dips below 0.05 inflates false wins (about 20% with ten looks instead of 5%).', correct: true },
          { text: 'Because the formula cannot be computed afterwards.', feedback: 'It can; the point is that the decision to stop must not depend on the outcome.' },
          { text: 'To make the experiment shorter.', feedback: 'A fixed n is often longer than stopping early — that is the price of an honest error rate.' },
          { text: 'Because larger samples always give significant results.', feedback: 'Only if there is a real effect; with none, 5% are significant at any n.' },
        ],
        rightFeedback: 'Sequential designs exist for when you must look early — they spend the 5% deliberately across looks.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Difference in means with an interval',
      prompt: 'Write `diff_in_means` from its contract.',
      starter: `import numpy as np

def diff_in_means(y, t):
    """[estimate, low, high]: treated mean minus untreated mean, with a 95% interval
    estimate ± 1.96 · sqrt(var1/n1 + var0/n0), using sample variances (ddof=1).

    Example: diff_in_means([7, 9, 8, 4, 6, 5], [1, 1, 1, 0, 0, 0])  ->  [3.0, 1.4, 4.6]
    """
    pass   # replace with your code`,
      hint: 'Split y by t; np.var(..., ddof=1) gives the sample variances.',
      solution: 'a, b = y[t == 1], y[t == 0]\nest = a.mean() - b.mean()\nse = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))\nreturn [est, est - 1.96 * se, est + 1.96 * se]',
      check: { fn: 'diff_in_means', args: ['y', 't'], ints: ['t'], cases: DIFF_CASES, describe: c => `y [${c.y.join(', ')}], t [${c.t.join(', ')}]`, diagnose: diagnoseDiff },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New groups, propensities and experiments. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
