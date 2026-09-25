// Lab 09 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// Lessons 09.1–09.2 start from the lesson's own counts (70 / 20 / 30 / 880 at threshold 0.5);
// the later cells use one seeded, calibrated simulation so thresholds and curves can move.

const COUNTS = `import numpy as np

# The lesson's day: 1,000 services, 100 with a real incident, and the alerts at threshold 0.5.
# 1 = incident / alert, 0 = healthy / quiet. Built so the counts match the lesson exactly.
y     = np.array([1] * 70 + [1] * 30 + [0] * 20 + [0] * 880)   # the truth
alert = np.array([1] * 70 + [0] * 30 + [1] * 20 + [0] * 880)   # what the system did
print("services:", len(y), "  incidents:", y.sum(), "  alerts:", alert.sum())`

const SIM = `import numpy as np

# A simulated day of 1,000 services. Each has a true incident probability; the model reports it
# exactly, so its scores are calibrated by construction. Seeded: every run gives the same data.
rng = np.random.default_rng(9)
n = 1000
p_true = rng.beta(0.5, 4.5, n)                 # mean 0.1: about 10% of services have incidents
y = (rng.random(n) < p_true).astype(int)       # 1 = incident today
score = p_true                                 # the model's score for each service
print("incidents:", y.sum(), "of", n, "  mean score:", round(score.mean(), 3))`

const counts = `def counts(y, alert):
    """True positives, false positives, false negatives, true negatives."""
    tp = int(np.sum((alert == 1) & (y == 1)))
    fp = int(np.sum((alert == 1) & (y == 0)))
    fn = int(np.sum((alert == 0) & (y == 1)))
    tn = int(np.sum((alert == 0) & (y == 0)))
    return tp, fp, fn, tn`

