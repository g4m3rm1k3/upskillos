import { rng } from '../../kit/ladder.js'

// The prediction ladder for Lab 03: from tracing one build's prediction to writing `predict`
// from its contract, solving new tables, and coming back to it days later. Every expected value
// below was computed by hand (the working is in the comment beside it); ladder.test.js recomputes
// each one with an explicit loop, independently of the learner-facing code.

const BUILDS = [[1, 1, 1], [1, 2, 4], [1, 3, 2], [1, 4, 3]]   // ones, GB, hundreds of files

// Cases for every `predict` step. They cover the lesson's table, a negative weight, more features
// than the lesson used, and a single row, so a solution that hard-codes 3 columns or 4 rows fails.
const CASES = [
  { X: BUILDS, w: [1, 2, 2], expected: [5, 13, 11, 15] },            // 1+2+2, 1+4+8, 1+6+4, 1+8+6
  { X: BUILDS, w: [0.5, -1, 3], expected: [2.5, 10.5, 3.5, 5.5] },   // .5−1+3, .5−2+12, .5−3+6, .5−4+9
  { X: [[1, 2, 1, 5]], w: [3, 1, 4, -1], expected: [4] },            // 3 + 2 + 4 − 5
  { X: [[1, 0], [1, 1], [1, 2]], w: [2, 0.5], expected: [2, 2.5, 3] },
]

const dot = (row, w) => row.reduce((s, x, j) => s + x * w[j], 0)
const same = (a, b) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= 1e-6)
const n = c => c.X.length, cols = c => c.X[0].length

// Names the likely cause of a wrong `predict` result, without showing the corrected code.
export function diagnosePredict(c, got) {
  const s = got.shape ?? []
  if (s.length === 0) return 'You returned one number for the whole table. The contract asks for one prediction per row.'
  if (s.length === 2 && s[0] === n(c) && s[1] === cols(c)) return 'One number per entry of X: each entry was multiplied by its weight, but the products in a row were never added up. Compare `*` and `@` in Lesson 03.2.'
  if (s.length === 2 && s[0] === n(c) && s[1] === 1) return 'A column of shape (n, 1) instead of a flat vector (n,). Lesson 03.1 shows why that shape silently breaks `prediction − y`.'
  if (s.length === 1 && s[0] === cols(c) && cols(c) !== n(c)) return 'One number per column, not per row: the sums ran down the columns. Which index should the loop, or the sum, run over?'
  if (s.length !== 1 || s[0] !== n(c)) return null
  const v = got.value
  if (same(v, c.X.map(r => dot(r.slice(1), c.w.slice(1))))) return `Every prediction is exactly w[0] = ${c.w[0]} too small, so the intercept never got in. Which column of X carries it?`
  if (same(v, c.X.map(r => dot(r, c.w) + c.w[0]))) return `Every prediction is exactly w[0] = ${c.w[0]} too large. The column of ones already adds the intercept once.`
  if (same(v, c.X.map(r => -dot(r, c.w)))) return 'Every prediction has the right size but the wrong sign.'
  return null
}

const describe = c => `X shape (${n(c)}, ${cols(c)}), w = [${c.w.join(', ')}]`
const predictCheck = { fn: 'predict', args: ['X', 'w'], cases: CASES, describe, diagnose: diagnosePredict }

// ---- Fresh problems -------------------------------------------------------------------------
// Three contexts with their own units, so the learner reads the table rather than the numbers.
const CONTEXTS = [
  { noun: 'delivery', labels: ['P', 'Q', 'R', 'S'], target: 'minutes', f1: 'distance (km)', f2: 'stops', b: [3, 4, 5, 6], w1: [1.5, 2, 2.5, 3], w2: [2, 3, 4, 5], x1: [1, 8], x2: [1, 5] },
  { noun: 'flat', labels: ['F1', 'F2', 'F3', 'F4'], target: 'kWh per day', f1: 'degrees below 18 °C', f2: 'people at home', b: [2, 3, 4], w1: [0.5, 1, 1.5], w2: [1, 1.5, 2, 2.5], x1: [0, 9], x2: [1, 4] },
  { noun: 'print job', labels: ['J1', 'J2', 'J3', 'J4'], target: 'seconds', f1: 'pages', f2: 'colour pages', b: [4, 5, 8, 10], w1: [2, 3, 4], w2: [5, 6, 8], x1: [2, 12], x2: [1, 6] },
]
export const TEMPLATES = ['forward', 'missing', 'debug']
const BUGS = {
  intercept: { label: 'The intercept b was left out.', apply: (m, r) => m.w1 * r[0] + m.w2 * r[1] },
  swapped: { label: 'The two feature weights were swapped.', apply: (m, r) => m.b + m.w2 * r[0] + m.w1 * r[1] },
  sign: { label: 'The second weight was subtracted instead of added.', apply: (m, r) => m.b + m.w1 * r[0] - m.w2 * r[1] },
}
const predictRow = (m, r) => m.b + m.w1 * r[0] + m.w2 * r[1]

