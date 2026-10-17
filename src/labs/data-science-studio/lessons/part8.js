// Part 8: models from data. The days table holds a rule with a known truth (riders = 300 + 22 per °C
// − 12 per mm of rain + 90 at the weekend + noise): least squares for one input, then for several in
// matrix form, solved by Gaussian elimination; reading the model; categories; gradient descent;
// overfitting, ridge and cross-validation on a curve; logistic regression on the deliveries; and the
// column that leaks the answer (python/models.py, engine/models.js).
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as G from '../engine/charts.js'
import * as P from '../engine/patterns.js'
import * as M from '../engine/samples.js'
import * as F from '../engine/models.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, DELIVERIES_CSV, FAR_TOWNS, ON_TIME, Rng } from '../engine/data.js'
import { evaluateFormula } from '../engine/sheet.js'
import { WITH_RNG, WITH_MONTHS } from './given.js'

const cases = (fn, inputs) => inputs.map(args => ({ args, expected: fn(...args) }))
const sheet = formula => evaluateFormula('orders', formula).value
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`
const MEANS = [['summary.py', 'total'], ['summary.py', 'mean']]
const SPREAD = [...MEANS, ['summary.py', 'variance'], ['summary.py', 'std']]
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol
const W = 'WEEKDAY(days!A2:A366, 2)'
const ALL = [...Array(365).keys()]

const DAYS = P.numberDays(T.readCsv(DAYS_CSV()))
const H = DAYS.map(r => r.high_c), R = DAYS.map(r => r.rain_mm), RI = DAYS.map(r => r.riders)
const WEEKEND = DAYS.map(r => (F.weekday(r.date) >= 5 ? 1 : 0))
const ROWS = DAYS.map((r, k) => ({ ...r, weekend: WEEKEND[k] }))
const X = F.designMatrix(ROWS, ['high_c', 'rain_mm', 'weekend']), FIT = F.fit(X, RI), PRED = F.predict(X, FIT)
// 8.1
const [SLOPE, INTERCEPT] = F.leastSquares(H, RI)
// 8.2, 8.3
const [XTX, XTY] = F.normalEquations(X, RI)
const STEPS = []; F.solve(XTX, XTY, STEPS)
// 8.4: what leaving rain and the weekend out does to the slope.
const RAIN_ON_T = F.leastSquares(H, R)[0], WEEKEND_ON_T = F.leastSquares(H, WEEKEND)[0]
const RESID = RI.map((y, k) => y - PRED[k])
// 8.5
const DOWS = DAYS.map(r => F.weekday(r.date)), WEEK = [0, 1, 2, 3, 4, 5, 6], DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const XD = DAYS.map((r, k) => [1, r.high_c, r.rain_mm, ...F.oneHot([DOWS[k]], WEEK)[0].slice(1)]), FIT_D = F.fit(XD, RI)
const XTRAP = DAYS.map((r, k) => [1, r.high_c, r.rain_mm, ...F.oneHot([DOWS[k]], WEEK)[0]])
// 8.6: standard units, the largest curvature (by repeated multiplication), and steps to converge.
const COLS = [1, 2, 3].map(j => F.standardise(X.map(row => row[j])))
const Z = X.map((_, i) => [1, ...COLS.map(c => c[0][i])]), FIT_Z = F.fit(Z, RI)
function largestCurvature(A) {
  let v = A.map(() => 1), size = 0
  for (let i = 0; i < 500; i++) { const u = A.map(row => row.reduce((s, x, j) => s + x * v[j], 0)); size = Math.hypot(...u); v = u.map(x => x / size) }
  return size
}
const curvature = M2 => largestCurvature(F.normalEquations(M2, RI)[0].map(row => row.map(x => (2 * x) / 365)))
const CURVE_RAW = curvature(X), CURVE_Z = curvature(Z)
const STEPS_Z = F.stepsToConverge(Z, RI, 0.5), STEPS_Z_FAST = F.stepsToConverge(Z, RI, 0.8), STEPS_RAW = F.stepsToConverge(X, RI, 0.004, 200000)
// 8.7, 8.8, 8.9: 20 days to learn from, a curve in the temperature.
const TRAIN = M.sampleWithout(ALL, 20, 3), IN_TRAIN = new Set(TRAIN), TEST = ALL.filter(i => !IN_TRAIN.has(i))
const ZH = (() => { const m = S.mean(TRAIN.map(i => H[i])), s = S.std(TRAIN.map(i => H[i])); return H.map(h => (h - m) / s) })()
const errorsAt = (degree, lam = 0) => {
  const Q = F.scaledPowers(ZH, degree, TRAIN), w = F.ridge(TRAIN.map(i => Q[i]), TRAIN.map(i => RI[i]), lam)
  return [F.rmse(TRAIN.map(i => RI[i]), F.predict(TRAIN.map(i => Q[i]), w)), F.rmse(TEST.map(i => RI[i]), F.predict(TEST.map(i => Q[i]), w)), w]
}
const [TRAIN9, TEST9] = errorsAt(9), [TRAIN1, TEST1] = errorsAt(1)
// The spread of the curve over 200 samples of 20 days: its variance, and the rest of the error (bias² + noise).
function curveSpread(degree, repeats = 200, seed = 4) {
  const rng = new Rng(seed), preds = [], zall = F.standardise(H)[0]
  let mse = 0
  for (let r = 0; r < repeats; r++) {
    const tr = M.sampleWithout(ALL, 20, rng.below(2 ** 31)), Q = F.scaledPowers(zall, degree, tr)
    const p = F.predict(Q, F.ridge(tr.map(i => Q[i]), tr.map(i => RI[i]), 0))
    preds.push(p); mse += S.mean(p.map((v, i) => (v - RI[i]) ** 2))
  }
  const variance = S.mean(ALL.map(i => S.variance(preds.map(p => p[i]), false)))
  return { mse: mse / repeats, variance, rest: mse / repeats - variance }
}
const SPREADS = Object.fromEntries([0, 1, 3, 5].map(d => [d, curveSpread(d)]))
const [, TEST_RIDGE10] = errorsAt(9, 10), [, TEST_RIDGE1] = errorsAt(9, 1)
const Q9 = F.scaledPowers(ZH, 9, TRAIN), X20 = TRAIN.map(i => Q9[i]), Y20 = TRAIN.map(i => RI[i]), FOLDS20 = F.kFolds(20, 5, 7)
const LAMBDAS = [0.1, 1, 3, 10, 30, 100], CV20 = LAMBDAS.map(l => F.crossValidate(X20, Y20, FOLDS20, l)), BEST_LAMBDA = LAMBDAS[CV20.indexOf(Math.min(...CV20))]
const DOY = DAYS.map((_, k) => (k - 182) / 105), MONTHS = DAYS.map(r => r.date.slice(5, 7))
const RANDOM12 = F.kFolds(365, 12, 5), BY_MONTH = F.groupFolds(MONTHS)
const Q_DOY = F.scaledPowers(DOY, 8, ALL), Q_TEMP = F.scaledPowers(F.standardise(H)[0], 1, ALL)
const CV_DOY = [F.crossValidate(Q_DOY, RI, RANDOM12), F.crossValidate(Q_DOY, RI, BY_MONTH)], CV_TEMP = [F.crossValidate(Q_TEMP, RI, RANDOM12), F.crossValidate(Q_TEMP, RI, BY_MONTH)]
// 8.10, 8.11: the deliveries.
const CLEAN = C.cleanOrders(T.readCsv(ORDERS_CSV()), Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)])))
const TOWN = Object.fromEntries(CLEAN.map(r => [r.order_id, r.town]))
const DEL = T.readCsv(DELIVERIES_CSV()), LY = DEL.map(r => (r.on_time === 'yes' ? 1 : 0))
const NORTH = DEL.map(r => (r.courier === 'Northern' ? 1 : 0)), FAR = DEL.map(r => (FAR_TOWNS.includes(TOWN[r.order_id]) ? 1 : 0)), DAYS_TAKEN = DEL.map(r => Number(r.days))
const LX = DEL.map((_, k) => [1, NORTH[k], FAR[k], NORTH[k] * FAR[k]]), LW = F.logisticFit(LX, LY, 1, 5000)
const LP = F.predict(LX, LW).map(F.sigmoid), BASE = S.mean(LY), BASE_LOSS = F.logLoss(LY, LY.map(() => BASE))
const prob = (n, f, w = LW) => F.sigmoid(w[0] + w[1] * n + w[2] * f + w[3] * n * f)
const GROUPS = [['Northern', 1, 1], ['Northern', 1, 0], ['Swift', 0, 1], ['Swift', 0, 0]].map(([courier, n, f]) => ({ courier, far: f ? 'far' : 'near', n, f, truth: ON_TIME[courier][f ? 0 : 1] / 100, rate: S.mean(LY.filter((_, k) => NORTH[k] === n && FAR[k] === f)) }))
const accuracy = ps => S.mean(ps.map((p, k) => ((p > 0.5 ? 1 : 0) === LY[k] ? 1 : 0)))
const LEAK_X = DEL.map((_, k) => [1, NORTH[k], FAR[k], DAYS_TAKEN[k]])
const LEAK = [100, 1000, 10000].map(steps => { const w = F.logisticFit(LEAK_X, LY, 0.5, steps), ps = F.predict(LEAK_X, w).map(F.sigmoid); return { steps, w, loss: F.logLoss(LY, ps), acc: accuracy(ps) } })

export const PART8 = {
  id: 'part8', title: 'Part 8 · Models from data', lessons: [
    {
      id: 'model-function', number: '8.1', title: 'A model is a function',
      goal: 'Describe a model as a function with parameters chosen to make a loss small, derive least squares for one input from the calculus, and see what happens outside the data.',
      builds: ['ab-test'],
      blocks: [
        { h: 'Inputs, an output, and a rule' },
        { md: `A **model** is a function: inputs go in (the day's temperature), an output comes out (a guess at the riders). It has **parameters** (for a line, its intercept $a$ and slope $b$), and **fitting** it means choosing them to make a **loss** small: a number that says how wrong the guesses are, over the data. The usual loss is the sum of squared misses:

$$L(a, b) = \\sum_i (y_i - a - b x_i)^2$$

Lesson 5.4 got a line from the correlation. Here it comes from the loss itself, and the method extends to any number of inputs.` },
        { figure: 'ModelLoss', caption: 'Choose the intercept and slope yourself: the misses, and the loss they add up to. The least-squares line is the bottom of the bowl.' },
        {
          derive: {
            title: 'The two normal equations',
            intro: 'At the bottom of the bowl both derivatives of $L$ are 0.',
            steps: [
              { prompt: 'One term, $(y - a - bx)^2$. Its derivative with respect to $a$ (in terms of y, a, b, x)?', answer: '-2*(y-a-b*x)', vars: { y: [-5, 5], a: [-5, 5], b: [-5, 5], x: [-5, 5] }, why: 'The chain rule: $2(\\ldots) \\times (-1)$.' },
              { prompt: 'Setting $\\sum -2(y_i - a - bx_i) = 0$ and dividing by $-2n$ gives $\\bar y - a - b\\bar x = 0$. So $a$, in terms of b, u (for $\\bar x$) and v (for $\\bar y$)?', answer: 'v-b*u', vars: { b: [-5, 5], u: [-5, 5], v: [-5, 5] }, why: 'The line passes through the point of the two means.' },
              { prompt: 'The derivative with respect to $b$ adds a factor $x$: $\\sum x_i(y_i - a - bx_i) = 0$. Put $a = \\bar y - b\\bar x$ in and solve: $b = \\frac{\\sum (x - \\bar x)(y - \\bar y)}{\\sum (x - \\bar x)^2}$. For riders and temperature (to 2 decimals)?', number: SLOPE, compute: () => F.leastSquares(H, RI)[0], tolerance: 0.005, why: `${SLOPE.toFixed(2)} riders per degree: lesson 5.4’s line exactly (r·s_y/s_x is the same fraction, divided top and bottom by n − 1).` },
            ],
          },
        },
        {
          code: { file: 'models.py', fn: 'least_squares', notes: [['sxy = total([(x - mx) * (y - my) for x, y in zip(xs, ys)])', ['The top of the fraction: how x and y move together.']], ['return [slope, my - slope * mx]', ['Through the means.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'least_squares', also: MEANS,
            prompt: 'Write `least_squares(xs, ys)`: the slope is $\\sum (x - \\bar x)(y - \\bar y) / \\sum (x - \\bar x)^2$ (use `total`); return `[slope, intercept]` with the intercept $\\bar y - b\\bar x$.',
            starter: 'def least_squares(xs, ys):\n    mx, my = mean(xs), mean(ys)\n    return [0.0, my]\n',
            cases: cases(F.leastSquares, [[[1, 2, 3], [2, 4, 7]], [H, RI]]),
            hint: '`sxy = total([(x - mx) * (y - my) for x, y in zip(xs, ys)])`, `sxx = total([(x - mx) ** 2 for x in xs])`, `slope = sxy / sxx`.',
          },
        },
        {
          formula: {
            table: 'orders', solution: '=INDEX(LINEST(days!D2:D366, days!B2:B366), 1, 1)', must: ['LINEST'],
            prompt: 'The spreadsheet’s least squares: `LINEST(ys, xs)` returns the slope and the intercept side by side; `INDEX(…, 1, 1)` takes the slope.',
            hint: '`=INDEX(LINEST(days!D2:D366, days!B2:B366), 1, 1)`',
            explain: `${sheet('=INDEX(LINEST(days!D2:D366, days!B2:B366), 1, 1)').toFixed(4)}, your ${SLOPE.toFixed(4)}.`,
          },
        },
        { h: 'Outside the data' },
        {
          predict: {
            prompt: `The line is ${INTERCEPT.toFixed(1)} + ${SLOPE.toFixed(2)} × temperature. What does it predict for a day of −15 °C (to the nearest rider)?`,
            answer: INTERCEPT + SLOPE * -15, compute: () => { const [b, a] = F.leastSquares(H, RI); return a - 15 * b }, tolerance: 0.5,
            explain: `${(INTERCEPT - 15 * SLOPE).toFixed(0)} riders: fewer than none. The year’s days ran from ${Math.min(...H)} to ${Math.max(...H)} °C; the line was fitted there and knows nothing beyond. A model is a summary of the data it saw: **extrapolation**, predicting outside it, assumes the pattern carries on, and nothing in the data can check that.`,
          },
        },
      ],
    },

    {
      id: 'normal-equations', number: '8.2', title: 'Several inputs: matrices',
      goal: 'Put several inputs in a design matrix, derive the normal equations XᵀX w = Xᵀy, and multiply matrices by hand.',
      builds: ['model-function'],
      blocks: [
        { h: 'Riders depend on more than the temperature' },
        { md: `Riders = $w_0 + w_1 \\cdot$ temperature $+ w_2 \\cdot$ rain $+ w_3 \\cdot$ weekend. The weekend is a 0/1 column made from the date. For 365 days that is 365 equations in 4 unknowns: too many to hold exactly, so again, least squares. Writing it out one sum at a time gets long; matrices keep it short.` },
        {
          code: { file: 'models.py', fn: 'weekday', notes: [['return (day_of_year(date) + 2) % 7', ['Lesson 6.3’s `day_of_year`, shifted so that 1 January 2025, a Wednesday, is day 2 of the week (Monday is 0).']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'weekday', also: [['samples.py', 'day_of_year']], prelude: WITH_MONTHS,
            prompt: 'Write `weekday(date)`: 0 for Monday to 6 for Sunday, from `day_of_year(date)`. 1 January 2025 was a Wednesday.',
            starter: 'def weekday(date):\n    return day_of_year(date) % 7\n',
            cases: cases(F.weekday, [['2025-01-01'], ['2025-06-02'], ['2025-12-31'], ['2025-03-09']]),
            hint: '`(day_of_year(date) + 2) % 7`',
          },
        },
        {
          code: { file: 'models.py', fn: 'design_matrix', notes: [['return [[1.0] + [float(row[c]) for c in columns] for row in rows]', ['One row per day; the 1 in front is multiplied by $w_0$, the intercept.']]] },
        },
        { md: `With $X$ the design matrix (365 rows, 4 columns), $w$ the four weights and $y$ the riders, the predictions are $Xw$ and the loss is $\\lVert y - Xw \\rVert^2$, the sum of the squared misses.` },
        {
          derive: {
            title: 'The normal equations',
            intro: 'Take one weight $w_j$ and one day: the miss is $e = y - \\sum_k x_k w_k$.',
            steps: [
              { prompt: 'The derivative of $e^2$ with respect to $w_j$, in terms of e and x (for $x_j$)?', answer: '-2*e*x', vars: { e: [-5, 5], x: [-5, 5] }, why: '$2e \\cdot \\partial e/\\partial w_j = 2e \\cdot (-x_j)$.' },
              { prompt: 'Over all days, $\\sum_i -2 e_i x_{ij} = 0$ for every $j$: in matrix form $X^\\top (y - Xw) = 0$, which rearranges to $X^\\top X w = X^\\top y$. How many equations for 4 weights?', number: 4, compute: () => XTX.length, why: 'One per weight: a 4 × 4 system, whatever the number of days. 365 rows collapse into $X^\\top X$, a table of sums.' },
              { prompt: '$X^\\top X$ holds the sums of products of the columns. Its entry for temperature with itself, $\\sum h^2$ (to 2 decimals)?', number: XTX[1][1], compute: () => S.total(H.map(h => h * h)), tolerance: 0.005, why: `${XTX[1][1].toFixed(2)}. The top-left entry is 365 (the 1s), and the weekend’s diagonal entry is ${XTX[3][3]}, the number of weekend days.` },
            ],
          },
        },
        {
          code: { file: 'models.py', fn: 'transpose', notes: [['return [[m[i][j] for i in range(len(m))] for j in range(len(m[0]))]', ['Row j of the answer is column j of `m`.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'transpose',
            prompt: 'Write `transpose(m)`: the entry in row i, column j moves to row j, column i.',
            starter: 'def transpose(m):\n    return m\n',
            cases: cases(F.transpose, [[[[1, 2, 3], [4, 5, 6]]], [[[1], [2]]]]),
            hint: '`[[m[i][j] for i in range(len(m))] for j in range(len(m[0]))]`',
          },
        },
        {
          code: { file: 'models.py', fn: 'mat_mul', notes: [['s += a[i][k] * b[k][j]', ['Row i of `a` against column j of `b`: a dot product, SUMPRODUCT.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'mat_mul',
            prompt: 'Write `mat_mul(a, b)`: entry $(i, j)$ is $\\sum_k a_{ik} b_{kj}$, three loops, adding with a plain `+=`.',
            starter: 'def mat_mul(a, b):\n    return [[0.0]]\n',
            cases: cases(F.matMul, [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]], [[[1, 2, 3]], [[1], [2], [3]]], [X.slice(0, 3).map(r => r.slice(0, 2)), [[1, 0], [0, 2]]]]),
            hint: 'For each `i` and `j`: `s = 0.0`, then `for k in range(len(b)): s += a[i][k] * b[k][j]`.',
          },
        },
        {
          code: { file: 'models.py', fn: 'normal_equations', notes: [['return [mat_mul(Xt, X), [row[0] for row in mat_mul(Xt, [[v] for v in y])]]', ['$y$ made into a one-column matrix, multiplied, and turned back into a list.']]] },
        },
        {
          formula: {
            table: 'orders', solution: '=INDEX(MMULT(TRANSPOSE(days!B2:C366), days!B2:C366), 1, 2)', must: ['MMULT', 'TRANSPOSE'],
            prompt: 'In the spreadsheet: `MMULT(TRANSPOSE(X), X)` for the temperature and rain columns, and `INDEX(…, 1, 2)` for the entry temperature × rain. MMULT and MINVERSE were added to the Spreadsheet Lab for this part.',
            hint: '`=INDEX(MMULT(TRANSPOSE(days!B2:C366), days!B2:C366), 1, 2)`',
            explain: `${sheet('=INDEX(MMULT(TRANSPOSE(days!B2:C366), days!B2:C366), 1, 2)').toFixed(2)}: $\\sum$ temperature × rain, your $X^\\top X$’s entry ${XTX[1][2].toFixed(2)}.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: `=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}>5))), 1, 1)`, must: ['LINEST', 'HSTACK', 'WEEKDAY'],
            prompt: 'LINEST fits several inputs at once. Give it the temperature, the rain and a weekend column (`--(WEEKDAY(…, 2)>5)` turns TRUE/FALSE into 1/0), side by side with `HSTACK`. It returns the weights last input first: `INDEX(…, 1, 1)` is the weekend’s.',
            hint: `\`=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}>5))), 1, 1)\``,
            explain: `${sheet(`=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}>5))), 1, 1)`).toFixed(2)} riders at the weekend. The generator adds 90. Lesson 8.3 solves the equations by hand.`,
          },
        },
      ],
    },

    {
      id: 'gaussian-elimination', number: '8.3', title: 'Solving: Gaussian elimination',
      goal: 'Solve the normal equations by elimination and back substitution, choose pivots, count the steps (about n³/3), and recover the generator’s rule for riders.',
      builds: ['normal-equations'],
      blocks: [
        { h: 'Four equations, four unknowns' },
        { md: `Elimination is the method taught for two equations at school, made systematic. Take the first equation; subtract the right multiple of it from each equation below, so the first unknown disappears from them. Then do the same with the second equation for the second unknown, and so on: the system becomes a **triangle**. The last equation has one unknown; solve it, put it into the one above, and work up. The method is ancient: it is in the Chinese *Nine Chapters* (around 200 BC); Gauss used it for orbits.

Before eliminating a column, swap up the row with the **largest** entry in it (the **pivot**). Dividing by a tiny pivot would magnify rounding errors; dividing by 0 is impossible.` },
        { figure: 'EliminationSteps', caption: 'The riders’ normal equations, step by step: each swap and each subtraction, until the triangle; then the weights from the bottom up.' },
        {
          code: {
            file: 'models.py', fn: 'solve', notes: [
              ['M = [list(A[i]) + [b[i]] for i in range(n)]', ['Each equation as one row: its coefficients, then its right-hand side.']],
              ['if abs(M[r][c]) > abs(M[p][c]):', ['The pivot: the largest entry in this column, from this row down.']],
              ['if abs(M[p][c]) <= 1e-12 * scale:', ['No usable pivot: this column can be made from the earlier ones, so there is no single answer (lesson 8.5 meets it).']],
              ['f = M[r][c] / M[c][c]', ['How many times the pivot row to subtract.']],
              ['M[r][k] -= f * M[c][k]', ['Row r minus f times the pivot row: the entry under the pivot becomes 0.']],
              ['s -= M[i][k] * w[k]', ['Back substitution: the unknowns below are known by now.']],
            ],
          },
        },
        {
          write: {
            file: 'models.py', fn: 'solve',
            prompt: 'Write `solve(A, b)`: join `b` to `A` as a last column; for each column `c`, find the row `p ≥ c` with the largest `abs(M[p][c])` (the first, on a tie), return `None` if it is at most `1e-12` times the largest `abs` entry of `A`, swap rows `c` and `p`, and subtract `f = M[r][c] / M[c][c]` times row `c` from each row below (from column `c` to the end). Then solve from the last row up.',
            starter: 'def solve(A, b):\n    n = len(A)\n    w = [0.0] * n\n    return w\n',
            cases: cases(F.solve, [[[[2, 1], [1, 3]], [3, 5]], [[[0, 1], [1, 0]], [3, 4]], [[[2, 1], [4, 2]], [1, 2]], [XTX, XTY]]),
            hint: 'Elimination: `for c in range(n)`, pick `p`, check, `M[c], M[p] = M[p], M[c]`, then `for r in range(c + 1, n): f = M[r][c] / M[c][c]; for k in range(c, n + 1): M[r][k] -= f * M[c][k]`. Back: `for i in range(n - 1, -1, -1): s = M[i][n]`, subtract `M[i][k] * w[k]` for `k > i`, `w[i] = s / M[i][i]`.',
          },
        },
        { python: { program: 'solve', label: 'Step through solve in real Python' } },
        {
          code: { file: 'models.py', fn: 'fit', notes: [['return solve(A, b)', ['The whole of least squares, for any number of inputs: build the sums, solve.']]] },
        },
        {
          predict: {
            prompt: 'Fit riders = $w_0 + w_1$ temperature $+ w_2$ rain $+ w_3$ weekend (`fit`). What is $w_1$, the riders per degree (to 2 decimals)?',
            answer: FIT[1], compute: () => F.fit(X, RI)[1], tolerance: 0.005,
            explain: `${FIT[1].toFixed(2)} per degree, ${FIT[2].toFixed(2)} per mm of rain, ${FIT[3].toFixed(2)} at the weekend, and ${FIT[0].toFixed(1)} to start from. The generator’s rule: 300, 22, −12, 90. Close but not exact: 365 noisy days estimate each weight with an error, as every statistic has (Part 6).`,
          },
        },
        {
          derive: {
            title: 'How much work?',
            intro: 'Elimination on $n$ equations: column $c$ (from 1) leaves $n - c$ rows below the pivot, and each subtraction updates about $n - c + 2$ entries.',
            steps: [
              { prompt: 'For $n = 4$, the multiplications in elimination (column 1: 3 rows × 5 entries, column 2: 2 × 4, column 3: 1 × 3)?', number: 26, compute: () => 3 * 5 + 2 * 4 + 1 * 3, why: '15 + 8 + 3 = 26.' },
              { prompt: 'In general the work grows like $\\sum_{k=1}^{n} k^2$. That sum, in terms of n?', answer: 'n*(n+1)*(2*n+1)/6', vars: { n: [1, 50] }, why: 'The classic sum of squares. Its leading term is $n^3/3$: double the inputs, about 8 times the work. Building $X^\\top X$ costs about $N p^2$ for $N$ rows and $p$ inputs, which for 365 days and 4 inputs is far more than solving it.' },
            ],
          },
        },
        {
          formula: {
            table: 'orders', solution: `=INDEX(MMULT(MINVERSE(MMULT(TRANSPOSE(HSTACK(SEQUENCE(365, 1, 1, 0), days!B2:C366, --(${W}>5))), HSTACK(SEQUENCE(365, 1, 1, 0), days!B2:C366, --(${W}>5)))), MMULT(TRANSPOSE(HSTACK(SEQUENCE(365, 1, 1, 0), days!B2:C366, --(${W}>5))), days!D2:D366)), 2, 1)`, must: ['MMULT', 'MINVERSE', 'TRANSPOSE'],
            prompt: 'The normal equations solved in one formula: $w = (X^\\top X)^{-1} X^\\top y$, with $X$ = `HSTACK(SEQUENCE(365, 1, 1, 0), days!B2:C366, --(WEEKDAY(days!A2:A366, 2)>5))` (a column of 1s, temperature, rain, weekend). `INDEX(…, 2, 1)` is the weight per degree.',
            hint: 'Write $X$ out three times: `=INDEX(MMULT(MINVERSE(MMULT(TRANSPOSE(X), X)), MMULT(TRANSPOSE(X), days!D2:D366)), 2, 1)`.',
            explain: `${sheet(`=INDEX(MMULT(MINVERSE(MMULT(TRANSPOSE(HSTACK(SEQUENCE(365, 1, 1, 0), days!B2:C366, --(${W}>5))), HSTACK(SEQUENCE(365, 1, 1, 0), days!B2:C366, --(${W}>5)))), MMULT(TRANSPOSE(HSTACK(SEQUENCE(365, 1, 1, 0), days!B2:C366, --(${W}>5))), days!D2:D366)), 2, 1)`).toFixed(6)}: your \`solve\`’s ${FIT[1].toFixed(6)}. MINVERSE inverts by elimination too (Gauss–Jordan); solving directly does less work and loses less to rounding.`,
          },
        },
      ],
    },

    {
      id: 'reading-model', number: '8.4', title: 'Reading a model',
      goal: 'Measure the fit with R² and the residuals, read a coefficient as the change with the other inputs fixed, and derive what leaving an input out does to the others.',
      builds: ['gaussian-elimination'],
      blocks: [
        { h: 'How good is the fit?' },
        {
          code: { file: 'models.py', fn: 'predict', notes: [['return [total([x * v for x, v in zip(row, w)]) for row in X]', ['$Xw$: each row’s inputs times the weights.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'predict', also: MEANS,
            prompt: 'Write `predict(X, w)`: for each row, the sum of its inputs times the weights (use `total`).',
            starter: 'def predict(X, w):\n    return [0.0 for row in X]\n',
            cases: cases(F.predict, [[[[1, 2], [1, 3]], [0.5, 2]], [X.slice(0, 5), FIT]]),
            hint: '`[total([x * v for x, v in zip(row, w)]) for row in X]`',
          },
        },
        {
          code: { file: 'models.py', fn: 'r_squared', notes: [['left = total([(y - p) ** 2 for y, p in zip(ys, predictions)])', ['What the model leaves unexplained.']], ['return 1 - left / spread', ['The share of the spread around the mean that the model accounts for.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'r_squared', also: MEANS,
            prompt: 'Write `r_squared(ys, predictions)`: 1 minus the sum of squared residuals over the sum of squared distances from the mean of `ys`.',
            starter: 'def r_squared(ys, predictions):\n    return 1.0\n',
            cases: cases(F.rSquared, [[[1, 2, 3, 4], [1.1, 1.9, 3.2, 3.8]], [RI, PRED]]),
            hint: '`m = mean(ys)`, `left = total([(y - p) ** 2 for y, p in zip(ys, predictions)])`, `spread = total([(y - m) ** 2 for y in ys])`.',
          },
        },
        {
          predict: {
            prompt: 'R² of the four-weight model of riders (to 3 decimals)?',
            answer: F.rSquared(RI, PRED), compute: () => F.rSquared(RI, F.predict(X, F.fit(X, RI))), tolerance: 5e-4,
            explain: `${F.rSquared(RI, PRED).toFixed(3)}, against ${(P.correlation(H, RI) ** 2).toFixed(3)} for temperature alone (lesson 5.4). The rest is the generator’s noise: 40 × a standard normal, so a variance of 1,600, and the residuals’ root mean square is ${F.rmse(RI, PRED).toFixed(1)}.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: `=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}>5)), TRUE, TRUE), 3, 1)`, must: ['LINEST'],
            prompt: 'LINEST with `TRUE, TRUE` adds four rows of statistics under the weights; row 3, column 1 is R².',
            hint: `\`=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}>5)), TRUE, TRUE), 3, 1)\``,
            explain: `${sheet(`=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}>5)), TRUE, TRUE), 3, 1)`).toFixed(6)}, your \`r_squared\`.`,
          },
        },
        {
          chart: {
            prompt: 'Plot the residuals against the predictions: one `circle` per day, `cx` at the prediction and `cy` at the residual (riders minus prediction). The weights are given; `data` has `high_c`, `rain_mm`, `weekend` and `riders`.',
            data: ROWS.map(r => ({ high_c: r.high_c, rain_mm: r.rain_mm, weekend: r.weekend, riders: r.riders })),
            starter: `const w = [${FIT.map(v => v.toFixed(4)).join(', ')}]
const x = d3.scaleLinear().domain([200, 1000]).range([40, 460])
const y = d3.scaleLinear().domain([-150, 150]).range([270, 20])
const predict = d => 0   // w[0] + w[1] × high_c + …
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(predict(d))).attr('cy', d => y(0))
  .attr('r', 2.5).attr('fill', 'steelblue').attr('fill-opacity', 0.5)
svg.append('g').attr('transform', \`translate(0,\${y(0)})\`).call(d3.axisBottom(x))
`,
            solution: `const w = [${FIT.map(v => v.toFixed(4)).join(', ')}]
const x = d3.scaleLinear().domain([200, 1000]).range([40, 460])
const y = d3.scaleLinear().domain([-150, 150]).range([270, 20])
const predict = d => w[0] + w[1] * d.high_c + w[2] * d.rain_mm + w[3] * d.weekend
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(predict(d))).attr('cy', d => y(d.riders - predict(d)))
  .attr('r', 2.5).attr('fill', 'steelblue').attr('fill-opacity', 0.5)
svg.append('g').attr('transform', \`translate(0,\${y(0)})\`).call(d3.axisBottom(x))
`,
            checks: [{ select: 'circle', attrs: ['cx', 'cy'] }],
            verify: marks => { const w = FIT.map(v => Number(v.toFixed(4))); return marks.circle.every((m, k) => { const p = w[0] + w[1] * H[k] + w[2] * R[k] + w[3] * WEEKEND[k]; return near(m.cx, G.linearScale(200, 1000, 40, 460, p), 1e-6) && near(m.cy, G.linearScale(-150, 150, 270, 20, RI[k] - p), 1e-6) }) },
            hint: '`const predict = d => w[0] + w[1] * d.high_c + w[2] * d.rain_mm + w[3] * d.weekend`, and `cy` at `y(d.riders - predict(d))`.',
            explain: 'A shapeless band around 0, as wide at the left as at the right: what a good model leaves. A curve in this plot would mean a shape the model misses; a funnel, noise that grows with the prediction (lesson 5.6’s visits before the log).',
          },
        },
        { h: 'With the others held fixed' },
        { md: `Each weight is the change in the prediction when its input goes up by 1 **and the other inputs stay the same**. That is why the weight per degree here, ${FIT[1].toFixed(2)}, differs from lesson 5.4's ${SLOPE.toFixed(2)}: there, a warmer day also tended to be a drier day, and the line gave temperature the credit for both.` },
        {
          derive: {
            title: 'What leaving an input out does',
            intro: 'The truth: $y = b_0 + b_1 x_1 + b_2 x_2$. Fit $y$ on $x_1$ alone. Write $x_2 = c + g x_1 + \\text{(what’s left)}$: the line of $x_2$ on $x_1$.',
            steps: [
              { prompt: 'Put it in: $y = (b_0 + b_2 c) + (b_1 + b_2 g)x_1 + \\ldots$ The slope on $x_1$ alone, in terms of b (for $b_1$), d (for $b_2$) and g?', answer: 'b+d*g', vars: { b: [-5, 5], d: [-5, 5], g: [-5, 5] }, why: 'The left-out input’s weight times how much it moves with the kept one: **omitted-variable bias**.' },
              { prompt: `The slope of rain on temperature (\`least_squares(H, R)\`, to 4 decimals)?`, number: RAIN_ON_T, compute: () => F.leastSquares(H, R)[0], tolerance: 5e-5, why: `${RAIN_ON_T.toFixed(4)} mm per degree: warmer days are drier. And of the weekend on temperature: ${WEEKEND_ON_T.toFixed(4)}, almost nothing.` },
              { prompt: `So the slope on temperature alone should be ${FIT[1].toFixed(4)} + (${FIT[2].toFixed(4)})(${RAIN_ON_T.toFixed(4)}) + (${FIT[3].toFixed(4)})(${WEEKEND_ON_T.toFixed(4)}). To 4 decimals?`, number: FIT[1] + FIT[2] * RAIN_ON_T + FIT[3] * WEEKEND_ON_T, compute: () => FIT[1] + FIT[2] * F.leastSquares(H, R)[0] + FIT[3] * F.leastSquares(H, WEEKEND)[0], tolerance: 5e-5, why: `${(FIT[1] + FIT[2] * RAIN_ON_T + FIT[3] * WEEKEND_ON_T).toFixed(4)}: lesson 5.4’s ${SLOPE.toFixed(4)}, to every digit. The formula is exact for least squares, not an approximation: that lesson’s 24.3 was 22.4 per degree plus the rain that warm days are spared.` },
            ],
          },
        },
        {
          choice: {
            prompt: `A model of the shop’s sales has a weight of −30 on “rain”. What may the shop conclude?`,
            options: [
              { text: 'Each mm of rain causes £30 less in sales.', why: 'Only if every cause of sales that moves with rain is in the model. Leave out temperature and rain takes some of its weight, as here.' },
              { text: 'Among days alike in the model’s other inputs, a mm more rain goes with £30 less; whether rain causes it depends on what is left out.', why: 'Yes. A weight is a comparison with the other inputs fixed, and only those in the model. Lesson 7.10’s coin flip is how causes are found for sure.' },
            ],
            answer: 1,
          },
        },
      ],
    },

    {
      id: 'one-hot', number: '8.5', title: 'Categories: one-hot',
      goal: 'Turn a category into 0/1 columns, meet the dummy-variable trap as a zero pivot, and read each category’s weight against a baseline.',
      builds: ['reading-model'],
      blocks: [
        { h: 'A column for each day of the week' },
        { md: 'The weekend column treats Saturday and Sunday alike. Are they? A category such as the day of the week can’t go into a model as 0 to 6 (that would claim Sunday is six times Tuesday). Give each value its own column instead: 1 on its days, 0 on the rest. This is **one-hot** encoding.' },
        {
          code: { file: 'models.py', fn: 'one_hot', notes: [['return [[1.0 if v == c else 0.0 for c in categories] for v in values]', ['Exactly one 1 in each row: that is the “one hot”.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'one_hot',
            prompt: 'Write `one_hot(values, categories)`: a row per value, with 1.0 in the column of its category and 0.0 elsewhere.',
            starter: 'def one_hot(values, categories):\n    return [[v] for v in values]\n',
            cases: cases(F.oneHot, [[[0, 2, 1], [0, 1, 2]], [['web', 'shop', 'web'], ['web', 'shop']], [DOWS.slice(0, 9), WEEK]]),
            hint: '`[[1.0 if v == c else 0.0 for c in categories] for v in values]`',
          },
        },
        {
          derive: {
            title: 'The trap',
            intro: 'Put all seven weekday columns in the model **and** the column of 1s for the intercept.',
            steps: [
              { prompt: 'For any day, what do the seven weekday columns add up to?', number: 1, compute: () => S.total(F.oneHot([DOWS[0]], WEEK)[0]), why: 'Every day is exactly one weekday.' },
              { prompt: 'So the intercept’s column is the sum of the seven others. Add 10 to the intercept and take 10 from each weekday’s weight: by how much does any prediction change?', number: 0, compute: () => 0, why: 'Not at all. Infinitely many sets of weights fit equally well, so there is no single best one: $X^\\top X$ has no inverse. This is the **dummy-variable trap**.' },
            ],
          },
        },
        {
          choice: {
            prompt: 'What does `fit` return for the model with an intercept, temperature, rain and all seven weekday columns?',
            options: [
              { text: 'Weights with a huge intercept and huge weekday weights that cancel.', why: 'Some libraries do return that, from rounding. Your `solve` checks its pivots.' },
              { text: '`None`.', why: 'Yes: in the elimination a pivot came out as 0, to within rounding (lesson 8.3’s check). Your `solve` found the trap. The way out: leave one category out. Its days become the **baseline**, and every other weekday’s weight is measured against it.' },
              { text: 'The same weights as with the weekend column.', why: 'The model has more columns than that one, and no single answer at all.' },
            ],
            answer: 1, verify: () => F.fit(XTRAP, RI) === null,
          },
        },
        {
          predict: {
            prompt: 'Leave Monday out (the baseline) and fit the intercept, temperature, rain and the six other weekdays. What is Sunday’s weight, its riders above a Monday’s at the same temperature and rain (to 1 decimal)?',
            answer: FIT_D[8], compute: () => F.fit(XD, RI)[8], tolerance: 0.05,
            explain: `${FIT_D[8].toFixed(1)}; Saturday ${FIT_D[7].toFixed(1)}; Tuesday to Friday ${FIT_D.slice(3, 7).map(v => v.toFixed(1)).join(', ')}. The generator adds 90 to both weekend days and nothing to weekdays: the weekday weights are noise, around 0, and Saturday and Sunday differ by chance. Seven columns spend six weights to learn what one weekend column says.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: `=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}=SEQUENCE(1, 6, 2)))), 1, 1)`, must: ['LINEST', 'SEQUENCE', 'WEEKDAY'],
            prompt: 'One-hot in the spreadsheet: comparing the column of weekdays with the row `SEQUENCE(1, 6, 2)` (2 to 7: Tuesday to Sunday) makes six 0/1 columns at once. LINEST lists the weights last input first, so `INDEX(…, 1, 1)` is Sunday’s.',
            hint: `\`=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}=SEQUENCE(1, 6, 2)))), 1, 1)\``,
            explain: `${sheet(`=INDEX(LINEST(days!D2:D366, HSTACK(days!B2:C366, --(${W}=SEQUENCE(1, 6, 2)))), 1, 1)`).toFixed(2)}, your ${FIT_D[8].toFixed(2)}.`,
          },
        },
      ],
    },

    {
      id: 'gradient-descent', number: '8.6', title: 'Gradient descent',
      goal: 'Fit the same model by walking downhill, find the learning rate at which the walk diverges, and see why standardising the inputs makes it hundreds of times faster.',
      builds: ['one-hot'],
      blocks: [
        { h: 'Downhill, one step at a time' },
        { md: `Solving the normal equations works when there are few weights. A neural network has millions, and a loss with no equations to solve. Then the only way is to walk: start somewhere, work out the slope of the loss (its **gradient**), take a small step downhill, and repeat. Lesson 8.2 already derived the gradient of the mean squared error:

$$\\nabla L = \\frac{2}{n} X^\\top (Xw - y)$$

Each step is $w \\leftarrow w - r \\nabla L$, with $r$ the **learning rate**.` },
        {
          code: { file: 'models.py', fn: 'gradient_descent', notes: [['errors = [total([x * v for x, v in zip(row, w)]) - t for row, t in zip(X, y)]', ['Each day’s miss, prediction minus truth.']], ['grad = [2 / n * total([errors[i] * X[i][j] for i in range(n)]) for j in range(k)]', ['$\\frac 2n X^\\top e$: for each weight, the misses weighted by its input.']], ['w = [w[j] - rate * grad[j] for j in range(k)]', ['A step against the gradient.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'gradient_descent', also: MEANS,
            prompt: 'Write `gradient_descent(X, y, rate, steps)`: start with all weights 0; each step, the misses $Xw - y$, the gradient $\\frac{2}{n} X^\\top(\\text{misses})$, and $w \\leftarrow w - r \\cdot \\text{gradient}$. Use `total` for the sums.',
            starter: 'def gradient_descent(X, y, rate, steps):\n    w = [0.0] * len(X[0])\n    return w\n',
            cases: cases(F.gradientDescent, [[[[1, 0], [1, 1], [1, 2]], [1, 3, 5], 0.1, 50], [Z.slice(0, 40), RI.slice(0, 40), 0.5, 20]]),
            hint: '`errors = [total([x * v for x, v in zip(row, w)]) - t for row, t in zip(X, y)]`, `grad = [2 / n * total([errors[i] * X[i][j] for i in range(n)]) for j in range(k)]`, then the step.',
          },
        },
        { python: { program: 'gradient_descent', label: 'Step through gradient_descent in real Python' } },
        { figure: 'DescentPath', caption: 'The walk on the loss for two weights (the intercept and the weight per degree), raw or in standard units. Change the rate.' },
        {
          derive: {
            title: 'When the walk blows up',
            intro: 'Near the bottom, along its steepest direction, the loss is a parabola $\\frac{\\lambda}{2}(w - w^*)^2$, with $\\lambda$ its curvature.',
            steps: [
              { prompt: 'Its gradient is $\\lambda(w - w^*)$. After a step, $w - w^*$ is multiplied by (in terms of r and lambda):', answer: '1-r*lambda', vars: { r: [0, 1], lambda: [0.1, 10] }, why: '$w - r\\lambda(w - w^*) - w^* = (1 - r\\lambda)(w - w^*)$.' },
              { prompt: 'The distance shrinks only if $|1 - r\\lambda| < 1$. The largest rate that still works, in terms of lambda?', answer: '2/lambda', vars: { lambda: [0.1, 10] }, why: 'Above it each step overshoots by more than it gained, and the walk runs away.' },
              { prompt: `The days’ model on the raw inputs: the largest curvature of the loss (the largest eigenvalue of $\\frac2n X^\\top X$) is ${CURVE_RAW.toFixed(1)}. The largest rate that works (to 5 decimals)?`, number: 2 / CURVE_RAW, compute: () => 2 / curvature(X), tolerance: 5e-6, why: `${(2 / CURVE_RAW).toFixed(5)}. The temperature’s squares (around 230) make the loss very steep along that weight, while along the weekend weight it is nearly flat: one rate must suit both.` },
            ],
          },
        },
        {
          predict: {
            prompt: `At rate 0.004, just under the limit, how many steps until every weight is within a millionth of the answer (raw inputs)?`,
            answer: STEPS_RAW, compute: () => F.stepsToConverge(X, RI, 0.004, 200000),
            explain: `${STEPS_RAW.toLocaleString('en-GB')} steps. At 0.0045 the walk diverges. The steep direction forces a tiny rate, and with a tiny rate the flat direction takes for ever.`,
          },
        },
        { h: 'Standard units' },
        {
          code: { file: 'models.py', fn: 'standardise', notes: [['return [[(x - m) / s for x in column], m, s]', ['Lesson 2.6’s z-scores, with the mean and sd kept to turn the weights back.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'standardise', also: SPREAD, prelude: 'import math',
            prompt: 'Write `standardise(column)`: each value minus the mean, over the sample standard deviation; return `[values, mean, sd]`.',
            starter: 'def standardise(column):\n    return [column, 0.0, 1.0]\n',
            cases: cases(F.standardise, [[[1, 2, 3, 4]], [H.slice(0, 30)]]),
            hint: '`m, s = mean(column), std(column)`, then `[[(x - m) / s for x in column], m, s]`.',
          },
        },
        {
          predict: {
            prompt: `With each input in standard units, the largest curvature is ${CURVE_Z.toFixed(3)}, so rates up to ${(2 / CURVE_Z).toFixed(3)} work. At rate 0.5, how many steps to the same accuracy?`,
            answer: STEPS_Z, compute: () => F.stepsToConverge(Z, RI, 0.5),
            explain: `${STEPS_Z} steps, against ${STEPS_RAW.toLocaleString('en-GB')}: the loss is now a round bowl, steep the same amount in every direction. At 0.8, near the limit, it zigzags and takes ${STEPS_Z_FAST}. The weights come out in standard units: ${FIT_Z[1].toFixed(2)} riders per standard deviation of temperature, which divided by the sd, ${COLS[0][2].toFixed(3)} °C, is ${(FIT_Z[1] / COLS[0][2]).toFixed(2)} per degree, the same model.`,
          },
        },
        {
          formula: {
            table: 'orders', solution: '=STANDARDIZE(days!B2, AVERAGE(days!B2:B366), STDEV.S(days!B2:B366))', must: ['STANDARDIZE'],
            prompt: 'The first day’s temperature in standard units: `STANDARDIZE(x, mean, sd)`.',
            hint: '`=STANDARDIZE(days!B2, AVERAGE(days!B2:B366), STDEV.S(days!B2:B366))`',
            explain: `${sheet('=STANDARDIZE(days!B2, AVERAGE(days!B2:B366), STDEV.S(days!B2:B366))').toFixed(4)}: 1 January was that many standard deviations below the year’s mean; your \`standardise\` gives ${COLS[0][0][0].toFixed(4)}.`,
          },
        },
      ],
    },

    {
      id: 'overfitting', number: '8.7', title: 'Overfitting',
      goal: 'Fit curves of rising degree to 20 days, measure the error on the other 345, and split the error into bias and variance.',
      builds: ['gradient-descent'],
      blocks: [
        { h: 'Twenty days to learn from' },
        { md: `Suppose the shop had counted riders on only 20 days (\`sample_without\`, seed 3). A straight line in the temperature might miss a curve; a polynomial, $w_0 + w_1 x + w_2 x^2 + \\ldots + w_d x^d$, can bend. It is still least squares: the powers of $x$ are just more columns. Each power column is put in standard units first, or the normal equations of a degree-9 curve can’t be solved in floating point.` },
        {
          code: { file: 'models.py', fn: 'polynomial', notes: [['return [[x ** k for k in range(degree + 1)] for x in xs]', ['Columns $1, x, x^2, \\ldots$: a curve is a linear model in the powers.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'polynomial',
            prompt: 'Write `polynomial(xs, degree)`: a row per x, holding $x^0$ to $x^{\\text{degree}}$.',
            starter: 'def polynomial(xs, degree):\n    return [[1.0, x] for x in xs]\n',
            cases: cases(F.polynomial, [[[0.5, -1, 2], 3], [[2], 0]]),
            hint: '`[[x ** k for k in range(degree + 1)] for x in xs]`',
          },
        },
        {
          code: { file: 'models.py', fn: 'rmse', notes: [['return math.sqrt(mean([(y - p) ** 2 for y, p in zip(ys, predictions)]))', ['In riders, the typical size of a miss.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'rmse', also: MEANS, prelude: 'import math',
            prompt: 'Write `rmse(ys, predictions)`: the square root of the mean squared miss.',
            starter: 'def rmse(ys, predictions):\n    return 0.0\n',
            cases: cases(F.rmse, [[[1, 2, 3], [1, 2, 5]], [RI, PRED]]),
            hint: '`math.sqrt(mean([(y - p) ** 2 for y, p in zip(ys, predictions)]))`',
          },
        },
        { figure: 'Overfit', caption: 'A curve of the chosen degree through the 20 days (dark), against the other 345 (pale): the error on each.' },
        {
          predict: {
            prompt: `The straight line misses the 20 days by ${TRAIN1.toFixed(1)} and the other 345 by ${TEST1.toFixed(1)} riders. A curve of degree 9 misses the 20 by ${TRAIN9.toFixed(1)}. The other 345 (to 1 decimal)?`,
            answer: TEST9, compute: () => errorsAt(9)[1], tolerance: 0.05,
            explain: `${TEST9.toFixed(1)} riders. The curve bends to pass near each of its 20 days, noise and all, and between and beyond them swings far off. Better on the data it saw, much worse on new data: **overfitting**. The test error is the honest one; the training error always falls as the model grows.`,
          },
        },
        { h: 'Bias and variance' },
        {
          derive: {
            title: 'Two ways to miss',
            intro: 'A day’s riders are $y = f + \\varepsilon$: the true pattern $f$ plus noise of variance $\\sigma^2$. The fitted curve’s prediction $\\hat f$ depends on which 20 days it learned from, so over samples it has a mean $m$ and a variance $v$.',
            steps: [
              { prompt: 'For any number $c$ and a random $\\hat f$ with mean m and variance v, $E[(c - \\hat f)^2]$ is (in terms of c, m, v):', answer: '(c-m)^2+v', vars: { c: [-5, 5], m: [-5, 5], v: [0, 5] }, why: 'Write $c - \\hat f = (c - m) - (\\hat f - m)$ and square: the cross term has mean 0.' },
              { prompt: 'With $c = f$ and the noise added, $E[(y - \\hat f)^2] = \\sigma^2 + (f - m)^2 + v$. Which of the three can a better model reduce?', number: 2, compute: () => 2, why: 'Two: the **bias**² $(f - m)^2$, how far the average curve is from the truth, and the **variance** $v$, how much the curve changes from sample to sample. The noise $\\sigma^2$ stays whatever the model.' },
            ],
          },
        },
        {
          predict: {
            prompt: `Measured over 200 samples of 20 days: the variance of the straight line’s predictions, averaged over the year’s days, is ${SPREADS[1].variance.toFixed(0)} riders². For a curve of degree 3 (to the nearest whole number)?`,
            answer: SPREADS[3].variance, compute: () => curveSpread(3).variance, tolerance: 0.5,
            explain: `${SPREADS[3].variance.toFixed(0)}; degree 5: ${SPREADS[5].variance.toFixed(0)}. What is left, bias² plus noise: ${SPREADS[0].rest.toFixed(0)} for a flat line (degree 0, all bias), ${SPREADS[1].rest.toFixed(0)} for the straight line, ${SPREADS[3].rest.toFixed(0)} for degree 3. The noise alone is about 1,600 (40²), and rain and the weekend, which no curve in temperature can see, account for most of the rest. Past degree 1 the bias hardly falls and the variance climbs: the trade-off.`,
          },
        },
      ],
    },

    {
      id: 'ridge', number: '8.8', title: 'Ridge',
      goal: 'Derive ridge regression, see it shrink a wild curve, and choose how much to shrink with a test set.',
      builds: ['overfitting'],
      blocks: [
        { h: 'A penalty for big weights' },
        { md: `The degree-9 curve's weights are huge (the largest ${Math.max(...errorsAt(9)[2].slice(1).map(Math.abs)).toFixed(0)}), cancelling each other to pass through the points. Keep the curve, but charge for large weights: minimise

$$\\lVert y - Xw \\rVert^2 + \\lambda \\lVert w \\rVert^2$$

The intercept is left out of the penalty: shrinking it would pull every prediction towards 0, which has nothing to do with wiggling. This is **ridge regression** (Hoerl and Kennard, 1970).` },
        {
          derive: {
            title: 'Ridge’s normal equations',
            intro: 'One input, no intercept: minimise $\\sum (y_i - w x_i)^2 + \\lambda w^2$. Write $S = \\sum x_i y_i$ and $Q = \\sum x_i^2$.',
            steps: [
              { prompt: 'Set the derivative, $-2S + 2wQ + 2\\lambda w$, to 0. The best w, in terms of S, Q, lambda?', answer: 'S/(Q+lambda)', vars: { S: [-10, 10], Q: [0.1, 10], lambda: [0, 10] }, why: 'Least squares is $S/Q$; ridge adds λ underneath, so the weight shrinks towards 0, and more for an input with little data behind it (small $Q$).' },
              { prompt: 'With several inputs the same steps give $(X^\\top X + \\lambda I)w = X^\\top y$. How many diagonal entries of $X^\\top X$ get λ added, for a curve of degree 9 (10 weights, the intercept not penalised)?', number: 9, compute: () => 9, why: 'All but the first. Adding to the diagonal also makes the matrix easier to solve: no pivot can be 0.' },
            ],
          },
        },
        {
          code: { file: 'models.py', fn: 'ridge', notes: [['for j in range(1, len(A)):', ['From 1: the intercept’s entry is left alone.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'ridge', given: ['transpose', 'mat_mul', 'normal_equations', 'solve'],
            prompt: 'Write `ridge(X, y, lam)`: build the normal equations, add `lam` to every diagonal entry of $X^\\top X$ except the first, and solve.',
            starter: 'def ridge(X, y, lam):\n    A, b = normal_equations(X, y)\n    return solve(A, b)\n',
            cases: cases(F.ridge, [[[[1, 0], [1, 1], [1, 2]], [1, 3, 5], 1], [X20, Y20, 10]]),
            hint: '`for j in range(1, len(A)): A[j][j] += lam`, then `return solve(A, b)`.',
          },
        },
        { figure: 'RidgePath', caption: 'The degree-9 curve through the 20 days as λ grows: the weights shrink, the curve calms, and the error on the other 345 days falls, then rises.' },
        {
          predict: {
            prompt: `Degree 9, 20 days, λ = 10. The error on the other 345 days (to 1 decimal)?`,
            answer: TEST_RIDGE10, compute: () => errorsAt(9, 10)[1], tolerance: 0.05,
            explain: `${TEST_RIDGE10.toFixed(1)} riders, against ${TEST9.toFixed(1)} with no penalty (λ = 1: ${TEST_RIDGE1.toFixed(1)}). Still worse than the plain straight line’s ${TEST1.toFixed(1)}: shrinking rescues a model that is too big, but the simplest model that fits was better here. Choosing λ by looking at those 345 days would be cheating, though: they are meant to be new data. Lesson 8.9 chooses it from the 20 alone.`,
          },
        },
      ],
    },

    {
      id: 'cross-validation', number: '8.9', title: 'Cross-validation',
      goal: 'Estimate the error on new data from the training data alone with k folds, use it to choose λ, and split by groups when the model must work for a whole new group.',
      builds: ['ridge'],
      blocks: [
        { h: 'Testing without a test set' },
        { md: 'Hold some of the data back, fit on the rest, measure on what was held back. One split wastes data and depends on luck, so do it $k$ times: split the rows into $k$ **folds**; each fold in turn is held out while the model learns from the other $k - 1$. Every row is predicted once, by a model that never saw it.' },
        {
          code: { file: 'models.py', fn: 'k_folds', notes: [['return [order[f::k] for f in range(k)]', ['Shuffled once, then dealt like cards: fold sizes differ by at most one.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'k_folds', prelude: WITH_RNG,
            prompt: 'Write `k_folds(n, k, seed)`: shuffle `0 … n − 1` with one `Rng(seed)` (for `i` from 0 to `n − 2`, swap place `i` with `i + rng.below(n - i)`), then fold `f` is every `k`-th row from place `f`.',
            starter: 'def k_folds(n, k, seed):\n    order = list(range(n))\n    return [order]\n',
            cases: cases(F.kFolds, [[10, 3, 5], [20, 5, 7]]),
            hint: 'The shuffle, then `[order[f::k] for f in range(k)]`.',
          },
        },
        {
          code: { file: 'models.py', fn: 'cross_validate', notes: [['train = [i for i in range(len(X)) if i not in held]', ['Everything outside the fold.']], ['squares += (total([x * v for x, v in zip(X[i], w)]) - y[i]) ** 2', ['Each held-out row’s miss, by a model that never saw it.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'cross_validate', given: ['transpose', 'mat_mul', 'normal_equations', 'solve', 'ridge'], also: MEANS, prelude: 'import math',
            prompt: 'Write `cross_validate(X, y, folds, lam=0.0)`: for each fold, fit `ridge` on the other rows, add up the squared misses of the fold’s rows; return the root of their mean over every predicted row.',
            starter: 'def cross_validate(X, y, folds, lam=0.0):\n    return 0.0\n',
            cases: cases(F.crossValidate, [[[[1, 0], [1, 1], [1, 2], [1, 3]], [1, 3, 4, 7], [[0, 2], [1, 3]]], [X20, Y20, FOLDS20, 3]]),
            hint: 'For each fold: `held = set(fold)`, `train = [i for i in range(len(X)) if i not in held]`, `w = ridge(...)`, then add the squared misses and count them.',
          },
        },
        {
          predict: {
            prompt: `Five folds of the 20 days (seed 7), degree 9, λ from ${LAMBDAS.join(', ')}. Which λ has the lowest cross-validated error?`,
            answer: BEST_LAMBDA, compute: () => { const e = LAMBDAS.map(l => F.crossValidate(X20, Y20, FOLDS20, l)); return LAMBDAS[e.indexOf(Math.min(...e))] },
            explain: `λ = ${BEST_LAMBDA} (cross-validated error ${Math.min(...CV20).toFixed(1)}). On the 345 unseen days it gives ${TEST_RIDGE1.toFixed(1)}; the best λ in hindsight was 10, with ${TEST_RIDGE10.toFixed(1)}. With 20 rows, every fold has 4: cross-validation is itself a noisy estimate. It used no data it shouldn’t have, which is what makes its answer honest.`,
          },
        },
        { figure: 'FoldView', caption: 'The folds of the 365 days, dealt at random or by month: which days each model learned from, and which it was tested on.' },
        { h: 'A split that respects groups' },
        { md: `Random folds put neighbouring days in different folds: a model is tested on 14 March after learning from 13 and 15 March. If the question is "how well does it predict a day in a month it has seen?", fine. If it is "how well does it predict a **month it has never seen**?" (next year's June, before June comes), the folds must hold out whole months.` },
        {
          code: { file: 'models.py', fn: 'group_folds', notes: [['folds.setdefault(g, []).append(i)', ['Every row of a group lands in the same fold.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'group_folds',
            prompt: 'Write `group_folds(groups)`: one fold per distinct value, holding the row numbers with that value, in the order values first appear.',
            starter: 'def group_folds(groups):\n    return [list(range(len(groups)))]\n',
            cases: cases(F.groupFolds, [[['a', 'b', 'a', 'c']], [MONTHS.slice(0, 70)]]),
            hint: '`folds = {}`, then `folds.setdefault(g, []).append(i)` for each `i, g`, and `list(folds.values())`.',
          },
        },
        {
          predict: {
            prompt: `A curve of degree 8 in the **day of the year** fits the season. With 12 random folds its error is ${CV_DOY[0].toFixed(1)} riders. Holding out whole months (to 1 decimal)?`,
            answer: CV_DOY[1], compute: () => F.crossValidate(Q_DOY, RI, F.groupFolds(MONTHS)), tolerance: 0.05,
            explain: `${CV_DOY[1].toFixed(1)}. With random folds the curve always had neighbours on both sides; without a month it has to bridge a 30-day gap, and a degree-8 curve swings in the gap. The straight line in the **temperature** gives ${CV_TEMP[0].toFixed(1)} and ${CV_TEMP[1].toFixed(1)}: it doesn’t care which days it saw, because the temperature, not the date, is what drives the riders. A model built on a real cause carries over to new groups; one built on position doesn’t, and only the grouped split shows it.`,
          },
        },
      ],
    },

    {
      id: 'logistic-regression', number: '8.10', title: 'Logistic regression',
      goal: 'Predict a yes/no outcome as a probability with the sigmoid, derive the log loss and its gradient, and fit on-time delivery from the courier and the distance.',
      builds: ['cross-validation'],
      blocks: [
        { h: 'A chance, not a number' },
        { md: `Will a parcel arrive on time? A straight line in the inputs can give 1.3 or −0.2, which no chance can be. Pass the line through the **sigmoid**, $\\sigma(z) = \\frac{1}{1 + e^{-z}}$, which squashes any number into 0 to 1: $p = \\sigma(w_0 + w_1 x_1 + \\ldots)$. The weights now move the **log odds**, $\\log \\frac{p}{1 - p} = z$.` },
        {
          code: { file: 'models.py', fn: 'sigmoid', notes: [['return 1 / (1 + math.exp(-z))', ['0.5 at z = 0; near 1 for large z, near 0 for very negative z.']]] },
        },
        { h: 'Which loss?' },
        { md: 'Squared error makes a poor loss for probabilities. Ask instead: how likely were the actual outcomes, according to the model? For a parcel that was on time the model gave chance $p$; for a late one, $1 - p$. Multiply over parcels, take the log (a sum is easier than a product), and change the sign so that smaller is better: the **log loss**, or cross-entropy.' },
        {
          code: { file: 'models.py', fn: 'log_loss', notes: [['return mean([-math.log(p) if y == 1 else -math.log(1 - p) for y, p in zip(ys, ps)])', ['A confident wrong answer costs a lot: −log 0.01 = 4.6, against −log 0.5 = 0.69.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'log_loss', also: MEANS, prelude: 'import math',
            prompt: 'Write `log_loss(ys, ps)`: the mean of $-\\log p$ for each yes (1) and $-\\log(1 - p)$ for each no.',
            starter: 'def log_loss(ys, ps):\n    return 0.0\n',
            cases: cases(F.logLoss, [[[1, 0, 1], [0.9, 0.2, 0.6]], [LY, LY.map(() => BASE)]]),
            hint: '`mean([-math.log(p) if y == 1 else -math.log(1 - p) for y, p in zip(ys, ps)])`',
          },
        },
        {
          derive: {
            title: 'The gradient of the log loss',
            intro: 'One parcel, outcome $y$, with $p = \\sigma(z)$ and $z = w \\cdot x$.',
            steps: [
              { prompt: 'The sigmoid’s derivative, $\\frac{d}{dz}\\frac{1}{1 + e^{-z}}$, in terms of z (use sigmoid( ))?', answer: 'sigmoid(z)*(1-sigmoid(z))', vars: { z: [-4, 4] }, why: '$\\frac{e^{-z}}{(1 + e^{-z})^2} = \\sigma(z)(1 - \\sigma(z))$.' },
              { prompt: 'The loss is $-y\\log p - (1 - y)\\log(1 - p)$. Its derivative with respect to z, in terms of z and y?', answer: 'sigmoid(z)-y', vars: { z: [-4, 4], y: [0, 1] }, why: '$-\\frac yp p(1-p) + \\frac{1-y}{1-p} p(1-p) = p - y$: the miss. The gradient for a weight is the miss times its input, exactly the form of least squares.' },
            ],
          },
        },
        {
          code: { file: 'models.py', fn: 'logistic_fit', notes: [['gaps = [sigmoid(total([x * v for x, v in zip(row, w)])) - t for row, t in zip(X, y)]', ['$p - y$ for every parcel.']], ['w = [w[j] - rate * total([gaps[i] * X[i][j] for i in range(n)]) / n for j in range(k)]', ['The mean of (p − y) × input, downhill. There are no normal equations to solve here: gradient descent (lesson 8.6) is the method.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'logistic_fit', given: ['sigmoid'], also: MEANS, prelude: 'import math',
            prompt: 'Write `logistic_fit(X, y, rate, steps)`: start at 0; each step, the gaps $\\sigma(\\text{row} \\cdot w) - y$ and $w_j \\leftarrow w_j - r \\cdot \\frac1n \\sum_i \\text{gap}_i x_{ij}$.',
            starter: 'def logistic_fit(X, y, rate, steps):\n    return [0.0] * len(X[0])\n',
            cases: cases(F.logisticFit, [[[[1, 0], [1, 1], [1, 2], [1, 3]], [0, 0, 1, 1], 1, 100], [LX, LY, 1, 50]]),
            hint: '`gaps = [sigmoid(total([x * v for x, v in zip(row, w)])) - t for row, t in zip(X, y)]`, then the step for each weight.',
          },
        },
        { figure: 'LogisticFit', caption: 'The four groups of parcels: the share on time in the data, the model’s probability as the fit runs, and the generator’s truth.' },
        {
          predict: {
            prompt: 'Fit on time from Northern (0/1), far (0/1) and Northern × far, 5,000 steps at rate 1. The model’s probability for a Northern parcel to a far town (to 3 decimals)?',
            answer: prob(1, 1), compute: () => prob(1, 1, F.logisticFit(LX, LY, 1, 5000)), tolerance: 5e-4,
            explain: `${prob(1, 1).toFixed(3)}: exactly the share in the data, ${GROUPS[0].rate.toFixed(3)}. With a weight for every combination, the best probabilities are the groups’ own rates. The generator’s truth is ${GROUPS.map(g => `${g.courier} ${g.far} ${g.truth}`).join(', ')}: the model reads ${GROUPS.map(g => prob(g.n, g.f).toFixed(2)).join(', ')}, as close as ${GROUPS.map(g => DEL.filter((_, k) => NORTH[k] === g.n && FAR[k] === g.f).length).join(', ')} parcels allow.`,
          },
        },
        {
          predict: {
            prompt: `Always guessing “on time” with chance ${BASE.toFixed(3)} (the overall rate) has log loss ${BASE_LOSS.toFixed(3)}. The model’s log loss (to 3 decimals)?`,
            answer: F.logLoss(LY, LP), compute: () => F.logLoss(LY, F.predict(LX, F.logisticFit(LX, LY, 1, 5000)).map(F.sigmoid)), tolerance: 5e-4,
            explain: `${F.logLoss(LY, LP).toFixed(3)}. Its accuracy, calling p > 0.5 “on time”: ${pct(accuracy(LP))}, against ${pct(BASE)} for always saying yes. Accuracy hides a lot when most answers are yes (Part 11); the log loss rewards the model for knowing which parcels are at risk.`,
          },
        },
        {
          chart: {
            prompt: 'Draw the model’s probability for each of the four groups as a bar (`rect`, in the order of `data`), and the generator’s truth as a `circle` on each. The weights are given: $p = \\sigma(w_0 + w_1 n + w_2 f + w_3 n f)$, with `n` 1 for Northern and `f` 1 for far.',
            data: GROUPS.map(g => ({ label: `${g.courier}, ${g.far}`, n: g.n, f: g.f, truth: g.truth })),
            starter: `const w = [${LW.map(v => v.toFixed(4)).join(', ')}]
const x = d3.scaleBand().domain(data.map(d => d.label)).range([40, 460]).padding(0.3)
const y = d3.scaleLinear().domain([0, 1]).range([270, 20])
const p = d => 0.5   // the sigmoid of w[0] + w[1] n + w[2] f + w[3] n f
svg.selectAll('rect').data(data).join('rect')
  .attr('x', d => x(d.label)).attr('width', x.bandwidth())
  .attr('y', d => y(p(d))).attr('height', d => y(0) - y(p(d))).attr('fill', 'steelblue')
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.label) + x.bandwidth() / 2).attr('cy', d => y(0.5)).attr('r', 6).attr('fill', '#b0413e')
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
`,
            solution: `const w = [${LW.map(v => v.toFixed(4)).join(', ')}]
const x = d3.scaleBand().domain(data.map(d => d.label)).range([40, 460]).padding(0.3)
const y = d3.scaleLinear().domain([0, 1]).range([270, 20])
const p = d => 1 / (1 + Math.exp(-(w[0] + w[1] * d.n + w[2] * d.f + w[3] * d.n * d.f)))
svg.selectAll('rect').data(data).join('rect')
  .attr('x', d => x(d.label)).attr('width', x.bandwidth())
  .attr('y', d => y(p(d))).attr('height', d => y(0) - y(p(d))).attr('fill', 'steelblue')
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.label) + x.bandwidth() / 2).attr('cy', d => y(d.truth)).attr('r', 6).attr('fill', '#b0413e')
svg.append('g').attr('transform', 'translate(0,270)').call(d3.axisBottom(x))
`,
            checks: [{ select: 'rect', attrs: ['y', 'height'] }, { select: 'circle', attrs: ['cy'] }],
            verify: marks => { const w = LW.map(v => Number(v.toFixed(4))); return GROUPS.every((g, k) => near(marks.rect[k].y, G.linearScale(0, 1, 270, 20, F.sigmoid(w[0] + w[1] * g.n + w[2] * g.f + w[3] * g.n * g.f)), 1e-6) && near(marks.circle[k].cy, G.linearScale(0, 1, 270, 20, g.truth), 1e-9)) },
            hint: '`const p = d => 1 / (1 + Math.exp(-(w[0] + w[1] * d.n + w[2] * d.f + w[3] * d.n * d.f)))`, and the circles at `y(d.truth)`.',
            explain: 'The biggest gap is Swift in the far towns: 16 parcels gave 0.375 where the truth is 0.50. The model can only be as good as the data in each group.',
          },
        },
        {
          formula: {
            table: 'orders', solution: `=1/(1+EXP(-(${LW[0].toFixed(4)}+${LW[1].toFixed(4)}+${LW[2].toFixed(4)}+${LW[3].toFixed(4)})))`, must: ['EXP'],
            prompt: `A Northern parcel to a far town in the spreadsheet: $1/(1 + e^{-z})$ with $z = w_0 + w_1 + w_2 + w_3$ = ${LW.map(v => v.toFixed(4)).join(' + ')}.`,
            hint: `\`=1/(1+EXP(-(${LW[0].toFixed(4)}+${LW[1].toFixed(4)}+${LW[2].toFixed(4)}+${LW[3].toFixed(4)})))\``,
            explain: `${sheet(`=1/(1+EXP(-(${LW[0].toFixed(4)}+${LW[1].toFixed(4)}+${LW[2].toFixed(4)}+${LW[3].toFixed(4)})))`).toFixed(4)}.`,
          },
        },
      ],
    },

    {
      id: 'the-leak', number: '8.11', title: 'Project: the leak',
      goal: 'Find a column that leaks the answer, see what it does to a model (perfect scores, weights that never stop growing), and judge a model by what is known when it is used.',
      builds: ['logistic-regression'],
      blocks: [
        { h: 'A better model?' },
        { md: 'The shop wants to know, when a parcel is posted, whether it will be late, so it can warn the customer. The deliveries table has one more column the model hasn’t used: **days**, how long the parcel took. Add it.' },
        {
          predict: {
            prompt: 'Logistic regression on Northern, far and days (rate 0.5). After 1,000 steps, what is its accuracy on the 162 parcels (to 3 decimals)?',
            answer: LEAK[1].acc, compute: () => { const w = F.logisticFit(LEAK_X, LY, 0.5, 1000); return accuracy(F.predict(LEAK_X, w).map(F.sigmoid)) }, tolerance: 5e-4,
            explain: `${LEAK[1].acc.toFixed(3)}: every parcel right. The log loss: ${LEAK.map(l => `${l.loss.toFixed(4)} after ${l.steps.toLocaleString('en-GB')} steps`).join(', ')}, falling towards 0; the weight on days: ${LEAK.map(l => l.w[3].toFixed(2)).join(', ')}, growing without end. A perfect model of the past, and too good to be true.`,
          },
        },
        { h: 'Hunting for the leak' },
        { md: 'When a model is suspiciously good, look for a single column that gives the answer away on its own: try every cut on it and see whether one separates yes from no.' },
        {
          code: { file: 'models.py', fn: 'threshold_accuracy', notes: [['pairs = sorted(zip(xs, ys))', ['In order of x; a cut can only fall between two different x values.']], ['best = max(best, ((left - below) + (ones - below)) / n, (below + (right - ones + below)) / n)', ['Predict 0 below the cut and 1 above, or the other way round: count the right answers both ways.']]] },
        },
        {
          write: {
            file: 'models.py', fn: 'threshold_accuracy', also: MEANS,
            prompt: 'Write `threshold_accuracy(xs, ys)`: sort the pairs by x; start from the better of “always 1” and “always 0”; walking along, at each place where x changes, count the right answers of “0 below, 1 above” and of “1 below, 0 above”; return the best share.',
            starter: 'def threshold_accuracy(xs, ys):\n    n = len(xs)\n    ones = total(ys)\n    return max(ones, n - ones) / n\n',
            cases: cases(F.thresholdAccuracy, [[[1, 2, 3, 4, 5, 1, 2], [1, 1, 0, 0, 0, 1, 1]], [[1, 2, 3], [1, 0, 1]], [DAYS_TAKEN, LY]]),
            hint: '`below` counts the 1s at or before the cut. With `left = k + 1` rows below: “0 below, 1 above” gets `(left - below) + (ones - below)` right.',
          },
        },
        {
          predict: {
            prompt: 'The best single cut on **days** alone: its accuracy?',
            answer: F.thresholdAccuracy(DAYS_TAKEN, LY), compute: () => F.thresholdAccuracy(DAYS_TAKEN, LY), tolerance: 1e-9,
            explain: `${F.thresholdAccuracy(DAYS_TAKEN, LY)}: “on time” is exactly “2 days or fewer”. On the courier alone the best is ${F.thresholdAccuracy(NORTH, LY).toFixed(3)}, no better than always saying yes. The generator decides whether a parcel is on time, then draws its days from that (1 or 2 days if on time, 3 to 5 if late): **days is the answer, written another way.**`,
          },
        },
        {
          code: { file: 'data.py', fn: 'make_deliveries', notes: [['days = 1 + rng.below(2) if on_time else 3 + rng.below(3)', ['There it is: the days are drawn from the outcome.']]] },
        },
        {
          formula: {
            table: 'orders', solution: '=COUNTIFS(deliveries!C2:C163, "<=2", deliveries!D2:D163, "no")+COUNTIFS(deliveries!C2:C163, ">2", deliveries!D2:D163, "yes")', must: ['COUNTIFS'],
            prompt: 'Check it on the sheet: count the parcels the rule “on time when days ≤ 2” gets wrong (late in 2 days or fewer, plus on time in more).',
            hint: '`=COUNTIFS(deliveries!C2:C163, "<=2", deliveries!D2:D163, "no")+COUNTIFS(deliveries!C2:C163, ">2", deliveries!D2:D163, "yes")`',
            explain: `${sheet('=COUNTIFS(deliveries!C2:C163, "<=2", deliveries!D2:D163, "no")+COUNTIFS(deliveries!C2:C163, ">2", deliveries!D2:D163, "yes")')}: none.`,
          },
        },
        {
          choice: {
            prompt: 'Which model should the shop use to warn customers when a parcel is posted?',
            options: [
              { text: 'The one with days: 100% accurate.', why: 'At posting time nobody knows how many days it will take. The model would need the answer to give the answer.' },
              { text: `The one with only the courier and the distance: about ${pct(accuracy(LP), 0)} right, and its probabilities (as low as ${Math.min(...GROUPS.map(g => prob(g.n, g.f))).toFixed(2)} for Swift to a far town) are what is known when the parcel is posted.`, why: 'Yes. A feature is only fair if its value exists at the moment the prediction is made. Ask that of every column, especially when a model looks too good.' },
            ],
            answer: 1,
          },
        },
        { md: `**Leakage** in the wild is rarely this blatant: a column filled in after the event (a refund flag, a "days in hospital"), an ID that encodes the outcome, duplicates of the same customer in training and test (lesson 8.9's groups), or data from the future in a time series (Part 9). The defences are the same: know when each value is known, split the data the way the model will be used, and distrust a perfect score.` },
        { note: 'Part 9 turns to time: days in order, trends and seasons, and why a model of a time series must never be tested on its own past.', kind: 'key' },
      ],
    },
  ],
}
