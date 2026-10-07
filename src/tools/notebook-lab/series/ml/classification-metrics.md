# Classification metrics

"The model is 96% accurate" sounds like the end of the story. It rarely is. Suppose 1 in 100 credit card transactions is fraud. A model that simply says "not fraud" every time is 99% accurate, and completely useless: it never catches a single fraud. Accuracy hides **which** mistakes a model makes, and in almost every real classification problem the two kinds of mistake have very different costs. Missing a cancer is far worse than a false alarm that leads to an extra test; wrongly blocking a customer's card is worse, for the bank, than letting a small fraud through.

This lesson takes classification results apart. It introduces the **confusion matrix**, which counts each kind of right and wrong answer, and the measures built from it: **precision**, **recall** and **F1**. It shows how the decision **threshold** trades one kind of mistake for the other, how the **ROC curve** and **AUC** summarise a model across every threshold, and how to choose a threshold from what mistakes actually cost.

## The problem with accuracy

```python type
import numpy as np

rng = np.random.default_rng(0)
is_fraud = rng.random(10_000) < 0.01
always_no = np.zeros(10_000, dtype=bool)
print("fraud cases:", is_fraud.sum())
print("accuracy of always saying 'not fraud':", (always_no == is_fraud).mean())
print("frauds caught:", (always_no & is_fraud).sum())
```

```output
fraud cases: 89
accuracy of always saying 'not fraud': 0.9911
frauds caught: 0
```

99% accuracy, zero frauds caught. When one class is rare, which is the usual situation for the class you care about (fraud, disease, defects, spam in a good inbox), accuracy is dominated by the common class and says almost nothing about the rare one. You need measures that look at each class separately.

## The confusion matrix

In a two-class problem, call the class you are trying to detect the **positive** class (fraud, disease, spam) and the other the **negative** class. "Positive" means "detected", not "good". Every prediction then falls into one of four boxes:

- **True positive** (TP): positive, predicted positive. A caught fraud.
- **False positive** (FP): negative, predicted positive. A false alarm.
- **True negative** (TN): negative, predicted negative. Correctly left alone.
- **False negative** (FN): positive, predicted negative. A missed fraud.

These four counts, arranged in a grid, are the **confusion matrix**. Using the same kind of model as the last lesson, logistic regression on the breast cancer data, now with **malignant** as the positive class since that is what screening is for:

```python type
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X, target = load_breast_cancer(return_X_y=True)
y = (target == 0).astype(int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.4, random_state=1)
scaler = StandardScaler().fit(X_train)
model = LogisticRegression().fit(scaler.transform(X_train), y_train)
p_test = model.predict_proba(scaler.transform(X_test))[:, 1]
y_pred = (p_test > 0.5).astype(int)

tp = int(((y_pred == 1) & (y_test == 1)).sum())
fp = int(((y_pred == 1) & (y_test == 0)).sum())
tn = int(((y_pred == 0) & (y_test == 0)).sum())
fn = int(((y_pred == 0) & (y_test == 1)).sum())
print(f"TP {tp}  FN {fn}")
print(f"FP {fp}  TN {tn}")
print("accuracy:", round((tp + tn) / len(y_test), 3))
```

```output
TP 77  FN 3
FP 4  TN 144
accuracy: 0.969
```

In the dataset the label 0 means malignant, so `y = (target == 0)` makes malignant the positive class, 1. `predict_proba(...)[:, 1]` takes each tumour's probability of class 1. Look at the two kinds of error separately: a handful of malignant tumours were missed (false negatives), and a handful of benign ones were flagged (false positives). Accuracy lumps them together; the confusion matrix keeps them apart.

## Precision and recall

Two ratios answer the two questions that matter.

**Recall** (also called **sensitivity** or the **true positive rate**): of all the actual positives, what fraction did the model catch?

\[
\text{recall} = \frac{TP}{TP + FN}
\]

**Precision**: of everything the model flagged as positive, what fraction really was positive?

\[
\text{precision} = \frac{TP}{TP + FP}
\]

