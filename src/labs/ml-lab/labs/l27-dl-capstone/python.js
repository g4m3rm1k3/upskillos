const PROVIDED = `import zlib
import numpy as np

# Provided: a stand-in for "train this configuration with this seed and return
# test accuracy". Its true effects are known, so the checks can grade your
# harness. (Replace it with real training in your own projects.)
EFFECTS = {"conv": 0.30, "hidden": 0.04, "augment": 0.08}
def evaluate(config, seed):
    # A stable seed (Python's built-in hash() of strings changes between runs).
    rng = np.random.default_rng(zlib.crc32(repr((sorted(config.items()), seed)).encode()))
    acc = 0.40 + sum(EFFECTS[k] for k, on in config.items() if on)
    if config.get("conv") and config.get("augment"):
        acc -= 0.05                       # interaction: conv already provides some invariance
    return float(np.clip(acc + rng.normal(0, 0.02), 0, 1))
`
export default {
  filename: 'experiment_harness.py', packages: ['numpy'],
  title: 'An experiment harness for honest comparisons.',
  intro: 'Write the reusable part of a deep-learning investigation: run configurations over several seeds, summarize with mean and standard deviation, compare two configurations paired by seed, run leave-one-out ablations, and choose the simplest configuration that is statistically indistinguishable from the best. A stand-in `evaluate(config, seed)` with known effects is provided so the checks can verify your conclusions.',
  steps: [
    '`run(configs, seeds)` → dict name → list of scores, one per seed, calling `evaluate(config, seed)`.',
    '`summarize(scores)` → `(mean, sd)` with `ddof=1` (sd 0 for a single score).',
    '`paired_difference(a, b)` → `(mean_diff, lo, hi)`: per-seed differences `a − b`, with `lo, hi = mean ∓ 2·sd/√n`.',
    '`ablations(full, seeds)` → dict component → mean paired drop `score(full) − score(full without it)`.',
    '`choose(results, complexity)` → among configurations whose mean is within 2 standard errors of the best, return the one with the smallest `complexity[name]`.',
  ],
  hints: [
    ['Standard error', '`sd / np.sqrt(n)`; "within 2 standard errors of the best" uses the best configuration\'s standard error.'],
    ['Ablation variants', '`variant = {**full, component: False}` for each component that is True in `full`.'],
  ],
  starter: `${PROVIDED}
def run(configs, seeds):
    raise NotImplementedError

def summarize(scores):
    raise NotImplementedError

def paired_difference(a, b):
    raise NotImplementedError

def ablations(full, seeds):
    raise NotImplementedError

def choose(results, complexity):
    raise NotImplementedError
`,
  solution: `${PROVIDED}
def run(configs, seeds):
    return {name: [evaluate(cfg, s) for s in seeds] for name, cfg in configs.items()}

def summarize(scores):
    scores = np.asarray(scores, dtype=float)
    return float(scores.mean()), float(scores.std(ddof=1)) if len(scores) > 1 else 0.0

def paired_difference(a, b):
    d = np.asarray(a) - np.asarray(b)
    m = d.mean()
    se = d.std(ddof=1) / np.sqrt(len(d)) if len(d) > 1 else 0.0
    return float(m), float(m - 2 * se), float(m + 2 * se)

def ablations(full, seeds):
    base = [evaluate(full, s) for s in seeds]
    out = {}
    for c, on in full.items():
        if on:
            variant = {**full, c: False}
            out[c] = paired_difference(base, [evaluate(variant, s) for s in seeds])[0]
    return out

def choose(results, complexity):
    stats = {k: summarize(v) for k, v in results.items()}
    best = max(stats, key=lambda k: stats[k][0])
    bm, bsd = stats[best]
    se = bsd / np.sqrt(len(results[best]))
    near = [k for k, (m, _) in stats.items() if m >= bm - 2 * se]
    return min(near, key=lambda k: complexity[k])
`,
  solutionNote: 'Every comparison is paired by seed, so shared seed-to-seed noise cancels. The chooser prefers simplicity whenever the evidence cannot separate a simpler configuration from the best one.',
  checkSummary: 'Seeds and configurations are all run; summary statistics with ddof = 1; paired differences whose interval contains the true effect; ablations that recover the known effects (including the conv × augmentation interaction); and a chooser that picks the simpler configuration when two are within noise.',
  checks: `
import numpy as np
_cfgs = {"base": {"conv": False, "hidden": False, "augment": False}, "conv": {"conv": True, "hidden": False, "augment": False}, "full": {"conv": True, "hidden": True, "augment": True}}
_seeds = list(range(8))
_res = run(_cfgs, _seeds)
assert set(_res) == set(_cfgs) and all(len(v) == 8 for v in _res.values())
assert _res["conv"][3] == evaluate(_cfgs["conv"], 3), "Each score must come from evaluate(config, seed)"
_m, _s = summarize([0.5, 0.7])
assert abs(_m - 0.6) < 1e-12 and abs(_s - np.std([0.5, 0.7], ddof=1)) < 1e-12 and summarize([0.4])[1] == 0
print("PASS: running and summarizing")
_d, _lo, _hi = paired_difference(_res["conv"], _res["base"])
assert _lo < 0.30 < _hi and abs(_d - 0.30) < 0.03, f"Conv effect should be about 0.30 (got {_d:.3f}, [{_lo:.3f}, {_hi:.3f}])"
_ab = ablations(_cfgs["full"], _seeds)
assert set(_ab) == {"conv", "hidden", "augment"}
assert abs(_ab["conv"] - 0.25) < 0.03 and abs(_ab["augment"] - 0.03) < 0.03 and abs(_ab["hidden"] - 0.04) < 0.03, f"Ablations {_ab}"
print("PASS: paired differences and ablations recover the known effects (conv x augment interaction included)")
_tie = {"simple": [0.80, 0.82, 0.81, 0.79], "complex": [0.81, 0.83, 0.80, 0.82], "bad": [0.5, 0.52, 0.49, 0.51]}
assert choose(_tie, {"simple": 1, "complex": 10, "bad": 0}) == "simple", "Within noise, prefer the simpler configuration"
assert choose({"a": [0.6, 0.61, 0.6], "b": [0.9, 0.91, 0.9]}, {"a": 1, "b": 5}) == "b", "A clearly better model must win"
print("PASS: choosing the simplest configuration the evidence supports")
`,
}
