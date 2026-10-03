---
title: 3.4 — scikit-learn: The Professional Version
track: Your First Model — Predict a Number
runtime: none
concepts: scikit-learn, regression-metrics, linear-regression
revisits: generalization, loss, descriptive-statistics, command-line, packages
notebook: ml-sklearn-workflow, ml-least-squares
lab: 6
problem: Your model works. Why would anyone use a library instead, what does the library do differently, and how do you turn a trained model into something a person can use?
---

```python
from sklearn.linear_model import LinearRegression
```

That line is where most courses start. You're arriving at it after writing every part of linear regression yourself, so this lesson can do something most can't: show you exactly what changes when you switch to the library, and prove that the answers don't.

**scikit-learn** is the standard Python library for classical machine learning: regression, classification, clustering, preprocessing, evaluation. Every model in it has the same shape as the class you just wrote: settings in the constructor, `fit(X, y)` to learn, `predict(X)` to use, learned values in attributes ending with `_`. You copied that design in lesson 3.3, so it will feel familiar on purpose.

## Install scikit-learn

Update `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
```

scikit-learn brings **SciPy** (scientific algorithms, including the linear algebra it uses below) and two smaller helpers with it. The package is installed as `scikit-learn` but imported as `sklearn`.

```check
run ".venv/Scripts/python -c \"import sklearn; print(sklearn.__version__)\"" stdout="1.9.1" label="scikit-learn 1.9.1 is installed" -- Add scikit-learn==1.9.1 to requirements.txt and install it.
```

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_sklearn.py provided
# scikit-learn must agree with your code. Run these with:
#   .venv\Scripts\python -m pytest -q tests/test_sklearn.py
from pathlib import Path

import numpy as np
from pytest import approx
from sklearn import linear_model, metrics

from houses import data
from houses.linear import LinearRegression

HOUSES = Path(__file__).resolve().parent.parent / "data" / "houses.csv"
X, y = data.load(HOUSES, ["sqft", "bedrooms", "age"])


def test_same_model_same_weights():
    theirs = linear_model.LinearRegression().fit(X, y)
    yours = LinearRegression().fit(X, y)
    assert yours.coef_ == approx(theirs.coef_, rel=1e-4)
    assert yours.intercept_ == approx(theirs.intercept_, rel=1e-4)


def test_mae_matches_scikit_learn():
    from houses import metrics as mine
    predictions = linear_model.LinearRegression().fit(X, y).predict(X)
    assert mine.mae(y, predictions) == approx(metrics.mean_absolute_error(y, predictions))


def test_r2_matches_scikit_learn():
    from houses import metrics as mine
    predictions = linear_model.LinearRegression().fit(X, y).predict(X)
    assert mine.r2(y, predictions) == approx(metrics.r2_score(y, predictions))


def test_r2_of_guessing_the_mean_is_zero_and_of_a_perfect_model_is_one():
    from houses import metrics as mine
    assert mine.r2(y, np.full_like(y, y.mean())) == approx(0, abs=1e-12)
    assert mine.r2(y, y) == 1


def test_r2_can_be_negative():
    from houses import metrics as mine
    assert mine.r2(np.array([1.0, 2.0, 3.0]), np.array([3.0, 2.0, 1.0])) < 0, "worse than guessing the mean"
```

`from houses import metrics as mine` imports your `metrics` module (written later in this lesson, which is why it's imported inside the tests that need it) under the name `mine`, because `metrics` is already taken by scikit-learn's. `import … as …` renames on import; you've used it since `import numpy as np`.

```check
file tests/test_sklearn.py -- Click "Create provided tests/test_sklearn.py" above.
```

## The same model from the library

Create `compare.py`, which fits both models on the same houses:

```python file=compare.py
import time

from sklearn.linear_model import LinearRegression as LibraryRegression

from houses import data
from houses.linear import LinearRegression

FEATURES = ["sqft", "bedrooms", "age"]
X, y = data.load("data/houses.csv", FEATURES)

for name, model in [("yours", LinearRegression()), ("scikit-learn", LibraryRegression())]:
    start = time.perf_counter()
    model.fit(X, y)
    seconds = time.perf_counter() - start
    weights = ", ".join(f"{feature} {weight:+.2f}" for feature, weight in zip(FEATURES, model.coef_))
    print(f"{name:<13} {weights}, intercept {model.intercept_:,.2f}  ({seconds * 1000:.1f} ms)")
