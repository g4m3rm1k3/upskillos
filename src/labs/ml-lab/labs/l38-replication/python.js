export default {
  filename: 'replicate.py', packages: ['numpy'],
  title: 'A replication harness: seeds, paired intervals, ablations and verdicts.',
  intro: 'Write the reusable pieces of a replication: run a configuration over many seeds, compare two configurations on the same seeds with a paired interval (t-based and bootstrap), ablate components one at a time, and turn evidence into a verdict. The checks plug in a small logistic-regression experiment like the playground\'s.',
  steps: [
    '`run_seeds(train_eval, config, seeds)` → numpy array of `train_eval(config, seed)` for each seed.',
    '`paired_interval(a, b, t=2.262)` → `(mean, low, high)` of the differences `a − b`, using `t × sd(ddof=1)/√n` (2.262 is the 95% t value for 10 seeds).',
    '`bootstrap_interval(diffs, reps=5000, seed=0)` → 2.5th and 97.5th percentiles of resampled means.',
    '`ablation(train_eval, config, off, seeds)` → dict: for each key in `off`, the `paired_interval` of full config minus the config with that key set to its "off" value.',
    '`verdict(claimed, mean, low, high)` → `"not supported"` if `low <= 0`; `"replicated"` if `low <= claimed <= high`; otherwise `"partially replicated"`.',
  ],
  hints: [
    ['Same seeds, both arms', 'Pairing works because seed s gives both configurations the same training data. Always call both with the same seed list.'],
    ['Resampling', '`rng.choice(diffs, size=(reps, len(diffs)), replace=True).mean(axis=1)` then `np.percentile(..., [2.5, 97.5])`.'],
  ],
  starter: `import numpy as np

def run_seeds(train_eval, config, seeds):
    raise NotImplementedError

def paired_interval(a, b, t=2.262):
    raise NotImplementedError

def bootstrap_interval(diffs, reps=5000, seed=0):
    raise NotImplementedError

def ablation(train_eval, config, off, seeds):
    raise NotImplementedError

def verdict(claimed, mean, low, high):
    raise NotImplementedError
`,
  solution: `import numpy as np

def run_seeds(train_eval, config, seeds):
    return np.array([train_eval(config, s) for s in seeds])

def paired_interval(a, b, t=2.262):
    d = np.asarray(a) - np.asarray(b)
    m, half = d.mean(), t * d.std(ddof=1) / np.sqrt(len(d))
    return float(m), float(m - half), float(m + half)

def bootstrap_interval(diffs, reps=5000, seed=0):
    rng = np.random.default_rng(seed)
    means = rng.choice(np.asarray(diffs), size=(reps, len(diffs)), replace=True).mean(axis=1)
    lo, hi = np.percentile(means, [2.5, 97.5])
    return float(lo), float(hi)

def ablation(train_eval, config, off, seeds):
    full = run_seeds(train_eval, config, seeds)
    return {k: paired_interval(full, run_seeds(train_eval, {**config, k: v}, seeds)) for k, v in off.items()}

def verdict(claimed, mean, low, high):
    if low <= 0:
        return "not supported"
    if low <= claimed <= high:
        return "replicated"
    return "partially replicated"
`,
  solutionNote: 'The harness never looks at which result you hoped for: the same seeds, the same interval and the same verdict rule apply to every claim.',
  checkSummary: 'Paired intervals and bootstrap on hand data; verdict rules; and on a real small experiment, cubic features matter while jitter augmentation does not, the single-seed claim overstates the gain, and the verdicts come out as partial and not supported.',
  checks: `
import numpy as np
m, lo, hi = paired_interval([0.9, 0.8, 0.85, 0.95], [0.8, 0.8, 0.8, 0.8], t=3.182)
d = np.array([0.1, 0.0, 0.05, 0.15])
assert abs(m - d.mean()) < 1e-12 and abs(hi - m - 3.182 * d.std(ddof=1) / 2) < 1e-12
blo, bhi = bootstrap_interval(np.array([0.02, 0.03, 0.05, 0.01, 0.04, 0.03, 0.02, 0.06, 0.03, 0.04]))
assert 0.02 < blo < 0.03 < bhi < 0.045
assert verdict(0.086, 0.034, 0.024, 0.045) == "partially replicated"
assert verdict(0.03, 0.034, 0.024, 0.045) == "replicated"
assert verdict(0.05, 0.0, -0.003, 0.004) == "not supported"
print("PASS: intervals and verdict rules")
def moons(n, rng, noise=0.3):
    y = (rng.random(n) < 0.5).astype(int); t = np.pi * rng.random(n)
    x1 = np.where(y == 1, 1 - np.cos(t) - 0.5, np.cos(t) - 0.5) * 1.5
    x2 = np.where(y == 1, 0.35 - np.sin(t), np.sin(t) - 0.15) * 1.5
    return np.column_stack([x1, x2]) + noise * rng.normal(size=(n, 2)), y
Xte, yte = moons(1500, np.random.default_rng(9999))
def feats(X, kind):
    if kind == "raw":
        return X
    a, b = X[:, 0], X[:, 1]
    return np.column_stack([a, b, a * a, a * b, b * b, a ** 3, a * a * b, a * b * b, b ** 3])
def train_eval(cfg, seed):
    rng = np.random.default_rng(seed)
    X, y = moons(40, rng)
    if cfg["augment"]:
        X = np.vstack([X] + [X + 0.15 * rng.normal(size=X.shape) for _ in range(4)]); y = np.tile(y, 5)
    F = feats(X, cfg["features"]); mu, sd = F.mean(0), F.std(0) + 1e-12
    Z = (F - mu) / sd; w = np.zeros(Z.shape[1]); b = 0.0
    for _ in range(300):
        p = 1 / (1 + np.exp(-(Z @ w + b)))
        w -= 0.5 * (Z.T @ (p - y) / len(y) + cfg["lam"] * w); b -= 0.5 * np.mean(p - y)
    pt = (feats(Xte, cfg["features"]) - mu) / sd @ w + b > 0
    return float(np.mean(pt == yte))
method = {"features": "cubic", "augment": True, "lam": 0.01}
baseline = {"features": "raw", "augment": False, "lam": 0.0}
seeds = list(range(10, 20))
gain = paired_interval(run_seeds(train_eval, method, seeds), run_seeds(train_eval, baseline, seeds))
abl = ablation(train_eval, method, {"augment": False, "features": "raw"}, seeds)
print("gain over baseline", np.round(gain, 3), "| ablation", {k: np.round(v, 3) for k, v in abl.items()})
assert gain[1] > 0 and gain[0] < 0.086, "Real but smaller than the single-seed claim of 8.6 points"
assert abl["features"][1] > 0, "Cubic features carry the gain"
assert abl["augment"][1] <= 0 and abs(abl["augment"][0]) < 0.01, "Augmentation adds no detectable gain"
assert verdict(0.086, *gain) == "partially replicated" and verdict(0.086, *abl["augment"]) == "not supported"
print("PASS: the harness separates what replicated from what did not")
`,
}
