export default {
  filename: 'gda.py', packages: ['numpy'],
  title: 'Gaussian discriminant analysis and naive Bayes from scratch.',
  intro: 'Fit GDA by maximum likelihood with a shared or per-class covariance, compute the posterior log-odds, recover LDA’s linear form, and build Gaussian naive Bayes that handles missing features by leaving them out. Labels are 0/1 and X has one row per example.',
  steps: [
    '`fit_gda(X, y, shared)` → dict with `phi`, `mu0`, `mu1`, `S0`, `S1` (maximum likelihood: divide by the count, not count − 1). With `shared=True`, both covariances are the pooled within-class covariance.',
    '`gda_log_odds(model, X)` → log p(y=1|x) − log p(y=0|x) for every row, using the full Gaussian log-densities (determinants included).',
    '`lda_linear(model)` → `(theta, theta0)` with θ = Σ⁻¹(μ₁ − μ₀) and θ₀ = −½(μ₁ᵀΣ⁻¹μ₁ − μ₀ᵀΣ⁻¹μ₀) + log(φ/(1 − φ)).',
    '`fit_gaussian_nb(X, y)` → dict with `phi`, `mu0`, `mu1`, `var` (pooled per-feature variances).',
    '`nb_log_odds(model, X)` → per-row log-odds; entries of X that are NaN are skipped (their term is left out).',
  ],
  hints: [
    ['Pooled covariance', 'Subtract each row’s own class mean: `R = X - np.where(y[:, None] == 1, mu1, mu0)`, then `R.T @ R / n`.'],
    ['Gaussian log-density', '`-0.5 * np.sum(D @ inv(S) * D, axis=1) - 0.5 * np.log(det(S)) - d/2 * log(2π)` with D = X − μ.'],
    ['Skipping NaN', 'Compute every feature’s term, then `np.nansum(terms, axis=1)` — or replace NaN terms by 0.'],
  ],
  starter: `import numpy as np

def fit_gda(X, y, shared):
    raise NotImplementedError

def gda_log_odds(model, X):
    raise NotImplementedError

def lda_linear(model):
    raise NotImplementedError

def fit_gaussian_nb(X, y):
    raise NotImplementedError

def nb_log_odds(model, X):
    raise NotImplementedError
`,
  solution: `import numpy as np

def fit_gda(X, y, shared):
    n = len(y)
    phi = y.mean()
    mu0, mu1 = X[y == 0].mean(axis=0), X[y == 1].mean(axis=0)
    D0, D1 = X[y == 0] - mu0, X[y == 1] - mu1
    if shared:
        S = (D0.T @ D0 + D1.T @ D1) / n
        S0 = S1 = S
    else:
        S0, S1 = D0.T @ D0 / len(D0), D1.T @ D1 / len(D1)
    return {"phi": phi, "mu0": mu0, "mu1": mu1, "S0": S0, "S1": S1}

def _log_gauss(X, mu, S):
    D = X - mu
    return -0.5 * np.sum(D @ np.linalg.inv(S) * D, axis=1) - 0.5 * np.log(np.linalg.det(S)) - X.shape[1] / 2 * np.log(2 * np.pi)

def gda_log_odds(model, X):
    return (_log_gauss(X, model["mu1"], model["S1"]) - _log_gauss(X, model["mu0"], model["S0"])
            + np.log(model["phi"] / (1 - model["phi"])))

def lda_linear(model):
    P = np.linalg.inv(model["S0"])
    m0, m1 = model["mu0"], model["mu1"]
    theta = P @ (m1 - m0)
    theta0 = -0.5 * (m1 @ P @ m1 - m0 @ P @ m0) + np.log(model["phi"] / (1 - model["phi"]))
    return theta, theta0

def fit_gaussian_nb(X, y):
    mu0, mu1 = X[y == 0].mean(axis=0), X[y == 1].mean(axis=0)
    R = X - np.where(y[:, None] == 1, mu1, mu0)
    return {"phi": y.mean(), "mu0": mu0, "mu1": mu1, "var": (R ** 2).mean(axis=0)}

def nb_log_odds(model, X):
    terms = ((X - model["mu0"]) ** 2 - (X - model["mu1"]) ** 2) / (2 * model["var"])
    return np.log(model["phi"] / (1 - model["phi"])) + np.nansum(terms, axis=1)
`,
  solutionNote: 'Every parameter is a count or an average, and the posterior is Bayes’ rule in log space. LDA’s linear form is an algebraic consequence of the shared covariance, not a separate model.',
  checkSummary: 'Maximum-likelihood estimates against direct formulas; the LDA linear form equals the full log-odds; QDA beats LDA when covariances differ; naive Bayes with a NaN feature equals the model without that feature; and naive Bayes beats unregularized full LDA with few examples in 20 dimensions.',
  checks: `
import numpy as np
rng = np.random.default_rng(40)
n = 600
y = (rng.random(n) < 0.4).astype(int)
A = np.array([[1.0, 0.0], [0.6, 0.8]])
X = rng.normal(size=(n, 2)) @ A.T + np.where(y[:, None] == 1, [1.0, 0.8], [-0.5, -0.2])
m = fit_gda(X, y, shared=True)
assert abs(m["phi"] - y.mean()) < 1e-12 and np.allclose(m["mu1"], X[y == 1].mean(0))
R = X - np.where(y[:, None] == 1, X[y == 1].mean(0), X[y == 0].mean(0))
assert np.allclose(m["S0"], R.T @ R / n) and np.allclose(m["S0"], m["S1"]), "pooled covariance: divide by n, measure from each class mean"
th, th0 = lda_linear(m)
assert np.allclose(X @ th + th0, gda_log_odds(m, X)), "LDA log-odds must be exactly linear"
print("PASS: maximum likelihood and the LDA linear form")
y2 = (rng.random(n) < 0.5).astype(int)
X2 = np.where(y2[:, None] == 1, rng.normal(size=(n, 2)) * [1.6, 1.3] + [1.0, 0.5], rng.normal(size=(n, 2)) * 0.4)
Xt = np.where((yt := (rng.random(4000) < 0.5).astype(int))[:, None] == 1, rng.normal(size=(4000, 2)) * [1.6, 1.3] + [1.0, 0.5], rng.normal(size=(4000, 2)) * 0.4)
err = lambda lo: np.mean((lo > 0) != (yt == 1))
e_lda, e_qda = err(gda_log_odds(fit_gda(X2, y2, True), Xt)), err(gda_log_odds(fit_gda(X2, y2, False), Xt))
print(f"different covariances: LDA error {e_lda:.3f}, QDA error {e_qda:.3f}")
assert e_qda < e_lda - 0.1, "QDA should win clearly when class covariances differ"
nb = fit_gaussian_nb(X, y)
Xm = X[:5].copy(); Xm[:, 1] = np.nan
sub = {"phi": nb["phi"], "mu0": nb["mu0"][:1], "mu1": nb["mu1"][:1], "var": nb["var"][:1]}
assert np.allclose(nb_log_odds(nb, Xm), nb_log_odds(sub, X[:5, :1])), "a missing feature's term must be left out"
print("PASS: QDA and naive Bayes with missing values")
d, test_n = 20, 3000
def draw(k, seed):
    r = np.random.default_rng(seed); yy = (r.random(k) < 0.5).astype(int)
    return r.normal(size=(k, d)) + np.where(yy[:, None] == 1, 0.35, -0.35), yy
Xte, yte = draw(test_n, 1)
e_nb, e_ld = [], []
for s in range(20):
    Xs, ys = draw(40, 100 + s)
    e_nb.append(np.mean((nb_log_odds(fit_gaussian_nb(Xs, ys), Xte) > 0) != (yte == 1)))
    e_ld.append(np.mean((gda_log_odds(fit_gda(Xs, ys, True), Xte) > 0) != (yte == 1)))
print(f"20 features, 40 examples: naive Bayes {np.mean(e_nb):.3f}, full LDA {np.mean(e_ld):.3f}")
assert np.mean(e_nb) < np.mean(e_ld) - 0.03, "with few examples, the diagonal model should win"
print("PASS: fewer parameters learn faster when the assumption holds")
`,
}
