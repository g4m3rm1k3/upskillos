export default {
  filename: 'causal.py', packages: ['numpy'],
  title: 'Estimate an effect three ways — and size an experiment.',
  intro: 'Implement the difference in means with a 95% interval, regression adjustment, inverse propensity weighting with a logistic propensity model, and the sample-size formula. The checks simulate confounded data where the true effect is known.',
  steps: [
    '`diff_in_means(y, t)` → `(estimate, low, high)` using the unpooled standard error `sqrt(var1/n1 + var0/n0)` (sample variances, `ddof=1`) and ±1.96.',
    '`regression_adjust(y, t, x)` → the coefficient of `t` in least squares `y ~ 1 + t + x` (x may have several columns).',
    '`fit_propensity(t, x, steps=2000, lr=0.5)` → probabilities from logistic regression of t on `[1, x]` by gradient descent, clipped to [0.01, 0.99].',
    '`ipw(y, t, e)` → the normalized inverse-propensity-weighted difference.',
    '`sample_size(sd, mde)` → users per arm for a two-sided 5% test with 80% power, rounded **up** (use z = 1.959964 and 0.841621).',
  ],
  hints: [
    ['Design matrix', '`X = np.column_stack([np.ones(len(y)), t, x])`, then `np.linalg.lstsq(X, y, rcond=None)[0][1]`.'],
    ['Normalized IPW', '`np.sum(t*y/e)/np.sum(t/e) - np.sum((1-t)*y/(1-e))/np.sum((1-t)/(1-e))`.'],
  ],
  starter: `import math
import numpy as np

def diff_in_means(y, t):
    raise NotImplementedError

def regression_adjust(y, t, x):
    raise NotImplementedError

def fit_propensity(t, x, steps=2000, lr=0.5):
    raise NotImplementedError

def ipw(y, t, e):
    raise NotImplementedError

def sample_size(sd, mde):
    raise NotImplementedError
`,
  solution: `import math
import numpy as np

def diff_in_means(y, t):
    a, b = y[t == 1], y[t == 0]
    est = a.mean() - b.mean()
    se = math.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
    return est, est - 1.96 * se, est + 1.96 * se

def regression_adjust(y, t, x):
    X = np.column_stack([np.ones(len(y)), t, x])
    return float(np.linalg.lstsq(X, y, rcond=None)[0][1])

def fit_propensity(t, x, steps=2000, lr=0.5):
    X = np.column_stack([np.ones(len(t)), x])
    w = np.zeros(X.shape[1])
    for _ in range(steps):
        p = 1 / (1 + np.exp(-X @ w))
        w -= lr * X.T @ (p - t) / len(t)
    return np.clip(1 / (1 + np.exp(-X @ w)), 0.01, 0.99)

def ipw(y, t, e):
    return float(np.sum(t * y / e) / np.sum(t / e) - np.sum((1 - t) * y / (1 - e)) / np.sum((1 - t) / (1 - e)))

def sample_size(sd, mde):
    return math.ceil(2 * (1.959964 + 0.841621) ** 2 * sd ** 2 / mde ** 2)
`,
  solutionNote: 'Regression and IPW agree when the confounder is measured exactly, and both stay biased when only a noisy proxy is available — no formula recovers what was never measured.',
  checkSummary: 'The interval on a hand example; on confounded simulated data the naive difference is biased while regression and IPW with the true confounder recover the effect; with a noisy proxy they remain biased; a randomized version is unbiased; sample sizes match the formula.',
  checks: `
import numpy as np
_y = np.array([3., 5, 4, 8, 10, 9]); _t = np.array([0, 0, 0, 1, 1, 1])
_e, _lo, _hi = diff_in_means(_y, _t)
assert abs(_e - 5) < 1e-12 and abs((_hi - _lo) / 2 - 1.96 * np.sqrt(1 / 3 + 1 / 3)) < 1e-9
print("PASS: difference in means with interval")
_rng = np.random.default_rng(36)
_n = 6000
_m = _rng.normal(size=_n)
_t = (_rng.random(_n) < 1 / (1 + np.exp(-1.5 * _m))).astype(float)
_y = 5 + 2 * _m + 1.0 * _t + 1.5 * _rng.normal(size=_n)
_naive = diff_in_means(_y, _t)[0]
_reg = regression_adjust(_y, _t, _m)
_ipw = ipw(_y, _t, fit_propensity(_t, _m))
_proxy = _m + 1.0 * _rng.normal(size=_n)
_reg_proxy = regression_adjust(_y, _t, _proxy)
print(f"true 1.00 | naive {_naive:.2f} | regression {_reg:.2f} | IPW {_ipw:.2f} | regression on noisy proxy {_reg_proxy:.2f}")
assert _naive > 2.5, "Confounding should inflate the naive difference"
assert abs(_reg - 1) < 0.12 and abs(_ipw - 1) < 0.2
assert _reg_proxy > 1.5, "A noisy proxy leaves residual confounding"
_tr = (_rng.random(_n) < 0.5).astype(float)
_yr = 5 + 2 * _m + 1.0 * _tr + 1.5 * _rng.normal(size=_n)
_er, _lr, _hr = diff_in_means(_yr, _tr)
assert _lr < 1 < _hr, "Randomization: the interval should contain the true effect"
print("PASS: confounding, adjustment and randomization")
assert sample_size(2.5, 0.3) == 1091 and sample_size(2, 0.5) == 252 and sample_size(1, 0.2) == 393
print("PASS: sample size")
`,
}
