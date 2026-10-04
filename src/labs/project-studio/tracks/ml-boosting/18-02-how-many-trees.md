---
title: 18.2 — How Many Trees, How Big a Step? Tuning and Early Stopping
track: Boosting and SVMs — Surface Finish and a Tolerance Zone
runtime: none
concepts: boosting
revisits: regularization, cross-validation, generalization, regression-metrics, scikit-learn, testing
notebook: ml-boosting
lab: 14
problem: Boosting has two settings that pull against each other. A smaller learning rate overfits less but needs more trees; too many trees overfit anyway. How do you choose both without peeking at the test set, and what does scikit-learn do for you?
---

Lesson 18.1's table chose the number of trees by looking at the **test** error, which lesson 7.2 ruled out: a test set used for choosing is no longer a fair test. The honest way is lesson 7.2's three piles. **Train** on one, **choose** on the second (the validation set), and **report** once on the third.

Boosting makes the choosing cheap. A boosted model with 1,500 trees *contains* the models with 1, 2, 3, … 1,499 trees: they're its first trees. So one fit gives you every size of model at once, and you only have to evaluate them.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_tuning.py provided
# Tests for boost.py's staged predictions and best_size. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_tuning.py
import numpy as np
from pytest import approx
from sklearn.model_selection import train_test_split


def fitted(n_trees=30, rate=0.3):
    import boost
    import data
    X, ra = data.load("data/roughness.csv")
    X_train, X_valid, ra_train, ra_valid = train_test_split(X, ra, test_size=0.25, random_state=0)
    return boost.Boosted(n_trees=n_trees, rate=rate).fit(X_train, ra_train), X_valid, ra_valid


def test_staged_predict_gives_one_prediction_per_tree_ending_at_predict():
    model, X_valid, _ = fitted()
    stages = list(model.staged_predict(X_valid))
    assert len(stages) == 30
    assert stages[-1] == approx(model.predict(X_valid))


def test_the_first_stage_is_the_average_plus_one_shrunk_tree():
    model, X_valid, _ = fitted()
    first = next(model.staged_predict(X_valid))
    assert first == approx(model.start_ + 0.3 * model.trees_[0].predict(X_valid))


def test_best_size_counts_trees_from_one_and_finds_the_lowest_error():
    import boost
    model, X_valid, ra_valid = fitted(n_trees=400, rate=1.0)
    errors = [np.sqrt(np.mean((p - ra_valid) ** 2)) for p in model.staged_predict(X_valid)]
    trees, error = boost.best_size(model, X_valid, ra_valid)
    assert error == approx(min(errors))
    assert errors[trees - 1] == approx(min(errors)) and 1 <= trees < 400
```

- **`list(model.staged_predict(X_valid))`** collects every stage into a list: 30 predictions, one after each tree.
- **The last test** fits 400 trees at a full rate of 1.0, which overfits badly, so the best size is somewhere well before the end. It checks that `best_size` finds the lowest error and reports the size **counting from 1**: "after 1 tree" is the first stage, not the zeroth.

```check
file tests/test_tuning.py -- Click "Create provided tests/test_tuning.py" above.
```

## Every size of model from one fit

Add a method and a function to `boost.py`:

```python file=boost.py
import numpy as np
from sklearn.tree import DecisionTreeRegressor


class Boosted:
    """Gradient boosting for squared error: each small tree learns what the trees before it still get wrong."""

    def __init__(self, n_trees: int = 100, rate: float = 0.1, depth: int = 3, seed: int = 0):
        self.n_trees, self.rate, self.depth, self.seed = n_trees, rate, depth, seed

    def fit(self, X: np.ndarray, y: np.ndarray) -> "Boosted":
        self.start_ = y.mean()
        self.trees_ = []
        random = np.random.RandomState(self.seed)
        prediction = np.full(len(y), self.start_)
        for _ in range(self.n_trees):
            tree = DecisionTreeRegressor(max_depth=self.depth, random_state=random).fit(X, y - prediction)
            prediction = prediction + self.rate * tree.predict(X)
            self.trees_.append(tree)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        prediction = np.full(len(X), self.start_)
        for tree in self.trees_:
            prediction = prediction + self.rate * tree.predict(X)
        return prediction

    def staged_predict(self, X: np.ndarray):
        """The prediction after each tree in turn: after 1 tree, after 2, and so on."""
        prediction = np.full(len(X), self.start_)
        for tree in self.trees_:
            prediction = prediction + self.rate * tree.predict(X)
            yield prediction


