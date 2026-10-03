---
title: 3.3 — Your Own LinearRegression
track: Your First Model — Predict a Number
runtime: none
concepts: linear-regression, classes, generalization
revisits: gradient-descent, feature-scaling, matrices, testing
notebook: ml-multiple-regression, ml-overfitting
lab: 6
problem: You have an algorithm; a model needs to be a thing you can fit once and ask for predictions later. And an RMSE measured on the houses it learned from proves nothing. How well does it predict a house it has never seen?
---

You've written every piece of linear regression: the prediction, the loss, its gradient, the training loop and the scaling that makes the loop work. This lesson packages them the way every ML library does, as an object with two methods:

```python
model = LinearRegression()
model.fit(X_train, y_train)      # learn the parameters
model.predict(X_new)             # use them
```

and then asks the question that separates machine learning from curve fitting.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_linear.py provided
# Tests for houses/linear.py and houses/split.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_linear.py
from pathlib import Path

import numpy as np
import pytest
from pytest import approx

from houses import data
from houses.linear import LinearRegression

HOUSES = Path(__file__).resolve().parent.parent / "data" / "houses.csv"


def test_fit_recovers_known_weights_on_very_different_scales():
    rng = np.random.default_rng(3)
    X = np.column_stack([rng.uniform(500, 3000, 50), rng.uniform(0, 5, 50)])
    y = 2 * X[:, 0] - 3000 * X[:, 1] + 5000
    model = LinearRegression().fit(X, y)
    assert model.coef_ == approx([2, -3000], rel=1e-4)
    assert model.intercept_ == approx(5000, rel=1e-4)


def test_fit_returns_the_model_and_keeps_its_history():
    X = np.array([[0.0], [1.0], [2.0]])
    model = LinearRegression(steps=50)
    assert model.fit(X, 3 * X[:, 0]) is model
    assert len(model.history_) == 51


def test_fit_agrees_with_exact_least_squares_on_the_houses():
    X, y = data.load(HOUSES, ["sqft", "bedrooms", "age"])
    model = LinearRegression().fit(X, y)
    exact, *_ = np.linalg.lstsq(np.column_stack([X, np.ones(len(y))]), y, rcond=None)
    assert model.coef_ == approx(exact[:3], rel=1e-4)
    assert model.intercept_ == approx(exact[3], rel=1e-4)


def test_fit_then_predict_new_rows():
    X, y = data.load(HOUSES, ["sqft"])
    model = LinearRegression().fit(X, y)
    assert model.predict(np.array([[1000.0], [2000.0]])) == approx([165_160, 321_953], abs=1)


def test_predict_before_fit_says_what_to_do():
    with pytest.raises(RuntimeError, match="fit"):
        LinearRegression().predict(np.array([[1.0]]))


def test_split_sizes_and_no_overlap():
    from houses import split
    X = np.arange(40).reshape(20, 2)
    y = np.arange(20)
    X_train, X_test, y_train, y_test = split.train_test_split(X, y, test_fraction=0.25, seed=0)
    assert (len(y_train), len(y_test)) == (15, 5)
    assert sorted([*y_train, *y_test]) == list(range(20)), "every row is in exactly one part"


def test_split_keeps_each_row_with_its_target():
    from houses import split
    X = np.arange(40).reshape(20, 2)
    y = np.arange(20)
    X_train, _, y_train, _ = split.train_test_split(X, y, test_fraction=0.25, seed=0)
    assert np.array_equal(X_train[:, 0], 2 * y_train), "row i of X is [2i, 2i+1] and goes with y = i"


def test_split_is_repeatable_with_a_seed_and_shuffled():
    from houses import split
    X = np.arange(40).reshape(20, 2)
    y = np.arange(20)
    first = split.train_test_split(X, y, seed=7)[3]
    assert np.array_equal(first, split.train_test_split(X, y, seed=7)[3]), "same seed, same split"
    assert not np.array_equal(first, split.train_test_split(X, y, seed=8)[3]), "different seed, different split"
    assert not np.array_equal(first, np.arange(15, 20)), "shuffled, not just the last rows"
```

The first test is the one lesson 3.2 earned: one feature in the hundreds or thousands, another between 0 and 5, weights of 2 and −3,000. Without standardisation no single learning rate could fit both. Inside your class, it'll be routine.

```check
file tests/test_linear.py -- Click "Create provided tests/test_linear.py" above.
```

## A model is an object

Create `houses/linear.py`:

```python file=houses/linear.py
import numpy as np

