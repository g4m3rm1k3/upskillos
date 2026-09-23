export default {
  filename: 'release_pipeline.py', packages: ['numpy'],
  title: 'Promotion gates, canary rollback and versioning.',
  intro: 'Implement the release logic that decides whether a candidate model ships: evidence-based promotion gates, an automatic canary rollback rule with persistence, and semantic version bumps driven by the kind of change.',
  steps: [
    '`promotion_gates(prod_err, cand_err, slice_ids, golden_prod, golden_cand, latency_ms, budget_ms, min_improvement=0.05, max_slice_regression=0.1)` → dict of named booleans (`improvement`, `slices`, `contract`, `latency`) plus `"promote"`. Errors are absolute errors on the same holdout rows; `slice_ids` labels each row; the contract gate requires the median of `golden_cand / golden_prod` in [0.5, 2].',
    '`canary_rollback(control_mae, canary_mae, tol=0.1, persist=2)` → the (0-based) day on which rollback fires, or `None` if the rollout completes.',
    '`bump(version, change)` → next version string for `change` in `"contract"` (major), `"model"` (minor), `"packaging"` (patch).',
  ],
  hints: [
    ['Slices', 'For each unique slice id s: `cand_err[slice_ids == s].mean() <= (1 + max_slice_regression) * prod_err[slice_ids == s].mean()`.'],
    ['Versions', '`major, minor, patch = map(int, version.split("."))`; a major bump resets minor and patch to 0; a minor bump resets patch.'],
  ],
  starter: `import numpy as np

def promotion_gates(prod_err, cand_err, slice_ids, golden_prod, golden_cand, latency_ms, budget_ms,
                    min_improvement=0.05, max_slice_regression=0.1):
    raise NotImplementedError

def canary_rollback(control_mae, canary_mae, tol=0.1, persist=2):
    raise NotImplementedError

def bump(version, change):
    raise NotImplementedError
`,
  solution: `import numpy as np

def promotion_gates(prod_err, cand_err, slice_ids, golden_prod, golden_cand, latency_ms, budget_ms,
                    min_improvement=0.05, max_slice_regression=0.1):
    prod_err, cand_err, slice_ids = map(np.asarray, (prod_err, cand_err, slice_ids))
    gates = {
        "improvement": cand_err.mean() <= (1 - min_improvement) * prod_err.mean(),
        "slices": all(cand_err[slice_ids == s].mean() <= (1 + max_slice_regression) * prod_err[slice_ids == s].mean()
                      for s in np.unique(slice_ids)),
        "contract": 0.5 <= float(np.median(np.asarray(golden_cand) / np.asarray(golden_prod))) <= 2,
        "latency": latency_ms <= budget_ms,
    }
    gates = {k: bool(v) for k, v in gates.items()}
    gates["promote"] = all(gates.values())
    return gates

def canary_rollback(control_mae, canary_mae, tol=0.1, persist=2):
    run = 0
    for day, (c, k) in enumerate(zip(control_mae, canary_mae)):
        run = run + 1 if k > (1 + tol) * c else 0
        if run >= persist:
            return day
    return None

def bump(version, change):
    major, minor, patch = map(int, version.split("."))
    if change == "contract":
        return f"{major + 1}.0.0"
    if change == "model":
        return f"{major}.{minor + 1}.0"
    if change == "packaging":
        return f"{major}.{minor}.{patch + 1}"
    raise ValueError(f"Unknown change type: {change}")
`,
  solutionNote: 'Each gate compares candidate and production on the same rows, so shared noise cancels. The rollback rule needs consecutive bad days, which tolerates one noisy small-canary day but still stops a genuinely bad model within `persist` days.',
  checkSummary: 'A candidate that is better overall and on every slice promotes; one that hides a slice regression, changes units, or exceeds the latency budget is blocked by exactly the right gate; the canary rule ignores a single noisy day, rolls back on consecutive bad days, and returns None for a healthy rollout; version bumps follow semantic versioning.',
  checks: `
import numpy as np
_rng = np.random.default_rng(0)
_slices = np.repeat(["shared", "dedicated"], 200)
_prod = np.abs(_rng.normal(0, 12, 400))
_good = _prod * 0.7
_gp = np.full(60, 100.0)
_g = promotion_gates(_prod, _good, _slices, _gp, _gp * 0.95, 9, 25)
assert _g == {"improvement": True, "slices": True, "contract": True, "latency": True, "promote": True}, _g
_hidden = np.where(_slices == "shared", _prod * 0.3, _prod * 1.3)
_h = promotion_gates(_prod, _hidden, _slices, _gp, _gp, 9, 25)
assert _h["improvement"] and not _h["slices"] and not _h["promote"], "A slice regression must block even when overall error improves"
assert not promotion_gates(_prod, _good, _slices, _gp, _gp / 60, 9, 25)["contract"], "A unit change must fail the contract gate"
assert not promotion_gates(_prod, _good, _slices, _gp, _gp, 31, 25)["latency"]
print("PASS: promotion gates block exactly the right failures")
assert canary_rollback([10, 10, 10, 10], [10.5, 14, 10.2, 10.1]) is None, "One noisy day must not roll back"
assert canary_rollback([10, 10, 10, 10], [10, 14, 15, 10]) == 2
assert canary_rollback([10, 10, 10], [30, 40, 50], persist=1) == 0
print("PASS: canary rollback with persistence")
assert bump("1.4.0", "model") == "1.5.0" and bump("1.4.2", "contract") == "2.0.0" and bump("1.4.2", "packaging") == "1.4.3"
try:
    bump("1.0.0", "vibes"); raise AssertionError("Unknown change types must raise")
except ValueError:
    pass
print("PASS: semantic versioning")
`,
}
