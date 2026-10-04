---
title: 7.2 — A Penalty for Wiggling: Regularisation
track: Evaluation — Is the Model Any Good?
runtime: none
concepts: regularization
revisits: linear-regression, gradients, feature-scaling, scikit-learn, testing
notebook: ml-regularisation
lab: 7
problem: The degree-10 model swung wildly because nothing stopped its weights growing huge. Can you keep a flexible model but make extreme weights cost something, and how do you choose how much, without peeking at the test set?
---

Look at what the degree-10 model actually learned. Its largest weight (on standardised features) is about **2,175**. To thread a curve through twelve noisy points, it balances enormous positive and negative weights against each other, and between the points those huge terms stop cancelling and the curve flies off. The wildness lives in the size of the weights.

So add a cost for large weights to the loss. The model then has to *earn* every bit of weight it uses with a real reduction in error. That's **regularisation**, and this lesson writes its most common form, **ridge regression**, from the normal equations of lesson 3.4.

> **Regularisation**: adding a penalty to a model's loss that grows with the size of its parameters, so the fitted model prefers small, smooth explanations unless the data strongly demands otherwise. The penalty's strength, written λ ("lambda") or α ("alpha"), is a hyperparameter.
>
> *Picture it as* a spring pulling every dial on the machine back towards zero. A dial only moves far if the test pieces keep pushing it there; one odd test piece (noise) can't drag it to an extreme. A stronger spring (larger λ) means the evidence has to push harder.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_ridge.py provided
# Tests for ridge.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_ridge.py
import numpy as np
from pytest import approx
from sklearn.linear_model import LinearRegression, Ridge

import poly
import waves

TRAIN, VALIDATION, TEST = waves.wave(12, seed=0), waves.wave(12, seed=7), waves.wave(1000, seed=100)


def standardised(degree):
    import ridge
    scaler = ridge.Standardiser().fit(poly.powers(TRAIN[0], degree))
    return scaler, scaler.transform(poly.powers(TRAIN[0], degree))


def test_standardiser_gives_mean_zero_and_spread_one():
    _, Z = standardised(4)
    assert Z.mean(axis=0) == approx(np.zeros(4), abs=1e-12)
    assert Z.std(axis=0) == approx(np.ones(4))


def test_fit_with_no_penalty_is_ordinary_least_squares():
    import ridge
    _, Z = standardised(3)
    w, b = ridge.fit(Z, TRAIN[1], penalty=0)
    ordinary = LinearRegression().fit(Z, TRAIN[1])
    assert w == approx(ordinary.coef_) and b == approx(ordinary.intercept_)


def test_fit_matches_scikit_learn_ridge():
    import ridge
    _, Z = standardised(10)
    for penalty in [0.001, 0.1, 10]:
        w, b = ridge.fit(Z, TRAIN[1], penalty)
        theirs = Ridge(alpha=penalty).fit(Z, TRAIN[1])
        assert w == approx(theirs.coef_, rel=1e-4, abs=1e-8)
        assert b == approx(theirs.intercept_)


def test_fit_shrinks_weights_as_the_penalty_grows():
    import ridge
    _, Z = standardised(10)
    biggest = [np.abs(ridge.fit(Z, TRAIN[1], penalty)[0]).max() for penalty in [0, 0.01, 1, 100]]
    assert biggest == sorted(biggest, reverse=True)


def test_choose_takes_the_lowest_validation_error_not_the_lowest_test_error():
    import ridge
    table = ridge.errors_by_penalty(TRAIN, VALIDATION, TEST, degree=10, penalties=[0, 0.001, 0.01, 0.1, 1, 10])
    chosen = ridge.choose(table)
    assert chosen["penalty"] == 0.01
    assert chosen["validation"] == min(row["validation"] for row in table)
    assert chosen["test"] == approx(0.562, abs=0.001)
```

Three data sets now, each with one job:

- **`TRAIN`**: twelve points the model is fitted on.
- **`VALIDATION`**: twelve *different* points, used to **choose** the penalty.
- **`TEST`**: a thousand points, looked at **once**, at the end, to report how good the chosen model is.

The last test checks something unusual: that the code picks the penalty with the lowest **validation** error, *even though another penalty has a lower test error*. That's not a bug; it's the discipline this lesson is about.

```check
file tests/test_ridge.py -- Click "Create provided tests/test_ridge.py" above.
```

## Standardise first

Ridge's penalty is $\lambda \sum_j w_j^2$: the same price for every weight. That's only fair if every feature is on the same scale. The column $x^{10}$ has values much smaller than $x$ (for $|x| < 1$), so it needs a much bigger weight to have the same effect, and an unscaled penalty would punish it far more. Lesson 3.2's standardisation puts every column on the same footing.

Create `ridge.py` with a standardiser (lesson 3.2's, once more, because it's needed again):

```python file=ridge.py
import numpy as np