// A problem is fully determined by (template, seed). Retries inside a seed skip degenerate draws:
// repeated rows, a zero denominator, or a planted bug that leaves the value unchanged or could be
// mistaken for another bug.
export function generate(template, seed) {
  const g = rng(seed * 7919 + TEMPLATES.indexOf(template) * 104729 + 1)
  for (let attempt = 0; attempt < 200; attempt++) {
    const ctx = g.pick(CONTEXTS), m = { b: g.pick(ctx.b), w1: g.pick(ctx.w1), w2: g.pick(ctx.w2) }
    const rows = ctx.labels.map(() => [g.int(...ctx.x1), g.int(...ctx.x2)])
    if (new Set(rows.map(r => r.join())).size < rows.length) continue
    const target = g.int(0, rows.length - 1), base = { template, seed, ctx, model: m, rows, target }
    if (template === 'forward') {
      const answer = predictRow(m, rows[target])
      return { ...base, answer, misconceptions: [
        { answer: answer - m.b, feedback: 'That leaves out the intercept b, which is added to every prediction.' },
        { answer: m.b + m.w2 * rows[target][0] + m.w1 * rows[target][1], feedback: 'Each weight belongs to its own column. Check which feature each weight multiplies.' },
      ].filter(x => Math.abs(x.answer - answer) > 1e-9) }
    }
    if (template === 'missing') {
      const r = rows[target], yhat = predictRow(m, r)
      if (r[1] === 0) continue
      const noB = (yhat - m.w1 * r[0]) / r[1]
      return { ...base, yhat, answer: m.w2, misconceptions: Math.abs(noB - m.w2) > 1e-9 ? [{ answer: noB, feedback: 'Subtract the intercept b as well before dividing: the prediction is b plus both contributions.' }] : [] }
    }
    const bug = g.pick(Object.keys(BUGS)), right = predictRow(m, rows[target]), wrong = BUGS[bug].apply(m, rows[target])
    if (Math.abs(right - wrong) < 1e-9) continue
    if (Object.keys(BUGS).some(k => k !== bug && Math.abs(BUGS[k].apply(m, rows[target]) - wrong) < 1e-9)) continue
    const shown = rows.map((r, i) => i === target ? wrong : predictRow(m, r))
    return { ...base, bug, shown, answer: ctx.labels[target], causes: g.shuffle(Object.keys(BUGS)) }
  }
  throw new Error(`No valid ${template} problem for seed ${seed}`)
}

const num = v => String(Math.round(v * 1000) / 1000)
export function workedSolution(p) {
  const { ctx, model: m, rows, target } = p, r = rows[target], L = ctx.labels[target]
  if (p.template === 'forward') return `ŷ = b + w₁·x₁ + w₂·x₂ = ${m.b} + ${m.w1}×${r[0]} + ${m.w2}×${r[1]} = ${m.b} + ${num(m.w1 * r[0])} + ${num(m.w2 * r[1])} = **${num(p.answer)}** ${ctx.target}.`
  if (p.template === 'missing') return `${num(p.yhat)} = ${m.b} + ${m.w1}×${r[0]} + w₂×${r[1]}, so w₂×${r[1]} = ${num(p.yhat)} − ${m.b} − ${num(m.w1 * r[0])} = ${num(p.yhat - m.b - m.w1 * r[0])}, and w₂ = **${num(m.w2)}**.`
  return `Recompute each row: ${ctx.labels.map((l, i) => `${l}: ${m.b} + ${m.w1}×${rows[i][0]} + ${m.w2}×${rows[i][1]} = ${num(predictRow(m, rows[i]))}`).join('; ')}. Only **${L}** disagrees with the table (${num(p.shown[target])}). ${BUGS[p.bug].label} ${p.bug === 'intercept' ? `${num(p.shown[target])} is ${m.w1}×${r[0]} + ${m.w2}×${r[1]}.` : p.bug === 'swapped' ? `${num(p.shown[target])} is ${m.b} + ${m.w2}×${r[0]} + ${m.w1}×${r[1]}.` : `${num(p.shown[target])} is ${m.b} + ${m.w1}×${r[0]} − ${m.w2}×${r[1]}.`}`
}
export const bugLabel = key => BUGS[key].label
export { predictRow, CASES }

