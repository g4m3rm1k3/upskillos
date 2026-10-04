---
title: 7.3 — Every Point Takes a Turn: Cross-Validation
track: Evaluation — Is the Model Any Good?
runtime: none
concepts: cross-validation
revisits: generalization, linear-regression, scikit-learn, regression-metrics, testing
notebook: ml-cross-validation
lab: 6
problem: One held-out set gives one noisy number. Hold out a different fifth of the houses and the error moves by ten thousand dollars. How do you get a score you can trust, and tell a real improvement from luck?
---

Hold out a fifth of the 45 houses at random, train on the rest, and measure RMSE. Do it again with a different random fifth. Six tries give six different answers:

```text
split 0: 26850    split 1: 30699    split 2: 29505
split 3: 20115    split 4: 32929    split 5: 25859
```

Same model, same data. The answer runs from about \$20,000 to \$33,000 depending only on *which* houses happened to be held out. If you compared two models using one split each, the difference between them could easily be smaller than this luck. And lesson 7.2 hit the same problem: its twelve-point validation set picked a penalty that the bigger test set disagreed with.

The fix: don't hold out one set. Hold out *every* point, once each, and average.

> **k-fold cross-validation**: splitting the data into *k* equal parts ("folds"); then, *k* times, training a fresh model on all folds but one and measuring its error on the one left out. Every point is used for validation exactly once and for training *k*−1 times. The *k* errors are reported as a mean (the estimate) and a spread (how much to trust it).
>
> *Picture it as* rotating the inspection sample on a production line. Rather than always pulling the first pallet of the day for inspection, each of the five pallets takes its turn as the one inspected while the others ship. After five rounds every pallet has been inspected once, and one unusual pallet can't decide the verdict on its own.

This lesson writes k-fold by hand, checks it produces *exactly* scikit-learn's folds, and then uses it to answer a real question: do bedrooms and age actually help predict the price, or does it just look that way?

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_folds.py provided
# Tests for houses.py and folds.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_folds.py
import numpy as np
from pytest import approx
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_score

COLUMNS = ["sqft", "bedrooms", "age"]


def test_houses_skips_rows_with_a_missing_value():
    import houses
    X, y = houses.load("data/houses.csv", COLUMNS)
    assert X.shape == (45, 3) and y.shape == (45,)
    assert X[0].tolist() == [1540, 3, 54] and y[0] == 199000


def test_kfold_holds_out_every_point_exactly_once():
    import folds
    held_out = np.concatenate([validation for _, validation in folds.kfold(47, 5, seed=0)])
    assert sorted(held_out.tolist()) == list(range(47))


def test_kfold_never_trains_on_a_validation_point():
    import folds
    for train, validation in folds.kfold(47, 5, seed=0):
        assert set(train.tolist()).isdisjoint(validation.tolist())
        assert len(train) + len(validation) == 47


def test_kfold_sizes_differ_by_at_most_one():
    import folds
    assert [len(validation) for _, validation in folds.kfold(47, 5, seed=0)] == [10, 10, 9, 9, 9]


def test_kfold_matches_scikit_learn_exactly():
    import folds
    for n, k, seed in [(45, 5, 0), (47, 5, 0), (10, 3, 4)]:
        theirs = KFold(n_splits=k, shuffle=True, random_state=seed).split(np.zeros(n))
        for (my_train, my_validation), (their_train, their_validation) in zip(folds.kfold(n, k, seed), theirs, strict=True):
            assert my_validation.tolist() == their_validation.tolist()
            assert my_train.tolist() == their_train.tolist()


def test_cross_validate_matches_scikit_learn():
    import folds, houses
    X, y = houses.load("data/houses.csv", COLUMNS)
    mine = folds.cross_validate(LinearRegression, X, y, k=5, seed=0)
    theirs = -cross_val_score(LinearRegression(), X, y, cv=KFold(n_splits=5, shuffle=True, random_state=0),
                              scoring="neg_root_mean_squared_error")
    assert mine == approx(theirs.tolist())
    assert np.mean(mine) == approx(27662, abs=1)
