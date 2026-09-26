import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 29 practice ladder: capacity, parity and choosing a batch size.

export const capacityOf = (B, o, p) => (1000 * B) / (o + p * B)
export function minBatchOf(rate, o, p, maxB, headroom = 1.25) {
  for (let B = 1; B <= maxB; B++) if (capacityOf(B, o, p) >= headroom * rate) return B
  return 0
}

const CAP_CASES = [[1, 8, 2], [8, 8, 2], [10, 10, 1], [4, 0.5, 5]].map(([B, o, p]) => ({ B, o, p, expected: capacityOf(B, o, p) }))
const PARITY_CASES = [
  { served: [10, 20, 30], offline: [10, 20, 30] },
  { served: [10, 20, 30.03], offline: [10, 20, 30] },
  { served: [1, 2, 3, 4], offline: [1.5, 2, 3, 3] },
  { served: [100], offline: [98] },
].map(c => ({ ...c, expected: Math.max(...c.served.map((v, i) => Math.abs(v - c.offline[i]))) }))
export const BATCH_CASES = [[80, 8, 2, 16], [150, 8, 2, 16], [450, 8, 2, 16], [50, 10, 1, 8]].map(([rate, o, p, maxB]) => ({ rate, o, p, max_b: maxB, expected: minBatchOf(rate, o, p, maxB) }))

