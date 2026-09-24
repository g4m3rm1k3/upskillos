export default {
  filename: 'convex.py', packages: ['numpy', 'scikit-learn'],
  title: 'Proximal gradient for the lasso and the SVM dual, checked against scikit-learn.',
  intro: 'Implement soft-thresholding and ISTA for the lasso, then work with the SVM dual: recover w from the multipliers, evaluate the dual and primal objectives, and classify support vectors by the KKT conditions. The checks compare with scikit-learn’s Lasso and SVC.',
  steps: [
    '`soft_threshold(v, t)` → sign(v)·max(|v| − t, 0), elementwise.',
    '`ista(X, y, lam, iters=500)` → `(w, history)` minimizing (1/2n)‖y − Xw‖² + λ‖w‖₁ with step 1/L, L = largest eigenvalue of XᵀX/n. No intercept.',
    '`w_from_alpha(alpha, X, y)` → Σ αᵢyᵢxᵢ.',
    '`svm_dual(alpha, X, y)` → Σα − ½ Σᵢⱼ αᵢαⱼyᵢyⱼxᵢᵀxⱼ (linear kernel); `svm_primal(w, b, X, y, C)` → ½‖w‖² + C Σ max(0, 1 − yᵢ(wᵀxᵢ + b)).',
    '`kkt_groups(alpha, C, tol=1e-6)` → `(on_margin, at_bound)` index arrays: 0 < α < C and α = C.',
  ],
  hints: [
    ['Lipschitz constant', '`L = np.linalg.eigvalsh(X.T @ X / n).max()`.'],
    ['Dual objective', 'With v = α·y, the quadratic term is ½‖Xᵀv‖².'],
    ['scikit-learn’s dual', '`SVC.dual_coef_` stores αᵢyᵢ for the support vectors listed in `SVC.support_`.'],
  ],
  starter: `import numpy as np

def soft_threshold(v, t):
    raise NotImplementedError

def ista(X, y, lam, iters=500):
    raise NotImplementedError

def w_from_alpha(alpha, X, y):
    raise NotImplementedError

def svm_dual(alpha, X, y):
    raise NotImplementedError

def svm_primal(w, b, X, y, C):
    raise NotImplementedError

def kkt_groups(alpha, C, tol=1e-6):
    raise NotImplementedError
`,
  solution: `import numpy as np

def soft_threshold(v, t):
    return np.sign(v) * np.maximum(np.abs(v) - t, 0)

def ista(X, y, lam, iters=500):
    n, d = X.shape
    L = np.linalg.eigvalsh(X.T @ X / n).max()
    w = np.zeros(d)
    history = []
    for _ in range(iters):
        g = X.T @ (X @ w - y) / n
        w = soft_threshold(w - g / L, lam / L)
        history.append(np.sum((y - X @ w) ** 2) / (2 * n) + lam * np.abs(w).sum())
    return w, history

def w_from_alpha(alpha, X, y):
    return X.T @ (alpha * y)

def svm_dual(alpha, X, y):
    v = X.T @ (alpha * y)
    return float(alpha.sum() - 0.5 * v @ v)

def svm_primal(w, b, X, y, C):
    return float(0.5 * w @ w + C * np.maximum(0, 1 - y * (X @ w + b)).sum())

def kkt_groups(alpha, C, tol=1e-6):
    on_margin = np.where((alpha > tol) & (alpha < C - tol))[0]
    at_bound = np.where(alpha >= C - tol)[0]
    return on_margin, at_bound
`,
  solutionNote: 'Two convex problems, two faces of duality: the proximal step handles non-smoothness exactly, and the SVM dual certifies its own solution through the duality gap.',
  checkSummary: 'Soft-thresholding on hand values; ISTA decreases the objective monotonically and matches scikit-learn’s Lasso with exact zeros; w recovered from scikit-learn’s dual coefficients equals its coef_; the duality gap is tiny; margin support vectors satisfy yᵢf(xᵢ) = 1 and bounded ones yᵢf(xᵢ) ≤ 1.',
  checks: `
import numpy as np
from sklearn.linear_model import Lasso
from sklearn.svm import SVC
assert np.allclose(soft_threshold(np.array([1.2, -2.0, 0.3, -0.1]), 0.4), [0.8, -1.6, 0.0, 0.0])
rng = np.random.default_rng(48)
X = rng.normal(size=(80, 25)); beta = np.zeros(25); beta[:3] = [3, -2, 1.5]
y = X @ beta + 0.5 * rng.normal(size=80)
w, hist = ista(X, y, 0.1, 2000)
ref = Lasso(alpha=0.1, fit_intercept=False, tol=1e-12, max_iter=100000).fit(X, y).coef_
assert np.all(np.diff(hist) <= 1e-10), "ISTA must never increase the objective"
assert np.allclose(w, ref, atol=1e-5), "must match scikit-learn's Lasso"
assert np.sum(w == 0) >= 15, "the proximal step should produce exact zeros"
print(f"PASS: ISTA matches scikit-learn ({np.sum(w == 0)} exact zeros of 25)")
yb = np.where(rng.random(60) < 0.5, 1, -1)
Xb = rng.normal(size=(60, 2)) * 0.8 + yb[:, None] * np.array([1.0, 0.7])
C = 1.0
svc = SVC(kernel="linear", C=C, tol=1e-8).fit(Xb, yb)
alpha = np.zeros(60); alpha[svc.support_] = np.abs(svc.dual_coef_[0])
w_svm = w_from_alpha(alpha, Xb, yb)
assert np.allclose(w_svm, svc.coef_[0], atol=1e-6), "w must equal the sum of alpha_i y_i x_i"
assert abs(np.sum(alpha * yb)) < 1e-6
gap = svm_primal(w_svm, svc.intercept_[0], Xb, yb, C) - svm_dual(alpha, Xb, yb)
assert -1e-6 < gap < 1e-3, "duality gap should be tiny and non-negative"
m, bnd = kkt_groups(alpha, C, 1e-5)
margins = yb * (Xb @ w_svm + svc.intercept_[0])
assert np.allclose(margins[m], 1, atol=1e-3) and np.all(margins[bnd] <= 1 + 1e-3), "complementary slackness"
print(f"PASS: SVM dual (gap {gap:.2e}; {len(m)} on the margin, {len(bnd)} at the bound)")
`,
}
