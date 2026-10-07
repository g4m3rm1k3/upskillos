# Data leakage and imbalanced data

Two problems account for a large share of machine learning projects that look excellent in testing and fail in use. The first is **data leakage**: information reaches the model during training that it would not have when making real predictions, so the validation score is a fantasy. The second is **imbalanced classes**: the thing you care about is rare, so a model can score 98% accuracy while never once finding it.

You have met both in passing: preprocessing leakage in the workflow lesson, target encoding in the last one, and accuracy's blindness to rare classes in the classification metrics lesson. This lesson treats them properly. It shows three more ways leakage creeps in (features that are consequences of the answer, repeated measurements of the same thing, and time), how to detect and prevent each, and then the main tools for rare classes: stratified splits, class weights, resampling and choosing the operating point.

## The test: could you know this at prediction time?

Every form of leakage fails one question: **at the moment the model will really be used, would this information be available?** A validation setup must mimic that moment exactly: the same features, computed from the same information, about examples the model has genuinely never seen in any form. Leakage is any way the validation setup is more generous than reality.

## Target leakage: features caused by the answer

A hospital wants to predict which patients have a heart condition, from age, blood pressure and cholesterol. A tempting extra column in the records is `on_medication`: whether the patient takes heart medication. It predicts the condition superbly, for the obvious reason: patients get the medication **because** they were diagnosed. At the moment the model would be used, for a new patient before diagnosis, that column does not exist yet.

```python type
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(1)
n = 1000
age = rng.normal(50, 12, n)
blood_pressure = rng.normal(130, 15, n)
cholesterol = rng.normal(200, 30, n)
risk = 0.04 * (age - 50) + 0.03 * (blood_pressure - 130) + 0.01 * (cholesterol - 200) + rng.normal(0, 1, n)
condition = (risk > 1.0).astype(int)
on_medication = np.where(condition == 1, rng.random(n) < 0.9, rng.random(n) < 0.03).astype(int)
patients = pd.DataFrame({"age": age, "blood_pressure": blood_pressure, "cholesterol": cholesterol, "on_medication": on_medication})

model = make_pipeline(StandardScaler(), LogisticRegression())
with_leak = cross_val_score(model, patients, condition, cv=5, scoring="roc_auc").mean()
without = cross_val_score(model, patients.drop(columns="on_medication"), condition, cv=5, scoring="roc_auc").mean()
print(f"AUC with on_medication: {with_leak:.3f}   without it: {without:.3f}")

print("each feature on its own:")
for column in patients.columns:
    print(f"  {column:<15} AUC {roc_auc_score(condition, patients[column]):.3f}")
```

```output
AUC with on_medication: 0.956   without it: 0.765
each feature on its own:
  age             AUC 0.691
  blood_pressure  AUC 0.668
  cholesterol     AUC 0.585
  on_medication   AUC 0.928
```

`scoring="roc_auc"` makes `cross_val_score` report the AUC from the classification metrics lesson instead of accuracy. With the leaky column the model scores 0.956; without it, 0.765. The 0.765 is the honest number, the one the hospital would actually get. A model deployed on the strength of 0.956 would disappoint badly.

The second part shows the standard way to **detect** target leakage: score each feature **on its own**. Using a single column as the score, the real risk factors each manage 0.59 to 0.69, while `on_medication` alone reaches 0.93. A single feature that predicts almost perfectly is rarely a discovery; much more often it is a leak. The same warning sign appears as one feature dominating a tree model's importances. Typical culprits are anything recorded after or because of the outcome: treatments, follow-up actions, account closure reasons, "days until churn", or an ID that was assigned in order of the outcome.

## Group leakage: the same thing, twice

A clinic records 10 scans from each of 60 patients and wants to predict a diagnosis from a scan. Every patient's scans look alike (the same body), and the diagnosis is the same for all of that patient's scans. Now split the 600 scans randomly into folds: almost every patient has scans in both training and test folds. The model can score highly by **recognising the patient**, which is useless for a new patient it has never seen.

The fix is to split by **group**: all of a patient's scans go to the same fold. scikit-learn's `GroupKFold` does this, given a `groups` array saying which patient each row belongs to:

