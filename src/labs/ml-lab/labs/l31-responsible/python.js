export default {
  filename: 'responsible_eval.py', packages: ['numpy'],
  title: 'Subgroup metrics, deferral and a validated model card.',
  intro: 'Implement the audit toolkit: per-group metrics with sample sizes, per-group calibration error, the largest gap for any metric, a human-review deferral rule, and a model-card generator that refuses to produce a card without the required sections.',
  steps: [
    '`group_metrics(y, scores, groups, t)` → dict group → `{"n", "base", "selection", "tpr", "fpr", "ppv"}` (use `nan` for undefined ratios).',
    '`max_gap(metrics, key)` → the largest difference in `metrics[g][key]` between any two groups.',
    '`calibration_error(y, scores, groups, bins=5)` → dict group → expected calibration error (Lab 09) computed within that group.',
    '`defer(scores, width)` → boolean array: True where `|score − 0.5| ≤ width` (send to a human).',
    '`model_card(fields, metrics)` → Markdown text; raise `ValueError` if `intended_use`, `out_of_scope` or `limitations` is missing or empty; include a table row per group.',
  ],
  hints: [
    ['Masks per group', '`m = groups == g`; `pred = scores[m] >= t`; `tp = np.sum(pred & (y[m] == 1))`.'],
    ['ECE per group', 'Bin with `np.minimum((s * bins).astype(int), bins - 1)`; sum over bins of `(count/n)·|mean(s) − mean(y)|`.'],
  ],
  starter: `import numpy as np

def group_metrics(y, scores, groups, t=0.5):
    raise NotImplementedError

def max_gap(metrics, key):
    raise NotImplementedError

def calibration_error(y, scores, groups, bins=5):
    raise NotImplementedError

def defer(scores, width):
    raise NotImplementedError

def model_card(fields, metrics):
    raise NotImplementedError
`,
  solution: `import numpy as np

def _ratio(a, b):
    return float(a / b) if b else float("nan")

def group_metrics(y, scores, groups, t=0.5):
    y, scores, groups = np.asarray(y), np.asarray(scores), np.asarray(groups)
    out = {}
    for g in np.unique(groups):
        m = groups == g
        yy, pred = y[m], scores[m] >= t
        tp, fp = np.sum(pred & (yy == 1)), np.sum(pred & (yy == 0))
        pos, neg = np.sum(yy == 1), np.sum(yy == 0)
        out[str(g)] = {"n": int(m.sum()), "base": float(yy.mean()), "selection": float(pred.mean()),
                       "tpr": _ratio(tp, pos), "fpr": _ratio(fp, neg), "ppv": _ratio(tp, tp + fp)}
    return out

def max_gap(metrics, key):
    vals = [m[key] for m in metrics.values()]
    return float(max(vals) - min(vals))

def calibration_error(y, scores, groups, bins=5):
    y, scores, groups = np.asarray(y), np.asarray(scores), np.asarray(groups)
    out = {}
    for g in np.unique(groups):
        s, yy = scores[groups == g], y[groups == g]
        b = np.minimum((s * bins).astype(int), bins - 1)
        out[str(g)] = float(sum(np.sum(b == k) / len(s) * abs(s[b == k].mean() - yy[b == k].mean()) for k in range(bins) if np.any(b == k)))
    return out

def defer(scores, width):
    return np.abs(np.asarray(scores) - 0.5) <= width

def model_card(fields, metrics):
    for key in ("intended_use", "out_of_scope", "limitations"):
        if not fields.get(key, "").strip():
            raise ValueError(f"Model card is missing required section: {key}")
    pct = lambda v: "n/a" if v != v else f"{100 * v:.1f}%"
    rows = "\\n".join(f"| {g} | {m['n']} | {pct(m['base'])} | {pct(m['selection'])} | {pct(m['tpr'])} | {pct(m['fpr'])} | {pct(m['ppv'])} |" for g, m in metrics.items())
    return (f"# Model card: {fields.get('name', 'model')}\\n\\n## Intended use\\n{fields['intended_use']}\\n\\n"
            f"## Out of scope\\n{fields['out_of_scope']}\\n\\n## Evaluation by group\\n"
            "| group | n | base rate | flagged | TPR | FPR | precision |\\n|---|---|---|---|---|---|---|\\n"
            f"{rows}\\n\\n## Limitations\\n{fields['limitations']}\\n")
`,
  solutionNote: 'Every group metric carries its sample size, and undefined ratios are reported as missing rather than as zero. The card generator enforces the sections that make a card useful — an empty "limitations" is itself a red flag.',
  checkSummary: 'Hand-checked group metrics on a tiny example (including an undefined precision); the maximum gap; a simulated two-group model where noisier data gives one group lower recall and higher calibration error; deferral that increases the accuracy of automated decisions; and a model card that includes every group and refuses to render without its required sections.',
  checks: `
import numpy as np
_y = np.array([1, 0, 1, 0, 1, 0]); _s = np.array([0.9, 0.2, 0.4, 0.6, 0.8, 0.1]); _g = np.array(["A", "A", "A", "B", "B", "B"])
_m = group_metrics(_y, _s, _g, 0.5)
assert _m["A"] == {"n": 3, "base": 2 / 3, "selection": 1 / 3, "tpr": 0.5, "fpr": 0.0, "ppv": 1.0}
assert _m["B"]["tpr"] == 1.0 and _m["B"]["fpr"] == 0.5 and abs(_m["B"]["ppv"] - 0.5) < 1e-12
_none = group_metrics(np.array([0, 0]), np.array([0.1, 0.2]), np.array(["C", "C"]), 0.5)
assert np.isnan(_none["C"]["ppv"]) and np.isnan(_none["C"]["tpr"]), "Undefined ratios must be nan, not 0"
assert abs(max_gap(_m, "tpr") - 0.5) < 1e-12
print("PASS: group metrics and gaps")
_rng = np.random.default_rng(3)
_n = 4000; _gg = np.where(_rng.random(_n) < 0.5, "A", "B"); _yy = (_rng.random(_n) < 0.3).astype(int)
_sig = np.where(_yy == 1, 1.5, -1.5) + np.where(_gg == "A", 0.8, 1.8) * _rng.normal(size=_n)
_sc = 1 / (1 + np.exp(-1.2 * _sig))
_mm = group_metrics(_yy, _sc, _gg)
assert _mm["A"]["tpr"] > _mm["B"]["tpr"] + 0.05, "Noisier data should cost group B recall"
_ce = calibration_error(_yy, _sc, _gg)
assert set(_ce) == {"A", "B"} and all(0 <= v < 0.5 for v in _ce.values())
_d = defer(_sc, 0.2)
_acc_all = np.mean((_sc >= 0.5) == _yy); _acc_auto = np.mean((_sc[~_d] >= 0.5) == _yy[~_d])
assert 0 < _d.mean() < 0.5 and _acc_auto > _acc_all, "Deferring uncertain cases must raise automated accuracy"
print(f"PASS: recall A {_mm['A']['tpr']:.2f} vs B {_mm['B']['tpr']:.2f}; deferring {_d.mean():.0%} raises automated accuracy {_acc_all:.3f} -> {_acc_auto:.3f}")
_card = model_card({"name": "escalation", "intended_use": "Triage support.", "out_of_scope": "Staff evaluation.", "limitations": "Lower recall in region B."}, _mm)
assert "| A |" in _card and "| B |" in _card and "Lower recall" in _card
try:
    model_card({"intended_use": "x", "out_of_scope": "y", "limitations": "  "}, _mm)
    raise AssertionError("An empty limitations section must raise ValueError")
except ValueError:
    pass
print("PASS: model card with required sections")
`,
}
