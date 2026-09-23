export default {
  filename: 'monitoring.py', packages: ['numpy'],
  title: 'Drift statistics, alerts and a diagnosis.',
  intro: 'Implement the monitoring toolkit: PSI for numeric and categorical features, an alert rule with persistence, the no-change noise of PSI estimated by simulation, and a decision function that turns monitoring signals into a response.',
  steps: [
    '`psi(reference, current, bins=10)` — bin edges at the reference deciles (`np.quantile`), shares floored at 1e-4, sum of `(a − e)·ln(a/e)`.',
    '`psi_categorical(reference, current, categories)` — the same on category shares.',
    '`alert_days(series, threshold, persist)` → the indices on which a run of consecutive values above the threshold first reaches length `persist` — one alert per episode, a new one only after the metric recovers.',
    '`null_psi(reference, n, trials, rng)` → PSI values of `trials` samples of size n drawn **from the reference itself** — the no-change noise.',
    '`diagnose(input_psi, pred_psi, mae_ratio)` → "rollback" if both PSIs exceed 2.0; else "retrain" if `mae_ratio > 1.25`; else "investigate" if either PSI exceeds 0.25; else "ok". (`mae_ratio` may be `None` when labels have not arrived.)',
  ],
  hints: [
    ['Binning', '`edges = np.quantile(reference, np.linspace(0, 1, bins + 1)[1:-1])`; `np.searchsorted(edges, x, side="left")` gives each value\'s bin; `np.bincount(idx, minlength=bins) / len(x)`.'],
    ['Null distribution', 'Sample with `rng.choice(reference, size=n, replace=True)` and compute `psi(reference, sample)` each time.'],
  ],
  starter: `import numpy as np

def psi(reference, current, bins=10):
    raise NotImplementedError

def psi_categorical(reference, current, categories):
    raise NotImplementedError

def alert_days(series, threshold, persist=2):
    raise NotImplementedError

def null_psi(reference, n, trials, rng):
    raise NotImplementedError

def diagnose(input_psi, pred_psi, mae_ratio=None):
    raise NotImplementedError
`,
  solution: `import numpy as np

def _shares(idx, bins):
    return np.maximum(np.bincount(idx, minlength=bins) / len(idx), 1e-4)

def psi(reference, current, bins=10):
    edges = np.quantile(reference, np.linspace(0, 1, bins + 1)[1:-1])
    e = _shares(np.searchsorted(edges, reference, side="left"), bins)
    a = _shares(np.searchsorted(edges, current, side="left"), bins)
    return float(np.sum((a - e) * np.log(a / e)))

def psi_categorical(reference, current, categories):
    ref, cur = np.asarray(reference), np.asarray(current)
    e = np.maximum(np.array([np.mean(ref == c) for c in categories]), 1e-4)
    a = np.maximum(np.array([np.mean(cur == c) for c in categories]), 1e-4)
    return float(np.sum((a - e) * np.log(a / e)))

def alert_days(series, threshold, persist=2):
    days, run = [], 0
    for i, v in enumerate(series):
        run = run + 1 if v > threshold else 0
        if run == persist:
            days.append(i)
    return days

def null_psi(reference, n, trials, rng):
    return np.array([psi(reference, rng.choice(reference, size=n, replace=True)) for _ in range(trials)])

def diagnose(input_psi, pred_psi, mae_ratio=None):
    if input_psi > 2.0 and pred_psi > 2.0:
        return "rollback"
    if mae_ratio is not None and mae_ratio > 1.25:
        return "retrain"
    if input_psi > 0.25 or pred_psi > 0.25:
        return "investigate"
    return "ok"
`,
  solutionNote: 'The null distribution makes the threshold choice concrete: the PSI of fresh samples from an unchanged world is not zero, and it shrinks as the window grows.',
  checkSummary: 'PSI is near zero for the same distribution and large for a shifted one; the categorical PSI of (0.5, 0.5) → (0.7, 0.3) is 0.1695; alert days respect persistence; the no-change PSI is several times larger for windows of 80 than of 800 (so small windows need higher thresholds); and the diagnosis maps the four production scenarios to the right responses.',
  checks: `
import numpy as np
_rng = np.random.default_rng(0)
_ref = np.exp(_rng.normal(3.7, 0.9, 5000))
assert psi(_ref, np.exp(_rng.normal(3.7, 0.9, 5000))) < 0.02, "Same distribution: PSI near 0"
assert psi(_ref, np.exp(_rng.normal(4.4, 0.9, 5000))) > 0.25, "Shifted distribution: large PSI"
_cat = psi_categorical(["a"] * 50 + ["b"] * 50, ["a"] * 70 + ["b"] * 30, ["a", "b"])
assert abs(_cat - (0.2 * np.log(1.4) - 0.2 * np.log(0.6))) < 1e-9
assert psi_categorical(["a"] * 10, ["a"] * 9 + ["c"], ["a", "c"]) > 0.5, "A new category must register strongly"
print("PASS: numeric and categorical PSI")
assert alert_days([0.1, 0.3, 0.1, 0.3, 0.3, 0.3, 0.4, 0.1], 0.25, 2) == [4]
assert alert_days([0.3, 0.3, 0.3], 0.25, 1) == [0], "One alert per episode, not one per day"
assert alert_days([0.3, 0.1, 0.3], 0.25, 1) == [0, 2], "A new episode after recovery alerts again"
_small, _large = null_psi(_ref, 80, 200, np.random.default_rng(1)), null_psi(_ref, 800, 200, np.random.default_rng(2))
assert np.mean(_small) > 4 * np.mean(_large), f"No-change PSI should shrink with window size ({np.mean(_small):.3f} vs {np.mean(_large):.3f})"
print(f"PASS: persistence and PSI noise (mean no-change PSI {np.mean(_small):.3f} at n=80, {np.mean(_large):.3f} at n=800)")
assert diagnose(0.02, 0.03, 1.0) == "ok"
assert diagnose(0.6, 0.08, 1.0) == "investigate", "Covariate shift without error increase"
assert diagnose(0.02, 0.03, 1.4) == "retrain", "Concept drift: quiet inputs, higher error"
assert diagnose(8.0, 3.0, None) == "rollback", "Pipeline bug before labels arrive"
assert diagnose(0.6, 0.1, None) == "investigate"
print("PASS: diagnosis of the four production scenarios")
`,
}