def best_size(model: Boosted, X: np.ndarray, y: np.ndarray) -> tuple[int, float]:
    """(the number of trees with the lowest error on X, y; that error)."""
    errors = [np.sqrt(np.mean((prediction - y) ** 2)) for prediction in model.staged_predict(X)]
    best = int(np.argmin(errors))
    return best + 1, float(errors[best])
```

**`staged_predict`** is `predict` with one word added: **`yield`**.

> **A generator function**: a function containing `yield`. Calling it doesn't run it; it returns a **generator**, which runs the function a piece at a time. Each time a loop asks for the next item, the function runs until the next `yield`, hands over that value, and pauses there, keeping all its variables, until it's asked again.
>
> *Picture it as* a part counter on a machine that hands you each part as it's finished, rather than a box you only get when the whole batch is done.

So `staged_predict` hands out the prediction after tree 1, then after tree 2, and so on, without ever storing all 1,500 of them. scikit-learn's boosting models have a `staged_predict` method that works the same way.

- **`best_size`** measures the error of every stage, and **`np.argmin(errors)`** gives the position of the smallest. Positions count from 0, and tree counts from 1, so it returns **`best + 1`**.

```check
run ".venv/Scripts/python -m pytest -q tests/test_tuning.py" label="staged_predict yields every stage, and best_size finds the lowest validation error, counting trees from 1" -- staged_predict is predict with yield prediction inside the loop; best_size returns int(np.argmin(errors)) + 1
```

## Choosing on validation, reporting on test

Create `tune.py`. It splits the passes three ways, then for each learning rate fits 1,500 trees, chooses the best size on the validation passes, refits a model of that size, and reports its test error:

```python file=tune.py
import numpy as np
from sklearn.model_selection import train_test_split

import boost
import data

X, ra = data.load("data/roughness.csv")
X_rest, X_test, ra_rest, ra_test = train_test_split(X, ra, test_size=0.25, random_state=0)
X_train, X_valid, ra_train, ra_valid = train_test_split(X_rest, ra_rest, test_size=0.25, random_state=0)

print("rate   best trees   validation error   test error (µm)")
for rate in [1.0, 0.3, 0.1, 0.03]:
    model = boost.Boosted(n_trees=1500, rate=rate).fit(X_train, ra_train)
    trees, valid = boost.best_size(model, X_valid, ra_valid)
    chosen = boost.Boosted(n_trees=trees, rate=rate).fit(X_train, ra_train)
    test = np.sqrt(np.mean((chosen.predict(X_test) - ra_test) ** 2))
    print(f"{rate:4}   {trees:10d}   {valid:16.3f}   {test:10.3f}")
```

- **Two `train_test_split`s**: the first sets aside 25% as the test set (the same 150 passes as lesson 18.1); the second splits what's left into training (337 passes) and validation (113).
- **`chosen = boost.Boosted(n_trees=trees, ...)`** builds the model of the chosen size. Because it uses the same seed and data, it's identical to the first `trees` trees of the big model; refitting just makes that explicit.

```powershell
.venv\Scripts\python tune.py
```

```text
rate   best trees   validation error   test error (µm)
 1.0           21              0.698        0.676
 0.3           31              0.492        0.502
 0.1           98              0.449        0.498