```python type
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold, KFold, cross_val_score

rng = np.random.default_rng(0)
patients, scans_each = 60, 10
diagnosis = rng.integers(0, 2, patients)
appearance = rng.normal(0, 1, (patients, 20))
X = np.repeat(appearance, scans_each, axis=0) + rng.normal(0, 0.3, (patients * scans_each, 20))
X[:, 0] += 0.4 * np.repeat(diagnosis, scans_each)
y = np.repeat(diagnosis, scans_each)
groups = np.repeat(np.arange(patients), scans_each)

forest = RandomForestClassifier(n_estimators=100, random_state=0)
random_folds = cross_val_score(forest, X, y, cv=KFold(5, shuffle=True, random_state=0)).mean()
group_folds = cross_val_score(forest, X, y, cv=GroupKFold(5), groups=groups).mean()
print(f"random folds: {random_folds:.3f}")
print(f"group folds:  {group_folds:.3f}")
```

```output
random folds: 0.985
group folds:  0.562
```

`np.repeat(a, 10, axis=0)` repeats each row 10 times, giving each patient 10 near-identical scans. Random folds report 0.985. Group folds report 0.56: the diagnosis signal here is weak, and almost all of the 0.985 came from recognising patients. The same trap appears whenever rows come in related clusters: several photos of the same object, many transactions from the same customer, repeated sensor readings from the same machine, near-duplicate documents.

## Time leakage: training on the future

When data arrives over time and the model will predict the future, a random split lets the model train on examples from **after** the ones it is tested on. Patterns that only became visible later (a price trend, a new kind of fraud) leak backwards, and the score is too optimistic. The fix is to validate as you would deploy: train on the past, test on what came after. `TimeSeriesSplit` makes folds that always test on a later block than they train on; the time series lesson builds on this.

Features can leak time too. "Average spend over the customer's lifetime" computed from the whole dataset includes spending that happened after the prediction date. Every feature must be computed only from information available **at** the moment of prediction.

## Imbalanced classes

Now the second problem. Here is a dataset where only 2% of examples are positive: think fraud, a rare disease or a failing machine part.

```python type
import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = make_classification(n_samples=5000, n_features=10, n_informative=4, weights=[0.98],
                           flip_y=0, class_sep=2.0, random_state=0)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, stratify=y, random_state=0)
print(f"positives: {y_train.sum()} of {len(y_train)} in training, {y_test.sum()} of {len(y_test)} in test")

for weights in [None, "balanced"]:
    model = make_pipeline(StandardScaler(), LogisticRegression(class_weight=weights)).fit(X_train, y_train)
    predicted = model.predict(X_test)
    caught = (predicted & (y_test == 1)).sum()
    print(f"class_weight={str(weights):<9} accuracy {(predicted == y_test).mean():.3f}, "
          f"flagged {predicted.sum():>3}, caught {caught} of {y_test.sum()} positives")
print(f"always predicting negative: accuracy {(y_test == 0).mean():.3f}")
```

```output
positives: 50 of 2500 in training, 50 of 2500 in test
class_weight=None      accuracy 0.983, flagged  18, caught 13 of 50 positives
class_weight=balanced  accuracy 0.892, flagged 309, caught 44 of 50 positives
always predicting negative: accuracy 0.980
```

`make_classification` generates a classification problem with the given class proportions (`weights=[0.98]` means 98% in class 0). Two things in the setup matter. `stratify=y` in `train_test_split` keeps the 2% rate in both halves; with so few positives, a plain random split could easily leave one side with far fewer. (`cross_val_score` already stratifies its folds for classifiers.)

The plain model scores 0.983 accuracy, barely above the 0.980 of always saying "negative", and catches only 13 of the 50 positives. The loss treats every example equally, and with 49 negatives for every positive, the cheapest strategy is to say "negative" unless the evidence is overwhelming.

**Class weights** change that. `class_weight="balanced"` multiplies each example's contribution to the loss by a weight inversely proportional to its class's frequency, so the 50 positives count as much in total as the 2,450 negatives. Now the model catches 44 of the 50, at the price of flagging 309 cases. Accuracy falls to 0.89, which is irrelevant: the question is whether investigating 309 cases to find 44 real ones is worth it, and that is a decision about costs, as in the "choosing a threshold from costs" section of the classification metrics lesson.

## Choosing the operating point

Class weights are one way to move a model to a different operating point. Lowering the threshold of the unweighted model is another. Which is better? Compare them where you will use them. Suppose the requirement is to catch 44 of the 50 positives. How many cases must each model flag to do that?

