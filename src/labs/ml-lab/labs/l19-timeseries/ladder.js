import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 19 practice ladder: autocorrelation, forecast indices that respect the origin, and the lag table.

const mean = a => a.reduce((s, v) => s + v, 0) / a.length
export function acfOf(y, k) {
  const m = mean(y), d = y.map(v => v - m), den = d.reduce((s, v) => s + v * v, 0)
  let num = 0
  for (let t = k; t < y.length; t++) num += d[t] * d[t - k]
  return num / den
}
export const seasonalIndexOf = (t, h, s) => t + h - s * Math.ceil(h / s)
export function rowsOf(y, lags, h) {
  const out = []
  for (let t = Math.max(...lags); t + h < y.length; t++) out.push([...lags.map(l => y[t - l]), y[t + h]])
  return out
}

const ACF_CASES = [
  { y: [2, 4, 2, 4], k: 1 },
  { y: [1, 3, 2, 4], k: 1 },
  { y: [1, 2, 3, 4, 5, 6], k: 2 },
  { y: [5, 1, 5, 1, 5, 1], k: 2 },
].map(c => ({ ...c, expected: acfOf(c.y, c.k) }))
const SERIES = Array.from({ length: 80 }, (_, i) => 100 + i)       // y[i] = 100 + i, so each value names its index
const SN_CASES = [
  { t: 50, h: 5, s: 24 },
  { t: 50, h: 30, s: 24 },
  { t: 40, h: 7, s: 7 },
  { t: 30, h: 16, s: 7 },
].map(c => ({ ...c, y: SERIES, expected: SERIES[seasonalIndexOf(c.t, c.h, c.s)] }))
export const ROW_CASES = [
  { y: [10, 11, 12, 13, 14, 15], lags: [0, 1], h: 1 },
  { y: [5, 3, 8, 1, 9, 2, 7], lags: [0, 2], h: 2 },
  { y: [1, 2, 3, 4, 5, 6, 7, 8], lags: [0, 1, 3], h: 3 },
  { y: [4, 4, 6, 6, 8], lags: [1], h: 1 },
].map(c => ({ ...c, expected: rowsOf(c.y, c.lags, c.h) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : Math.abs(v - b[i]) < 1e-9))
export function diagnoseAcf(c, got) {
  const m = mean(c.y), d = c.y.map(v => v - m), den = d.reduce((s, v) => s + v * v, 0)
  if (Math.abs(got.value - c.expected * den) < 1e-9 && den !== 1) return 'That is the numerator alone. Divide by Σ(y_t − ȳ)².'
  let raw = 0; for (let t = c.k; t < c.y.length; t++) raw += c.y[t] * c.y[t - c.k]
  if (Math.abs(got.value - raw / c.y.reduce((s, v) => s + v * v, 0)) < 1e-9) return 'Subtract the mean first: autocorrelation compares deviations from ȳ.'
  return null
}
export function diagnoseSn(c, got) {
  const naive = c.t + c.h - c.s
  if (got.value === c.y[naive] && naive > c.t) return `That value is y[${naive}], later than the origin t = ${c.t}: it is not known yet. Go back whole seasons until the index is at or before t.`
  return null
}
export function diagnoseRows(c, got) {
  if (!Array.isArray(got.value)) return null
  if (got.value.length === c.expected.length + c.h) return `There are ${c.expected.length + c.h} rows, but the last ${c.h} have no target yet: the origin t must satisfy t + h ≤ ${c.y.length - 1}.`
  const plus = []
  for (let t = Math.max(...c.lags); t + c.h < c.y.length; t++) plus.push([...c.lags.map(l => c.y[t + l]), c.y[t + c.h]])
  if (near(got.value, plus)) return 'The lag features read FORWARD from the origin (t + l). A lag looks back: y[t − l].'
  return null
}
export function evaluateWindow(vars) {
  const miss = needVars(vars, ['centered', 'backtest_mae', 'persistence_mae'])
  if (miss) return { passed: false, message: miss }
  if (Number(vars.centered.value)) return { passed: false, message: `Backtest MAE ${r3(vars.backtest_mae.value)}, against ${r3(vars.persistence_mae.value)} for persistence. But the centred window at origin t averages y[t − 1], y[t] and y[t + 1] — and y[t + 1] is the very value being forecast. Set \`centered = 0\` and run again.` }
  return { passed: true, message: `Trailing window: backtest MAE ${r3(vars.backtest_mae.value)}. Worse on paper, and the only one of the two numbers a deployed forecaster can achieve: when y[t + 1] is needed it has not happened yet.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['seasonal', 'latest', 'scaled']
export function generate(template, seed) {
  const g = rng(seed * 211 + TEMPLATES.indexOf(template) * 2003 + 47)
  if (template === 'seasonal') {
    const s = g.pick([24, 7, 12]), t = g.int(100, 900), h = g.int(1, 2 * s + 5), answer = seasonalIndexOf(t, h, s)
    return { template, seed, s, t, h, answer, misconceptions: [{ answer: t + h - s, feedback: `${t + h - s} is after the origin t = ${t}: not known yet. Go back another season.` }, { answer: t - s, feedback: 'The forecast is for t + h: take the same point of the season as the TARGET, not the origin.' }].filter(m => m.answer !== answer && !(m.answer === t + h - s && t + h - s <= t)) }
  }
  if (template === 'latest') {
    const t = g.int(200, 900), h = g.int(1, 48), answer = t - h
    return { template, seed, t, h, answer, misconceptions: [{ answer: t, feedback: `The row at origin ${t} has its target at ${t + h}, in the future. The target decides: j + h ≤ t.` }, { answer: t - h - 1, feedback: `j + h ≤ t allows equality: j = ${t - h} has its target at exactly t, which is known.` }] }
  }
  const base = g.int(30, 90) / 10, ratio = g.pick([0.5, 0.6, 0.75, 0.8, 0.9, 1.1, 1.25]), model = Math.round(base * ratio * 100) / 100, answer = model / base
  return { template, seed, model, base, answer, misconceptions: [{ answer: base / model, feedback: 'Model over baseline: below 1 means the model is better.' }, { answer: 1 - answer, feedback: 'That is the skill, 1 − scaled error. The question asks for the scaled error itself.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
}
export function view(p) {
  if (p.template === 'seasonal') return { intro: `Data with a season of s = ${p.s} steps. A seasonal-naive forecast is made at origin t = ${p.t} for horizon h = ${p.h}.`, questions: [{ id: 'i', type: 'number', label: 'Which index does it copy? (It must be known at the origin.)', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'latest') return { intro: `Walk-forward evaluation: origin t = ${p.t}, horizon h = ${p.h}.`, questions: [{ id: 'j', type: 'number', label: 'What is the latest training-row origin j whose target is already known?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `Over the same period, a model’s MAE is ${p.model}; seasonal naive’s MAE is ${p.base}.`, questions: [{ id: 'q', type: 'number', label: 'What is the scaled error (model ÷ seasonal naive)? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'seasonal') return `Go back ⌈${p.h}/${p.s}⌉ = ${Math.ceil(p.h / p.s)} season(s) from the target ${p.t + p.h}: ${p.t + p.h} − ${p.s * Math.ceil(p.h / p.s)} = **${p.answer}**, which is ≤ ${p.t}.`
  if (p.template === 'latest') return `j + ${p.h} ≤ ${p.t}, so j ≤ **${p.answer}**.`
  return `${p.model} / ${p.base} = **${r3(p.answer)}**${p.answer < 1 ? ': better than the baseline' : ': worse than the baseline'}.`
}

export const forecast = {
  title: 'Forecasting without looking ahead',
  version: 1,
  templates: TEMPLATES,
  templateNames: { seasonal: 'Seasonal-naive index', latest: 'Latest usable training row', scaled: 'Scaled error' },
  generate, view, workedSolution,
  intro: 'Seven steps: indices and an autocorrelation by hand, a window that peeks, and writing the pieces of a lag model. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Work it by hand',
      prompt: 'Hourly data with a daily cycle (s = 24). A forecast is made at origin t = 200 for horizon h = 5. Separately, the short series [1, 3, 2, 4].',
      fields: [
        { label: 'Index a persistence forecast copies', answer: 200 },
        { label: 'Index a seasonal-naive forecast copies', answer: 181 },
        { label: 'Latest training-row origin j whose target is known', answer: 195 },
        { label: 'Lag-1 autocorrelation r₁ of [1, 3, 2, 4]', answer: -0.35, tolerance: 1e-9 },
      ],
      explain: 'Persistence copies the newest value, y₂₀₀. Seasonal naive copies the same hour one day before the target: 205 − 24 = 181, before the origin. A training row at origin j has its target at j + 5, known only if j + 5 ≤ 200, so j ≤ 195. For r₁: mean 2.5, deviations −1.5, 0.5, −0.5, 1.5; Σ squares = 5; neighbour products (0.5)(−1.5) + (−0.5)(0.5) + (1.5)(−0.5) = −1.75; r₁ = −1.75/5 = −0.35.',
    },
    {
      id: 'agree', kind: 'probe', title: 'A window that peeks',
      prompt: 'A one-hour-ahead forecaster uses y_t, the same hour yesterday, and a 3-hour moving average. Run it with `centered = 1` (the average is centred on the origin), then **set `centered = 0`** (trailing: the last three hours) and run again. Predict first: which backtest error is lower, and which one would the forecaster achieve in use?',
      starter: `import numpy as np
from sklearn.linear_model import LinearRegression
rng = np.random.default_rng(19)
n = 24 * 60
hours = np.arange(n)
y = 50 + 10 * np.sin(2 * np.pi * hours / 24) + np.cumsum(rng.normal(0, 1, n)) + rng.normal(0, 2, n)
h = 1

centered = 1
if centered:
    window = np.convolve(y, np.ones(3) / 3, mode="same")                  # at t: mean of y[t-1], y[t], y[t+1]
else:
    window = np.concatenate([[np.nan, np.nan], np.convolve(y, np.ones(3) / 3, mode="valid")])   # y[t-2..t]
t = np.arange(24, n - 24)
X = np.column_stack([y[t], y[t + h - 24], window[t]])
target = y[t + h]
split = int(0.75 * len(t))                                                # train on the past, test on the future
model = LinearRegression().fit(X[:split], target[:split])
backtest_mae = np.mean(np.abs(model.predict(X[split:]) - target[split:]))
persistence_mae = np.mean(np.abs(y[t[split:]] - target[split:]))
print(f"centered = {centered}: backtest MAE {backtest_mae:.3f}   (persistence {persistence_mae:.3f})")`,
      probe: ['centered', 'backtest_mae', 'persistence_mae'],
      evaluate: evaluateWindow,
      done: 'A time-ordered split did not catch this: the leak is inside the feature. Check every feature’s indices against the origin.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the autocorrelation',
      prompt: 'Replace `___` with the numerator of r_k: the sum of products of deviations k steps apart.',
      starter: `import numpy as np

def acf(y, k):
    """Lag-k autocorrelation r_k = sum_t (y_t - mean)(y_(t-k) - mean) / sum_t (y_t - mean)^2, for k >= 1."""
    d = y - y.mean()
    return ___ / np.sum(d ** 2)`,
      hint: 'd[k:] and d[:-k] line up each value with the one k steps earlier.',
      solution: 'return np.sum(d[k:] * d[:-k]) / np.sum(d ** 2)',
      check: { fn: 'acf', args: ['y', 'k'], ints: ['k'], cases: ACF_CASES, describe: c => `y = [${c.y.join(', ')}], k = ${c.k}`, diagnose: diagnoseAcf },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'In the checks y[i] = 100 + i, so each value names its index. At origin t = 50 with h = 30 and s = 24 this returns **156** — the value at index 56, six hours after the origin. It should return 132. Fix it.',
      starter: `import numpy as np

def seasonal_naive(y, t, h, s):
    """Forecast y[t + h] at origin t by copying the same point of the season, using only y[0..t]."""
    return y[t + h - s]`,
      hint: 'When h > s, one season back is still in the future. Go back ⌈h/s⌉ seasons.',
      solution: 'return y[t + h - s * int(np.ceil(h / s))]',
      check: { fn: 'seasonal_naive', args: ['y', 't', 'h', 's'], ints: ['t', 'h', 's'], cases: SN_CASES, describe: c => `t = ${c.t}, h = ${c.h}, s = ${c.s}`, diagnose: diagnoseSn },
      explainChoice: {
        prompt: 'The buggy version is right whenever h ≤ s. Why would it still be dangerous in a backtest?',
        options: [
          { text: 'At long horizons it silently uses values after the origin, so the backtest scores a forecast nobody could have made — and the baseline looks too good, which also flatters or hides problems in the models compared to it.', correct: true },
          { text: 'It is not dangerous: horizons above one season are never used.', feedback: 'Weekly and monthly planning routinely forecast beyond one daily season.' },
          { text: 'It would crash with an index error.', feedback: 'It reads a valid index — that is why the leak is silent.' },
          { text: 'It only affects the last few rows.', feedback: 'It affects every origin whenever h > s.' },
        ],
        rightFeedback: 'Leaks rarely crash. They show up only as numbers that are too good.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the lag table',
      prompt: 'Write `lag_rows` from its contract.',
      starter: `import numpy as np

def lag_rows(y, lags, h):
    """One row per origin t, from t = max(lags) up to the last t with t + h still inside y.
    Each row is [y[t - l] for l in lags] followed by the target y[t + h].

    Example: lag_rows(np.array([10., 11., 12., 13., 14., 15.]), np.array([0, 1]), 1)
             ->  array([[11., 10., 12.], [12., 11., 13.], [13., 12., 14.], [14., 13., 15.]])
    """
    pass   # replace with your code`,
      hint: 'Loop t over range(max(lags), len(y) - h); build [y[t - l] for l in lags] + [y[t + h]].',
      solution: 'return np.array([[y[t - l] for l in lags] + [y[t + h]] for t in range(max(lags), len(y) - h)])',
      check: { fn: 'lag_rows', args: ['y', 'lags', 'h'], ints: ['lags', 'h'], cases: ROW_CASES, describe: c => `${c.y.length} values, lags [${c.lags.join(', ')}], h = ${c.h}`, diagnose: diagnoseRows },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New origins, horizons and errors. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