from houses import model, scaling, train


class LinearRegression:
    def __init__(self, rate: float = 0.1, steps: int = 1000):
        self.rate = rate
        self.steps = steps

    def fit(self, X: np.ndarray, y: np.ndarray) -> "LinearRegression":
        self.scaler_ = scaling.Standardizer().fit(X)
        w, b, self.history_ = train.gradient_descent(self.scaler_.transform(X), y, self.rate, self.steps)
        self.coef_, self.intercept_ = self.scaler_.unscale(w, b)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not hasattr(self, "coef_"):
            raise RuntimeError("this model has not been fitted yet: call fit(X, y) first")
        return model.predict(X, self.coef_, self.intercept_)
```

Two kinds of attribute, and the difference is the design:

*Picture the difference as* the settings you key into a machine before a run (feed rate, number of passes) versus the measurements the run produces. You choose the first; the run determines the second.

- **Settings**, given to `__init__`: `rate` and `steps`, called **hyperparameters**. You choose them; the algorithm doesn't learn them. `__init__` only stores them: it never touches data.
- **Learned values**, created by `fit`, named with a trailing underscore: `coef_` (the weights, in original units), `intercept_` (the bias), `scaler_` and `history_`. They don't exist until the model has seen data, which is how `predict` can tell whether `fit` has run: `hasattr(self, "coef_")` asks whether the object has that attribute yet.

So when you see `model.fit(X_train, y_train)` in any ML code from now on, you know what it means, because you wrote it: standardise the features using the training data's statistics, start every weight at zero, step against the gradient of the mean squared error a thousand times, and convert the weights back into the original units. `predict` is then one matrix–vector product.

This is deliberately **not** identical to scikit-learn's class: yours trains by gradient descent and takes a learning rate. Lesson 3.4 shows what scikit-learn does instead, and why.

```check
run ".venv/Scripts/python -m pytest -q tests/test_linear.py -k \"fit or predict\"" label="LinearRegression fits, predicts, and agrees with exact least squares" -- fit stores coef_ and intercept_ in original units, using scaler_.unscale.
```

## What the weights say

Fit all three numerical features and read the weights. Create `weights.py`:

```python file=weights.py
from houses import data
from houses.linear import LinearRegression

FEATURES = ["sqft", "bedrooms", "age"]
X, y = data.load("data/houses.csv", FEATURES)

for steps in [100, 1000]:
    model = LinearRegression(steps=steps).fit(X, y)
    weights = ", ".join(f"{name} {weight:+,.0f}" for name, weight in zip(FEATURES, model.coef_))
    print(f"{steps:>5} steps: {weights}, intercept {model.intercept_:,.0f}")
```

```powershell
.venv\Scripts\python weights.py
```

```text
  100 steps: sqft +145, bedrooms +5,973, age -588, intercept 32,305
 1000 steps: sqft +171, bedrooms -5,451, age -554, intercept 22,255
```

```predict
question: After 1,000 steps (the converged answer) the bedrooms weight is −5,451. Does an extra bedroom make a house worth 5,451 dollars less?
choice: Yes: the model learned that bedrooms lower prices
choice: No: it's the effect of a bedroom with sqft and age held fixed, and the same floor area split into more rooms is worth a little less
choice: No: the weight is a bug, because bedrooms correlate positively with price
answer: No: it's the effect of a bedroom with sqft and age held fixed, and the same floor area split into more rooms is worth a little less
explain: Each weight in a linear model answers "how does the prediction change when *this* feature goes up by one, **with every other feature unchanged**?" A house with one more bedroom but the same square footage has smaller rooms. Bigger houses do have more bedrooms and do cost more (lesson 2.1: bedrooms correlate +0.85 with price), but that effect is carried by the sqft weight, because sqft and bedrooms correlate +0.93 with each other.

