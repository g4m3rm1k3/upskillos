---
title: 9.2 — One Good Question: Impurity and the Best Split
track: Trees and Neighbours — Predicting Defects
runtime: none
concepts: decision-trees
revisits: probability, aggregation, classification-metrics, numpy
notebook: ml-decision-trees
lab: 12
problem: A setter wouldn't measure distances between runs. They'd ask questions: "Was it running hot? Was the cooling cut short?" If you could ask only one yes/no question about a run's settings, which question would best separate the good runs from the bad, and how would a program find it?
---

An experienced setter diagnoses a bad run with questions, not distances: *was the barrel over temperature? was cooling cut short?* Each answer narrows things down. A **decision tree** is a model made of exactly such questions, and the questions are found automatically from the data.

This lesson finds the single best question. The next lesson asks questions about the answers, and grows a whole tree.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_split.py provided
# Tests for tree.py's gini, best_threshold and best_split. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_split.py
import numpy as np
from pytest import approx
from sklearn.tree import DecisionTreeClassifier

import parts

X_TRAIN, X_TEST, Y_TRAIN, Y_TEST = parts.split(*parts.load("data/parts.csv"))


def test_gini_is_zero_when_pure_and_one_half_for_an_even_mix():
    import tree
    assert tree.gini(np.array([0, 0, 0])) == 0
    assert tree.gini(np.array([1, 1])) == 0
    assert tree.gini(np.array([0, 1, 0, 1])) == 0.5
    assert tree.gini(np.array([1, 1, 1, 0])) == approx(0.375)


def test_gini_of_all_the_training_runs():
    import tree
    p = 137 / 375
    assert tree.gini(Y_TRAIN) == approx(1 - p ** 2 - (1 - p) ** 2)


def test_threshold_halfway_between_the_groups():
    import tree
    threshold, impurity = tree.best_threshold(np.array([4.0, 1.0, 3.0, 2.0]), np.array([1, 0, 1, 0]))
    assert (threshold, impurity) == (2.5, 0.0)


def test_threshold_is_none_when_no_split_helps():
    import tree
    assert tree.best_threshold(np.array([1.0, 1.0, 1.0]), np.array([0, 1, 0]))[0] is None


def test_split_asks_the_same_question_as_scikit_learn():
    import tree
    feature, threshold, impurity = tree.best_split(X_TRAIN, Y_TRAIN)
    stump = DecisionTreeClassifier(max_depth=1).fit(X_TRAIN, Y_TRAIN)
    assert feature == stump.tree_.feature[0]
    assert threshold == approx(stump.tree_.threshold[0])
    assert impurity == approx(0.3469, abs=1e-4)
```

`stump.tree_.feature[0]` and `.threshold[0]` are where scikit-learn stores the question at the top of its tree. A tree with only one question (`max_depth=1`) is called a **decision stump**.

```check
file tests/test_split.py -- Click "Create provided tests/test_split.py" above.
```

## How mixed is a group? Gini impurity

To pick the best question, you need a number for "how well does it separate the defects from the good runs?" Start with a number for how mixed a single group is.

> **Gini impurity**: for a group where a fraction $p$ are defects, $G = 1 - p^2 - (1-p)^2$. It's 0 when the group is all one class (pure), and 0.5, its largest, for an even 50–50 mix.
>
> *Picture it as* the chance of a mismatch if you pull two runs from the group (putting the first back before drawing again): $p^2$ is the chance both are defects, $(1-p)^2$ that both are good, and $G$ is the chance they differ. A pure bin never gives a mismatch; a half-and-half bin does so half the time.

Check the test's example, `[1, 1, 1, 0]`: $p = 0.75$, so $G = 1 - 0.5625 - 0.0625 = 0.375$.

Create `tree.py`:

```python file=tree.py
import numpy as np


def gini(y: np.ndarray) -> float:
    """How mixed a group is: 0 when all one class, 0.5 when an even mix of two."""
    if len(y) == 0:
        return 0.0
    p = np.mean(y)
    return float(1 - p ** 2 - (1 - p) ** 2)
