import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 04 practice ladder: Bayes’ rule for an alarm, by natural frequencies and by formula, checked by
// simulation. Expected values computed by hand and with NumPy; tests recompute them with the helpers.

export const posteriorOf = (p, s, f) => p * s / (p * s + (1 - p) * f)
export const countsOf = (n, p, s, f) => [n * p * s, n * (1 - p) * f, n * p * (1 - s), n * (1 - p) * (1 - f)]   // true alarms, false alarms, misses, quiet healthy

const CASES = [
  { prior: 0.02, sens: 0.9, fa: 0.05 }, { prior: 0.1, sens: 0.8, fa: 0.1 },
  { prior: 0.5, sens: 0.95, fa: 0.05 }, { prior: 0.001, sens: 0.99, fa: 0.01 },
].map(c => ({ ...c, expected: posteriorOf(c.prior, c.sens, c.fa) }))
const COUNT_CASES = [
  { n: 1000, prior: 0.02, sens: 0.9, fa: 0.05 }, { n: 10000, prior: 0.1, sens: 0.8, fa: 0.1 }, { n: 500, prior: 0.5, sens: 0.95, fa: 0.05 },
].map(c => ({ ...c, expected: countsOf(c.n, c.prior, c.sens, c.fa) }))
const describe = c => `prior ${c.prior}, sensitivity ${c.sens}, false-alarm rate ${c.fa}`

export function diagnosePosterior(c, got) {
  const v = got.value, near = x => Math.abs(v - x) < 1e-6
  if ((got.shape ?? []).length) return 'Return one number, P(fault | alarm).'
  if (near(c.sens / (c.sens + c.fa)) && !near(c.expected)) return 'The prior is missing: that treats faults and healthy machines as equally common. Weight each rate by how common its group is.'
  if (near(c.prior * c.sens)) return 'That is P(fault and alarm): divide by P(alarm), the share of all machines that alarm.'
  if (near(c.sens)) return 'That is P(alarm | fault), the sensitivity — the reverse conditional.'
  if (near(1 - c.expected)) return 'That is P(healthy | alarm), the complement.'
  return null
}
export function diagnoseCounts(c, got) {
  if ((got.shape ?? []).join() !== '4') return 'Return four expected counts: [true alarms, false alarms, misses, quiet healthy machines].'
  const [a, b, m, q] = c.expected, v = got.value, near = (x, y) => Math.abs(x - y) < 1e-6
  if (near(v[1], m) && near(v[2], b) && !near(b, m)) return 'False alarms and misses are swapped: a false alarm is a healthy machine that alarms.'
  if (near(v.reduce((s, x) => s + x, 0), 1)) return 'Those are shares; the contract asks for expected counts out of n machines.'
  return null
}

