import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 09 practice ladder: confusion counts, precision and recall, and a threshold chosen by cost rather
// than accuracy. Expected values computed by hand and with NumPy; tests recompute them.

export const countsOf = (y, alert) => [0, 0, 0, 0].map((_, k) => y.filter((yi, i) => [alert[i] && yi, alert[i] && !yi, !alert[i] && yi, !alert[i] && !yi][k]).length)   // TP, FP, FN, TN
export function bestOf(y, s, cfp, cfn) {
  const ts = [...new Set(s)].sort((a, b) => a - b)
  const cost = t => cfp * y.filter((yi, i) => s[i] >= t && !yi).length + cfn * y.filter((yi, i) => s[i] < t && yi).length
  return ts.reduce((best, t) => (cost(t) < cost(best) ? t : best), ts[0])
}
const PR_CASES = [
  { y: [1, 0, 1, 1, 0, 0], alert: [1, 1, 1, 0, 0, 0] }, { y: [1, 1, 0, 0], alert: [1, 0, 0, 0] },
  { y: [0, 1, 0, 1, 1], alert: [1, 1, 1, 1, 0] }, { y: [1, 1, 1], alert: [1, 1, 1] },
].map(c => { const [tp, fp, fn] = countsOf(c.y, c.alert); return { ...c, expected: [tp / (tp + fp), tp / (tp + fn)] } })
const COUNT_CASES = PR_CASES.map(c => ({ y: c.y, alert: c.alert, expected: countsOf(c.y, c.alert) }))
const BEST_CASES = [
  { y: [1, 0, 1, 1, 0, 0], s: [0.9, 0.8, 0.6, 0.4, 0.3, 0.1], cfp: 1, cfn: 10 },
  { y: [1, 0, 1, 1, 0, 0], s: [0.9, 0.8, 0.6, 0.4, 0.3, 0.1], cfp: 10, cfn: 1 },
  { y: [0, 0, 1, 0, 1], s: [0.2, 0.4, 0.5, 0.7, 0.9], cfp: 1, cfn: 1 },       // a tie: the smaller threshold wins
  { y: [1, 1, 0], s: [0.3, 0.6, 0.2], cfp: 1, cfn: 5 },
].map(c => ({ ...c, expected: bestOf(c.y, c.s, c.cfp, c.cfn) }))
const show = v => `[${v.join(', ')}]`

