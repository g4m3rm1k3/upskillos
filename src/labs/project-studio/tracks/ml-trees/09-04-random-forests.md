---
title: 9.4 — Many Trees Are Wiser Than One: Random Forests
track: Trees and Neighbours — Predicting Defects
runtime: none
concepts: ensembles
revisits: decision-trees, regularization, cross-validation, probability, scikit-learn, classes
notebook: ml-random-forests
lab: 13
problem: A deep tree overfits, and two trees grown from slightly different runs give different answers on more than a fifth of new runs. Is there a way to keep a tree's flexibility and lose its instability?
---

The last lesson ended on a tree's weakness: it's **unstable**. Grow two unlimited trees, each on a random resample of the same 375 training runs, and on the 125 test runs they disagree **22.4%** of the time. Each tree is confident, and each is partly confident about noise.

But the noise is different in each tree, while the real pattern (temperature, cooling, pressure, humidity with material B) is the same. So: grow many trees, each on a slightly different version of the data, and let them **vote**. Each tree's quirks point in a different direction and mostly cancel; the pattern they share wins.

> **Ensemble**: a model made of many models, whose predictions are combined (by voting or averaging). A **random forest** is an ensemble of decision trees, each grown on a random resample of the training data and choosing each question from a random subset of the features.
>
> *Picture it as* a panel of inspectors, each trained on a different sample of past batches. Any one of them has picked up some odd habits from the batches they happened to see. Take a majority vote of a hundred, and the odd habits get outvoted; what they all learned, because it's really true, carries.

**Where the picture stops working:** inspectors who all trained on the same batches would share the same odd habits, and voting wouldn't help. The trees have to be made *different* on purpose. That's what the two kinds of randomness are for.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_ensemble.py provided
# Tests for forest.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_ensemble.py
import numpy as np
from pytest import approx
from sklearn.model_selection import KFold, cross_val_score
from sklearn.tree import DecisionTreeClassifier

import parts

X, Y = parts.load("data/parts.csv")
X_TRAIN, X_TEST, Y_TRAIN, Y_TEST = parts.split(X, Y)


def test_bootstrap_draws_n_rows_with_repeats():
    import forest
    assert forest.bootstrap(8, np.random.default_rng(1)).tolist() == [3, 4, 6, 7, 0, 1, 6, 7]


def test_bootstrap_leaves_out_about_a_third_of_the_rows():
    import forest
    rows = forest.bootstrap(10_000, np.random.default_rng(0))
    assert len(np.unique(rows)) / 10_000 == approx(0.632, abs=0.01)


def test_forest_probability_is_the_share_of_trees_voting_defect():
    import forest
    model = forest.Forest(trees=7).fit(X_TRAIN, Y_TRAIN)
    assert len(model.members_) == 7
    votes = np.mean([member.predict(X_TEST) for member in model.members_], axis=0)
    assert model.predict_proba(X_TEST)[:, 1].tolist() == votes.tolist()
    assert model.predict(X_TEST).tolist() == (votes > 0.5).astype(int).tolist()


def test_forest_is_repeatable_with_the_same_seed():
    import forest
    first = forest.Forest(trees=10, seed=3).fit(X_TRAIN, Y_TRAIN).predict_proba(X_TEST)
    again = forest.Forest(trees=10, seed=3).fit(X_TRAIN, Y_TRAIN).predict_proba(X_TEST)
    assert np.array_equal(first, again)


def test_cv_accuracy_matches_cross_val_score():
    import forest
    mine = forest.cv_accuracy(lambda: DecisionTreeClassifier(max_depth=2, random_state=0), X, Y)
    theirs = cross_val_score(DecisionTreeClassifier(max_depth=2, random_state=0), X, Y, cv=KFold(n_splits=5, shuffle=True, random_state=0))
    assert mine == approx(theirs.mean())


def test_forest_beats_a_single_unlimited_tree():
    import forest
    assert forest.cv_accuracy(lambda: DecisionTreeClassifier(random_state=0), X, Y) < 0.76
    assert forest.cv_accuracy(lambda: forest.Forest(trees=100), X, Y) > 0.82
```

- **`10_000`**: Python ignores underscores inside numbers; they're there to make big numbers readable, like a thousands separator.
- **`lambda: DecisionTreeClassifier(...)`** is a function with no name and no arguments that returns a new tree each time it's called. `cv_accuracy` takes a *function that makes a model*, like lesson 7.3's `cross_validate`, so every fold gets a fresh one.

```check
file tests/test_ensemble.py -- Click "Create provided tests/test_ensemble.py" above.
```

## Different data for every tree: the bootstrap

Each tree needs its own version of the training data. You only have one set of 375 runs, so make new sets from it by **drawing 375 runs at random, with replacement**: after each draw, the run goes back in and can be drawn again.

> **Bootstrap sample**: a sample of *n* rows drawn at random, with replacement, from *n* rows. Some rows appear twice or more, and some not at all; on average about 63% of the distinct rows make it in.
>
> *Picture it as* pulling 375 travel cards out of a box of 375 runs, writing each one down and putting it back before the next pull. Some runs get written down three times; about a third never get picked.

The test's example: `bootstrap(8, …)` gave `[3, 4, 6, 7, 0, 1, 6, 7]`. Rows 6 and 7 appear twice; rows 2 and 5 are missing. Why about 63%? Any particular row is missed by one draw with probability $1 - \frac{1}{n}$, and by all $n$ draws with probability $(1 - \frac{1}{n})^n$, which for large $n$ is very close to $e^{-1} \approx 0.368$. So about 36.8% are left out and 63.2% are in.

Create `forest.py`:

```python file=forest.py
import numpy as np


