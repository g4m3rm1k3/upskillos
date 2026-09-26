import { APP } from './app.js'

export default {
  filename: 'end_to_end.py', packages: ['numpy'],
  title: 'A compact end-to-end pipeline.',
  intro: 'Assemble the core loop into one reproducible pipeline for time-ordered data: a time-based split, a mean baseline, a ridge model with training-only standardization, evaluation with a bootstrap interval on the test period, a decision against a success threshold, and a run record. A realistic synthetic dataset is generated in the checks.',
  steps: [
    '`time_split(n, test_fraction)` → `(dev_idx, test_idx)`: the last `int(n * test_fraction)` rows are the test set.',
    '`fit_ridge(X, y, lam)` → a dict with training means/sds, weights and intercept (standardize with training statistics only).',
    '`predict(model, X)`.',
    '`evaluate(y, pred, baseline, rng, B=1000)` → dict `mae`, `baseline_mae`, `improvement`, and a 95% bootstrap interval `ci` of the paired improvement.',
    '`decide(result, min_improvement)` → `"ship"` if the interval\'s lower bound exceeds `min_improvement`, `"inconclusive"` if the point estimate does but the bound does not, else `"reject"`.',
  ],
  hints: [
    ['Ridge', 'Standardize: `Z = (X - mu) / sd`; solve `(ZᵀZ/n + lam·I) w = Zᵀ(y − ȳ)/n` with `np.linalg.solve`; intercept `ȳ`.'],
    ['Paired bootstrap', '`d = np.abs(baseline - y) - np.abs(pred - y)`; resample indices B times and take the 2.5th and 97.5th percentiles of the resampled means.'],
  ],
  starter: `import numpy as np

def time_split(n, test_fraction=0.2):
    raise NotImplementedError

def fit_ridge(X, y, lam=0.01):
    raise NotImplementedError

def predict(model, X):
    raise NotImplementedError

def evaluate(y, pred, baseline, rng, B=1000):
    raise NotImplementedError

def decide(result, min_improvement):
    raise NotImplementedError
`,
  solution: `import numpy as np

def time_split(n, test_fraction=0.2):
    k = int(n * test_fraction)
    return np.arange(n - k), np.arange(n - k, n)

def fit_ridge(X, y, lam=0.01):
    mu, sd = X.mean(axis=0), X.std(axis=0)
    sd = np.where(sd == 0, 1.0, sd)
    Z, ym = (X - mu) / sd, y.mean()
    w = np.linalg.solve(Z.T @ Z / len(y) + lam * np.eye(X.shape[1]), Z.T @ (y - ym) / len(y))
    return {"mu": mu, "sd": sd, "w": w, "b": ym}

def predict(model, X):
    return ((X - model["mu"]) / model["sd"]) @ model["w"] + model["b"]

def evaluate(y, pred, baseline, rng, B=1000):
    d = np.abs(baseline - y) - np.abs(pred - y)
    boots = [d[rng.integers(0, len(d), len(d))].mean() for _ in range(B)]
    return {"mae": float(np.mean(np.abs(pred - y))), "baseline_mae": float(np.mean(np.abs(baseline - y))),
            "improvement": float(d.mean()), "ci": (float(np.percentile(boots, 2.5)), float(np.percentile(boots, 97.5)))}

def decide(result, min_improvement):
    if result["ci"][0] > min_improvement:
        return "ship"
    if result["improvement"] > min_improvement:
        return "inconclusive"
    return "reject"
`,
  solutionNote: 'Every statistic is learned from development rows only and applied unchanged to the test period; the decision uses the interval of the paired improvement, not just its point estimate.',
  checkSummary: 'The split keeps time order with no overlap; standardization uses training statistics only; the pipeline ships a model on data with real signal, returns "reject" when the features are noise, and "inconclusive" when the improvement is too uncertain.',
  checks: `
import numpy as np
_d, _t = time_split(100, 0.2)
assert len(_t) == 20 and _d.max() < _t.min() and len(set(_d) | set(_t)) == 100
_rng = np.random.default_rng(0)
_X = _rng.normal(size=(300, 3)); _y = 3 * _X[:, 0] - 2 * _X[:, 1] + _rng.normal(0, 1, 300) + 50
_m = fit_ridge(_X[:240] * [1, 100, 1], _y[:240])
assert np.allclose(_m["mu"], (_X[:240] * [1, 100, 1]).mean(axis=0)), "Statistics must come from training rows"
print("PASS: time split and training-only standardization")
def _run(X, y, seed=1):
    dev, test = time_split(len(y), 0.25)
    m = fit_ridge(X[dev], y[dev])
    return evaluate(y[test], predict(m, X[test]), np.full(len(test), y[dev].mean()), np.random.default_rng(seed))
_good = _run(_X, _y)
assert _good["mae"] < 0.5 * _good["baseline_mae"] and decide(_good, 0.5) == "ship", _good
_noise = _run(_rng.normal(size=(300, 3)), _rng.normal(50, 3, 300))
assert decide(_noise, 0.5) == "reject", _noise
_small = {"mae": 9.0, "baseline_mae": 10.0, "improvement": 1.0, "ci": (-0.5, 2.5)}
assert decide(_small, 0.5) == "inconclusive"
print(f"PASS: ship on signal (MAE {_good['mae']:.2f} vs {_good['baseline_mae']:.2f}), reject on noise, inconclusive when uncertain")
`,
  local: { filename: 'buildtime_app.py', note: 'The worked exemplar as a real application on your own machine (Python and NumPy): `python buildtime_app.py data` writes the bundled 60-day build log, `train` builds the evidence and writes artifact.json and model_card.md, `serve` answers POST requests on http://127.0.0.1:8033/v1/predict, `monitor new.csv` checks a new batch, and `check` runs all of it in a temporary folder and checks every step. Put your own log in builds.csv (same columns) to run the same pipeline on your data.', code: APP },
}