export function evaluateSimulation(vars) {
  const miss = needVars(vars, ['n', 'estimate', 'exact'])
  if (miss) return { passed: false, message: miss }
  const n = Number(vars.n.value), est = Number(vars.estimate.value), exact = posteriorOf(0.02, 0.9, 0.05)
  if (Math.abs(Number(vars.exact.value) - exact) > 1e-9) return { passed: false, message: `\`exact\` should be the Bayes answer, ${r3(exact)}. Did an edit change it?` }
  if (n < 100000) return { passed: false, message: `With n = ${n} machines the estimate is ${r3(est)}, off by ${r3(Math.abs(est - exact))}: only about ${Math.round(n * 0.067)} machines alarm, so it is noisy. Set \`n = 100_000\` and run again.` }
  if (Math.abs(est - exact) > 0.02) return { passed: false, message: `With n = ${n} the estimate ${r3(est)} should be within 0.02 of ${r3(exact)}. Did an edit change the simulation?` }
  return { passed: true, message: `With ${n} machines the simulated share ${r3(est)} is within ${r3(Math.abs(est - exact))} of the exact ${r3(exact)}: the formula describes what the simulation does, once there is enough of it.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
const CONTEXTS = [
  { unit: 'servers', fault: 'a failing disk', alarm: 'the health check flags it' },
  { unit: 'transactions', fault: 'fraud', alarm: 'the rule flags it' },
  { unit: 'builds', fault: 'a broken test', alarm: 'the pre-merge check fails' },
]
export const TEMPLATES = ['posterior', 'counts', 'expect']
export function generate(template, seed) {
  const g = rng(seed * 2663 + TEMPLATES.indexOf(template) * 40009 + 1)
  for (let attempt = 0; attempt < 200; attempt++) {
    const ctx = g.pick(CONTEXTS), prior = g.pick([0.01, 0.02, 0.05, 0.1, 0.2]), sens = g.pick([0.8, 0.9, 0.95]), fa = g.pick([0.02, 0.05, 0.1]), n = g.pick([1000, 10000])
    const base = { template, seed, ctx, prior, sens, fa, n }
    if (template === 'posterior') {
      const answer = posteriorOf(prior, sens, fa)
      return { ...base, answer, misconceptions: [{ answer: sens, feedback: 'That is P(flag | problem), the sensitivity. The question asks the reverse: P(problem | flag).' }, { answer: sens / (sens + fa), feedback: 'That ignores how rare the problem is. Weight each rate by the size of its group, e.g. with counts out of 1,000.' }, { answer: prior * sens, feedback: 'That is P(problem and flag). Divide by the share of all cases that are flagged.' }].filter(m => Math.abs(m.answer - answer) > 0.001) }
    }
    if (template === 'counts') {
      const answer = n * (1 - prior) * fa
      return { ...base, answer, misconceptions: [{ answer: n * fa, feedback: 'That applies the false-alarm rate to everyone. Only the healthy ones can raise a false alarm.' }, { answer: n * prior * (1 - sens), feedback: 'That is the number of misses: problems the check did not flag.' }].filter(m => Math.abs(m.answer - answer) > 1e-9) }
    }
    const values = [0, g.pick([10, 20, 50]), g.pick([100, 200, 400])], probs = g.pick([[0.7, 0.2, 0.1], [0.5, 0.3, 0.2], [0.8, 0.15, 0.05]])
    const answer = values.reduce((s, v, i) => s + v * probs[i], 0)
    return { ...base, values, probs, answer, misconceptions: [{ answer: values.reduce((s, v) => s + v, 0) / 3, feedback: 'That is the plain average of the outcomes. Weight each outcome by its probability.' }, { answer: values[2], feedback: 'That is the worst case, not the expected value.' }].filter(m => Math.abs(m.answer - answer) > 1e-9) }
  }
  throw new Error(`No valid ${template} problem for seed ${seed}`)
}
const pct = p => `${Math.round(p * 1000) / 10}%`
export function view(p) {
  const { ctx } = p
  const setup = `Among ${ctx.unit}, ${pct(p.prior)} have ${ctx.fault}. When one does, ${ctx.alarm} ${pct(p.sens)} of the time; when one does not, ${ctx.alarm} ${pct(p.fa)} of the time.`
  if (p.template === 'posterior') return { intro: setup, questions: [{ id: 'post', type: 'number', label: `${ctx.alarm[0].toUpperCase() + ctx.alarm.slice(1)}. What is the probability it really has ${ctx.fault}? (Three decimals.)`, answer: p.answer, tolerance: 0.001, misconceptions: p.misconceptions }] }
  if (p.template === 'counts') return { intro: setup, questions: [{ id: 'fa', type: 'number', label: `Out of ${p.n.toLocaleString('en')} ${ctx.unit}, how many **false alarms** do you expect?`, answer: p.answer, tolerance: 1e-6, misconceptions: p.misconceptions }] }
  return { intro: `An incident costs nothing with probability ${p.probs[0]}, ${p.values[1]} with probability ${p.probs[1]}, and ${p.values[2]} with probability ${p.probs[2]}.`, table: { caption: 'The cost distribution', head: ['outcome', 'cost', 'probability'], rows: p.values.map((v, i) => [`${i + 1}`, v, p.probs[i]]) }, questions: [{ id: 'e', type: 'number', label: 'What is the **expected** cost, E[cost] = Σ cost·P(cost)?', answer: p.answer, tolerance: 1e-6, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'expect') return `E[cost] = ${p.values.map((v, i) => `${v}×${p.probs[i]}`).join(' + ')} = **${r3(p.answer)}**.`
  const [a, b] = countsOf(1000, p.prior, p.sens, p.fa)
  if (p.template === 'counts') return `Healthy: ${p.n} × (1 − ${p.prior}) = ${r3(p.n * (1 - p.prior))}; false alarms: that × ${p.fa} = **${r3(p.answer)}**.`
  return `Out of 1,000: ${r3(1000 * p.prior)} have the problem and ${r3(a)} of those are flagged; ${r3(1000 * (1 - p.prior))} do not, and ${r3(b)} of those are flagged. P = ${r3(a)} / (${r3(a)} + ${r3(b)}) = **${r3(p.answer)}**.`
}

export const bayes = {
  title: 'Bayes’ rule for an alarm',
  version: 1,
  templates: TEMPLATES,
  templateNames: { posterior: 'P(problem | flag)', counts: 'Expected false alarms', expect: 'Expected cost' },
  generate, view, workedSolution,
  intro: 'Seven steps, from natural frequencies by hand to writing Bayes’ rule and checking it by simulation. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Count it out',
      prompt: '1,000 machines; 2% are faulty. The alarm catches 90% of faulty machines and fires on 5% of healthy ones.',
      fields: [
        { label: 'Faulty machines', answer: 20 },
        { label: 'Faulty machines that alarm (true alarms)', answer: 18 },
        { label: 'Healthy machines that alarm (false alarms)', answer: 49 },
        { label: 'P(faulty | alarm), three decimals', answer: 0.269, tolerance: 0.0006 },
      ],
      explain: '980 healthy × 0.05 = 49 false alarms; 20 faulty × 0.9 = 18 true alarms. Of 67 alarms, 18 are real: 18/67 ≈ 0.269. Most alarms are false because healthy machines vastly outnumber faulty ones.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Check it by simulation',
      prompt: 'This simulates machines and alarms, and compares the share of alarmed machines that are faulty with the exact answer. Run it, then **change `n = 1000` to `n = 100_000`** and run again. Predict: why is the first estimate so far off?',
      starter: `import numpy as np
rng = np.random.default_rng(0)
n = 1000
faulty = rng.random(n) < 0.02
alarm = np.where(faulty, rng.random(n) < 0.9, rng.random(n) < 0.05)

estimate = faulty[alarm].mean()                           # share of alarmed machines that are faulty
exact = 0.02 * 0.9 / (0.02 * 0.9 + 0.98 * 0.05)
print(f"alarms: {alarm.sum()}   estimate {estimate:.3f}   exact {exact:.3f}")`,
      probe: ['n', 'estimate', 'exact'],
      evaluate: evaluateSimulation,
      done: 'A simulation is an independent check of a formula: if they disagree with plenty of samples, one of them is wrong.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in Bayes’ rule',
      prompt: 'Replace `___` with P(fault | alarm) in terms of the prior, the sensitivity and the false-alarm rate.',
      starter: `def posterior(prior, sens, fa):
    """P(fault | alarm): prior = P(fault), sens = P(alarm | fault), fa = P(alarm | healthy)."""
    return ___`,
      hint: 'P(fault | alarm) = P(fault and alarm) / P(alarm). The alarm fires for faulty machines (prior·sens) and for healthy ones ((1 − prior)·fa).',
      solution: 'return prior * sens / (prior * sens + (1 - prior) * fa)',
      check: { fn: 'posterior', args: ['prior', 'sens', 'fa'], cases: CASES, describe, diagnose: diagnosePosterior, tolerance: 1e-6 },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'This returns **0.947** for prior 0.02, sensitivity 0.9 and false-alarm rate 0.05, where you counted 0.269. Fix it.',
      starter: `def posterior(prior, sens, fa):
    """P(fault | alarm): prior = P(fault), sens = P(alarm | fault), fa = P(alarm | healthy)."""
    return sens / (sens + fa)`,
      hint: 'How common are faulty machines? The formula never uses that.',
      solution: 'return prior * sens / (prior * sens + (1 - prior) * fa)',
      check: { fn: 'posterior', args: ['prior', 'sens', 'fa'], cases: CASES, describe, diagnose: diagnosePosterior },
      explainChoice: {
        prompt: 'Why was 0.947 wrong?',
        options: [
          { text: 'It ignored the prior: it treated faulty and healthy machines as equally common, so 98% of machines’ false alarms were counted as if there were only as many healthy machines as faulty ones.', correct: true },
          { text: 'It should have multiplied by the sensitivity twice.', feedback: 'The sensitivity appears once, in P(fault and alarm).' },
          { text: 'Probabilities cannot be divided.', feedback: 'Conditional probability is exactly a division: P(A and B)/P(B).' },
          { text: 'The false-alarm rate should be subtracted.', feedback: 'False alarms add to the alarms; they belong in the denominator, weighted by how many healthy machines there are.' },
        ],
        rightFeedback: 'This mistake is called base-rate neglect, and it is why a rare problem’s alarms are mostly false.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the natural-frequency table',
      prompt: 'Write `alarm_counts` from its contract. The checks use populations you have not seen.',
      starter: `import numpy as np

def alarm_counts(n, prior, sens, fa):
    """Expected counts among n machines, as np.array([true_alarms, false_alarms, misses, quiet_healthy]).
    true alarm: faulty and alarmed; false alarm: healthy and alarmed; miss: faulty and quiet.

    Example: alarm_counts(1000, 0.02, 0.9, 0.05) -> array([18., 49., 2., 931.])
    """
    pass   # replace with your code`,
      hint: 'Split n into faulty (n·prior) and healthy (n·(1 − prior)), then split each group by whether it alarms.',
      solution: 'faulty, healthy = n * prior, n * (1 - prior)\nreturn np.array([faulty * sens, healthy * fa, faulty * (1 - sens), healthy * (1 - fa)])',
      check: { fn: 'alarm_counts', args: ['n', 'prior', 'sens', 'fa'], cases: COUNT_CASES, describe: c => `n = ${c.n}, ${describe(c)}`, diagnose: diagnoseCounts },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New checks and populations. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
