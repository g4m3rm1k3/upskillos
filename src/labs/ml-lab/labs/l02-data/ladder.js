import { rng, r3 } from '../../kit/ladder.js'

// Lab 02 practice ladder: learn a missing-value fill from training rows only, apply it everywhere, and
// keep a missing indicator. Expected values computed by hand and with NumPy; ladder tests recompute them
// with the independent helpers below.

const median = v => { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const mean = v => v.reduce((a, b) => a + b, 0) / v.length
const known = v => v.filter(x => x != null && !Number.isNaN(x))
export const fillOf = train => median(known(train))
export const prepareOf = (train, rows) => { const f = fillOf(train); return rows.map(v => (v == null || Number.isNaN(v)) ? [f, 1] : [v, 0]) }

const N = null   // a gap (NaN in Python)
const CASES = [
  { train: [2, N, 9, 4, 100], rows: [N, 7, 3], fill: 6.5 },
  { train: [10, 12, N, 11], rows: [N, N, 20], fill: 11 },
  { train: [1, 2, 3], rows: [4, N], fill: 2 },
  { train: [5, N, 5, 50, 6, N], rows: [N], fill: 5.5 },
].map(c => ({ ...c, expected: prepareOf(c.train, c.rows) }))
const show = v => `[${v.map(x => x == null ? 'NaN' : x).join(', ')}]`
const describe = c => `x_train = ${show(c.train)}, x_new = ${show(c.rows)}`

export function diagnosePrepare(c, got) {
  const s = got.shape ?? []
  if (s.length === 1) return 'One column only: keep the filled values AND a missing indicator, side by side — shape (n, 2).'
  if (s.join() !== `${c.rows.length},2`) return null
  const col = got.value.map(r => r[0]), ind = got.value.map(r => r[1]), gaps = c.rows.map(v => v == null)
  const filledWith = f => c.rows.every((v, i) => (gaps[i] ? Math.abs(col[i] - f) < 1e-6 : Math.abs(col[i] - v) < 1e-6))
  if (gaps.some(Boolean)) {
    const newKnown = known(c.rows), all = known([...c.train, ...c.rows])
    if (!filledWith(c.fill) && newKnown.length && filledWith(median(newKnown))) return 'The gaps were filled with the median of the NEW rows. The fill value is learned from training rows only; new rows must not shape it.'
    if (!filledWith(c.fill) && filledWith(median(all))) return 'The gaps were filled with the median of training and new rows together: the new rows leaked into a learned value.'
    if (!filledWith(c.fill) && filledWith(mean(known(c.train)))) return 'That is the training mean. The lesson uses the median: one huge value drags the mean far from most rows.'
  }
  if (ind.every((v, i) => v === (gaps[i] ? 0 : 1))) return 'The indicator is inverted: 1 should mark a value that was missing and filled.'
  return null
}

export function evaluateLeakFree(vars) {
  for (const n of ['x_train', 'x_val', 'fill', 'x_val_filled']) if (!vars[n]) return { passed: false, message: `Keep the name \`${n}\`: the check reads it after your code runs.` }
  const tr = vars.x_train.value, val = vars.x_val.value, f = Number(vars.fill.value)
  const right = fillOf(tr), leaky = fillOf([...tr, ...val])
  if (Math.abs(f - leaky) < 1e-9 && Math.abs(leaky - right) > 1e-9) return { passed: false, message: `The fill is ${r3(f)}: the median of the training AND validation values. Change it to use \`x_train\` only.` }
  if (Math.abs(f - right) > 1e-9) return { passed: false, message: `The fill should be the training median, ${r3(right)}; it is ${r3(f)}.` }
  const want = prepareOf(tr, val).map(r => r[0]), got = vars.x_val_filled.value
  if (!want.every((v, i) => Math.abs(v - got[i]) < 1e-9)) return { passed: false, message: `\`x_val_filled\` should be [${want.map(r3).join(', ')}].` }
  return { passed: true, message: `The fill ${r3(right)} came from training rows only, and the validation gap now holds that number: [${want.map(r3).join(', ')}]. The leaky version would have used ${r3(leaky)}.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
const CONTEXTS = [
  { noun: 'build', col: 'size (MB)', lo: 2, hi: 40, outlier: [300, 900] },
  { noun: 'request', col: 'latency (ms)', lo: 20, hi: 90, outlier: [800, 2500] },
  { noun: 'job', col: 'queue wait (s)', lo: 1, hi: 30, outlier: [200, 600] },
]
export const TEMPLATES = ['median', 'apply', 'leak']
export function generate(template, seed) {
  const g = rng(seed * 3571 + TEMPLATES.indexOf(template) * 50021 + 9)
  for (let attempt = 0; attempt < 300; attempt++) {
    const ctx = g.pick(CONTEXTS)
    const k = g.pick([4, 6])                                   // known training values (even: median averages two)
    const vals = Array.from({ length: k - 1 }, () => g.int(ctx.lo, ctx.hi)).concat([g.int(...ctx.outlier)])
    if (new Set(vals).size < vals.length) continue
    const train = g.shuffle([...vals, N, N])
    const f = fillOf(train), m = mean(known(train))
    const base = { template, seed, ctx, train, fill: f }
    if (template === 'median') return { ...base, answer: f, misconceptions: [{ answer: m, feedback: 'That is the mean. One very large value drags it far from most rows; the median is the safer fill.' }, { answer: median(train.map(v => v ?? 0)), feedback: 'That counted the gaps as 0. Leave them out: np.nanmedian ignores NaN.' }].filter(x => Math.abs(x.answer - f) > 1e-9) }
    const rows = g.shuffle([N, g.int(ctx.lo, ctx.hi), g.int(ctx.lo, ctx.hi)])
    const leak = fillOf([...train, ...rows]), valMed = median(known(rows))
    if (template === 'apply') {
      if (Math.abs(leak - f) < 1e-9 || Math.abs(valMed - f) < 1e-9) continue
      return { ...base, rows, answer: f, misconceptions: [{ answer: leak, feedback: 'That median used the validation rows too. The fill is learned from training rows only.' }, { answer: valMed, feedback: 'That is the validation rows’ median. Validation data must not set learned values.' }, { answer: m, feedback: 'That is the training mean; the lesson’s fill is the median.' }].filter((x, i, a) => Math.abs(x.answer - f) > 1e-9 && a.findIndex(o => Math.abs(o.answer - x.answer) < 1e-9) === i) }
    }
    const options = { train: f, all: leak, val: valMed, mean: m }
    if (new Set(Object.values(options).map(v => Math.round(v * 1000))).size < 4) continue
    const used = g.pick(Object.keys(options))
    return { ...base, rows, used, printed: options[used], answer: used, causes: g.shuffle(Object.keys(options)) }
  }
  throw new Error(`No valid ${template} problem for seed ${seed}`)
}
const LABELS = { train: 'the training median (correct)', all: 'the median of training and validation rows together (leak)', val: 'the median of the validation rows (leak)', mean: 'the training mean' }
export function view(p) {
  const { ctx, train } = p, cell = v => v == null ? 'missing' : v
  const table = { caption: 'Training rows', head: [ctx.noun, ctx.col], rows: train.map((v, i) => [`T${i + 1}`, cell(v)]) }
  if (p.template === 'median') return { intro: `A column of ${ctx.col} has gaps. The fill value is learned from these training rows.`, table, questions: [{ id: 'fill', type: 'number', label: 'What fill value should the gaps get (the median of the known values)?', answer: p.answer, misconceptions: p.misconceptions }] }
  const newRows = `The validation rows are ${p.rows.map(cell).join(', ')}.`
  if (p.template === 'apply') return { intro: `A column of ${ctx.col} has gaps. ${newRows}`, table, questions: [{ id: 'v', type: 'number', label: 'What value should the **missing validation** row get?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `A program filled the missing validation row of ${ctx.col} with **${r3(p.printed)}**. ${newRows}`, table, questions: [{ id: 'used', type: 'choice', legend: 'Which statistic did the program use?', options: p.causes.map(k => ({ value: k, label: LABELS[k] })), answer: p.used, wrong: 'Not that one. Compute each candidate — the training median, the training mean, the validation median, and the median of all rows — and compare with the printed number.' }] }
}
export function workedSolution(p) {
  const s = [...known(p.train)].sort((a, b) => a - b)
  const med = `Known training values sorted: ${s.join(', ')}. Median = (${s[s.length / 2 - 1]} + ${s[s.length / 2]}) / 2 = **${r3(p.fill)}**.`
  if (p.template === 'median') return `${med} (The mean would be ${r3(mean(s))}, pulled up by ${s[s.length - 1]}.)`
  if (p.template === 'apply') return `${med} The missing validation row gets that training value, ${r3(p.fill)}.`
  return `${med} Training mean ${r3(mean(s))}; validation median ${r3(median(known(p.rows)))}; median of all rows ${r3(fillOf([...p.train, ...p.rows]))}. The printed ${r3(p.printed)} is ${LABELS[p.used]}.`
}

export const fill = {
  title: 'Learn a fill value, apply it everywhere',
  version: 1,
  templates: TEMPLATES,
  templateNames: { median: 'Learn the fill', apply: 'Fill a new row', leak: 'Which statistic was used?' },
  generate, view, workedSolution,
  intro: 'Seven steps: compute a fill by hand, catch a leak, write the preparation function from its contract, and check new tables. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Trace the fill by hand',
      prompt: 'Training sizes: **[2, missing, 9, 4, 100]**. Validation sizes: **[missing, 7, 3]**.',
      fields: [
        { label: 'Mean of the known training values', answer: 28.75 },
        { label: 'Median of the known training values', answer: 6.5 },
        { label: 'Value the missing validation row gets', answer: 6.5 },
        { label: 'Leaky fill: median of all known values, training and validation', answer: 5.5 },
      ],
      explain: 'Known training values 2, 4, 9, 100: mean 115/4 = 28.75, median (4 + 9)/2 = 6.5. The validation gap gets 6.5. Mixing in the validation values 7 and 3 gives 2, 3, 4, 7, 9, 100, median 5.5 — a number the model would never know at deployment.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Catch the leak',
      prompt: 'This computes the fill from **all** rows. Run it, then **change the fill line so it uses `x_train` only**, and run again. Predict first: will the filled validation value go up or down?',
      starter: `import numpy as np
x_train = np.array([2, np.nan, 9, 4, 100])
x_val = np.array([np.nan, 7, 3])

fill = np.nanmedian(np.concatenate([x_train, x_val]))   # uses the validation rows too
x_val_filled = np.where(np.isnan(x_val), fill, x_val)
print("fill:", fill)
print("validation after filling:", x_val_filled)`,
      probe: ['x_train', 'x_val', 'fill', 'x_val_filled'],
      evaluate: evaluateLeakFree,
      done: 'The fill is a learned number, like a weight. It is fitted once on training rows and then applied unchanged to validation, test and future data.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the learned value',
      prompt: 'Replace `___` so the function returns the fill value learned from training rows (their median, ignoring gaps).',
      starter: `import numpy as np

def learn_fill(x_train):
    """The median of the known (non-NaN) training values."""
    return ___`,
      hint: 'NumPy has a median that ignores NaN.',
      solution: 'return np.nanmedian(x_train)',
      check: { fn: 'learn_fill', args: ['train'], cases: CASES.map(c => ({ ...c, expected: c.fill })), describe: c => `x_train = ${show(c.train)}`, diagnose: (c, got) => (Math.abs(got.value - mean(known(c.train))) < 1e-9 ? 'That is the mean; the fill is the median.' : null) },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'This runs, but for training [2, missing, 9, 4, 100] and new rows [missing, 7, 3] it fills the gap with **5** instead of **6.5**. Find the bug and fix it.',
      starter: `import numpy as np

def prepare(x_train, x_new):
    """Fill gaps in x_new with the training median; add a missing indicator. Returns shape (n, 2)."""
    fill = np.nanmedian(x_new)
    filled = np.where(np.isnan(x_new), fill, x_new)
    return np.column_stack([filled, np.isnan(x_new).astype(float)])`,
      hint: 'Which array is the fill learned from?',
      solution: 'fill = np.nanmedian(x_train)',
      check: { fn: 'prepare', args: ['train', 'rows'], cases: CASES, describe, diagnose: diagnosePrepare },
      explainChoice: {
        prompt: 'Why is the original a problem even when its numbers look reasonable?',
        options: [
          { text: 'The fill was learned from the rows being filled, so validation (and later, live) data set a learned value: validation scores become optimistic, and a single new row could not be filled at all.', correct: true },
          { text: 'The median should have been the mean.', feedback: 'The median is the lesson’s choice for skewed values; the problem is which rows it was computed from.' },
          { text: 'The indicator column should be dropped.', feedback: 'The indicator is useful: it lets the model learn that “unknown” behaves differently.' },
          { text: 'np.where changes x_new.', feedback: 'np.where returns a new array; x_new is unchanged.' },
        ],
        rightFeedback: 'Learned values come from training rows only — every time.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write it from the contract',
      prompt: 'Write `prepare` yourself. The checks include a new table with only gaps, and they check that your inputs are left unchanged.',
      starter: `import numpy as np

def prepare(x_train, x_new):
    """Fill the gaps (NaN) in x_new with the MEDIAN of the known values in x_train.
    Return an array of shape (len(x_new), 2): column 0 the filled values, column 1 a missing
    indicator (1.0 where x_new was NaN, else 0.0). Must not change x_train or x_new.

    Example:
        prepare(np.array([1., 2., 3.]), np.array([4., np.nan]))  ->  [[4., 0.], [2., 1.]]
    """
    pass   # replace with your code`,
      hint: 'Filling in place with x_new[np.isnan(x_new)] = … changes the caller’s array; build a new one with np.where.',
      solution: 'fill = np.nanmedian(x_train)\nreturn np.column_stack([np.where(np.isnan(x_new), fill, x_new), np.isnan(x_new).astype(float)])',
      check: { fn: 'prepare', args: ['train', 'rows'], cases: CASES, describe, diagnose: diagnosePrepare },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New columns with their own units. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
