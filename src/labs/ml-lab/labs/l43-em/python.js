export default {
  filename: 'em.py', packages: ['numpy', 'scikit-learn'],
  title: 'Expectation–maximization for Gaussian mixtures.',
  intro: 'Implement the E-step (in log space), the M-step, the log-likelihood, EM with restarts, and BIC. The checks confirm the likelihood never decreases, compare your fit with scikit-learn’s GaussianMixture, and use BIC to recover the number of clusters.',
  steps: [
    '`log_gauss(X, mu, S)` → log N(xᵢ | μ, Σ) for every row.',
    '`e_step(X, w, mus, Ss)` → `(R, ll)`: responsibilities (rows sum to 1) computed with log-sum-exp, and the total log-likelihood.',
    '`m_step(X, R, reg=1e-6)` → `(w, mus, Ss)`; add `reg` to each covariance diagonal.',
    '`em(X, K, seed, iters=200, tol=1e-8)` → `(w, mus, Ss, lls)`: initialize means at K distinct random rows (from `np.random.default_rng(seed)`), covariances at the data covariance, equal weights; stop when the gain is below tol.',
    '`bic(ll, K, n, d)` → −2·ll + p·log n with p = (K − 1) + Kd + Kd(d + 1)/2.',
  ],
  hints: [
    ['Log-sum-exp', '`m = L.max(1, keepdims=True); s = m + np.log(np.exp(L - m).sum(1, keepdims=True))`.'],
    ['Weighted covariance', '`D = X - mu; S = (R[:, k, None] * D).T @ D / Nk`.'],
  ],
  starter: `import numpy as np

def log_gauss(X, mu, S):
    raise NotImplementedError

def e_step(X, w, mus, Ss):
    raise NotImplementedError

def m_step(X, R, reg=1e-6):
    raise NotImplementedError

def em(X, K, seed, iters=200, tol=1e-8):
    raise NotImplementedError

def bic(ll, K, n, d):
    raise NotImplementedError
`,
  solution: `import numpy as np

def log_gauss(X, mu, S):
    d = X.shape[1]
    D = X - mu
    _, logdet = np.linalg.slogdet(S)
    return -0.5 * np.sum(D @ np.linalg.inv(S) * D, axis=1) - 0.5 * logdet - d / 2 * np.log(2 * np.pi)

def e_step(X, w, mus, Ss):
    L = np.column_stack([np.log(w[k]) + log_gauss(X, mus[k], Ss[k]) for k in range(len(w))])
    m = L.max(1, keepdims=True)
    s = m + np.log(np.exp(L - m).sum(1, keepdims=True))
    return np.exp(L - s), float(s.sum())

def m_step(X, R, reg=1e-6):
    n, d = X.shape
    Nk = R.sum(0)
    w = Nk / n
    mus = (R.T @ X) / Nk[:, None]
    Ss = []
    for k in range(R.shape[1]):
        D = X - mus[k]
        Ss.append((R[:, k, None] * D).T @ D / Nk[k] + reg * np.eye(d))
    return w, mus, np.array(Ss)

def em(X, K, seed, iters=200, tol=1e-8):
    rng = np.random.default_rng(seed)
    mus = X[rng.choice(len(X), K, replace=False)]
    Ss = np.array([np.cov(X.T, bias=True)] * K)
    w = np.full(K, 1 / K)
    lls = []
    for _ in range(iters):
        R, ll = e_step(X, w, mus, Ss)
        lls.append(ll)
        if len(lls) > 1 and lls[-1] - lls[-2] < tol:
            break
        w, mus, Ss = m_step(X, R)
    return w, mus, Ss, lls

def bic(ll, K, n, d):
    p = (K - 1) + K * d + K * d * (d + 1) / 2
    return -2 * ll + p * np.log(n)
`,
  solutionNote: 'The E-step is Bayes’ rule; the M-step is weighted maximum likelihood; log-sum-exp keeps both stable. Restarts are part of the method, not an afterthought.',
  checkSummary: 'Responsibilities sum to one; the log-likelihood never decreases; the best of several restarts matches scikit-learn’s GaussianMixture log-likelihood; the recovered weights and means match the generating ones; and BIC chooses the true number of components.',
  checks: `
import numpy as np
from sklearn.mixture import GaussianMixture
rng = np.random.default_rng(43)
true_w = np.array([0.5, 0.3, 0.2]); true_mu = np.array([[-2.0, 0.0], [2.0, 1.2], [0.5, -2.5]])
covs = [np.array([[0.6, 0.35], [0.35, 0.5]]), np.array([[1.2, -0.4], [-0.4, 0.4]]), np.eye(2) * 0.15]
z = rng.choice(3, 600, p=true_w)
X = np.array([rng.multivariate_normal(true_mu[k], covs[k]) for k in z])
R, ll0 = e_step(X, true_w, true_mu, np.array(covs))
assert np.allclose(R.sum(1), 1), "responsibilities must sum to one"
fits = [em(X, 3, s) for s in range(5)]
for f in fits:
    assert np.all(np.diff(f[3]) >= -1e-7), "EM must never decrease the log-likelihood"
best = max(fits, key=lambda f: f[3][-1])
sk = GaussianMixture(3, n_init=5, random_state=0, reg_covar=1e-6).fit(X)
sk_ll = sk.score(X) * len(X)
print(f"your log-likelihood {best[3][-1]:.2f}, scikit-learn {sk_ll:.2f}")
assert best[3][-1] > sk_ll - 0.5, "the best restart should match scikit-learn"
order = np.argsort(best[1][:, 0])
assert np.allclose(best[0][order], true_w[np.argsort(true_mu[:, 0])], atol=0.05) and np.allclose(best[1][order], true_mu[np.argsort(true_mu[:, 0])], atol=0.25)
print("PASS: EM is monotone and matches scikit-learn; parameters recovered")
scores = [bic(max(em(X, K, s)[3][-1] for s in range(4)), K, len(X), 2) for K in range(1, 6)]
print("BIC by K:", np.round(scores, 1))
assert int(np.argmin(scores)) + 1 == 3, "BIC should choose K = 3"
print("PASS: BIC recovers the number of components")
`,
}
