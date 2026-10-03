---
title: 3.1 — A Line Through the Points
track: Your First Model — Predict a Number
trackOrder: 23
runtime: none
support: data/houses.csv
concepts: linear-model, loss
revisits: dot-product, matrices, descriptive-statistics, missing-values, packages
notebook: ml-what-learning-is, ml-least-squares, ml-loss-functions
lab: 1
problem: Given a house's floor area, predict its price. What is a model, exactly, and how do you measure how good it is?
---

This is the chapter where everything so far becomes machine learning. The goal: given a house's floor area, predict its price, using the 48 houses whose prices are known. You'll do it in the order this whole series follows:

```text
data → points → a line → measure its error → improve the line → a model you own → the library's version
```

This lesson covers the first half: what the model is, and how to say exactly how wrong it is. By the end you'll have found a good line by brute force, and seen why brute force can't scale, which is what the next lesson fixes.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `house-prices`.
2. `python -m venv .venv`
3. `requirements.txt`: pytest and NumPy, since you already know why you need NumPy:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

This project will grow for the rest of the chapter (and, in the planned chapters after it, into a web service), so it's a package from the start: `houses`.

```check
run ".venv/Scripts/python -c \"import numpy, pytest\"" label="NumPy and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/houses.csv`.

```python file=tests/test_model.py provided
# Tests for houses/data.py and houses/model.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_model.py
from pathlib import Path

import numpy as np
from pytest import approx

from houses import data

HOUSES = Path(__file__).resolve().parent.parent / "data" / "houses.csv"


def test_load_one_feature():
    X, y = data.load(HOUSES, ["sqft"])
    assert X.shape == (48, 1), "48 houses, 1 feature: a matrix with one column"
    assert y.shape == (48,)
    assert X[0, 0] == 1540 and y[0] == 199000


def test_load_drops_houses_missing_a_chosen_feature():
    X, y = data.load(HOUSES, ["sqft", "age"])
    assert X.shape == (45, 2), "3 houses have no recorded age"
    assert len(y) == 45


def test_predict_is_a_dot_product_plus_a_base():
    from houses import model
    X = np.array([[1000.0], [2000.0]])
    assert model.predict(X, np.array([150.0]), 10000.0) == approx([160000, 310000])
    X2 = np.array([[1540.0, 3.0]])
    assert model.predict(X2, np.array([140.0, 6000.0]), 40000.0) == approx([273600])


def test_error_mse_is_the_mean_squared_error():
    from houses import model
    y = np.array([100.0, 200.0, 300.0])
    assert model.mse(y, np.array([110.0, 190.0, 300.0])) == approx((100 + 100 + 0) / 3)
    assert model.mse(y, y) == 0


def test_error_rmse_is_in_the_units_of_the_target():
    from houses import model
    y = np.array([100.0, 200.0, 300.0])
    assert model.rmse(y, np.array([110.0, 190.0, 300.0])) == approx(np.sqrt(200 / 3))


def test_error_of_always_guessing_the_mean_is_the_standard_deviation():
    from houses import model
    _, y = data.load(HOUSES, ["sqft"])
    guess = np.full_like(y, y.mean())
    assert model.rmse(y, guess) == approx(y.std())
```

The tests that need `houses/model.py` import it inside the test (`from houses import model`), not at the top of the file. That way the loading tests can run before `model.py` exists: an import at the top would stop every test in the file until it did.

The last test is a fact, not a design choice, and you can see why from lesson 1.2. If every prediction is the mean, the squared errors are the squared distances from the mean, and their mean is the **variance**. Its square root is the standard deviation. So the simplest possible "model" is off by exactly one standard deviation, 72,786 dollars, and any model worth having must beat that.

```check
file tests/test_model.py -- Click "Create provided tests/test_model.py" above.
file data/houses.csv
```

## Features in, target out

Create `houses/__init__.py`:

```python file=houses/__init__.py
"""Predict house prices: from a line fitted by hand to scikit-learn."""
```

```check
run ".venv/Scripts/python -c \"import houses\"" label="the houses package imports"
```

## Load X and y

Every ML library expects data in the same two pieces: a **feature matrix** $X$, one row per house and one column per feature, and a **target vector** $y$, one price per house. Create `houses/data.py`:

