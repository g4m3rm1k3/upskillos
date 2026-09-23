export default {
  filename: 'forecasting.py', packages: ['numpy'],
  title: 'Forecast honestly: lags, baselines, walk-forward.',
  intro: 'Implement autocorrelation, the two baselines, a leak-free supervised dataset for a horizon h, and a walk-forward evaluation with an expanding window. The checks plant a daily cycle, verify every feature\'s time index, and require your regression to beat both baselines out of sample.',
  steps: [
    '`acf(y, k)` → autocorrelation at lag k (numerator over pairs `(y[t], y[t-k])`, denominator Σ(y − ȳ)² over all values).',
    '`persistence(y, t, h)` → `y[t]`; `seasonal_naive(y, t, h, s=24)` → `y[t + h - s]` (assume h ≤ s).',
    '`make_row(y, t, h)` → features `[y[t], y[t-1], y[t-2], y[t+h-24], y[t+h-168], mean(y[t-23:t+1])]` — every index ≤ t.',
    '`walk_forward(y, h, start, refit=24)` → `(predictions, actuals)` for origins `start … len(y)-h-1`, refitting least squares (with an intercept) every `refit` origins on rows j in `[168, t-h]`.',
  ],
  hints: [
    ['ACF', '`d = y - y.mean()`; `np.sum(d[k:] * d[:-k]) / np.sum(d ** 2)` for k ≥ 1.'],
    ['Training rows at origin t', '`rows = range(168, t - h + 1)`: each row j has target `y[j + h]` with `j + h <= t`, so nothing from after the origin is used.'],
    ['Least squares', '`X = np.array([make_row(y, j, h) for j in rows])`; `w = np.linalg.lstsq(np.c_[np.ones(len(X)), X], y[rows + h], rcond=None)[0]`.'],
  ],
  starter: `import numpy as np

def acf(y, k):
    raise NotImplementedError

def persistence(y, t, h):
    raise NotImplementedError

def seasonal_naive(y, t, h, s=24):
    raise NotImplementedError

def make_row(y, t, h):
    raise NotImplementedError

def walk_forward(y, h, start, refit=24):
    raise NotImplementedError
`,
  solution: `import numpy as np

def acf(y, k):
    d = y - y.mean()
    return float(np.sum(d[k:] * d[:-k]) / np.sum(d ** 2))

def persistence(y, t, h):
    return y[t]

def seasonal_naive(y, t, h, s=24):
    return y[t + h - s]

def make_row(y, t, h):
    return [y[t], y[t - 1], y[t - 2], y[t + h - 24], y[t + h - 168], float(np.mean(y[t - 23:t + 1]))]

def walk_forward(y, h, start, refit=24):
    preds, actual = [], []
    w = None
    for i, t in enumerate(range(start, len(y) - h)):
        if i % refit == 0:
            rows = np.arange(168, t - h + 1)
            X = np.array([make_row(y, j, h) for j in rows])
            w = np.linalg.lstsq(np.c_[np.ones(len(X)), X], y[rows + h], rcond=None)[0]
        preds.append(w[0] + np.dot(w[1:], make_row(y, t, h)))
        actual.append(y[t + h])
    return np.array(preds), np.array(actual)
`,
  solutionNote: 'Training rows stop at origin t − h, so their targets never lie after the forecast origin; features only index up to t. The model is refitted once per day on an expanding window, exactly as it would run in production.',
  checkSummary: 'ACF of a pure daily cycle (high at lag 24, negative at lag 12); both baselines on a known index; a feature-row check that fails if any value after the origin influences it (the future is replaced with NaN); and a walk-forward regression on a noisy series with daily and weekly patterns that beats persistence and seasonal naive at a 6-hour horizon.',
  checks: `
import numpy as np
_t = np.arange(24 * 20)
_sine = np.sin(2 * np.pi * _t / 24)
assert acf(_sine, 24) > 0.9 and acf(_sine, 12) < -0.9, "A daily cycle must correlate at lag 24 and anti-correlate at lag 12"
_y = np.arange(300, dtype=float)
assert persistence(_y, 100, 5) == 100 and seasonal_naive(_y, 100, 5) == 81
print("PASS: autocorrelation and baselines")
_rng = np.random.default_rng(0)
_hour, _dow = _t % 24, (_t // 24) % 7
_ar = np.zeros(len(_t))
for _i in range(1, len(_t)):
    _ar[_i] = 0.75 * _ar[_i - 1] + 3 * _rng.normal()
_series = 30 + 0.02 * _t + 18 * np.maximum(0, np.sin(np.pi * (_hour - 7) / 13)) * np.where(_dow >= 5, 0.4, 1) - 12 * (_dow >= 5) + _ar
_masked = _series.copy(); _masked[301:] = np.nan
_row = make_row(_masked, 300, 6)
assert len(_row) == 6 and np.all(np.isfinite(_row)), "make_row must not read any value after the origin t"
assert np.allclose(_row, make_row(_series, 300, 6))
print("PASS: every feature is available at the forecast origin")
_p, _a = walk_forward(_series, 6, start=14 * 24)
assert len(_p) == len(_series) - 6 - 14 * 24
_origins = np.arange(14 * 24, len(_series) - 6)
_mae = lambda f: np.mean(np.abs(f - _a))
_reg, _per, _sea = _mae(_p), _mae(_series[_origins]), _mae(_series[_origins + 6 - 24])
assert _reg < _per and _reg < _sea, f"Regression {_reg:.2f} must beat persistence {_per:.2f} and seasonal naive {_sea:.2f}"
print(f"PASS: 6-hour walk-forward MAE — regression {_reg:.2f}, persistence {_per:.2f}, seasonal naive {_sea:.2f}")
`,
}
