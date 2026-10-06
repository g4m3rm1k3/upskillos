---
title: 18.1 — Each Tree Fixes the Last One's Mistakes: Gradient Boosting
track: Boosting and SVMs — Surface Finish and a Tolerance Zone
trackOrder: 38
runtime: none
support: data/roughness.csv
concepts: boosting
revisits: decision-trees, ensembles, regression-metrics, generalization, scikit-learn, classes, testing
notebook: ml-boosting
lab: 14
problem: A random forest grows hundreds of deep trees independently and averages them. Boosting grows small trees one after another, and each one is trained only on what the trees before it still get wrong. Why does that work so well on tables of shop data, and what is each new tree actually learning?
---

This advanced track covers the two classical methods the core chapters left out. **Gradient boosting** is one of the strongest methods for tabular data (rows and columns, the kind of data a shop actually has), and many working data scientists reach for it early; which method wins on a given dataset still has to be measured, not assumed. **Support vector machines** (lesson 18.3) are older, and they introduce an idea that runs through the rest of machine learning: the kernel.

The worked example for boosting is **surface finish** in finish turning. Every pass records its cutting conditions and the measured roughness:

> **Surface roughness, Ra**: the average height of a surface's peaks and valleys measured from their mean line, in micrometres (µm), as read by a profilometer. A ground shaft might be 0.4 µm; a rough-turned one 6 µm. Drawings call it out as a maximum.

The textbook formula for turning is $Ra \approx 1000 \times f^2 / (32\,r)$ µm, from the feed $f$ (mm/rev) and the insert's nose radius $r$ (mm). It's pure geometry: the tool leaves a scalloped track, and the scallops' height depends on how far apart they are and how round the tool tip is. Real surfaces are rougher than the formula, by amounts that have no tidy equation: **built-up edge** at low speeds (workpiece material welding onto the tool and smearing the surface), **flank wear** on the insert, and wear hurting more when cutting **dry**. Lesson 16.2 used an equation because one existed. Here only part of the answer has one, which is when a flexible model earns its place.

## A new project

1. **Choose folder…** → in **Documents**, a **New folder** named `boosting-and-svms`.
2. `python -m venv .venv`
3. `requirements.txt`:

```text file=requirements.txt
pytest==9.1.1
numpy==2.5.3
scikit-learn==1.9.1
```

4. `.venv\Scripts\python -m pip install -r requirements.txt`

```check
run ".venv/Scripts/python -c \"import sklearn, numpy, pytest\"" label="NumPy, scikit-learn and pytest are installed in the project's Python" -- python -m venv .venv, then .venv\Scripts\python -m pip install -r requirements.txt
```

## Read the tests first

**This step: create the supplied files and read them. No code yet.** The button also creates `data/roughness.csv`: 600 finish-turning passes, with columns `pass`, `feed` (mm/rev), `radius` (nose radius, mm), `speed` (m/min), `wear` (flank wear VB, mm), `coolant` (`yes` or `no`) and `ra` (µm).

