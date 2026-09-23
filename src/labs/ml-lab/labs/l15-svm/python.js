export default {
  filename: 'linear_svm.py', packages: ['numpy'],
  title: 'Train a maximum-margin classifier.',
  intro: 'Implement a soft-margin linear SVM in the primal: the hinge loss, the regularized objective, its subgradient, and a Pegasos-style training loop with a decreasing step size. Labels are −1/+1. A constant column of ones in X provides the intercept (and is regularized, as in many linear SVM solvers).',
  steps: [
    '`hinge(margins)` → elementwise `max(0, 1 − m)`.',
    '`objective(w, X, y, lam)` → `lam/2·‖w‖² + mean(hinge(y · (X @ w)))`.',
    '`subgradient(w, X, y, lam)` → `lam·w − (1/n)·Σ_{m_i<1} y_i x_i`.',
    '`train_svm(X, y, lam, iters)` → w, starting from zeros, with step `1/(lam·t)` at iteration t = 1, 2, …, returning the **average** of the iterates from the second half of training.',
    '`support_vectors(w, X, y, tol=1e-3)` → indices with margin ≤ 1 + tol; `margin_width(w)` → `2/‖w[1:]‖` (the intercept is the first entry).',
  ],
  hints: [
    ['Margins', '`m = y * (X @ w)`. Violators: `active = m < 1`. Then `g = lam * w - (y[active, None] * X[active]).sum(axis=0) / len(y)`.'],
    ['Averaging', 'Keep `avg = np.zeros_like(w)` and add `w / (iters - iters // 2)` for every t > iters // 2.'],
  ],
  starter: `import numpy as np

def hinge(margins):
    raise NotImplementedError

def objective(w, X, y, lam):
    raise NotImplementedError

def subgradient(w, X, y, lam):
    raise NotImplementedError

def train_svm(X, y, lam=0.01, iters=2000):
    raise NotImplementedError

def support_vectors(w, X, y, tol=1e-3):
    raise NotImplementedError

def margin_width(w):
    raise NotImplementedError
`,
  solution: `import numpy as np

def hinge(margins):
    return np.maximum(0, 1 - margins)

def objective(w, X, y, lam):
    return float(lam / 2 * w @ w + np.mean(hinge(y * (X @ w))))

def subgradient(w, X, y, lam):
    m = y * (X @ w)
    active = m < 1
    return lam * w - (y[active, None] * X[active]).sum(axis=0) / len(y)

def train_svm(X, y, lam=0.01, iters=2000):
    w = np.zeros(X.shape[1])
    avg = np.zeros_like(w)
    start = iters // 2
    for t in range(1, iters + 1):
        w = w - subgradient(w, X, y, lam) / (lam * t)
        if t > start:
            avg += w / (iters - start)
    return avg

def support_vectors(w, X, y, tol=1e-3):
    return np.flatnonzero(y * (X @ w) <= 1 + tol)

def margin_width(w):
    return float(2 / np.linalg.norm(w[1:]))
`,
  solutionNote: 'The subgradient uses only points inside or beyond the margin (m < 1); everything else contributes nothing but the regularizer. Averaging the later iterates smooths out the zig-zag that the non-differentiable hinge causes.',
  checkSummary: 'Hinge values; the objective on a hand example; the subgradient against finite differences at a point where no margin sits exactly at 1; a trained SVM that separates two separable blobs with a positive minimum margin and few support vectors; a lower objective than the zero vector; and a wider margin for stronger regularization.',
  checks: `
import numpy as np
np.testing.assert_allclose(hinge(np.array([2.5, 1.0, 0.4, -0.5])), [0, 0, 0.6, 1.5])
_X = np.array([[1.0, 2.0, 1.0], [1.0, -1.0, -2.0]]); _y = np.array([1.0, -1.0]); _w = np.array([0.1, 0.2, 0.3])
assert abs(objective(_w, _X, _y, 0.5) - (0.25 * 0.14 + np.mean(np.maximum(0, 1 - _y * (_X @ _w))))) < 1e-12
_rng = np.random.default_rng(1)
_Xr = np.c_[np.ones(30), _rng.normal(size=(30, 2))]; _yr = np.where(_rng.random(30) < 0.5, -1.0, 1.0); _wr = _rng.normal(size=3)
_g = subgradient(_wr, _Xr, _yr, 0.1)
_num = [(objective(_wr + 1e-7 * np.eye(3)[j], _Xr, _yr, 0.1) - objective(_wr - 1e-7 * np.eye(3)[j], _Xr, _yr, 0.1)) / 2e-7 for j in range(3)]
np.testing.assert_allclose(_g, _num, atol=1e-5, err_msg="Subgradient must match finite differences away from the kinks")
print("PASS: hinge, objective and subgradient")
_g2 = np.random.default_rng(2)
_P = np.r_[_g2.normal([-2, -2], 0.6, size=(60, 2)), _g2.normal([2, 2], 0.6, size=(60, 2))]
_Xs = np.c_[np.ones(120), _P]; _ys = np.r_[-np.ones(60), np.ones(60)]
_ws = train_svm(_Xs, _ys, lam=0.01, iters=3000)
_m = _ys * (_Xs @ _ws)
assert np.all(_m > 0), "A separable dataset must be separated"
_sv = support_vectors(_ws, _Xs, _ys)
assert 1 <= len(_sv) < 30, f"Expected a few support vectors, got {len(_sv)}"
assert objective(_ws, _Xs, _ys, 0.01) < objective(np.zeros(3), _Xs, _ys, 0.01)
_wide = train_svm(_Xs, _ys, lam=1.0, iters=3000)
assert margin_width(_wide) > margin_width(_ws), "Stronger regularization must widen the margin"
print(f"PASS: separable blobs split with {len(_sv)} support vectors; width {margin_width(_ws):.2f} (lam 0.01) vs {margin_width(_wide):.2f} (lam 1)")
`,
}