```

`test_kfold_matches_scikit_learn_exactly` is the strongest test in this chapter: not "about the same", but the identical folds, point for point. When your version and the library's agree exactly, you know precisely what the library does.

**`zip(a, b, strict=True)`** pairs up two sequences item by item, like a zipper; `strict=True` makes it an error if one runs out before the other, so a missing fold can't slip by unnoticed.

```check
file tests/test_folds.py -- Click "Create provided tests/test_folds.py" above.
```

## Load the houses

`data/houses.csv` (created in lesson 7.1) has a few blanks: three houses with no age, two with no garage. This chapter uses only NumPy, so read it with Python's own `csv` module and skip any row missing a column you need. Create `houses.py`:

```python file=houses.py
import csv

import numpy as np


def load(path: str, columns: list[str]) -> tuple[np.ndarray, np.ndarray]:
    """Features (the given columns) and prices, skipping rows with a blank in any of them."""
    features, prices = [], []
    with open(path, newline="") as file:
        for row in csv.DictReader(file):
            needed = [row[column] for column in columns] + [row["price"]]
            if "" in needed:
                continue
            features.append([float(value) for value in needed[:-1]])
            prices.append(float(row["price"]))
    return np.array(features), np.array(prices)
```

- **`csv.DictReader`** reads one row at a time as a dictionary keyed by the header: `row["sqft"]` is the text `"1540"`. Everything arrives as text, hence `float(...)`.
- **`"" in needed`**: a blank cell arrives as the empty string. `continue` skips straight to the next row.
- **`needed[:-1]`** is every item except the last (the price), lesson 0.2's slicing.

A missing garage doesn't remove a house here, because `garage` isn't one of the columns asked for. Dropping only the rows a question needs keeps as much data as possible.

```check
run ".venv/Scripts/python -m pytest -q tests/test_folds.py -k houses" label="45 houses load, the 3 with no age skipped"
```

## Folds by hand

Here's how scikit-learn's `KFold(shuffle=True)` makes its folds, and the plan for yours:

1. Number the points `0, 1, …, n−1` and shuffle the numbers with the seeded random generator.
2. Cut the shuffled list into *k* consecutive pieces. If *n* doesn't divide evenly, the first `n % k` pieces get one extra point. (47 points into 5 folds: 47 // 5 = 9 each, with 47 % 5 = 2 left over, so sizes 10, 10, 9, 9, 9.)
3. For each piece: that piece is the validation set; every other point is the training set. Both are returned in sorted order.

Create `folds.py`:

```python file=folds.py
import numpy as np


