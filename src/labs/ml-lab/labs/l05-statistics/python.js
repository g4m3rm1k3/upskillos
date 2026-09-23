export default {
  filename: 'estimation.py', packages: ['numpy'],
  title: 'Quantify uncertainty from one sample.',
  intro: 'Implement the estimation toolkit: a standard error, a vectorized bootstrap, a percentile interval, maximum likelihood for a yes/no rate, and Pearson correlation. The final check runs **your** bootstrap inside a coverage simulation: across many simulated studies, your 90% intervals must capture the truth about 90% of the time.',
  steps: [
    '`standard_error(x)` → `std(x, ddof=1) / sqrt(n)`.',
    '`bootstrap(x, stat, B, rng)` → an array of B statistics, each computed on n values drawn from x **with replacement**. `stat` is a function such as `np.mean`.',
    '`percentile_interval(values, level)` → `(low, high)` percentiles containing the central `level` fraction.',
    '`bernoulli_mle(k, n)` and `bernoulli_log_likelihood(p, k, n)`.',
    '`pearson_r(x, y)` from its definition (do not call `np.corrcoef`).',
  ],
  hints: [
    ['Vectorized resampling', '`idx = rng.integers(0, len(x), size=(B, len(x)))` makes all resample indices at once; `x[idx]` has shape `(B, n)`. Apply `stat` to each row: `np.array([stat(row) for row in x[idx]])`.'],
    ['Percentiles', 'For level 0.95, the tails are 2.5% each: `np.percentile(values, [2.5, 97.5])`. In general `alpha = (1 - level) / 2 * 100`.'],
    ['Log-likelihood', '`k * np.log(p) + (n - k) * np.log(1 - p)`. Only call it with 0 < p < 1.'],
  ],
  starter: `import numpy as np

def standard_error(x):
    raise NotImplementedError

def bootstrap(x, stat, B, rng):
    raise NotImplementedError

def percentile_interval(values, level=0.95):
    raise NotImplementedError

def bernoulli_mle(k, n):
    raise NotImplementedError

def bernoulli_log_likelihood(p, k, n):
    raise NotImplementedError

def pearson_r(x, y):
    raise NotImplementedError
`,
  solution: `import numpy as np

def standard_error(x):
    x = np.asarray(x, dtype=float)
    return float(np.std(x, ddof=1) / np.sqrt(len(x)))

def bootstrap(x, stat, B, rng):
    x = np.asarray(x)
    idx = rng.integers(0, len(x), size=(B, len(x)))
    return np.array([stat(row) for row in x[idx]])

def percentile_interval(values, level=0.95):
    tail = (1 - level) / 2 * 100
    low, high = np.percentile(values, [tail, 100 - tail])
    return float(low), float(high)

def bernoulli_mle(k, n):
    return k / n

def bernoulli_log_likelihood(p, k, n):
    return float(k * np.log(p) + (n - k) * np.log(1 - p))

def pearson_r(x, y):
    x, y = np.asarray(x, dtype=float), np.asarray(y, dtype=float)
    dx, dy = x - x.mean(), y - y.mean()
    return float(np.sum(dx * dy) / np.sqrt(np.sum(dx ** 2) * np.sum(dy ** 2)))
`,
  solutionNote: 'The bootstrap draws every resample index in one call and never modifies the data. The interval is read from the percentiles of the bootstrap values, so it can be asymmetric when the data are skewed.',
  checkSummary: 'Standard error with ddof = 1; bootstrap shape, determinism, use of replacement, and agreement between the bootstrap spread and the known standard error; percentile intervals; the Bernoulli maximum is at k/n (checked on a grid of your own log-likelihood); Pearson r on known cases; and a 200-study coverage simulation of your 90% intervals.',
  checks: `
import numpy as np
assert abs(standard_error([1, 2, 3, 4]) - np.std([1, 2, 3, 4], ddof=1) / 2) < 1e-12, "Use ddof=1"
_rng = np.random.default_rng(0)
_x = _rng.normal(10, 3, size=200)
_b = bootstrap(_x, np.mean, 2000, np.random.default_rng(1))
assert np.shape(_b) == (2000,), "bootstrap must return B statistics"
assert np.array_equal(_b, bootstrap(_x, np.mean, 2000, np.random.default_rng(1))), "Same seed must reproduce"
assert np.std(_b) > 0, "Resamples must differ: draw WITH replacement"
assert abs(np.std(_b) - 3 / np.sqrt(200)) < 0.03, f"Bootstrap SE {np.std(_b):.3f} should be near 3/sqrt(200)"
_med = bootstrap(np.array([1.0, 2.0, 3.0]), np.median, 500, np.random.default_rng(2))
assert set(np.unique(_med)).issubset({1.0, 2.0, 3.0}), "Median of resampled values must be one of the original values"
print("PASS: standard error and bootstrap")
_lo, _hi = percentile_interval(np.arange(1, 101), 0.9)
assert abs(_lo - np.percentile(np.arange(1, 101), 5)) < 1e-9 and abs(_hi - np.percentile(np.arange(1, 101), 95)) < 1e-9
assert bernoulli_mle(7, 10) == 0.7
_grid = np.linspace(0.01, 0.99, 99)
_ll = [bernoulli_log_likelihood(p, 7, 10) for p in _grid]
assert abs(_grid[int(np.argmax(_ll))] - 0.7) < 1e-9, "Log-likelihood must peak at k/n"
assert abs(pearson_r([1, 2, 3], [1, 3, 2]) - 0.5) < 1e-12
assert abs(pearson_r([1, 2, 3], [6, 4, 2]) + 1) < 1e-12
print("PASS: intervals, likelihood maximum and correlation")
_hits = 0
_studies = np.random.default_rng(7)
for _s in range(200):
    _sample = _studies.normal(50, 10, size=40)
    _l, _h = percentile_interval(bootstrap(_sample, np.mean, 300, _studies), 0.9)
    _hits += _l <= 50 <= _h
assert 0.80 <= _hits / 200 <= 0.97, f"Coverage {_hits / 200:.2f} is far from the nominal 0.90"
print(f"PASS: your 90% bootstrap intervals covered the truth in {_hits}/200 simulated studies")
`,
}
