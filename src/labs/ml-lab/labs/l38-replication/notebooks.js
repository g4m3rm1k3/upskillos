// Lab 38 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// A replication harness for the playground's fictional paper, run on scikit-learn's two-moons data with the same method, baseline
// and training settings. The data generator differs from the playground's, so its numbers are its own; the findings are compared.

export const extras = {
  'l38-read': {
    formulaTex: '$$\\text{claim} \\to \\text{evidence} \\to \\text{experiment} \\to \\text{cost}$$',
    mathCode: {
      rows: [
        ['claims', 'claims = {claim: [(experiment, runs)]}', 'Each claim with the experiments that would test it.'],
        ['reach / cost', 'reach[e] / costs[e]', 'How many claims an experiment can change, per training run.'],
        ['budget', 'budget = 100', 'Stop buying when it is spent; report the rest as not tested.'],
      ],
    },
    notebook: {
      title: 'Lab 38.1 · Reading a paper for testable claims',
      intro: 'The paper’s claims as data, their experiments and costs, and a budget spent where it can change the conclusion.',
      cells: [
        {
          title: 'Claims, experiments and a budget',
          prose: '**Predict** which experiment does not fit in the 100-run budget.',
          code: `# The fictional paper's claims, the experiment that tests each, and its cost in training runs.
claims = {
    "93.4% accuracy with 40 training points":      [("reproduce", 2), ("fresh seeds", 20)],
    "beats logistic regression by 8.6 points":     [("fresh seeds", 20)],
    "the gain comes from JitterMix":               [("ablation", 40), ("tuned baseline", 32)],
    "robust to label noise":                       [("label noise", 20)],
}
costs = {e: c for tests in claims.values() for e, c in tests}
print("experiments and costs:", costs, f"— total {sum(costs.values())} runs")
# How many claims could each experiment change? Buy the most decisive per run first, within 100 runs.
reach = {e: sum(e in [x for x, _ in tests] for tests in claims.values()) for e in costs}
budget, bought = 100, []
for e in sorted(costs, key=lambda e: (-reach[e] / costs[e], costs[e])):
    if sum(costs[b] for b in bought) + costs[e] <= budget:
        bought.append(e)
print("bought:", bought, f"({sum(costs[b] for b in bought)} runs)")
print("left untested:", [e for e in costs if e not in bought], "-> report the claims that needed it as 'not tested'")`,
        },
      ],
    },
  },
  'l38-seeds': {
    formulaTex: '$$\\bar d \\pm t_{0.975,\\,n-1}\\,\\frac{s_d}{\\sqrt n}, \\qquad d_i = a_i - b_i$$',
    mathCode: {
      rows: [
        ['$d_i$', 'A - B', 'Per-seed difference: both methods trained on the same data.'],
        ['$s_d$', 'd.std(ddof=1)', 'Spread of the paired differences.'],
        ['$t_{0.975,9}$', '2.262', 'The 95% t value for 10 seeds.'],
        ['bootstrap', 'rng.choice(d, size=(5000, len(d))).mean(axis=1)', 'Resampled means of the differences.'],
      ],
    },
    notebook: {
      title: 'Lab 38.2 · Seeds, variance and paired comparisons',
      intro: 'How much the seed alone moves the gain, then a paired comparison on ten fresh seeds.',
      cells: [
        {
          title: 'The harness and twenty seeds',
          prose: 'The method, baseline and training run; then the gain on seeds 0–19. **Predict** how the best seed compares with the average.',
          code: `import numpy as np
from sklearn.datasets import make_moons

X_TEST, Y_TEST = make_moons(1500, noise=0.3, random_state=9999)       # one fixed test set
BASELINE = dict(features="raw", augment=False, lam=0.0)
METHOD = dict(features="cubic", augment=True, lam=0.01)               # the fictional paper's method: cubic features + "JitterMix" + weight decay

def expand(X, features):
    if features == "raw":
        return X
    a, b = X[:, 0], X[:, 1]
    return np.column_stack([a, b, a * a, a * b, b * b, a ** 3, a * a * b, a * b * b, b ** 3])

def train_eval(config, seed, n_train=40, label_noise=0.0):
    """One training run: 40 points drawn by the seed, logistic regression by gradient descent, test accuracy."""
    rng = np.random.default_rng(5000 + seed)
    X, y = make_moons(n_train, noise=0.3, random_state=1 + seed)
    flip = rng.random(n_train) < label_noise; y = np.where(flip, 1 - y, y)
    if config["augment"]:                                             # JitterMix: 4 jittered copies of every point
        X = np.vstack([X] + [X + 0.15 * rng.normal(size=X.shape) for _ in range(4)]); y = np.tile(y, 5)
    Z = expand(X, config["features"]); mu, sd = Z.mean(axis=0), Z.std(axis=0); Z = (Z - mu) / sd
    w, b = 0.01 * rng.normal(size=Z.shape[1]), 0.0
    for _ in range(300):
        e = 1 / (1 + np.exp(-(Z @ w + b))) - y
        w -= 0.5 * (Z.T @ e / len(y) + config["lam"] * w); b -= 0.5 * e.mean()
    p = 1 / (1 + np.exp(-(((expand(X_TEST, config["features"]) - mu) / sd) @ w + b)))
    return float(np.mean((p >= 0.5) == Y_TEST))

def paired_interval(a, b, t=2.262):
    d = np.asarray(a) - np.asarray(b)
    half = t * d.std(ddof=1) / np.sqrt(len(d))
    return d.mean(), d.mean() - half, d.mean() + half

gains = [train_eval(METHOD, s) - train_eval(BASELINE, s) for s in range(20)]
best = int(np.argmax(gains))
print("gain on seeds 0-19:", " ".join(f"{g * 100:.1f}" for g in gains))
print(f"most favourable seed {best}: {gains[best] * 100:.1f} points; mean over all 20: {np.mean(gains) * 100:.1f}")`,
        },
        {
          title: 'Ten fresh seeds, paired',
          prose: '**Predict** whether the paired interval is narrower than the unpaired one.',
          code: `seeds = range(10, 20)                                       # fresh seeds, fixed in advance
A = np.array([train_eval(METHOD, s) for s in seeds]); B = np.array([train_eval(BASELINE, s) for s in seeds])
print(f"method   {A.mean() * 100:.1f}% (sd {A.std(ddof=1) * 100:.1f});  baseline {B.mean() * 100:.1f}% (sd {B.std(ddof=1) * 100:.1f})")
m, lo, hi = paired_interval(A, B)
print(f"paired:   gain {m * 100:.1f} points, 95% interval [{lo * 100:.1f}, {hi * 100:.1f}]")
se_unpaired = np.sqrt(A.var(ddof=1) / 10 + B.var(ddof=1) / 10)
print(f"unpaired: gain {m * 100:.1f} points, 95% interval [{(m - 2.101 * se_unpaired) * 100:.1f}, {(m + 2.101 * se_unpaired) * 100:.1f}]  (t = 2.101 for 18 df)")
rng = np.random.default_rng(0); d = A - B
boot = rng.choice(d, size=(5000, len(d))).mean(axis=1)
print(f"bootstrap interval for the paired gain: [{np.percentile(boot, 2.5) * 100:.1f}, {np.percentile(boot, 97.5) * 100:.1f}]")`,
        },
      ],
    },
  },
  'l38-ablation': {
    formulaTex: '$$\\Delta_c = \\mathrm{acc}(\\text{full}) - \\mathrm{acc}(\\text{full without } c)$$',
    mathCode: {
      rows: [
        ['$\\Delta_c$', 'paired_interval(full, without)', 'Contribution of component c, paired over the same seeds.'],
        ['tuned baseline', 'grid = [0, 0.001, 0.01, 0.1]; seeds 101-103', 'λ tuned on seeds the comparison never uses.'],
      ],
    },
    notebook: {
      title: 'Lab 38.3 · Ablations and fair baselines',
      intro: 'Remove one component at a time, then give the baseline the same ingredients and a fair tuning budget.',
      cells: [
        {
          title: 'The harness and the fresh seeds',
          prose: 'As in 38.2.',
          code: `import numpy as np
from sklearn.datasets import make_moons

X_TEST, Y_TEST = make_moons(1500, noise=0.3, random_state=9999)       # one fixed test set
BASELINE = dict(features="raw", augment=False, lam=0.0)
METHOD = dict(features="cubic", augment=True, lam=0.01)               # the fictional paper's method: cubic features + "JitterMix" + weight decay

def expand(X, features):
    if features == "raw":
        return X
    a, b = X[:, 0], X[:, 1]
    return np.column_stack([a, b, a * a, a * b, b * b, a ** 3, a * a * b, a * b * b, b ** 3])

def train_eval(config, seed, n_train=40, label_noise=0.0):
    """One training run: 40 points drawn by the seed, logistic regression by gradient descent, test accuracy."""
    rng = np.random.default_rng(5000 + seed)
    X, y = make_moons(n_train, noise=0.3, random_state=1 + seed)
    flip = rng.random(n_train) < label_noise; y = np.where(flip, 1 - y, y)
    if config["augment"]:                                             # JitterMix: 4 jittered copies of every point
        X = np.vstack([X] + [X + 0.15 * rng.normal(size=X.shape) for _ in range(4)]); y = np.tile(y, 5)
    Z = expand(X, config["features"]); mu, sd = Z.mean(axis=0), Z.std(axis=0); Z = (Z - mu) / sd
    w, b = 0.01 * rng.normal(size=Z.shape[1]), 0.0
    for _ in range(300):
        e = 1 / (1 + np.exp(-(Z @ w + b))) - y
        w -= 0.5 * (Z.T @ e / len(y) + config["lam"] * w); b -= 0.5 * e.mean()
    p = 1 / (1 + np.exp(-(((expand(X_TEST, config["features"]) - mu) / sd) @ w + b)))
    return float(np.mean((p >= 0.5) == Y_TEST))

def paired_interval(a, b, t=2.262):
    d = np.asarray(a) - np.asarray(b)
    half = t * d.std(ddof=1) / np.sqrt(len(d))
    return d.mean(), d.mean() - half, d.mean() + half

seeds = range(10, 20)                                       # fresh seeds, fixed in advance
A = np.array([train_eval(METHOD, s) for s in seeds]); B = np.array([train_eval(BASELINE, s) for s in seeds])
print(f"method   {A.mean() * 100:.1f}% (sd {A.std(ddof=1) * 100:.1f});  baseline {B.mean() * 100:.1f}% (sd {B.std(ddof=1) * 100:.1f})")
m, lo, hi = paired_interval(A, B)
print(f"paired:   gain {m * 100:.1f} points, 95% interval [{lo * 100:.1f}, {hi * 100:.1f}]")
se_unpaired = np.sqrt(A.var(ddof=1) / 10 + B.var(ddof=1) / 10)
print(f"unpaired: gain {m * 100:.1f} points, 95% interval [{(m - 2.101 * se_unpaired) * 100:.1f}, {(m + 2.101 * se_unpaired) * 100:.1f}]  (t = 2.101 for 18 df)")
rng = np.random.default_rng(0); d = A - B
boot = rng.choice(d, size=(5000, len(d))).mean(axis=1)
print(f"bootstrap interval for the paired gain: [{np.percentile(boot, 2.5) * 100:.1f}, {np.percentile(boot, 97.5) * 100:.1f}]")`,
        },
        {
          title: 'Ablation and a tuned baseline',
          prose: '**Predict** which component carries the gain.',
          code: `print("ablation (full method minus the method without one component, paired over the same 10 seeds):")
full = np.array([train_eval(METHOD, s) for s in seeds])
for name, off in [("JitterMix", {"augment": False}), ("cubic features", {"features": "raw"}), ("weight decay", {"lam": 0.0})]:
    without = np.array([train_eval({**METHOD, **off}, s) for s in seeds])
    m, lo, hi = paired_interval(full, without)
    print(f"  {name:15s} contributes {m * 100:+.1f} points [{lo * 100:+.1f}, {hi * 100:+.1f}]")

# A fair baseline: the same cubic features, lambda tuned on separate seeds (never the comparison seeds).
grid = [0.0, 0.001, 0.01, 0.1]
tune = [np.mean([train_eval(dict(features="cubic", augment=False, lam=l), s) for s in (101, 102, 103)]) for l in grid]
lam = grid[int(np.argmax(tune))]
tuned = np.array([train_eval(dict(features="cubic", augment=False, lam=lam), s) for s in seeds])
m, lo, hi = paired_interval(full, tuned)
print(f"\\ntuned cubic baseline (lambda {lam}): {tuned.mean() * 100:.1f}%; method minus tuned baseline {m * 100:+.1f} [{lo * 100:+.1f}, {hi * 100:+.1f}]")`,
        },
      ],
    },
  },
  'l38-report': {
    formulaTex: '$$\\text{verdict} = f(\\text{low},\\ \\text{high},\\ \\text{claimed})$$',
    mathCode: {
      rows: [
        ['not supported', 'low <= 0', 'The interval includes no effect.'],
        ['replicated', 'low <= claimed <= high', 'The claimed size is inside the interval.'],
        ['partially', 'otherwise', 'Real in direction, different in size.'],
      ],
    },
    notebook: {
      title: 'Lab 38.4 · Reporting a replication — and choosing deeper work',
      intro: 'The robustness claim tested, verdicts from intervals, and a report with its deviations.',
      cells: [
        {
          title: 'The harness and the fresh seeds',
          prose: 'As in 38.2.',
          code: `import numpy as np
from sklearn.datasets import make_moons

X_TEST, Y_TEST = make_moons(1500, noise=0.3, random_state=9999)       # one fixed test set
BASELINE = dict(features="raw", augment=False, lam=0.0)
METHOD = dict(features="cubic", augment=True, lam=0.01)               # the fictional paper's method: cubic features + "JitterMix" + weight decay

def expand(X, features):
    if features == "raw":
        return X
    a, b = X[:, 0], X[:, 1]
    return np.column_stack([a, b, a * a, a * b, b * b, a ** 3, a * a * b, a * b * b, b ** 3])

def train_eval(config, seed, n_train=40, label_noise=0.0):
    """One training run: 40 points drawn by the seed, logistic regression by gradient descent, test accuracy."""
    rng = np.random.default_rng(5000 + seed)
    X, y = make_moons(n_train, noise=0.3, random_state=1 + seed)
    flip = rng.random(n_train) < label_noise; y = np.where(flip, 1 - y, y)
    if config["augment"]:                                             # JitterMix: 4 jittered copies of every point
        X = np.vstack([X] + [X + 0.15 * rng.normal(size=X.shape) for _ in range(4)]); y = np.tile(y, 5)
    Z = expand(X, config["features"]); mu, sd = Z.mean(axis=0), Z.std(axis=0); Z = (Z - mu) / sd
    w, b = 0.01 * rng.normal(size=Z.shape[1]), 0.0
    for _ in range(300):
        e = 1 / (1 + np.exp(-(Z @ w + b))) - y
        w -= 0.5 * (Z.T @ e / len(y) + config["lam"] * w); b -= 0.5 * e.mean()
    p = 1 / (1 + np.exp(-(((expand(X_TEST, config["features"]) - mu) / sd) @ w + b)))
    return float(np.mean((p >= 0.5) == Y_TEST))

def paired_interval(a, b, t=2.262):
    d = np.asarray(a) - np.asarray(b)
    half = t * d.std(ddof=1) / np.sqrt(len(d))
    return d.mean(), d.mean() - half, d.mean() + half

seeds = range(10, 20)                                       # fresh seeds, fixed in advance
A = np.array([train_eval(METHOD, s) for s in seeds]); B = np.array([train_eval(BASELINE, s) for s in seeds])
print(f"method   {A.mean() * 100:.1f}% (sd {A.std(ddof=1) * 100:.1f});  baseline {B.mean() * 100:.1f}% (sd {B.std(ddof=1) * 100:.1f})")
m, lo, hi = paired_interval(A, B)
print(f"paired:   gain {m * 100:.1f} points, 95% interval [{lo * 100:.1f}, {hi * 100:.1f}]")
se_unpaired = np.sqrt(A.var(ddof=1) / 10 + B.var(ddof=1) / 10)
print(f"unpaired: gain {m * 100:.1f} points, 95% interval [{(m - 2.101 * se_unpaired) * 100:.1f}, {(m + 2.101 * se_unpaired) * 100:.1f}]  (t = 2.101 for 18 df)")
rng = np.random.default_rng(0); d = A - B
boot = rng.choice(d, size=(5000, len(d))).mean(axis=1)
print(f"bootstrap interval for the paired gain: [{np.percentile(boot, 2.5) * 100:.1f}, {np.percentile(boot, 97.5) * 100:.1f}]")`,
        },
        {
          title: 'Robustness, verdicts and the report',
          prose: '**Predict** the verdict for “robust to label noise”.',
          code: `def verdict(claimed, mean, low, high):
    if low <= 0:
        return "not supported"
    return "replicated" if low <= claimed <= high else "partially replicated"

noisy_A = np.array([train_eval(METHOD, s, label_noise=0.2) for s in seeds])
noisy_B = np.array([train_eval(BASELINE, s, label_noise=0.2) for s in seeds])
m, lo, hi = paired_interval(noisy_A, noisy_B)
print(f"20% flipped labels: method {noisy_A.mean() * 100:.1f}% (sd {noisy_A.std(ddof=1) * 100:.1f}, range {noisy_A.min() * 100:.1f}-{noisy_A.max() * 100:.1f}); gain {m * 100:+.1f} [{lo * 100:+.1f}, {hi * 100:+.1f}]")

g = paired_interval(A, B)
report = f"""# Replication report (harness on scikit-learn two-moons; its numbers are its own)
Claim: beats logistic regression by 8.6 points -> {verdict(0.086, *g)} (gain {g[0] * 100:.1f} [{g[1] * 100:.1f}, {g[2] * 100:.1f}] on seeds 10-19)
Claim: robust to label noise -> {verdict(0.0001, m, lo, hi)} with 20% flipped labels (gain {m * 100:+.1f} [{lo * 100:+.1f}, {hi * 100:+.1f}])
Deviations: data from scikit-learn's make_moons (the paper's generator is unknown); 300 gradient steps and learning rate 0.5 guessed."""
print("\\n" + report)`,
        },
      ],
    },
  },
}