class Standardiser:
    def fit(self, X: np.ndarray) -> "Standardiser":
        self.mean_ = X.mean(axis=0)
        self.std_ = X.std(axis=0)
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.std_
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_ridge.py -k standardiser" label="standardised columns have mean 0 and spread 1"
```

## Ridge from the normal equations

Lesson 3.4 found the least-squares weights by setting the gradient of the loss to zero, which gave the normal equations $X^\top X\mathbf{w} = X^\top\mathbf{y}$. Ridge's loss adds the penalty:

$$L(\mathbf{w}) = \sum_{i}(\hat{y}_i - y_i)^2 + \lambda \sum_j w_j^2$$

The penalty's gradient with respect to $w_j$ is just $2\lambda w_j$ (the derivative of $w^2$ is $2w$, lesson 2.3). Add it to the old gradient, set the total to zero, and the factor 2 cancels:

$$X^\top(X\mathbf{w} - \mathbf{y}) + \lambda\mathbf{w} = \mathbf{0} \quad\Longrightarrow\quad (X^\top X + \lambda I)\,\mathbf{w} = X^\top\mathbf{y}$$

One change to the normal equations: $\lambda$ added down the diagonal of $X^\top X$. ($I$ is the identity matrix, lesson 2.2, so $\lambda I$ has λ on the diagonal and zeros elsewhere.)

Two details. The bias $b$ isn't penalised (shifting the whole curve up or down isn't "wiggling"). With standardised features, every column has mean 0, so the best bias is simply the mean of $y$, and the weights are fitted to $y$ minus its mean. Update `ridge.py`:

```python file=ridge.py
import numpy as np


class Standardiser:
    def fit(self, X: np.ndarray) -> "Standardiser":
        self.mean_ = X.mean(axis=0)
        self.std_ = X.std(axis=0)
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.std_


def fit(Z: np.ndarray, y: np.ndarray, penalty: float) -> tuple[np.ndarray, float]:
    """Ridge regression on standardised features Z: returns (weights, bias)."""
    k = Z.shape[1]
    weights = np.linalg.solve(Z.T @ Z + penalty * np.eye(k), Z.T @ (y - y.mean()))
    return weights, float(y.mean())
```

**`np.linalg.solve(A, b)`** solves the system of linear equations $A\mathbf{w} = \mathbf{b}$ for $\mathbf{w}$. It's how you "divide by a matrix": never compute $A^{-1}$ and multiply, which is slower and less accurate; `solve` does it directly.

There's a second, quieter benefit. For degree 10, $Z^\top Z$ is nearly **singular** (some columns are almost combinations of others, like $x^9$ and $x^{10}$), which is why least squares gave such extreme weights. Adding λ to the diagonal makes the system well-behaved: regularisation is also a numerical repair.

```check
run ".venv/Scripts/python -m pytest -q tests/test_ridge.py -k fit" label="ridge equals least squares with no penalty, matches scikit-learn's Ridge, and shrinks weights as the penalty grows" -- weights = np.linalg.solve(Z.T @ Z + penalty * np.eye(k), Z.T @ (y - y.mean())); bias = y.mean()
```

## Choose the penalty on validation data

Add the experiment and the choice:

```python file=ridge.py
import numpy as np

from poly import powers, rmse


class Standardiser:
    def fit(self, X: np.ndarray) -> "Standardiser":
        self.mean_ = X.mean(axis=0)
        self.std_ = X.std(axis=0)
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        return (X - self.mean_) / self.std_


def fit(Z: np.ndarray, y: np.ndarray, penalty: float) -> tuple[np.ndarray, float]:
    """Ridge regression on standardised features Z: returns (weights, bias)."""
    k = Z.shape[1]
    weights = np.linalg.solve(Z.T @ Z + penalty * np.eye(k), Z.T @ (y - y.mean()))
    return weights, float(y.mean())


