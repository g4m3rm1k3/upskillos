---
title: 16.2 — Let the Physics Choose the Model
track: Capstone — Your Own ML Product
runtime: none
concepts: ml-testing
revisits: linear-regression, ensembles, regression-metrics, cross-validation, mathematical-functions, numpy, classes, testing
notebook: ml-capstone
lab: 33
problem: You could throw every model in this series at the tool-life data and keep the best score. But machining has a century-old equation for tool life. Does knowing the physics help pick the model, and how do you turn an equation with powers into something linear regression can fit?
---

The tempting next step is to try every model you know and keep whichever scores best. Sometimes that's right. But when the problem has known **structure** (a law of physics, an established engineering relationship), using it usually gives a model that's more accurate, needs less data, and can be explained and trusted. Machining has exactly such a law.

## Taylor's tool-life equation

In 1907, F. W. Taylor published the result of years of cutting tests: for a given tool and workpiece, cutting speed $V$ and tool life $T$ are related by

$$V\,T^{\,n} = C$$

where $n$ and $C$ are constants for that tool and material. For carbide tools, $n$ is typically 0.2–0.4. Go faster and the tool dies much faster: with $n = 0.3$, a 10% increase in speed cuts tool life by about 27%. The **extended Taylor equation** adds feed $f$ and depth of cut $d$ the same way:

$$T = \frac{K}{V^{a}\, f^{\,b}\, d^{\,c}}$$

A product of powers isn't a straight line, so linear regression can't fit it directly. But take the logarithm of both sides (lesson 8.3: the log of a product is the sum of the logs, and $\log x^a = a \log x$):

$$\log T = \log K - a \log V - b \log f - c \log d$$

That **is** a linear model: $\log T$ is a weighted sum of $\log V$, $\log f$ and $\log d$, plus a constant. Hardness and dry cutting, which shorten life by a roughly constant *percentage* per unit, join as two more terms. So: transform the inputs and the target with logs, fit an ordinary linear regression (lesson 3.4), and the fitted weights **are** the Taylor exponents: $a = $ minus the speed weight, and $n = 1/a$.

> **Feature engineering from domain knowledge**: transforming the raw inputs (and sometimes the target) into the form a known law says matters, so a simple model can capture the relationship exactly rather than approximately.
>
> *Picture it as* using the right fixture instead of a vice and shims: the work holding already knows the part's shape, so the machining is simple and repeatable.

**Where the picture stops working:** a law is only as good as its range. Taylor's equation holds within the speeds and conditions it was fitted on; far outside them (very low speeds, where other wear mechanisms take over) it can be badly wrong, and the model inherits that. Lesson 16.3 makes the advisor say so.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_model.py provided
# Tests for advisor/model.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_model.py
from pathlib import Path

import numpy as np
from pytest import approx
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import KFold

from advisor import data

X, LIFE = data.load(Path("data/tool_life.csv").read_text())
CUT = [200, 0.2, 1.5, 220, 0.0]


def cv_error(make):
    errors = []
    for train, test in KFold(n_splits=5, shuffle=True, random_state=0).split(X):
        predictions = make().fit(X[train], LIFE[train]).predict(X[test])
        errors.append(np.sqrt(np.mean((predictions - LIFE[test]) ** 2)))
    return np.mean(errors)


def test_taylor_features_are_the_logs_and_the_rest():
    from advisor import model
    row = model.taylor_features(np.array([[200, 0.2, 1.5, 220, 1.0]]))[0]
    assert row == approx([np.log(200), np.log(0.2), np.log(1.5), 220, 1.0])


def test_the_fitted_exponents_are_physically_sensible():
    from advisor import model
    speed, feed, depth, hardness, dry = model.ToolLife().fit(X, LIFE).regression_.coef_
    assert speed == approx(-3.22, abs=0.05) and feed == approx(-1.07, abs=0.05)
    assert 0.2 <= -1 / speed <= 0.5
    assert hardness < 0 and dry < 0


