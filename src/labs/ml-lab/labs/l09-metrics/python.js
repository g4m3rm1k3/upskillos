export default {
  filename: 'classification_metrics.py', packages: ['numpy'],
  title: 'Every metric, from four counts.',
  intro: 'Implement classification metrics without a library: the confusion counts, precision and recall, the ROC curve and its area, a cost-minimizing threshold, and the Brier score. The checks compare your AUC with an independent pairwise count and your threshold with a brute-force search.',
  steps: [
    '`confusion(y, scores, t)` → dict of ints `tp, fp, fn, tn` (predict 1 when `score >= t`).',
    '`precision_recall(c)` → `(precision, recall)`; return `float("nan")` for a zero denominator.',
    '`roc_curve(y, scores)` → `(fpr, tpr)` arrays from strict to lenient thresholds, starting at `(0, 0)` and ending at `(1, 1)`. Tied scores move together.',
    '`auc(fpr, tpr)` → trapezoid-rule area (write the sum yourself).',
    '`best_threshold(y, scores, c_fp, c_fn)` → the candidate threshold (one of the distinct scores) with the lowest total cost; and `brier(y, p)`.',
  ],
  hints: [
    ['ROC with ties', 'Take the distinct scores in decreasing order: `ts = np.unique(scores)[::-1]`. For each t, TPR is `mean(scores[y == 1] >= t)` and FPR is `mean(scores[y == 0] >= t)`. Prepend 0 to both.'],
    ['Trapezoids', '`np.sum(np.diff(fpr) * (tpr[1:] + tpr[:-1]) / 2)`.'],
    ['Cost search', 'For every candidate `t` in `np.unique(scores)`, cost = `c_fp * fp + c_fn * fn` from `confusion`. Return the t with the smallest cost.'],
  ],
  starter: `import numpy as np

def confusion(y, scores, t):
    raise NotImplementedError

def precision_recall(c):
    raise NotImplementedError

def roc_curve(y, scores):
    raise NotImplementedError

def auc(fpr, tpr):
    raise NotImplementedError

def best_threshold(y, scores, c_fp, c_fn):
    raise NotImplementedError

def brier(y, p):
    raise NotImplementedError
`,
  solution: `import numpy as np

def confusion(y, scores, t):
    y, pred = np.asarray(y), np.asarray(scores) >= t
    return {"tp": int(np.sum(pred & (y == 1))), "fp": int(np.sum(pred & (y == 0))),
            "fn": int(np.sum(~pred & (y == 1))), "tn": int(np.sum(~pred & (y == 0)))}

def precision_recall(c):
    p = c["tp"] / (c["tp"] + c["fp"]) if c["tp"] + c["fp"] else float("nan")
    r = c["tp"] / (c["tp"] + c["fn"]) if c["tp"] + c["fn"] else float("nan")
    return p, r

def roc_curve(y, scores):
    y, scores = np.asarray(y), np.asarray(scores)
    ts = np.unique(scores)[::-1]
    tpr = [0.0] + [float(np.mean(scores[y == 1] >= t)) for t in ts]
    fpr = [0.0] + [float(np.mean(scores[y == 0] >= t)) for t in ts]
    return np.array(fpr), np.array(tpr)

def auc(fpr, tpr):
    return float(np.sum(np.diff(fpr) * (tpr[1:] + tpr[:-1]) / 2))

def best_threshold(y, scores, c_fp, c_fn):
    best_t, best_cost = None, np.inf
    for t in np.unique(scores):
        c = confusion(y, scores, t)
        cost = c_fp * c["fp"] + c_fn * c["fn"]
        if cost < best_cost:
            best_t, best_cost = float(t), cost
    return best_t

def brier(y, p):
    return float(np.mean((np.asarray(p) - np.asarray(y)) ** 2))
`,
  solutionNote: 'The ROC sweep uses each distinct score as a threshold, so tied scores enter together and the curve contains a diagonal segment for ties — which is exactly how AUC counts ties as half-correct.',
  checkSummary: 'Confusion counts summing to n; precision and recall including zero-denominator cases; the lesson’s AUC example; your ROC area against an independent pairwise count on random data with ties; monotone ROC endpoints; a brute-force check that your threshold minimizes cost; and the Brier example.',
  checks: `
import numpy as np
_y = np.array([1, 1, 0, 0]); _s = np.array([0.9, 0.4, 0.6, 0.2])
_c = confusion(_y, _s, 0.5)
assert _c == {"tp": 1, "fp": 1, "fn": 1, "tn": 1}, f"confusion at 0.5: {_c}"
assert precision_recall({"tp": 30, "fp": 10, "fn": 10, "tn": 50}) == (0.75, 0.75)
_pn = precision_recall({"tp": 0, "fp": 0, "fn": 5, "tn": 5})
assert np.isnan(_pn[0]) and _pn[1] == 0, "precision is undefined with no positive predictions"
_f, _t = roc_curve(_y, _s)
assert abs(auc(_f, _t) - 0.75) < 1e-12, "AUC of the lesson example should be 0.75"
print("PASS: confusion, precision/recall and the lesson AUC")
_rng = np.random.default_rng(3)
_yy = (_rng.random(300) < 0.3).astype(int); _ss = np.round(_rng.random(300) * 0.6 + 0.3 * _yy, 2)
_f, _t = roc_curve(_yy, _ss)
assert _f[0] == 0 and _t[0] == 0 and abs(_f[-1] - 1) < 1e-12 and abs(_t[-1] - 1) < 1e-12, "ROC must run from (0,0) to (1,1)"
assert np.all(np.diff(_f) >= 0) and np.all(np.diff(_t) >= 0), "ROC must be monotone"
_pos, _neg = _ss[_yy == 1], _ss[_yy == 0]
_pairs = np.mean((_pos[:, None] > _neg[None, :]) + 0.5 * (_pos[:, None] == _neg[None, :]))
assert abs(auc(_f, _t) - _pairs) < 1e-9, f"AUC {auc(_f, _t):.6f} != pairwise probability {_pairs:.6f}"
print(f"PASS: ROC AUC equals P(positive ranked above negative) = {_pairs:.4f}, ties included")
_bt = best_threshold(_yy, _ss, 1, 5)
_costs = {t: 1 * confusion(_yy, _ss, t)["fp"] + 5 * confusion(_yy, _ss, t)["fn"] for t in np.unique(_ss)}
assert _costs[_bt] == min(_costs.values()), "best_threshold did not minimize the cost"
assert abs(brier([1, 0], [0.8, 0.3]) - 0.065) < 1e-12
print(f"PASS: cost-minimizing threshold {_bt} and Brier score")
`,
}