For cancer screening, recall is the fraction of cancers found; precision is the fraction of alarms that were real. For a spam filter, recall is how much spam gets caught, and precision is how often something in the spam folder really is spam. Low precision there means real emails get lost, which users hate even more than missed spam.

The two pull in opposite directions. A model that flags everything has perfect recall and poor precision; one that flags only its single most certain case can have perfect precision and terrible recall. When you want a single number that is only high when **both** are high, use the **F1 score**, their harmonic mean:

\[
F_1 = \frac{2 \cdot \text{precision} \cdot \text{recall}}{\text{precision} + \text{recall}}
\]

The harmonic mean is dragged down by whichever of the two is smaller. A model with precision 1.0 and recall 0.1 has an ordinary average of 0.55, which sounds respectable, but an F1 of 2 × 1.0 × 0.1 / 1.1 ≈ 0.18, which correctly says it misses most positives. A model cannot score well on F1 by excelling at one and neglecting the other. One more measure appears often in medicine: **specificity**, the true negative rate, TN / (TN + FP): the fraction of healthy cases correctly cleared.

## The threshold trades one error for the other

A model that outputs probabilities does not have to use 0.5 as its cut-off. Lower the threshold and it flags more cases: recall rises, precision usually falls. Raise it and the reverse happens. Predict the shape of the two curves before running:

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X, target = load_breast_cancer(return_X_y=True)
y = (target == 0).astype(int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.4, random_state=1)
scaler = StandardScaler().fit(X_train)
model = LogisticRegression().fit(scaler.transform(X_train), y_train)
p_test = model.predict_proba(scaler.transform(X_test))[:, 1]

thresholds = np.linspace(0.02, 0.98, 49)
precision, recall = [], []
for t in thresholds:
    pred = p_test > t
    tp = (pred & (y_test == 1)).sum()
    precision.append(tp / max(pred.sum(), 1))
    recall.append(tp / (y_test == 1).sum())

fig, ax = plt.subplots()
ax.plot(thresholds, precision, label="precision")
ax.plot(thresholds, recall, label="recall")
ax.set_xlabel("threshold")
ax.legend()
plt.show()
```

(`max(pred.sum(), 1)` avoids dividing by zero when a threshold flags nothing.) As the threshold rises, recall falls: fewer cancers are flagged, so more are missed. Precision rises: what is flagged is more certainly malignant. There is no threshold that is best for everything. For screening, where a missed cancer is far worse than an extra biopsy, you would choose a **low** threshold and accept more false alarms. The threshold is a decision about costs, not a property of the model.

## The ROC curve and AUC

To compare **models**, rather than thresholds, it helps to summarise a model's behaviour across **all** thresholds at once. The **ROC curve** (the name, "receiver operating characteristic", comes from radar engineering in the Second World War) plots, for every threshold:

- on the y-axis, the **true positive rate** (recall): the fraction of positives caught;
- on the x-axis, the **false positive rate**, FP / (FP + TN): the fraction of negatives wrongly flagged.

A threshold of 1 flags nothing, the point (0, 0); a threshold of 0 flags everything, the point (1, 1). A perfect model reaches the top-left corner, catching every positive with no false alarms. A model that guesses at random runs along the diagonal.

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_curve, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X, target = load_breast_cancer(return_X_y=True)
y = (target == 0).astype(int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.4, random_state=1)
scaler = StandardScaler().fit(X_train)

fig, ax = plt.subplots(figsize=(5, 5))
for name, columns in [("all 30 features", slice(None)), ("one feature (column 1)", [1])]:
    model = LogisticRegression().fit(scaler.transform(X_train)[:, columns], y_train)
    scores = model.predict_proba(scaler.transform(X_test)[:, columns])[:, 1]
    fpr, tpr, _ = roc_curve(y_test, scores)
    ax.plot(fpr, tpr, label=f"{name}: AUC {roc_auc_score(y_test, scores):.3f}")
ax.plot([0, 1], [0, 1], "k--", label="random guessing")
ax.set_xlabel("false positive rate")
ax.set_ylabel("true positive rate (recall)")
ax.legend(fontsize=8)
plt.show()
```

