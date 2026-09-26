import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 31 practice ladder: group rates from counts, equalizing recall, deferral and intervals.

export const tprOf = (y, pred) => { const pos = y.filter(v => v === 1).length; return y.filter((v, i) => v === 1 && pred[i] === 1).length / pos }
export const deferredOf = (scores, w) => scores.filter(s => Math.abs(s - 0.5) <= w).length
export function wilsonOf(k, n, z = 1.96) {
  const p = k / n, c = (p + z * z / (2 * n)) / (1 + z * z / n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
  return [c - h, c + h]
}

const TPR_CASES = [
  { y: [1, 1, 1, 1, 0, 0], pred: [1, 1, 0, 0, 1, 0] },
  { y: [1, 0, 1, 0, 1, 0, 0, 0], pred: [1, 1, 1, 1, 1, 0, 0, 0] },
  { y: [1, 1, 1, 0], pred: [0, 0, 0, 0] },
  { y: [0, 1, 0, 1, 1], pred: [0, 1, 1, 1, 0] },
].map(c => ({ ...c, expected: tprOf(c.y, c.pred) }))
const DEFER_CASES = [
  { scores: [0.05, 0.42, 0.5, 0.61, 0.97], width: 0.1 },
  { scores: [0.1, 0.2, 0.3, 0.8, 0.9], width: 0.15 },
  { scores: [0.3, 0.45, 0.55, 0.7], width: 0 },
  { scores: [0.36, 0.48, 0.52, 0.64, 0.66], width: 0.15 },
].map(c => ({ ...c, expected: deferredOf(c.scores, c.width) }))
export const WILSON_CASES = [[21, 30], [0, 20], [180, 244], [5, 5]].map(([k, n]) => ({ k, n, expected: wilsonOf(k, n) }))

export function diagnoseTpr(c, got) {
  const tp = c.y.filter((v, i) => v === 1 && c.pred[i] === 1).length, flagged = c.pred.filter(v => v === 1).length
  const acc = c.y.filter((v, i) => v === c.pred[i]).length / c.y.length
  if (flagged && Math.abs(got.value - tp / flagged) < 1e-9 && Math.abs(tp / flagged - c.expected) > 1e-9) return 'That is precision: true positives divided by everything flagged. Recall divides by the truly positive cases.'
  if (Math.abs(got.value - acc) < 1e-9 && Math.abs(acc - c.expected) > 1e-9) return 'That is accuracy over all cases. Recall looks only at the truly positive ones.'
  return null
}
export function diagnoseDefer(c, got) {
  const noAbs = c.scores.filter(s => s - 0.5 <= c.width).length
  if (got.value === noAbs && noAbs !== c.expected) return 'Low scores are counted too: the band is on both sides of 0.5, so compare the distance |s − 0.5|.'
  return null
}
export function diagnoseWilson(c, got) {
  const p = c.k / c.n, h = 1.96 * Math.sqrt(p * (1 - p) / c.n)
  if (Array.isArray(got.value) && Math.abs(got.value[0] - (p - h)) < 1e-9 && Math.abs(got.value[1] - (p + h)) < 1e-9) return 'That is the simple p ± 1.96·√(p(1 − p)/n) interval. Use the Wilson formula from the docstring: it stays inside [0, 1] and is sensible when k is 0 or n.'
  return null
}
export function evaluateThreshold(vars) {
  const miss = needVars(vars, ['t_b', 'recall_a', 'recall_b', 'fpr_b'])
  if (miss) return { passed: false, message: miss }
  const ra = Number(vars.recall_a.value), rb = Number(vars.recall_b.value), f = Number(vars.fpr_b.value), t = Number(vars.t_b.value)
  if (Math.abs(ra - rb) > 0.01) return { passed: false, message: `With t_b = ${t}, recall is ${r3(ra)} in A and ${r3(rb)} in B — a gap of ${r3(100 * Math.abs(ra - rb))} points. ${rb < ra ? 'Lower' : 'Raise'} \`t_b\` (try values between 0.10 and 0.15) until the gap is at most 1 point.` }
  return { passed: true, message: `Recall ${r3(ra)} in A and ${r3(rb)} in B: equal opportunity holds. The price: region B’s false-positive rate is now ${r3(f)} (it was 0.123 at 0.5). Which gap matters more is a decision about harms, not a calculation.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['recall', 'leak', 'reviewers']
export function generate(template, seed) {
  const g = rng(seed * 223 + TEMPLATES.indexOf(template) * 4111 + 53)
  if (template === 'recall') {
    const pos = g.pick([40, 50, 80, 100, 120]), tp = Math.round(pos * g.pick([0.6, 0.7, 0.75, 0.8, 0.9])), fp = g.pick([5, 10, 15, 20, 30]), answer = tp / pos
    return { template, seed, pos, tp, fp, answer, misconceptions: [{ answer: tp / (tp + fp), feedback: 'That is precision. Recall divides by the truly urgent tickets.' }].filter(m => Math.abs(m.answer - answer) > 0.006) }
  }
  if (template === 'leak') {
    const n = g.pick([3, 4, 5, 6]), before = g.pick([2.5, 3, 3.5, 4, 4.5]), newcomer = g.pick([6, 7.5, 8, 9, 10.5]), after = (n * before + newcomer) / (n + 1)
    return { template, seed, n, before, after: Math.round(after * 1000) / 1000, answer: (n + 1) * (Math.round(after * 1000) / 1000) - n * before, misconceptions: [{ answer: Math.round(after * 1000) / 1000 - before, feedback: 'That is the change in the average. Multiply each average by its group size first.' }] }
  }
  const tickets = g.pick([2000, 3000, 4000, 6000]), share = g.pick([0.04, 0.05, 0.062, 0.08, 0.1]), per = g.pick([100, 120, 150, 200]), answer = Math.ceil((tickets * share) / per - 1e-9)
  return { template, seed, tickets, share, per, answer, misconceptions: [{ answer: Math.floor((tickets * share) / per), feedback: 'Round up: a fraction of a reviewer’s load still needs a reviewer.' }].filter(m => m.answer !== answer) }
}
export function view(p) {
  if (p.template === 'recall') return { intro: `In one region, ${p.pos} tickets truly needed escalation. The model flagged ${p.tp} of them, plus ${p.fp} that did not.`, questions: [{ id: 'r', type: 'number', label: 'What is the recall in this region? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
  if (p.template === 'leak') return { intro: `A team of ${p.n} has a published average of ${p.before} h. After one person joins, the published average of the ${p.n + 1} is ${p.after} h.`, questions: [{ id: 'l', type: 'number', label: 'What is the newcomer’s own value? (One decimal.)', answer: p.answer, tolerance: 0.06, misconceptions: p.misconceptions }] }
  return { intro: `${p.tickets.toLocaleString('en')} tickets arrive a day and the review band sends ${Math.round(p.share * 1000) / 10}% of them to people. One reviewer can handle ${p.per} a day.`, questions: [{ id: 'v', type: 'number', label: 'How many reviewers are needed?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'recall') return `Recall = flagged urgent / all urgent = ${p.tp}/${p.pos} = **${Math.round(p.answer * 100) / 100}**. (The ${p.fp} false alarms affect precision, not recall.)`
  if (p.template === 'leak') return `${p.n + 1} × ${p.after} − ${p.n} × ${p.before} = **${Math.round(p.answer * 10) / 10}**.`
  return `${p.tickets} × ${p.share} = ${r3(p.tickets * p.share)} tickets; ${r3(p.tickets * p.share)}/${p.per} rounded up = **${p.answer}**.`
}

export const audit = {
  title: 'Auditing by group: rates, thresholds and intervals',
  version: 1,
  templates: TEMPLATES,
  templateNames: { recall: 'Recall from counts', leak: 'Leaking aggregates', reviewers: 'Sizing human review' },
  generate, view, workedSolution,
  intro: 'Seven steps: group rates by hand, equalizing recall and seeing its price, and writing recall, a deferral count and an interval for a group metric. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Group rates by hand',
      prompt: 'In region B (200 tickets), the model gets 45 true positives, 15 false negatives, 10 false positives and 130 true negatives.',
      fields: [
        { label: 'Recall (TPR)', answer: 0.75, tolerance: 1e-9 },
        { label: 'False-positive rate (three decimals)', answer: 10 / 140, tolerance: 0.0006 },
        { label: 'Precision (three decimals)', answer: 45 / 55, tolerance: 0.0006 },
        { label: 'Selection rate', answer: 0.275, tolerance: 1e-9 },
      ],
      explain: 'Recall 45/(45 + 15) = 0.75; false-positive rate 10/(10 + 130) = 0.071; precision 45/(45 + 10) = 0.818; selection (45 + 10)/200 = 0.275. Each fairness criterion compares one of these between groups.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Equalize recall — and see the price',
      prompt: 'One pooled score, one threshold: region B’s recall is 16 points below A’s. **Change `t_b`**, region B’s threshold, until the two recalls are within 1 point, and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(17)
n = 3000
group = np.where(rng.random(n) < 0.6, "A", "B")
y = (rng.random(n) < np.where(group == "A", 0.2, 0.35)).astype(int)
signal = np.where(y == 1, 1.5, -1.5) + np.where(group == "A", 0.8, 1.6) * rng.normal(size=n)
a = b = 0.0
for _ in range(400):                                       # one pooled logistic score
    e = 1 / (1 + np.exp(-(a * signal + b))) - y
    a -= 0.5 * np.mean(e * signal); b -= 0.5 * np.mean(e)
score = 1 / (1 + np.exp(-(a * signal + b)))

t_b = 0.5                                                  # region B's threshold (A's stays 0.5)
flag = np.where(group == "A", score >= 0.5, score >= t_b)
def recall(g): return float(np.mean(flag[(group == g) & (y == 1)]))
def fpr(g): return float(np.mean(flag[(group == g) & (y == 0)]))
recall_a, recall_b, fpr_b = recall("A"), recall("B"), fpr("B")
print(f"t_b = {t_b}: recall A {recall_a:.3f}, B {recall_b:.3f}; false-positive rate B {fpr_b:.3f}")`,
      probe: ['t_b', 'recall_a', 'recall_b', 'fpr_b'],
      evaluate: evaluateThreshold,
      done: 'Whether a group-specific threshold is appropriate — or permitted — depends on law and context. Write down the choice and why.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in recall',
      prompt: 'Replace `___` with the recall of predictions `pred` against labels `y` (both arrays of 0s and 1s).',
      starter: `import numpy as np

def recall(y, pred):
    """The share of truly positive cases (y == 1) that the model flags (pred == 1)."""
    return ___`,
      hint: 'Count the cases with y == 1 and pred == 1, and divide by the cases with y == 1.',
      solution: 'return np.sum((pred == 1) & (y == 1)) / np.sum(y == 1)',
      check: { fn: 'recall', args: ['y', 'pred'], ints: ['y', 'pred'], cases: TPR_CASES, describe: c => `y [${c.y.join(', ')}], pred [${c.pred.join(', ')}]`, diagnose: diagnoseTpr },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For scores [0.05, 0.42, 0.5, 0.61, 0.97] and a band of ±0.1 this returns **3**; only 0.42 and 0.5 are within 0.1 of 0.5. Fix it.',
      starter: `import numpy as np

def n_deferred(scores, width):
    """How many scores fall in the review band: within width of 0.5."""
    return int(np.sum(scores - 0.5 <= width))`,
      hint: 'The band extends on both sides of 0.5.',
      solution: 'return int(np.sum(np.abs(scores - 0.5) <= width))',
      check: { fn: 'n_deferred', args: ['scores', 'width'], cases: DEFER_CASES, describe: c => `scores [${c.scores.join(', ')}], band ±${c.width}`, diagnose: diagnoseDefer },
      explainChoice: {
        prompt: 'Why send the scores near 0.5 to a person, rather than the lowest or the highest?',
        options: [
          { text: 'Near the threshold the model is least sure and makes most of its mistakes; confident scores far from 0.5 are usually right, so automating them costs little.', correct: true },
          { text: 'Because scores near 0.5 are the most urgent tickets.', feedback: 'Urgency is the label; a score near 0.5 means the model cannot tell.' },
          { text: 'To keep the review queue empty.', feedback: 'The band is sized to the reviewers available, not to zero.' },
          { text: 'Because the model is miscalibrated only near 0.5.', feedback: 'Calibration can be off anywhere (31.2); the band is about uncertainty of the decision.' },
        ],
        rightFeedback: 'In the cell, the model is right on only about 59% of the tickets in the band, against about 94% of the automated ones.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'An interval for a group metric',
      prompt: 'Write `wilson` from its contract.',
      starter: `import numpy as np

def wilson(k, n, z=1.96):
    """A 95% Wilson interval for a proportion k/n, as [low, high]:
    centre = (p + z²/(2n)) / (1 + z²/n)
    half   = z · sqrt(p(1 − p)/n + z²/(4n²)) / (1 + z²/n),   with p = k/n.

    Example: wilson(21, 30)  ->  [0.521, 0.833]  (rounded)
    """
    pass   # replace with your code`,
      hint: 'Compute p, then centre and half from the formulas; return [centre − half, centre + half].',
      solution: 'p = k / n\ncentre = (p + z * z / (2 * n)) / (1 + z * z / n)\nhalf = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)\nreturn [centre - half, centre + half]',
      check: { fn: 'wilson', args: ['k', 'n'], ints: ['k', 'n'], cases: WILSON_CASES, describe: c => `${c.k} of ${c.n}`, diagnose: diagnoseWilson },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New regions, teams and review queues. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
