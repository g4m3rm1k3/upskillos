import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 30 practice ladder: PSI, alert days with persistence and label delay, and alert thresholds.

export const psiOf = (e, a) => e.reduce((t, ei, i) => t + (a[i] - ei) * Math.log(a[i] / ei), 0)
export function alertDaysOf(series, threshold, persist) {
  const out = []; let run = 0
  series.forEach((v, i) => { run = v > threshold ? run + 1 : 0; if (run === persist) out.push(i) })
  return out
}
export const errorAlertDayOf = (errors, threshold, persist, delay) => { const d = alertDaysOf(errors, threshold, persist)[0]; return d === undefined ? -1 : d + delay }

const PSI_CASES = [
  { e: [0.5, 0.5], a: [0.7, 0.3] },
  { e: [0.5, 0.5], a: [0.5, 0.5] },
  { e: [0.25, 0.25, 0.25, 0.25], a: [0.1, 0.2, 0.3, 0.4] },
  { e: [0.2, 0.8], a: [0.6, 0.4] },
].map(c => ({ ...c, expected: psiOf(c.e, c.a) }))
const ALERT_CASES = [
  { series: [0, 1, 1, 1, 1, 0], threshold: 0.5, persist: 2 },
  { series: [0.3, 0.2, 0.4, 0.1], threshold: 0.25, persist: 1 },
  { series: [1, 1, 0, 1, 1, 1, 0, 1, 1], threshold: 0.5, persist: 2 },
  { series: [1, 0, 1, 0, 1, 0], threshold: 0.5, persist: 2 },
].map(c => ({ ...c, expected: alertDaysOf(c.series, c.threshold, c.persist) }))
const bad = (n, from, lo = 8.8, hi = 12.3) => Array.from({ length: n }, (_, i) => (i >= from ? hi : lo))
export const DELAY_CASES = [
  { errors: bad(60, 25), threshold: 10, persist: 2, delay: 7 },
  { errors: bad(60, 25), threshold: 10, persist: 2, delay: 0 },
  { errors: bad(60, 40), threshold: 10, persist: 3, delay: 5 },
  { errors: bad(30, 99), threshold: 10, persist: 2, delay: 7 },
  { errors: [9, 11, 9, 11, 11, 11, 9], threshold: 10, persist: 3, delay: 1 },
].map(c => ({ ...c, expected: errorAlertDayOf(c.errors, c.threshold, c.persist, c.delay) }))