```

`np.mean(y)` of 0s and 1s is the fraction of 1s, $p$. An empty group counts as pure; it'll matter in a moment.

```check
run ".venv/Scripts/python -m pytest -q tests/test_split.py -k gini" label="Gini impurity is 0 for a pure group, 0.5 for an even mix"
```

## The best threshold for one setting

A question looks like *"is temperature ≤ 235.85?"*. It splits the runs into a **yes** group and a **no** group. A good question leaves both groups purer than before. Measure that as the Gini of each group, weighted by its size:

$$G_{\text{after}} = \frac{n_{\text{yes}}}{n}\,G_{\text{yes}} + \frac{n_{\text{no}}}{n}\,G_{\text{no}}$$

The weighting matters: a question that peels off one pure run into its own group, leaving 374 as mixed as ever, has made almost no progress, and the weights make it count for almost nothing.

Which thresholds are worth trying? Only ones *between* two values that actually occur: any threshold between 235.7 and 236.0 splits the runs the same way. So sort the distinct values and try the midpoint of each neighbouring pair. Add `best_threshold` to `tree.py`:

```python file=tree.py
import numpy as np


def gini(y: np.ndarray) -> float:
    """How mixed a group is: 0 when all one class, 0.5 when an even mix of two."""
    if len(y) == 0:
        return 0.0
    p = np.mean(y)
    return float(1 - p ** 2 - (1 - p) ** 2)