```python file=houses/data.py
import csv
from pathlib import Path

import numpy as np


def load(path: str | Path, features: list[str], target: str = "price") -> tuple[np.ndarray, np.ndarray]:
    with open(path, newline="", encoding="utf-8") as f:
        rows = [row for row in csv.DictReader(f) if all(row[name] != "" for name in [*features, target])]
    X = np.array([[float(row[name]) for name in features] for row in rows])
    y = np.array([float(row[target]) for row in rows])
    return X, y
```

- **The caller chooses the features**: `load(path, ["sqft"])` or `load(path, ["sqft", "bedrooms", "age"])`. The model's code never names a column, so the same model works with any features.
- **A house missing any chosen value is dropped.** That's the simplest answer to Chapter 1's question about missing values. It has a cost: with `age` as a feature you train on 45 houses, not 48. (Filling in the gaps instead, called **imputation**, comes with Part XX.)
- **`[*features, target]`** builds one list: the features, then the target. `*` unpacks a list into the new one.
- **Even one feature makes a 2-D `X`**: shape `(48, 1)`, not `(48,)`. A matrix with one column, because the model will compute `X @ w`, and that needs a matrix. Getting this wrong is the most common shape bug in ML code; scikit-learn refuses a 1-D `X` with an error telling you to reshape.

```check
run ".venv/Scripts/python -m pytest -q tests/test_model.py -k load" label="load returns X as a matrix and y as a vector, dropping incomplete houses" -- Keep a row only if every chosen feature and the target are non-empty.
```

## The model: a line

With one feature, area $x$, the model is a straight line:

$$\hat{y} = wx + b$$

- $x$: the input, the house's area;
- $\hat{y}$: the output, the predicted price;
- $w$, the **weight**: how many dollars each extra square foot adds, the line's **slope**;
- $b$, the **bias** (or intercept): the price the line gives a house of zero area, where it crosses the vertical axis.

> **Model**: a function that turns features into a prediction, with some numbers in it left open. **Parameters**: those open numbers. **Training** (or **fitting**): choosing the parameters, using examples whose answers are known, so the predictions come out close to the answers.
>
> *Picture it as* a machine with adjustment dials. The machine's design (a straight line) is fixed; the dial settings ($w$ and $b$) decide what it actually produces. Training is the setup procedure: run test pieces, measure how far off they are, adjust the dials, repeat. **Where the picture stops working:** a machinist adjusts dials by experience; the next lesson computes exactly which way, and how far, to turn each one.

$w$ and $b$ are the model's **parameters**. Choosing them *is* the model: "learning" will mean finding good values for them. With several features, $w$ becomes a vector of weights, one per feature, and the prediction is the dot product plus the bias: $\hat{y} = \mathbf{w} \cdot \mathbf{x} + b$. For every house at once, it's lesson 2.2's matrix multiplication: $\hat{\mathbf{y}} = X\mathbf{w} + b$.

Then you need a way to score a choice of parameters. For each house the **error** is $\hat{y}_i - y_i$, prediction minus truth. Square them (so positive and negative errors don't cancel, as with the variance), average them, and you have the **mean squared error**; take its square root to get back to dollars, the **root mean squared error**:

$$\text{MSE} = \frac{1}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)^2 \qquad \text{RMSE} = \sqrt{\text{MSE}}$$

Create `houses/model.py`:

```python file=houses/model.py
import numpy as np


def predict(X: np.ndarray, w: np.ndarray, b: float) -> np.ndarray:
    return X @ w + b


def mse(y: np.ndarray, predictions: np.ndarray) -> float:
    return float(np.mean((predictions - y) ** 2))


def rmse(y: np.ndarray, predictions: np.ndarray) -> float:
    return float(np.sqrt(mse(y, predictions)))
```

Three one-line functions, and each is something from an earlier chapter: `predict` is a matrix–vector product plus broadcasting; `mse` is the variance formula with the mean replaced by the predictions; `rmse` is the standard deviation's square root.