```

The loop treats both models identically: construct, `fit`, read `coef_` and `intercept_`. That works only because they share the same **interface**, the same method and attribute names. It's the most valuable design decision in scikit-learn: any code written against `fit`/`predict` works with any of its models, including ones that don't exist yet.

```powershell
.venv\Scripts\python compare.py
```

```text
yours         sqft +171.46, bedrooms -5451.37, age -554.34, intercept 22,254.71  (14.3 ms)
scikit-learn  sqft +171.46, bedrooms -5451.53, age -554.34, intercept 22,254.57  (3.3 ms)
```

(Your timings will differ.) The same weights, to within a few cents on the bedrooms weight, which yours was still slowly approaching along lesson 3.3's flat valley.

```check
run ".venv/Scripts/python compare.py" stdout="scikit-learn  sqft +171.46, bedrooms -5451.53, age -554.34, intercept 22,254.57" label="scikit-learn's weights"
run ".venv/Scripts/python -m pytest -q tests/test_sklearn.py -k same_model" label="your weights match scikit-learn's to 1 part in 10,000"
```

## What scikit-learn does instead

scikit-learn's `LinearRegression` has no learning rate and no number of steps. It doesn't do gradient descent at all.

For linear regression with squared error, the bottom of the loss landscape can be found **directly**. At the minimum, the gradient is zero in every direction. Lesson 3.2's gradient is $\frac{2}{n}X^\top(X\mathbf{w} - \mathbf{y})$ (with the bias folded into $\mathbf{w}$ as a weight on a column of 1s). Set it to zero:

$$X^\top(X\mathbf{w} - \mathbf{y}) = \mathbf{0} \quad\Longrightarrow\quad X^\top X\,\mathbf{w} = X^\top\mathbf{y}$$

These are the **normal equations**: a system of linear equations, one per weight, with the weights as unknowns. For 3 features plus the bias that's 4 equations in 4 unknowns, and solving a linear system is one of the most thoroughly optimised operations in computing. scikit-learn hands it to SciPy's least-squares solver (the same job as `np.linalg.lstsq`, which you used in lesson 3.2 to check your answer), which uses a matrix factorisation that stays accurate even when features are strongly correlated, as `sqft` and `bedrooms` are.

So what did gradient descent buy you, if the library doesn't use it?

- **It's how almost everything else is trained.** Logistic regression (Part XV) has no normal equations: setting its gradient to zero gives equations nobody can solve in closed form. Neural networks, likewise. Every model in this series from Part XV on is trained with the loop you wrote in lesson 3.2, or a refinement of it.
- **It scales.** Solving the normal equations means building $X^\top X$, a features × features matrix. With a million features, that's a trillion entries. Gradient descent only ever needs $X^\top \mathbf{e}$. (scikit-learn's `SGDRegressor` is linear regression trained by gradient descent, for exactly this case.)
- **You know what a learning rate is**, what it means when training explodes, and why scaling fixes it. Every training run you'll ever debug starts there.

**Inspect the result**: everything you'd want to know about the fitted model is an attribute.

```powershell
.venv\Scripts\python -c "from sklearn.linear_model import LinearRegression; from houses import data; X, y = data.load('data/houses.csv', ['sqft', 'bedrooms', 'age']); m = LinearRegression().fit(X, y); print(m.coef_, m.intercept_, m.n_features_in_)"
```

`n_features_in_` records how many features `fit` saw, so `predict` can refuse an `X` with a different number of columns. Your class didn't check that. Libraries are mostly made of checks like this.

## Metrics: how good is good?

RMSE says "typically about 26,000 dollars off". That's meaningful for houses, but you can't compare it with a model of car prices or temperatures. Two more measures appear in every regression report:

**Mean absolute error**, $\text{MAE} = \frac{1}{n}\sum|\hat{y}_i - y_i|$: the average size of a mistake, in dollars, with no squaring, so a few big misses count in proportion. If MAE is much smaller than RMSE, most errors are small and a few are large.

**R²** ("R-squared", the **coefficient of determination**) compares the model with the baseline from lesson 3.1:

$$R^2 = 1 - \frac{\text{MSE of the model}}{\text{MSE of always guessing the mean}} = 1 - \frac{\text{MSE}}{\text{variance of } y}$$

- $R^2 = 1$: perfect predictions.
- $R^2 = 0$: no better than guessing the mean.
- $R^2 < 0$: **worse** than guessing the mean, which a badly broken model can manage.

$R^2 = 0.90$ means "the model's squared error is 10% of the baseline's": it accounts for 90% of the variation in prices. Because it's a ratio, it has no units. Create `houses/metrics.py`:

```python file=houses/metrics.py
import numpy as np


def mae(y: np.ndarray, predictions: np.ndarray) -> float:
    return float(np.mean(np.abs(predictions - y)))


def r2(y: np.ndarray, predictions: np.ndarray) -> float:
    return 1 - float(np.mean((predictions - y) ** 2)) / float(np.var(y))
```

`np.var(y)` divides by $n$, NumPy's default (pandas divided by $n - 1$: Chapter 1). Here $n$ is right, because the variance stands for the MSE of guessing the mean, and the MSE divides by $n$.

```check
run ".venv/Scripts/python -m pytest -q tests/test_sklearn.py" label="your MAE and R² match scikit-learn's" -- r2 is 1 - MSE / variance of y.
```

## A tool someone can use

Everything so far has been scripts you run to look at numbers. A person who wants a price estimate doesn't want to edit `X` in a script. Give the package a command line, as in Chapter 0. Create `houses/cli.py`:

```python file=houses/cli.py
import argparse

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

