---
title: 7.4 — When Cross-Validation Lies: Leakage and Pipelines
track: Evaluation — Is the Model Any Good?
runtime: none
concepts: cross-validation
revisits: generalization, correlation, scikit-learn, testing
notebook: ml-leakage-and-imbalance
lab: 6
problem: Cross-validation says a model explains 42% of house prices, using features that are pure random noise. How did information about the held-out houses sneak into training, and how do you build models so it can't?
---

Imagine each house came with a thousand extra measurements: readings from some new survey. Most are probably useless, so you do the sensible-sounding thing: pick the ten columns most correlated with price, then cross-validate a model on those ten. It scores R² = 0.42: not as good as square footage, bedrooms and age (0.81), but clearly useful.

Except every one of those thousand columns is random numbers. They have nothing to do with price. A model built on them can't predict anything, and yet cross-validation, the careful method from last lesson, says it can.

This lesson finds the leak, measures the honest score, and introduces scikit-learn's **Pipeline**, which makes this mistake hard to make.

> **Data leakage**: information from the data a model is evaluated on reaching the model during training, by any route. The evaluation then measures partly what the model was *shown*, not only what it *learned*, and comes out too good.
>
> *Picture it as* an inspector who sees the reference sample before measuring the "blind" test parts. Even with no intent to cheat, knowing the answers shapes the readings, and the inspection rate looks better than the process really is.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_leakage.py provided
# Tests for leakage.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_leakage.py
import numpy as np
from pytest import approx
from sklearn.feature_selection import SelectKBest, f_regression

import houses

_, PRICES = houses.load("data/houses.csv", ["sqft"])
NOISE = np.random.default_rng(0).normal(size=(len(PRICES), 1000))


def test_top_columns_ranks_by_strength_of_correlation_either_way():
    import leakage
    jitter = np.random.default_rng(1).normal(size=(len(PRICES), 3))
    X = np.column_stack([jitter[:, 0], PRICES + 1000 * jitter[:, 1], -PRICES, jitter[:, 2]])
    assert leakage.top_columns(X, PRICES, 2).tolist() == [1, 2]


def test_top_columns_picks_what_scikit_learn_picks():
    import leakage
    theirs = np.flatnonzero(SelectKBest(f_regression, k=10).fit(NOISE, PRICES).get_support())
    assert leakage.top_columns(NOISE, PRICES, 10).tolist() == theirs.tolist()


def test_choosing_first_makes_noise_look_useful():
    import leakage
    assert leakage.score_choosing_first(NOISE, PRICES, k=10, seed=0) == approx(0.424, abs=0.001)


def test_choosing_inside_each_fold_shows_noise_is_useless():
    import leakage
    assert leakage.score_choosing_inside(NOISE, PRICES, k=10, seed=0) == approx(-1.660, abs=0.001)


def test_the_pipeline_gives_the_honest_score():
    import leakage
    assert leakage.pipeline_score(NOISE, PRICES, k=10, seed=0) == approx(leakage.score_choosing_inside(NOISE, PRICES, k=10, seed=0))
```

- **`NOISE`**: 48 rows (one per house with a price) and 1,000 columns of random numbers from the normal distribution. Nothing in it was made from the prices.
- The first test builds four columns whose relationship to price is known: two of pure jitter, one that is price plus a little jitter, and one that is minus price. The two strongest are columns 1 and 2: a strong *negative* correlation counts as much as a strong positive one.
- The two scores differ only in *when* the ten columns are chosen.

```check
file tests/test_leakage.py -- Click "Create provided tests/test_leakage.py" above.
```

## Choose the columns most related to price

Lesson 2.1 measured how strongly two columns move together with the **correlation**: +1 when they rise together perfectly, −1 when one falls as the other rises, 0 when they're unrelated. Ranking columns by the size of their correlation with price is a common, simple way to choose features. Create `leakage.py`:

```python file=leakage.py
import numpy as np


def correlation(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.corrcoef(a, b)[0, 1])


