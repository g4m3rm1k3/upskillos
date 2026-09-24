export default {
  filename: 'kernels.py', packages: ['numpy', 'scikit-learn'],
  title: 'Kernels, kernel ridge regression and kernel PCA from scratch.',
  intro: 'Implement Gram matrices for the RBF and polynomial kernels, kernel ridge regression, Gram-matrix centring and kernel PCA. The checks compare your results with scikit-learn’s KernelRidge and KernelPCA, confirm the representer-theorem equivalence with explicit features, and test positive semidefiniteness.',
  steps: [
    '`rbf(A, B, gamma)` and `poly(A, B, degree)` → Gram matrices exp(−γ‖a − b‖²) and (1 + aᵀb)^d.',
    '`krr_fit(K, y, lam)` → α = (K + λI)⁻¹y; `krr_predict(K_test_train, alpha)` → predictions.',
    '`center(K)` → HKH with H = I − 11ᵀ/n.',
    '`kernel_pca(K, k)` → an (n, k) array of projections √λ_c·v_c for the top k eigenpairs of the centred Gram matrix.',
  ],
  hints: [
    ['Eigenpairs', '`vals, vecs = np.linalg.eigh(Kc)` returns ascending order: reverse, take the first k.'],
    ['Centring', '`Kc = K - K.mean(0) - K.mean(1)[:, None] + K.mean()`.'],
  ],
  starter: `import numpy as np

def rbf(A, B, gamma):
    raise NotImplementedError

def poly(A, B, degree):
    raise NotImplementedError

def krr_fit(K, y, lam):
    raise NotImplementedError

def krr_predict(K_test_train, alpha):
    raise NotImplementedError

def center(K):
    raise NotImplementedError

def kernel_pca(K, k):
    raise NotImplementedError
`,
  solution: `import numpy as np

def rbf(A, B, gamma):
    d2 = ((A[:, None, :] - B[None, :, :]) ** 2).sum(-1)
    return np.exp(-gamma * d2)

def poly(A, B, degree):
    return (1 + A @ B.T) ** degree

def krr_fit(K, y, lam):
    return np.linalg.solve(K + lam * np.eye(len(K)), y)

def krr_predict(K_test_train, alpha):
    return K_test_train @ alpha

def center(K):
    return K - K.mean(0) - K.mean(1)[:, None] + K.mean()

def kernel_pca(K, k):
    vals, vecs = np.linalg.eigh(center(K))
    vals, vecs = vals[::-1][:k], vecs[:, ::-1][:, :k]
    return vecs * np.sqrt(np.maximum(vals, 0))
`,
  solutionNote: 'Every method here touches the data only through the Gram matrix — the kernel trick in code.',
  checkSummary: 'Kernel ridge predictions match scikit-learn’s KernelRidge; polynomial-kernel ridge equals ridge on explicit features; kernel PCA matches scikit-learn’s KernelPCA up to sign; RBF Gram matrices are PSD while tanh(xᵀz − 1) is not; and RBF kernel PCA separates two concentric rings.',
  checks: `
import numpy as np
from sklearn.kernel_ridge import KernelRidge
from sklearn.decomposition import KernelPCA
rng = np.random.default_rng(49)
X = rng.uniform(-2, 2, (40, 1)); y = np.sin(3 * X[:, 0]) + 0.3 * X[:, 0] ** 2 + 0.2 * rng.normal(size=40)
Xt = np.linspace(-2, 2, 30)[:, None]
a = krr_fit(rbf(X, X, 2.0), y, 0.1)
ref = KernelRidge(alpha=0.1, kernel="rbf", gamma=2.0).fit(X, y).predict(Xt)
assert np.allclose(krr_predict(rbf(Xt, X, 2.0), a), ref, atol=1e-8), "must match scikit-learn KernelRidge"
from math import comb
phi = lambda Z: np.column_stack([np.sqrt(comb(4, k)) * Z[:, 0] ** k for k in range(5)])
w = np.linalg.solve(phi(X).T @ phi(X) + 0.1 * np.eye(5), phi(X).T @ y)
assert np.allclose(krr_predict(poly(Xt, X, 4), krr_fit(poly(X, X, 4), y, 0.1)), phi(Xt) @ w, atol=1e-6), "representer theorem: same predictions as explicit features"
print("PASS: kernel ridge regression (matches scikit-learn and explicit features)")
t = rng.uniform(0, 2 * np.pi, 200); ring = np.arange(200) % 2
P = np.column_stack([np.cos(t), np.sin(t)]) * np.where(ring, 2.2, 0.8)[:, None] + 0.1 * rng.normal(size=(200, 2))
Z = kernel_pca(rbf(P, P, 1.0), 3)
Zs = KernelPCA(3, kernel="rbf", gamma=1.0).fit_transform(P)
assert np.allclose(np.abs(Z), np.abs(Zs), atol=1e-6), "must match scikit-learn KernelPCA up to sign"
def best_threshold(v, lab):
    order = np.argsort(v); l = lab[order]; ones = l.sum(); n = len(l)
    left1 = np.cumsum(l); left0 = np.arange(1, n + 1) - left1
    return max(np.max(left0 + ones - left1), np.max(left1 + (n - np.arange(1, n + 1)) - (ones - left1))) / n
acc = max(best_threshold(Z[:, c], ring) for c in range(3))
assert acc > 0.97, "one of the leading RBF kernel components should separate the rings"
print(f"PASS: kernel PCA (matches scikit-learn; rings separated with accuracy {acc:.3f})")
assert np.linalg.eigvalsh(rbf(P[:30], P[:30], 1.0)).min() > -1e-10
assert np.linalg.eigvalsh(np.tanh(P[:30] @ P[:30].T - 1)).min() < -0.1, "tanh(x.z - 1) is not positive semidefinite"
print("PASS: valid kernels are PSD; the sigmoid 'kernel' is not")
`,
}