`roc_curve` computes the rates at every useful threshold, and `roc_auc_score` the **area under the curve** (AUC). The full model's curve hugs the top-left corner; a model using only one weak feature (column 1 is the texture measurement) bows out much less.

The AUC has a beautifully concrete meaning: it is the **probability that a randomly chosen positive example gets a higher score than a randomly chosen negative one**. An AUC of 1 means every positive outranks every negative; 0.5 is a coin flip. Because it depends only on how the scores **rank** the examples, it does not depend on the threshold at all, which makes it a good single number for comparing models before a threshold is chosen.

One caution. When positives are very rare, the false positive rate stays tiny even when there are many false alarms, because it is divided by the huge number of negatives, so the ROC curve can look excellent while precision is poor. For rare positives, also look at precision directly, or at the **precision–recall curve** (precision plotted against recall across thresholds).

## Choosing a threshold from costs

The right threshold comes from what mistakes cost. Suppose missing a cancer (a false negative) is judged 20 times as costly as a false alarm (a false positive). Then choose the threshold that minimises the total cost on validation data:

```python type
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X, target = load_breast_cancer(return_X_y=True)
y = (target == 0).astype(int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.4, random_state=1)
scaler = StandardScaler().fit(X_train)
model = LogisticRegression().fit(scaler.transform(X_train), y_train)
p_test = model.predict_proba(scaler.transform(X_test))[:, 1]

cost_fn, cost_fp = 20, 1
thresholds = np.linspace(0.01, 0.99, 99)
costs = []
for t in thresholds:
    pred = p_test > t
    fn = (~pred & (y_test == 1)).sum()
    fp = (pred & (y_test == 0)).sum()
    costs.append(cost_fn * fn + cost_fp * fp)
best = thresholds[int(np.argmin(costs))]
print(f"best threshold {best:.2f}, total cost {min(costs)} (at 0.5 the cost is {costs[49]})")
```

```output
best threshold 0.09, total cost 44 (at 0.5 the cost is 64)
```

(`~pred` flips the booleans: not predicted positive.) With false negatives this expensive, the best threshold is well below 0.5. There is also a neat theoretical answer: if the probabilities are trustworthy, the cost-minimising rule is to predict positive whenever `p > cost_fp / (cost_fp + cost_fn)`, here 1/21 ≈ 0.05. In practice, pick the threshold on validation data and report the final result on a separate test set; this demo uses the test set only to keep the code short.

## Can you trust the probabilities?

A threshold rule like that relies on the probabilities meaning what they say: of all the tumours given a probability of 0.3, about 30% should really be malignant. A model whose probabilities behave like this is **calibrated**. Check it by grouping examples by predicted probability and comparing each group's average prediction with the fraction that were actually positive:

```python type
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

X, target = load_breast_cancer(return_X_y=True)
y = (target == 0).astype(int)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.4, random_state=1)
scaler = StandardScaler().fit(X_train)
model = LogisticRegression().fit(scaler.transform(X_train), y_train)
p_test = model.predict_proba(scaler.transform(X_test))[:, 1]

edges = [0, 0.1, 0.5, 0.9, 1.0]
for low, high in zip(edges[:-1], edges[1:]):
    in_bin = (p_test >= low) & (p_test < high) if high < 1 else (p_test >= low)
    if in_bin.sum():
        print(f"predicted {low:.1f}–{high:.1f}: {in_bin.sum():>3} tumours, mean prediction {p_test[in_bin].mean():.2f}, actually malignant {y_test[in_bin].mean():.2f}")
```

```output
predicted 0.0–0.1: 127 tumours, mean prediction 0.01, actually malignant 0.02
predicted 0.1–0.5:  20 tumours, mean prediction 0.21, actually malignant 0.05
predicted 0.5–0.9:  12 tumours, mean prediction 0.67, actually malignant 0.67
predicted 0.9–1.0:  69 tumours, mean prediction 0.99, actually malignant 1.00
```

