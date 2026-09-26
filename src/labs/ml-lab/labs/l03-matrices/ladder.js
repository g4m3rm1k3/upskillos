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
// How a prediction problem is shown: the intro, the table and the questions (see Ladder.jsx Problem).
const plural = noun => noun === 'flat' ? 'flats' : `${noun}s`
export function view(p) {
  const { ctx, model: m, rows, target } = p, r3 = v => Math.round(v * 1000) / 1000
  const intro = `A model predicts **${ctx.target}** for each ${ctx.noun}: **ŷ = b + w₁·x₁ + w₂·x₂**, where x₁ is ${ctx.f1} and x₂ is ${ctx.f2}. ` +
    (p.template === 'missing' ? `Its intercept is b = ${m.b} and w₁ = ${m.w1}; w₂ is unknown.` : `Its weights are b = ${m.b}, w₁ = ${m.w1}, w₂ = ${m.w2}.`)
  const head = [ctx.noun, `x₁: ${ctx.f1}`, `x₂: ${ctx.f2}`, ...(p.template === 'debug' ? ['printed ŷ'] : [])]
  const table = { caption: p.template === 'debug' ? `Predictions a program printed for four ${plural(ctx.noun)}` : 'The table', head,
    rows: rows.map((r, i) => [ctx.labels[i], r[0], r[1], ...(p.template === 'debug' ? [r3(p.shown[i])] : [])]) }
  if (p.template === 'forward') return { intro, table, questions: [{ id: 'y', type: 'number', label: `Predict ŷ for **${ctx.labels[target]}** (${ctx.target})`, answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'missing') return { intro, table, questions: [{ id: 'w2', type: 'number', label: `The model predicted **${p.yhat}** ${ctx.target} for ${ctx.labels[target]}. What is w₂?`, answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro, table, questions: [
    { id: 'row', type: 'choice', inline: true, legend: `One printed prediction is wrong. Which ${ctx.noun}?`, options: ctx.labels.map(l => ({ value: l, label: l })), answer: p.answer, wrong: 'Not that row. Recompute each prediction from the weights and compare with the table.' },
    { id: 'cause', type: 'choice', legend: 'What went wrong in that row?', options: p.causes.map(k => ({ value: k, label: BUGS[k].label })), answer: p.bug, wrong: 'Right row, different cause. Recompute the row with each suspected mistake and see which one gives the number in the table.' },
  ] }
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
  generate, workedSolution, bugLabel, view,
  review: { lab: 1, lesson: 0, text: 'Step 1 is a weighted sum: each input times its weight, then added up. Lab 01’s first lesson builds one input at a time.', label: 'Review weighted sums in Lab 01 →' },
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
        rightFeedback: 'That is why every prediction was short by the same amount.',
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

// ---- The gradient ladder (end of Lesson 03.3) -------------------------------------------------
// Expected values were computed by hand and recomputed with NumPy (∇J = (2/n)Xᵀ(Xw − y)); the
// ladder test recomputes each with an explicit loop.
const Y_BUILDS = [6.2, 12.1, 12.8, 17.1]
const GRAD_CASES = [
  { X: BUILDS, y: Y_BUILDS, w: [1, 2, 2], alpha: 0.02, grad: [-2.1, -6.6, -3.75], step: [1.042, 2.132, 2.075] },
  { X: BUILDS, y: Y_BUILDS, w: [0.5, -1, 3], alpha: 0.02, grad: [-13.1, -40.6, -31.75], step: [0.762, -0.188, 3.635] },
  { X: [[1, 2, 1, 5]], y: [10], w: [3, 1, 4, -1], alpha: 0.1, grad: [-12, -24, -12, -60], step: [4.2, 3.4, 5.2, 5] },
  { X: [[1, 0], [1, 1], [1, 2]], y: [1, 2, 4], w: [2, 0.5], alpha: 0.5, grad: [1 / 3, -1], step: [11 / 6, 1] },
]
export const gradientOf = (X, y, w) => {                     // an explicit loop, used to check the table above
  const n = X.length, e = X.map((row, i) => dot(row, w) - y[i])
  return w.map((_, j) => (2 / n) * X.reduce((s, row, i) => s + e[i] * row[j], 0))
}
const near = (a, b, tol = 1e-6) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= tol)
const describeG = c => `X shape (${c.X.length}, ${c.X[0].length}), w = [${c.w.join(', ')}]`

// Names the likely cause of a wrong gradient, without giving the corrected code.
export function diagnoseGradient(c, got) {
  const s = got.shape ?? [], g = c.grad, n = c.X.length
  if (s.length === 1 && s[0] === n && n !== g.length) return 'One number per **row**, not per weight: that is X times something. The gradient needs one entry per column of X — which matrix turns a row-length vector into a column-length one?'
  if (s.length !== 1 || s[0] !== g.length) return s.length === 0 ? 'A single number: the gradient has one entry per weight.' : null
  const v = got.value
  if (near(v, g.map(x => -x))) return 'Every entry has the right size and the wrong sign. Check the order of the subtraction in the errors: e = ŷ − y.'
  if (near(v, g.map(x => x / 2))) return 'Every entry is exactly half the right size: the 2 from differentiating the square is missing.'
  if (near(v, g.map(x => x * n / 2))) return `Every entry is ${n}/2 times too large: the sum Σ eᵢxᵢⱼ was not multiplied by 2/n.`
  if (near(v, g.map(x => x * n))) return `Every entry is ${n} times too large: the sum was multiplied by 2 but not divided by n.`
  return null
}
export function diagnoseStep(c, got) {
  const s = got.shape ?? []
  if (s.length !== 1 || s[0] !== c.w.length) return s.length === 1 && s[0] === c.X.length ? 'One number per row: a step changes the weights, so it returns one number per weight.' : null
  const v = got.value, up = c.w.map((w, j) => w + c.alpha * c.grad[j]), noAlpha = c.w.map((w, j) => w - c.grad[j])
  if (near(v, up)) return 'The weights moved uphill: the step should subtract α times the gradient.'
  if (near(v, noAlpha)) return 'The step used the whole gradient: multiply it by the learning rate α first.'
  if (near(v, c.w)) return 'The weights did not change. Did the function return w before updating it?'
  // Work back from the step to the gradient it implies, and diagnose that gradient.
  const implied = c.w.map((w, j) => (w - v[j]) / c.alpha), why = diagnoseGradient(c, { shape: s, value: implied })
  return why ? `Working back from your step to the gradient it used: ${why}` : null
}
const gradCheck = { fn: 'gradient', args: ['X', 'y', 'w'], cases: GRAD_CASES.map(c => ({ ...c, expected: c.grad })), describe: describeG, diagnose: diagnoseGradient }
const stepCheck = { fn: 'gradient_step', args: ['X', 'y', 'w', 'alpha'], cases: GRAD_CASES.map(c => ({ ...c, expected: c.step })), describe: c => `${describeG(c)}, α = ${c.alpha}`, diagnose: diagnoseStep }

// Step 2: the loop, the matrix form and a numerical check must agree, after the prescribed edit.
export function evaluateGradientAgree(vars) {
  const { X, y, w, eps, grad_loop: loop, grad_matrix: mat, grad_numeric: num } = vars
  if (!X || !y || !w || !eps || !loop || !mat || !num) return { passed: false, message: 'Keep the names `X`, `y`, `w`, `eps`, `grad_loop`, `grad_matrix` and `grad_numeric`: the check reads them after your code runs.' }
  const want = gradientOf(X.value, y.value, w.value)
  if (!near(loop.value, want, 1e-9)) return { passed: false, message: `\`grad_loop\` is [${loop.value.map(r3).join(', ')}], but the gradient is [${want.map(r3).join(', ')}]. Did an edit change the loop?` }
  if (!near(mat.value, want, 1e-9)) return { passed: false, message: `\`grad_matrix\` is [${mat.value.map(r3).join(', ')}], but the gradient is [${want.map(r3).join(', ')}].` }
  if (!near(num.value, want, 2e-3)) return { passed: false, message: `The loop and \`Xᵀe\` agree, but the one-sided nudge is off by up to ${r3(Math.max(...num.value.map((v, j) => Math.abs(v - want[j]))))}. Its error is about ε·(2/n)Σx², so it shrinks with ε: set \`eps = 1e-4\` and run again.` }
  return { passed: true, message: `All three agree on ∇J = [${want.map(r3).join(', ')}]. The one-sided nudge needed a small ε; the loop and \`Xᵀe\` agree exactly.` }
}
const r3 = v => String(Math.round(v * 1000) / 1000)

// Fresh gradient problems: four rows of one feature plus an intercept, so the arithmetic is hand-sized.
export const GRADIENT_TEMPLATES = ['entry', 'step', 'debug']
const GBUGS = {
  correct: 'Nothing: this is the correct gradient.',
  sign: 'The errors were computed as y − ŷ, so every entry has the wrong sign.',
  half: 'The factor 2 from the square is missing, so every entry is half its size.',
  sum: 'The sum Σ eᵢxᵢⱼ was printed without the factor 2/n, so every entry is n/2 = 2 times too large.',
}
export function generateGradient(template, seed) {
  const g = rng(seed * 6007 + GRADIENT_TEMPLATES.indexOf(template) * 99991 + 5)
  for (let attempt = 0; attempt < 200; attempt++) {
    const ctx = g.pick(CONTEXTS)
    const xs = ctx.labels.map(() => g.int(...ctx.x1))
    if (new Set(xs).size < 3) continue
    const b = g.int(1, 6), w1 = g.int(1, 4), ys = xs.map(x => b + w1 * x + g.int(-4, 4))
    const e = xs.map((x, i) => b + w1 * x - ys[i])
    const grad = [0.5 * e.reduce((s, v) => s + v, 0), 0.5 * e.reduce((s, v, i) => s + v * xs[i], 0)]   // (2/4)Σ
    if (grad.some(v => v === 0)) continue
    const base = { template, seed, ctx, xs, ys, b, w1, e, grad }
    if (template === 'entry') {
      const answer = grad[1], misconceptions = [
        { answer: 2 * answer, feedback: 'That is the sum Σ eᵢxᵢ. Multiply it by 2/n = 2/4.' },
        { answer: -answer, feedback: 'The size is right but the sign is not: the errors are ŷ − y, prediction minus target.' },
        { answer: grad[0], feedback: 'That is ∂J/∂b, from the column of ones. ∂J/∂w₁ weights each error by its x.' },
      ].filter(m => Math.abs(m.answer - answer) > 1e-9)
      return { ...base, answer, misconceptions }
    }
    if (template === 'step') {
      const alpha = g.pick([0.01, 0.02, 0.05, 0.1]), answer = w1 - alpha * grad[1]
      const misconceptions = [
        { answer: w1 + alpha * grad[1], feedback: 'That moves uphill. A descent step subtracts α times the gradient.' },
        { answer: w1 - grad[1], feedback: 'That uses the whole gradient. Multiply it by α first.' },
      ].filter(m => Math.abs(m.answer - answer) > 1e-9)
      return { ...base, alpha, answer, misconceptions }
    }
    const bug = g.pick(Object.keys(GBUGS)), factor = { correct: 1, sign: -1, half: 0.5, sum: 2 }[bug]   // n = 4: n/2 = 2
    return { ...base, bug, shown: grad.map(v => factor * v), answer: bug, causes: g.shuffle(Object.keys(GBUGS)) }
  }
  throw new Error(`No valid ${template} gradient problem for seed ${seed}`)
}
export function viewGradient(p) {
  const { ctx, xs, ys, b, w1 } = p
  const intro = `A model predicts **${ctx.target}** from ${ctx.f1}: **ŷ = b + w₁·x**, with b = ${b} and w₁ = ${w1}. The loss is the mean squared error over the four rows, J = (1/4)Σ(ŷᵢ − yᵢ)².`
  const table = { caption: 'The training rows', head: [ctx.noun, `x: ${ctx.f1}`, `y: ${ctx.target}`], rows: xs.map((x, i) => [ctx.labels[i], x, ys[i]]) }
  if (p.template === 'entry') return { intro, table, questions: [{ id: 'g1', type: 'number', label: 'What is **∂J/∂w₁** = (2/4)·Σ eᵢxᵢ, with eᵢ = ŷᵢ − yᵢ?', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'step') return { intro: `${intro} Its gradient is ∇J = [${p.grad.join(', ')}] (for b and w₁).`, table, questions: [{ id: 'w1', type: 'number', label: `After one gradient-descent step with α = ${p.alpha}, what is the new **w₁**?`, answer: p.answer, tolerance: 1e-6, misconceptions: p.misconceptions }] }
  return { intro: `${intro} A program printed its gradient as **[${p.shown.join(', ')}]** (for b and w₁).`, table, questions: [
    { id: 'cause', type: 'choice', legend: 'Compute the gradient yourself. What does the printed one show?', options: p.causes.map(k => ({ value: k, label: GBUGS[k] })), answer: p.bug, wrong: 'Not that. Compute the four errors ŷ − y, then (2/4)·Σe and (2/4)·Σe·x, and compare each printed entry with yours: same size, opposite sign, half, or double?' },
  ] }
}
export function workedGradient(p) {
  const { xs, ys, b, w1, e, grad } = p
  const errs = `Predictions: ${xs.map(x => b + w1 * x).join(', ')}. Errors e = ŷ − y: ${e.join(', ')}.`
  const g1 = `Σe·x = ${e.map((v, i) => `${v}×${xs[i]}`).join(' + ')} = ${2 * grad[1]}, so ∂J/∂w₁ = (2/4)·${2 * grad[1]} = **${grad[1]}**.`
  if (p.template === 'entry') return `${errs} ${g1}`
  if (p.template === 'step') return `w₁ ← w₁ − α·∂J/∂w₁ = ${w1} − ${p.alpha} × (${grad[1]}) = **${r3(p.answer)}**.`
  return `${errs} Σe = ${2 * grad[0]}, so ∂J/∂b = ${grad[0]}; ${g1} The correct gradient is [${grad.join(', ')}]; the printed [${p.shown.join(', ')}] means: ${GBUGS[p.bug]}`
}

export const gradient = {
  title: 'The gradient in matrix form',
  version: 1,
  templates: GRADIENT_TEMPLATES,
  templateNames: { entry: 'Compute a gradient entry', step: 'Take one step', debug: 'Diagnose a printed gradient' },
  generate: generateGradient, workedSolution: workedGradient, view: viewGradient, bugLabel: k => GBUGS[k],
  intro: 'Seven steps, from computing one gradient by hand to writing a full gradient-descent step and diagnosing gradients you have not seen. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Trace one gradient',
      prompt: 'The builds with **w = [0.5, −1, 3]**: the predictions are [2.5, 10.5, 3.5, 5.5] and the measured times [6.2, 12.1, 12.8, 17.1]. Compute the errors e = ŷ − y, then each gradient entry (2/4)·Σᵢ eᵢ·xᵢⱼ.',
      fields: [
        { label: 'Error for build C: e = 3.5 − 12.8', answer: -9.3 },
        { label: '∂J/∂b = (2/4)·Σe', answer: -13.1 },
        { label: '∂J/∂w₁ = (2/4)·Σ e·size (sizes 1, 2, 3, 4)', answer: -40.6 },
        { label: '∂J/∂w₂ = (2/4)·Σ e·files (files 1, 4, 2, 3)', answer: -31.75 },
      ],
      explain: 'e = [−3.7, −1.6, −9.3, −11.6]; Σe = −26.2; Σe·size = −81.2; Σe·files = −63.5. Times 2/4: [−13.1, −40.6, −31.75]. Every entry is negative, so raising every weight lowers the loss — and the size weight most steeply.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Loop, Xᵀe and a nudge agree',
      prompt: 'The same gradient three ways: a double loop, `(2/n) Xᵀ e`, and a numerical nudge of each weight. Run it: the nudge is off. **Change `eps = 0.1` to `eps = 1e-4`** and run again. Before you do, predict why a smaller nudge helps.',
      starter: `import numpy as np

X = np.array([[1., 1., 1.],
              [1., 2., 4.],
              [1., 3., 2.],
              [1., 4., 3.]])          # ones, GB, hundreds of files
y = np.array([6.2, 12.1, 12.8, 17.1])
w = np.array([1., 2., 2.])
n = len(y)

def J(w):
    return np.mean((X @ w - y) ** 2)

e = X @ w - y
grad_loop = np.zeros(len(w))
for j in range(len(w)):              # one weight at a time
    for i in range(n):               # add each row's error times its feature
        grad_loop[j] += 2 / n * e[i] * X[i, j]

grad_matrix = 2 / n * X.T @ e

eps = 0.1
grad_numeric = np.array([(J(w + eps * np.eye(len(w))[j]) - J(w)) / eps for j in range(len(w))])   # one-sided nudge
print("loop   :", grad_loop)
print("Xᵀe    :", grad_matrix)
print("nudge  :", np.round(grad_numeric, 5))`,
      probe: ['X', 'y', 'w', 'eps', 'grad_loop', 'grad_matrix', 'grad_numeric'],
      evaluate: evaluateGradientAgree,
      done: 'The nudge estimates each slope from two nearby losses. Its error is proportional to ε, so a small ε brings it in line with the exact formula — a check you can run on any gradient you write.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the gradient',
      prompt: 'Everything is written except the gradient line. Replace `___` with one expression that returns ∇J = (2/n) Xᵀ(Xw − y). Any correct expression is accepted.',
      starter: `import numpy as np

def gradient(X, y, w):
    """∇J for J(w) = mean((X @ w − y)²). X: (n, p+1); y: (n,); w: (p+1,). Returns (p+1,)."""
    return ___`,
      hint: 'Build it in pieces: the errors `X @ w - y` (shape n), then `X.T @` those errors (shape p+1), then the factor 2/n.',
      solution: 'return 2 / len(y) * X.T @ (X @ w - y)',
      check: gradCheck,
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'This version runs but gives the gradient as **[2.1, 6.6, 3.75]** for the builds with w = [1, 2, 2], where you know it is [−2.1, −6.6, −3.75]. Find the bug and fix it, changing as little as you can.',
      starter: `import numpy as np

def gradient(X, y, w):
    """∇J for J(w) = mean((X @ w − y)²). X: (n, p+1); y: (n,); w: (p+1,). Returns (p+1,)."""
    e = y - X @ w                    # the errors
    return 2 / len(y) * X.T @ e`,
      hint: 'Every entry has the right size and the wrong sign. Which subtraction decides the sign?',
      solution: 'e = X @ w - y                    # prediction minus target',
      check: gradCheck,
      explainChoice: {
        prompt: 'Why was the original output wrong, and what would it have done in training?',
        options: [
          { text: 'It computed e = y − ŷ instead of ŷ − y, which flips every entry’s sign; a step w − α∇J would then move uphill and the loss would grow.', correct: true },
          { text: 'It is missing the factor 2, so the steps are too small.', feedback: 'The sizes were right: 2.1, 6.6, 3.75. Only the signs were wrong.' },
          { text: 'It should use X instead of Xᵀ.', feedback: '`X @ e` would not even run here: X has 3 columns and e has 4 entries. Xᵀ is right.' },
          { text: 'Nothing: a gradient’s sign does not matter.', feedback: 'The sign says which way is downhill. With the wrong sign, every step increases the loss.' },
        ],
        rightFeedback: 'That is why the loss would climb instead of fall.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write one gradient-descent step',
      prompt: 'Write `gradient_step` from its contract. The checks call it on tables you have not seen, including one row and more features.',
      starter: `import numpy as np

def gradient_step(X, y, w, alpha):
    """One gradient-descent step on J(w) = mean((X @ w − y)²).

    X: (n, p+1), column 0 all ones.  y: (n,).  w: (p+1,).  alpha: the learning rate.
    Returns the new weights, shape (p+1,), computed from the gradient at the OLD w.
    Must not change X, y or w.

    Example:
        X = np.array([[1., 0.], [1., 1.], [1., 2.]]); y = np.array([1., 2., 4.])
        gradient_step(X, y, np.array([2., 0.5]), 0.5)   ->  array([1.8333..., 1.])
    """
    pass   # replace with your code`,
      hint: 'Two lines: the gradient at the old w, then `w - alpha * grad`. Writing `w -= ...` would change the caller’s array.',
      solution: 'return w - alpha * (2 / len(y) * X.T @ (X @ w - y))',
      check: stepCheck,
    },
    {
      id: 'transfer', kind: 'transfer', title: 'Solve new problems',
      prompt: 'New tables with their own units. Solve one of each kind without opening the worked answer: a gradient entry, one descent step, and a printed gradient to diagnose.',
    },
    {
      id: 'review', kind: 'review', title: 'Come back later',
      prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; each correct return spaces the next one further apart. “Do it now” is always there and is recorded as early.',
    },
  ],
}