// Step 2 is judged on what the learner's run computed: both versions, for the changed weights,
// against an independent calculation in JS.
export function evaluateAgree(vars) {
  const { X, w, loop_pred: loop, matrix_pred: mat } = vars
  if (!X || !w || !loop || !mat) return { passed: false, message: 'Keep the names `X`, `w`, `loop_pred` and `matrix_pred`: the check reads them after your code runs.' }
  const flatW = w.value, rows = X.value
  if (!Array.isArray(rows) || !Array.isArray(rows[0]) || rows[0].length !== flatW.length) return { passed: false, message: `\`X\` has shape (${X.shape.join(', ')}) and \`w\` has shape (${w.shape.join(', ')}): each row needs one weight per column.` }
  const want = rows.map(r => dot(r, flatW))
  if (loop.shape.join() !== String(rows.length) || !same(loop.value, want)) return { passed: false, message: `\`loop_pred\` is [${loop.value.join(', ')}], but row-by-row dot products give [${want.join(', ')}]. Did an edit change the loop?` }
  if (!same(mat.value, want)) return { passed: false, message: `\`matrix_pred\` is [${mat.value.join(', ')}], but row-by-row dot products give [${want.join(', ')}].` }
  if (!same(rows.flat(), BUILDS.flat())) return { passed: false, message: 'Both versions agree, but `X` is no longer the builds table. Keep X and change only w.' }
  if (!same(flatW, [0.5, -1, 3])) return { passed: false, message: same(flatW, [1, 2, 2]) ? 'They agree for the original weights. Now change `w` to `[0.5, -1, 3]` and run again.' : `They agree for w = [${flatW.join(', ')}]. The step asks for w = [0.5, -1, 3]; set that and run again.` }
  return { passed: true, message: `Both give [${want.join(', ')}] for w = [0.5, −1, 3] — D’s entry is 5.5, as you traced in step 1.` }
}
// ---- The ladder -----------------------------------------------------------------------------
export const prediction = {
  title: 'Predictions from a design matrix',
  version: 1,
  templates: TEMPLATES,
  templateNames: { forward: 'Predict a row', missing: 'Find a missing weight', debug: 'Find the wrong prediction' },
  generate, workedSolution, bugLabel,
  intro: 'Seven steps, from tracing one prediction to writing `predict` yourself and solving tables you have not seen. Each step shows what it asks for and what counts as done. Nothing here locks the rest of the lab: skip ahead if you already know a step, and come back if a later step goes wrong.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Trace one prediction',
      prompt: 'New weights for the same builds: **w = [0.5, −1, 3]** (b = 0.5 minutes, −1 minute per GB, 3 minutes per hundred files). Build **D** is the row `[1, 4, 3]`. Write down each weight’s contribution, then the total.',
      fields: [
        { label: 'Intercept: 1 × 0.5', answer: 0.5 },
        { label: 'Size: 4 GB × (−1)', answer: -4 },
        { label: 'Files: 3 hundred × 3', answer: 9 },
        { label: 'Prediction ŷ for D (minutes)', answer: 5.5 },
      ],
      explain: '0.5 − 4 + 9 = 5.5. A negative weight subtracts: with these weights a larger build is predicted to be *faster*, which is why a fitted model is checked against data rather than trusted.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Loop and matrix product agree',
      prompt: 'This computes the four predictions twice: a loop over rows, then `X @ w`. Run it. Then **change `w` to `[0.5, -1, 3]`** and run it again. Before you do, predict: will they still agree, and what will D’s entry be?',
      starter: `import numpy as np

X = np.array([[1., 1., 1.],
              [1., 2., 4.],
              [1., 3., 2.],
              [1., 4., 3.]])       # ones, GB, hundreds of files
w = np.array([1., 2., 2.])         # [b, w1, w2]

loop_pred = np.zeros(len(X))
for i in range(len(X)):            # one row at a time
    for j in range(len(w)):        # one column at a time
        loop_pred[i] += X[i, j] * w[j]

matrix_pred = X @ w
print("loop  :", loop_pred)
print("X @ w :", matrix_pred)
print("agree :", np.allclose(loop_pred, matrix_pred))`,
      probe: ['X', 'w', 'loop_pred', 'matrix_pred'],
      evaluate: evaluateAgree,
      done: 'Both versions agree for your weights, and they match an independent calculation. The loop spells out what `@` does; `@` is what you would write in practice.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the missing expression',
      prompt: 'Everything is written except the line that computes row i’s prediction. Replace `___` with one expression. Any correct expression is accepted.',
      starter: `import numpy as np

def predict(X, w):
    """One prediction per row of X. X: (n, p+1), first column all ones; w: (p+1,)."""
    preds = np.zeros(X.shape[0])
    for i in range(X.shape[0]):
        preds[i] = ___          # row i's prediction
    return preds`,
      hint: 'Row i is `X[i]`. Lesson 03.1 computed build C’s prediction as one dot product of its row with w.',
      solution: 'preds[i] = X[i] @ w          # or np.dot(X[i], w), or sum(X[i, j] * w[j] for j in range(len(w)))',
      check: predictCheck,
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'This version runs without an error but gives the wrong predictions: `[4, 12, 10, 14]` for the builds with w = [1, 2, 2], where you know the answer is `[5, 13, 11, 15]`. Find the bug and fix it. Change as little as you can.',
      starter: `import numpy as np

def predict(X, w):
    """One prediction per row of X. X: (n, p+1), first column all ones; w: (p+1,)."""
    total = np.zeros(X.shape[0])
    for j in range(1, X.shape[1]):     # add each column's contribution
        total += X[:, j] * w[j]
    return total`,
      hint: 'Every prediction is short by the same amount, 1. Which weight is 1, and which column does it multiply?',
      solution: 'for j in range(X.shape[1]):        # start at column 0, the ones column',
      check: predictCheck,
      explainChoice: {
        prompt: 'Why was the original output wrong?',
        options: [
          { text: 'The loop started at column 1, so column 0 — the ones column — never contributed, and every prediction lacked the intercept w[0].', correct: true },
          { text: 'The weights were applied in the wrong order.', feedback: 'Each column j is multiplied by w[j], which is the right pairing. The error was the same, 1, for every build. What adds the same amount to every row?' },
          { text: '`total +=` added the columns to the wrong rows.', feedback: '`X[:, j] * w[j]` is a whole column, one entry per build, added entry by entry to `total`. The rows line up.' },
          { text: 'Floating-point rounding.', feedback: 'Rounding errors are around 1e-16, not exactly 1 for every build.' },
        ],
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write `predict` from its contract',
      prompt: 'Write the body. Use any correct method: a loop, a dot product per row, or `@`. The checks call it on tables you have not seen, including more features and a single row.',
      starter: `import numpy as np

def predict(X, w):
    """Predictions of a linear model, one per row of X.

    X: array of shape (n, p+1); column 0 is all ones.
    w: array of shape (p+1,); w[0] is the intercept.
    Returns an array of shape (n,) whose entry i is row i of X dotted with w.
    Must not change X or w.

    Examples:
        predict(np.array([[1., 3., 2.]]), np.array([1., 2., 2.]))       -> array([11.])
        predict(np.array([[1., 0.], [1., 2.]]), np.array([2., 0.5]))   -> array([2., 3.])
    """
    pass   # replace with your code`,
      hint: 'Test your function on the two examples in the docstring before pressing Check: add `print(predict(...))` lines below it.',
      solution: 'return X @ w      # every row dotted with w; X is not modified',
      check: predictCheck,
    },
    {
      id: 'transfer', kind: 'transfer', title: 'Solve new tables',
      prompt: 'New situations with their own units and weights. Solve one of each kind without opening the worked answer: a forward prediction, a missing weight, and a table with one wrong prediction. “New problem” gives another of the same kind whenever you want more practice.',
    },
    {
      id: 'review', kind: 'review', title: 'Come back later',
      prompt: 'A fresh problem after a gap tests whether this stays with you. The first return is suggested a day after you finish step 6; each correct return spaces the next one further apart. You choose when: “Do it now” is always available and is recorded as an early return.',
    },
  ],
}