Logistic regression is usually reasonably calibrated, because its log loss rewards honest probabilities. Many other models (you will meet some) are not, and their probabilities need correcting before being used for decisions. Here the confident bins match almost perfectly. The 0.1–0.5 bin looks worse: its predictions average 0.21, so about 4 of its 20 tumours would be expected to be malignant, but only 1 is. Is that a sign of bad calibration, or bad luck? Simulating 20 tumours with these exact probabilities gives 1 or fewer malignant about 5% of the time: unusual, but not shocking with so few tumours. A bin of 20 cannot settle the question, which is the estimation lesson again; checking calibration properly needs hundreds of examples in each bin.

::: challenge The four counts [easy]
Write a function `confusion_counts(y_true, y_pred)` that takes two arrays of 0/1 labels (1 is the positive class) and returns a tuple `(tp, fp, tn, fn)` of plain integers. Then write `precision_recall_f1(y_true, y_pred)` returning `(precision, recall, f1)`. If there are no predicted positives, define precision as 0; if there are no actual positives, define recall as 0; if both precision and recall are 0, define F1 as 0.

```python starter
import numpy as np

def confusion_counts(y_true, y_pred):
    return 0, 0, 0, 0

def precision_recall_f1(y_true, y_pred):
    return 0.0, 0.0, 0.0

print(confusion_counts(np.array([1, 0, 1, 1, 0]), np.array([1, 1, 0, 1, 0])))
```

```python solution
import numpy as np

def confusion_counts(y_true, y_pred):
    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    tn = int(((y_pred == 0) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())
    return tp, fp, tn, fn

def precision_recall_f1(y_true, y_pred):
    tp, fp, tn, fn = confusion_counts(y_true, y_pred)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1

print(confusion_counts(np.array([1, 0, 1, 1, 0]), np.array([1, 1, 0, 1, 0])))
```

```python test
import numpy as _np
from sklearn.metrics import precision_score as _ps, recall_score as _rs, f1_score as _fs
assert "confusion_counts" in dir() and "precision_recall_f1" in dir(), "Keep both function names."
_t = _np.array([1, 0, 1, 1, 0])
_p = _np.array([1, 1, 0, 1, 0])
assert tuple(confusion_counts(_t, _p)) == (2, 1, 1, 1), f"For the example the counts should be (tp, fp, tn, fn) = (2, 1, 1, 1), but got {confusion_counts(_t, _p)}."
from sklearn.metrics import confusion_matrix as _cm
_rng0 = _np.random.default_rng(11)
_yt0 = _rng0.integers(0, 2, 50)
_yp0 = _np.where(_rng0.random(50) < 0.3, 1, _yt0)
_tn, _fp, _fn, _tp = _cm(_yt0, _yp0).ravel()
_got0 = tuple(confusion_counts(_yt0, _yp0))
assert _got0 == (_tp, _fp, _tn, _fn), f"On a larger example the counts should be (tp, fp, tn, fn) = {(int(_tp), int(_fp), int(_tn), int(_fn))}, but got {_got0}. Did you swap false positives and false negatives, or the order of the arguments (y_true first, then y_pred)?"
assert all(type(_v) is int for _v in _got0), "Return plain Python integers: wrap each count in int()."
_rng = _np.random.default_rng(3)
for _ in range(3):
    _yt = _rng.integers(0, 2, 60)
    _yp = _rng.integers(0, 2, 60)
    _got = precision_recall_f1(_yt, _yp)
    _want = (_ps(_yt, _yp), _rs(_yt, _yp), _fs(_yt, _yp))
    assert _np.allclose(_got, _want), f"precision, recall and F1 should be {tuple(round(v, 4) for v in _want)}, but got {tuple(round(v, 4) for v in _got)}."
assert tuple(precision_recall_f1(_np.array([1, 1]), _np.array([0, 0]))) == (0.0, 0.0, 0.0), "With no predicted positives, precision, recall and F1 should all be 0."
assert tuple(precision_recall_f1(_np.array([0, 0]), _np.array([1, 0])))[1:] == (0.0, 0.0), "With no actual positives, recall (and so F1) should be 0."
"SUCCESS: The four boxes and the three measures built from them."
```

Hint: Each count combines two boolean conditions with `&`. For the ratios, check the denominator is not zero before dividing: `tp / (tp + fp) if tp + fp else 0.0`.
:::