def test_predictions_are_positive_minutes():
    from advisor import model
    minutes = model.ToolLife().fit(X, LIFE).predict(np.array([CUT]))
    assert minutes.shape == (1,) and 400 < minutes[0] < 700


def test_quality_gate_taylor_beats_the_forest_and_the_baseline():
    from advisor import model
    taylor = cv_error(model.ToolLife)
    forest = cv_error(lambda: RandomForestRegressor(n_estimators=200, random_state=0))
    baseline = cv_error(DummyRegressor)
    assert taylor < forest < baseline and taylor < 0.3 * baseline


def test_behaviour_matches_machining_experience():
    from advisor import model
    fitted = model.ToolLife().fit(X, LIFE)
    life = lambda **change: fitted.predict(np.array([[change.get("speed", 200), change.get("feed", 0.2),
                                                       change.get("depth", 1.5), change.get("hardness", 220),
                                                       change.get("dry", 0.0)]]))[0]
    assert life(speed=250) < life() < life(speed=150)
    assert life(feed=0.3) < life() and life(depth=2.5) < life()
    assert life(hardness=260) < life() and life(dry=1.0) < life()
```

- **`model.regression_.coef_`**: the advisor's model will keep its fitted `LinearRegression` in `regression_`, so the tests can read the exponents directly.
- **The quality gate compares three models on the same folds**, and demands that the physics-based one wins clearly, not just that it beats the baseline.
- **The behaviour test** encodes what every machinist knows: faster, more feed, deeper, harder or dry all mean shorter tool life. The `life` helper predicts for the standard cut with one setting changed.

```check
file tests/test_model.py -- Click "Create provided tests/test_model.py" above.
```

## The model

Create `advisor/model.py`:

```python file=advisor/model.py
import numpy as np
from sklearn.linear_model import LinearRegression


def taylor_features(X: np.ndarray) -> np.ndarray:
    """log speed, log feed, log depth, hardness, dry: the extended Taylor equation is linear in these."""
    return np.column_stack([np.log(X[:, 0]), np.log(X[:, 1]), np.log(X[:, 2]), X[:, 3], X[:, 4]])


class ToolLife:
    """Tool life from cutting conditions, by fitting the extended Taylor equation as a linear model in logs."""

    def fit(self, X: np.ndarray, life: np.ndarray) -> "ToolLife":
        self.regression_ = LinearRegression().fit(taylor_features(X), np.log(life))
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return np.exp(self.regression_.predict(taylor_features(X)))
```

- **`taylor_features`** takes logs of speed, feed and depth, and leaves hardness and the dry indicator as they are.
- **`fit`** fits the linear regression to **`np.log(life)`**: the model predicts the *log* of tool life.
- **`predict`** undoes the log with **`np.exp`**, so the answer comes back in minutes.
- **`fit` and `predict` with scikit-learn's names** mean the class works with lesson 9.4's `cv_accuracy`-style loops and the `cv_error` helper in the tests, alongside scikit-learn's own models.

Fitting on logs has a second benefit, beyond matching the physics. Tool life is lopsided (lesson 16.1: median 353, average 653). In logs, an error of "20% too long" counts the same for a 100-minute insert as for a 3,000-minute one. That's the kind of error the brief said matters.

```check
run ".venv/Scripts/python -m pytest -q tests/test_model.py -k \"features or exponents or positive\"" label="Taylor features, physically sensible exponents, and predictions in minutes" -- fit LinearRegression to (taylor_features(X), np.log(life)); predict = np.exp(regression_.predict(taylor_features(X)))
```

## Physics against brute force

Create `compare.py` to put the Taylor model against the baseline and two general-purpose models, on the same five folds:

```python file=compare.py
from pathlib import Path

import numpy as np
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold

from advisor import data, model

X, life = data.load(Path("data/tool_life.csv").read_text())
folds = KFold(n_splits=5, shuffle=True, random_state=0)


