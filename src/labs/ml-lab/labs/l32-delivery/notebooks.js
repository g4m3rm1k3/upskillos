// Lab 32 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The build-duration world of Labs 29–30 with a new build cache (cache hits cost 0.05 of a miss instead of 0.25); models are least squares in NumPy.

export const extras = {
  'l32-triggers': {
    formulaTex: '$$\\text{gain} = 1 - \\frac{\\mathrm{MAE}_\\text{cand}}{\\mathrm{MAE}_\\text{prod}}$$',
    mathCode: {
      rows: [
        ['$\\mathrm{MAE}_\\text{prod}$', 'mae(production(holdout), holdout)', 'The model trained before the change, on recent data.'],
        ['$\\mathrm{MAE}_\\text{cand}$', 'mae(retrained(holdout), holdout)', 'The same code retrained on six days after the change.'],
        ['slice', 'mae(pred, holdout, m)', 'The same error on one group of builds.'],
      ],
    },
    notebook: {
      title: 'Lab 32.1 · When to retrain',
      intro: 'Retraining after a change helps overall and hurts two slices; a model that ages week by week.',
      cells: [
        {
          title: 'How fast a model ages',
          prose: 'The build world and a least-squares model, then a cache that improves every week. **Predict** the week-8 error of a model trained in week 0.',
          code: `import numpy as np
LANGS = ["go", "java", "python"]

def world(n, seed, cache_factor=0.25):
    """Build jobs. cache_factor is the cost of a cache hit relative to a miss: 0.25 before the new cache, 0.05 after."""
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, cache_factor, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return dict(size=size, files=files, cache=cache, shared=shared, busy=busy, java=(lang == "java").astype(int), python=(lang == "python").astype(int), y=duration)

def features(d, extra=False):
    cols = [np.log(d["size"]), d["size"] * d["shared"], d["size"] * (1 - d["cache"]), d["shared"] * d["busy"], d["files"], d["java"], d["python"]]
    if extra:                                              # interactions the new cache needs
        cols += [d["size"] * d["cache"], d["size"] * d["shared"] * (1 - d["cache"])]
    return np.column_stack(cols)

def fit(d, extra=False):
    X = features(d, extra); Z = np.column_stack([np.ones(len(X)), X])
    w = np.linalg.lstsq(Z, d["y"], rcond=None)[0]
    return lambda e: np.column_stack([np.ones(len(e["y"])), features(e, extra)]) @ w

mae = lambda pred, d, m=slice(None): float(np.mean(np.abs(pred[m] - d["y"][m])))
production = fit(world(2000, seed=1, cache_factor=0.25))       # trained before the change
recent = world(1800, seed=2, cache_factor=0.05)                # six days of traffic after it
holdout = world(600, seed=3, cache_factor=0.05)                # two later days

# How fast does a model age? The cache improves a little every week; the model trained in week 0 never changes.
model = fit(world(2000, seed=10, cache_factor=0.25))
for week in range(0, 9, 2):
    now = world(600, seed=20 + week, cache_factor=0.25 - 0.025 * week)
    print(f"week {week}: cache hits cost {0.25 - 0.025 * week:.2f} of a miss   MAE of the week-0 model {mae(model(now), now):.2f} s")`,
        },
        {
          title: 'Production against retrained',
          prose: '**Predict** whether every slice improves.',
          code: `retrained = fit(recent)
p, c = production(holdout), retrained(holdout)
print(f"holdout MAE: production {mae(p, holdout):.2f} s, retrained {mae(c, holdout):.2f} s ({1 - mae(c, holdout) / mae(p, holdout):.0%} lower)")
slices = {"shared runner": holdout["shared"] == 1, "dedicated runner": holdout["shared"] == 0,
          "cache hit": holdout["cache"] == 1, "cache miss": holdout["cache"] == 0}
for name, m in slices.items():
    print(f"  {name:17s} production {mae(p, holdout, m):5.1f} s   retrained {mae(c, holdout, m):5.1f} s")`,
        },
      ],
    },
  },
  'l32-gates': {
    formulaTex: '$$\\text{promote} \\iff g_1 \\wedge g_2 \\wedge \\dots \\wedge g_k$$',
    mathCode: {
      rows: [
        ['improvement', 'c <= (1 - min_improvement) * p', 'Better than production by a margin.'],
        ['slices', 'all(mae(cand, d, m) <= 1.1 * mae(prod, d, m) ...)', 'No slice more than 10% worse.'],
        ['contract', '0.5 <= np.median(c / p) <= 2', 'Same output unit.'],
        ['latency, sanity', 'latency_ms <= 25, c >= 0.6 * noise_floor', 'Fast enough; not too good to be true.'],
      ],
    },
    notebook: {
      title: 'Lab 32.2 · Promotion gates',
      intro: 'Four candidates through five gates. Each is blocked by a different one.',
      cells: [
        {
          title: 'The models',
          prose: 'As in 32.1.',
          code: `import numpy as np
LANGS = ["go", "java", "python"]

def world(n, seed, cache_factor=0.25):
    """Build jobs. cache_factor is the cost of a cache hit relative to a miss: 0.25 before the new cache, 0.05 after."""
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, cache_factor, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return dict(size=size, files=files, cache=cache, shared=shared, busy=busy, java=(lang == "java").astype(int), python=(lang == "python").astype(int), y=duration)

def features(d, extra=False):
    cols = [np.log(d["size"]), d["size"] * d["shared"], d["size"] * (1 - d["cache"]), d["shared"] * d["busy"], d["files"], d["java"], d["python"]]
    if extra:                                              # interactions the new cache needs
        cols += [d["size"] * d["cache"], d["size"] * d["shared"] * (1 - d["cache"])]
    return np.column_stack(cols)

def fit(d, extra=False):
    X = features(d, extra); Z = np.column_stack([np.ones(len(X)), X])
    w = np.linalg.lstsq(Z, d["y"], rcond=None)[0]
    return lambda e: np.column_stack([np.ones(len(e["y"])), features(e, extra)]) @ w

mae = lambda pred, d, m=slice(None): float(np.mean(np.abs(pred[m] - d["y"][m])))
production = fit(world(2000, seed=1, cache_factor=0.25))       # trained before the change
recent = world(1800, seed=2, cache_factor=0.05)                # six days of traffic after it
holdout = world(600, seed=3, cache_factor=0.05)                # two later days

retrained = fit(recent)
p, c = production(holdout), retrained(holdout)
print(f"holdout MAE: production {mae(p, holdout):.2f} s, retrained {mae(c, holdout):.2f} s ({1 - mae(c, holdout) / mae(p, holdout):.0%} lower)")
slices = {"shared runner": holdout["shared"] == 1, "dedicated runner": holdout["shared"] == 0,
          "cache hit": holdout["cache"] == 1, "cache miss": holdout["cache"] == 0}
for name, m in slices.items():
    print(f"  {name:17s} production {mae(p, holdout, m):5.1f} s   retrained {mae(c, holdout, m):5.1f} s")`,
        },
        {
          title: 'The gates',
          prose: '**Predict** which gate blocks each candidate.',
          code: `def gates(prod_pred, cand_pred, d, slices, golden_ratio, latency_ms, budget_ms=25, min_improvement=0.05, max_slice_regression=0.1, noise_floor=5.0):
    p, c = mae(prod_pred, d), mae(cand_pred, d)
    return {
        "improvement": c <= (1 - min_improvement) * p,
        "slices": all(mae(cand_pred, d, m) <= (1 + max_slice_regression) * mae(prod_pred, d, m) for m in slices.values()),
        "contract": 0.5 <= golden_ratio <= 2,
        "latency": latency_ms <= budget_ms,
        "sanity": c >= 0.6 * noise_floor,
    }

bigger = fit(recent, extra=True)
leak_recent = {**recent, "leak": np.round(recent["y"] / 10) * 10}          # a feature computed from the logged duration
Xl = np.column_stack([np.ones(len(recent["y"])), features(recent), leak_recent["leak"]])
wl = np.linalg.lstsq(Xl, recent["y"], rcond=None)[0]
leaky = lambda e: np.column_stack([np.ones(len(e["y"])), features(e), np.round(e["y"] / 10) * 10]) @ wl   # evaluated with the leak present

p = production(holdout)
candidates = {"retrained": (retrained(holdout), 9), "bigger": (bigger(holdout), 31),
              "minutes": (retrained(holdout) / 60, 9), "leaky": (leaky(holdout), 9)}
for name, (c, latency) in candidates.items():
    g = gates(p, c, holdout, slices, float(np.median(c / p)), latency)
    print(f"{name:9s} MAE {mae(c, holdout):6.2f} s  " + "  ".join(f"{k} {'✓' if v else '✗'}" for k, v in g.items()) + f"  -> {'PROMOTE' if all(g.values()) else 'blocked'}")`,
        },
      ],
    },
  },
  'l32-staged': {
    formulaTex: '$$\\frac{\\mathrm{MAE}_\\text{canary}}{\\mathrm{MAE}_\\text{control}} > 1 + \\tau \\ \\ (N \\text{ days})$$',
    mathCode: {
      rows: [
        ['share', 'schedule = (0.01, 0.05, 0.05, 0.25, ...)', 'Traffic sent to the candidate each day.'],
        ['$\\tau$', 'tol=0.1', 'How much worse the canary may look.'],
        ['$N$', 'persist=2', 'Consecutive bad days before rolling back.'],
        ['roll back', 'run == persist', 'All traffic returns to production.'],
      ],
    },
    notebook: {
      title: 'Lab 32.3 · Staged rollout and automatic rollback',
      intro: 'Three candidates through a canary schedule with a two-day rollback rule.',
      cells: [
        {
          title: 'The models',
          prose: 'As in 32.1.',
          code: `import numpy as np
LANGS = ["go", "java", "python"]

def world(n, seed, cache_factor=0.25):
    """Build jobs. cache_factor is the cost of a cache hit relative to a miss: 0.25 before the new cache, 0.05 after."""
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, cache_factor, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return dict(size=size, files=files, cache=cache, shared=shared, busy=busy, java=(lang == "java").astype(int), python=(lang == "python").astype(int), y=duration)

def features(d, extra=False):
    cols = [np.log(d["size"]), d["size"] * d["shared"], d["size"] * (1 - d["cache"]), d["shared"] * d["busy"], d["files"], d["java"], d["python"]]
    if extra:                                              # interactions the new cache needs
        cols += [d["size"] * d["cache"], d["size"] * d["shared"] * (1 - d["cache"])]
    return np.column_stack(cols)

def fit(d, extra=False):
    X = features(d, extra); Z = np.column_stack([np.ones(len(X)), X])
    w = np.linalg.lstsq(Z, d["y"], rcond=None)[0]
    return lambda e: np.column_stack([np.ones(len(e["y"])), features(e, extra)]) @ w

mae = lambda pred, d, m=slice(None): float(np.mean(np.abs(pred[m] - d["y"][m])))
production = fit(world(2000, seed=1, cache_factor=0.25))       # trained before the change
recent = world(1800, seed=2, cache_factor=0.05)                # six days of traffic after it
holdout = world(600, seed=3, cache_factor=0.05)                # two later days

retrained = fit(recent)
p, c = production(holdout), retrained(holdout)
print(f"holdout MAE: production {mae(p, holdout):.2f} s, retrained {mae(c, holdout):.2f} s ({1 - mae(c, holdout) / mae(p, holdout):.0%} lower)")
slices = {"shared runner": holdout["shared"] == 1, "dedicated runner": holdout["shared"] == 0,
          "cache hit": holdout["cache"] == 1, "cache miss": holdout["cache"] == 0}
for name, m in slices.items():
    print(f"  {name:17s} production {mae(p, holdout, m):5.1f} s   retrained {mae(c, holdout, m):5.1f} s")`,
        },
        {
          title: 'Canary with rollback',
          prose: '**Predict** on which day the minutes model rolls back.',
          code: `def canary(candidate, schedule=(0.01, 0.05, 0.05, 0.25, 0.25, 0.5, 1.0), tol=0.1, persist=2, jobs_per_day=300, seed=40):
    """Each day a share of traffic goes to the candidate; roll back after persist consecutive bad days."""
    run = 0
    for day, share in enumerate(schedule, start=1):
        today = world(jobs_per_day, seed=seed + day, cache_factor=0.05)
        n = max(3, round(share * jobs_per_day))
        canary_rows, control_rows = {k: v[:n] for k, v in today.items()}, {k: v[n:] for k, v in today.items()}
        c = mae(candidate(canary_rows), canary_rows)
        p = mae(production(control_rows), control_rows) if len(control_rows["y"]) else mae(production(canary_rows), canary_rows)
        run = run + 1 if c > (1 + tol) * p else 0
        print(f"  day {day}: {share:4.0%} of traffic ({n:3d} jobs)  canary {c:6.1f} s  control {p:5.1f} s  {'bad' if c > (1 + tol) * p else 'ok'}")
        if run == persist:
            return f"rolled back at the end of day {day}; at most {max(schedule[:day]):.0%} of traffic saw the candidate"
    return "rollout complete"

bugged = lambda e: retrained({**e, "size": np.exp(np.log10(e["size"]))})      # serving rewrote log(size) as log10(size)
for name, model in [("retrained", retrained), ("log10 serving bug", bugged), ("minutes", lambda e: retrained(e) / 60)]:
    print(name); print("  ->", canary(model))`,
        },
      ],
    },
  },
  'l32-ci': {
    formulaTex: '$$\\text{contract} \\to (M{+}1).0.0,\\quad \\text{model} \\to M.(m{+}1).0$$',
    mathCode: {
      rows: [
        ['contract', 'f"{major + 1}.0.0"', 'Breaking change: output unit or required fields.'],
        ['model', 'f"{major}.{minor + 1}.0"', 'New model, same contract.'],
        ['packaging', 'f"{major}.{minor}.{patch + 1}"', 'Same predictions.'],
        ['artifact', 'json.dumps(artifact)', 'Everything a reviewer or on-call engineer needs, in one place.'],
      ],
    },
    notebook: {
      title: 'Lab 32.4 · Continuous integration and release artifacts',
      intro: 'Version bumps from the kind of change, and a release manifest.',
      cells: [
        {
          title: 'Versions and the release artifact',
          prose: '**Predict** the version of a retrained model after 1.4.0.',
          code: `import numpy as np
LANGS = ["go", "java", "python"]

def world(n, seed, cache_factor=0.25):
    """Build jobs. cache_factor is the cost of a cache hit relative to a miss: 0.25 before the new cache, 0.05 after."""
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, cache_factor, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return dict(size=size, files=files, cache=cache, shared=shared, busy=busy, java=(lang == "java").astype(int), python=(lang == "python").astype(int), y=duration)

def features(d, extra=False):
    cols = [np.log(d["size"]), d["size"] * d["shared"], d["size"] * (1 - d["cache"]), d["shared"] * d["busy"], d["files"], d["java"], d["python"]]
    if extra:                                              # interactions the new cache needs
        cols += [d["size"] * d["cache"], d["size"] * d["shared"] * (1 - d["cache"])]
    return np.column_stack(cols)

def fit(d, extra=False):
    X = features(d, extra); Z = np.column_stack([np.ones(len(X)), X])
    w = np.linalg.lstsq(Z, d["y"], rcond=None)[0]
    return lambda e: np.column_stack([np.ones(len(e["y"])), features(e, extra)]) @ w

mae = lambda pred, d, m=slice(None): float(np.mean(np.abs(pred[m] - d["y"][m])))
production = fit(world(2000, seed=1, cache_factor=0.25))       # trained before the change
recent = world(1800, seed=2, cache_factor=0.05)                # six days of traffic after it
holdout = world(600, seed=3, cache_factor=0.05)                # two later days

import hashlib, json

def bump(version, change):
    major, minor, patch = map(int, version.split("."))
    if change == "contract":  return f"{major + 1}.0.0"          # output unit or required fields changed
    if change == "model":     return f"{major}.{minor + 1}.0"    # new model, same contract
    if change == "packaging": return f"{major}.{minor}.{patch + 1}"
    raise ValueError(change)

for change in ["model", "contract", "packaging"]:
    print(f"1.4.0 + {change:9s} -> {bump('1.4.0', change)}")

weights = np.linalg.lstsq(np.column_stack([np.ones(len(recent["y"])), features(recent, extra=True)]), recent["y"], rcond=None)[0]
artifact = {
    "version": bump("1.4.0", "model"),
    "weights_sha256": hashlib.sha256(np.round(weights, 10).tobytes()).hexdigest()[:16],
    "input_schema": ["size_mb", "files", "cache_hit", "runner", "language", "hour"],
    "output": {"name": "predicted_duration_s", "unit": "seconds"},
    "data_version": "jobs-2026-09-17..2026-09-22", "code_version": "git:3f9c2a1",
    "gates": {"improvement": True, "slices": True, "contract": True, "latency": "approved exception: 31 ms > 25 ms"},
    "model_card": "cards/build-duration-1.5.0.md", "rollback_target": "1.4.0",
}
print(json.dumps(artifact, indent=2))`,
        },
      ],
    },
  },
  'l32-loops': {
    formulaTex: '$$n_\\text{holdout} = 0.05 \\times n_\\text{decisions}$$',
    mathCode: {
      rows: [
        ['policy', 'retrained(day_jobs) > 60', 'Builds predicted long go to dedicated runners.'],
        ['holdout', 'rng.random(20000) < 0.05', 'Decisions the model does not influence.'],
        ['kept', 'routed_shared & long_pred', 'Long builds that still appear on shared runners in the next training data.'],
      ],
    },
    notebook: {
      title: 'Lab 32.5 · Feedback loops and safe iteration',
      intro: 'A routing policy that erases the data it would need, and a random holdout that keeps some.',
      cells: [
        {
          title: 'The models',
          prose: 'As in 32.1.',
          code: `import numpy as np
LANGS = ["go", "java", "python"]

def world(n, seed, cache_factor=0.25):
    """Build jobs. cache_factor is the cost of a cache hit relative to a miss: 0.25 before the new cache, 0.05 after."""
    rng = np.random.default_rng(seed)
    size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
    cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
    lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
    work = np.where(cache == 1, cache_factor, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
    duration = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
    return dict(size=size, files=files, cache=cache, shared=shared, busy=busy, java=(lang == "java").astype(int), python=(lang == "python").astype(int), y=duration)

def features(d, extra=False):
    cols = [np.log(d["size"]), d["size"] * d["shared"], d["size"] * (1 - d["cache"]), d["shared"] * d["busy"], d["files"], d["java"], d["python"]]
    if extra:                                              # interactions the new cache needs
        cols += [d["size"] * d["cache"], d["size"] * d["shared"] * (1 - d["cache"])]
    return np.column_stack(cols)

def fit(d, extra=False):
    X = features(d, extra); Z = np.column_stack([np.ones(len(X)), X])
    w = np.linalg.lstsq(Z, d["y"], rcond=None)[0]
    return lambda e: np.column_stack([np.ones(len(e["y"])), features(e, extra)]) @ w

mae = lambda pred, d, m=slice(None): float(np.mean(np.abs(pred[m] - d["y"][m])))
production = fit(world(2000, seed=1, cache_factor=0.25))       # trained before the change
recent = world(1800, seed=2, cache_factor=0.05)                # six days of traffic after it
holdout = world(600, seed=3, cache_factor=0.05)                # two later days

retrained = fit(recent)
p, c = production(holdout), retrained(holdout)
print(f"holdout MAE: production {mae(p, holdout):.2f} s, retrained {mae(c, holdout):.2f} s ({1 - mae(c, holdout) / mae(p, holdout):.0%} lower)")
slices = {"shared runner": holdout["shared"] == 1, "dedicated runner": holdout["shared"] == 0,
          "cache hit": holdout["cache"] == 1, "cache miss": holdout["cache"] == 0}
for name, m in slices.items():
    print(f"  {name:17s} production {mae(p, holdout, m):5.1f} s   retrained {mae(c, holdout, m):5.1f} s")`,
        },
        {
          title: 'A feedback loop',
          prose: '**Predict** how many long builds on shared runners remain in tomorrow’s data under the policy alone.',
          code: `# A routing policy: builds predicted to take over 60 s go to dedicated runners. Retraining only on what the policy produced
# leaves almost no long builds on shared runners in the data. A 5% random holdout keeps some.
rng = np.random.default_rng(5)
day_jobs = world(20000, seed=50, cache_factor=0.05)
long_pred = retrained(day_jobs) > 60
holdout_mask = rng.random(20000) < 0.05                      # decisions the model does not influence
for label, keep_random in [("policy only", np.zeros(20000, bool)), ("with a 5% random holdout", holdout_mask)]:
    routed_shared = np.where(keep_random, rng.integers(0, 2, 20000) == 1, ~long_pred & (day_jobs["shared"] == 1))
    kept = routed_shared & long_pred                          # long builds that still ran on shared runners
    print(f"{label:25s}: long builds on shared runners in tomorrow's data: {kept.sum():4d}")
print(f"decisions per day made without the model: {holdout_mask.sum()}  (5% of 20,000 = 1,000 expected)")`,
        },
      ],
    },
  },
}