export function diagnosePsi(c, got) {
  const kl = c.e.reduce((t, ei, i) => t + c.a[i] * Math.log(c.a[i] / ei), 0)
  if (Math.abs(got.value - kl) < 1e-9 && Math.abs(kl - c.expected) > 1e-9) return 'Each term is (a − e) · ln(a/e), not a · ln(a/e): the difference of the shares weights the log ratio.'
  if (Math.abs(got.value + c.expected) < 1e-9 && c.expected > 1e-9) return 'The sign is flipped: pair (a − e) with ln(a/e), so every term is ≥ 0.'
  return null
}
export function diagnoseAlerts(c, got) {
  const every = c.series.map((v, i) => i).filter(i => { let k = 0; for (let j = i; j >= 0 && c.series[j] > c.threshold; j--) k++; return k >= c.persist })
  if (Array.isArray(got.value) && got.value.length === every.length && got.value.every((v, i) => v === every[i]) && every.length !== c.expected.length) return 'This alerts on every day of an episode after the first N. Fire once, when the run first reaches N (`run == persist`), and again only after the metric recovers.'
  return null
}
export function diagnoseDelay(c, got) {
  const d = alertDaysOf(c.errors, c.threshold, c.persist)[0]
  if (d !== undefined && got.value === d && c.delay > 0) return 'That is the day the problem happened, not the day you can know it: add the label delay.'
  const first = c.errors.findIndex(v => v > c.threshold)
  if (first >= 0 && got.value === first + c.delay && c.persist > 1 && d !== first) return 'The alert needs N consecutive bad days, so it can fire only on the N-th one.'
  return null
}
export function evaluateThreshold(vars) {
  const miss = needVars(vars, ['threshold', 'false_alarms', 'detected_day'])
  if (miss) return { passed: false, message: miss }
  const fa = Number(vars.false_alarms.value), det = Number(vars.detected_day.value), th = Number(vars.threshold.value)
  if (fa > 3) return { passed: false, message: `${fa} false alarms before day 300 with threshold ${r3(th)}: with 80 values per day, PSI is above 0.1 on most quiet days. Set \`threshold = float(np.percentile(quiet, 99))\` — the 99th percentile of last year’s quiet days — and run again.` }
  if (det < 300 || det > 305) return { passed: false, message: `The threshold ${r3(th)} is so high that the real shift (from day 300) is ${det < 0 ? 'never detected' : `detected only on day ${det}`}. Use the 99th percentile of the quiet year.` }
  return { passed: true, message: `Threshold ${r3(th)}: ${fa} false alarms before day 300, and the real shift detected on day ${det}. A threshold learned from the statistic’s own quiet behaviour, not a rule of thumb.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['psi', 'alertday', 'falsealarms']
export function generate(template, seed) {
  const g = rng(seed * 211 + TEMPLATES.indexOf(template) * 4099 + 31)
  if (template === 'psi') {
    const e = g.pick([0.3, 0.4, 0.5, 0.6]), a = g.pick([0.2, 0.3, 0.5, 0.7, 0.8].filter(x => x !== e)), answer = psiOf([e, 1 - e], [a, 1 - a])
    const half = (a - e) * Math.log(a / e)
    return { template, seed, e, a, answer, misconceptions: [{ answer: half, feedback: 'Both bins contribute: add the term of the second bin too.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  if (template === 'alertday') {
    const start = g.pick([10, 20, 25, 30, 40]), persist = g.pick([1, 2, 3]), delay = g.pick([0, 3, 5, 7, 14]), answer = start + persist - 1 + delay
    return { template, seed, start, persist, delay, answer, misconceptions: [{ answer: start + persist - 1, feedback: 'The labels arrive late: add the delay.' }, { answer: start + delay, feedback: 'Persistence N means the alert fires on the N-th consecutive bad day.' }].filter(m => m.answer !== answer) }
  }
  const days = g.pick([90, 180, 365]), pct = g.pick([95, 99, 99.5]), answer = days * (1 - pct / 100)
  return { template, seed, days, pct, answer, misconceptions: [{ answer: days * pct / 100, feedback: 'That is the number of quiet days below the threshold. A false alarm is a quiet day above it.' }] }
}
export function view(p) {
  if (p.template === 'psi') return { intro: `A binary feature’s shares move from (${p.e}, ${r3(1 - p.e)}) in the reference to (${p.a}, ${r3(1 - p.a)}) today.`, questions: [{ id: 'p', type: 'number', label: 'What is the PSI? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'alertday') return { intro: `A change starts on day ${p.start} and makes every later day bad. The error alert needs ${p.persist} consecutive bad day${p.persist > 1 ? 's' : ''}, and labels arrive ${p.delay} day${p.delay === 1 ? '' : 's'} late.`, questions: [{ id: 'd', type: 'number', label: 'On which day can the error alert fire at the earliest?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `An alert with persistence 1 has its threshold at the ${p.pct}th percentile of a quiet period. The next ${p.days} days are quiet too.`, questions: [{ id: 'f', type: 'number', label: 'How many false alarms do you expect? (One decimal.)', answer: p.answer, tolerance: 0.06, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'psi') return `(${p.a} − ${p.e}) · ln(${p.a}/${p.e}) + (${r3(1 - p.a)} − ${r3(1 - p.e)}) · ln(${r3(1 - p.a)}/${r3(1 - p.e)}) = **${Math.round(p.answer * 1000) / 1000}**.`
  if (p.template === 'alertday') return `The ${['first', 'second consecutive', 'third consecutive'][p.persist - 1]} bad day is day ${p.start + p.persist - 1}; its labels arrive ${p.delay} days later: **${p.answer}**.`
  return `Each quiet day exceeds the ${p.pct}th percentile with probability ${r3(1 - p.pct / 100)}: ${p.days} × ${r3(1 - p.pct / 100)} = **${Math.round(p.answer * 10) / 10}**.`
}

export const monitor = {
  title: 'Monitoring: PSI, alerts and delayed labels',
  version: 1,
  templates: TEMPLATES,
  templateNames: { psi: 'PSI of a binary feature', alertday: 'When can the alert fire?', falsealarms: 'Expected false alarms' },
  generate, view, workedSolution,
  intro: 'Seven steps: monitoring arithmetic by hand, a noisy alert fixed, and writing PSI, an alert rule and the day a delayed error alert can fire. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Monitoring arithmetic by hand',
      prompt: 'Runner shares move from (0.5, 0.5) to (0.6, 0.4). Separately, a change starts on day 30 and every later day is bad.',
      fields: [
        { label: 'PSI of the runner shares (three decimals)', answer: 0.0405, tolerance: 0.0006 },
        { label: 'Alert day with persistence 3 and immediate labels', answer: 32 },
        { label: 'Alert day with persistence 3 and labels 5 days late', answer: 37 },
        { label: 'Expected false alarms per 365 quiet days, threshold at the 99th percentile, persistence 1 (one decimal)', answer: 3.65, tolerance: 0.06 },
      ],
      explain: '0.1 · ln 1.2 + (−0.1) · ln 0.8 = 0.018 + 0.022 = 0.041. Days 30, 31, 32 are the three consecutive bad days, so the alert fires on day 32 — or on day 37 when day 32’s labels arrive 5 days later. 1% of 365 quiet days is 3.65.',
    },
    {
      id: 'agree', kind: 'probe', title: 'An alert people can trust',
      prompt: 'An input-drift alert uses the 0.1 rule of thumb on daily PSI of 80 values. Run it: dozens of false alarms. **Set `threshold = float(np.percentile(quiet, 99))`** — learned from last year’s quiet days — and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(30)
reference = rng.normal(size=3000)
edges = np.quantile(reference, np.linspace(0, 1, 11)[1:-1])
def psi(current):
    e = np.full(10, 0.1)
    a = np.maximum(np.bincount(np.searchsorted(edges, current), minlength=10) / len(current), 1e-4)
    return float(np.sum((a - e) * np.log(a / e)))

quiet = np.array([psi(rng.normal(size=80)) for _ in range(365)])            # last year: nothing changed
year = np.array([psi(rng.normal(1.0 if d >= 300 else 0.0, 1, 80)) for d in range(365)])   # this year: a real shift from day 300

threshold = 0.1                                                             # the rule of thumb
persist = 2
days, run = [], 0
for d, v in enumerate(year):
    run = run + 1 if v > threshold else 0
    if run == persist: days.append(d)
false_alarms = sum(d < 300 for d in days)
detected_day = next((d for d in days if d >= 300), -1)
print(f"threshold {threshold:.3f}: {false_alarms} false alarms before day 300; the real shift detected on day {detected_day}")`,
      probe: ['threshold', 'false_alarms', 'detected_day'],
      evaluate: evaluateThreshold,
      done: 'In practice, recompute the quiet-period threshold whenever the daily sample size changes: the noise of PSI depends on it.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in PSI',
      prompt: 'Replace `___` with the PSI of shares `a` against reference shares `e` (both NumPy arrays, already floored above 0).',
      starter: `import numpy as np

def psi(e, a):
    """Population Stability Index of current shares a against reference shares e."""
    return ___`,
      hint: 'Sum over the bins of (a − e) times ln(a / e).',
      solution: 'return np.sum((a - e) * np.log(a / e))',
      check: { fn: 'psi', args: ['e', 'a'], cases: PSI_CASES, describe: c => `(${c.e.join(', ')}) → (${c.a.join(', ')})`, diagnose: diagnosePsi },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For the series [0, 1, 1, 1, 1, 0] with threshold 0.5 and persistence 2 this returns **[2, 3, 4]**: three alerts for one episode. It should return [2]. Fix it.',
      starter: `def alert_days(series, threshold, persist):
    """The days on which a run of consecutive values above the threshold reaches length persist."""
    days, run = [], 0
    for d, v in enumerate(series):
        run = run + 1 if v > threshold else 0
        if run >= persist:
            days.append(d)
    return days`,
      hint: 'An alert should fire once, on the day the run first reaches its required length.',
      solution: 'if run == persist:',
      check: { fn: 'alert_days', args: ['series', 'threshold', 'persist'], ints: ['persist'], cases: ALERT_CASES, describe: c => `series [${c.series.join(', ')}], threshold ${c.threshold}, persistence ${c.persist}`, diagnose: diagnoseAlerts },
      explainChoice: {
        prompt: 'Why fire once per episode rather than every day the metric stays high?',
        options: [
          { text: 'One problem should page people once. Repeated alerts for the same episode are noise — and noise trains people to ignore alerts, including the next real one.', correct: true },
          { text: 'Because the metric cannot stay above the threshold for long.', feedback: 'It can: a real shift keeps it high for as long as it lasts.' },
          { text: 'To make the alert fire later.', feedback: 'The first alert fires on the same day either way; only the repeats disappear.' },
          { text: 'Because persistence already removes all false alarms.', feedback: 'Persistence filters one-day noise; it says nothing about repeats within a real episode.' },
        ],
        rightFeedback: 'The episode stays visible on the dashboard; the alert is for the moment it starts.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'When can the error alert fire?',
      prompt: 'Write `error_alert_day` from its contract.',
      starter: `def error_alert_day(errors, threshold, persist, delay):
    """errors[t] is the model's error on the predictions of day t; it becomes known on day t + delay.
    Return the first day on which an alert can fire — when a run of persist consecutive
    days with error above threshold is complete and known — or -1 if it never fires.

    Example: errors 8.8 until day 24 and 12.3 from day 25, threshold 10, persist 2, delay 7  ->  33
    """
    pass   # replace with your code`,
      hint: 'Find the day d on which the run of bad days first reaches persist; you learn about it on day d + delay.',
      solution: 'run = 0\nfor d, v in enumerate(errors):\n    run = run + 1 if v > threshold else 0\n    if run == persist:\n        return d + delay\nreturn -1',
      check: { fn: 'error_alert_day', args: ['errors', 'threshold', 'persist', 'delay'], ints: ['persist', 'delay'], cases: DELAY_CASES, describe: c => `${c.errors.length} days, threshold ${c.threshold}, persistence ${c.persist}, delay ${c.delay}`, diagnose: diagnoseDelay },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New shares, timelines and thresholds. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