```python file=tests/test_boost.py provided
# Tests for data.py and boost.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_boost.py
import numpy as np
from pytest import approx
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor


def split():
    import data
    X, ra = data.load("data/roughness.csv")
    return train_test_split(X, ra, test_size=0.25, random_state=0)


def test_load_reads_the_cutting_conditions_and_roughness():
    import data
    X, ra = data.load("data/roughness.csv")
    assert X.shape == (600, 5) and ra.shape == (600,)
    assert X[0].tolist() == [0.17, 0.8, 280.0, 0.26, 0.0] and ra[0] == 1.79
    assert set(X[:, 4]) == {0.0, 1.0}


def test_no_trees_predicts_the_average():
    import boost
    X_train, X_test, ra_train, _ = split()
    model = boost.Boosted(n_trees=0).fit(X_train, ra_train)
    assert model.predict(X_test) == approx(np.full(len(X_test), ra_train.mean()))


def test_one_full_step_is_the_average_plus_a_tree_on_the_residuals():
    import boost
    X_train, X_test, ra_train, _ = split()
    model = boost.Boosted(n_trees=1, rate=1.0).fit(X_train, ra_train)
    tree = DecisionTreeRegressor(max_depth=3, random_state=0).fit(X_train, ra_train - ra_train.mean())
    assert model.predict(X_test) == approx(ra_train.mean() + tree.predict(X_test))


def test_the_rate_shrinks_every_tree():
    import boost
    X_train, X_test, ra_train, _ = split()
    full = boost.Boosted(n_trees=1, rate=1.0).fit(X_train, ra_train).predict(X_test)
    tenth = boost.Boosted(n_trees=1, rate=0.1).fit(X_train, ra_train).predict(X_test)
    assert tenth - ra_train.mean() == approx((full - ra_train.mean()) * 0.1)


def test_boosted_is_identical_to_scikit_learn():
    import boost
    X_train, X_test, ra_train, _ = split()
    ours = boost.Boosted(n_trees=200, rate=0.1, depth=3, seed=0).fit(X_train, ra_train)
    theirs = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=3, random_state=0).fit(X_train, ra_train)
    assert np.abs(ours.predict(X_test) - theirs.predict(X_test)).max() < 1e-9
```

- **`split()`** is a helper the tests share: the same 75/25 train/test split (lesson 3.3) every time, thanks to `random_state=0`.
- **The last test** is the target: your boosting, written from a decision tree and a loop, must give the same predictions as scikit-learn's `GradientBoostingRegressor` to nine decimal places.

```check
file tests/test_boost.py -- Click "Create provided tests/test_boost.py" above.
file data/roughness.csv
```

## Load the passes

Create `data.py`:

```python file=data.py
import csv

import numpy as np

FEATURES = ["feed", "radius", "speed", "wear", "dry"]


def load(path: str) -> tuple[np.ndarray, np.ndarray]:
    """Cutting conditions (feed, nose radius, speed, flank wear, 1 if dry) and roughness Ra in µm."""
    X, ra = [], []
    with open(path, newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            X.append([float(row["feed"]), float(row["radius"]), float(row["speed"]), float(row["wear"]),
                      1.0 if row["coolant"] == "no" else 0.0])
            ra.append(float(row["ra"]))
    return np.array(X), np.array(ra)
```

- **`1.0 if row["coolant"] == "no" else 0.0`** turns the coolant column into an indicator that is 1 when cutting **dry**, as lesson 16.1 did.
- **`FEATURES`** names the five columns in order, so scripts can print a column's name from its number.

```check
run ".venv/Scripts/python -m pytest -q tests/test_boost.py -k load" label="600 passes: five cutting conditions and a roughness each"
```

## Fixing the mistakes, one tree at a time

Start with the simplest possible prediction: the average roughness, whatever the conditions. It's wrong for every pass, by a different amount each time. That leftover is the **residual**:

> **Residual**: the actual value minus the current prediction, for each training row. It's what the model still gets wrong: positive where it predicts too low, negative where it predicts too high.

Now the idea that makes boosting work: **fit a small tree to the residuals**, not to the roughness. That tree learns the most obvious pattern in the mistakes (say, "high feed passes are 3 µm rougher than predicted"). Add its predictions to the current prediction, and the mistakes shrink. Then compute the new residuals, fit another small tree to *those*, add it, and repeat.

> **Boosting**: building a model as a sum of many weak models (here, shallow trees), trained one after another, each on the errors left by all the ones before it. The final prediction is the starting value plus every tree's correction.
>
> *Picture it as* dialling in a part on a lathe. You cut, measure, and enter a wear offset for the biggest error; cut again, measure, and correct what's left; each correction is small and aimed at what the last measurement showed. No single offset fixes the part, but the sequence converges on size.

A random forest (lesson 9.4) also adds up many trees, but its trees are **independent**: each is grown deep on its own bootstrap sample, and averaging cancels out their separate mistakes. A boosted model's trees are **sequential** and **shallow**: each is too simple to be good on its own, and each one depends on all the others.

See it happen. Create `by_hand.py`:

