export default {
  filename: 'logistic_regression.py', packages: ['numpy'],
  title: 'Train a probabilistic classifier from scratch.',
  intro: 'Implement a numerically stable sigmoid, log loss, the gradient with an optional L2 penalty, batch gradient descent, and a thresholded decision rule. No libraries fit anything for you; the checks compare against finite differences and known properties.',
  steps: [
    '`sigmoid(z)` — stable for very large positive and negative z (no overflow warnings, no NaN).',
    '`log_loss(y, z)` — mean binary cross-entropy computed **from scores z**, as `mean(max(z,0) + log1p(exp(-|z|)) - y*z)`.',
    '`gradients(X, y, w, b, lam=0)` → `(dw, db)` for `log_loss + lam·‖w‖²`.',
    '`train(X, y, rate, steps, lam=0)` → `(w, b)` starting from zeros.',
    '`predict(X, w, b, threshold=0.5)` → integer array of 0/1 decisions.',
  ],
  hints: [
    ['Stable sigmoid', '`out = np.empty_like(z, dtype=float); pos = z >= 0; out[pos] = 1/(1+np.exp(-z[pos])); ez = np.exp(z[~pos]); out[~pos] = ez/(1+ez)`. Convert scalars with `np.asarray(z, dtype=float)`.'],
    ['The gradient', '`p = sigmoid(X @ w + b)`; `dw = X.T @ (p - y) / n + 2 * lam * w`; `db = np.mean(p - y)`. The intercept is not penalized.'],
  ],
  starter: `import numpy as np

def sigmoid(z):
    raise NotImplementedError

def log_loss(y, z):
    raise NotImplementedError

def gradients(X, y, w, b, lam=0.0):
    raise NotImplementedError

def train(X, y, rate=0.5, steps=1000, lam=0.0):
    w, b = np.zeros(X.shape[1]), 0.0
    raise NotImplementedError

def predict(X, w, b, threshold=0.5):
    raise NotImplementedError
`,
  solution: `import numpy as np

def sigmoid(z):
    z = np.asarray(z, dtype=float)
    out = np.empty_like(z)
    pos = z >= 0
    out[pos] = 1 / (1 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1 + ez)
    return out

def log_loss(y, z):
    z = np.asarray(z, dtype=float)
    return float(np.mean(np.maximum(z, 0) + np.log1p(np.exp(-np.abs(z))) - y * z))

def gradients(X, y, w, b, lam=0.0):
    p = sigmoid(X @ w + b)
    dw = X.T @ (p - y) / len(y) + 2 * lam * w
    db = float(np.mean(p - y))
    return dw, db

def train(X, y, rate=0.5, steps=1000, lam=0.0):
    w, b = np.zeros(X.shape[1]), 0.0
    for _ in range(steps):
        dw, db = gradients(X, y, w, b, lam)
        w, b = w - rate * dw, b - rate * db
    return w, b

def predict(X, w, b, threshold=0.5):
    return (sigmoid(X @ w + b) >= threshold).astype(int)
`,
  solutionNote: 'The loss is computed from scores, so it never takes the log of 0; the sigmoid only exponentiates non-positive numbers. Both gradients are computed from the same w and b before either is updated.',
  checkSummary: 'Sigmoid values, symmetry and stability at ±1000; log loss against a direct formula and the log 2 value at z = 0, finite at extreme scores; gradients (with and without the L2 penalty) against finite differences of an independent loss; a trained model that separates noisy blobs on held-out data; bounded weights with regularization on separable data; and thresholding behaviour.',
  checks: `
import numpy as np, warnings
with warnings.catch_warnings():
    warnings.simplefilter("error")
    _s = sigmoid(np.array([-1000.0, -2.0, 0.0, 2.0, 1000.0]))
assert np.all(np.isfinite(_s)), "sigmoid must be finite at +-1000"
np.testing.assert_allclose(_s[[1, 2, 3]], [1 / (1 + np.exp(2)), 0.5, 1 / (1 + np.exp(-2))], rtol=1e-12)
np.testing.assert_allclose(sigmoid(np.array([-3.0])) + sigmoid(np.array([3.0])), [1.0])
assert abs(log_loss(np.array([1, 0]), np.array([0.0, 0.0])) - np.log(2)) < 1e-12
assert np.isfinite(log_loss(np.array([1, 0]), np.array([-800.0, 800.0]))), "log_loss must not overflow"
_z = np.array([-1.5, 0.3, 2.0]); _yy = np.array([0, 1, 1])
_p = 1 / (1 + np.exp(-_z))
assert abs(log_loss(_yy, _z) - np.mean(-(_yy * np.log(_p) + (1 - _yy) * np.log(1 - _p)))) < 1e-12
print("PASS: stable sigmoid and log loss")
_rng = np.random.default_rng(0)
_X = _rng.normal(size=(60, 3)); _y = (_X @ [1.5, -2.0, 0.5] + 0.3 * _rng.normal(size=60) > 0).astype(float)
_w0, _b0 = _rng.normal(size=3), 0.2
def _J(w, b, lam): 
    z = _X @ w + b
    return np.mean(np.logaddexp(0, z) - _y * z) + lam * w @ w
for _lam in [0.0, 0.1]:
    _dw, _db = gradients(_X, _y, _w0, _b0, _lam)
    _e = 1e-6
    _num = [(_J(_w0 + _e * np.eye(3)[j], _b0, _lam) - _J(_w0 - _e * np.eye(3)[j], _b0, _lam)) / (2 * _e) for j in range(3)]
    np.testing.assert_allclose(_dw, _num, rtol=1e-5, atol=1e-7, err_msg=f"dw mismatch at lam={_lam}")
    assert abs(_db - (_J(_w0, _b0 + _e, _lam) - _J(_w0, _b0 - _e, _lam)) / (2 * _e)) < 1e-7, "db mismatch"
print("PASS: gradients match finite differences (with and without L2)")
_g = np.random.default_rng(4)
_Xa = np.r_[_g.normal([-1, -1], 0.8, size=(100, 2)), _g.normal([1, 1], 0.8, size=(100, 2))]; _ya = np.r_[np.zeros(100), np.ones(100)]
_idx = _g.permutation(200); _tr, _te = _idx[:140], _idx[140:]
_w, _b = train(_Xa[_tr], _ya[_tr], rate=0.5, steps=2000)
_acc = np.mean(predict(_Xa[_te], _w, _b) == _ya[_te])
assert _acc > 0.85, f"Held-out accuracy {_acc:.2f} too low"
assert np.all(predict(_Xa[_te], _w, _b, threshold=1.0) == 0) or np.all(sigmoid(_Xa[_te] @ _w + _b) < 1), "threshold is not applied"
assert predict(_Xa[:5], _w, _b).dtype.kind in "iu", "predict must return integers"
_Xs = np.array([[-2.0], [-1.0], [1.0], [2.0]]); _ys = np.array([0.0, 0.0, 1.0, 1.0])
_wu, _ = train(_Xs, _ys, rate=1.0, steps=3000); _wr, _ = train(_Xs, _ys, rate=1.0, steps=3000, lam=0.05)
assert abs(_wr[0]) < abs(_wu[0]) and abs(_wr[0]) < 5, "L2 must keep weights bounded on separable data"
print(f"PASS: training reaches {_acc:.0%} held-out accuracy; L2 bounds separable weights ({_wu[0]:.1f} -> {_wr[0]:.2f})")
`,
}
