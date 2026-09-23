export default {
  filename: 'multiple_regression.py', packages: ['numpy'],
  title: 'Regression with any number of features.',
  intro: 'Generalize your Lab 01 code from one input to a design matrix. Implement the intercept column, vectorized prediction, the matrix-form gradient, gradient descent, and a direct least-squares solve. The checks compare the two solutions, verify every shape, and confirm the gradient against finite differences.',
  steps: [
    '`add_intercept(X)` → a new `(n, p + 1)` array whose **first** column is ones.',
    '`predict(Xd, w)` → `Xd @ w`, shape `(n,)`.',
    '`gradient(Xd, y, w)` → `(2 / n) * Xd.T @ (Xd @ w - y)`, shape `(p + 1,)`.',
    '`fit_gd(Xd, y, rate, steps)` → weights after `steps` simultaneous updates from zeros.',
    '`fit_lstsq(Xd, y)` → the least-squares weights from `np.linalg.lstsq` (never `np.linalg.inv`).',
  ],
  hints: [
    ['Building the intercept column', '`np.column_stack([np.ones(len(X)), X])` or `np.hstack([np.ones((n, 1)), X])`. Both leave X unchanged.'],
    ['Shapes of the gradient', '`Xd @ w - y` is `(n,)`. `Xd.T` is `(p + 1, n)`. Their product is `(p + 1,)`. Divide by `len(y)`.'],
    ['lstsq returns four things', '`w, residuals, rank, singular_values = np.linalg.lstsq(Xd, y, rcond=None)`. Return only `w`.'],
  ],
  starter: `import numpy as np

def add_intercept(X):
    raise NotImplementedError

def predict(Xd, w):
    raise NotImplementedError

def gradient(Xd, y, w):
    raise NotImplementedError

def fit_gd(Xd, y, rate=0.1, steps=500):
    w = np.zeros(Xd.shape[1])
    raise NotImplementedError

def fit_lstsq(Xd, y):
    raise NotImplementedError
`,
  solution: `import numpy as np

def add_intercept(X):
    X = np.asarray(X, dtype=float)
    return np.column_stack([np.ones(len(X)), X])

def predict(Xd, w):
    return Xd @ w

def gradient(Xd, y, w):
    error = predict(Xd, w) - y
    return (2 / len(y)) * Xd.T @ error

def fit_gd(Xd, y, rate=0.1, steps=500):
    w = np.zeros(Xd.shape[1])
    for _ in range(steps):
        w = w - rate * gradient(Xd, y, w)
    return w

def fit_lstsq(Xd, y):
    w, *_ = np.linalg.lstsq(Xd, y, rcond=None)
    return w
`,
  solutionNote: 'The whole gradient vector is computed from the current weights before any weight changes, so the update is simultaneous for every feature. The direct solver works on X itself through a stable factorization rather than inverting XᵀX.',
  checkSummary: 'Intercept column placement and shape; predictions and gradients against an independent loss with finite differences; agreement of gradient descent and least squares on standardized data; the orthogonality of least-squares residuals to every column; and a rank-deficient design where least squares must still return finite weights with optimal predictions.',
  checks: `
import numpy as np
_rng = np.random.default_rng(5)
_X = _rng.normal(size=(30, 3))
_Xd = add_intercept(_X)
assert _Xd.shape == (30, 4), "add_intercept must give shape (n, p + 1)"
assert np.all(_Xd[:, 0] == 1), "The first column must be ones"
np.testing.assert_allclose(_Xd[:, 1:], _X, err_msg="Feature columns must be unchanged")
_w = _rng.normal(size=4)
_y = _Xd @ np.array([1.0, 2.0, -1.0, 0.5]) + 0.1 * _rng.normal(size=30)
assert predict(_Xd, _w).shape == (30,), "Predictions must have shape (n,)"
np.testing.assert_allclose(predict(_Xd, _w), _Xd @ _w)
def _loss(v): return np.mean((_Xd @ v - _y) ** 2)
_g = gradient(_Xd, _y, _w)
assert np.shape(_g) == (4,), "The gradient needs one entry per weight"
_eps = 1e-6
_num = np.array([(_loss(_w + _eps * np.eye(4)[j]) - _loss(_w - _eps * np.eye(4)[j])) / (2 * _eps) for j in range(4)])
np.testing.assert_allclose(_g, _num, rtol=1e-5, atol=1e-6, err_msg="Gradient does not match finite differences")
print("PASS: intercept column, prediction shape, and matrix gradient")

_ls = fit_lstsq(_Xd, _y)
_gd = fit_gd(_Xd, _y, rate=0.1, steps=3000)
np.testing.assert_allclose(_gd, _ls, atol=1e-6, err_msg="Gradient descent should converge to the least-squares weights")
_res = _y - _Xd @ _ls
np.testing.assert_allclose(_Xd.T @ _res, np.zeros(4), atol=1e-9, err_msg="Least-squares residuals must be orthogonal to every column")
_w0 = fit_gd(_Xd, _y, steps=0)
np.testing.assert_allclose(_w0, np.zeros(4), err_msg="Zero steps must return the zero initialization")
print("PASS: gradient descent agrees with least squares; residuals are orthogonal")

_Xr = add_intercept(np.column_stack([_X[:, 0], 2 * _X[:, 0]]))
_wr = fit_lstsq(_Xr, _y)
assert np.all(np.isfinite(_wr)), "Rank-deficient data must still give finite weights"
_best = np.linalg.lstsq(_Xr, _y, rcond=None)[0]
np.testing.assert_allclose(_Xr @ _wr, _Xr @ _best, atol=1e-8, err_msg="Predictions must be optimal even when weights are not unique")
print("PASS: rank-deficient design handled with a stable solver")
`,
}