```python file=by_hand.py
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor

import data

X, ra = data.load("data/roughness.csv")
X_train, X_test, ra_train, ra_test = train_test_split(X, ra, test_size=0.25, random_state=0)


def rmse(predictions: np.ndarray) -> float:
    return float(np.sqrt(np.mean((predictions - ra_train) ** 2)))


prediction = np.full(len(ra_train), ra_train.mean())
print(f"start: the average, {ra_train.mean():.2f} µm      error {rmse(prediction):.2f}")
for number in range(1, 4):
    residual = ra_train - prediction
    tree = DecisionTreeRegressor(max_depth=3, random_state=0).fit(X_train, residual)
    prediction = prediction + tree.predict(X_train)
    print(f"after tree {number}: it splits first on {data.FEATURES[tree.tree_.feature[0]]:<7} error {rmse(prediction):.2f}")
```

- **`DecisionTreeRegressor(max_depth=3)`**: a tree that predicts a number rather than a class. Each leaf predicts the **average** of its training targets (lesson 9.3's trees took a vote instead). Depth 3 means at most three questions, so at most 8 leaves: deliberately weak.
- **`.fit(X_train, residual)`**: the tree's target is the residual, not the roughness.
- **`tree.tree_.feature[0]`** is the column number the tree's first question uses; `data.FEATURES[...]` turns it into a name.

```powershell
.venv\Scripts\python by_hand.py
```

```text
start: the average, 3.25 µm      error 2.90
after tree 1: it splits first on feed    error 1.01
after tree 2: it splits first on speed   error 0.76
after tree 3: it splits first on dry     error 0.68
```

The trees find the causes in order of size. The first tree goes straight for **feed**, the geometric effect that dominates roughness, and cuts the error by two-thirds. With feed mostly accounted for, the second tree's biggest remaining pattern is **speed**: the built-up edge at low speeds. The third finds that cutting **dry** makes things worse. Nobody told the trees any of this; each simply found the largest pattern left in the mistakes.

```check
run ".venv/Scripts/python by_hand.py" stdout="after tree 2: it splits first on speed   error 0.76" label="by_hand.py: three trees, each fitted to the last one's residuals, find feed, then speed, then dry"
```

## Small steps: the learning rate

Adding each tree's full correction works, but it overreacts: a tree fitted to 450 noisy residuals learns some of the noise, and the next tree has to undo it. The fix is to take **only a fraction of each correction**:

$$\text{prediction} \leftarrow \text{prediction} + \text{rate} \times \text{tree's prediction}$$

> **Learning rate** (or **shrinkage**): the fraction of each new tree's correction that is added, typically 0.01 to 0.3. A smaller rate needs more trees, but each one moves the prediction less, so no single tree's noise can push it far. It's the same idea as gradient descent's step size (lesson 2.4).

Why "gradient" boosting? For squared error, the residual $y - \hat{y}$ is (apart from a factor of 2) the negative gradient of the loss with respect to the prediction (lesson 2.3). Each tree points the predictions downhill, and the learning rate is the step size. For other losses (absolute error, log loss for classification) the trees are fitted to that loss's gradient instead, and the rest of the method is unchanged.

Now write it as a class with scikit-learn's `fit` and `predict`. Create `boost.py`:

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
```

- **`fit`** is `by_hand.py`'s loop with two changes: the **`self.rate *`** on each correction, and every tree kept in **`self.trees_`** so `predict` can replay them.
- **`predict`** starts new rows at the training average and adds each tree's shrunk correction, in order: exactly what `fit` did to the training rows.
- **`for _ in range(...)`**: `_` is the usual name for a loop variable you don't use.

**Why `random = np.random.RandomState(self.seed)`?** When two splits are exactly as good as each other, a tree picks between them at random. That happens here: `radius` has only three values and `dry` only two, so the same split can often be made on either. `random_state=0` on every tree would make each tree start from the same random choices; scikit-learn's booster instead makes **one** random-number generator and passes it to every tree in turn, so each tree continues where the last one's random numbers left off. Doing the same here is the only way to make the same choices as scikit-learn, and so to get identical predictions.

```check
run ".venv/Scripts/python -m pytest -q tests/test_boost.py" label="your boosting starts at the average, shrinks every tree by the rate, and equals GradientBoostingRegressor" -- fit: start at y.mean(); each tree fits y - prediction; prediction += rate * tree.predict(X); one RandomState(seed) passed to every tree
```

## How many trees?

Create `compare.py` to test boosted models of different sizes, with lesson 9.4's random forest and lesson 3.4's linear regression for comparison:

```python file=compare.py
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

import boost
import data

X, ra = data.load("data/roughness.csv")
X_train, X_test, ra_train, ra_test = train_test_split(X, ra, test_size=0.25, random_state=0)


def rmse(model, X: np.ndarray, y: np.ndarray) -> float:
    return float(np.sqrt(np.mean((model.predict(X) - y) ** 2)))


print("model                            training  test   (error, µm)")
for trees in [1, 10, 100, 300, 1000]:
    model = boost.Boosted(n_trees=trees).fit(X_train, ra_train)
    print(f"boosted, {trees:>4} trees              {rmse(model, X_train, ra_train):6.2f} {rmse(model, X_test, ra_test):6.2f}")
for name, model in [("random forest, 300 trees", RandomForestRegressor(n_estimators=300, random_state=0)),
                    ("linear regression", LinearRegression())]:
    model.fit(X_train, ra_train)
    print(f"{name:<33}{rmse(model, X_train, ra_train):6.2f} {rmse(model, X_test, ra_test):6.2f}")
```

```powershell
.venv\Scripts\python compare.py
```

```text
model                            training  test   (error, µm)
boosted,    1 trees                2.65   2.52
boosted,   10 trees                1.30   1.30
boosted,  100 trees                0.26   0.40
boosted,  300 trees                0.14   0.38
boosted, 1000 trees                0.04   0.38
random forest, 300 trees           0.24   0.52
linear regression                  1.32   1.32
```

- **More trees keep improving the training error**, all the way to 0.04 µm with 1,000. On the test passes, the improvement stops after about 300 trees, at 0.38 µm. The gap between the two columns is lesson 7.1's overfitting: past a point, new trees are fitting noise in the training passes.
- **Boosting beats the forest** (0.38 against 0.52 µm) on the same split. Each shallow tree can concentrate on a pattern the others missed, such as the way wear matters more when cutting dry. A forest's independent trees all chase the same big patterns.
- **Linear regression is stuck at 1.32 µm**: roughness depends on feed *squared*, divided by radius, and more steeply on wear when dry. A straight-line model can't represent any of those shapes without hand-made features (lesson 16.2).

```check
run ".venv/Scripts/python compare.py" stdout="boosted,  300 trees                0.14   0.38" label="compare.py: boosting improves on test passes up to about 300 trees, and beats the forest"
```

```predict
question: The 1-tree model's training error is 2.65 µm, barely better than the average alone (2.90 µm). But by_hand.py's first tree cut the training error to 1.01 µm. Why the difference?
choice: Boosted uses a different kind of tree
choice: Boosted's default learning rate of 0.1 adds only a tenth of the first tree's correction
choice: Boosted's first tree splits on a different column
answer: Boosted's default learning rate of 0.1 adds only a tenth of the first tree's correction
explain: by_hand.py added each tree's full correction (a rate of 1). Boosted defaults to 0.1, so one tree moves the prediction only a tenth of the way, and it takes many trees to get where a few full steps would. That's the trade the learning rate makes: slower progress, but each tree's noise counts for only a tenth, so the result overfits less. The next lesson measures that trade.
```

## Your own problem

1. **Try boosting on any table where a forest does well.** `GradientBoostingRegressor` (or `GradientBoostingClassifier` for categories) takes the same `fit` and `predict` as every other scikit-learn model.
2. **Print the first few trees' first questions**, as `by_hand.py` does. The order they find things in is a rough ranking of what matters, and a check that the model has learned something physical.
3. **Keep a test set aside** and watch the training and test errors part company as you add trees. The next lesson chooses the number of trees properly.
