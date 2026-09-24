export default {
  filename: 'theory.py', packages: ['numpy', 'scipy'],
  title: 'Bounds, shattering and double descent — computed.',
  intro: 'Turn the theory into code: Hoeffding and union-bound widths, sample complexity, a linear-programming test for whether a labelling is realizable by a half-plane, a shattering check, and the minimum-norm fit that produces double descent.',
  steps: [
    '`bound_eps(n, delta, H=1)` → √((ln H + ln(2/δ)) / (2n)).',
    '`sample_complexity(H, eps, delta)` → the smallest integer n with bound_eps(n, delta, H) ≤ eps.',
    '`realizable(points, labels)` → True if some (w, b) has yᵢ(w·xᵢ + b) ≥ 1 for all i (labels 0/1 map to y = −1/+1). Use `scipy.optimize.linprog` as a feasibility problem.',
    '`shattered(points)` → True if every one of the 2ⁿ labellings is realizable.',
    '`min_norm_fit(Phi, y)` → the minimum-norm least-squares weights (`np.linalg.lstsq` returns exactly this).',
  ],
  hints: [
    ['Feasibility LP', 'Variables v = (w₁, …, w_d, b). Constraints −yᵢ(xᵢ·w + b) ≤ −1. Objective zero: `linprog(np.zeros(d + 1), A_ub=A, b_ub=-np.ones(n), bounds=[(None, None)] * (d + 1))`; feasible iff `res.status == 0`.'],
    ['All labellings', '`itertools.product([0, 1], repeat=n)`.'],
  ],
  starter: `import numpy as np

def bound_eps(n, delta, H=1):
    raise NotImplementedError

def sample_complexity(H, eps, delta):
    raise NotImplementedError

def realizable(points, labels):
    raise NotImplementedError

def shattered(points):
    raise NotImplementedError

def min_norm_fit(Phi, y):
    raise NotImplementedError
`,
  solution: `import itertools
import numpy as np
from scipy.optimize import linprog

def bound_eps(n, delta, H=1):
    return float(np.sqrt((np.log(H) + np.log(2 / delta)) / (2 * n)))

def sample_complexity(H, eps, delta):
    return int(np.ceil((np.log(H) + np.log(2 / delta)) / (2 * eps ** 2)))

def realizable(points, labels):
    X = np.asarray(points, dtype=float)
    y = np.where(np.asarray(labels) == 1, 1.0, -1.0)
    A = -y[:, None] * np.column_stack([X, np.ones(len(X))])
    res = linprog(np.zeros(X.shape[1] + 1), A_ub=A, b_ub=-np.ones(len(X)), bounds=[(None, None)] * (X.shape[1] + 1))
    return res.status == 0

def shattered(points):
    return all(realizable(points, lab) for lab in itertools.product([0, 1], repeat=len(points)))

def min_norm_fit(Phi, y):
    return np.linalg.lstsq(Phi, y, rcond=None)[0]
`,
  solutionNote: 'Realizability is a linear feasibility problem; shattering is just checking all labellings; and least squares on an underdetermined system already returns the minimum-norm interpolator.',
  checkSummary: 'Bound widths and sample complexities match the formulas; three points in general position are shattered by half-planes while collinear points and every random set of four are not; half-planes in 3D shatter four points; and minimum-norm random-features regression shows the test-error spike at p = n and recovery for p ≫ n.',
  checks: `
import numpy as np
assert abs(bound_eps(100, 0.05) - np.sqrt(np.log(40) / 200)) < 1e-12
assert abs(bound_eps(100, 0.05, 50) - np.sqrt((np.log(50) + np.log(40)) / 200)) < 1e-12
n = sample_complexity(1000, 0.05, 0.05)
assert bound_eps(n, 0.05, 1000) <= 0.05 < bound_eps(n - 1, 0.05, 1000) and n == 2120
print("PASS: bounds and sample complexity")
assert shattered([[-1, -0.6], [1, -0.6], [0, 1]]) and not shattered([[-1, 0], [0, 0], [1, 0]])
rng = np.random.default_rng(47)
assert not any(shattered(rng.normal(size=(4, 2))) for _ in range(25)), "no four points in 2D can be shattered"
assert shattered(np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1.0]])), "half-planes in 3D shatter 4 points"
print("PASS: VC dimension of half-planes is d + 1")
def test_error(p, seed, n=40, d=10):
    r = np.random.default_rng(seed)
    beta = r.normal(size=d) / np.sqrt(d); W = r.normal(size=(p, d)) / np.sqrt(d)
    X, Xt = r.normal(size=(n, d)), r.normal(size=(500, d))
    y = X @ beta + 0.5 * r.normal(size=n); yt = Xt @ beta + 0.5 * r.normal(size=500)
    w = min_norm_fit(np.maximum(X @ W.T, 0), y)
    return np.mean((np.maximum(Xt @ W.T, 0) @ w - yt) ** 2)
curve = {p: np.median([test_error(p, s) for s in range(15)]) for p in (20, 40, 400)}
print("median test MSE:", {p: round(float(v), 3) for p, v in curve.items()})
assert curve[40] > 5 * curve[20] and curve[400] < curve[20], "double descent: spike at p = n, recovery for p >> n"
print("PASS: double descent reproduced")
`,
}