def bootstrap(n: int, rng: np.random.Generator) -> np.ndarray:
    """n row numbers drawn at random from 0..n-1, with replacement."""
    return rng.integers(0, n, n)
```

**`rng.integers(0, n, n)`** draws `n` random whole numbers from 0 up to (not including) `n`. Each draw is independent of the others, which is exactly "with replacement". The generator `rng` is passed in rather than created inside, so one seeded generator can make all the forest's samples in a repeatable sequence.

```check
run ".venv/Scripts/python -m pytest -q tests/test_ensemble.py -k bootstrap" label="a bootstrap sample has n rows, repeats some, and leaves out about a third"
```

## A forest votes

Each tree in the forest is grown on its own bootstrap sample, with one more source of difference: **`max_features="sqrt"`**. At every question, the tree may only choose among a random √5 ≈ 2 of the 5 settings. Without that, every tree would ask about temperature first (it's the best question in almost any sample), and the trees would be too alike to cancel each other's mistakes. Forcing them to sometimes start elsewhere makes them **decorrelated**: each one's errors less like the others'.

The trees themselves are scikit-learn's `DecisionTreeClassifier`, the professional version of lesson 9.3's tree, which supports `max_features`. The forest, the resampling and the voting are yours. Update `forest.py`:

```python file=forest.py
import numpy as np
from sklearn.tree import DecisionTreeClassifier


def bootstrap(n: int, rng: np.random.Generator) -> np.ndarray:
    """n row numbers drawn at random from 0..n-1, with replacement."""
    return rng.integers(0, n, n)


class Forest:
    def __init__(self, trees: int = 100, seed: int = 0):
        self.trees, self.seed = trees, seed

    def fit(self, X: np.ndarray, y: np.ndarray) -> "Forest":
        rng = np.random.default_rng(self.seed)
        self.members_ = []
        for _ in range(self.trees):
            rows = bootstrap(len(y), rng)
            member = DecisionTreeClassifier(max_features="sqrt", random_state=int(rng.integers(1_000_000)))
            self.members_.append(member.fit(X[rows], y[rows]))
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        votes = np.mean([member.predict(X) for member in self.members_], axis=0)
        return np.column_stack([1 - votes, votes])

    def predict(self, X: np.ndarray) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] > 0.5).astype(int)
```

- **`X[rows], y[rows]`**: fancy indexing (lesson 7.3) with repeated row numbers simply repeats those rows.
- **`random_state=int(rng.integers(1_000_000))`**: each tree picks its random features with its own seed, drawn from the forest's generator. So the whole forest is repeatable from one `seed`, and the trees still differ from one another.
- The trees are **unlimited**: no `max_depth`. Each one overfits its own sample, on purpose. Voting is what removes the overfitting, so each tree is free to be as flexible as it likes.
- **`np.mean([...], axis=0)`**: the list holds one row of 0/1 predictions per tree. The mean down the columns is, for each run, the share of trees voting "defect": the forest's probability.

```check
run ".venv/Scripts/python -m pytest -q tests/test_ensemble.py -k \"forest_probability or repeatable\"" label="the forest's probability is the share of trees voting defect, repeatable from its seed" -- for each tree: rows = bootstrap(len(y), rng); DecisionTreeClassifier(max_features="sqrt", random_state=...).fit(X[rows], y[rows]); predict_proba = mean of the trees' predictions
```

## Measuring it fairly

To compare a forest with a tree, use cross-validation, written once so it works for any model. Add `cv_accuracy` to `forest.py`:

```python file=forest.py
import numpy as np
from sklearn.model_selection import KFold
from sklearn.tree import DecisionTreeClassifier


def bootstrap(n: int, rng: np.random.Generator) -> np.ndarray:
    """n row numbers drawn at random from 0..n-1, with replacement."""
    return rng.integers(0, n, n)


class Forest:
    def __init__(self, trees: int = 100, seed: int = 0):
        self.trees, self.seed = trees, seed

    def fit(self, X: np.ndarray, y: np.ndarray) -> "Forest":
        rng = np.random.default_rng(self.seed)
        self.members_ = []
        for _ in range(self.trees):
            rows = bootstrap(len(y), rng)
            member = DecisionTreeClassifier(max_features="sqrt", random_state=int(rng.integers(1_000_000)))
            self.members_.append(member.fit(X[rows], y[rows]))
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        votes = np.mean([member.predict(X) for member in self.members_], axis=0)
        return np.column_stack([1 - votes, votes])

    def predict(self, X: np.ndarray) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] > 0.5).astype(int)