def cv_rmse(make) -> float:
    errors = []
    for train, test in folds.split(X):
        predictions = make().fit(X[train], life[train]).predict(X[test])
        errors.append(np.sqrt(np.mean((predictions - life[test]) ** 2)))
    return float(np.mean(errors))


candidates = {
    "always the average (baseline)": lambda: DummyRegressor(),
    "linear regression on the raw settings": lambda: LinearRegression(),
    "random forest on the raw settings": lambda: RandomForestRegressor(n_estimators=200, random_state=0),
    "Taylor's equation (linear in the logs)": lambda: model.ToolLife(),
}
print("model                                     error (minutes)")
for name, make in candidates.items():
    print(f"{name:<42}{cv_rmse(make):>10.0f}")

fitted = model.ToolLife().fit(X, life)
speed, feed, depth, hardness, dry = fitted.regression_.coef_
print(f"\nfitted: life ~ speed^{speed:.2f} × feed^{feed:.2f} × depth^{depth:.2f}; Taylor exponent n = {-1 / speed:.2f}")
```

- **`candidates`** maps each name to a function that makes a fresh model (lesson 7.3's `make_model` idea), so every fold trains a new one.
- **`speed, feed, depth, hardness, dry = ...coef_`** unpacks the five weights into names.

```powershell
.venv\Scripts\python compare.py
```

```text
model                                     error (minutes)
always the average (baseline)                    821
linear regression on the raw settings            525
random forest on the raw settings                369
Taylor's equation (linear in the logs)           189

fitted: life ~ speed^-3.22 × feed^-1.07 × depth^-0.34; Taylor exponent n = 0.31
```

The two-line model built from a 1907 equation beats a 200-tree random forest by almost half: **189 minutes against 369**. The forest has to *learn* the curved shape of tool life against speed from 192 training points per fold, piecewise, and it never quite gets the steep end right. The Taylor model is *told* the shape and only has to find five numbers.

And the five numbers mean something. The fitted speed exponent is −3.22, so **Taylor's n = 0.31**: right in the textbook range for carbide. A machining engineer can check that against handbook values in seconds, which is a far stronger reason to trust the model than any test score.

```check
run ".venv/Scripts/python compare.py" stdout="Taylor's equation (linear in the logs)           189" label="compare.py: the Taylor model clearly beats the forest and the baseline"
run ".venv/Scripts/python -m pytest -q tests/test_model.py" label="the quality gate and the machining-behaviour tests pass"
```

```predict
question: The forest scores worse here. When would a forest be the better choice than the Taylor model?
choice: Never: physics always wins
choice: When the relationship doesn't follow the assumed form, for example if a new insert grade wears by a different mechanism, or factors interact in ways the equation leaves out
choice: Only when there's less data
answer: When the relationship doesn't follow the assumed form, for example if a new insert grade wears by a different mechanism, or factors interact in ways the equation leaves out
explain: The Taylor model is only as good as its assumption that life is a product of powers. If reality departs from that (a coating that behaves differently at high speed, an interaction between coolant and hardness), a flexible model can find what the equation can't. A good habit is to keep both: if the forest ever starts beating the physics model on new data, that's a sign the physics has changed, and worth investigating.
```

## Your own problem

1. **Ask what's known.** Is there an equation, a rule of thumb, or an engineering relationship for your problem? Search the handbooks of your field. Even a partial law (a quantity should be proportional to another, or a ratio should matter more than either part) suggests features.
2. **Transform to make it linear.** Products and powers become sums under logs; rates and ratios can be computed as new columns.
3. **Compare honestly.** Put your physics-informed model against the baseline and at least one general model (a forest) on the same folds, as `compare.py` does. Write the table in your brief.
4. **Check the fitted numbers make sense.** If your model has interpretable parameters, compare them with known values. A model that scores well with nonsense parameters has probably learned something wrong.