```python type
import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = make_classification(n_samples=5000, n_features=10, n_informative=4, weights=[0.98],
                           flip_y=0, class_sep=2.0, random_state=0)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, stratify=y, random_state=0)

for weights in [None, "balanced"]:
    model = make_pipeline(StandardScaler(), LogisticRegression(class_weight=weights)).fit(X_train, y_train)
    scores = model.predict_proba(X_test)[:, 1]
    threshold = np.sort(scores[y_test == 1])[::-1][43]
    flagged = (scores >= threshold).sum()
    print(f"class_weight={str(weights):<9} must flag {flagged:>3} cases to catch 44 positives; "
          f"average precision {average_precision_score(y_test, scores):.3f}")
```

```output
class_weight=None      must flag 759 cases to catch 44 positives; average precision 0.488
class_weight=balanced  must flag 300 cases to catch 44 positives; average precision 0.257
```

The threshold is set to the 44th-highest score among the true positives, so that exactly 44 are caught. The plain model must flag 759 cases to get there; the weighted model only 300. Here, weighting changed which cases the model ranks highest, not just where the line is drawn, and at this operating point it is much better. That can happen because no straight line separates these classes well (`make_classification` places each class in two separate clumps): making the rare class's mistakes expensive **tilts** the best line towards the positives that are hardest to catch, rather than merely shifting it.

