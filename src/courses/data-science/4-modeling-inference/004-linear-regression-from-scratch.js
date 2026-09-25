import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'd-03', slug: 'linear-regression-from-scratch', track: 'D', order: 4,
  title: 'Linear Regression from Scratch', subtitle: 'Fit, Solve, Diagnose',
  tags: ['regression', 'least-squares', 'normal-equations', 'R-squared', 'residuals'],
  prereqs: ['b-03', 'b-08', 'd-07'], unlocks: ['d-04', 'd-05'],
  hook: {
    question: 'How do you fit a line to data — why is THAT the best line — and how do you know if it is any good?',
    realWorldContext: 'Linear regression is the workhorse of prediction and the template for most machine-learning models: predictions, residuals, a loss to minimise, a solver, and diagnostics. Seeing each piece on four data points, by hand, makes every larger version readable.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Build the prediction, residual and loss table for a line. Derive the least squares slope and intercept for one input, then solve the same problem in matrix form with a stable solver. Interpret R² and residual plots, and explain why a good fit on training data is not yet evidence of good predictions.',
        '**Four data points.** x = [1, 2, 3, 4], y = [2, 4, 5, 8]. The model is ŷ = m·x + b: a **prediction** ŷ for each x. The **residual** is y − ŷ, and the **loss** measures all residuals together.',
        'For the line ŷ = 1.9x (m = 1.9, b = 0):',
        '| x | y | ŷ = 1.9x | residual y − ŷ | squared |\n|---|---|---|---|---|\n| 1 | 2 | 1.9 | 0.1 | 0.01 |\n| 2 | 4 | 3.8 | 0.2 | 0.04 |\n| 3 | 5 | 5.7 | −0.7 | 0.49 |\n| 4 | 8 | 7.6 | 0.4 | 0.16 |\n| | | | **sum of squares (SSR)** | **0.70** |',
        '**Two conventions for the loss.** The **sum of squared residuals** (SSR) is 0.70; the **mean squared error** (MSE) divides by n: 0.70 / 4 = 0.175. Both are smallest for the same line; the MSE does not grow just because there are more rows, so it compares datasets of different sizes. State which one you report.',
      ),
      check(
        'Another line gives residuals 0.5, −0.5, 0.5, −0.5. What are its SSR and MSE?',
        ['SSR 0, MSE 0 — the residuals cancel', 'SSR 1.0, MSE 0.25', 'SSR 2.0, MSE 0.5'],
        1,
        'Each squared residual is 0.25; four of them sum to 1.0, and the mean is 0.25. Squaring stops positive and negative residuals from cancelling.',
      ),
      prose({ anchor: 'least-squares' },
        '**Why 1.9 and 0? Deriving the best line.** Least squares chooses m and b to make SSR = Σ(y − m·x − b)² as small as possible. At the minimum, changing either number slightly cannot lower the SSR, so both derivatives are zero (Lesson D.06 explains derivatives step by step):',
        '1. **Derivative with respect to b** = −2 Σ(y − m·x − b) = 0, so the residuals sum to zero, which gives **b = ȳ − m·x̄**: the line passes through the point of means (x̄, ȳ) = (2.5, 4.75).\n2. **Derivative with respect to m**, after substituting b, gives **m = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²**.',
        '| x − x̄ | y − ȳ | product | (x − x̄)² |\n|---|---|---|---|\n| −1.5 | −2.75 | 4.125 | 2.25 |\n| −0.5 | −0.75 | 0.375 | 0.25 |\n| 0.5 | 0.25 | 0.125 | 0.25 |\n| 1.5 | 3.25 | 4.875 | 2.25 |\n| | **sums** | **9.5** | **5.0** |',
        'So m = 9.5 / 5.0 = **1.9** and b = 4.75 − 1.9 × 2.5 = **0**. The denominator Σ(x − x̄)² is zero when every x is the same: then no unique slope exists (Lesson B.03).',
      ),
      notebook('A line by hand', [
        demo(1, 'Stage 1 — The prediction, residual and loss table', [
          'The table above, computed. `m` and `b` come from the two formulas.',
        ], 'Run and compare with both tables. Then change y[2] from 5 to 6 and predict which of m, b and SSR change.', 'import numpy as np\nx = np.array([1.0, 2, 3, 4])\ny = np.array([2.0, 4, 5, 8])\nm = ((x - x.mean()) * (y - y.mean())).sum() / ((x - x.mean()) ** 2).sum()\nb = y.mean() - m * x.mean()\npred = m * x + b\nres = y - pred\nprint("m =", round(m, 4), " b =", round(b, 4))\nprint("residuals:", np.round(res, 2), " sum:", round(res.sum(), 10))\nprint("SSR:", round((res ** 2).sum(), 4), " MSE:", round((res ** 2).mean(), 4))\nprint("polyfit agrees:", np.allclose(np.polyfit(x, y, 1), [m, b]))', { expectOutput: ['m = 1.9  b = 0.0', 'residuals: [ 0.1  0.2 -0.7  0.4]  sum: 0.0', 'SSR: 0.7  MSE: 0.175', 'polyfit agrees: True'] }),
      ]),
      prose(
        '**The matrix form, and a stable solver.** Stack a column of ones (for b) and the x values into a **design matrix** X, and the coefficients into β = [b, m]. Then the predictions are X β, and setting the derivatives to zero gives the **normal equations** (XᵀX) β = Xᵀy. This form handles any number of input columns.',
        'You will often see β = (XᵀX)⁻¹Xᵀy. That is a correct formula but a poor recipe: forming an inverse is slower and loses accuracy when columns are nearly redundant. In code use `np.linalg.lstsq(X, y)`, which solves the least-squares problem directly and reports the **rank** of X. If the rank is less than the number of columns (for example, every x equal), there is no unique answer — and, as you saw in Lesson B.08, a solver may return nan or raise an error depending on the build, so check the rank rather than waiting for an error.',
      ),
      notebook('Matrix form', [
        demo(2, 'Stage 2 — Normal equations and lstsq agree', [
          'The same four points in matrix form. `lstsq` returns the coefficients, the SSR, the rank and more.',
        ], 'Run. Then set every x to 3 and check what rank lstsq reports.', 'import numpy as np\nx = np.array([1.0, 2, 3, 4])\ny = np.array([2.0, 4, 5, 8])\nX = np.column_stack([np.ones_like(x), x])\nbeta_ne = np.linalg.solve(X.T @ X, X.T @ y)\nbeta, ssr, rank, _ = np.linalg.lstsq(X, y, rcond=None)\nprint("normal equations:", np.round(beta_ne, 4))\nprint("lstsq:", np.round(beta, 4), " SSR:", np.round(ssr, 4), " rank:", rank)', { expectOutput: ['1.9]', 'SSR: [0.7]  rank: 2'] }),
        demo(3, 'Stage 3 — A constant input has no unique line', [
          'All four x values are 3. The x column is then 3 × the column of ones, so the design matrix has rank 1, not 2.',
        ], 'Run. Why does "lstsq reports rank 1" matter more than whatever numbers it returns?', 'import numpy as np\nX_bad = np.column_stack([np.ones(4), np.full(4, 3.0)])\ny = np.array([2.0, 4, 5, 8])\nbeta, _, rank, _ = np.linalg.lstsq(X_bad, y, rcond=None)\nprint("rank:", rank, "of", X_bad.shape[1], "columns")\nprint("one of infinitely many solutions:", np.round(beta, 4))', { expectOutput: ['rank: 1 of 2 columns'] }),
      ]),
      prose(
        '**R²: how much variation the line explains.** R² = 1 − SSR / SST, where SST = Σ(y − ȳ)² is the SSR of the "always predict the mean" line. For our four points SST = 18.75, so R² = 1 − 0.70 / 18.75 = 0.963. R² = 1 is a perfect fit; 0 means no better than predicting the mean; it can be negative for a model worse than the mean.',
        '**The evaluation bridge.** R² and MSE computed on the rows used for fitting measure *fit*, not *prediction*: least squares made them as good as possible for exactly those rows. To estimate how well the line predicts new data, hold some rows out, fit on the rest, and measure the error on the held-out rows. Held-out error is usually larger. Lesson D.07 builds this into a full evaluation procedure.',
      ),
      notebook('Fit versus prediction', [
        demo(4, 'Stage 4 — Training MSE and held-out MSE', [
          'Fit on the first six of eight points, then compare the error on those six with the error on the two held-out points.',
        ], 'Run. Which error is larger, and why is that expected?', 'import numpy as np\nxs = np.array([1.0, 2, 3, 4, 5, 6, 7, 8])\nys = np.array([2.1, 3.8, 5.9, 8.2, 9.8, 12.1, 14.3, 16.0])\nm, b = np.polyfit(xs[:6], ys[:6], 1)\ntrain_mse = np.mean((ys[:6] - (m * xs[:6] + b)) ** 2)\nheld_out_mse = np.mean((ys[6:] - (m * xs[6:] + b)) ** 2)\nprint(f"train MSE {train_mse:.4f}   held-out MSE {held_out_mse:.4f}")', { expectOutput: ['train MSE 0.0245   held-out MSE 0.0413'] }),
      ]),
      prose(
        '**Residual plots: two separate questions.** Plot residuals against predicted values. Is the **centre** near zero everywhere? A curve (positive, negative, positive) means a straight line is the wrong shape for the mean. Is the **spread** constant? A funnel — spread growing with the prediction, called *heteroscedasticity* — does not by itself mean the fitted mean is wrong, but errors are larger in some regions, so uncertainty statements that assume constant spread will mislead.',
      ),
      notebook('Residual diagnostics', [
        demo(5, 'Stage 5 — A curve means the wrong shape', [
          'The data are quadratic, but a straight line was fitted. The residuals form a clear curve.',
        ], 'Run. Then fit np.polyfit(xs, ys, 2) and plot its residuals instead.', 'from opencalc import Figure\nimport numpy as np\nrng = np.random.default_rng(42)\nxs = np.linspace(0, 5, 30)\nys = xs ** 2 + rng.normal(0, 1, 30)\nm, b = np.polyfit(xs, ys, 1)\npred = m * xs + b\nres = ys - pred\nfig = Figure(xmin=-5, xmax=25, ymin=-8, ymax=8, title="Residuals against predictions")\nfig.grid().axes()\nfig.xlabel("predicted").ylabel("residual")\nfig.scatter(pred.tolist(), res.tolist(), color="blue", radius=3)\nfig.hline(0, color="amber")\nfig.show()'),
        demo(6, 'Stage 6 — A funnel is not a curve', [
          'The true mean is a straight line, y = 2x + 1, but the noise grows with x. The fit recovers the line well and the residuals are centred on zero in both halves; only their spread changes.',
        ], 'Run. Compare the fitted numbers with 2 and 1, then the residual means and spreads in each half.', 'import numpy as np\nrng = np.random.default_rng(3)\nxs = np.linspace(1, 10, 200)\nys = 2 * xs + 1 + rng.normal(0, 0.3 * xs)\nX = np.column_stack([np.ones_like(xs), xs])\n(b, m), *_ = np.linalg.lstsq(X, ys, rcond=None)\nres = ys - (m * xs + b)\nprint(f"fit: y = {m:.3f}x + {b:.3f}   (truth: y = 2x + 1)")\nleft, right = xs < 5.5, xs >= 5.5\nprint(f"left half:  residual mean {res[left].mean():+.3f}, sd {res[left].std():.3f}")\nprint(f"right half: residual mean {res[right].mean():+.3f}, sd {res[right].std():.3f}")', { expectOutput: ['(truth: y = 2x + 1)'] }),
      ]),
      prose('**Practice.** Challenge 1 solves the normal equations. Challenge 2 refuses to fit when no unique line exists. Challenge 3 is a fresh fit-and-diagnose problem.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Solve the normal equations', 'medium', {
          prompt: 'Fit y = m·x + b by solving (XᵀX)β = Xᵀy with np.linalg.solve (no explicit inverse). Store m, b and r2 (R² on these points).',
          instructions: '1. X = column of ones and xs.\n2. beta = `np.linalg.solve(X.T @ X, X.T @ ys)`; beta[0] is b, beta[1] is m.\n3. r2 = 1 − SSR / SST.',
          code: 'import numpy as np\nxs = np.array([1.0, 2, 3, 4, 5])\nys = np.array([2.0, 4.1, 5.9, 8.2, 10.0])\nm = None\nb = None\nr2 = None',
          testCode: `import numpy as np
em, eb = np.polyfit(xs, ys, 1)
assert m is not None and not np.isclose(m, eb), "beta is [b, m]: the first entry is the intercept (it multiplies the column of ones)"
assert np.isclose(m, em) and np.isclose(b, eb), f"Expected m ≈ {em:.4f} and b ≈ {eb:.4f}"
er2 = 1 - np.sum((ys - (em * xs + eb)) ** 2) / np.sum((ys - ys.mean()) ** 2)
assert np.isclose(r2, er2), f"r2 should be 1 - SSR/SST ≈ {er2:.4f}"
"SUCCESS: y ≈ 2.01x + 0.01 with R² ≈ 0.999 on these points."`,
          hint: 'X = np.column_stack([np.ones(len(xs)), xs]); b, m = np.linalg.solve(X.T @ X, X.T @ ys)',
          solution: 'import numpy as np\nxs = np.array([1.0, 2, 3, 4, 5])\nys = np.array([2.0, 4.1, 5.9, 8.2, 10.0])\nX = np.column_stack([np.ones(len(xs)), xs])\nb, m = np.linalg.solve(X.T @ X, X.T @ ys)\nr2 = 1 - np.sum((ys - (m * xs + b)) ** 2) / np.sum((ys - ys.mean()) ** 2)',
          misconceptions: [{ code: 'import numpy as np\nxs = np.array([1.0, 2, 3, 4, 5])\nys = np.array([2.0, 4.1, 5.9, 8.2, 10.0])\nX = np.column_stack([np.ones(len(xs)), xs])\nm, b = np.linalg.solve(X.T @ X, X.T @ ys)\nr2 = 0.999', feedback: 'beta is [b, m]' }],
        }),
        exercise(12, 2, 'Challenge 2 — Refuse an impossible fit', 'medium', {
          prompt: 'Write fit_line(x, y) that returns (m, b) using np.linalg.lstsq, but raises ValueError with a helpful message when the design matrix is rank-deficient (for example, all x equal).',
          instructions: '`lstsq` returns (beta, ssr, rank, singular_values). Compare rank with the number of columns.',
          code: 'import numpy as np\n\ndef fit_line(x, y):\n    X = np.column_stack([np.ones(len(x)), x])\n    beta, _, rank, _ = np.linalg.lstsq(X, y, rcond=None)\n    return beta[1], beta[0]',
          testCode: `import numpy as np
m, b = fit_line(np.array([1.0, 2, 3, 4]), np.array([2.0, 4, 5, 8]))
assert np.isclose(m, 1.9) and np.isclose(b, 0), "fit_line should return (m, b) = (1.9, 0) for the lesson's data"
try:
    fit_line(np.array([3.0, 3, 3]), np.array([1.0, 2, 3]))
except ValueError:
    pass
else:
    raise AssertionError("With every x equal the rank is 1, so no unique line exists: raise ValueError instead of returning numbers")
"SUCCESS: the function fits when it can and refuses clearly when no unique line exists."`,
          hint: 'if rank < X.shape[1]: raise ValueError("x has no variation: no unique line")',
          solution: 'import numpy as np\n\ndef fit_line(x, y):\n    X = np.column_stack([np.ones(len(x)), x])\n    beta, _, rank, _ = np.linalg.lstsq(X, y, rcond=None)\n    if rank < X.shape[1]:\n        raise ValueError("x has no variation, so there is no unique line")\n    return beta[1], beta[0]',
          misconceptions: [{ code: 'import numpy as np\ndef fit_line(x, y):\n    X = np.column_stack([np.ones(len(x)), x])\n    beta, _, rank, _ = np.linalg.lstsq(X, y, rcond=None)\n    return beta[1], beta[0]', feedback: 'raise ValueError instead of returning numbers' }],
        }),
        exercise(13, 3, 'Challenge 3 — Fit and diagnose', 'hard', {
          prompt: 'For each of two datasets, fit a line on the first 30 points and compute train_mse and held_out_mse on the last 10. Then diagnose each fit as "ok", "curve" (wrong shape) or "funnel" (spread grows) from its training residuals, storing results in the dict report.',
          prose: ['Dataset A and B are generated below. To diagnose, compare residual means in the lower, middle and upper thirds of x (a curve shows up as a sign pattern) and residual spreads in the lower and upper halves (a funnel shows up as a growing spread).'],
          instructions: 'report = {"A": {"train_mse": …, "held_out_mse": …, "diagnosis": …}, "B": {…}}. Plotting the residuals first will help you decide.',
          code: 'import numpy as np\nrng = np.random.default_rng(8)\nx = np.linspace(0, 10, 40)\ny_A = 0.5 * x ** 2 + rng.normal(0, 1.0, 40)\ny_B = 3 * x + 2 + rng.normal(0, 0.1 + 0.4 * x, 40)\nreport = {}',
          testCode: `import numpy as np
for name, yv in [("A", y_A), ("B", y_B)]:
    m, b = np.polyfit(x[:30], yv[:30], 1)
    tr = np.mean((yv[:30] - (m * x[:30] + b)) ** 2)
    ho = np.mean((yv[30:] - (m * x[30:] + b)) ** 2)
    assert name in report, f"report is missing dataset {name}"
    assert np.isclose(report[name]["train_mse"], tr), f"{name}: train_mse should use the first 30 points, about {tr:.3f}"
    assert np.isclose(report[name]["held_out_mse"], ho), f"{name}: held_out_mse should use the last 10 points, about {ho:.3f}"
assert report["A"]["diagnosis"] == "curve", "Dataset A is quadratic: its residuals are positive at both ends and negative in the middle — a curve"
assert report["B"]["diagnosis"] == "funnel", "Dataset B has a straight-line mean with noise that grows with x — a funnel, not a curve"
assert report["A"]["held_out_mse"] > report["A"]["train_mse"], "For A the held-out error should exceed the training error: the straight line extrapolates badly"
"SUCCESS: A needs a different shape (its held-out error explodes); B's line is fine for the mean, but its errors grow with x."`,
          hint: 'res = y[:30] - (m * x[:30] + b). Thirds: res[:10].mean(), res[10:20].mean(), res[20:].mean(). Halves: res[:15].std(), res[15:].std().',
          solution: 'import numpy as np\nrng = np.random.default_rng(8)\nx = np.linspace(0, 10, 40)\ny_A = 0.5 * x ** 2 + rng.normal(0, 1.0, 40)\ny_B = 3 * x + 2 + rng.normal(0, 0.1 + 0.4 * x, 40)\nreport = {}\nfor name, yv, diag in [("A", y_A, "curve"), ("B", y_B, "funnel")]:\n    m, b = np.polyfit(x[:30], yv[:30], 1)\n    res = yv[:30] - (m * x[:30] + b)\n    report[name] = {\n        "train_mse": float(np.mean(res ** 2)),\n        "held_out_mse": float(np.mean((yv[30:] - (m * x[30:] + b)) ** 2)),\n        "diagnosis": diag,\n    }',
          misconceptions: [{ code: 'import numpy as np\nrng = np.random.default_rng(8)\nx = np.linspace(0, 10, 40)\ny_A = 0.5 * x ** 2 + rng.normal(0, 1.0, 40)\ny_B = 3 * x + 2 + rng.normal(0, 0.1 + 0.4 * x, 40)\nreport = {}\nfor name, yv in [("A", y_A), ("B", y_B)]:\n    m, b = np.polyfit(x[:30], yv[:30], 1)\n    report[name] = {"train_mse": float(np.mean((yv[:30] - (m * x[:30] + b)) ** 2)), "held_out_mse": float(np.mean((yv[30:] - (m * x[30:] + b)) ** 2)), "diagnosis": "curve"}', feedback: 'a funnel, not a curve' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Prediction ŷ = m·x + b; residual y − ŷ; loss SSR = Σ residual² or MSE = SSR / n — say which.',
    'Least squares: b = ȳ − m·x̄ and m = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²; no unique slope when every x is equal.',
    'Matrix form: normal equations (XᵀX)β = Xᵀy; compute with lstsq and check the rank.',
    'R² and MSE on training rows measure fit; held-out rows measure prediction.',
    'Residual curve → wrong shape for the mean; residual funnel → changing spread.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Why does least squares square the residuals?',
      options: [
        'Squares are faster to compute',
        'So positive and negative residuals cannot cancel, larger misses count more, and the loss is smooth enough to minimise by setting derivatives to zero',
        'Absolute values are not allowed in Python',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'A model has R² = −0.2. What does it mean?',
      options: ['A calculation error', 'It fits worse than always predicting the mean', 'It explains 20% of the variation'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Residuals are positive at small and large predictions and negative in the middle. What does that indicate?',
      options: ['Overfitting', 'The relationship is curved, so a straight line is the wrong shape', 'Nothing — it is expected'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Training MSE is 0.02 and held-out MSE is 0.40. What should you conclude?',
      options: [
        'The model predicts new data about as well as it fits the training data',
        'The training fit overstates predictive accuracy; the model does much worse on data it has not seen',
        'The held-out data are wrong',
      ],
      correct: 1,
    },
  ],
}
