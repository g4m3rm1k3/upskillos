// Lab 01 runnable cells and math ↔ code tables, keyed by lesson id. Every cell follows
// the same rhythm: predict the output, run it, change one value, explain what changed.
const SMALL = `import numpy as np
x = np.array([0.5, 1.0, 1.5, 2.0, 2.5, 3.0])
y = np.array([1.6, 2.6, 3.4, 4.2, 5.1, 5.9])      # roughly y = 1.7x + 0.8, plus noise`

export const extras = {
  arrays: {
    mathCode: {
      rows: [
        ['$x_1 w_1 + x_2 w_2$', 'inputs[0] * weights[0] + inputs[1] * weights[1]', 'The weighted sum, written out.'],
        ['$x \\cdot w$', 'inputs @ weights', 'The same number as a dot product.'],
        ['$(x_1 w_1,\\; x_2 w_2)$', 'inputs * weights', 'Elementwise products — not yet added.'],
        ['$Xw$', 'X @ weights', 'One prediction per row of X.'],
      ],
    },
    notebook: {
      title: 'Lab 01 · 00a · Lists, arrays and weighted sums',
      intro: 'Five tiny experiments. For each cell: **predict** what it prints, **run** it, **change** the value suggested, and **explain** the difference in one sentence.',
      cells: [{
        title: 'Same expression, two meanings',
        prose: '**Predict** both lines before running. **Then change** `2 *` to `x_list + x_list` and `x_arr + x_arr`.',
        code: `import numpy as np
x_list = [2, 3, 4]
x_arr = np.array([2, 3, 4])
print(2 * x_list)
print(2 * x_arr)`,
      }, {
        title: 'One weight changes one contribution',
        prose: 'The file-processing example: 2 MB and 3 files, 4 s per MB and 5 s per file. **Predict** the prediction. **Then change** `weights[1]` to 6: which contribution changes, and by how much?',
        code: `inputs = np.array([2, 3])      # [size in MB, number of files]
weights = np.array([4, 5])     # [seconds per MB, seconds per file]
print("contributions:", inputs * weights)
print("prediction   :", inputs @ weights, "seconds")`,
      }, {
        title: 'Many rows at once',
        prose: 'Each row is one batch. **Predict** the shape of `X @ weights` before running.',
        code: `X = np.array([[2, 3],
              [1, 1],
              [5, 2],
              [0, 4]])
predictions = X @ weights
print(predictions, predictions.shape)`,
      }, {
        title: 'A boolean mask selects rows',
        prose: '**Predict** which batches take longer than 20 seconds. **Then change** the threshold to 25.',
        code: `slow = predictions > 20
print(slow)                 # one True/False per row
print(X[slow])              # only the rows where the mask is True
print("how many:", slow.sum())`,
      }, {
        title: 'The silent shape mistake',
        prose: 'Measured times have shape (4,). **Predict** the shape of each difference.',
        code: `measured = np.array([23.4, 9.2, 29.1, 20.6])
print((predictions - measured).shape)
print((predictions.reshape(-1, 1) - measured).shape)   # a column minus a row`,
      }],
    },
  },
  slopes: {
    mathCode: {
      rows: [
        ['$\\frac{f(t+h) - f(t)}{h}$', '(f(t + h) - f(t)) / h', 'Average slope over a step h.'],
        ['$\\frac{d}{dt}\\,t^2 = 2t$', '2 * t', 'The limit as h shrinks.'],
        ['$\\frac{dL}{dt} = 2e \\cdot \\frac{de}{dt}$', '2 * e(t) * 3', 'Chain rule for L = e², e = 3t − 1.'],
        ['$\\frac{f(t+h) - f(t-h)}{2h}$', '(f(t + h) - f(t - h)) / (2 * h)', 'Centered slope: a numerical check.'],
      ],
    },
    notebook: {
      title: 'Lab 01 · 00b · Slopes and the chain rule, numerically',
      intro: 'Watch an average slope approach the derivative, then check the chain rule with a measured slope.',
      cells: [{
        title: 'Average slopes approach the derivative',
        prose: 'f(t) = t² at t = 2. **Predict** the number the slopes approach. **Then change** t to 3.',
        code: `def f(t):
    return t ** 2

t = 2
for h in [1, 0.5, 0.1, 0.01, 0.001]:
    print(f"h = {h:<6} average slope = {(f(t + h) - f(t)) / h:.4f}")`,
      }, {
        title: 'The chain rule, checked',
        prose: 'e = 3t − 1 and L = e². **Predict** dL/dt at t = 1 from the rule 2e × 3, then compare with the measured slope.',
        code: `def e(t):
    return 3 * t - 1

def L(t):
    return e(t) ** 2

t, h = 1, 1e-5
print("chain rule :", 2 * e(t) * 3)
print("measured   :", (L(t + h) - L(t - h)) / (2 * h))`,
      }, {
        title: 'A partial derivative: move one input only',
        prose: 'L(w, b) = (2w + b − 5)². Nudge w and hold b fixed; then do the reverse. **Predict** which slope is larger in size, and why.',
        code: `def L2(w, b):
    return (2 * w + b - 5) ** 2

w, b, h = 1.0, 0.0, 1e-5
print("dL/dw:", (L2(w + h, b) - L2(w - h, b)) / (2 * h))
print("dL/db:", (L2(w, b + h) - L2(w, b - h)) / (2 * h))`,
      }],
    },
  },
  model: {
    mathCode: {
      rows: [
        ['$\\hat y = wx + b$', 'y_hat = w * x + b', 'The model’s prediction.'],
        ['$w$', 'w', 'Change in prediction per unit of x.'],
        ['$b$', 'b', 'The prediction at x = 0.'],
        ['$\\bar y_{\\text{train}}$', 'y_train.mean()', 'The mean baseline: the same prediction for every x.'],
      ],
    },
    notebook: {
      title: 'Lab 01 · 01 · A model is a claim',
      intro: 'Write the model as a Python function, see what w and b each do, and build the baseline it must beat.',
      cells: [{
        title: 'The model is a function',
        prose: '**Predict** `predict(3, w=2, b=1)` before running.',
        code: `import numpy as np
def predict(x, w, b):
    return w * x + b

print(predict(3, w=2, b=1))
xs = np.array([-2, -1, 0, 1, 2])
print(predict(xs, w=2, b=1))`,
      }, {
        title: 'What does w do at negative x?',
        prose: '**Predict**: when w goes from 1 to 2, do predictions at negative x go up or down? **Then change** b instead and compare.',
        code: `for w in [1, 2]:
    print(f"w = {w}:", predict(xs, w=w, b=0))`,
      }, {
        title: 'The mean baseline',
        prose: 'The baseline ignores x completely. Any model worth using must beat it on data it has not seen.',
        code: `y_train = np.array([2.3, 2.9, 4.1, 5.2, 5.8])
baseline = y_train.mean()
print("baseline predicts", baseline, "for every input")`,
      }],
    },
  },
  loss: {
    mathCode: {
      rows: [
        ['$e_i = \\hat y_i - y_i$', 'e = y_hat - y', 'One error per observation.'],
        ['$J = \\frac{1}{n}\\sum_i e_i^2$', 'np.mean(e ** 2)', 'Mean squared error.'],
        ['$\\sqrt{J}$', 'np.sqrt(np.mean(e ** 2))', 'Root mean squared error, in the target’s units.'],
      ],
    },
    notebook: {
      title: 'Lab 01 · 02 · Mean squared error',
      intro: 'Compute MSE by hand and with NumPy, see why the mean error hides mistakes, and measure how much one outlier contributes.',
      cells: [{
        title: 'By hand, then with NumPy',
        prose: 'Predictions 2 and 4; observations 1 and 6. **Predict** the MSE and the mean error.',
        code: `import numpy as np
y_hat = np.array([2, 4])
y = np.array([1, 6])
e = y_hat - y
print("errors:", e, " squared:", e ** 2)
print("MSE:", np.mean(e ** 2), "  mean error:", np.mean(e))`,
      }, {
        title: 'One outlier',
        prose: 'Nine small errors and one of size 10. **Predict** what fraction of the MSE comes from the outlier. **Then change** 10 to 3.',
        code: `e = np.array([1, -1, 0.5, -0.5, 1, -1, 0.5, -0.5, 1, 10.0])
share = e[-1] ** 2 / np.sum(e ** 2)
print("MSE:", np.mean(e ** 2), "  outlier's share:", round(share, 3))`,
      }, {
        title: 'Units',
        prose: 'If y is in seconds, MSE is in seconds². RMSE brings it back to seconds.',
        code: `print("RMSE:", np.sqrt(np.mean(e ** 2)), "seconds")`,
      }],
    },
  },
  gradient: {
    mathCode: {
      rows: [
        ['$e = wx + b - y$', 'e = w * x + b - y', 'Errors at the current parameters.'],
        ['$\\frac{\\partial J}{\\partial w} = \\frac{2}{n}\\sum_i e_i x_i$', 'dw = 2 * np.mean(e * x)', 'Weight derivative.'],
        ['$\\frac{\\partial J}{\\partial b} = \\frac{2}{n}\\sum_i e_i$', 'db = 2 * np.mean(e)', 'Bias derivative.'],
        ['$\\frac{J(w+\\varepsilon) - J(w-\\varepsilon)}{2\\varepsilon}$', '(J(w + eps, b) - J(w - eps, b)) / (2 * eps)', 'Numerical check of dw.'],
      ],
    },
    notebook: {
      title: 'Lab 01 · 03 · The gradient, derived and checked',
      intro: 'Compute both derivatives for one observation and for a dataset, then check them against finite differences.',
      cells: [{
        title: 'One observation',
        prose: 'x = 2, y = 5, w = 1, b = 0. **Predict the signs** of dw and db before running.',
        code: `x, y, w, b = 2, 5, 1, 0
e = w * x + b - y
print("error:", e, "  dw:", 2 * e * x, "  db:", 2 * e)`,
      }, {
        title: 'A whole dataset',
        prose: 'The gradient of an average is the average of the per-row gradients.',
        code: SMALL + `

def grads(w, b):
    e = w * x + b - y
    return 2 * np.mean(e * x), 2 * np.mean(e)

print(grads(0.0, 0.0))`,
      }, {
        title: 'Check with finite differences',
        prose: '**Change** `eps` to 1e-1 and 1e-12. Which agrees best, and why does the tiny one get worse?',
        code: `def J(w, b):
    return np.mean((w * x + b - y) ** 2)

w, b, eps = 0.5, 0.2, 1e-5
print("formula :", grads(w, b))
print("measured:", ((J(w + eps, b) - J(w - eps, b)) / (2 * eps), (J(w, b + eps) - J(w, b - eps)) / (2 * eps)))`,
      }],
    },
  },
  training: {
    mathCode: {
      rows: [
        ['$w \\leftarrow w - \\alpha \\frac{\\partial J}{\\partial w}$', 'w = w - alpha * dw', 'Step against the slope.'],
        ['$b \\leftarrow b - \\alpha \\frac{\\partial J}{\\partial b}$', 'b = b - alpha * db', 'Same for the bias.'],
        ['same old $(w, b)$', 'dw, db = grads(w, b)', 'Both derivatives come from the parameters before the update.'],
      ],
    },
    notebook: {
      title: 'Lab 01 · 04 · Gradient descent',
      intro: 'Reproduce the lesson’s single update, then train with three learning rates and see which one diverges.',
      cells: [{
        title: 'The update from the text',
        prose: '**Predict** the new w and b, and the new prediction at x = 2.',
        code: `w, b, alpha = 1.0, 0.0, 0.1
dw, db = -12, -6
w, b = w - alpha * dw, b - alpha * db
print("w =", w, " b =", b, " prediction at x = 2:", w * 2 + b)`,
      }, {
        title: 'Three learning rates',
        prose: '**Predict** which rate is too slow, which works and which explodes. **Then change** the data to `x * 10`: what happens to the rate that worked?',
        code: SMALL + `

def train(alpha, steps=20):
    w = b = 0.0
    for step in range(steps):
        e = w * x + b - y
        dw, db = 2 * np.mean(e * x), 2 * np.mean(e)   # both from the same old w, b
        w, b = w - alpha * dw, b - alpha * db
    return w, b, np.mean((w * x + b - y) ** 2)

for alpha in [0.01, 0.1, 1.0]:
    w, b, mse = train(alpha)
    print(f"alpha = {alpha:<5} w = {w:10.4g}  b = {b:10.4g}  MSE = {mse:.4g}")`,
      }],
    },
  },
  evaluate: {
    mathCode: {
      rows: [
        ['$\\bar y_{\\text{train}}$', 'baseline = y_train.mean()', 'Learned from training rows only.'],
        ['validation MSE', 'np.mean((w * x_val + b - y_val) ** 2)', 'Measured on rows the fit never saw.'],
        ['least-squares $w^*, b^*$', 'np.polyfit(x_train, y_train, 1)', 'The best line for the training rows.'],
      ],
    },
    notebook: {
      title: 'Lab 01 · 05 · Beat a baseline on held-out data',
      intro: 'Split once with a seed, fit on the training rows, and compare the model with the mean baseline on validation rows. Then see what a line cannot do.',
      cells: [{
        title: 'Split, fit, compare',
        prose: '**Predict** whether the line beats the baseline here. **Then change** the seed: does the answer change?',
        code: `import numpy as np
rng = np.random.default_rng(42)
x = rng.uniform(0, 5, 40)
y = 1.7 * x + 0.8 + rng.normal(0, 0.7, 40)
idx = rng.permutation(40)
tr, va = idx[:32], idx[32:]
w, b = np.polyfit(x[tr], y[tr], 1)
baseline = y[tr].mean()
print("model    validation MSE:", np.mean((w * x[va] + b - y[va]) ** 2))
print("baseline validation MSE:", np.mean((baseline - y[va]) ** 2))`,
      }, {
        title: 'A line cannot fit a curve',
        prose: 'Residuals of the best line on curved data, averaged by region of x. **Predict** the pattern of signs.',
        code: `yc = 0.5 * x ** 2 + rng.normal(0, 0.3, 40)
w, b = np.polyfit(x[tr], yc[tr], 1)
res = w * x + b - yc
for lo, hi in [(0, 1.5), (1.5, 3.5), (3.5, 5)]:
    m = (x >= lo) & (x < hi)
    print(f"x in [{lo}, {hi}): mean residual {res[m].mean():+.2f}")`,
      }],
    },
  },
  transfer: {
    mathCode: {
      rows: [
        ['$w^* = \\frac{\\sum (x - \\bar x)(y - \\bar y)}{\\sum (x - \\bar x)^2}$', 'np.sum((x - x.mean()) * (y - y.mean())) / np.sum((x - x.mean()) ** 2)', 'The least-squares slope.'],
        ['$b^* = \\bar y - w^* \\bar x$', 'y.mean() - w_star * x.mean()', 'The least-squares intercept.'],
      ],
    },
    notebook: {
      title: 'Lab 01 · 06 · The direct solution and your own data',
      intro: 'Compute the least-squares line from its formula, check it against NumPy, then paste in your own measurements.',
      cells: [{
        title: 'The closed form',
        prose: '**Predict** whether the formula and `np.polyfit` agree.',
        code: SMALL + `
w_star = np.sum((x - x.mean()) * (y - y.mean())) / np.sum((x - x.mean()) ** 2)
b_star = y.mean() - w_star * x.mean()
print("formula :", w_star, b_star)
print("polyfit :", *np.polyfit(x, y, 1))`,
      }, {
        title: 'Your own measurements',
        prose: 'Replace these lists with your own paired measurements (input first, target second). Keep the last rows as validation if they were recorded later.',
        code: `sizes = np.array([10, 20, 35, 50, 80, 120, 150, 200])      # e.g. items processed
times = np.array([6.1, 10.2, 16.0, 21.9, 34.5, 50.3, 62.0, 82.4])  # e.g. seconds
w, b = np.polyfit(sizes[:6], times[:6], 1)            # fit on the first six
pred = w * sizes[6:] + b
print(f"w = {w:.3f} per item, b = {b:.3f}")
print("held-out predictions:", pred.round(1), " actual:", times[6:])
print("baseline MSE:", np.mean((times[:6].mean() - times[6:]) ** 2), "  model MSE:", np.mean((pred - times[6:]) ** 2))`,
      }],
    },
  },
}