::: challenge AUC from its meaning [medium]
Write a function `auc(y_true, scores)` that computes the area under the ROC curve **from its meaning**: the probability that a randomly chosen positive example has a higher score than a randomly chosen negative one. Compare every positive with every negative (broadcasting makes this one line): count a pair as 1 if the positive scores higher, 0.5 if they tie, and 0 otherwise, and return the average over all pairs. Do not use scikit-learn; the check compares your answer with `roc_auc_score`.

```python starter
import numpy as np

def auc(y_true, scores):
    return 0.5

print(auc(np.array([0, 0, 1, 1]), np.array([0.1, 0.4, 0.35, 0.8])))
```

```python solution
import numpy as np

def auc(y_true, scores):
    positive = scores[y_true == 1]
    negative = scores[y_true == 0]
    comparisons = (positive.reshape(-1, 1) > negative) + 0.5 * (positive.reshape(-1, 1) == negative)
    return float(comparisons.mean())

print(auc(np.array([0, 0, 1, 1]), np.array([0.1, 0.4, 0.35, 0.8])))
```

```python test
import numpy as _np
from sklearn.metrics import roc_auc_score as _ras
assert "auc" in dir(), "Keep the function's name as auc."
assert "sklearn" not in _source and "roc_auc" not in _source, "Compute it from the pairwise meaning, without scikit-learn."
assert _np.isclose(auc(_np.array([0, 0, 1, 1]), _np.array([0.1, 0.4, 0.35, 0.8])), 0.75), "For the example, 3 of the 4 positive-negative pairs are ordered correctly, so the AUC is 0.75."
_rng = _np.random.default_rng(4)
for _ in range(3):
    _y = _rng.integers(0, 2, 80)
    _s = _rng.normal(size=80) + _y
    assert _np.isclose(auc(_y, _s), _ras(_y, _s)), f"auc should equal roc_auc_score ({_ras(_y, _s):.5f}), but got {auc(_y, _s)}."
_ties = _np.array([0.5, 0.5, 0.5, 0.5])
assert _np.isclose(auc(_np.array([0, 1, 0, 1]), _ties), 0.5), "Tied scores should count as half a correct pair each."
"SUCCESS: The AUC really is the chance that a positive outranks a negative."
```

Hint: Select the positive scores and the negative scores. `positive.reshape(-1, 1) > negative` broadcasts into a table comparing every positive with every negative. Add half a point for ties, then take the mean.
:::

::: challenge A screening threshold [medium]
Cost ratios are often hard to agree on. Screening programmes usually set a rule instead: **catch at least 95% of the positives**, and then flag as few people as possible. Among the thresholds that achieve the required recall, the best is the **highest**, because a higher threshold flags fewer cases and so gives fewer false alarms.

Write a function `screening_threshold(y_true, p, min_recall, thresholds)` that returns a tuple `(threshold, precision)`: the highest threshold in the list whose recall is at least `min_recall` (predicting positive when `p > threshold`), and the precision at that threshold. If no threshold reaches the required recall, return `(None, None)`.

Then, for the starter's predictions, store the result for a required recall of 0.95 in `rule_95`, and for 0.8 in `rule_80`.

```python starter
import numpy as np

def screening_threshold(y_true, p, min_recall, thresholds):
    return None, None

rng = np.random.default_rng(5)
y_true = (rng.random(500) < 0.2).astype(int)
p = np.clip(0.2 + 0.5 * (y_true - 0.2) + rng.normal(0, 0.2, 500), 0, 1)
grid = list(np.round(np.linspace(0.05, 0.95, 19), 2))

rule_95 = None
rule_80 = None
print(rule_95, rule_80)
```

```python solution
import numpy as np

def screening_threshold(y_true, p, min_recall, thresholds):
    best = (None, None)
    for t in sorted(thresholds):
        pred = p > t
        tp = (pred & (y_true == 1)).sum()
        recall = tp / (y_true == 1).sum()
        if recall >= min_recall:
            best = (t, tp / pred.sum() if pred.sum() else 0.0)
    return best

rng = np.random.default_rng(5)
y_true = (rng.random(500) < 0.2).astype(int)
p = np.clip(0.2 + 0.5 * (y_true - 0.2) + rng.normal(0, 0.2, 500), 0, 1)
grid = list(np.round(np.linspace(0.05, 0.95, 19), 2))

rule_95 = screening_threshold(y_true, p, 0.95, grid)
rule_80 = screening_threshold(y_true, p, 0.8, grid)
print(rule_95, rule_80)
```