def top_columns(X: np.ndarray, y: np.ndarray, k: int) -> np.ndarray:
    """The k columns of X most strongly correlated with y (positively or negatively), in column order."""
    strength = [abs(correlation(X[:, column], y)) for column in range(X.shape[1])]
    return np.sort(np.argsort(strength)[::-1][:k])
```

- **`np.corrcoef(a, b)`** returns a 2 × 2 table: the correlation of `a` with itself, `a` with `b`, `b` with `a`, `b` with itself. `[0, 1]` picks out the one you want.
- **`abs(...)`**: strength, ignoring direction.
- **`np.argsort(strength)`** doesn't sort the numbers; it returns the *positions* that would sort them, smallest first. `[::-1]` reverses that (largest first), `[:k]` keeps the first `k`, and `np.sort` puts those column numbers back in order.

Trace `argsort` on a small list: `strength = [0.1, 0.9, 0.4]`. Sorted, it would be 0.1 (position 0), 0.4 (position 2), 0.9 (position 1), so `argsort` gives `[0, 2, 1]`. Reversed: `[1, 2, 0]`. The top 2: `[1, 2]`.

scikit-learn's `SelectKBest(f_regression, k=10)` ranks by a statistic that grows with the squared correlation, so it picks exactly the same columns; the second test checks that.

```check
run ".venv/Scripts/python -m pytest -q tests/test_leakage.py -k top_columns" label="top_columns picks the most strongly related columns, the same ones as SelectKBest" -- strength = abs(np.corrcoef(X[:, column], y)[0, 1]) per column; np.sort(np.argsort(strength)[::-1][:k])
```

## Choose first, then cross-validate

Here's the sensible-sounding plan: choose the ten columns using all 48 houses, then cross-validate a linear regression on those ten. Add it to `leakage.py`, scoring each fold with **R²** (lesson 3.4: 1 is perfect, 0 is no better than predicting the average price):

```python file=leakage.py
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

import folds


def correlation(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.corrcoef(a, b)[0, 1])


def top_columns(X: np.ndarray, y: np.ndarray, k: int) -> np.ndarray:
    """The k columns of X most strongly correlated with y (positively or negatively), in column order."""
    strength = [abs(correlation(X[:, column], y)) for column in range(X.shape[1])]
    return np.sort(np.argsort(strength)[::-1][:k])


def score_choosing_first(X: np.ndarray, y: np.ndarray, k: int, seed: int) -> float:
    """Mean R² over 5 folds, with the k columns chosen once, using every row."""
    columns = top_columns(X, y, k)
    scores = []
    for train, validation in folds.kfold(len(y), 5, seed):
        model = LinearRegression().fit(X[train][:, columns], y[train])
        scores.append(r2_score(y[validation], model.predict(X[validation][:, columns])))
    return float(np.mean(scores))
```

**`X[train][:, columns]`** reads in two steps: `X[train]` keeps the training rows, then `[:, columns]` keeps every one of those rows (`:`) but only the chosen columns.

Before running it, predict:

```predict
question: The thousand columns are random numbers, unrelated to price. Choosing the 10 most correlated using all the houses, then cross-validating, what mean R² will you get?
choice: About 0: random columns can't predict price
choice: Clearly above 0: the score will say the noise is useful
choice: Exactly 1
answer: Clearly above 0: the score will say the noise is useful
explain: It comes out at 0.424. With a thousand random columns and only 48 houses, some columns line up with the prices purely by chance: the best one has a correlation of 0.475. Choosing them using every house means each fold's validation houses helped pick the columns: they were chosen precisely because they happen to match those houses' prices. The validation fold is no longer unseen.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_leakage.py -k choosing_first" label="choosing with every row makes pure noise score R² 0.424"
```

### Where exactly is the leak?

Follow one fold. Its nine validation houses were held out from *fitting*, but not from *choosing*. When `top_columns` ran on all 48 houses, it favoured columns that happen to match the prices of those nine as well as the others. The model is then fitted on 39 houses with columns hand-picked, partly, to suit the other nine. Of course it does well on them.

The rule that follows is the most important one in model evaluation:

**Every step that learns anything from data is part of the model, and must be fitted on the training fold only.**

Choosing columns learns from data. So does standardising (it learns a mean and spread: lesson 7.2 fitted its `Standardiser` on training data only for this reason), filling missing values with an average, and choosing a degree or a penalty.

## Choose inside each fold

The fix is to move the choice *inside* the loop, so each fold chooses its columns from its own training houses. Add to `leakage.py`:

```python file=leakage.py
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

