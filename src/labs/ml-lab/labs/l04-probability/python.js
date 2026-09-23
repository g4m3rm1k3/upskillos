export default {
  filename: 'probability_by_simulation.py', packages: ['numpy'],
  title: 'Compute it exactly. Then prove it by simulation.',
  intro: 'Write exact probability calculations and a vectorized, seeded simulation that must agree with them. The checks compare the two routes using standard errors — the same way you should check your own work.',
  steps: [
    '`expectation(values, probs)` and `variance(values, probs)` for a discrete distribution.',
    '`posterior(prior, sensitivity, false_alarm)` → P(fault | alarm) by Bayes’ rule.',
    '`simulate_alarms(n, prior, sensitivity, false_alarm, rng)` → a dict with integer counts `tp`, `fn`, `fp`, `tn`. Draw each machine\'s fault state, then its alarm, using arrays (no Python loop over machines).',
    '`estimate_posterior(counts)` → `tp / (tp + fp)`, or `float("nan")` when there were no alarms.',
    '`standard_error(p, n)` → `sqrt(p (1 − p) / n)`.',
  ],
  hints: [
    ['Vectorized draws', '`fault = rng.random(n) < prior` gives a boolean array. The alarm probability differs per machine: `p_alarm = np.where(fault, sensitivity, false_alarm)`, then `alarm = rng.random(n) < p_alarm`.'],
    ['Counting booleans', '`int(np.sum(fault & alarm))` counts true positives. Use `~` for "not": `fault & ~alarm` are misses.'],
    ['Variance', 'Compute the mean first, then `np.sum(probs * (values - mean) ** 2)`.'],
  ],
  starter: `import numpy as np

def expectation(values, probs):
    raise NotImplementedError

def variance(values, probs):
    raise NotImplementedError

def posterior(prior, sensitivity, false_alarm):
    raise NotImplementedError

def simulate_alarms(n, prior, sensitivity, false_alarm, rng):
    # Return {"tp": ..., "fn": ..., "fp": ..., "tn": ...}
    raise NotImplementedError

def estimate_posterior(counts):
    raise NotImplementedError

def standard_error(p, n):
    raise NotImplementedError
`,
  solution: `import numpy as np

def expectation(values, probs):
    return float(np.sum(np.asarray(values) * np.asarray(probs)))

def variance(values, probs):
    values, probs = np.asarray(values, dtype=float), np.asarray(probs, dtype=float)
    mean = np.sum(values * probs)
    return float(np.sum(probs * (values - mean) ** 2))

def posterior(prior, sensitivity, false_alarm):
    alarm = sensitivity * prior + false_alarm * (1 - prior)
    return sensitivity * prior / alarm

def simulate_alarms(n, prior, sensitivity, false_alarm, rng):
    fault = rng.random(n) < prior
    p_alarm = np.where(fault, sensitivity, false_alarm)
    alarm = rng.random(n) < p_alarm
    return {"tp": int(np.sum(fault & alarm)), "fn": int(np.sum(fault & ~alarm)),
            "fp": int(np.sum(~fault & alarm)), "tn": int(np.sum(~fault & ~alarm))}

def estimate_posterior(counts):
    alarms = counts["tp"] + counts["fp"]
    return counts["tp"] / alarms if alarms else float("nan")

def standard_error(p, n):
    return float(np.sqrt(p * (1 - p) / n))
`,
  solutionNote: 'The simulation draws the true state first and the alarm second, with an alarm probability that depends on the state — the same order as the story. Conditioning happens by dividing by alarms, not by machines.',
  checkSummary: 'Dice expectation and variance; Bayes’ rule on known values; simulated counts that sum to n with the right types; seeded reproducibility; agreement of the simulated and exact posteriors within four standard errors (computed from the number of alarms); edge cases with no faults and no alarms.',
  checks: `
import numpy as np
_v = np.arange(1, 7); _p = np.full(6, 1 / 6)
assert abs(expectation(_v, _p) - 3.5) < 1e-12, "E[die] should be 3.5"
assert abs(variance(_v, _p) - 35 / 12) < 1e-12, "Var[die] should be 35/12"
assert abs(posterior(0.01, 0.9, 0.05) - 0.009 / 0.0585) < 1e-12, "Bayes' rule mismatch"
assert abs(posterior(0.5, 0.8, 0.8) - 0.5) < 1e-12, "An uninformative test must leave the prior unchanged"
print("PASS: exact expectation, variance and posterior")
_c = simulate_alarms(50_000, 0.05, 0.9, 0.1, np.random.default_rng(3))
assert set(_c) == {"tp", "fn", "fp", "tn"}, "Counts need keys tp, fn, fp, tn"
assert all(isinstance(v, int) for v in _c.values()), "Counts must be Python ints"
assert sum(_c.values()) == 50_000, "Every machine must be counted exactly once"
assert _c == simulate_alarms(50_000, 0.05, 0.9, 0.1, np.random.default_rng(3)), "Same seed must reproduce the counts"
_exact = posterior(0.05, 0.9, 0.1)
_est = estimate_posterior(_c)
_se = standard_error(_exact, _c["tp"] + _c["fp"])
assert abs(_est - _exact) < 4 * _se, f"Simulated {_est:.4f} vs exact {_exact:.4f}: more than 4 standard errors apart"
_faulty = _c["tp"] + _c["fn"]
assert abs(_c["tp"] / _faulty - 0.9) < 4 * standard_error(0.9, _faulty), "Sensitivity is not being applied to faulty machines"
print(f"PASS: simulation agrees with Bayes' rule ({_est:.4f} vs {_exact:.4f}, SE {_se:.4f})")
_z = simulate_alarms(1000, 0.0, 0.9, 0.0, np.random.default_rng(1))
assert _z["tp"] == 0 and _z["fp"] == 0, "No faults and no false alarms means no alarms"
assert np.isnan(estimate_posterior(_z)), "No alarms: the estimate must be nan"
assert abs(standard_error(0.5, 100) - 0.05) < 1e-12
print("PASS: edge cases and standard error")
`,
}