But the **average precision** (the area under the precision–recall curve, scikit-learn's single-number summary of it; a random model scores about the positive rate, here 0.02) says the plain model is better overall: 0.49 against 0.26. Both are true. The plain model ranks its top few cases better; the weighted model is better when you need to catch nearly everything. No single number settles it: decide the operating point the application needs, then compare models there.

## Resampling

Instead of weighting, you can change the training data: **oversample** the rare class (duplicate its examples, or create synthetic ones with methods such as SMOTE) or **undersample** the common class (discard some of its examples). The effect on most models is similar to class weights.

Resampling has one sharp edge, which ties the two halves of this lesson together: it must happen **inside** each training fold, after splitting. Oversample before splitting, and copies of the same rare example land in both training and test folds: group leakage, created by you. The last challenge measures how much that inflates the score.

::: challenge Find the leak [easy]
Write `leak_suspects(df, y, threshold)` that scores each column of the DataFrame `df` on its own against the 0/1 target `y` with `roc_auc_score(y, df[column])`, and returns a list of the names of the columns whose score is above `threshold` **in either direction** (a column whose AUC is below 0.5 predicts just as well in reverse, so use `max(auc, 1 - auc)`), in the DataFrame's column order.

Then apply it to the starter's customer table with threshold 0.9, and store the result in `suspects`.

```python starter
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

def leak_suspects(df, y, threshold):
    return []

rng = np.random.default_rng(4)
n = 800
tenure = rng.integers(1, 72, n)
monthly_bill = rng.normal(60, 20, n)
support_calls = rng.poisson(2, n)
churned = (rng.random(n) < 1 / (1 + np.exp(0.05 * tenure - 0.4 * support_calls - 0.5))).astype(int)
days_since_last_login = np.where(churned == 1, rng.integers(30, 120, n), rng.integers(0, 40, n))
customers = pd.DataFrame({"tenure": tenure, "monthly_bill": monthly_bill, "support_calls": support_calls,
                          "days_since_last_login": days_since_last_login})

suspects = None
print(suspects)
```

```python solution
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

def leak_suspects(df, y, threshold):
    found = []
    for column in df.columns:
        auc = roc_auc_score(y, df[column])
        if max(auc, 1 - auc) > threshold:
            found.append(column)
    return found

rng = np.random.default_rng(4)
n = 800
tenure = rng.integers(1, 72, n)
monthly_bill = rng.normal(60, 20, n)
support_calls = rng.poisson(2, n)
churned = (rng.random(n) < 1 / (1 + np.exp(0.05 * tenure - 0.4 * support_calls - 0.5))).astype(int)
days_since_last_login = np.where(churned == 1, rng.integers(30, 120, n), rng.integers(0, 40, n))
customers = pd.DataFrame({"tenure": tenure, "monthly_bill": monthly_bill, "support_calls": support_calls,
                          "days_since_last_login": days_since_last_login})

suspects = leak_suspects(customers, churned, 0.9)
print(suspects)
```

```python test
import numpy as _np
import pandas as _pd
assert "leak_suspects" in dir(), "Keep the function's name as leak_suspects."
_y = _np.array([0, 0, 0, 1, 1, 1])
_df = _pd.DataFrame({"fine": [1, 3, 2, 2, 4, 3], "leak": [0, 0, 0, 1, 1, 1], "reverse": [9, 8, 7, 1, 2, 3]})
_got = leak_suspects(_df, _y, 0.9)
assert list(_got) == ["leak", "reverse"], f"In the small example, 'leak' predicts perfectly and 'reverse' predicts perfectly in reverse (AUC 0), so both are suspects, in column order; got {_got}."
assert list(leak_suspects(_df, _y, 1.0)) == [], "A column must score strictly above the threshold."
assert suspects == ["days_since_last_login"], f"On the customer table the only suspect should be days_since_last_login, but got {suspects}."
"SUCCESS: days_since_last_login predicts churn almost perfectly because customers who have already left stop logging in: it describes the outcome rather than predicting it."
```

Hint: Loop over `df.columns`, compute each column's AUC, and keep the column when `max(auc, 1 - auc) > threshold`.
:::

::: challenge Split by patient [medium]
Write `group_test_mask(groups, test_fraction, seed)` that returns a boolean array, one entry per row, which is `True` for rows in the test set. Choose test **groups**, not rows: take the distinct groups in sorted order (`np.unique`), shuffle them with `np.random.default_rng(seed).permutation(...)`, and put the first `round(test_fraction × number of groups)` of them in the test set.

Then, on the starter's scan data, train `RandomForestClassifier(n_estimators=100, random_state=0)` on the rows outside your mask and store its accuracy on the rows inside in `group_accuracy`. For comparison, store in `row_accuracy` the accuracy with a plain random row split from `train_test_split(X, y, test_size=0.25, random_state=0)`.

```python starter
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

def group_test_mask(groups, test_fraction, seed):
    return np.zeros(len(groups), dtype=bool)

rng = np.random.default_rng(0)
patients, scans_each = 60, 10
diagnosis = rng.integers(0, 2, patients)
appearance = rng.normal(0, 1, (patients, 20))
X = np.repeat(appearance, scans_each, axis=0) + rng.normal(0, 0.3, (patients * scans_each, 20))
X[:, 0] += 0.4 * np.repeat(diagnosis, scans_each)
y = np.repeat(diagnosis, scans_each)
groups = np.repeat(np.arange(patients), scans_each)

group_accuracy = 0.0
row_accuracy = 0.0
print(group_accuracy, row_accuracy)
```

```python solution
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

def group_test_mask(groups, test_fraction, seed):
    unique = np.unique(groups)
    shuffled = np.random.default_rng(seed).permutation(unique)
    test_groups = shuffled[:round(test_fraction * len(unique))]
    return np.isin(groups, test_groups)

rng = np.random.default_rng(0)
patients, scans_each = 60, 10
diagnosis = rng.integers(0, 2, patients)
appearance = rng.normal(0, 1, (patients, 20))
X = np.repeat(appearance, scans_each, axis=0) + rng.normal(0, 0.3, (patients * scans_each, 20))
X[:, 0] += 0.4 * np.repeat(diagnosis, scans_each)
y = np.repeat(diagnosis, scans_each)
groups = np.repeat(np.arange(patients), scans_each)

test = group_test_mask(groups, 0.25, 0)
forest = RandomForestClassifier(n_estimators=100, random_state=0).fit(X[~test], y[~test])
group_accuracy = forest.score(X[test], y[test])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=0)
row_accuracy = RandomForestClassifier(n_estimators=100, random_state=0).fit(X_train, y_train).score(X_test, y_test)
print(group_accuracy, row_accuracy)
```

```python test
import numpy as _np
from sklearn.ensemble import RandomForestClassifier as _RFC
from sklearn.model_selection import train_test_split as _tts
assert "group_test_mask" in dir(), "Keep the function's name as group_test_mask."
_g = _np.array(["b", "a", "a", "c", "b", "d", "c", "d"])
_m = _np.asarray(group_test_mask(_g, 0.5, 1))
assert _m.dtype == bool and len(_m) == len(_g), "Return a boolean array with one entry per row."
for _grp in _np.unique(_g):
    assert len(set(_m[_g == _grp])) == 1, f"Group {_grp!r} has rows on both sides of the split. A group must be entirely in or entirely out."
_want = _np.isin(_g, _np.random.default_rng(1).permutation(_np.unique(_g))[:2])
assert (_m == _want).all(), "Your test groups differ from the expected ones. Shuffle np.unique(groups) with np.random.default_rng(seed).permutation and take the first round(test_fraction × number of groups)."
_r = _np.random.default_rng(0)
_d = _r.integers(0, 2, 60)
_a = _r.normal(0, 1, (60, 20))
_X = _np.repeat(_a, 10, axis=0) + _r.normal(0, 0.3, (600, 20))
_X[:, 0] += 0.4 * _np.repeat(_d, 10)
_y = _np.repeat(_d, 10)
_grps = _np.repeat(_np.arange(60), 10)
_t = _np.isin(_grps, _np.random.default_rng(0).permutation(_np.arange(60))[:15])
_ga = _RFC(n_estimators=100, random_state=0).fit(_X[~_t], _y[~_t]).score(_X[_t], _y[_t])
_a1, _a2, _b1, _b2 = _tts(_X, _y, test_size=0.25, random_state=0)
_ra = _RFC(n_estimators=100, random_state=0).fit(_a1, _b1).score(_a2, _b2)
assert _np.isclose(group_accuracy, _ga), f"group_accuracy should be {_ga:.3f}."
assert _np.isclose(row_accuracy, _ra), f"row_accuracy should be {_ra:.3f}."
f"SUCCESS: Split by rows, the forest scores {_ra:.2f}; split by patient, {_ga:.2f}. Only the second number says anything about a new patient."
```

Hint: `np.unique(groups)` gives the sorted distinct groups; shuffle them, slice off the test groups, and `np.isin(groups, test_groups)` marks every row belonging to one of them.
:::

::: challenge Oversample inside the fold [medium]
Write `oversample(X, y, seed)` that balances a 0/1 dataset by **duplicating** randomly chosen rows of the rarer class: with `rng = np.random.default_rng(seed)`, draw `(count of majority − count of minority)` row positions from the minority rows **with replacement** (`rng.choice(minority_rows, size, replace=True)`), and return `X` and `y` with those copies appended at the end.

Then measure recall on the starter's data with `StratifiedKFold(5, shuffle=True, random_state=0)` and a `DecisionTreeClassifier(random_state=0)`, in two ways, taking the mean recall over the five folds:

- `honest_recall`: split first, then oversample only the training part of each fold (seed 0), and test on the untouched test part.
- `leaky_recall`: oversample the whole dataset first (seed 0), then run the same folds on the oversampled data.

```python starter
import numpy as np
from sklearn.datasets import make_classification
from sklearn.metrics import recall_score
from sklearn.model_selection import StratifiedKFold
from sklearn.tree import DecisionTreeClassifier

def oversample(X, y, seed):
    return X, y

X, y = make_classification(n_samples=2000, n_features=8, n_informative=3, weights=[0.95],
                           flip_y=0.02, class_sep=1.0, random_state=3)
folds = StratifiedKFold(5, shuffle=True, random_state=0)

honest_recall = 0.0
leaky_recall = 0.0
print(honest_recall, leaky_recall)
```

```python solution
import numpy as np
from sklearn.datasets import make_classification
from sklearn.metrics import recall_score
from sklearn.model_selection import StratifiedKFold
from sklearn.tree import DecisionTreeClassifier

def oversample(X, y, seed):
    rng = np.random.default_rng(seed)
    counts = np.bincount(y, minlength=2)
    minority = int(np.argmin(counts))
    rows = np.flatnonzero(y == minority)
    extra = rng.choice(rows, counts.max() - counts.min(), replace=True)
    return np.vstack([X, X[extra]]), np.concatenate([y, y[extra]])

X, y = make_classification(n_samples=2000, n_features=8, n_informative=3, weights=[0.95],
                           flip_y=0.02, class_sep=1.0, random_state=3)
folds = StratifiedKFold(5, shuffle=True, random_state=0)

recalls = []
for train, test in folds.split(X, y):
    X_bal, y_bal = oversample(X[train], y[train], 0)
    tree = DecisionTreeClassifier(random_state=0).fit(X_bal, y_bal)
    recalls.append(recall_score(y[test], tree.predict(X[test])))
honest_recall = np.mean(recalls)

X_all, y_all = oversample(X, y, 0)
recalls = []
for train, test in folds.split(X_all, y_all):
    tree = DecisionTreeClassifier(random_state=0).fit(X_all[train], y_all[train])
    recalls.append(recall_score(y_all[test], tree.predict(X_all[test])))
leaky_recall = np.mean(recalls)
print(honest_recall, leaky_recall)
```

```python test
import numpy as _np
from sklearn.datasets import make_classification as _mc
from sklearn.metrics import recall_score as _rs
from sklearn.model_selection import StratifiedKFold as _SKF
from sklearn.tree import DecisionTreeClassifier as _DTC
assert "oversample" in dir(), "Keep the function's name as oversample."
_Xs = _np.arange(12.0).reshape(6, 2)
_ys = _np.array([0, 0, 0, 0, 1, 1])
_Xb, _yb = oversample(_Xs, _ys, 0)
assert len(_yb) == 8 and (_np.bincount(_yb) == [4, 4]).all(), f"After oversampling, the classes should be equal (4 and 4), but the counts are {_np.bincount(_yb)}."
assert (_Xb[:6] == _Xs).all() and (_yb[:6] == _ys).all(), "Keep the original rows first and append the copies at the end."
_extra = _np.random.default_rng(0).choice(_np.array([4, 5]), 2, replace=True)
assert (_Xb[6:] == _Xs[_extra]).all(), "The copies should be the minority rows drawn with rng.choice(minority_rows, size, replace=True)."
_ys2 = _np.array([1, 1, 1, 0])
_Xb2, _yb2 = oversample(_Xs[:4], _ys2, 1)
assert (_np.bincount(_yb2) == [3, 3]).all(), "The rarer class may be class 0: find it from the counts."
def _ovs(X, y, seed):
    r = _np.random.default_rng(seed); c = _np.bincount(y, minlength=2); mi = int(_np.argmin(c))
    e = r.choice(_np.flatnonzero(y == mi), c.max() - c.min(), replace=True)
    return _np.vstack([X, X[e]]), _np.concatenate([y, y[e]])
_X, _y = _mc(n_samples=2000, n_features=8, n_informative=3, weights=[0.95], flip_y=0.02, class_sep=1.0, random_state=3)
_f = _SKF(5, shuffle=True, random_state=0)
_h = []
for _tr, _te in _f.split(_X, _y):
    _a, _b = _ovs(_X[_tr], _y[_tr], 0)
    _h.append(_rs(_y[_te], _DTC(random_state=0).fit(_a, _b).predict(_X[_te])))
_XA, _yA = _ovs(_X, _y, 0)
_l = []
for _tr, _te in _f.split(_XA, _yA):
    _l.append(_rs(_yA[_te], _DTC(random_state=0).fit(_XA[_tr], _yA[_tr]).predict(_XA[_te])))
assert _np.isclose(honest_recall, _np.mean(_h)), f"honest_recall should be {_np.mean(_h):.3f}: oversample only each fold's training rows."
assert _np.isclose(leaky_recall, _np.mean(_l)), f"leaky_recall should be {_np.mean(_l):.3f}: oversample everything first, then split."
f"SUCCESS: Oversampling before splitting reports recall {_np.mean(_l):.2f}; done properly it is {_np.mean(_h):.2f}. The tree memorises each rare example, and its copies in the test folds reward it."
```

Hint: In `oversample`, `np.bincount(y, minlength=2)` gives the class counts and `np.argmin` the rarer class; `np.flatnonzero(y == minority)` lists its rows. `folds.split(X, y)` yields `(train, test)` index arrays for each fold.
:::

## What you learned

- Leakage is any way validation is more generous than reality. The test for every feature and every step: would this be available at the moment of prediction?
- Target leakage: features caused by the outcome (treatments, follow-ups). Detect it by scoring each feature alone; a near-perfect single feature is a warning. The heart model fell from AUC 0.956 to an honest 0.765 without its leaky column.
- Group leakage: related rows (the same patient, customer or object) split across training and test. Use `GroupKFold`; random folds scored 0.985 where patient folds gave 0.56.
- Time leakage: train on the past, test on the future (`TimeSeriesSplit`), and compute features only from information available at prediction time.
- With rare positives, accuracy is meaningless; stratify splits (`stratify=y`), and judge models by precision and recall at the operating point you need, or by the precision–recall curve (average precision).
- `class_weight="balanced"` and resampling shift a model towards the rare class; they can change the ranking, not just the threshold. Resample only inside training folds, never before splitting.

Every model in the last few lessons came with settings to choose: `C`, `gamma`, `max_depth`, the learning rate, the number of neighbours. The next lesson searches for good settings systematically, and shows how to do it without fooling yourself: grid search, random search and nested cross-validation.