def kfold(n: int, k: int, seed: int) -> list[tuple[np.ndarray, np.ndarray]]:
    """(train indices, validation indices) for each of k folds, as scikit-learn's KFold(shuffle=True) makes them."""
    order = np.arange(n)
    np.random.RandomState(seed).shuffle(order)
    sizes = [n // k + (1 if fold < n % k else 0) for fold in range(k)]
    folds, start = [], 0
    for size in sizes:
        validation = np.sort(order[start:start + size])
        train = np.setdiff1d(order, validation)
        folds.append((train, validation))
        start += size
    return folds
```

Line by line:

- **`np.arange(n)`** is the array `[0, 1, …, n−1]`: one index per point. The folds hold *indices* (row numbers), not the rows themselves, so the same folds work for `X` and `y`.
- **`np.random.RandomState(seed).shuffle(order)`** shuffles in place. It's NumPy's older random generator; scikit-learn still uses it for `random_state`, and using the same one with the same seed gives the identical shuffle. (Lesson 7.1's `default_rng` is the newer generator; it would shuffle differently.)
- **`n // k + (1 if fold < n % k else 0)`**: `//` is whole-number division and `%` the remainder (lesson 1.2). The `… if … else …` gives one extra point to each of the first `n % k` folds.
- **`order[start:start + size]`** is the next piece of the shuffled list; `start` moves forward by `size` each time round the loop.
- **`np.setdiff1d(order, validation)`**: every index in `order` that is *not* in `validation`, sorted. That's the training set.

Trace it for `kfold(10, 3, seed=4)`:

| fold | `start` | size | validation (sorted) | train |
|---|---|---|---|---|
| 0 | 0 | 10 // 3 + 1 = 4 | `[3, 4, 8, 9]` | `[0, 1, 2, 5, 6, 7]` |
| 1 | 4 | 3 | `[0, 2, 6]` | `[1, 3, 4, 5, 7, 8, 9]` |
| 2 | 7 | 3 | `[1, 5, 7]` | `[0, 2, 3, 4, 6, 8, 9]` |

4 + 3 + 3 = 10: every index lands in exactly one validation set.

```check
run ".venv/Scripts/python -m pytest -q tests/test_folds.py -k kfold" label="every point held out once, never trained on while held out, the same folds as scikit-learn" -- order = np.arange(n); np.random.RandomState(seed).shuffle(order); cut into k pieces, the first n % k one larger; validation = sorted piece, train = np.setdiff1d(order, validation)
```

## Score every fold

Now train and measure once per fold. Add `cross_validate` to `folds.py`:

```python file=folds.py
import numpy as np


def kfold(n: int, k: int, seed: int) -> list[tuple[np.ndarray, np.ndarray]]:
    """(train indices, validation indices) for each of k folds, as scikit-learn's KFold(shuffle=True) makes them."""
    order = np.arange(n)
    np.random.RandomState(seed).shuffle(order)
    sizes = [n // k + (1 if fold < n % k else 0) for fold in range(k)]
    folds, start = [], 0
    for size in sizes:
        validation = np.sort(order[start:start + size])
        train = np.setdiff1d(order, validation)
        folds.append((train, validation))
        start += size
    return folds


def cross_validate(make_model, X: np.ndarray, y: np.ndarray, k: int, seed: int) -> list[float]:
    """The validation RMSE of a fresh model on each of k folds."""
    errors = []
    for train, validation in kfold(len(y), k, seed):
        model = make_model().fit(X[train], y[train])
        predictions = model.predict(X[validation])
        errors.append(float(np.sqrt(np.mean((y[validation] - predictions) ** 2))))
    return errors
```

- **`X[train]`**, where `train` is an array of row numbers, picks out those rows (NumPy's **fancy indexing**, a cousin of lesson 1.3's masks). So `X[train]` and `y[train]` are the training houses, in matching order.
- **`make_model`** is a *function that makes a model*, and the test passes the class `LinearRegression` itself, not `LinearRegression()`. Calling it, `make_model()`, builds a **fresh** model each fold. Reusing one model object would carry nothing over here (`fit` starts again), but for models that *can* continue from where they left off, a fresh one per fold is the only safe habit: no fold may learn anything from another fold's validation points.

```predict
question: With 5 folds on 45 houses, how many times is a model fitted, and on how many houses each time?
choice: Once, on all 45
choice: 5 times, on 9 houses each
choice: 5 times, on 36 houses each
answer: 5 times, on 36 houses each
explain: Each fold holds out 9 houses (45 / 5) and trains on the other 36. That's the price of cross-validation: k fits instead of one. It's also why each fold's model is slightly worse than one trained on all 45; cross-validation estimates the error of "this kind of model, trained on about this much data".
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_folds.py" label="your cross-validation gives exactly scikit-learn's five fold errors"
```

## scikit-learn's version

You've now checked it equals this one line, which is what you'll use from here on:

```python
from sklearn.model_selection import KFold, cross_val_score

scores = cross_val_score(LinearRegression(), X, y,
                         cv=KFold(n_splits=5, shuffle=True, random_state=0),
                         scoring="neg_root_mean_squared_error")
errors = -scores
```

- **`cv=`** says how to split. A plain number like `cv=5` also works, but then it splits **without shuffling**, in file order: if the file were sorted by price, every fold would be one price band. Pass a shuffled `KFold` unless you know the order doesn't matter.
- **`scoring="neg_root_mean_squared_error"`**: scikit-learn's scoring functions all follow one rule, *higher is better*, so it can always pick the maximum. Error is lower-is-better, so it reports the error **negated**. That's why there's a minus sign to undo it.
- It clones the model you pass for each fold, the same "fresh model per fold" rule as `make_model`.

## Is the improvement real?

Lesson 3.3 used all three features. Does adding bedrooms and age really beat square footage alone? Create `compare.py`:

```python file=compare.py
import numpy as np
from sklearn.linear_model import LinearRegression

import folds
import houses

X, y = houses.load("data/houses.csv", ["sqft", "bedrooms", "age"])
choices = {"sqft": X[:, :1], "sqft, bedrooms, age": X}
results = {}
print(f"{'features':<21} {'error on each fold':<31} {'mean':>6} {'spread':>7}")
for name, features in choices.items():
    errors = folds.cross_validate(LinearRegression, features, y, k=5, seed=0)
    results[name] = errors
    each = " ".join(f"{error:>5.0f}" for error in errors)
    print(f"{name:<21} {each:<31} {np.mean(errors):>6.0f} {np.std(errors):>7.0f}")

difference = np.array(results["sqft"]) - np.array(results["sqft, bedrooms, age"])
print("three features better on", int(np.sum(difference > 0)), "of 5 folds; by", f"{np.mean(difference):.0f}", "on average")
```

Both models are scored on **the same folds**, so the comparison is fold by fold: each fold is a fair head-to-head on the same held-out houses. That needs the same rows *and* the same seed, which is why the data is loaded once and the one-feature version is a slice of it: **`X[:, :1]`** means every row (`:`), columns up to but not including 1, so just the `sqft` column, still as a table with one column.

```predict
question: What would go wrong if compare.py loaded the sqft-only data separately, with houses.load("data/houses.csv", ["sqft"])?
choice: Nothing: the sqft values are the same either way
choice: The sqft-only model would get 48 houses, so its folds would hold out different houses and the comparison would no longer be like for like
choice: It would crash on the houses with no age
answer: The sqft-only model would get 48 houses, so its folds would hold out different houses and the comparison would no longer be like for like
explain: load only skips a row when one of the columns you asked for is blank. Ask for sqft alone and the three houses with no age come back, n becomes 48, and the shuffle cuts completely different folds. Its errors would then differ partly because of the model and partly because of which houses it was tested on, and you couldn't tell how much of each. (Try it: the sqft-only mean changes by about $500, and three features then look better on only 2 of 5 folds.)
```

```powershell
.venv\Scripts\python compare.py
```

```text
features              error on each fold                mean  spread
sqft                  33083 30591 20872 34474 29528    29710    4754
sqft, bedrooms, age   26850 28277 26137 34031 23015    27662    3620
three features better on 4 of 5 folds; by 2048 on average
```

**`np.std`** is the standard deviation (lesson 1.2): a typical distance of each fold's error from the mean. Here it's the measure of how much the score depends on which houses are held out.

How to read this honestly:

- The three-feature model is better on average by about \$2,000, and on four of the five folds.
- But the spread *between folds* is \$3,600 to \$4,800, bigger than the difference. On fold 2, square footage alone did better by over \$5,000.
- So: probably a real improvement, but a modest one, from 45 houses. With so little data, cross-validation's main gift is the spread. It tells you how *uncertain* your measurement is, which a single split never does.

> **Spread across folds** (the standard deviation of the fold scores): how much the estimate depends on which points were held out. A difference between models much smaller than the spread is not evidence of anything.
>
> *Picture it as* a gauge's repeatability once more. If two parts differ by less than the gauge's scatter, the gauge can't tell you which is bigger, however many decimal places it shows.

**Where the picture stops working:** the folds share most of their training data, so the five numbers aren't independent measurements, and no simple formula turns them into a precise margin of error. Use the spread as a warning light, not as a confidence interval.

```check
run ".venv/Scripts/python compare.py" stdout="three features better on 4 of 5 folds; by 2048 on average" label="compare.py scores both models on the same five folds"
```

### Choosing k

- **More folds** mean each model trains on more of the data (closer to the real thing), at the cost of more fits. *k* = 5 or 10 is the usual choice.
- **k = n**, one point held out at a time, is **leave-one-out**: as much training data as possible, but *n* fits, and a very noisy score per fold.
- Cross-validation chooses; it doesn't replace the final **test** set. The rule from lesson 7.2 still holds: cross-validate on the training data to choose, then report once on a test set nobody has touched.

There's one way cross-validation can still lie to you, quite badly, and it's the subject of the last lesson in this chapter.