import folds


def correlation(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.corrcoef(a, b)[0, 1])


def top_columns(X: np.ndarray, y: np.ndarray, k: int) -> np.ndarray:
    """The k columns of X most strongly correlated with y (positively or negatively), in column order."""
    strength = [abs(correlation(X[:, column], y)) for column in range(X.shape[1])]
    return np.sort(np.argsort(strength)[::-1][:k])


def score_choosing_first(X: np.ndarray, y: np.ndarray, k: int, seed: int) -> float:
    """Mean R² over 5 folds, with the k columns chosen once, using every row."""
    columns = top_columns(X, y, k)
    scores = []
    for train, validation in folds.kfold(len(y), 5, seed):
        model = LinearRegression().fit(X[train][:, columns], y[train])
        scores.append(r2_score(y[validation], model.predict(X[validation][:, columns])))
    return float(np.mean(scores))


def score_choosing_inside(X: np.ndarray, y: np.ndarray, k: int, seed: int) -> float:
    """Mean R² over 5 folds, with each fold choosing its own k columns from its training rows."""
    scores = []
    for train, validation in folds.kfold(len(y), 5, seed):
        columns = top_columns(X[train], y[train], k)
        model = LinearRegression().fit(X[train][:, columns], y[train])
        scores.append(r2_score(y[validation], model.predict(X[validation][:, columns])))
    return float(np.mean(scores))
```

One line moved: `columns = top_columns(...)` now sits inside the loop and sees only `X[train]` and `y[train]`.

The honest score is **−1.66**. R² below zero means *worse than ignoring the features and predicting the average price*: the ten columns that looked best on 39 training houses are random for the other nine, and a model trusting them makes wild guesses. That's the truth about noise, and now the measurement says so.

```check
run ".venv/Scripts/python -m pytest -q tests/test_leakage.py -k choosing_inside" label="choosing inside each fold reveals the noise: R² −1.66" -- move columns = top_columns(X[train], y[train], k) inside the loop
```

## A Pipeline makes it the default

Writing the loop by hand every time invites the mistake back. scikit-learn's answer is to bundle the steps into one model:

> **Pipeline**: a chain of steps (here: choose columns, then fit a linear regression) wrapped up as one model with `fit` and `predict`. Fitting the pipeline fits every step, in order, on the data given; predicting passes new data through the same fitted steps.
>
> *Picture it as* a work cell where the fixture setup is part of the job, not something done once on the shop floor beforehand. Each job (fold) sets up its own fixtures from its own parts, so nothing from another job can sneak in.

Because cross-validation clones and fits the *whole* pipeline once per fold, the column choice automatically happens inside each fold. Add `pipeline_score` to `leakage.py` (the rest is unchanged):

```python file=leakage.py
import numpy as np
from sklearn.feature_selection import SelectKBest, f_regression
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import make_pipeline

import folds


def correlation(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.corrcoef(a, b)[0, 1])


def top_columns(X: np.ndarray, y: np.ndarray, k: int) -> np.ndarray:
    """The k columns of X most strongly correlated with y (positively or negatively), in column order."""
    strength = [abs(correlation(X[:, column], y)) for column in range(X.shape[1])]
    return np.sort(np.argsort(strength)[::-1][:k])


def score_choosing_first(X: np.ndarray, y: np.ndarray, k: int, seed: int) -> float:
    """Mean R² over 5 folds, with the k columns chosen once, using every row."""
    columns = top_columns(X, y, k)
    scores = []
    for train, validation in folds.kfold(len(y), 5, seed):
        model = LinearRegression().fit(X[train][:, columns], y[train])
        scores.append(r2_score(y[validation], model.predict(X[validation][:, columns])))
    return float(np.mean(scores))