0.03          355              0.464        0.496
```

Read the columns together:

- **A full rate of 1.0 is clearly worse** (0.68 µm on test against about 0.50): each tree's whole correction, noise included, goes into the model.
- **From 0.3 down, the test errors are almost the same**, but the number of trees needed grows: 31, 98, 355. Smaller steps take more of them to get as far.
- **The test errors are higher than lesson 18.1's 0.38 µm.** That's the cost of honesty: a quarter of the training passes now go to validation, so the models learn from 337 passes instead of 450.

The usual practice follows from this: pick a learning rate of about **0.1** (small enough to be safe, large enough to be quick), and let the validation set choose the number of trees.

```check
run ".venv/Scripts/python tune.py" stdout=" 0.1           98              0.449        0.498" label="tune.py: the validation set chooses 98 trees at a rate of 0.1"
```

```predict
question: Once you've chosen 98 trees at a rate of 0.1 on the validation set, what's the sensible final step before using the model on the shop floor?
choice: Use the model trained on the 337 training passes as it is
choice: Refit with the same settings (rate 0.1, 98 trees) on all 600 passes, now that the choice is made
choice: Keep tuning until the test error is lowest
answer: Refit with the same settings (rate 0.1, 98 trees) on all 600 passes, now that the choice is made
explain: The validation and test sets did their jobs: one chose the settings, the other measured them honestly. Neither job needs them any more, and a model trained on 600 passes will usually do a little better than one trained on 337. (With more data, slightly more trees can be right, so some people scale the number up in proportion.) Tuning on the test error is the one thing never to do: then nothing measures the model honestly.
```

## The library version: early stopping built in

Fitting 1,500 trees to keep 98 is wasteful. **Early stopping** does better:

> **Early stopping**: during training, keep checking the error on a validation set, and stop adding trees once it has failed to improve for a set number of rounds in a row. The model is trained exactly as far as the validation set says is useful.

scikit-learn's `GradientBoostingRegressor` does it for you. With **`validation_fraction=0.2`** it holds back 20% of whatever you give `fit` as a validation set, and **`n_iter_no_change=20`** stops after 20 trees in a row without improvement. You set `n_estimators` high, as a ceiling.

scikit-learn also has a second boosting model, **`HistGradientBoostingRegressor`**. Before training, it sorts each column's values into at most 255 bins, and then looks for splits between bins, not between every pair of values. On a table of 100,000 rows that makes it many times faster, and it handles missing values without any filling. On 600 rows its speed doesn't matter, but it's the one to reach for on big tables.

Create `library.py` to compare them all with lesson 7.3's 5-fold cross-validation:

```python file=library.py
from sklearn.ensemble import GradientBoostingRegressor, HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_score

import data

X, ra = data.load("data/roughness.csv")
folds = KFold(n_splits=5, shuffle=True, random_state=0)
models = {
    "gradient boosting, early stopping": GradientBoostingRegressor(n_estimators=2000, learning_rate=0.1, max_depth=3, validation_fraction=0.2, n_iter_no_change=20, random_state=0),
    "histogram gradient boosting": HistGradientBoostingRegressor(random_state=0),
    "random forest, 300 trees": RandomForestRegressor(n_estimators=300, random_state=0),
    "linear regression": LinearRegression(),
}
print("model                               error over 5 folds (µm)")
for name, model in models.items():
    error = -cross_val_score(model, X, ra, cv=folds, scoring="neg_root_mean_squared_error").mean()
    print(f"{name:<36}{error:6.2f}")
stopped = models["gradient boosting, early stopping"].fit(X, ra)
print(f"\nearly stopping kept {stopped.n_estimators_} of 2000 trees")
```

- **`stopped.n_estimators_`** (with the trailing underscore, so it's learned during `fit`) is how many trees early stopping actually kept.

```powershell
.venv\Scripts\python library.py
```

```text
model                               error over 5 folds (µm)
gradient boosting, early stopping     0.54
histogram gradient boosting           0.56
random forest, 300 trees              0.57
linear regression                     1.33

early stopping kept 195 of 2000 trees
```

Over five folds, boosting comes out ahead, but by less than lesson 18.1's single split suggested (0.54 against the forest's 0.57 µm). That's the normal picture on a small, clean table: boosting usually wins, and usually not by a mile. On all 600 passes, early stopping kept **195** trees: about twice the 98 chosen from 337 passes, because more data supports a bigger model.

```check
run ".venv/Scripts/python library.py" stdout="early stopping kept 195 of 2000 trees" label="library.py: early stopping keeps 195 trees, and boosting edges out the forest over 5 folds"
```

## Your own problem

1. **Start with `HistGradientBoostingRegressor` (or `...Classifier`) with its defaults** on any table of more than a few thousand rows; `GradientBoostingRegressor` with early stopping on smaller ones.
2. **Leave the learning rate at 0.1 and let early stopping pick the number of trees.** Tune `max_depth` (2 to 6) only if you have time, with cross-validation.
3. **Compare against a forest and a baseline on the same folds**, and report all three, as lesson 16.2 did. If boosting doesn't win clearly, the simpler model is easier to explain.