When two features carry nearly the same information, the model can trade weight between them almost freely: that's why after 100 steps the bedrooms weight was still +5,973. The loss landscape has a long, nearly flat valley in the direction "more sqft weight, less bedrooms weight", exactly lesson 2.4's slow direction, and gradient descent crawls along it. Weights of strongly correlated features are unstable and easy to misread. Never read one weight on its own as a fact about the world.
```

```check
run ".venv/Scripts/python weights.py" stdout="1000 steps: sqft +171, bedrooms -5,451, age -554" label="after 1000 steps the weights have converged"
```

## Held-out houses

Here's the problem with every RMSE so far: it was measured on **the same houses the model learned from**. A model could memorise those 45 prices and score perfectly, and know nothing about the next house to come on the market. What matters is **generalisation**: how well the model predicts houses it has never seen.

> **Generalisation**: a model's ability to make good predictions on examples it was not trained on. **Training set**: the examples used to choose the parameters. **Test set**: examples kept aside and used only to measure the finished model.
>
> *Picture it as* the difference between memorising the answers to a practice exam and understanding the subject. Grading a student on the same practice questions they studied says nothing; the real exam uses new questions, kept sealed until the end. The test set is that sealed exam, and opening it early (training on it, or tuning against it) ruins it.

The standard answer: before training, set some houses aside. Train on the rest (the **training set**); measure on the ones set aside (the **test set**). The model never sees the test houses during `fit`, so they stand in for the future. Create `houses/split.py`:

```python file=houses/split.py
import numpy as np


def train_test_split(X: np.ndarray, y: np.ndarray, test_fraction: float = 0.25, seed: int = 0):
    order = np.random.default_rng(seed).permutation(len(y))
    n_test = round(len(y) * test_fraction)
    test, train = order[:n_test], order[n_test:]
    return X[train], X[test], y[train], y[test]
```

- **`permutation(len(y))`** shuffles the row numbers `0 … n−1` into a random order, like shuffling a deck before dealing two hands. At the prompt, `np.random.default_rng(0).permutation(5)` gives `array([2, 4, 3, 0, 1])`, every time, because the seed is fixed. Shuffling matters: if the file were sorted by price or by date, the last rows would be a biased sample.
- **`X[train]`** is **fancy indexing**: indexing an array with an array of row numbers picks those rows, in that order. Using the same `train` numbers for `X` and `y` keeps each house's features with its price; the second test checks this.
- **A seed** makes the shuffle repeatable. Without one, every run would test on different houses and the numbers would never be comparable.

```check
run ".venv/Scripts/python -m pytest -q tests/test_linear.py" label="every test passes, including the split's" -- X[train] and y[train] must use the same row numbers.
```

## Does it generalise?

Create `evaluate.py`:

```python file=evaluate.py
import numpy as np

from houses import data, model, split
from houses.linear import LinearRegression

X, y = data.load("data/houses.csv", ["sqft", "bedrooms", "age"])

print("seed   train RMSE   test RMSE   guess-the-mean test RMSE")
for seed in range(5):
    X_train, X_test, y_train, y_test = split.train_test_split(X, y, test_fraction=0.25, seed=seed)
    fitted = LinearRegression().fit(X_train, y_train)
    baseline = np.full_like(y_test, y_train.mean())
    print(f"{seed:>4} {model.rmse(y_train, fitted.predict(X_train)):>12,.0f} "
          f"{model.rmse(y_test, fitted.predict(X_test)):>11,.0f} {model.rmse(y_test, baseline):>12,.0f}")
```

The **baseline** guesses the *training* set's mean price for every test house: the best a model can do knowing nothing about the houses. It must use the training mean, not the test mean, because the test prices are supposed to be unknown.

```powershell
.venv\Scripts\python evaluate.py
```

```text
seed   train RMSE   test RMSE   guess-the-mean test RMSE
   0       24,264      32,470       48,829
   1       27,360      22,520       54,063
   2       26,578      24,289       67,951
   3       24,225      32,598       88,852
   4       26,055      26,306       56,531
```

Three things to read in this table:

1. **The model beats the baseline on every split**, by a long way. It has learned something real about houses, not just about these houses.
2. **Test error is usually higher than training error.** On the training houses, the weights were chosen to fit those exact prices, including their noise; new houses have noise of their own. A big gap between the two is the signature of **overfitting**, Part XIX's main subject. Here the gap is moderate.
3. **The test RMSE depends a lot on which 11 houses were held out**: from 22,520 to 32,598. With only 11 test houses, a couple of unusual ones move the number by thousands. A single train/test split of a small dataset gives a rough answer; **cross-validation** (Part XIX) averages over many splits to give a steadier one.

```check
run ".venv/Scripts/python evaluate.py" stdout="   0       24,264      32,470       48,829" label="evaluate.py measures train and test error for each split"
```

Next lesson: the same model from scikit-learn, the library you'll use from now on, checked against yours.