```python test
import numpy as _np
assert "screening_threshold" in dir(), "Keep the function's name as screening_threshold."
def _ref(y, p, mr, ts):
    best = (None, None)
    for t in sorted(ts):
        pred = p > t
        tp = (pred & (y == 1)).sum()
        if tp / (y == 1).sum() >= mr:
            best = (t, tp / pred.sum() if pred.sum() else 0.0)
    return best
_yt = _np.array([1, 1, 1, 1, 0, 0, 0, 0, 0, 0])
_pt = _np.array([0.9, 0.8, 0.6, 0.3, 0.7, 0.5, 0.4, 0.2, 0.1, 0.05])
_got = screening_threshold(_yt, _pt, 0.75, [0.1, 0.25, 0.55, 0.85])
assert _got[0] == 0.55, f"In the small example, thresholds 0.1, 0.25 and 0.55 all catch at least 75% of the positives; the highest of them is 0.55, but you returned {_got[0]}."
assert _np.isclose(_got[1], 3 / 4), f"At threshold 0.55 the model flags 4 cases, 3 of them positive, so precision is 0.75; you returned {_got[1]}."
assert tuple(screening_threshold(_yt, _pt, 0.75, [0.85, 0.55, 0.25, 0.1])) == tuple(_got), "The answer should not depend on the order of the threshold list."
assert tuple(screening_threshold(_yt, _pt, 1.0, [0.5, 0.85])) == (None, None), "When no threshold reaches the required recall, return (None, None)."
_rng = _np.random.default_rng(5)
_y = (_rng.random(500) < 0.2).astype(int)
_p = _np.clip(0.2 + 0.5 * (_y - 0.2) + _rng.normal(0, 0.2, 500), 0, 1)
_g = list(_np.round(_np.linspace(0.05, 0.95, 19), 2))
for _name, _mr in (("rule_95", 0.95), ("rule_80", 0.8)):
    _val = globals().get(_name)
    _want = _ref(_y, _p, _mr, _g)
    assert _val is not None and _np.isclose(_val[0], _want[0]) and _np.isclose(_val[1], _want[1]), f"{_name} should be about ({_want[0]}, {_want[1]:.3f}), but it is {_val}."
"SUCCESS: Demanding 95% recall forces the threshold down to 0.25, where only about half of the flagged cases are real; settling for 80% allows 0.4 and a precision of about 0.75. That trade is the decision a screening programme has to make."
```

Hint: Loop over the thresholds from lowest to highest, computing recall at each; every time recall is still high enough, remember that threshold and its precision. The last one remembered is the highest that works.
:::

## What you learned

- Accuracy hides which mistakes are made, and with a rare class it can be high for a useless model.
- The confusion matrix counts true positives, false positives, true negatives and false negatives. The positive class is the one being detected.
- Recall = TP/(TP + FN): the fraction of positives caught. Precision = TP/(TP + FP): the fraction of alarms that are real. F1, their harmonic mean, is high only when both are. Specificity = TN/(TN + FP).
- Lowering the threshold raises recall and usually lowers precision; the right threshold depends on the costs of each kind of mistake.
- The ROC curve plots true positive rate against false positive rate across all thresholds; the AUC is the probability that a random positive outranks a random negative. For rare positives, also check precision or the precision–recall curve.
- Choose the threshold that minimises total cost on validation data; with calibrated probabilities, predict positive when p > cost_fp / (cost_fp + cost_fn). Or, as screening programmes do, require a minimum recall and take the highest threshold that achieves it.
- A model is calibrated if its predicted probabilities match observed frequencies.

So far every classifier has had two classes. Next you will extend logistic regression to any number of classes with softmax regression, and use it to recognise handwritten digits.