export function diagnoseCap(c, got) {
  if (Math.abs(got.value - 1000 / (c.o + c.p * c.B)) < 1e-9 && c.B > 1) return 'That is batches per second. Each batch serves B requests: multiply by B.'
  if (Math.abs(got.value - (1000 * c.B) / (c.o + c.p)) < 1e-9 && c.B > 1) return 'The per-request cost is paid for every request in the batch: o + p·B.'
  return null
}
export function diagnoseParity(c, got) {
  const d = c.served.map((v, i) => Math.abs(v - c.offline[i])), m = d.reduce((a, b) => a + b, 0) / d.length
  if (Math.abs(got.value - m) < 1e-12 && m !== c.expected) return 'That is the mean difference: one wrong request out of hundreds would hide in it. Parity needs the largest difference.'
  const signed = Math.max(...c.served.map((v, i) => v - c.offline[i]))
  if (Math.abs(got.value - signed) < 1e-12 && signed !== c.expected) return 'Take absolute differences: a server that predicts too low is just as wrong.'
  return null
}
export function diagnoseBatch(c, got) {
  const noHeadroom = minBatchOf(c.rate, c.o, c.p, c.max_b, 1)
  if (got.value === noHeadroom && noHeadroom !== c.expected) return 'Leave headroom: capacity must be at least 1.25 × the traffic, or latency explodes as utilization nears 100%.'
  return null
}
export function evaluateParity(vars) {
  const miss = needVars(vars, ['use_saved_stats', 'max_diff'])
  if (miss) return { passed: false, message: miss }
  const d = Number(vars.max_diff.value)
  if (d > 1e-6) return { passed: false, message: `The server’s predictions differ from the offline pipeline by up to ${r3(d)} s: it standardizes with the statistics of the incoming batch. Set \`use_saved_stats = 1\` and run again.` }
  return { passed: true, message: `Largest difference ${d.toExponential(1)} s: parity passes. The statistics learned in training are part of the model and must be saved with it.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['capacity', 'throughput', 'utilization']
export function generate(template, seed) {
  const g = rng(seed * 199 + TEMPLATES.indexOf(template) * 4013 + 97)
  if (template === 'capacity') {
    const o = g.pick([4, 5, 8, 10, 20]), p = g.pick([1, 2, 4, 5]), B = g.pick([1, 2, 4, 5, 8, 10]), answer = capacityOf(B, o, p)
    return { template, seed, o, p, B, answer, misconceptions: [{ answer: 1000 / (o + p * B), feedback: 'That is batches per second; multiply by the B requests in each.' }].filter(m => Math.abs(m.answer - answer) > 0.06) }
  }
  if (template === 'throughput') {
    const perSec = g.pick([200, 500, 1000, 2000, 5000]), minutes = g.pick([10, 20, 30, 60]), n = perSec * minutes * 60
    return { template, seed, n, minutes, answer: perSec, misconceptions: [{ answer: n / minutes, feedback: 'That is records per minute. Divide by seconds.' }] }
  }
  const o = g.pick([5, 8, 10]), p = g.pick([1, 2]), rate = g.pick([20, 40, 50, 60, 80]), cap = capacityOf(1, o, p), answer = rate / cap
  if (answer >= 1) return generate(template, seed + 1000)
  return { template, seed, o, p, rate, answer, misconceptions: [{ answer: cap / rate, feedback: 'Utilization is traffic divided by capacity: the share of time the server is busy.' }].filter(m => Math.abs(m.answer - answer) > 0.006) }
}
export function view(p) {
  if (p.template === 'capacity') return { intro: `A model server takes ${p.o} ms per call plus ${p.p} ms per request, and serves batches of ${p.B}.`, questions: [{ id: 'c', type: 'number', label: 'What is its capacity in requests per second? (One decimal.)', answer: p.answer, tolerance: 0.06, misconceptions: p.misconceptions }] }
  if (p.template === 'throughput') return { intro: `A batch job scores ${p.n.toLocaleString('en')} records in ${p.minutes} minutes.`, questions: [{ id: 't', type: 'number', label: 'How many records per second is that?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `A server answers one request at a time, taking ${p.o} ms per call plus ${p.p} ms per request. Traffic is ${p.rate} requests per second.`, questions: [{ id: 'u', type: 'number', label: 'What is its utilization — the share of time it is busy? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'capacity') return `1000 × ${p.B} / (${p.o} + ${p.p} × ${p.B}) = **${Math.round(p.answer * 10) / 10}**.`
  if (p.template === 'throughput') return `${p.n.toLocaleString('en')} / (${p.minutes} × 60) = **${p.answer}**.`
  return `Capacity 1000/(${p.o} + ${p.p}) = ${r3(capacityOf(1, p.o, p.p))} per second; ${p.rate}/${r3(capacityOf(1, p.o, p.p))} = **${Math.round(p.answer * 100) / 100}**.`
}

export const serve = {
  title: 'Serving: parity, capacity and batching',
  version: 1,
  templates: TEMPLATES,
  templateNames: { capacity: 'Capacity with batching', throughput: 'Batch throughput', utilization: 'Utilization' },
  generate, view, workedSolution,
  intro: 'Seven steps: serving arithmetic by hand, a parity failure fixed, and writing the capacity formula, a parity check and a batch-size choice. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Serving arithmetic by hand',
      prompt: 'A model server takes 8 ms per call plus 2 ms per request. Traffic is 60 requests per second. Separately, served predictions [12.0, 30.5, 7.2] against offline [12.0, 30.0, 7.4].',
      fields: [
        { label: 'Capacity one request at a time (requests per second)', answer: 100 },
        { label: 'Capacity in batches of 4', answer: 250 },
        { label: 'Utilization one at a time at 60 requests per second', answer: 0.6, tolerance: 1e-9 },
        { label: 'Largest parity difference (s)', answer: 0.5, tolerance: 1e-9 },
      ],
      explain: '1000/(8 + 2) = 100; 1000 × 4/(8 + 8) = 250. At 60 requests per second a server with capacity 100 is busy 60% of the time. Differences 0, 0.5, 0.2: the largest, 0.5 s, is what parity judges — far above a 1e-6 tolerance.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Pass the parity test',
      prompt: 'A server re-implements standardization. Run it as given: parity fails. **Set `use_saved_stats = 1`** so it uses the statistics saved in the artifact, and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(29)
X_train = rng.normal([40, 150], [30, 80], size=(500, 2))           # training features: size, files
mu, sd = X_train.mean(axis=0), X_train.std(axis=0)                  # saved in the artifact
w, b = np.array([12.0, 3.0]), 60.0

def offline(X):
    return b + ((X - mu) / sd) @ w

use_saved_stats = 0
def served(X):
    if use_saved_stats:
        return b + ((X - mu) / sd) @ w
    return b + ((X - X.mean(axis=0)) / X.std(axis=0)) @ w           # statistics of the incoming batch

requests = rng.normal([55, 120], [30, 80], size=(40, 2))            # today's traffic is a little different
max_diff = float(np.abs(served(requests) - offline(requests)).max())
print(f"use_saved_stats = {use_saved_stats}: largest difference {max_diff:.3g} s")`,
      probe: ['use_saved_stats', 'max_diff'],
      evaluate: evaluateParity,
      done: 'In practice, import the same preprocessing code in training and serving, and run this parity test in CI before every release.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the capacity',
      prompt: 'Replace `___` with the requests per second a server handles with batches of B.',
      starter: `def capacity(B, overhead_ms, per_item_ms):
    """Each call costs overhead_ms plus per_item_ms for each of its B requests."""
    return ___`,
      hint: 'One batch takes overhead + per_item·B milliseconds and serves B requests.',
      solution: 'return 1000 * B / (overhead_ms + per_item_ms * B)',
      check: { fn: 'capacity', args: ['B', 'overhead_ms', 'per_item_ms'], cases: CAP_CASES.map(c => ({ ...c, overhead_ms: c.o, per_item_ms: c.p })), describe: c => `B = ${c.B}, overhead ${c.o} ms, ${c.p} ms per request`, diagnose: diagnoseCap },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For served [10, 20, 30.03] against offline [10, 20, 30] this reports **0.01**, which would pass a sloppy threshold; one request is off by 0.03. Fix it.',
      starter: `import numpy as np

def parity_gap(served, offline):
    """The number a parity test compares with its tolerance."""
    return np.mean(np.abs(served - offline))`,
      hint: 'A parity test must fail if any single request differs.',
      solution: 'return np.max(np.abs(served - offline))',
      check: { fn: 'parity_gap', args: ['served', 'offline'], cases: PARITY_CASES, describe: c => `${c.served.length} requests`, diagnose: diagnoseParity },
      explainChoice: {
        prompt: 'Why use the largest difference rather than an average?',
        options: [
          { text: 'A skew bug often affects only some requests (one category, one range of values). An average dilutes them among the correct ones; the largest difference shows the worst request.', correct: true },
          { text: 'Averages are harder to compute.', feedback: 'They are just as easy; they answer a different question.' },
          { text: 'The mean is always zero.', feedback: 'Absolute differences have a positive mean when anything differs — but it can be tiny.' },
          { text: 'It makes the test pass more often.', feedback: 'The opposite: the largest difference is the strictest summary.' },
        ],
        rightFeedback: 'The same reasoning as monitoring the worst segment, not only the average error (Lab 16).',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Choose a batch size',
      prompt: 'Write `min_batch` from its contract.',
      starter: `def min_batch(rate, overhead_ms, per_item_ms, max_b):
    """The smallest batch size B (1..max_b) whose capacity is at least 1.25 × rate requests per second,
    or 0 if none is. Capacity with batches of B: 1000 * B / (overhead_ms + per_item_ms * B).

    Example: min_batch(150, 8, 2, 16)  ->  3    (B = 3 gives 214.3 ≥ 187.5; B = 2 gives only 166.7)
    """
    pass   # replace with your code`,
      hint: 'Loop B from 1 to max_b; return the first B whose capacity meets 1.25 × rate.',
      solution: 'for B in range(1, max_b + 1):\n    if 1000 * B / (overhead_ms + per_item_ms * B) >= 1.25 * rate:\n        return B\nreturn 0',
      check: { fn: 'min_batch', args: ['rate', 'overhead_ms', 'per_item_ms', 'max_b'], ints: ['max_b'], cases: BATCH_CASES.map(c => ({ ...c, overhead_ms: c.o, per_item_ms: c.p })), describe: c => `${c.rate} requests/s, ${c.o} ms + ${c.p} ms per request`, diagnose: diagnoseBatch },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New servers and jobs. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