export const extras = {
  'l09-confusion': {
    formulaTex: '$$\\text{TP} = \\sum_i [\\hat y_i = 1][y_i = 1]$$ $$\\text{FP} = \\sum_i [\\hat y_i = 1][y_i = 0]$$ $$\\text{FN} = \\sum_i [\\hat y_i = 0][y_i = 1]$$ $$\\text{TN} = \\sum_i [\\hat y_i = 0][y_i = 0]$$ $$\\text{accuracy} = \\frac{\\text{TP} + \\text{TN}}{n}$$ $$\\text{TPR} = \\frac{\\text{TP}}{\\text{TP} + \\text{FN}} = P(\\hat y = 1 \\mid y = 1)$$ $$\\text{FPR} = \\frac{\\text{FP}}{\\text{FP} + \\text{TN}} = P(\\hat y = 1 \\mid y = 0)$$',
    mathCode: {
      rows: [
        ['$y_i \\in \\{0, 1\\}$', 'y[i]', 'The truth for service i: 1 = incident.'],
        ['$\\hat y_i = [s_i \\ge t]$', 'alert = (score >= t).astype(int)', 'The decision at threshold t: 1 = alert.'],
        ['$[\\hat y_i = 1][y_i = 1]$', '(alert == 1) & (y == 1)', 'An indicator: 1 when both hold, else 0. Summing it counts TP.'],
        ['$\\text{TP} + \\text{FN}$', 'y.sum()', 'All real incidents, caught or not: the TPR denominator.'],
        ['$P(\\hat y = 1 \\mid y = 1)$', 'alert[y == 1].mean()', 'TPR as a conditional probability: the alert rate among incidents.'],
      ],
    },
    notebook: {
      title: 'Lab 09.1 · The confusion matrix',
      intro: 'Count the four outcomes from the lesson’s day, compute accuracy and the within-class rates, then see the counts change with the threshold. Predict each output before you run the cell.',
      cells: [{
        title: 'The lesson’s day as two arrays',
        prose: 'One entry per service: the truth `y` and the decision `alert`. **Predict** how many entries of `alert` are 1.',
        code: COUNTS,
      }, {
        title: 'Count the four outcomes',
        prose: 'Each count is a sum of an indicator: `(alert == 1) & (y == 1)` is 1 exactly for true positives. **Predict** the accuracy of this system and of “never alert”.',
        code: `${counts}

tp, fp, fn, tn = counts(y, alert)
print(f"TP {tp}   FP {fp}   FN {fn}   TN {tn}")
print("accuracy:", (tp + tn) / len(y))
never = np.zeros_like(y)                      # a system that never alerts
print("accuracy of never alerting:", (never == y).mean(), "  incidents caught:", counts(y, never)[0])`,
        tryThis: 'Change 20 false alarms into 200 by editing the arrays (keep 1,000 rows in total: take the extra 180 from the true negatives). How much does accuracy drop, and how many more engineers get paged?',
      }, {
        title: 'Rates within each true class',
        prose: 'TPR looks only at incidents, FPR only at healthy services. The second line of each pair computes the same number as a conditional probability: the mean of `alert` within one class.',
        code: `print("TPR = TP/(TP + FN) =", tp / (tp + fn), "  = alert[y == 1].mean() =", alert[y == 1].mean())
print("FPR = FP/(FP + TN) =", round(fp / (fp + tn), 4), "  = alert[y == 0].mean() =", round(alert[y == 0].mean(), 4))`,
      }, {
        title: 'The library version, and its layout',
        prose: 'scikit-learn computes the same counts. Its matrix has rows = truth and columns = decision, both in the order 0, 1, so TP is at the **bottom right**. Check your counts against it before trusting either.',
        code: `from sklearn.metrics import confusion_matrix
cm = confusion_matrix(y, alert)
print(cm)
print("TN, FP, FN, TP read from it:", cm[0, 0], cm[0, 1], cm[1, 0], cm[1, 1])`,
      }, {
        title: 'One model, many matrices',
        prose: 'A simulated day with real scores. Its arrays get new names (`y_sim`, `score`), so the lesson’s `y` and `alert` above stay intact if you rerun earlier cells. Every threshold turns the same scores into a different confusion matrix. **Predict** which counts rise as the threshold falls.',
        code: `# A simulated day of 1,000 services. Each has a true incident probability and the model reports it
# exactly, so its scores are calibrated by construction. Seeded: every run gives the same data.
rng = np.random.default_rng(9)
p_true = rng.beta(0.5, 4.5, 1000)               # mean 0.1: about 10% of services have incidents
y_sim = (rng.random(1000) < p_true).astype(int)
score = p_true
print("incidents:", y_sim.sum(), "of", len(y_sim))

for t in [0.7, 0.5, 0.3, 0.1]:
    tp, fp, fn, tn = counts(y_sim, (score >= t).astype(int))
    print(f"threshold {t}:  TP {tp:3d}  FP {fp:3d}  FN {fn:3d}  TN {tn:3d}")`,
        tryThis: 'Add threshold 0.0 to the list. What does “alert on everything” do to each count?',
      }],
    },
  },
  'l09-precision': {
    formulaTex: '$$\\text{precision} = \\frac{\\text{TP}}{\\text{TP} + \\text{FP}} = P(y = 1 \\mid \\hat y = 1)$$ $$\\text{recall} = \\frac{\\text{TP}}{\\text{TP} + \\text{FN}} = P(\\hat y = 1 \\mid y = 1)$$ $$F_1 = \\frac{2PR}{P + R} = \\left(\\frac{1}{2}\\Big(\\frac{1}{P} + \\frac{1}{R}\\Big)\\right)^{-1}$$',
    mathCode: {
      rows: [
        ['$P = \\frac{\\text{TP}}{\\text{TP} + \\text{FP}}$', 'tp / (tp + fp)', 'Among alerts, the fraction that are real. Undefined when there are no alerts.'],
        ['$R = \\frac{\\text{TP}}{\\text{TP} + \\text{FN}}$', 'tp / (tp + fn)', 'Among incidents, the fraction alerted.'],
        ['$P(y = 1 \\mid \\hat y = 1)$', 'y[alert == 1].mean()', 'Precision as a conditional probability: condition on the alert.'],
        ['$F_1 = \\frac{2PR}{P + R}$', '2 * P * R / (P + R)', 'The harmonic mean: dragged toward the smaller of the two.'],
      ],
    },
    notebook: {
      title: 'Lab 09.2 · Precision, recall and F1',
      intro: 'The two questions from the lesson — how often is an alert real, and how many incidents are caught — computed from counts, then traced across thresholds.',
      cells: [{
        title: 'The lesson’s counts',
        prose: '**Predict** precision and recall for 70 true positives, 20 false positives and 30 misses.',
        code: `tp, fp, fn = 70, 20, 30
P = tp / (tp + fp)          # condition on the alert
R = tp / (tp + fn)          # condition on the incident
F1 = 2 * P * R / (P + R)
print(f"precision {P:.3f}   recall {R:.3f}   F1 {F1:.3f}")`,
      }, {
        title: 'The trade-off across thresholds',
        prose: 'Lowering the threshold admits more alerts: recall can only rise, precision usually falls. **Predict** the threshold with the highest F1 before you look.',
        code: `${SIM}

def precision_recall(y, alert):
    tp = np.sum((alert == 1) & (y == 1)); fp = np.sum((alert == 1) & (y == 0)); fn = np.sum((alert == 0) & (y == 1))
    P = tp / (tp + fp) if tp + fp else float("nan")     # no alerts: precision is undefined
    return P, tp / (tp + fn)

best = None
for t in [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]:
    P, R = precision_recall(y, (score >= t).astype(int))
    F1 = 2 * P * R / (P + R)
    print(f"t = {t:.2f}:  precision {P:.3f}  recall {R:.3f}  F1 {F1:.3f}")
    if best is None or F1 > best[1]:
        best = (t, F1)
print("highest F1 at t =", best[0])`,
        tryThis: 'Add a threshold of 0.95. Why does precision become undefined, and what should a report say instead of a number?',
      }, {
        title: 'F1 is not the average',
        prose: 'The harmonic mean punishes imbalance. **Predict** F1 for precision 0.95 and recall 0.05.',
        code: `for P, R in [(0.5, 1.0), (0.95, 0.05), (0.8, 0.8)]:
    print(f"P {P}, R {R}:  plain mean {(P + R) / 2:.3f}   F1 {2 * P * R / (P + R):.3f}")`,
      }],
    },
  },
  'l09-roc': {
    formulaTex: '$$\\text{ROC} = \\{(\\text{FPR}(t), \\text{TPR}(t)) : t \\in \\mathbb{R}\\}$$ $$\\text{AUC} = P(s^+ > s^-) + \\tfrac12 P(s^+ = s^-)$$ $$\\text{AUC} \\approx \\sum_k (x_k - x_{k-1})\\,\\frac{y_k + y_{k-1}}{2}$$',
    mathCode: {
      rows: [
        ['$(\\text{FPR}(t), \\text{TPR}(t))$', 'fpr.append(fp / n_neg); tpr.append(tp / n_pos)', 'One point per threshold, added as the threshold passes each case.'],
        ['$P(s^+ > s^-)$', 'np.mean([sp > sn for sp in pos for sn in neg])', 'Every positive–negative pair, counted when ranked correctly.'],
        ['$\\tfrac12 P(s^+ = s^-)$', '0.5 * (sp == sn)', 'A tie counts as half a correct pair.'],
        ['$\\sum_k (x_k - x_{k-1})\\frac{y_k + y_{k-1}}{2}$', 'np.trapz(tpr, fpr)', 'The area under the curve by trapezoids.'],
      ],
    },
    notebook: {
      title: 'Lab 09.3 · ROC curves and AUC',
      intro: 'Build the ROC curve of the lesson’s four cases by hand, compute its area two ways, and confirm that AUC ignores the scale of the scores.',
      cells: [{
        title: 'The curve, one case at a time',
        prose: 'Positives scored 0.9 and 0.4, negatives 0.6 and 0.2. Sort by score and lower the threshold past one case at a time. **Predict** the four points after (0, 0).',
        code: `import numpy as np
scores = np.array([0.9, 0.4, 0.6, 0.2])
labels = np.array([1,   1,   0,   0])
order = np.argsort(-scores)                     # highest score first
n_pos, n_neg = labels.sum(), (1 - labels).sum()
tp = fp = 0
fpr, tpr = [0.0], [0.0]
for i in order:                                 # the threshold drops past case i
    if labels[i] == 1: tp += 1
    else:              fp += 1
    fpr.append(fp / n_neg); tpr.append(tp / n_pos)
    print(f"passed score {scores[i]}: (FPR, TPR) = ({fpr[-1]}, {tpr[-1]})")
print("area by trapezoids:", np.trapz(tpr, fpr))`,
      }, {
        title: 'AUC as ranked pairs',
        prose: 'The same number, counted directly: the share of positive–negative pairs in which the positive scores higher.',
        code: `pos, neg = scores[labels == 1], scores[labels == 0]
pairs = [(sp, sn) for sp in pos for sn in neg]
for sp, sn in pairs:
    print(f"positive {sp} vs negative {sn}: {'✓' if sp > sn else '✗'}")
auc_pairs = np.mean([1.0 if sp > sn else 0.5 if sp == sn else 0.0 for sp, sn in pairs])
print("AUC from pairs:", auc_pairs)`,
        tryThis: 'Change the second positive’s score from 0.4 to 0.6, tying it with a negative. What do the pairs, the curve and the area give now?',
      }, {
        title: 'AUC measures ranking only',
        prose: 'Multiply every score by 0.1: the order is unchanged, every probability is now wrong. **Predict** the AUC. Then scikit-learn’s version on the simulated day.',
        code: `from sklearn.metrics import roc_auc_score
print("AUC, original scores:", roc_auc_score(labels, scores))
print("AUC, scores × 0.1:   ", roc_auc_score(labels, 0.1 * scores))
${SIM.replace('import numpy as np\n\n', '')}
print("simulated day: AUC", round(roc_auc_score(y, score), 3), "  AUC of scores squared:", round(roc_auc_score(y, score ** 2), 3))`,
      }],
    },
  },
  'l09-imbalance': {
    formulaTex: '$$\\text{precision} = P(y = 1 \\mid \\hat y = 1)$$ $$\\text{precision} = \\frac{\\text{TPR}\\cdot\\pi}{\\text{TPR}\\cdot\\pi + \\text{FPR}\\cdot(1 - \\pi)}$$ $$\\pi = P(y = 1)$$ $$\\text{AP} = \\sum_k (R_k - R_{k-1})\\,P_k$$',
    mathCode: {
      rows: [
        ['$\\pi = P(y = 1)$', 'prevalence', 'How common incidents are: the prior in Bayes’ rule.'],
        ['$\\text{TPR}\\cdot\\pi$', 'tpr * prevalence', 'The share of all cases that are caught incidents.'],
        ['$\\text{FPR}\\cdot(1 - \\pi)$', 'fpr * (1 - prevalence)', 'The share of all cases that are false alarms.'],
        ['$\\sum_k (R_k - R_{k-1}) P_k$', 'np.sum(np.diff(np.r_[0, recall]) * precision)', 'Average precision: each step in recall weighted by the precision there.'],
      ],
    },
    notebook: {
      title: 'Lab 09.4 · Rare events',
      intro: 'Hold a detector’s TPR and FPR fixed and change only the prevalence; then compute average precision by hand and compare it with ROC AUC as incidents become rare.',
      cells: [{
        title: 'Bayes’ rule for precision',
        prose: 'TPR 0.9 and FPR 0.05 throughout. **Predict** the precision at 1% prevalence.',
        code: `tpr, fpr = 0.9, 0.05
for prevalence in [0.5, 0.1, 0.01]:
    caught = tpr * prevalence                  # true alerts, as a share of all cases
    false = fpr * (1 - prevalence)             # false alarms, as a share of all cases
    print(f"prevalence {prevalence:5.2f}: precision {caught / (caught + false):.3f}")`,
      }, {
        title: 'Average precision, step by step',
        prose: 'Sort by score; after each case record recall and precision; add each increase in recall times the precision at that point. Compared with scikit-learn’s value on six cases.',
        code: `import numpy as np
from sklearn.metrics import average_precision_score
scores = np.array([0.95, 0.9, 0.8, 0.6, 0.4, 0.3])
labels = np.array([1,    0,   1,   0,   1,   0])
order = np.argsort(-scores)
tp = np.cumsum(labels[order]); k = np.arange(1, len(labels) + 1)
recall, precision = tp / labels.sum(), tp / k
for r_, p_ in zip(recall, precision):
    print(f"recall {r_:.3f}  precision {p_:.3f}")
ap = np.sum(np.diff(np.r_[0, recall]) * precision)
print("AP by hand:", round(ap, 4), "  scikit-learn:", round(average_precision_score(labels, scores), 4))`,
      }, {
        title: 'ROC AUC barely moves; AP collapses',
        prose: 'The same kind of detector on data with 50%, 10% and 1% incidents. Each class’s scores come from the same two distributions every time; only the class mix changes. **Predict** which metric falls.',
        code: `from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(4)
for prevalence in [0.5, 0.1, 0.01]:
    n = 20000
    y = (rng.random(n) < prevalence).astype(int)
    s = rng.normal(np.where(y == 1, 1.5, 0.0), 1.0)      # incidents score about 1.5 higher
    print(f"prevalence {prevalence:5.2f}: ROC AUC {roc_auc_score(y, s):.3f}   AP {average_precision_score(y, s):.3f}   (random AP = {y.mean():.3f})")`,
        tryThis: 'Raise the separation from 1.5 to 3. At 1% prevalence, how much does AP improve compared with ROC AUC?',
      }],
    },
  },
  'l09-cost': {
    formulaTex: '$$\\text{cost}(t) = \\frac{C_{FP}\\,\\text{FP}(t) + C_{FN}\\,\\text{FN}(t)}{n}$$ $$\\text{alert when } p > \\frac{C_{FP}}{C_{FP} + C_{FN}}$$ $$\\text{cost of alerting} = (1 - p)\\,C_{FP}$$ $$\\text{cost of staying quiet} = p\\,C_{FN}$$',
    mathCode: {
      rows: [
        ['$C_{FP}, C_{FN}$', 'c_fp, c_fn = 1, 10', 'The cost of one false alarm and of one missed incident.'],
        ['$\\text{cost}(t)$', '(c_fp * fp + c_fn * fn) / n', 'Expected cost per case at threshold t.'],
        ['$\\arg\\min_t \\text{cost}(t)$', 'thresholds[np.argmin(costs)]', 'The empirical best threshold, found on validation data only.'],
        ['$\\frac{C_{FP}}{C_{FP} + C_{FN}}$', 'c_fp / (c_fp + c_fn)', 'The best threshold predicted by theory, if probabilities are calibrated.'],
        ['precision@k', 'y[np.argsort(-score)[:k]].mean()', 'With a fixed budget k: the fraction of the top-k alerts that are real.'],
      ],
    },
    notebook: {
      title: 'Lab 09.5 · Choosing a threshold from costs',
      intro: 'Price the lesson’s errors, find the cheapest threshold on validation data, compare it with the theoretical rule, then report it on untouched test data.',
      cells: [{
        title: 'The lesson’s cost',
        prose: '**Predict** the expected cost per case of 20 false alarms at cost 1 and 30 misses at cost 10, over 1,000 services.',
        code: `c_fp, c_fn = 1, 10
fp, fn, n = 20, 30, 1000
print("expected cost per case:", (c_fp * fp + c_fn * fn) / n)
print("theory’s threshold for calibrated probabilities:", round(c_fp / (c_fp + c_fn), 4))`,
      }, {
        title: 'Find the cheapest threshold on validation data',
        prose: 'Two simulated days from the same process: one to choose on, one to report on. **Predict** whether the empirical best is near 1/11 ≈ 0.09 (the scores are calibrated).',
        code: `import numpy as np
def day(seed, n=5000):
    rng = np.random.default_rng(seed)
    p = rng.beta(0.5, 4.5, n)
    return (rng.random(n) < p).astype(int), p          # truth, calibrated score

y_val, s_val = day(1)
thresholds = np.round(np.arange(0.01, 0.5, 0.01), 2)
def cost(y, s, t):
    alert = s >= t
    return (c_fp * np.sum(alert & (y == 0)) + c_fn * np.sum(~alert & (y == 1))) / len(y)
costs = np.array([cost(y_val, s_val, t) for t in thresholds])
t_best = thresholds[np.argmin(costs)]
print("cheapest threshold on validation:", t_best, "  cost", round(costs.min(), 4))
for t in [0.05, 0.09, 0.2, 0.5]:
    print(f"  cost at {t}: {cost(y_val, s_val, t):.4f}")`,
        tryThis: 'Make misses cost 50 instead of 10. Predict the new theoretical threshold, then rerun both cells.',
      }, {
        title: 'Freeze it, then report on test data',
        prose: 'The threshold is fixed before the test data is looked at. Then a capacity limit instead of a cost: alert on the top 50 scores.',
        code: `y_test, s_test = day(2)
alert = s_test >= t_best
tp = np.sum(alert & (y_test == 1)); fp = np.sum(alert & (y_test == 0)); fn = np.sum(~alert & (y_test == 1))
print(f"test, frozen t = {t_best}: cost {cost(y_test, s_test, t_best):.4f}   precision {tp / (tp + fp):.3f}   recall {tp / (tp + fn):.3f}")
k = 50
top = np.argsort(-s_test)[:k]
print(f"precision@{k}: {y_test[top].mean():.2f}")`,
      }],
    },
  },
  'l09-calibration': {
    formulaTex: '$$\\text{Brier} = \\frac1n\\sum_i (p_i - y_i)^2$$ $$\\text{ECE} = \\sum_b \\frac{|B_b|}{n}\\,\\big|\\bar p_b - \\bar y_b\\big|$$ $$p\' = \\sigma\\big(a\\cdot\\operatorname{logit}(p) + b\\big)$$',
    mathCode: {
      rows: [
        ['$\\frac1n\\sum_i (p_i - y_i)^2$', 'np.mean((p - y) ** 2)', 'The Brier score: squared error of the probabilities.'],
        ['$B_b$', 'in_bin = (p >= lo) & (p < hi)', 'The cases whose predicted probability falls in bin b.'],
        ['$\\bar p_b,\\ \\bar y_b$', 'p[in_bin].mean(), y[in_bin].mean()', 'Mean predicted probability and observed frequency in the bin.'],
        ['$\\frac{|B_b|}{n}|\\bar p_b - \\bar y_b|$', 'in_bin.mean() * abs(p[in_bin].mean() - y[in_bin].mean())', 'Each bin’s gap, weighted by its share of cases; summed over bins gives ECE.'],
        ['$\\sigma(a\\operatorname{logit}(p) + b)$', 'LogisticRegression().fit(logit(p_cal)[:, None], y_cal)', 'Platt scaling: a one-feature logistic regression on held-out cases.'],
      ],
    },
    notebook: {
      title: 'Lab 09.6 · Calibration',
      intro: 'Compute the Brier score from the lesson, draw a reliability table for a calibrated and an overconfident model, and repair the overconfident one with Platt scaling fitted on held-out data.',
      cells: [{
        title: 'The lesson’s Brier score',
        prose: '**Predict** the Brier score of predictions 0.8 and 0.3 for outcomes 1 and 0.',
        code: `import numpy as np
p = np.array([0.8, 0.3]); y = np.array([1, 0])
brier = np.mean((p - y) ** 2)
print("Brier:", brier)             # floating point: 0.2² + 0.3² is not stored exactly
print(f"Brier, rounded: {brier:.4f}")`,
      }, {
        title: 'Reliability table and ECE',
        prose: 'A calibrated model and an overconfident copy of it: the same ranking, with every log-odds doubled. **Predict** which bins of the overconfident model sit below the diagonal (predicted > observed).',
        code: `rng = np.random.default_rng(6)
n = 20000
p_true = rng.beta(2, 5, n)
y = (rng.random(n) < p_true).astype(int)
logit = lambda q: np.log(q / (1 - q))
sigmoid = lambda z: 1 / (1 + np.exp(-z))
models = {"calibrated": p_true, "overconfident": sigmoid(2 * logit(p_true))}

def reliability(p, y, bins=5):
    edges = np.linspace(0, 1, bins + 1); ece = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        in_bin = (p >= lo) & (p < hi) if hi < 1 else (p >= lo)
        if in_bin.any():
            gap = abs(p[in_bin].mean() - y[in_bin].mean())
            ece += in_bin.mean() * gap
            print(f"  bin {lo:.1f}–{hi:.1f}: predicted {p[in_bin].mean():.3f}  observed {y[in_bin].mean():.3f}  ({in_bin.sum()} cases)")
    return ece

for name, p in models.items():
    print(name)
    ece = reliability(p, y)
    print(f"  ECE {ece:.4f}   Brier {np.mean((p - y) ** 2):.4f}")`,
      }, {
        title: 'Platt scaling on held-out data',
        prose: 'Fit a one-feature logistic regression on half the cases, apply it to the other half. **Predict** what happens to AUC.',
        code: `from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
p_over = models["overconfident"]
half = n // 2                                    # fit on the first half, evaluate on the second
platt = LogisticRegression().fit(logit(p_over[:half])[:, None], y[:half])
a, b = platt.coef_[0, 0], platt.intercept_[0]
p_fixed = sigmoid(a * logit(p_over[half:]) + b)
print(f"fitted a = {a:.3f}, b = {b:.3f}   (the distortion doubled the log-odds, so a ≈ 0.5 undoes it)")
print("before:"); ece_before = reliability(p_over[half:], y[half:])
print("after:");  ece_after = reliability(p_fixed, y[half:])
print(f"ECE {ece_before:.4f} → {ece_after:.4f}   AUC {roc_auc_score(y[half:], p_over[half:]):.4f} → {roc_auc_score(y[half:], p_fixed):.4f}")`,
        tryThis: 'Fit Platt scaling on the same half you evaluate on. Does ECE look better or worse — and why is that number not trustworthy?',
      }],
    },
  },
}
