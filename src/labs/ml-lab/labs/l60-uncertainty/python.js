export default {
  filename: 'conformal.py', packages: ['numpy'],
  title: 'Uncertainty with guarantees: ensembles, pinball loss and conformal prediction.',
  intro: 'Implement the ensemble variance decomposition, the pinball loss, the conformal quantile, split-conformal and CQR intervals, and conformal prediction sets. The checks run thousands of random calibration splits with a deliberately poor model and heavy-tailed noise, and confirm that the average coverage still lands between 1 − α and 1 − α + 1/(n + 1).',
  steps: [
    '`mixture_variance(mus, variances)` → the variance of an equal mixture of Gaussians, given arrays of member means and variances at one input.',
    '`pinball(tau, y, q)` → the mean pinball loss of predictions q for targets y.',
    '`conformal_quantile(scores, alpha)` → the ⌈(n + 1)(1 − α)⌉-th smallest score, or `np.inf` if that rank exceeds n.',
    '`split_conformal(mu_cal, y_cal, mu_test, alpha)` → (lower, upper) arrays for the test points using the absolute-residual score.',
    '`cqr(lo_cal, hi_cal, y_cal, lo_test, hi_test, alpha)` → (lower, upper) arrays using the score max(lo − y, y − hi).',
    '`prediction_sets(p_cal, y_cal, p_test, alpha)` → a boolean array (test points × classes), True where the class is in the set. The score is 1 − p̂(true class).',
  ],
  hints: [
    ['Ranks are 1-based', 'After sorting, the k-th smallest score is `s[k - 1]`.'],
    ['Mixture variance', 'Use the law of total variance: mean of the variances plus the variance of the means (divide by M, not M − 1).'],
  ],
  starter: `import numpy as np

def mixture_variance(mus, variances):
    raise NotImplementedError

def pinball(tau, y, q):
    raise NotImplementedError

def conformal_quantile(scores, alpha):
    raise NotImplementedError

def split_conformal(mu_cal, y_cal, mu_test, alpha):
    raise NotImplementedError

def cqr(lo_cal, hi_cal, y_cal, lo_test, hi_test, alpha):
    raise NotImplementedError

def prediction_sets(p_cal, y_cal, p_test, alpha):
    raise NotImplementedError
`,
  solution: `import numpy as np

def mixture_variance(mus, variances):
    mus, variances = np.asarray(mus, float), np.asarray(variances, float)
    return variances.mean() + ((mus - mus.mean()) ** 2).mean()

def pinball(tau, y, q):
    r = np.asarray(y) - np.asarray(q)
    return np.mean(np.where(r >= 0, tau * r, (tau - 1) * r))

def conformal_quantile(scores, alpha):
    n = len(scores)
    k = int(np.ceil((n + 1) * (1 - alpha)))
    return np.inf if k > n else np.sort(scores)[k - 1]

def split_conformal(mu_cal, y_cal, mu_test, alpha):
    q = conformal_quantile(np.abs(y_cal - mu_cal), alpha)
    return mu_test - q, mu_test + q

def cqr(lo_cal, hi_cal, y_cal, lo_test, hi_test, alpha):
    q = conformal_quantile(np.maximum(lo_cal - y_cal, y_cal - hi_cal), alpha)
    return lo_test - q, hi_test + q

def prediction_sets(p_cal, y_cal, p_test, alpha):
    q = conformal_quantile(1 - p_cal[np.arange(len(y_cal)), y_cal], alpha)
    return 1 - p_test <= q
`,
  solutionNote: 'The model enters only through its predictions on the calibration and test points. That is why the guarantee survives a bad model: a worse model gives wider intervals, not lower coverage.',
  checkSummary: 'Mixture variance matches a Monte Carlo estimate; the pinball loss is minimized at the empirical quantile; conformal quantile ranks and the infinite case; over 2,000 random splits with a constant (useless) model and heavy-tailed noise, split-conformal coverage averages between 1 − α and 1 − α + 1/(n + 1); CQR reaches the target and covers the noisy region far better than constant-width intervals; conformal prediction sets reach their target coverage while the sets grow where classes overlap.',
  checks: `
import numpy as np
rng = np.random.default_rng(60)
mus, vs = np.array([1.0, 1.6, 0.4]), np.array([0.36, 0.25, 0.5])
comp = rng.integers(0, 3, 400000)
draws = mus[comp] + np.sqrt(vs[comp]) * rng.normal(size=comp.size)
print("mixture variance", round(mixture_variance(mus, vs), 4), "| Monte Carlo", round(draws.var(), 4))
assert abs(mixture_variance(mus, vs) - draws.var()) < 0.01
y = rng.exponential(size=5000)
grid = np.linspace(0, 5, 2001)
best = grid[np.argmin([pinball(0.9, y, g) for g in grid])]
assert abs(best - np.quantile(y, 0.9)) < 0.01, "pinball loss should be minimized at the 0.9 quantile"
assert abs(pinball(0.9, np.array([0.0]), np.array([2.0])) - 0.2) < 1e-12
print("PASS: mixture variance and pinball loss")

assert conformal_quantile(np.arange(1, 100), 0.1) == 90
assert conformal_quantile(np.arange(1, 19), 0.05) == np.inf and conformal_quantile(np.arange(1, 20), 0.05) == 19
print("PASS: conformal quantile ranks")

n, alpha, covs = 49, 0.1, []
for _ in range(2000):
    x = rng.uniform(-3, 3, n + 500)
    yy = np.sin(x) + (0.2 + 0.3 * np.abs(x)) * rng.standard_t(3, size=x.size)
    mu = np.zeros_like(x)  # a useless model
    lo, hi = split_conformal(mu[:n], yy[:n], mu[n:], alpha)
    covs.append(np.mean((yy[n:] >= lo) & (yy[n:] <= hi)))
m = np.mean(covs)
print(f"average coverage over 2000 splits: {m:.4f}  (bounds {1 - alpha:.4f} to {1 - alpha + 1 / (n + 1):.4f})")
assert 1 - alpha - 0.005 <= m <= 1 - alpha + 1 / (n + 1) + 0.005
print("PASS: split conformal coverage guarantee (bad model, heavy tails)")

x = rng.uniform(-3, 3, 6000); sd = 0.1 + 0.25 * np.abs(x)
yy = np.sin(x) + sd * rng.normal(size=x.size)
lo_hat, hi_hat = np.sin(x) - 1.2 * sd, np.sin(x) + 1.2 * sd  # quantile curves that are too narrow
cal, te = slice(0, 1000), slice(1000, None)
lo, hi = cqr(lo_hat[cal], hi_hat[cal], yy[cal], lo_hat[te], hi_hat[te], 0.1)
a_lo, a_hi = split_conformal(np.sin(x[cal]), yy[cal], np.sin(x[te]), 0.1)
inside = lambda l, h: (yy[te] >= l) & (yy[te] <= h)
edge = np.abs(x[te]) > 2.5
print(f"CQR coverage {inside(lo, hi).mean():.3f} (edges {inside(lo, hi)[edge].mean():.3f}) | constant width {inside(a_lo, a_hi).mean():.3f} (edges {inside(a_lo, a_hi)[edge].mean():.3f})")
assert abs(inside(lo, hi).mean() - 0.9) < 0.03 and inside(lo, hi)[edge].mean() > inside(a_lo, a_hi)[edge].mean() + 0.1
print("PASS: CQR fixes too-narrow quantiles and adapts to the noise")

centers = np.array([[-1, -0.6], [1, -0.6], [0, 1.0]])
def data(m):
    yl = rng.integers(0, 3, m); return centers[yl] + 0.75 * rng.normal(size=(m, 2)), yl
def probs(X):
    z = -((X[:, None, :] - centers[None]) ** 2).sum(-1) / (2 * 0.75 ** 2) * 0.6  # deliberately miscalibrated
    e = np.exp(z - z.max(1, keepdims=True)); return e / e.sum(1, keepdims=True)
Xc, yc = data(500); Xt, yt = data(5000)
sets = prediction_sets(probs(Xc), yc, probs(Xt), 0.1)
cov, size = sets[np.arange(len(yt)), yt].mean(), sets.sum(1).mean()
print(f"set coverage {cov:.3f}, average size {size:.2f}")
assert abs(cov - 0.9) < 0.03 and 1 < size < 3
print("PASS: conformal prediction sets")
`,
}
