export default {
  filename: 'regularization.py', packages: ['numpy'],
  title: 'Control complexity with data, not hope.',
  intro: 'Build polynomial features, ridge regression with an unpenalized intercept, the lasso\'s soft-threshold, and a validation curve that chooses the degree for you. The checks test the mathematics (λ = 0 equals least squares, weights shrink as λ grows, the intercept is never shrunk) and the behavior (training error never rises with degree; your chosen degree is sensible).',
  steps: [
    '`poly_features(x, degree)` → shape `(n, degree)` with columns `x, x², …, x^degree` (no column of ones).',
    '`ridge_fit(X, y, lam)` → `(w, b)`: center X and y with their means, solve `(XcᵀXc/n + lam·I) w = Xcᵀyc/n` with `np.linalg.solve`, then `b = ȳ − x̄·w`.',
    '`ridge_predict(X, w, b)` and `mse(y, pred)`.',
    '`soft_threshold(z, t)` → `sign(z)·max(|z| − t, 0)`, elementwise for arrays.',
    '`validation_curve(x_tr, y_tr, x_va, y_va, degrees, lam)` → `(train_mse, val_mse)` arrays, then `best_degree(degrees, val_mse)`.',
  ],
  hints: [
    ['Polynomial columns', '`np.column_stack([x ** k for k in range(1, degree + 1)])`.'],
    ['Centering removes the intercept from the penalty', 'With `xm = X.mean(axis=0)` and `ym = y.mean()`, fit on `X - xm` and `y - ym`. The intercept is then `ym - xm @ w` and never enters the penalty.'],
    ['Identity of the right size', '`np.eye(X.shape[1])`. With lam = 0 and full-rank X this reproduces least squares.'],
  ],
  starter: `import numpy as np

def poly_features(x, degree):
    raise NotImplementedError

def ridge_fit(X, y, lam):
    raise NotImplementedError

def ridge_predict(X, w, b):
    raise NotImplementedError

def mse(y, pred):
    raise NotImplementedError

def soft_threshold(z, t):
    raise NotImplementedError

def validation_curve(x_tr, y_tr, x_va, y_va, degrees, lam):
    raise NotImplementedError

def best_degree(degrees, val_mse):
    raise NotImplementedError
`,
  solution: `import numpy as np

def poly_features(x, degree):
    x = np.asarray(x, dtype=float)
    return np.column_stack([x ** k for k in range(1, degree + 1)])

def ridge_fit(X, y, lam):
    n, p = X.shape
    xm, ym = X.mean(axis=0), y.mean()
    Xc, yc = X - xm, y - ym
    w = np.linalg.solve(Xc.T @ Xc / n + lam * np.eye(p), Xc.T @ yc / n)
    return w, ym - xm @ w

def ridge_predict(X, w, b):
    return X @ w + b

def mse(y, pred):
    return float(np.mean((y - pred) ** 2))

def soft_threshold(z, t):
    return np.sign(z) * np.maximum(np.abs(z) - t, 0)

def validation_curve(x_tr, y_tr, x_va, y_va, degrees, lam):
    train_err, val_err = [], []
    for d in degrees:
        Xtr, Xva = poly_features(x_tr, d), poly_features(x_va, d)
        w, b = ridge_fit(Xtr, y_tr, lam)
        train_err.append(mse(y_tr, ridge_predict(Xtr, w, b)))
        val_err.append(mse(y_va, ridge_predict(Xva, w, b)))
    return np.array(train_err), np.array(val_err)

def best_degree(degrees, val_mse):
    return int(np.asarray(degrees)[np.argmin(val_mse)])
`,
  solutionNote: 'Centering X and y before solving means the intercept is recovered afterwards from the means and never shrinks. The same fitted weights are applied to the validation features, which were built by the identical `poly_features` call.',
  checkSummary: 'Feature shape and powers; ridge with λ = 0 equals least squares with an intercept; the weight norm decreases as λ increases; a huge λ predicts the training mean (the intercept is not penalized); soft thresholding on scalars and arrays; training error never increases with degree; and your validation curve chooses a moderate degree on a noisy curved dataset while degree 1 underfits.',
  checks: `
import numpy as np
_x = np.linspace(-1, 1, 7)
_P = poly_features(_x, 3)
assert _P.shape == (7, 3), "poly_features must return shape (n, degree)"
np.testing.assert_allclose(_P[:, 2], _x ** 3)
_rng = np.random.default_rng(0)
_X = _rng.normal(size=(40, 3)); _y = _X @ [1.0, -2.0, 0.5] + 3 + 0.1 * _rng.normal(size=40)
_w, _b = ridge_fit(_X, _y, 0.0)
_ref = np.linalg.lstsq(np.column_stack([np.ones(40), _X]), _y, rcond=None)[0]
np.testing.assert_allclose(np.r_[_b, _w], _ref, atol=1e-8, err_msg="lam = 0 must equal least squares with an intercept")
_norms = [np.linalg.norm(ridge_fit(_X, _y, l)[0]) for l in [0, 0.01, 0.1, 1, 10]]
assert all(a > b for a, b in zip(_norms, _norms[1:])), "Weight norm must shrink as lam grows"
_wb, _bb = ridge_fit(_X, _y, 1e8)
np.testing.assert_allclose(ridge_predict(_X, _wb, _bb), np.full(40, _y.mean()), atol=1e-4, err_msg="Huge lam must predict the mean: do not penalize the intercept")
print("PASS: features and ridge (least-squares limit, shrinkage, unpenalized intercept)")
assert soft_threshold(3, 1) == 2 and soft_threshold(-3, 1) == -2 and soft_threshold(0.4, 1) == 0
np.testing.assert_allclose(soft_threshold(np.array([-2.0, 0.5, 1.5]), 1.0), [-1.0, 0.0, 0.5])
print("PASS: soft thresholding")
_g = np.random.default_rng(3)
_xt = _g.uniform(-1, 1, 40); _yt = np.sin(np.pi * _xt) + 0.2 * _g.normal(size=40)
_xv = _g.uniform(-1, 1, 400); _yv = np.sin(np.pi * _xv) + 0.2 * _g.normal(size=400)
_deg = list(range(1, 11))
_tr, _va = validation_curve(_xt, _yt, _xv, _yv, _deg, 1e-9)
assert np.all(np.diff(_tr) <= 1e-9), "Training error must not increase with degree"
_best = best_degree(_deg, _va)
assert 3 <= _best <= 8, f"Chose degree {_best}; expected a moderate degree for a sine curve"
assert _va[0] > 2 * _va[_deg.index(_best)], "Degree 1 should clearly underfit"
print(f"PASS: validation curve chooses degree {_best}")
`,
}