def errors_by_penalty(train, validation, test, degree: int, penalties: list[float]) -> list[dict]:
    scaler = Standardiser().fit(powers(train[0], degree))
    def features(data):
        return scaler.transform(powers(data[0], degree))
    table = []
    for penalty in penalties:
        weights, bias = fit(features(train), train[1], penalty)
        table.append({
            "penalty": penalty,
            "train": rmse(train[1], features(train) @ weights + bias),
            "validation": rmse(validation[1], features(validation) @ weights + bias),
            "test": rmse(test[1], features(test) @ weights + bias),
            "largest weight": float(np.abs(weights).max()),
        })
    return table


def choose(table: list[dict]) -> dict:
    return min(table, key=lambda row: row["validation"])
```

- **The scaler is fitted on the training data only**, and then used to transform all three sets (lesson 3.2's rule). Fitting it on validation or test data would leak information from them into the model. Lesson 7.4 shows how much that can matter.
- **`features`** is a small function defined inside another (lesson 2.4's closure): it remembers `scaler` and `degree`.
- **`min(table, key=…)`** returns the *row* whose validation error is smallest, using a key function as `sorted` did in lesson 0.2.

Run the whole test file:

```check
run ".venv/Scripts/python -m pytest -q tests/test_ridge.py" label="the penalty is chosen by validation error"
```

## What the penalty does

Create `penalties.py`:

```python file=penalties.py
import ridge
import waves

train, validation, test = waves.wave(12, seed=0), waves.wave(12, seed=7), waves.wave(1000, seed=100)
table = ridge.errors_by_penalty(train, validation, test, degree=10, penalties=[0, 0.001, 0.01, 0.1, 1, 10])

print("penalty   train   validation   test   largest weight")
for row in table:
    print(f"{row['penalty']:>7g} {row['train']:>7.3f} {row['validation']:>12.3f} {row['test']:>6.3f} {row['largest weight']:>16.1f}")

chosen = ridge.choose(table)
print(f"chosen by validation: penalty {chosen['penalty']:g}, test RMSE {chosen['test']:.3f}")
```

```powershell
.venv\Scripts\python penalties.py
```

```text
penalty   train   validation   test   largest weight
      0   0.019        7.837 15.425           2174.7
  0.001   0.210        0.317  0.856              3.3
   0.01   0.221        0.313  0.562              1.7
    0.1   0.250        0.373  0.394              1.3
      1   0.327        0.513  0.443              0.7
     10   0.491        0.763  0.675              0.2
chosen by validation: penalty 0.01, test RMSE 0.562
```

Read it top to bottom. With no penalty, the weights reach 2,175 and the model is the wild degree-10 curve from lesson 7.1. A tiny penalty, 0.001, already brings the largest weight down to 3.3 and cuts test error from 15.4 to 0.86: the same flexible model, tamed. Too much penalty (10) squashes every weight towards zero, and the model underfits: high bias again, now from the penalty instead of the degree. λ is a dial from overfitting to underfitting.

Validation picks 0.01. But the **test** column says 0.1 would have been better (0.394 against 0.562).

```predict
question: The test set shows penalty 0.1 is better than the 0.01 that validation chose. Should you switch to 0.1?
choice: Yes: the test set is bigger, so it knows better
choice: No: once you choose using the test set, its score stops being an honest estimate
answer: No: once you choose using the test set, its score stops being an honest estimate
explain: The test set's job is to say how the finished model does on data nobody used for any decision. The moment you pick the penalty because of its test score, the test score has been optimised, and it overstates how good the model is, just as the training score did. Do that a few times and you've quietly tuned the model to the test set.

The disagreement is real information, though: it says the validation set (only twelve points) is a noisy judge. The answer is a better way of validating, not peeking at the test set. That's the next lesson: cross-validation, which reuses every training point for validation.
```

```check
run ".venv/Scripts/python penalties.py" stdout="chosen by validation: penalty 0.01, test RMSE 0.562" label="penalties.py shows the trade-off and the honest choice"
```

### The three sets, and the rule

| Set | Used for | Looked at |
|---|---|---|
| Training | fitting the parameters (the weights) | constantly |
| Validation | choosing hyperparameters (degree, λ) | for every choice |
| Test | reporting the final, honest error | **once** |

*Picture the three as* practice questions, a mock exam, and the real exam. You study on the practice questions; you decide when you're ready using the mock; the real exam is sat once and its mark is the one that counts. Re-sitting the real exam until you like the mark doesn't make you better at the subject.

scikit-learn's `Ridge(alpha=…)` is what you'll use from now on; you've checked that it computes exactly your formula.
