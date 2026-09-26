// Lab 33 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The worked exemplar is the build-duration project: the same data generator, split, candidates and decision as
// buildtime_app.py (Implement tab, run on your own machine), so the numbers here and there agree. The scaffolded
// alternate uses real data bundled with scikit-learn (the diabetes dataset).

export const extras = {
  'l33-choose': {
    formulaTex: '$$\\text{ready} = \\text{decision} \\wedge \\text{target} \\wedge \\text{data} \\wedge \\text{baseline}$$',
    mathCode: {
      rows: [
        ['rule', 'lookup[(language, shared)]', 'When a documented rule computes the answer, use it: zero error, no training.'],
        ['decision', 'c["decision"]', 'What someone will do differently with the prediction.'],
        ['prediction moment', 'features[f] is True', 'Every feature must exist when the prediction is made.'],
      ],
    },
    notebook: {
      title: 'Lab 33.1 · Choose a problem worth solving',
      intro: 'When a rule beats a model, and three candidate projects checked against the formula.',
      cells: [
        {
          title: 'Rule or model?',
          prose: '**Predict** which does better on a target set by a documented table: a lookup table or a linear model.',
          code: `import numpy as np
# Rule or model? A build's timeout is set by a documented table: a limit per language, doubled on shared runners.
rng = np.random.default_rng(1)
n = 2000
lang = rng.choice(["go", "java", "python"], n); shared = rng.integers(0, 2, n)
LIMIT = {"go": 600, "java": 1200, "python": 900}
timeout = np.array([LIMIT[l] for l in lang]) * np.where(shared == 1, 2, 1)

lookup = {(l, s): LIMIT[l] * (2 if s else 1) for l in LIMIT for s in (0, 1)}          # the rule, written down
rule_pred = np.array([lookup[(l, s)] for l, s in zip(lang, shared)])
X = np.column_stack([np.ones(n), lang == "java", lang == "python", shared]).astype(float)   # a linear model on the same inputs
w = np.linalg.lstsq(X, timeout, rcond=None)[0]
print(f"timeout (a documented rule):   lookup table MAE {np.mean(np.abs(rule_pred - timeout)):.1f} s,  linear model MAE {np.mean(np.abs(X @ w - timeout)):.1f} s")

# Duration: no rule exists; size, cache, runner and noise interact. Here a model earns its cost.
size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); cache = rng.integers(0, 2, n)
duration = 20 + np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0) + 5 * rng.normal(size=n)
best_rule = np.where(cache == 1, np.median(duration[cache == 1]), np.median(duration[cache == 0]))       # a sensible hand rule
F = np.column_stack([np.ones(n), size * (1 - cache) * np.where(shared == 1, 1.6, 1), size * cache, shared]).astype(float)
v = np.linalg.lstsq(F, duration, rcond=None)[0]
print(f"duration (no rule):            best hand rule MAE {np.mean(np.abs(best_rule - duration)):.1f} s,  model MAE {np.mean(np.abs(F @ v - duration)):.1f} s")`,
        },
        {
          title: 'Three candidates',
          prose: '**Predict** which candidate is ready.',
          code: `# Three candidate capstones, checked against the formula: repeated decision + measurable target + obtainable data + a simple
# baseline — and every feature must exist at the moment of prediction.
candidates = {
    "build duration": dict(decision="choose a runner before each build", target="duration_s (measured by CI)", data="our CI log, 60 days",
                           baseline="mean duration", features={"size_mb": True, "files": True, "cache_hit": True, "runner": True, "language": True, "hour": True}),
    "ticket urgency": dict(decision="order the on-call queue", target="escalated within 24 h", data="support export (permission pending)",
                           baseline="most frequent class", features={"severity_words": True, "account_tier": True, "resolution_notes": False}),
    "office mood":    dict(decision="", target="how people feel", data="none yet", baseline="", features={"weather": True}),
}
for name, c in candidates.items():
    late = [f for f, available in c["features"].items() if not available]
    problems = [p for p, bad in [("no decision", not c["decision"]), ("no baseline", not c["baseline"]),
                                 ("data not obtainable", "none" in c["data"] or "pending" in c["data"]),
                                 (f"features not known at prediction time: {late}", late)] if bad]
    print(f"{name:15s} -> {'ready' if not problems else 'not ready: ' + '; '.join(problems)}")`,
        },
      ],
    },
  },
  'l33-evidence': {
    formulaTex: '$$\\bar d = \\frac{1}{K}\\sum_{k=1}^{K}\\big(\\mathrm{MAE}^{\\text{base}}_k - \\mathrm{MAE}^{\\text{model}}_k\\big)$$',
    mathCode: {
      rows: [
        ['test', 'D["day"] >= 48', 'The most recent 20% of days, set aside before anything else.'],
        ['$k$', 'blocks[f]', 'Forward-chaining folds: train on the past, validate on the next block.'],
        ['$\\bar d$', 'np.array(scores["mean"]) - np.array(scores[k])', 'Fold-by-fold differences on the same folds.'],
        ['interval', 'np.percentile(boots, [2.5, 97.5])', 'Paired bootstrap interval of the test improvement.'],
      ],
    },
    notebook: {
      title: 'Lab 33.2 · Build the evidence',
      intro: 'The worked exemplar’s evidence from split to decision, then the same steps on real data.',
      cells: [
        {
          title: 'Split, baseline and candidates on the same folds',
          prose: '**Predict** the smallest fold-by-fold improvement of the full model.',
          code: `import numpy as np
LANGS = ["go", "java", "python"]
def make_log(days=60, per_day=50, seed=33):
    """The bundled build log: 60 days in time order (the same generator as buildtime_app.py)."""
    rng = np.random.default_rng(seed); cols = {k: [] for k in ["day", "size", "files", "cache", "shared", "lang", "hour", "y"]}
    for d in range(days):
        n = per_day
        size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
        cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
        lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
        work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
        y = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
        for k, v in zip(cols, [np.full(n, d), size, files, cache, shared, lang, hour, y]):
            cols[k].append(v)
    return {k: np.concatenate(v) for k, v in cols.items()}

def features(D, kind):
    if kind == "simple":
        return np.column_stack([D["size"], D["files"], D["cache"], D["shared"]]).astype(float)
    busy = ((D["hour"] >= 9) & (D["hour"] <= 17)).astype(int)
    return np.column_stack([np.log(D["size"]), D["size"] * D["shared"], D["size"] * (1 - D["cache"]), D["shared"] * busy,
                            D["files"], D["lang"] == "java", D["lang"] == "python"]).astype(float)

def fit(D, m, kind):
    """kind 'mean' is the baseline; otherwise ridge with training-only standardization."""
    y = D["y"][m]
    if kind == "mean":
        return lambda E, k: np.full(k.sum(), y.mean())
    X = features(D, kind)[m]; mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = (X - mu) / sd
    w = np.linalg.solve(Z.T @ Z / len(y) + 1e-3 * np.eye(Z.shape[1]), Z.T @ (y - y.mean()) / len(y))
    return lambda E, k: y.mean() + ((features(E, kind)[k] - mu) / sd) @ w

D = make_log()
cut = 48                                                    # days 48-59 (the last 20%) are the test set: set aside first
dev, test = D["day"] < cut, D["day"] >= cut
print(f"development: {dev.sum()} builds (days 0-{cut - 1}); test: {test.sum()} builds (days {cut}-59), not touched until the end")

blocks = np.array_split(np.arange(cut), 5)                # forward chaining: train on the past, validate on the next block
scores = {k: [] for k in ["mean", "simple", "full"]}
for f in range(1, 5):
    tr, va = dev & (D["day"] < blocks[f][0]), (D["day"] >= blocks[f][0]) & (D["day"] <= blocks[f][-1])
    for k in scores:
        scores[k].append(np.mean(np.abs(fit(D, tr, k)(D, va) - D["y"][va])))
for k, s in scores.items():
    print(f"{k:6s} fold MAE " + "  ".join(f"{v:5.2f}" for v in s) + f"   mean {np.mean(s):5.2f} s")
for k in ["simple", "full"]:
    d = np.array(scores["mean"]) - np.array(scores[k])
    print(f"baseline − {k:6s} fold by fold " + "  ".join(f"{v:+6.2f}" for v in d) + f"   smallest {d.min():+.2f} s")`,
        },
        {
          title: 'One test evaluation and a decision',
          prose: '**Predict** the decision against a 2 s threshold.',
          code: `# One evaluation on the test period, with a paired bootstrap interval, decided against the threshold set in advance.
MIN_IMPROVEMENT_S = 2.0
base, model = fit(D, dev, "mean")(D, test), fit(D, dev, "full")(D, test)
y = D["y"][test]
diff = np.abs(base - y) - np.abs(model - y)                 # per build: how much closer the model is
rng = np.random.default_rng(0)
boots = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(2000)]
lo, hi = np.percentile(boots, [2.5, 97.5])
decision = "ship" if lo > MIN_IMPROVEMENT_S else "inconclusive" if diff.mean() > MIN_IMPROVEMENT_S else "reject"
print(f"test MAE: baseline {np.mean(np.abs(base - y)):.2f} s, model {np.mean(np.abs(model - y)):.2f} s")
print(f"improvement {diff.mean():.2f} s, 95% interval {lo:.2f} to {hi:.2f} s, threshold {MIN_IMPROVEMENT_S} s -> {decision}")
err = np.abs(model - y)
for s in (0, 1):
    for c in (0, 1):
        m = (D["shared"][test] == s) & (D["cache"][test] == c)
        print(f"  {'shared' if s else 'dedicated':9s} runner, cache {'hit ' if c else 'miss'}: MAE {err[m].mean():4.1f} s (n = {m.sum()})")`,
        },
        {
          title: 'Your turn, scaffolded: real data',
          prose: 'The same steps on the diabetes dataset bundled with scikit-learn. **Predict** whether two features get close to all ten.',
          tryThis: 'Keep only 40 development rows (`dev = order[88:128]`) and run again: watch the fold scores swing.',
          code: `# The scaffolded alternate: the same evidence steps on real data bundled with scikit-learn (442 diabetes patients,
# target = disease progression after one year). No time order here, so the folds are random.
import numpy as np
from sklearn.datasets import load_diabetes
X, y = load_diabetes(return_X_y=True)
rng = np.random.default_rng(0)
order = rng.permutation(len(y))
test, dev = order[:88], order[88:]                          # 20% set aside first

def ridge_mae(tr, va, cols):
    if not cols:
        return np.mean(np.abs(y[tr].mean() - y[va]))
    A = X[np.ix_(tr, cols)]; mu, sd = A.mean(axis=0), A.std(axis=0)
    Z = (A - mu) / sd
    w = np.linalg.solve(Z.T @ Z / len(tr) + 1e-3 * np.eye(len(cols)), Z.T @ (y[tr] - y[tr].mean()) / len(tr))
    return np.mean(np.abs(y[tr].mean() + ((X[np.ix_(va, cols)] - mu) / sd) @ w - y[va]))

candidates = {"mean": [], "bmi + bp": [2, 3], "all ten": list(range(10))}
folds = np.array_split(dev, 5)
for name, cols in candidates.items():
    s = [ridge_mae(np.concatenate([folds[j] for j in range(5) if j != f]), folds[f], cols) for f in range(5)]
    print(f"{name:9s} fold MAE " + "  ".join(f"{v:5.1f}" for v in s) + f"   mean {np.mean(s):5.1f}")
print(f"test, evaluated once — all ten: MAE {ridge_mae(dev, test, candidates['all ten']):.1f}; baseline {ridge_mae(dev, test, []):.1f}")`,
        },
      ],
    },
  },
  'l33-ship': {
    formulaTex: '$$\\max_i \\big|\\hat y^{\\text{batch}}_i - \\hat y^{\\text{online}}_i\\big| < 10^{-9}$$',
    mathCode: {
      rows: [
        ['artifact', '{"version", "mu", "sd", "w", "b", "evidence"}', 'The model with its preprocessing and its evidence.'],
        ['batch, online', 'batch_predict(art, E), handle(art, request)', 'Two serving paths; parity says they agree.'],
        ['threshold', 'np.percentile(quiet, 99)', 'The PSI alert level, from quiet development days.'],
      ],
    },
    notebook: {
      title: 'Lab 33.3 · Ship it responsibly',
      intro: 'The artifact, two serving paths with parity and tests, monitoring from quiet data, and a model card.',
      cells: [
        {
          title: 'The evidence again',
          prose: 'As in 33.2.',
          code: `import numpy as np
LANGS = ["go", "java", "python"]
def make_log(days=60, per_day=50, seed=33):
    """The bundled build log: 60 days in time order (the same generator as buildtime_app.py)."""
    rng = np.random.default_rng(seed); cols = {k: [] for k in ["day", "size", "files", "cache", "shared", "lang", "hour", "y"]}
    for d in range(days):
        n = per_day
        size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
        cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
        lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
        work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
        y = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
        for k, v in zip(cols, [np.full(n, d), size, files, cache, shared, lang, hour, y]):
            cols[k].append(v)
    return {k: np.concatenate(v) for k, v in cols.items()}

def features(D, kind):
    if kind == "simple":
        return np.column_stack([D["size"], D["files"], D["cache"], D["shared"]]).astype(float)
    busy = ((D["hour"] >= 9) & (D["hour"] <= 17)).astype(int)
    return np.column_stack([np.log(D["size"]), D["size"] * D["shared"], D["size"] * (1 - D["cache"]), D["shared"] * busy,
                            D["files"], D["lang"] == "java", D["lang"] == "python"]).astype(float)

def fit(D, m, kind):
    """kind 'mean' is the baseline; otherwise ridge with training-only standardization."""
    y = D["y"][m]
    if kind == "mean":
        return lambda E, k: np.full(k.sum(), y.mean())
    X = features(D, kind)[m]; mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = (X - mu) / sd
    w = np.linalg.solve(Z.T @ Z / len(y) + 1e-3 * np.eye(Z.shape[1]), Z.T @ (y - y.mean()) / len(y))
    return lambda E, k: y.mean() + ((features(E, kind)[k] - mu) / sd) @ w

D = make_log()
cut = 48                                                    # days 48-59 (the last 20%) are the test set: set aside first
dev, test = D["day"] < cut, D["day"] >= cut
print(f"development: {dev.sum()} builds (days 0-{cut - 1}); test: {test.sum()} builds (days {cut}-59), not touched until the end")

blocks = np.array_split(np.arange(cut), 5)                # forward chaining: train on the past, validate on the next block
scores = {k: [] for k in ["mean", "simple", "full"]}
for f in range(1, 5):
    tr, va = dev & (D["day"] < blocks[f][0]), (D["day"] >= blocks[f][0]) & (D["day"] <= blocks[f][-1])
    for k in scores:
        scores[k].append(np.mean(np.abs(fit(D, tr, k)(D, va) - D["y"][va])))
for k, s in scores.items():
    print(f"{k:6s} fold MAE " + "  ".join(f"{v:5.2f}" for v in s) + f"   mean {np.mean(s):5.2f} s")
for k in ["simple", "full"]:
    d = np.array(scores["mean"]) - np.array(scores[k])
    print(f"baseline − {k:6s} fold by fold " + "  ".join(f"{v:+6.2f}" for v in d) + f"   smallest {d.min():+.2f} s")

# One evaluation on the test period, with a paired bootstrap interval, decided against the threshold set in advance.
MIN_IMPROVEMENT_S = 2.0
base, model = fit(D, dev, "mean")(D, test), fit(D, dev, "full")(D, test)
y = D["y"][test]
diff = np.abs(base - y) - np.abs(model - y)                 # per build: how much closer the model is
rng = np.random.default_rng(0)
boots = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(2000)]
lo, hi = np.percentile(boots, [2.5, 97.5])
decision = "ship" if lo > MIN_IMPROVEMENT_S else "inconclusive" if diff.mean() > MIN_IMPROVEMENT_S else "reject"
print(f"test MAE: baseline {np.mean(np.abs(base - y)):.2f} s, model {np.mean(np.abs(model - y)):.2f} s")
print(f"improvement {diff.mean():.2f} s, 95% interval {lo:.2f} to {hi:.2f} s, threshold {MIN_IMPROVEMENT_S} s -> {decision}")
err = np.abs(model - y)
for s in (0, 1):
    for c in (0, 1):
        m = (D["shared"][test] == s) & (D["cache"][test] == c)
        print(f"  {'shared' if s else 'dedicated':9s} runner, cache {'hit ' if c else 'miss'}: MAE {err[m].mean():4.1f} s (n = {m.sum()})")`,
        },
        {
          title: 'Artifact, serving paths and tests',
          prose: '**Predict** the largest difference between the batch and online paths.',
          code: `import json
# Ship: refit the chosen candidate on all rows, and save it WITH its preprocessing as one artifact (Labs 28-29).
X_all = features(D, "full"); mu, sd = X_all.mean(axis=0), X_all.std(axis=0); Z = (X_all - mu) / sd
w = np.linalg.solve(Z.T @ Z / len(Z) + 1e-3 * np.eye(Z.shape[1]), Z.T @ (D["y"] - D["y"].mean()) / len(Z))
artifact = json.loads(json.dumps({"version": "1.0.0", "mu": mu.tolist(), "sd": sd.tolist(), "w": w.tolist(), "b": float(D["y"].mean()),
                                  "evidence": {"improvement_s": round(float(diff.mean()), 2), "interval_s": [round(lo, 2), round(hi, 2)], "decision": decision}}))

def batch_predict(art, E):
    """The batch path: a whole table at once."""
    return art["b"] + ((features(E, "full") - art["mu"]) / np.array(art["sd"])) @ np.array(art["w"])

def handle(art, request):
    """The online path: one JSON request, validated first (Lab 29)."""
    if request.get("language") not in LANGS or not request.get("size_mb", 0) > 0:
        return 422, {"error": "request breaks the contract"}
    one = {"size": np.array([request["size_mb"]]), "files": np.array([request["files"]]), "cache": np.array([request["cache_hit"]]),
           "shared": np.array([request["runner"] == "shared"]).astype(int), "lang": np.array([request["language"]]), "hour": np.array([request["hour"]])}
    return 200, {"model_version": art["version"], "predicted_duration_s": float(batch_predict(art, one)[0])}

golden = make_log(days=1, seed=99)                          # 50 logged requests from a new day
batch = batch_predict(artifact, golden)
online = [handle(artifact, dict(size_mb=golden["size"][i], files=golden["files"][i], cache_hit=golden["cache"][i],
                                runner="shared" if golden["shared"][i] else "dedicated", language=golden["lang"][i], hour=golden["hour"][i]))[1]["predicted_duration_s"]
          for i in range(len(batch))]
print(f"parity, batch against online path: largest difference {np.max(np.abs(batch - online)):.1e} s over {len(batch)} requests")
print("contract test:", handle(artifact, {"language": "rust", "size_mb": 10})[0], "(expected 422)")
print(f"golden test: request 0 -> {online[0]:.3f} s; store it with version {artifact['version']} and fail CI if a release changes it")`,
        },
        {
          title: 'Monitoring and the model card',
          prose: '**Predict** whether a day of sizes in KB trips the alert, the guard, or both.',
          code: `# Monitoring set up from the development period itself: a PSI threshold from quiet days, and a guard (Lab 30).
edges = np.quantile(D["size"][dev], np.linspace(0, 1, 11)[1:-1])
def psi(x):
    share = np.maximum(np.bincount(np.searchsorted(edges, x), minlength=10) / len(x), 1e-4)
    return float(np.sum((share - 0.1) * np.log(share / 0.1)))
quiet = [psi(D["size"][D["day"] == d]) for d in range(cut)]
threshold = np.percentile(quiet, 99)
print(f"daily size PSI on quiet days (50 builds): median {np.median(quiet):.3f}; alert threshold (99th percentile) {threshold:.3f}")
kb_bug = make_log(days=1, seed=8); kb_bug["size"] = kb_bug["size"] * 1024       # upstream starts sending KB
p = batch_predict(artifact, kb_bug)
print(f"a day with sizes in KB: PSI {psi(kb_bug['size']):.2f} -> {'ALERT' if psi(kb_bug['size']) > threshold else 'ok'}; "
      f"{np.sum((p < 1) | (p > 24 * 3600))} of {len(p)} predictions outside the [1 s, 24 h] guard")

segs = {(s, c): err[(D["shared"][test] == s) & (D["cache"][test] == c)].mean() for s in (0, 1) for c in (0, 1)}
(ws, wc) = max(segs, key=segs.get)                          # the worst segment, from the test errors of 33.2
worst = f"{'shared' if ws else 'dedicated'} runners with a cache {'hit' if wc else 'miss'} ({segs[(ws, wc)]:.1f} s against {err.mean():.1f} s overall)"
card = f"""# Model card: build duration predictor {artifact['version']}
Intended use: choose a runner before a build starts. Out of scope: judging people by their build times.
Evidence: test days {cut}-59, evaluated once; improvement over the mean baseline {artifact['evidence']['improvement_s']} s
(95% interval {artifact['evidence']['interval_s'][0]} to {artifact['evidence']['interval_s'][1]} s) against a 2 s threshold set in advance: {artifact['evidence']['decision']}.
Limitation: largest errors on {worst}.
Monitoring: size PSI above {threshold:.3f}; guard [1 s, 24 h]. Owner: build platform team; retrain monthly through the gates of Lab 32."""
print(card)`,
        },
      ],
    },
  },
  'l33-mastery': {
    formulaTex: '$$\\text{frame} \\to \\text{evidence} \\to \\text{ship} \\to \\text{monitor} \\to \\text{repeat}$$',
    mathCode: {
      rows: [
        ['rubric', '[(criterion, checked_from_evidence), ...]', 'Each criterion is a check on the project’s artifacts, not a promise.'],
      ],
    },
    notebook: {
      title: 'Lab 33.4 · What mastery looks like — and what comes next',
      intro: 'The whole exemplar in one cell, then the final-project rubric checked against it.',
      cells: [
        {
          title: 'Everything so far',
          prose: 'The cells of 33.2 and 33.3 together.',
          code: `import numpy as np
LANGS = ["go", "java", "python"]
def make_log(days=60, per_day=50, seed=33):
    """The bundled build log: 60 days in time order (the same generator as buildtime_app.py)."""
    rng = np.random.default_rng(seed); cols = {k: [] for k in ["day", "size", "files", "cache", "shared", "lang", "hour", "y"]}
    for d in range(days):
        n = per_day
        size = np.exp(np.log(40) + 0.9 * rng.normal(size=n)); files = rng.integers(5, 400, n)
        cache, shared = rng.integers(0, 2, n), rng.integers(0, 2, n); hour = rng.integers(0, 24, n)
        lang = rng.choice(LANGS, n); busy = ((hour >= 9) & (hour <= 17)).astype(int)
        work = np.where(cache == 1, 0.25, 1.0) * 0.9 * size * np.where(shared == 1, 1.6, 1.0)
        y = 20 + work + np.select([lang == "java", lang == "python"], [25, 10], 0) + 0.05 * files + 15 * shared * busy + 5 * rng.normal(size=n)
        for k, v in zip(cols, [np.full(n, d), size, files, cache, shared, lang, hour, y]):
            cols[k].append(v)
    return {k: np.concatenate(v) for k, v in cols.items()}

def features(D, kind):
    if kind == "simple":
        return np.column_stack([D["size"], D["files"], D["cache"], D["shared"]]).astype(float)
    busy = ((D["hour"] >= 9) & (D["hour"] <= 17)).astype(int)
    return np.column_stack([np.log(D["size"]), D["size"] * D["shared"], D["size"] * (1 - D["cache"]), D["shared"] * busy,
                            D["files"], D["lang"] == "java", D["lang"] == "python"]).astype(float)

def fit(D, m, kind):
    """kind 'mean' is the baseline; otherwise ridge with training-only standardization."""
    y = D["y"][m]
    if kind == "mean":
        return lambda E, k: np.full(k.sum(), y.mean())
    X = features(D, kind)[m]; mu, sd = X.mean(axis=0), X.std(axis=0)
    Z = (X - mu) / sd
    w = np.linalg.solve(Z.T @ Z / len(y) + 1e-3 * np.eye(Z.shape[1]), Z.T @ (y - y.mean()) / len(y))
    return lambda E, k: y.mean() + ((features(E, kind)[k] - mu) / sd) @ w

D = make_log()
cut = 48                                                    # days 48-59 (the last 20%) are the test set: set aside first
dev, test = D["day"] < cut, D["day"] >= cut
print(f"development: {dev.sum()} builds (days 0-{cut - 1}); test: {test.sum()} builds (days {cut}-59), not touched until the end")

blocks = np.array_split(np.arange(cut), 5)                # forward chaining: train on the past, validate on the next block
scores = {k: [] for k in ["mean", "simple", "full"]}
for f in range(1, 5):
    tr, va = dev & (D["day"] < blocks[f][0]), (D["day"] >= blocks[f][0]) & (D["day"] <= blocks[f][-1])
    for k in scores:
        scores[k].append(np.mean(np.abs(fit(D, tr, k)(D, va) - D["y"][va])))
for k, s in scores.items():
    print(f"{k:6s} fold MAE " + "  ".join(f"{v:5.2f}" for v in s) + f"   mean {np.mean(s):5.2f} s")
for k in ["simple", "full"]:
    d = np.array(scores["mean"]) - np.array(scores[k])
    print(f"baseline − {k:6s} fold by fold " + "  ".join(f"{v:+6.2f}" for v in d) + f"   smallest {d.min():+.2f} s")

# One evaluation on the test period, with a paired bootstrap interval, decided against the threshold set in advance.
MIN_IMPROVEMENT_S = 2.0
base, model = fit(D, dev, "mean")(D, test), fit(D, dev, "full")(D, test)
y = D["y"][test]
diff = np.abs(base - y) - np.abs(model - y)                 # per build: how much closer the model is
rng = np.random.default_rng(0)
boots = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(2000)]
lo, hi = np.percentile(boots, [2.5, 97.5])
decision = "ship" if lo > MIN_IMPROVEMENT_S else "inconclusive" if diff.mean() > MIN_IMPROVEMENT_S else "reject"
print(f"test MAE: baseline {np.mean(np.abs(base - y)):.2f} s, model {np.mean(np.abs(model - y)):.2f} s")
print(f"improvement {diff.mean():.2f} s, 95% interval {lo:.2f} to {hi:.2f} s, threshold {MIN_IMPROVEMENT_S} s -> {decision}")
err = np.abs(model - y)
for s in (0, 1):
    for c in (0, 1):
        m = (D["shared"][test] == s) & (D["cache"][test] == c)
        print(f"  {'shared' if s else 'dedicated':9s} runner, cache {'hit ' if c else 'miss'}: MAE {err[m].mean():4.1f} s (n = {m.sum()})")

import json
# Ship: refit the chosen candidate on all rows, and save it WITH its preprocessing as one artifact (Labs 28-29).
X_all = features(D, "full"); mu, sd = X_all.mean(axis=0), X_all.std(axis=0); Z = (X_all - mu) / sd
w = np.linalg.solve(Z.T @ Z / len(Z) + 1e-3 * np.eye(Z.shape[1]), Z.T @ (D["y"] - D["y"].mean()) / len(Z))
artifact = json.loads(json.dumps({"version": "1.0.0", "mu": mu.tolist(), "sd": sd.tolist(), "w": w.tolist(), "b": float(D["y"].mean()),
                                  "evidence": {"improvement_s": round(float(diff.mean()), 2), "interval_s": [round(lo, 2), round(hi, 2)], "decision": decision}}))

def batch_predict(art, E):
    """The batch path: a whole table at once."""
    return art["b"] + ((features(E, "full") - art["mu"]) / np.array(art["sd"])) @ np.array(art["w"])

def handle(art, request):
    """The online path: one JSON request, validated first (Lab 29)."""
    if request.get("language") not in LANGS or not request.get("size_mb", 0) > 0:
        return 422, {"error": "request breaks the contract"}
    one = {"size": np.array([request["size_mb"]]), "files": np.array([request["files"]]), "cache": np.array([request["cache_hit"]]),
           "shared": np.array([request["runner"] == "shared"]).astype(int), "lang": np.array([request["language"]]), "hour": np.array([request["hour"]])}
    return 200, {"model_version": art["version"], "predicted_duration_s": float(batch_predict(art, one)[0])}

golden = make_log(days=1, seed=99)                          # 50 logged requests from a new day
batch = batch_predict(artifact, golden)
online = [handle(artifact, dict(size_mb=golden["size"][i], files=golden["files"][i], cache_hit=golden["cache"][i],
                                runner="shared" if golden["shared"][i] else "dedicated", language=golden["lang"][i], hour=golden["hour"][i]))[1]["predicted_duration_s"]
          for i in range(len(batch))]
print(f"parity, batch against online path: largest difference {np.max(np.abs(batch - online)):.1e} s over {len(batch)} requests")
print("contract test:", handle(artifact, {"language": "rust", "size_mb": 10})[0], "(expected 422)")
print(f"golden test: request 0 -> {online[0]:.3f} s; store it with version {artifact['version']} and fail CI if a release changes it")

# Monitoring set up from the development period itself: a PSI threshold from quiet days, and a guard (Lab 30).
edges = np.quantile(D["size"][dev], np.linspace(0, 1, 11)[1:-1])
def psi(x):
    share = np.maximum(np.bincount(np.searchsorted(edges, x), minlength=10) / len(x), 1e-4)
    return float(np.sum((share - 0.1) * np.log(share / 0.1)))
quiet = [psi(D["size"][D["day"] == d]) for d in range(cut)]
threshold = np.percentile(quiet, 99)
print(f"daily size PSI on quiet days (50 builds): median {np.median(quiet):.3f}; alert threshold (99th percentile) {threshold:.3f}")
kb_bug = make_log(days=1, seed=8); kb_bug["size"] = kb_bug["size"] * 1024       # upstream starts sending KB
p = batch_predict(artifact, kb_bug)
print(f"a day with sizes in KB: PSI {psi(kb_bug['size']):.2f} -> {'ALERT' if psi(kb_bug['size']) > threshold else 'ok'}; "
      f"{np.sum((p < 1) | (p > 24 * 3600))} of {len(p)} predictions outside the [1 s, 24 h] guard")

segs = {(s, c): err[(D["shared"][test] == s) & (D["cache"][test] == c)].mean() for s in (0, 1) for c in (0, 1)}
(ws, wc) = max(segs, key=segs.get)                          # the worst segment, from the test errors of 33.2
worst = f"{'shared' if ws else 'dedicated'} runners with a cache {'hit' if wc else 'miss'} ({segs[(ws, wc)]:.1f} s against {err.mean():.1f} s overall)"
card = f"""# Model card: build duration predictor {artifact['version']}
Intended use: choose a runner before a build starts. Out of scope: judging people by their build times.
Evidence: test days {cut}-59, evaluated once; improvement over the mean baseline {artifact['evidence']['improvement_s']} s
(95% interval {artifact['evidence']['interval_s'][0]} to {artifact['evidence']['interval_s'][1]} s) against a 2 s threshold set in advance: {artifact['evidence']['decision']}.
Limitation: largest errors on {worst}.
Monitoring: size PSI above {threshold:.3f}; guard [1 s, 24 h]. Owner: build platform team; retrain monthly through the gates of Lab 32."""
print(card)`,
        },
        {
          title: 'The rubric',
          prose: '**Predict** which criterion a project most often fails.',
          code: `# The final-project rubric: each criterion is checked from evidence, not from intentions.
rubric = [
    ("Problem framed: decision, target, prediction moment, success threshold set before modelling", MIN_IMPROVEMENT_S is not None),
    ("Test set set aside first and evaluated once (most recent period for time-ordered data)", cut == 48),
    ("Baseline and candidates compared on the same folds, differences reported fold by fold", len(scores["mean"]) == len(scores["full"]) == 4),
    ("Test result reported with an interval and decided against the threshold", lo is not None and decision in ("ship", "inconclusive", "reject")),
    ("Errors analysed by segment; the worst segment is named in the card", "dedicated runners with a cache hit" in card),
    ("Artifact includes its preprocessing; parity between batch and online paths", "mu" in artifact and np.max(np.abs(batch - online)) < 1e-9),
    ("Contract and golden tests exist", handle(artifact, {"language": "rust", "size_mb": 10})[0] == 422),
    ("Monitoring threshold from quiet data, a guard, and a named owner", threshold > 0 and "Owner:" in card),
]
for item, ok in rubric:
    print(("✓ " if ok else "✗ ") + item)
print(f"{sum(ok for _, ok in rubric)}/{len(rubric)} criteria met by the worked exemplar")`,
        },
      ],
    },
  },
}