from houses import data, metrics

FEATURES = ["sqft", "bedrooms", "age"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="houses", description="Estimate a house's price from its size, bedrooms and age.")
    parser.add_argument("--sqft", type=float, required=True, help="floor area in square feet")
    parser.add_argument("--bedrooms", type=float, required=True)
    parser.add_argument("--age", type=float, required=True, help="years since it was built")
    parser.add_argument("--data", default="data/houses.csv", help="the houses to learn from")
    args = parser.parse_args(argv)

    X, y = data.load(args.data, FEATURES)

    # How good is it? Measure on houses the model doesn't see while training.
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=0)
    checked = LinearRegression().fit(X_train, y_train)
    test_predictions = checked.predict(X_test)

    # Then learn from every house for the estimate itself.
    model = LinearRegression().fit(X, y)
    estimate = model.predict(np.array([[args.sqft, args.bedrooms, args.age]]))[0]

    print(f"estimated price: {estimate:,.0f}")
    print(f"on {len(y_test)} held-out houses it was typically "
          f"{metrics.mae(y_test, test_predictions):,.0f} off (R² {metrics.r2(y_test, test_predictions):.2f})")
    return 0
```

and `houses/__main__.py` in the next step. Three things worth noticing:

- **`required=True`** makes an option mandatory: argparse refuses to run without it and says which is missing. A price estimate with a default floor area would be a guess dressed up as an answer.
- **It reports its own accuracy.** An estimate without an error bar invites people to trust it more than they should. The held-out MAE says, honestly, how far off estimates like this one typically are.
- **It measures on a split, then trains on everything.** The split gives an honest error estimate; once that's known, there's no reason to throw away a quarter of the data for the final model. (scikit-learn's `train_test_split` takes `random_state` where yours took `seed`, and rounds the test size **up**: 12 test houses of 45, where yours took 11. Two reasonable choices; the library's documentation says which it made.)

```check
run ".venv/Scripts/python -c \"from houses import cli\"" label="houses/cli.py imports"
```

## Run it

Create `houses/__main__.py`:

```python file=houses/__main__.py
from houses.cli import main

raise SystemExit(main())
```

```powershell
.venv\Scripts\python -m houses --sqft 1500 --bedrooms 3 --age 20
```

```text
estimated price: 252,006
on 12 held-out houses it was typically 18,326 off (R² 0.90)
```

```check
run ".venv/Scripts/python -m houses --sqft 1500 --bedrooms 3 --age 20" stdout="estimated price: 252,006" label="the tool estimates a 1,500 sqft, 3-bedroom, 20-year-old house"
run ".venv/Scripts/python -m houses --sqft 1500 --bedrooms 3 --age 20" stdout="(R² 0.90)" label="and reports how accurate estimates like it are"
run ".venv/Scripts/python -m houses --sqft 1500" exit=2 stderr="required" label="leaving out a feature is refused"
```

## Challenge: break it on purpose

No code is given for this step; it's an investigation. Each of these changes breaks something. Predict what will happen, try it, then put the code back:

1. **Train on the test set.** In `cli.py`, fit `checked` on `X` and `y` (all houses) but still measure on `X_test`. What happens to the reported MAE, and why is that number now a lie?
2. **Ask about a house unlike any in the data**: `--sqft 9000 --bedrooms 12 --age 150`. The model answers confidently. Should you believe it? (The largest house it learned from has 2,600 square feet: this is **extrapolation**.)
3. **Give it nonsense**: `--sqft -500 --bedrooms 3 --age 20`. What comes out? Where in the code should a negative area be rejected, and which lesson in Chapter 0 says so?

None of these is caught by any test you have, and every one is a real way ML systems fail in production. Parts XIX (evaluation), XXXVIII (testing ML software) and XLIV (ML security) come back to each.

### Chapter 3, and what comes next

You started with points on a page and ended with a tool that estimates house prices and tells you how far to trust it. On the way:

- A **model** is a function with parameters; **training** chooses the parameters that minimise a **loss**.
- **Gradient descent** follows the loss's gradient downhill, and needs **scaled features** to do it well.
- `fit` and `predict` are a design, not magic, and you've written both.
- A model is only as good as its error on data it **hasn't seen**.
- scikit-learn solves the same problem exactly, faster, with more checks, and gives the same answer.

The tool still has a limit that no amount of mathematics fixes: it runs in a terminal on one computer. A website, a phone app or another program can't ask it for a price. The next chapter of this series (planned) starts there: **HTTP**, the language programs use to ask each other things over a network, and **FastAPI**, which turns `predict` into a web service. The model you trained stays exactly as it is; what changes is who can reach it.