def score_choosing_inside(X: np.ndarray, y: np.ndarray, k: int, seed: int) -> float:
    """Mean R² over 5 folds, with each fold choosing its own k columns from its training rows."""
    scores = []
    for train, validation in folds.kfold(len(y), 5, seed):
        columns = top_columns(X[train], y[train], k)
        model = LinearRegression().fit(X[train][:, columns], y[train])
        scores.append(r2_score(y[validation], model.predict(X[validation][:, columns])))
    return float(np.mean(scores))


def pipeline_score(X: np.ndarray, y: np.ndarray, k: int, seed: int) -> float:
    model = make_pipeline(SelectKBest(f_regression, k=k), LinearRegression())
    return float(cross_val_score(model, X, y, cv=KFold(n_splits=5, shuffle=True, random_state=seed), scoring="r2").mean())
```

- **`make_pipeline(step, step, …)`** builds the chain. Every step but the last must be a **transformer** (it has `fit` and `transform`: it learns something, then changes the data, as your `Standardiser` did); the last is the model.
- **`SelectKBest(f_regression, k=k)`** is scikit-learn's version of `top_columns`: fitting it learns which columns to keep; transforming keeps them.
- The pipeline is passed to `cross_val_score` exactly like a plain model. No loop, no chance to choose in the wrong place.

```check
run ".venv/Scripts/python -m pytest -q tests/test_leakage.py" label="the Pipeline gives the honest score without a hand-written loop"
```

## All four numbers

Create `leak.py`:

```python file=leak.py
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_score

import houses
import leakage

X, y = houses.load("data/houses.csv", ["sqft", "bedrooms", "age"])
real = cross_val_score(LinearRegression(), X, y, cv=KFold(n_splits=5, shuffle=True, random_state=0), scoring="r2").mean()

_, prices = houses.load("data/houses.csv", ["sqft"])
noise = np.random.default_rng(0).normal(size=(len(prices), 1000))

print(f"real features (sqft, bedrooms, age)        R² {real:6.3f}")
print(f"10 noise columns, chosen first             R² {leakage.score_choosing_first(noise, prices, 10, seed=0):6.3f}")
print(f"10 noise columns, chosen inside each fold  R² {leakage.score_choosing_inside(noise, prices, 10, seed=0):6.3f}")
print(f"the same, as a Pipeline                    R² {leakage.pipeline_score(noise, prices, 10, seed=0):6.3f}")
```

```powershell
.venv\Scripts\python leak.py
```

```text
real features (sqft, bedrooms, age)        R²  0.807
10 noise columns, chosen first             R²  0.424
10 noise columns, chosen inside each fold  R² -1.660
the same, as a Pipeline                    R² -1.660
```

The leaky number is more than half as good as the real features, from columns that contain nothing. On a real project, with real-looking columns, nobody would suspect it.

```check
run ".venv/Scripts/python leak.py" stdout="the same, as a Pipeline                    R² -1.660" label="leak.py shows the leaky and honest scores side by side"
```

## Leaks you'll meet

The rule (everything that learns from data is fitted on the training part only) covers most of them. Watch for:

| Leak | What happens | The fix |
|---|---|---|
| **Preprocessing on all the data** | scaling, filling blanks with the mean, or choosing features before splitting | put each step in a `Pipeline` |
| **Choosing on the test set** | picking the degree, penalty or model because of its test score (lesson 7.2) | choose with cross-validation; test once |
| **Target leakage** | a feature that is only known *after* the answer, like "price per square foot" when predicting price | ask of every column: would I have this when making a real prediction? |
| **Time travel** | training on next month to predict last month | split by time: train on the past, validate on later data |
| **Duplicates** | the same house listed twice, once in training and once in validation | remove duplicates before splitting |

That completes the evaluation toolkit: training versus test error, regularisation, honest validation, and the leaks that defeat it. From here on, every model in the series is judged with cross-validation inside a pipeline, starting with the next chapter's first **classifier**.
