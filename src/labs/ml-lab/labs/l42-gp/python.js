export default {
  filename: 'gp.py', packages: ['numpy', 'scikit-learn'],
  title: 'Exact Gaussian process regression with Cholesky factorizations.',
  intro: 'Implement the RBF kernel, the GP posterior mean and variance, the log marginal likelihood, and a length-scale search. The checks compare your predictions with scikit-learn’s GaussianProcessRegressor using the same fixed kernel, and verify the uncertainty behaves as theory says.',
  steps: [
    '`rbf(A, B, ell, sf)` → matrix of σf²·exp(−‖a − b‖²/(2ℓ²)) for rows a of A and b of B (inputs are 2-D arrays, one row per point).',
    '`gp_posterior(X, y, Xs, ell, sf, sn)` → `(mean, var)` at the rows of Xs. Use L = cholesky(K + sn²I), α = Lᵀ \\ (L \\ y), v = L \\ k*.',
    '`log_marginal_likelihood(X, y, ell, sf, sn)` → −½ yᵀα − Σ log Lᵢᵢ − (n/2) log 2π.',
    '`best_length_scale(X, y, grid, sf, sn)` → the grid value with the highest log marginal likelihood.',
  ],
  hints: [
    ['Pairwise squared distances', '`((A[:, None, :] - B[None, :, :]) ** 2).sum(-1)`.'],
    ['Triangular solves', '`np.linalg.solve(L, b)` works; `scipy.linalg.solve_triangular` is faster but not required.'],
  ],
  starter: `import numpy as np

def rbf(A, B, ell, sf):
    raise NotImplementedError

def gp_posterior(X, y, Xs, ell, sf, sn):
    raise NotImplementedError

def log_marginal_likelihood(X, y, ell, sf, sn):
    raise NotImplementedError

def best_length_scale(X, y, grid, sf, sn):
    raise NotImplementedError
`,
  solution: `import numpy as np

def rbf(A, B, ell, sf):
    d2 = ((A[:, None, :] - B[None, :, :]) ** 2).sum(-1)
    return sf ** 2 * np.exp(-d2 / (2 * ell ** 2))

def _factor(X, y, ell, sf, sn):
    L = np.linalg.cholesky(rbf(X, X, ell, sf) + sn ** 2 * np.eye(len(X)))
    alpha = np.linalg.solve(L.T, np.linalg.solve(L, y))
    return L, alpha

def gp_posterior(X, y, Xs, ell, sf, sn):
    L, alpha = _factor(X, y, ell, sf, sn)
    Ks = rbf(Xs, X, ell, sf)
    v = np.linalg.solve(L, Ks.T)
    return Ks @ alpha, sf ** 2 - (v ** 2).sum(0)

def log_marginal_likelihood(X, y, ell, sf, sn):
    L, alpha = _factor(X, y, ell, sf, sn)
    return -0.5 * y @ alpha - np.log(np.diag(L)).sum() - len(y) / 2 * np.log(2 * np.pi)

def best_length_scale(X, y, grid, sf, sn):
    scores = [log_marginal_likelihood(X, y, ell, sf, sn) for ell in grid]
    return grid[int(np.argmax(scores))]
`,
  solutionNote: 'Never invert K: one Cholesky factorization gives the mean, the variance and the log-determinant.',
  checkSummary: 'Predictions and standard deviations match scikit-learn with the same fixed kernel; the log marginal likelihood matches scikit-learn’s; variance is near the noise at data points and near the prior far away; tiny noise interpolates; and the chosen length scale beats both extremes on held-out error.',
  checks: `
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, ConstantKernel
rng = np.random.default_rng(42)
X = rng.random((20, 1)); y = np.sin(2 * np.pi * X[:, 0]) + 0.1 * rng.normal(size=20)
Xs = np.linspace(-0.2, 1.2, 50)[:, None]
ell, sf, sn = 0.2, 1.3, 0.1
mu, var = gp_posterior(X, y, Xs, ell, sf, sn)
ref = GaussianProcessRegressor(ConstantKernel(sf ** 2, "fixed") * RBF(ell, "fixed"), alpha=sn ** 2, optimizer=None).fit(X, y)
rmu, rsd = ref.predict(Xs, return_std=True)
assert np.allclose(mu, rmu, atol=1e-8) and np.allclose(np.sqrt(np.maximum(var, 0)), rsd, atol=1e-6), "must match scikit-learn with the same kernel"
assert abs(log_marginal_likelihood(X, y, ell, sf, sn) - ref.log_marginal_likelihood_value_) < 1e-8
print("PASS: matches scikit-learn (mean, sd, log marginal likelihood)")
_, v_at = gp_posterior(X, y, X, ell, sf, sn)
_, v_far = gp_posterior(X, y, np.array([[5.0]]), ell, sf, sn)
assert np.all(v_at < sn ** 2 * 1.5) and abs(v_far[0] - sf ** 2) < 1e-9, "variance: about the noise at data, the prior far away"
m_int, _ = gp_posterior(X, y, X, 0.05, sf, 1e-4)
assert np.allclose(m_int, y, atol=1e-3), "tiny noise should interpolate the data (a short length scale lets f bend between close points)"
print("PASS: uncertainty behaves as theory says")
grid = np.array([0.01, 0.03, 0.1, 0.2, 0.3, 1.0, 3.0])
best = best_length_scale(X, y, grid, 1.0, 0.1)
Xt = rng.random((300, 1)); yt = np.sin(2 * np.pi * Xt[:, 0])
err = {g: np.sqrt(np.mean((gp_posterior(X, y, Xt, g, 1.0, 0.1)[0] - yt) ** 2)) for g in grid}
print("chosen length scale:", best, "| held-out RMSE by length scale:", {float(g): round(float(e), 3) for g, e in err.items()})
assert 0.1 <= best <= 0.3 and err[best] < err[0.01] and err[best] < err[3.0]
print("PASS: marginal likelihood picks a length scale that generalizes")
`,
}