export function diagnosePR(c, got) {
  const [tp, fp, fn] = countsOf(c.y, c.alert), v = got.value
  if (!v || v.length !== 2) return 'Return [precision, recall].'
  if (Math.abs(v[0] - tp / (tp + fn)) < 1e-9 && Math.abs(tp / (tp + fn) - tp / (tp + fp)) > 1e-9) return 'The two are swapped: precision divides by the alerts (TP + FP), recall by the real positives (TP + FN).'
  return null
}
export function diagnoseCounts(c, got) {
  const v = got.value, [tp, fp, fn, tn] = c.expected
  if (v?.length === 4 && v[1] === fn && v[2] === fp && fp !== fn) return 'FP and FN are swapped. A false positive is an alert on a negative (alert = 1, y = 0); a false negative is a missed positive.'
  return null
}
export function diagnoseBest(c, got) {
  const v = got.value, ts = [...new Set(c.s)].sort((a, b) => a - b)
  const acc = t => c.y.filter((yi, i) => (c.s[i] >= t ? 1 : 0) === yi).length
  const byAcc = ts.reduce((b, t) => (acc(t) > acc(b) ? t : b), ts[0])
  if (Math.abs(v - byAcc) < 1e-12 && byAcc !== c.expected) return 'That threshold maximizes accuracy, which treats both errors as equally costly. Minimize C_FP·FP + C_FN·FN.'
  const swapped = bestOf(c.y, c.s, c.cfn, c.cfp)
  if (Math.abs(v - swapped) < 1e-12 && swapped !== c.expected) return 'The two costs are swapped: C_FP multiplies false positives (alerts on negatives), C_FN false negatives (missed positives).'
  const last = ts.reduce((b, t) => { const k = t2 => c.cfp * c.y.filter((yi, i) => c.s[i] >= t2 && !yi).length + c.cfn * c.y.filter((yi, i) => c.s[i] < t2 && yi).length; return k(t) <= k(b) ? t : b }, ts[0])
  if (Math.abs(v - last) < 1e-12 && last !== c.expected) return 'On a tie the contract keeps the smaller threshold; use a strict < when comparing costs.'
  return null
}
export function evaluateCost(vars) {
  const miss = needVars(vars, ['y', 'scores', 'thresholds', 'chosen'])
  if (miss) return { passed: false, message: miss }
  const y = vars.y.value, s = vars.scores.value, ts = vars.thresholds.value, ch = Number(vars.chosen.value), n = y.length
  const cost = t => (y.filter((yi, i) => s[i] >= t && !yi).length + 10 * y.filter((yi, i) => s[i] < t && yi).length) / n
  const acc = t => y.filter((yi, i) => (s[i] >= t ? 1 : 0) === yi).length / n
  const byCost = ts.reduce((b, t) => (cost(t) < cost(b) ? t : b), ts[0]), byAcc = ts.reduce((b, t) => (acc(t) > acc(b) ? t : b), ts[0])
  if (Math.abs(ch - byAcc) < 1e-12 && byAcc !== byCost) return { passed: false, message: `Threshold ${ch} has the best accuracy, ${r3(acc(ch))}, and an expected cost of ${r3(cost(ch))} per case. A missed incident costs 10 times a false alarm; choose the threshold with the lowest \`costs\` instead.` }
  if (Math.abs(ch - byCost) > 1e-12) return { passed: false, message: `\`chosen\` should be the threshold with the lowest expected cost, ${byCost}.` }
  return { passed: true, message: `Threshold ${ch}: expected cost ${r3(cost(ch))} per case against ${r3(cost(byAcc))} at the accuracy-best threshold ${byAcc}. Theory predicts C_FP/(C_FP + C_FN) = 1/11 ≈ 0.09 for calibrated scores.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['precision', 'bayesT', 'cost']
export function generate(template, seed) {
  const g = rng(seed * 1181 + TEMPLATES.indexOf(template) * 8009 + 3)
  if (template === 'precision') {
    for (let a = 0; a < 100; a++) {
      const tp = g.int(5, 60), fp = g.int(2, 80), fn = g.int(2, 40), ask = g.pick(['precision', 'recall'])
      const answer = ask === 'precision' ? tp / (tp + fp) : tp / (tp + fn), other = ask === 'precision' ? tp / (tp + fn) : tp / (tp + fp)
      if (Math.abs(answer - other) < 0.002) continue
      return { template, seed, tp, fp, fn, ask, answer, misconceptions: [{ answer: other, feedback: ask === 'precision' ? 'That is recall. Precision asks: of the alerts, how many were real? Divide by TP + FP.' : 'That is precision. Recall asks: of the real incidents, how many were caught? Divide by TP + FN.' }] }
    }
  }
  if (template === 'bayesT') {
    const cfp = g.pick([1, 2, 5]), cfn = g.pick([5, 10, 20, 50]), answer = cfp / (cfp + cfn)
    return { template, seed, cfp, cfn, answer, misconceptions: [{ answer: cfn / (cfp + cfn), feedback: 'The costs are the wrong way round: alert when p > C_FP/(C_FP + C_FN).' }, { answer: 0.5, feedback: '0.5 is right only when both errors cost the same.' }, { answer: cfp / cfn, feedback: 'Divide by the sum of the costs, C_FP + C_FN.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  const n = g.pick([500, 1000, 2000]), fp = g.int(10, 80), fn = g.int(1, 12), cfp = g.pick([1, 2]), cfn = g.pick([10, 20, 50]), answer = (cfp * fp + cfn * fn) / n
  return { template, seed, n, fp, fn, cfp, cfn, answer, misconceptions: [{ answer: (cfp * fn + cfn * fp) / n, feedback: 'The costs are attached to the wrong errors.' }, { answer: cfp * fp + cfn * fn, feedback: 'That is the total cost; divide by the number of cases.' }].filter(m => Math.abs(m.answer - answer) > 1e-9) }
}
export function view(p) {
  if (p.template === 'precision') return { intro: `An alert system: ${p.tp} true positives, ${p.fp} false positives, ${p.fn} false negatives.`, questions: [{ id: 'm', type: 'number', label: `What is its **${p.ask}**? (Three decimals.)`, answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'bayesT') return { intro: `A false alarm costs ${p.cfp}; a missed incident costs ${p.cfn}. The model’s probabilities are calibrated.`, questions: [{ id: 't', type: 'number', label: 'Above what probability should it alert to minimize expected cost? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `On ${p.n} cases a threshold gives ${p.fp} false alarms (cost ${p.cfp} each) and ${p.fn} misses (cost ${p.cfn} each).`, questions: [{ id: 'c', type: 'number', label: 'What is the expected cost **per case**? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'precision') return p.ask === 'precision' ? `TP/(TP + FP) = ${p.tp}/${p.tp + p.fp} = **${r3(p.answer)}**.` : `TP/(TP + FN) = ${p.tp}/${p.tp + p.fn} = **${r3(p.answer)}**.`
  if (p.template === 'bayesT') return `Alerting costs (1 − p)·${p.cfp}; staying quiet costs p·${p.cfn}. Alert when p > ${p.cfp}/(${p.cfp} + ${p.cfn}) = **${r3(p.answer)}**.`
  return `(${p.cfp}×${p.fp} + ${p.cfn}×${p.fn})/${p.n} = ${p.cfp * p.fp + p.cfn * p.fn}/${p.n} = **${r3(p.answer)}**.`
}

export const threshold = {
  title: 'Counts, precision, and a threshold that costs least',
  version: 1,
  templates: TEMPLATES,
  templateNames: { precision: 'Precision or recall', bayesT: 'Cost threshold', cost: 'Expected cost' },
  generate, view, workedSolution,
  intro: 'Seven steps: count a confusion matrix, choose a threshold by cost, and write the threshold search. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Count by hand',
      prompt: 'Six services scored [0.9, 0.8, 0.6, 0.4, 0.3, 0.1]; the real incidents are [1, 0, 1, 1, 0, 0]. Alert when the score is at least 0.5.',
      fields: [
        { label: 'True positives', answer: 2 },
        { label: 'False positives', answer: 1 },
        { label: 'Precision, three decimals', answer: 0.667, tolerance: 0.0006 },
        { label: 'Recall, three decimals', answer: 0.667, tolerance: 0.0006 },
      ],
      explain: 'Alerts on 0.9, 0.8 and 0.6: two are incidents (TP = 2), one is not (FP = 1); the incident at 0.4 is missed (FN = 1). Precision 2/3, recall 2/3.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Choose by cost, not accuracy',
      prompt: 'Calibrated scores for 2,000 services; a miss costs 10, a false alarm 1. This chooses the threshold with the best **accuracy**. Run it, then **choose the threshold with the lowest `costs`** and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(9)
scores = rng.beta(0.5, 4.5, 2000)                      # calibrated probabilities
y = (rng.random(2000) < scores).astype(int)            # 1 = incident
thresholds = np.round(np.arange(0.05, 0.96, 0.05), 2)
accuracy = np.array([np.mean((scores >= t) == y) for t in thresholds])
costs = np.array([(np.sum((scores >= t) & (y == 0)) * 1 + np.sum((scores < t) & (y == 1)) * 10) / len(y) for t in thresholds])
chosen = thresholds[np.argmax(accuracy)]
print("chosen threshold:", chosen, "  expected cost per case:", round(costs[thresholds == chosen][0], 3))`,
      probe: ['y', 'scores', 'thresholds', 'chosen'],
      evaluate: evaluateCost,
      done: 'Accuracy counts both errors the same; when a miss is ten times worse, the best threshold moves far down.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in precision',
      prompt: 'Recall is written; replace `___` with precision.',
      starter: `import numpy as np

def precision_recall(y, alert):
    """[precision, recall] for 0/1 arrays y (truth) and alert (decision)."""
    tp = np.sum((alert == 1) & (y == 1))
    fp = np.sum((alert == 1) & (y == 0))
    fn = np.sum((alert == 0) & (y == 1))
    precision = ___
    recall = tp / (tp + fn)
    return np.array([precision, recall])`,
      hint: 'Of the alerts, how many were real?',
      solution: 'precision = tp / (tp + fp)',
      check: { fn: 'precision_recall', args: ['y', 'alert'], cases: PR_CASES, describe: c => `y = ${show(c.y)}, alert = ${show(c.alert)}`, diagnose: diagnosePR },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For y = [1, 0, 1, 1, 0, 0] and alerts [1, 1, 1, 0, 0, 0] this reports FP = 1 and FN = 1 correctly by luck, but for y = [0, 1, 0, 1, 1] and alerts [1, 1, 1, 1, 0] it reports FP = 1, FN = 2 — the reverse of the truth. Fix it.',
      starter: `import numpy as np

def confusion(y, alert):
    """[TP, FP, FN, TN] for 0/1 arrays y (truth) and alert (decision)."""
    tp = np.sum((alert == 1) & (y == 1))
    fp = np.sum((alert == 0) & (y == 1))
    fn = np.sum((alert == 1) & (y == 0))
    tn = np.sum((alert == 0) & (y == 0))
    return np.array([tp, fp, fn, tn])`,
      hint: 'A false positive is an alert that was wrong. Which alert value and which truth value is that?',
      solution: 'fp = np.sum((alert == 1) & (y == 0))\nfn = np.sum((alert == 0) & (y == 1))',
      check: { fn: 'confusion', args: ['y', 'alert'], cases: COUNT_CASES, describe: c => `y = ${show(c.y)}, alert = ${show(c.alert)}`, diagnose: diagnoseCounts },
      explainChoice: {
        prompt: 'What would this bug have done to a cost-based threshold?',
        options: [
          { text: 'It charges false-alarm costs to misses and miss costs to false alarms, so the “cheapest” threshold would be tuned for the opposite of the real trade-off.', correct: true },
          { text: 'Nothing: FP and FN are symmetric.', feedback: 'Only when their costs are equal — and here a miss costs ten times a false alarm.' },
          { text: 'It changes accuracy.', feedback: 'Accuracy uses TP + TN, which the bug did not touch — so accuracy would not reveal it.' },
          { text: 'It changes TP.', feedback: 'TP is computed correctly.' },
        ],
        rightFeedback: 'Naming the errors by what the model did (alert) and what was true (y) avoids this.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the threshold search',
      prompt: 'Write `best_threshold` from its contract.',
      starter: `import numpy as np

def best_threshold(y, scores, c_fp, c_fn):
    """Among the distinct score values (alert when score >= t), return the threshold with the lowest
    total cost c_fp·FP + c_fn·FN. On a tie, return the smaller threshold.

    Example: best_threshold(np.array([1., 1., 0.]), np.array([0.3, 0.6, 0.2]), 1, 5)  ->  0.3
    """
    pass   # replace with your code`,
      hint: 'Loop over np.unique(scores) (already sorted), compute the cost at each, keep the first minimum.',
      solution: 'ts = np.unique(scores)\ncosts = [c_fp * np.sum((scores >= t) & (y == 0)) + c_fn * np.sum((scores < t) & (y == 1)) for t in ts]\nreturn ts[int(np.argmin(costs))]',
      check: { fn: 'best_threshold', args: ['y', 's', 'cfp', 'cfn'], cases: BEST_CASES, describe: c => `scores ${show(c.s)}, C_FP = ${c.cfp}, C_FN = ${c.cfn}`, diagnose: diagnoseBest },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New systems and costs. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