def cv_accuracy(make_model, X: np.ndarray, y: np.ndarray, seed: int = 0) -> float:
    """Mean accuracy of a fresh model over 5 shuffled folds."""
    scores = []
    for train, validation in KFold(n_splits=5, shuffle=True, random_state=seed).split(X):
        model = make_model().fit(X[train], y[train])
        scores.append(np.mean(model.predict(X[validation]) == y[validation]))
    return float(np.mean(scores))
```

**`KFold(...).split(X)`** gives the (train rows, validation rows) pairs one fold at a time: scikit-learn's version of lesson 7.3's `kfold`, which you checked produces identical folds.

```check
run ".venv/Scripts/python -m pytest -q tests/test_ensemble.py" label="a forest of 100 trees beats a single unlimited tree under cross-validation"
```

## The crowd

Create `crowd.py`:

```python file=crowd.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier

import forest
import parts

X, y = parts.load("data/parts.csv")
print(f"one unlimited tree:   {forest.cv_accuracy(lambda: DecisionTreeClassifier(random_state=0), X, y):.3f}")
for size in [1, 5, 25, 100]:
    print(f"forest of {size:>3} trees: {forest.cv_accuracy(lambda: forest.Forest(trees=size), X, y):.3f}")
print(f"RandomForestClassifier: {forest.cv_accuracy(lambda: RandomForestClassifier(n_estimators=100, random_state=0), X, y):.3f}")

importance = RandomForestClassifier(n_estimators=300, random_state=0).fit(X, y).feature_importances_
print("importance:", ", ".join(f"{name} {value:.2f}" for name, value in zip(parts.FEATURES, importance)))
```

```powershell
.venv\Scripts\python crowd.py
```

```text
one unlimited tree:   0.744
forest of   1 trees: 0.746
forest of   5 trees: 0.780
forest of  25 trees: 0.822
forest of 100 trees: 0.828
RandomForestClassifier: 0.804
importance: temperature 0.35, pressure 0.18, cooling 0.26, humidity 0.16, material_b 0.05
```

- **One tree in a forest is no better than one tree** (0.746): a bootstrap sample isn't better data.
- **Accuracy climbs as trees are added**, quickly at first, then levelling off: 25 trees get most of the benefit. More trees never make a forest overfit; they only make the vote steadier.
- **100 trees: 0.828**, the best model in the chapter, from unlimited trees, without tuning any depth at all.
- **scikit-learn's `RandomForestClassifier`** does the same thing (with some extra refinements, and its own random choices), and lands in the same range: 0.804 on these folds. With 500 runs, a couple of points between two forests is within the noise lesson 7.3 warned about.

The forest also fixes the instability. Two forests built with different seeds disagree on just **3.2%** of the test runs, against 22.4% for two single trees.

```check
run ".venv/Scripts/python crowd.py" stdout="forest of 100 trees: 0.828" label="crowd.py shows accuracy rising as trees are added"
```

### What a forest gives up, and what importance means

A forest of 100 unlimited trees can't be read like lesson 9.3's `if`/`else`. You trade the explanation for accuracy. What you get back is **feature importance**: how much, across all the trees, the questions about each setting reduced the impurity.

> **Feature importance** (impurity-based): for each feature, the total drop in Gini from every question about it, across all the trees, scaled so the importances add up to 1.
>
> *Picture it as* a Pareto chart of which settings the trees relied on most to sort good runs from bad.

Temperature and cooling come first, as they should. But look at **material_b: 0.05**, the lowest. Material B *does* cause defects, in humid weather, and the data was made that way. Its importance is low because its effect only exists in combination with humidity, and a single question about material only ever splits off a little.

```predict
question: An engineer reads "material_b importance 0.05" and concludes the material choice doesn't affect defects. What's wrong with that?
choice: Nothing: low importance means no effect
choice: Importance measures how much the trees used a feature, not what would happen if you changed it; an effect that only shows up together with another setting can score low
choice: The forest needs more trees
answer: Importance measures how much the trees used a feature, not what would happen if you changed it; an effect that only shows up together with another setting can score low
explain: The hidden rule was "material B AND humidity above 55%". Much of that effect is credited to humidity, which the trees split on after (or instead of) material. Importance is a summary of the model, not a measurement of the process. To find out what a setting really does, you'd compare runs that differ in just that setting, which is what a designed experiment is for.
```

That's the chapter. You now have three different ways to classify a run: by its nearest neighbours, by a tree of questions, and by a forest's vote, each built by hand, each matched to scikit-learn, and each compared honestly. The next chapter drops the labels entirely: what can you learn from runs when nobody has said which ones were bad?
