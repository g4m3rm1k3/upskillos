// Lab 07 runnable cells and math ↔ code tables, keyed by lesson id.
const DATA = `import numpy as np
rng = np.random.default_rng(0)

def f(x):                                   # the true curve: rises, then levels off
    return np.sin(2.5 * x)

def sample(n, noise=0.3):
    x = rng.uniform(-1, 1, n)
    return x, f(x) + rng.normal(0, noise, n)

def poly(x, d):                             # columns x, x², …, x^d (x already in [-1, 1])
    return np.column_stack([x ** k for k in range(1, d + 1)])

def fit(x, y, d, lam=0.0):                  # ridge on centered data; lam = 0 is least squares
    X = poly(x, d); mx, my = X.mean(axis=0), y.mean()
    Xc, yc = X - mx, y - my
    w = np.linalg.solve(Xc.T @ Xc / len(y) + lam * np.eye(d), Xc.T @ yc / len(y))
    return lambda xn: (poly(xn, d) - mx) @ w + my, w

x_tr, y_tr = sample(20)
x_va, y_va = sample(500)
mse = lambda model, x, y: np.mean((model(x) - y) ** 2)`

export const extras = {
  'l07-poly': {
    mathCode: {
      rows: [
        ['$\\Phi(x) = [x, x^2, \\dots, x^d]$', 'np.column_stack([x ** k for k in range(1, d + 1)])', 'New columns built from one input.'],
        ['$\\hat y = b + \\Phi(x)\\,w$', 'X @ w + b', 'Still a weighted sum: linear in w.'],
        ['least squares on $\\Phi$', 'np.linalg.lstsq(np.column_stack([np.ones(n), X]), y, rcond=None)', 'Lab 03’s solver, unchanged.'],
      ],
    },
    notebook: {
      title: 'Lab 07.1 · Curves from a linear model',
      intro: 'Build polynomial features, fit degrees 1, 3, 9 and 15 with the same least-squares code, and see what happens to the scale of high powers.',
      cells: [{
        title: 'One solver, many degrees',
        prose: '**Predict** how training error changes with degree, and validation error. Expect a shock at degree 15: with 20 points the curve can swing to enormous values between and beyond them.',
        code: DATA + `
for d in [1, 3, 9, 15]:
    model, w = fit(x_tr, y_tr, d)
    print(f"degree {d:>2}: train MSE {mse(model, x_tr, y_tr):.4f}   validation MSE {mse(model, x_va, y_va):.4g}")`,
      }, {
        title: 'Why rescale x first',
        prose: '**Predict** the largest entry of x¹⁰ when x runs to 10 instead of 1.',
        code: `x_big = np.linspace(0, 10, 20)
print("max of x^10 on [0, 10]:", (x_big ** 10).max())
print("condition number of the design, x in [0, 10]:", np.linalg.cond(poly(x_big, 10)).round(-3))
print("condition number of the design, x in [-1, 1]:", np.linalg.cond(poly(np.linspace(-1, 1, 20), 10)).round(1))`,
      }],
    },
  },
  'l07-fit': {
    mathCode: {
      rows: [
        ['validation curve', '[mse(fit(x_tr, y_tr, d)[0], x_va, y_va) for d in degrees]', 'Validation error at each complexity.'],
        ['noise floor $\\sigma^2$', 'noise ** 2', 'No model can do better on average.'],
      ],
    },
    notebook: {
      title: 'Lab 07.2 · The validation curve',
      intro: 'Trace training and validation error across degrees and find where the minimum moves as n grows.',
      cells: [{
        title: 'Find the U',
        prose: '**Predict** the best degree at n = 20. **Then change** `sample(20)` to `sample(200)` in the first line and rerun.',
        code: DATA + `
x_tr, y_tr = sample(20)
print("noise floor σ² =", 0.3 ** 2)
for d in range(1, 16, 2):
    model, _ = fit(x_tr, y_tr, d)
    print(f"degree {d:>2}: train {mse(model, x_tr, y_tr):.3f}   validation {mse(model, x_va, y_va):.4g}")`,
      }],
    },
  },
  'l07-bias-variance': {
    mathCode: {
      rows: [
        ['$\\operatorname{bias}^2 = (E[\\hat y(x)] - f(x))^2$', 'np.mean((preds.mean(axis=0) - f(grid)) ** 2)', 'Average curve versus the truth.'],
        ['$\\operatorname{Var}[\\hat y(x)]$', 'np.mean(preds.var(axis=0))', 'Spread of the curves around their average.'],
        ['$\\operatorname{bias}^2 + \\operatorname{Var} + \\sigma^2$', 'bias2 + var + noise ** 2', 'Expected squared error on new points.'],
      ],
    },
    notebook: {
      title: 'Lab 07.3 · Bias and variance, measured',
      intro: 'Fit the same model to 200 different training sets and split its error into bias², variance and noise.',
      cells: [{
        title: 'Decompose the error',
        prose: '**Predict** which term dominates at degree 1 and at degree 9. **Then change** `sample(20)` to `sample(200)`: which term shrinks?',
        code: DATA + `
grid = np.linspace(-0.95, 0.95, 200)
for d in [1, 3, 5, 9]:
    preds = []
    for _ in range(200):
        x, y = sample(20)
        preds.append(fit(x, y, d)[0](grid))
    preds = np.array(preds)
    bias2 = np.mean((preds.mean(axis=0) - f(grid)) ** 2)
    var = np.mean(preds.var(axis=0))
    print(f"degree {d:>2}: bias² {bias2:.3f}  variance {var:.4g}  + noise 0.090 = {bias2 + var + 0.09:.4g}")`,
      }],
    },
  },
  'l07-ridge': {
    mathCode: {
      rows: [
        ['$J(w) = \\text{MSE} + \\lambda\\|w\\|^2$', 'np.mean((y - X @ w) ** 2) + lam * np.sum(w ** 2)', 'Penalize large weights.'],
        ['$(X^\\top X/n + \\lambda I)\\,w = X^\\top y/n$', 'np.linalg.solve(Xc.T @ Xc / n + lam * np.eye(d), Xc.T @ yc / n)', 'The ridge solution (centered, so the intercept is not penalized).'],
        ['$w = \\frac{\\sum xy}{\\sum x^2 + n\\lambda}$', 'np.sum(x * y) / (np.sum(x ** 2) + n * lam)', 'One feature, no intercept: least squares, shrunk.'],
      ],
    },
    notebook: {
      title: 'Lab 07.4 · Ridge regression',
      intro: 'Keep degree 15 and turn up λ: watch the weights shrink and the validation error fall, then rise.',
      cells: [{
        title: 'The one-feature formula',
        prose: 'Σxy = 10, Σx² = 4, n = 2, λ = 0.5. **Predict** the ridge weight, then the least-squares one (λ = 0).',
        code: `import numpy as np
for lam in [0.5, 0.0]:
    print(lam, 10 / (4 + 2 * lam))`,
      }, {
        title: 'Degree 15, a grid of λ',
        prose: '**Predict** the λ with the lowest validation error.',
        code: DATA + `
for lam in [0, 1e-6, 1e-4, 1e-2, 1e-1, 1]:
    model, w = fit(x_tr, y_tr, 15, lam)
    print(f"λ = {lam:<7} largest |w| = {np.abs(w).max():12.2f}   validation MSE {mse(model, x_va, y_va):.3f}")`,
      }],
    },
  },
  'l07-lasso': {
    mathCode: {
      rows: [
        ['$S(z, t) = \\operatorname{sign}(z)\\max(|z| - t, 0)$', 'np.sign(z) * np.maximum(np.abs(z) - t, 0)', 'Soft thresholding.'],
        ['$J(w) = \\text{MSE} + \\lambda\\|w\\|_1$', 'Lasso(alpha=lam).fit(X, y)', 'scikit-learn’s lasso (its objective halves the MSE term).'],
        ['number of selected features', 'np.sum(model.coef_ != 0)', 'Lasso sets weights exactly to zero.'],
      ],
    },
    notebook: {
      title: 'Lab 07.5 · Lasso and exact zeros',
      intro: 'Apply soft thresholding by hand, then count how many weights lasso and ridge set to exactly zero.',
      cells: [{
        title: 'Soft thresholding',
        prose: '**Predict** S(3, 1), S(0.4, 1) and S(−2.5, 1).',
        code: `import numpy as np
S = lambda z, t: np.sign(z) * np.maximum(np.abs(z) - t, 0)
print(S(3, 1), S(0.4, 1), S(-2.5, 1))`,
      }, {
        title: 'Lasso versus ridge: count the zeros',
        prose: 'Ten standardized features; only three matter. **Predict** how many nonzero weights each keeps as λ grows.',
        code: `from sklearn.linear_model import Lasso, Ridge
rng = np.random.default_rng(0)
X = rng.normal(size=(100, 10))
y = 3 * X[:, 0] - 2 * X[:, 1] + 1.5 * X[:, 2] + rng.normal(0, 1, 100)
for lam in [0.01, 0.1, 0.5, 1.0]:
    lasso = Lasso(alpha=lam).fit(X, y)
    ridge = Ridge(alpha=lam * len(y)).fit(X, y)        # sklearn's ridge penalizes the summed, not mean, squared error
    print(f"λ = {lam:<4}: lasso keeps {np.sum(lasso.coef_ != 0)} weights, ridge keeps {np.sum(ridge.coef_ != 0)}")`,
      }],
    },
  },
  'l07-learning': {
    mathCode: {
      rows: [
        ['learning curve', '[(train_mse(n), val_mse(n)) for n in sizes]', 'Errors of one fixed model as data grows.'],
        ['gap', 'val_mse - train_mse', 'Large gap: variance. Both high, small gap: bias.'],
      ],
    },
    notebook: {
      title: 'Lab 07.6 · Learning curves',
      intro: 'Compare how a too-simple and a too-flexible model respond to more data, averaged over several draws.',
      cells: [{
        title: 'Would more data help?',
        prose: '**Predict** which model improves with more data. **Then add** `lam=0.01` to the degree-12 fit.',
        code: DATA + `
def curve(d, lam=0.0):
    for n in [20, 50, 200]:
        tr, va = [], []
        for _ in range(30):
            x, y = sample(n)
            model, _ = fit(x, y, d, lam)
            tr.append(mse(model, x, y)); va.append(mse(model, x_va, y_va))
        print(f"  n = {n:>3}: train {np.mean(tr):.3f}   validation {np.median(va):.3f} (median of 30 draws)")

print("degree 1 (too simple)"); curve(1)
print("degree 12 (flexible)"); curve(12)`,
      }],
    },
  },
}