**Why squared error?** It punishes big mistakes much more than small ones (an error of 20,000 counts four times as much as one of 10,000), and, as you'll see next lesson, it has a simple derivative. It isn't the only choice: the **mean absolute error** (the mean of $|\hat{y}_i - y_i|$, lesson 2.2's number) treats all mistakes in proportion, and is less thrown by a few wild houses. Choosing the loss is choosing what "wrong" means.

```check
run ".venv/Scripts/python -m pytest -q tests/test_model.py" label="predict, mse and rmse pass, and guessing the mean is off by one standard deviation" -- rmse is the square root of mse.
```

## Try a line by hand

Create `try_line.py`, which scores any line you give it:

```python file=try_line.py
import sys

import numpy as np

from houses import data, model

X, y = data.load("data/houses.csv", ["sqft"])
w = float(sys.argv[1])
b = float(sys.argv[2])

predictions = model.predict(X, np.array([w]), b)
print(f"w = {w:g} dollars per sqft, b = {b:,.0f} dollars")
print(f"RMSE: {model.rmse(y, predictions):,.0f}")
print(f"always guessing the mean: {model.rmse(y, np.full_like(y, y.mean())):,.0f}")
```

`sys.argv` is the list of words on the command line (`argparse` read it for you in Chapter 0; for two numbers in a throwaway script, reading it directly is fine). `{w:g}` prints a number in its shortest natural form.

Try last chapter's guess, 140 dollars per square foot on top of 40,000:

```powershell
.venv\Scripts\python try_line.py 140 40000
```

```text
w = 140 dollars per sqft, b = 40,000 dollars
RMSE: 30,044
always guessing the mean: 72,786
```

Now try to beat it. Change $w$ and $b$ a few times. Think about what each one does to the line: $w$ tilts it, $b$ slides it up and down. Try 160 and 0; 150 and 20000.

```check
run ".venv/Scripts/python try_line.py 140 40000" stdout="RMSE: 30,044" label="try_line.py scores the line w = 140, b = 40,000"
```

## Search for the best line

Trying lines by hand is slow. Let the computer try them all: every $w$ from 100 to 200 in steps of 5, every $b$ from −50,000 to 50,000 in steps of 5,000, keeping the best. This is a **grid search**. Create `search.py`:

```python file=search.py
import numpy as np

from houses import data, model

X, y = data.load("data/houses.csv", ["sqft"])

best = None
tried = 0
for w in range(100, 201, 5):
    for b in range(-50000, 50001, 5000):
        error = model.rmse(y, model.predict(X, np.array([float(w)]), float(b)))
        tried += 1
        if best is None or error < best[0]:
            best = (error, w, b)

error, w, b = best
print(f"tried {tried} lines")
print(f"best: w = {w}, b = {b:,}, RMSE {error:,.0f}")
```

```powershell
.venv\Scripts\python search.py
```

```text
tried 441 lines
best: w = 155, b = 10,000, RMSE 28,552
```

> **Grid search**: trying every combination of parameter values from a fixed list for each, and keeping the best. *Picture it as* opening a combination lock by trying every combination: guaranteed to work, and hopeless once there are many wheels.

21 values of $w$ times 21 values of $b$: 441 lines, and the best is about 1,500 dollars better than the hand guess. It's a real result: **155 dollars per square foot, on top of about 10,000**. The model has learned something from the data, by the crudest method possible.

Notice the nested loops: the inner loop over `b` runs completely for **each** value of the outer loop's `w`. Trace the start: `w = 100, b = -50000`; `w = 100, b = -45000`; …; `w = 100, b = 50000`; then `w = 105, b = -50000`, and so on. `best` holds a tuple `(error, w, b)` for the best line so far; `best is None` is true only on the very first line tried, when there's nothing to compare against yet.

```predict
question: The grid tried 21 values for each parameter. With 3 features (3 weights plus b), and 21 values for each, how many models would the same grid search try?
answer: 194481
explain: 21 × 21 × 21 × 21 = 21⁴ = 194,481. Each new parameter multiplies the work by 21. With 10 features it's 21¹¹, about 350 trillion; a neural network has millions of parameters. And the answer is only as precise as the grid: the best w here is "somewhere near 155", because the grid only tried multiples of 5.

Grid search has no idea which direction is better: it tries everything. The derivative from lesson 2.3 does know. It says, from where you're standing, which way each parameter should move. That's the next lesson.
verify: .venv/Scripts/python -c "print(21 ** 4)"
```

```check
run ".venv/Scripts/python search.py" stdout="best: w = 155, b = 10,000" label="the grid search finds w = 155, b = 10,000"
```
