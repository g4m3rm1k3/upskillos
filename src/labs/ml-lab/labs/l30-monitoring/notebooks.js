// Lab 30 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The model is the build-duration model of Lab 29 (same features, least squares in NumPy); the drift scenarios change one thing about the world at a time.

export const extras = {
  'l30-tests': {
    formulaTex: '$$\\text{CI} = \\text{unit} + \\text{data} + \\text{model tests}$$',
    mathCode: {
      rows: [
        ['unit', 'features(job)[:4] == [log 10, 10, 10, 1]', 'A deterministic piece against a hand-computed answer.'],
        ['data', 'size_mb > 0 and 0 <= hour <= 23', 'The contract, on every fresh batch.'],
        ['model', 'MAE < 12; invariance; direction', 'Behaviour: a minimum accuracy, an ignored field changes nothing, a bigger build is never faster.'],
      ],
    },
    notebook: {
      title: 'Lab 30.1 · Tests for ML systems',
      intro: 'Five tests of three kinds on the build-duration model.',
      cells: [
        {
          title: 'Unit, data and model tests',
          prose: '**Predict** which test is most likely to fail after a retrain on new data.',
          code: `import json, numpy as np
LANGS = ["go", "java", "python"]
def make_jobs(n, seed):
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return [dict(size_mb=float(round(s, 1)), files=int(f), cache_hit=int(c), runner="shared" if sh else "dedicated", language=str(l), hour=int(h), duration_s=float(d))
            for s, f, c, sh, l, h, d in zip(size, files, cache, shared, lang, hour, duration)]

def features(job):
    """The one feature implementation, used by training AND by serving."""
    shared = 1 if job["runner"] == "shared" else 0
    busy = 1 if 9 <= job["hour"] <= 17 else 0
    return [np.log(job["size_mb"]), job["size_mb"] * shared, job["size_mb"] * (1 - job["cache_hit"]), shared * busy,
            job["files"], 1 if job["language"] == "java" else 0, 1 if job["language"] == "python" else 0]

def train_artifact(seed=16):
    jobs = make_jobs(500, seed)
    X = np.array([features(j) for j in jobs]); y = np.array([j["duration_s"] for j in jobs])
    mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = np.column_stack([np.ones(len(X)), (X - mu) / sd])
    w = np.linalg.lstsq(Z, y, rcond=None)[0]
    return {"version": "build-duration-2026-09-23.1", "mu": mu.tolist(), "sd": sd.tolist(), "b": float(w[0]), "w": w[1:].tolist()}

def predict(artifact, job):
    x = (np.array(features(job)) - artifact["mu"]) / np.array(artifact["sd"])
    return float(artifact["b"] + x @ np.array(artifact["w"]))

artifact = train_artifact()
results = []
def check(name, ok):
    results.append(ok); print(("PASS " if ok else "FAIL ") + name)

# Unit test: a feature on a hand-made input with a known answer.
job = dict(size_mb=10.0, files=30, cache_hit=0, runner="shared", language="java", hour=10)
check("features: log size, size x shared, size x miss, shared x busy", np.allclose(features(job)[:4], [np.log(10), 10, 10, 1]))
# Data test: the contract on a fresh batch.
batch = make_jobs(200, seed=3)
check("data: every size is positive and every hour in 0..23", all(j["size_mb"] > 0 and 0 <= j["hour"] <= 23 for j in batch))
# Model test: a minimum accuracy on a fixed evaluation set.
mae = np.mean([abs(predict(artifact, j) - j["duration_s"]) for j in batch])
check(f"model: MAE {mae:.1f} s is below 12 s", mae < 12)
# Invariance: an id the model should ignore changes nothing.
check("invariance: adding a job id changes nothing", predict(artifact, {**job, "job_id": 42}) == predict(artifact, job))
# Direction: doubling a build's size should not make it faster.
faster = sum(predict(artifact, {**j, "size_mb": 2 * j["size_mb"]}) < predict(artifact, j) for j in batch)
check(f"direction: doubling size never lowers the prediction ({faster} of {len(batch)} violate)", faster == 0)
print(f"{sum(results)}/{len(results)} tests pass")`,
        },
      ],
    },
  },
  'l30-drift': {
    formulaTex: '$$\\mathrm{PSI} = \\sum_i (a_i - e_i)\\,\\ln\\frac{a_i}{e_i}$$',
    mathCode: {
      rows: [
        ['$e_i$', 'share(reference)[i]', 'Share of reference values in bin i (bins at the reference deciles).'],
        ['$a_i$', 'share(current)[i]', 'Share of current values in the same bin.'],
        ['floor', 'np.maximum(share, 1e-4)', 'Keeps an empty bin from giving ln 0.'],
        ['PSI', 'np.sum((a - e) * np.log(a / e))', 'Every term is ≥ 0: a and e differ in the same direction as ln(a/e).'],
      ],
    },
    notebook: {
      title: 'Lab 30.2 · Measuring drift',
      intro: 'PSI by hand, then its noise when nothing has changed.',
      cells: [
        {
          title: 'PSI',
          prose: '**Predict** the PSI of (0.5, 0.5) → (0.7, 0.3).',
          code: `import numpy as np
def psi(expected_share, actual_share):
    e, a = np.maximum(expected_share, 1e-4), np.maximum(actual_share, 1e-4)
    return float(np.sum((a - e) * np.log(a / e)))
print("the lesson's example (0.5, 0.5) -> (0.7, 0.3):", round(psi(np.array([0.5, 0.5]), np.array([0.7, 0.3])), 4))

def psi_samples(reference, current, bins=10):
    """Bin by the reference's deciles; compare the shares."""
    edges = np.quantile(reference, np.linspace(0, 1, bins + 1)[1:-1])
    share = lambda x: np.bincount(np.searchsorted(edges, x, side="left").astype(np.intp), minlength=bins) / len(x)
    return psi(share(reference), share(current))
rng = np.random.default_rng(0)
reference = rng.normal(size=3000)
print("a shift of half a standard deviation, 400 values:", round(psi_samples(reference, rng.normal(0.5, 1, 400)), 3))`,
        },
        {
          title: 'No-change noise',
          prose: '**Predict** the median PSI of 80 fresh values that come from the reference distribution itself.',
          code: `for n in (80, 400):
    quiet = np.array([psi_samples(reference, rng.normal(size=n)) for _ in range(500)])     # nothing changed
    print(f"{n:3d} values per day, nothing changed: median PSI {np.median(quiet):.3f}, 99th percentile {np.percentile(quiet, 99):.3f}, days above 0.1: {np.mean(quiet > 0.1):.0%}")`,
        },
      ],
    },
  },
  'l30-labels': {
    formulaTex: '$$t_\\text{alert} = t_\\text{change} + (N - 1) + d$$',
    mathCode: {
      rows: [
        ['$d$', 'delay', 'Days until a prediction\'s true value is known.'],
        ['$N$', 'persist', 'Consecutive bad days the alert needs.'],
        ['known', 'today - delay', 'The latest day whose error can be measured today.'],
      ],
    },
    notebook: {
      title: 'Lab 30.3 · Delayed labels and proven performance loss',
      intro: 'Input drift that does no harm, harm that no input monitor sees — and how long the labels take to tell.',
      cells: [
        {
          title: 'Covariate shift against concept drift',
          prose: '**Predict** which scenario moves the runner PSI and which moves the error.',
          code: `import json, numpy as np
LANGS = ["go", "java", "python"]
def make_jobs(n, seed):
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return [dict(size_mb=float(round(s, 1)), files=int(f), cache_hit=int(c), runner="shared" if sh else "dedicated", language=str(l), hour=int(h), duration_s=float(d))
            for s, f, c, sh, l, h, d in zip(size, files, cache, shared, lang, hour, duration)]

def features(job):
    """The one feature implementation, used by training AND by serving."""
    shared = 1 if job["runner"] == "shared" else 0
    busy = 1 if 9 <= job["hour"] <= 17 else 0
    return [np.log(job["size_mb"]), job["size_mb"] * shared, job["size_mb"] * (1 - job["cache_hit"]), shared * busy,
            job["files"], 1 if job["language"] == "java" else 0, 1 if job["language"] == "python" else 0]

def train_artifact(seed=16):
    jobs = make_jobs(500, seed)
    X = np.array([features(j) for j in jobs]); y = np.array([j["duration_s"] for j in jobs])
    mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = np.column_stack([np.ones(len(X)), (X - mu) / sd])
    w = np.linalg.lstsq(Z, y, rcond=None)[0]
    return {"version": "build-duration-2026-09-23.1", "mu": mu.tolist(), "sd": sd.tolist(), "b": float(w[0]), "w": w[1:].tolist()}

def predict(artifact, job):
    x = (np.array(features(job)) - artifact["mu"]) / np.array(artifact["sd"])
    return float(artifact["b"] + x @ np.array(artifact["w"]))

import numpy as np
def psi(expected_share, actual_share):
    e, a = np.maximum(expected_share, 1e-4), np.maximum(actual_share, 1e-4)
    return float(np.sum((a - e) * np.log(a / e)))

def world(n, seed, p_shared=0.5, cache_factor=0.25):
    """Jobs from a world whose runner mix (covariate) or cache speed (concept) may have changed."""
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), (rng.random(n) < p_shared).astype(int); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, cache_factor, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return [dict(size_mb=float(s), files=int(f), cache_hit=int(c), runner="shared" if sh else "dedicated", language=str(l), hour=int(h), duration_s=float(d))
            for s, f, c, sh, l, h, d in zip(size, files, cache, shared, lang, hour, duration)]

def share_shared(jobs):
    s = np.mean([j["runner"] == "shared" for j in jobs]); return np.array([s, 1 - s])

artifact = train_artifact()
reference = world(2000, seed=1)
for name, jobs in [("nothing changed", world(2000, 2)),
                   ("covariate shift: 85% shared runners", world(2000, 3, p_shared=0.85)),
                   ("concept drift: cache hits 5x cheaper", world(2000, 4, cache_factor=0.05))]:
    runner_psi = psi(share_shared(reference), share_shared(jobs))
    mae = np.mean([abs(predict(artifact, j) - j["duration_s"]) for j in jobs])
    print(f"{name:37s} runner PSI {runner_psi:.3f}   MAE {mae:5.1f} s")`,
        },
        {
          title: 'When can the error alert fire?',
          prose: '**Predict** the day for labels 7 days late.',
          code: `import numpy as np
rng = np.random.default_rng(4)
days, start = 60, 25
mae = np.where(np.arange(days) < start, 8.8, 12.3) + rng.normal(0, 0.4, days)     # error jumps on day 25
threshold, persist = 10.0, 2
for delay in (0, 7, 20):
    run = 0
    for today in range(days):
        known = today - delay                         # the latest day whose labels have arrived
        if known < 0:
            continue
        run = run + 1 if mae[known] > threshold else 0
        if run == persist:
            print(f"labels {delay:2d} days late: the error alert fires on day {today}"); break`,
        },
      ],
    },
  },
  'l30-alerts': {
    formulaTex: '$$\\text{alert on day } t \\iff s_{t-N+1},\\dots,s_t > \\tau$$',
    mathCode: {
      rows: [
        ['$\\tau$', 'np.percentile(quiet, 99)', 'Threshold from a quiet period.'],
        ['$N$', 'persist', 'Consecutive windows above the threshold.'],
        ['guard', 'low <= prediction <= high', 'A hard limit on every prediction.'],
      ],
    },
    notebook: {
      title: 'Lab 30.4 · Alerts that people trust',
      intro: 'A threshold from a quiet year, the false alarms at each persistence, and a guard.',
      cells: [
        {
          title: 'Threshold, persistence and a guard',
          prose: '**Predict** how many false alarms a 99th-percentile threshold gives in a year with persistence 1.',
          code: `import numpy as np
rng = np.random.default_rng(1)
quiet = rng.gamma(4, 0.006, 365)                      # a year of daily PSI with nothing wrong (median about 0.02)
threshold = np.percentile(quiet, 99)
def alert_days(series, threshold, persist):
    days, run = [], 0
    for d, v in enumerate(series):
        run = run + 1 if v > threshold else 0
        if run == persist: days.append(d)
    return days
print(f"threshold at the 99th percentile of the quiet year: {threshold:.3f}")
for persist in (1, 2, 3):
    print(f"persistence {persist}: {len(alert_days(quiet, threshold, persist))} false alarms in a year")

def guard(prediction, low=1, high=24 * 3600):
    """A hard limit on every prediction: outside it, return the fallback instead."""
    return prediction if low <= prediction <= high else None
print("guard:", [guard(p) for p in (75.0, 34826.0 * 3, -4.0)])

# The lesson's question: persistence 3, the metric above the threshold every day from day 40 on.
above = np.arange(60) >= 40
print("persistence 3, change on day 40: alert on day", alert_days(above.astype(float), 0.5, 3))`,
        },
      ],
    },
  },
  'l30-respond': {
    formulaTex: '$$\\text{bug} \\to \\text{roll back},\\quad \\text{concept drift} \\to \\text{retrain}$$',
    mathCode: {
      rows: [
        ['bug', 'guard_violations or (input_drift and prediction_jump)', 'Roll back or block the feed now.'],
        ['concept drift', 'error_up', 'Retrain on recent data; validate on the latest period.'],
        ['covariate shift', 'input_drift', 'Keep serving; watch the slices.'],
      ],
    },
    notebook: {
      title: 'Lab 30.5 · Responding: investigate, retrain or roll back',
      intro: 'The evidence of each scenario, turned into a response.',
      cells: [
        {
          title: 'Evidence to response',
          prose: '**Predict** the response to the bug scenario.',
          code: `def respond(input_drift, prediction_jump, error_up, guard_violations):
    if guard_violations or (input_drift and prediction_jump):
        return "pipeline bug: roll back or block the feed now; fix upstream"
    if error_up:
        return "concept drift: retrain on recent data, validate on the latest period, compare before promoting"
    if input_drift:
        return "covariate shift: keep serving, watch the slices, collect data where the inputs moved"
    return "no action"
for scenario, evidence in [("bug", (True, True, True, True)), ("concept", (False, False, True, False)),
                           ("covariate", (True, False, False, False)), ("quiet", (False, False, False, False))]:
    print(f"{scenario:9s} -> {respond(*evidence)}")
versions = ["2026-09-02", "2026-09-09", "2026-09-16", "2026-09-23"]
kept = versions[-3:]
print("artifacts kept:", kept, " -> the oldest reachable is", len(kept), "weeks back from the next deploy")`,
        },
      ],
    },
  },
}
