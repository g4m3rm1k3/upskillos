export default {
  filename: 'gradient_boosting.py', packages: ['numpy'],
  title: 'Boost stumps into a strong regressor.',
  intro: 'Implement gradient boosting for one-feature regression from scratch: a regression stump that minimizes squared error, the boosting loop on residuals with shrinkage, staged predictions, and early stopping on validation data.',
  steps: [
    '`fit_stump(x, r)` → `(threshold, left_value, right_value)` minimizing squared error of r; left means `x <= threshold`. Try midpoints between sorted distinct x.',
    '`stump_predict(stump, x)`.',
    '`boost(x, y, stages, rate)` → `(base, stumps)`: base = mean(y); each stump fits the current residuals.',
    '`boost_predict(base, stumps, rate, x, m=None)` → prediction using the first m stumps (all if None).',
    '`best_stages(base, stumps, rate, x_val, y_val)` → the m (0…len(stumps)) with the lowest validation MSE.',
  ],
  hints: [
    ['Best stump', 'For a threshold t, left values are `r[x <= t]`; the best constant there is their mean. SSE = `((r_l - r_l.mean())**2).sum() + ((r_r - r_r.mean())**2).sum()`.'],
    ['The loop', '`F = np.full(len(y), base)`; each stage: `s = fit_stump(x, y - F)`; `F = F + rate * stump_predict(s, x)`.'],
    ['Staged predictions', 'Accumulate `pred += rate * stump_predict(s, x_val)` after each stump and record the MSE, starting with m = 0 (just the base).'],
  ],
  starter: `import numpy as np

def fit_stump(x, r):
    raise NotImplementedError

def stump_predict(stump, x):
    raise NotImplementedError

def boost(x, y, stages, rate):
    raise NotImplementedError

def boost_predict(base, stumps, rate, x, m=None):
    raise NotImplementedError

def best_stages(base, stumps, rate, x_val, y_val):
    raise NotImplementedError
`,
  solution: `import numpy as np

def fit_stump(x, r):
    values = np.unique(x)
    best = None
    for t in (values[:-1] + values[1:]) / 2:
        left = x <= t
        a, b = r[left].mean(), r[~left].mean()
        sse = ((r[left] - a) ** 2).sum() + ((r[~left] - b) ** 2).sum()
        if best is None or sse < best[0]:
            best = (sse, float(t), float(a), float(b))
    return best[1:]

def stump_predict(stump, x):
    t, a, b = stump
    return np.where(x <= t, a, b)

def boost(x, y, stages, rate):
    base = float(np.mean(y))
    F = np.full(len(y), base)
    stumps = []
    for _ in range(stages):
        s = fit_stump(x, y - F)
        stumps.append(s)
        F = F + rate * stump_predict(s, x)
    return base, stumps

def boost_predict(base, stumps, rate, x, m=None):
    pred = np.full(len(x), base)
    for s in stumps[:m]:
        pred = pred + rate * stump_predict(s, x)
    return pred

def best_stages(base, stumps, rate, x_val, y_val):
    pred = np.full(len(x_val), base)
    errors = [np.mean((pred - y_val) ** 2)]
    for s in stumps:
        pred = pred + rate * stump_predict(s, x_val)
        errors.append(np.mean((pred - y_val) ** 2))
    return int(np.argmin(errors))
`,
  solutionNote: 'Each stump is fitted to y − F, the negative gradient of the squared loss, and only a fraction `rate` of it is added. `stumps[:m]` with m = None uses every stump.',
  checkSummary: 'The stump\'s threshold and leaf means on a two-level step; training MSE decreasing at every stage; agreement with an exact one-stump fit at rate 1; a boosted model that beats a single stump on held-out data; and early stopping that finds a stage no worse than the last one.',
  checks: `
import numpy as np
_x = np.array([1.0, 2.0, 3.0, 10.0, 11.0, 12.0]); _r = np.array([5.0, 5.0, 5.0, 20.0, 20.0, 20.0])
_t, _a, _b = fit_stump(_x, _r)
assert abs(_t - 6.5) < 1e-12 and _a == 5 and _b == 20, f"Stump should split at 6.5 into 5 and 20, got {(_t, _a, _b)}"
np.testing.assert_allclose(stump_predict((_t, _a, _b), np.array([0.0, 7.0])), [5, 20])
print("PASS: regression stump")
_rng = np.random.default_rng(0)
_xs = _rng.uniform(-3, 3, 150); _ys = np.sin(2 * _xs) + 0.3 * _rng.normal(size=150)
_xv = _rng.uniform(-3, 3, 400); _yv = np.sin(2 * _xv) + 0.3 * _rng.normal(size=400)
_base, _stumps = boost(_xs, _ys, 200, 0.1)
assert len(_stumps) == 200 and abs(_base - _ys.mean()) < 1e-12
_tr = [np.mean((boost_predict(_base, _stumps, 0.1, _xs, m) - _ys) ** 2) for m in (0, 10, 50, 200)]
assert all(a > b for a, b in zip(_tr, _tr[1:])), f"Training MSE must fall with stages: {_tr}"
_b1, _s1 = boost(_xs, _ys, 1, 1.0)
np.testing.assert_allclose(boost_predict(_b1, _s1, 1.0, _xs), _b1 + stump_predict(fit_stump(_xs, _ys - _ys.mean()), _xs))
print("PASS: boosting loop and staged predictions")
_mv = lambda m: np.mean((boost_predict(_base, _stumps, 0.1, _xv, m) - _yv) ** 2)
assert _mv(200) < 0.5 * _mv(1), "200 boosted stumps should beat a single stump on held-out data"
_best = best_stages(_base, _stumps, 0.1, _xv, _yv)
assert 0 <= _best <= 200 and _mv(_best) <= _mv(200) + 1e-12 and _mv(_best) <= min(_mv(m) for m in range(0, 201, 25)) + 1e-12
print(f"PASS: held-out MSE {_mv(1):.3f} (1 stump) -> {_mv(_best):.3f} (best stage {_best})")
`,
}