def best_threshold(values: np.ndarray, y: np.ndarray) -> tuple[float | None, float]:
    """The threshold on one feature whose split leaves the lowest weighted impurity."""
    best_threshold, best_impurity = None, gini(y)
    distinct = np.unique(values)
    for threshold in (distinct[:-1] + distinct[1:]) / 2:
        left = values <= threshold
        impurity = float(left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
        if impurity < best_impurity:
            best_threshold, best_impurity = float(threshold), impurity
    return best_threshold, best_impurity
```

- **`np.unique(values)`** returns the distinct values, sorted.
- **`(distinct[:-1] + distinct[1:]) / 2`**: `distinct[:-1]` is every value but the last, `distinct[1:]` every value but the first. Added element by element, they pair each value with the next, and halving gives the midpoints. For distinct values `[1, 2, 3, 4]`: `[1, 2, 3] + [2, 3, 4]` = `[3, 5, 7]`, halved: `[1.5, 2.5, 3.5]`.
- **`left = values <= threshold`** is a mask (lesson 1.3): `True` for the yes group. **`~left`** flips every value, so it's the no group.
- **`left.sum()`** counts the `True`s: the size of the yes group.
- The search starts from `gini(y)`, the impurity with **no** split, and only accepts a threshold that does better. If none does (all the values are the same), it returns `None`: there's no useful question to ask.

Trace the test's example: values `[4, 1, 3, 2]`, labels `[1, 0, 1, 0]`. The midpoints are 1.5, 2.5, 3.5. At 2.5, the yes group is the runs with values 1 and 2, labels `[0, 0]`, Gini 0; the no group is 3 and 4, labels `[1, 1]`, Gini 0. Weighted total 0: a perfect question.

```check
run ".venv/Scripts/python -m pytest -q tests/test_split.py -k threshold" label="the best threshold is the midpoint that leaves the purest groups" -- try each midpoint of np.unique(values); impurity = (yes count × Gini(yes) + no count × Gini(no)) / n
```

## The best question overall

Try every setting, and keep the best:

```python file=tree.py
import numpy as np


def gini(y: np.ndarray) -> float:
    """How mixed a group is: 0 when all one class, 0.5 when an even mix of two."""
    if len(y) == 0:
        return 0.0
    p = np.mean(y)
    return float(1 - p ** 2 - (1 - p) ** 2)


def best_threshold(values: np.ndarray, y: np.ndarray) -> tuple[float | None, float]:
    """The threshold on one feature whose split leaves the lowest weighted impurity."""
    best_threshold, best_impurity = None, gini(y)
    distinct = np.unique(values)
    for threshold in (distinct[:-1] + distinct[1:]) / 2:
        left = values <= threshold
        impurity = float(left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)
        if impurity < best_impurity:
            best_threshold, best_impurity = float(threshold), impurity
    return best_threshold, best_impurity


def best_split(X: np.ndarray, y: np.ndarray) -> tuple[int | None, float | None, float]:
    """(feature, threshold, impurity) of the best single question to ask."""
    best = (None, None, gini(y))
    for feature in range(X.shape[1]):
        threshold, impurity = best_threshold(X[:, feature], y)
        if impurity < best[2]:
            best = (feature, threshold, impurity)
    return best
```

**`X[:, feature]`** is one whole column: every run's value of that setting. `best[2]` is the third item of the tuple, the best impurity so far.

```check
run ".venv/Scripts/python -m pytest -q tests/test_split.py" label="the best question is the same one scikit-learn's decision stump asks"
```

## What the data says

Create `stump.py` to see the best question for every setting:

```python file=stump.py
import parts
import tree

X_train, X_test, y_train, y_test = parts.split(*parts.load("data/parts.csv"))
print(f"all {len(y_train)} training runs: defect rate {y_train.mean():.3f}, Gini {tree.gini(y_train):.3f}")
print("feature      best threshold   Gini after")
for feature, name in enumerate(parts.FEATURES):
    threshold, impurity = tree.best_threshold(X_train[:, feature], y_train)
    print(f"{name:<12} {threshold:>14g} {impurity:>12.3f}")

feature, threshold, _ = tree.best_split(X_train, y_train)
left = X_train[:, feature] <= threshold
print(f"best question: {parts.FEATURES[feature]} <= {threshold:g}")
print(f"  yes: {left.sum()} runs, defect rate {y_train[left].mean():.3f}")
print(f"  no:  {(~left).sum()} runs, defect rate {y_train[~left].mean():.3f}")
```

```powershell
.venv\Scripts\python stump.py
```

```text
all 375 training runs: defect rate 0.365, Gini 0.464
feature      best threshold   Gini after
temperature          235.85        0.347
pressure              681.5        0.440
cooling               11.95        0.403
humidity               55.5        0.445
material_b              0.5        0.460
best question: temperature <= 235.85
  yes: 303 runs, defect rate 0.248
  no:  72 runs, defect rate 0.861
```

The best single question is the melt temperature. Runs above 235.85 °C failed 86% of the time; at or below it, 25%.

Now the reveal. The data was made from these hidden rules, each adding to a run's chance of failing:

| Hidden cause | Rule used to make the data | Best threshold found |
|---|---|---|
| too hot: flashing and burns | temperature above 235 °C | 235.85 |
| short shots | pressure below 680 bar | 681.5 |
| ejected too soon: warping | cooling under 12 s | 11.95 |
| material B absorbing moisture | humidity above 55% (material B only) | 55.5 |

From nothing but the 375 runs and a search for the purest split, each setting's best threshold landed within about one unit of the real process limit. That's what makes trees popular in industry: their questions are the kind of thing an engineer can check against what they know about the process.

```predict
question: Humidity's best threshold (55.5) is right, but its Gini barely drops (0.464 to 0.445), and material on its own does even less. Why?
choice: Humidity and material don't affect defects
choice: Humidity only matters for material B, so asked on its own, about all the runs, the question is diluted by the material A runs it doesn't affect
choice: The threshold search missed the right value
answer: Humidity only matters for material B, so asked on its own, about all the runs, the question is diluted by the material A runs it doesn't affect
explain: The real cause is a combination: material B AND humidity above 55%. Asked alone, "humidity > 55.5?" lumps material A runs (unaffected) with material B runs (affected), so the no group is only a little worse than average. No single question captures "B and humid". But a question asked after another, "material B? then is it humid?", can. That's what a tree's second level is for.
```

```check
run ".venv/Scripts/python stump.py" stdout="best question: temperature <= 235.85" label="stump.py finds the best question for each setting"
```
