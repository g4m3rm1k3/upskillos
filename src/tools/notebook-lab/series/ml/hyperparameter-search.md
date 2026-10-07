# Hyperparameter search

Nearly every model has settings that training does not learn: the `C` and `gamma` of an SVM, a tree's `max_depth`, the number of neighbours, a learning rate, a regularisation strength. These **hyperparameters** often matter as much as the choice of model. So far you have chosen them by hand or with a small loop. This lesson does it systematically, with **grid search** and **random search**, and then deals with a subtle trap: the best score found by a search is itself an optimistic estimate, because you picked the winner of many noisy contests. The fix, **nested cross-validation**, is the honest way to report what a tuned model will really do.

## Grid search

The simplest method: list some values for each hyperparameter, try **every combination**, score each by cross-validation, and keep the best. scikit-learn's `GridSearchCV` does exactly that. It takes a model (often a pipeline), a dictionary of values to try, using the `step__parameter` names from the workflow lesson, and the cross-validation to use:

```python type
import pandas as pd
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)

pipeline = make_pipeline(StandardScaler(), SVC())
grid = {"svc__C": [0.01, 0.1, 1, 10, 100], "svc__gamma": [0.0001, 0.001, 0.01, 0.1, 1]}
search = GridSearchCV(pipeline, grid, cv=5).fit(X_train, y_train)

print("best settings:", search.best_params_)
print(f"best cross-validated accuracy: {search.best_score_:.4f}")
print(f"accuracy on the untouched test set: {search.score(X_test, y_test):.4f}")

table = pd.DataFrame(search.cv_results_).pivot_table(index="param_svc__C", columns="param_svc__gamma", values="mean_test_score")
print(table.round(3))
```

```output
best settings: {'svc__C': 100, 'svc__gamma': 0.001}
best cross-validated accuracy: 0.9883
accuracy on the untouched test set: 0.9580
param_svc__gamma  0.0001  0.0010  0.0100  0.1000  1.0000
param_svc__C
0.01               0.627   0.627   0.627   0.627   0.627
0.10               0.627   0.709   0.941   0.946   0.627
1.00               0.723   0.944   0.967   0.970   0.627
10.00              0.944   0.974   0.981   0.967   0.629
100.00             0.974   0.988   0.967   0.967   0.629
```

Twenty-five combinations, each cross-validated 5 times: 125 fits. Afterwards:

- `best_params_` and `best_score_` give the winning combination and its mean cross-validated score.
- By default (`refit=True`) the search then **refits** the best combination on all the data it was given, so `search` itself can `predict` and `score` like an ordinary model.
- `cv_results_` records everything; turned into a DataFrame and pivoted (the pandas reshaping lesson), it shows the whole landscape of scores.

Read the table. Very small `C` gives 0.627 everywhere, which is simply the fraction of benign tumours: the model has given up and predicts one class. So, almost exactly, does `gamma=1` at any `C`, for a different reason: each support vector's influence fades within a tiny neighbourhood, and with 30 standardised features a new tumour is close to none of them, so every kernel value is about 0, its score is just `b`, and it gets the majority class. The good region is a diagonal band (large `C` with small `gamma`, or moderate `C` with moderate `gamma`), because the two settings trade off: both control how flexible the boundary is. Values spaced by factors of 10 (a **logarithmic grid**) are the right starting point for settings like these, whose effect depends on their order of magnitude.

Notice too that the test accuracy, 0.958, is below the best cross-validated score, 0.988. Part of that is the test set's own noise. But part of it is systematic, as you will see shortly.

## Random search

Grid search's cost multiplies: 5 values each of 4 hyperparameters is 625 combinations. Worse, it wastes effort when some hyperparameters barely matter. With a 3 × 3 grid over two settings, you try 9 combinations but only **3 different values** of each. If only one of the two settings really matters, you have effectively tried 3 things.

**Random search** draws each combination at random from ranges you specify. Nine random points give 9 different values of **every** setting:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
grid_points = np.array([(a, b) for a in [0.2, 0.5, 0.8] for b in [0.2, 0.5, 0.8]])
random_points = rng.random((9, 2))

fig, axes = plt.subplots(1, 2, figsize=(8, 3.6), sharey=True)
for ax, points, title in [(axes[0], grid_points, "grid: 3 distinct values of each"), (axes[1], random_points, "random: 9 distinct values of each")]:
    ax.scatter(points[:, 0], points[:, 1], s=40)
    ax.scatter(points[:, 0], np.full(9, -0.08), marker="|", s=200, color="tab:red")
    ax.set_xlim(0, 1)
    ax.set_ylim(-0.15, 1)
    ax.set_xlabel("important setting")
    ax.set_title(title, fontsize=9)
axes[0].set_ylabel("unimportant setting")
plt.show()
```

The red ticks along the bottom show which values of the important setting each method actually tried. For the same budget, random search explores the important direction three times as finely. Studies of real models found exactly this: usually only a few hyperparameters matter, and which ones depends on the dataset, so random search tends to find good settings faster than a grid.

`RandomizedSearchCV` takes **distributions** instead of lists. For settings that span orders of magnitude, `loguniform(a, b)` from `scipy.stats` draws values whose logarithms are evenly spread between `a` and `b`, so 0.01 to 0.1 gets as many tries as 10 to 100:

```python type
from scipy.stats import loguniform
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)

search = RandomizedSearchCV(
    make_pipeline(StandardScaler(), SVC()),
    {"svc__C": loguniform(1e-2, 1e2), "svc__gamma": loguniform(1e-4, 1)},
    n_iter=25, cv=5, random_state=0,
).fit(X_train, y_train)
print("best settings:", {name: round(float(value), 4) for name, value in search.best_params_.items()})
print(f"best cross-validated accuracy: {search.best_score_:.4f}, test accuracy: {search.score(X_test, y_test):.4f}")
```

```output
best settings: {'svc__C': 2.8079, 'svc__gamma': 0.0294}
best cross-validated accuracy: 0.9859, test accuracy: 0.9580
```

With the same budget of 25 combinations, it finds settings (C ≈ 2.8, gamma ≈ 0.03) that are not on the grid, scoring 0.986 in cross-validation and the same 0.958 on the test set. `n_iter` sets the budget, and `random_state` makes the draws repeatable.

More advanced methods (Bayesian optimisation, as in the Optuna library, and successive halving, `HalvingRandomSearchCV`, which gives many candidates a small budget and the promising ones more) search more cleverly still, but random search with a sensible budget is a strong, simple default.

## The winner's curse

Here is the trap. Each cross-validated score is an **estimate**, with noise from the particular folds. A search computes dozens of these estimates and reports the **largest**. The largest of many noisy estimates is biased upwards: some settings look best partly because they got lucky on these particular folds. This is sometimes called the **winner's curse**, and it is a form of leakage: the data used to score the winner was also used to choose it.

See it on data where the truth is known. The features below are pure noise and the labels random, so every possible model has a true accuracy of 50%. What best score do you expect the search to report?

```python type
import numpy as np
from sklearn.model_selection import GridSearchCV, KFold, cross_val_score
from sklearn.tree import DecisionTreeClassifier

rng = np.random.default_rng(0)
X = rng.normal(size=(60, 10))
y = rng.integers(0, 2, 60)
grid = {"max_depth": [1, 2, 3, 4, 5, 6, None], "min_samples_leaf": [1, 2, 4, 8, 16]}

search = GridSearchCV(DecisionTreeClassifier(random_state=0), grid, cv=5).fit(X, y)
scores = search.cv_results_["mean_test_score"]
print(f"35 settings scored between {scores.min():.2f} and {scores.max():.2f}")
print(f"the search reports a best score of {search.best_score_:.2f} for {search.best_params_}")

nested = cross_val_score(GridSearchCV(DecisionTreeClassifier(random_state=0), grid, cv=5), X, y,
                         cv=KFold(5, shuffle=True, random_state=0))
print(f"nested cross-validation: {nested.round(2)}, mean {nested.mean():.2f}")
```

```output
35 settings scored between 0.45 and 0.60
the search reports a best score of 0.60 for {'max_depth': 1, 'min_samples_leaf': 16}
nested cross-validation: [0.5  0.42 0.5  0.58 0.33], mean 0.47
```

The search proudly reports 0.60 for its best tree, on data where nothing can be learned. Nothing about any single score is wrong; picking the maximum of 35 of them is what inflates it.

## Nested cross-validation

The honest way to estimate how well "a model, tuned by this search" will perform is to treat the **whole search** as the training procedure and cross-validate **that**. That is **nested cross-validation**:

- An **outer** loop splits the data into folds, just as ordinary cross-validation does.
- For each outer fold, the search runs on the outer **training** part only, with its own **inner** cross-validation to choose the settings.
- The chosen, refitted model is then scored once on the outer **test** fold, which played no part in choosing anything.

In scikit-learn this is one line, because a `GridSearchCV` is itself an estimator: pass it to `cross_val_score`, as in the last line of the demo. The five outer scores average 0.47, close to the true 0.5. The nested estimate is honest; the best score from a single search is not.

What nested cross-validation estimates is the performance of the **procedure**, not one particular set of settings: different outer folds may choose different settings. When you finally need a model to use, you run the search once on all the data and take its refitted winner, and you report the nested score as your estimate of how well it will do. With a separate untouched test set, as in the first demo, you get a similar guarantee more cheaply: tune on the training part only, and report the test score once at the end.

## Practical advice

- Search on a logarithmic scale for scale-like settings (`C`, `gamma`, `alpha`, learning rates).
- Start coarse and wide, then narrow around the good region. If the best value is at the edge of your range, extend the range.
- Put all preprocessing inside the pipeline being searched, so each inner fold refits it.
- Prefer random search when there are more than two or three settings.
- Never tune on the test set. Use nested cross-validation or a held-out test set to report the final score, and look at it once.

::: challenge Tune the neighbours [easy]
On the wine data, use `GridSearchCV` with 5-fold cross-validation to tune the number of neighbours of `make_pipeline(StandardScaler(), KNeighborsClassifier())`, trying `[1, 3, 5, 7, 9, 15, 25, 45]`. Store the fitted search in `search`, the best number of neighbours in `best_k` and the best cross-validated accuracy in `best_score`.

```python starter
from sklearn.datasets import load_wine
from sklearn.model_selection import GridSearchCV
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)
search = None
best_k = None
best_score = 0.0
print(best_k, best_score)
```

```python solution
from sklearn.datasets import load_wine
from sklearn.model_selection import GridSearchCV
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)
pipeline = make_pipeline(StandardScaler(), KNeighborsClassifier())
search = GridSearchCV(pipeline, {"kneighborsclassifier__n_neighbors": [1, 3, 5, 7, 9, 15, 25, 45]}, cv=5).fit(X, y)
best_k = search.best_params_["kneighborsclassifier__n_neighbors"]
best_score = search.best_score_
print(best_k, best_score)
```

```python test
import numpy as _np
from sklearn.datasets import load_wine as _lw
from sklearn.model_selection import GridSearchCV as _GS
from sklearn.neighbors import KNeighborsClassifier as _KNC
from sklearn.pipeline import make_pipeline as _mp
from sklearn.preprocessing import StandardScaler as _SS
assert isinstance(search, _GS) and hasattr(search, "best_params_"), "search should be a fitted GridSearchCV."
assert list(search.param_grid.values())[0] == [1, 3, 5, 7, 9, 15, 25, 45], "Search over n_neighbors values [1, 3, 5, 7, 9, 15, 25, 45]."
_X, _y = _lw(return_X_y=True)
_ref = _GS(_mp(_SS(), _KNC()), {"kneighborsclassifier__n_neighbors": [1, 3, 5, 7, 9, 15, 25, 45]}, cv=5).fit(_X, _y)
assert best_k == _ref.best_params_["kneighborsclassifier__n_neighbors"], f"best_k should be {_ref.best_params_['kneighborsclassifier__n_neighbors']}."
assert _np.isclose(best_score, _ref.best_score_), f"best_score should be {_ref.best_score_:.4f}."
f"SUCCESS: {best_k} neighbours, {best_score:.3f} in cross-validation. Remember: that score is the best of 8, so it is slightly optimistic."
```

Hint: The parameter name is the step name (`kneighborsclassifier`), two underscores, and `n_neighbors`. After fitting, the answers are in `search.best_params_` and `search.best_score_`.
:::

::: challenge Grid search by hand [medium]
Write your own `grid_search(model, grid, X, y, cv)`. `grid` is a dictionary mapping parameter names to lists of values. Try every combination with `itertools.product` (from the modules lesson), in the order `product(*grid.values())` gives; for each, make a fresh copy of the model with `clone(model)` (from `sklearn.base`), apply the combination with `set_params(**settings)`, and score it with `cross_val_score(..., cv=cv).mean()`. Return a tuple `(best_settings, best_score)`, where `best_settings` is a dictionary; if combinations tie, keep the first.

The check compares your answer with `GridSearchCV` on a pipeline with two hyperparameters.

```python starter
from itertools import product
from sklearn.base import clone
from sklearn.model_selection import cross_val_score

def grid_search(model, grid, X, y, cv):
    return {}, 0.0
```

```python solution
from itertools import product
from sklearn.base import clone
from sklearn.model_selection import cross_val_score

def grid_search(model, grid, X, y, cv):
    names = list(grid)
    best_settings, best_score = None, -float("inf")
    for values in product(*grid.values()):
        settings = dict(zip(names, values))
        candidate = clone(model).set_params(**settings)
        score = cross_val_score(candidate, X, y, cv=cv).mean()
        if score > best_score:
            best_settings, best_score = settings, score
    return best_settings, best_score
```

```python test
import numpy as _np
from sklearn.datasets import load_breast_cancer as _lb
from sklearn.model_selection import GridSearchCV as _GS
from sklearn.pipeline import make_pipeline as _mp
from sklearn.preprocessing import StandardScaler as _SS
from sklearn.svm import SVC as _SVC
assert "grid_search" in dir(), "Keep the function's name as grid_search."
_X, _y = _lb(return_X_y=True)
_X, _y = _X[:250], _y[:250]
_pipe = _mp(_SS(), _SVC())
_grid = {"svc__C": [0.1, 1, 10], "svc__gamma": [0.001, 0.01, 0.1]}
_ref = _GS(_pipe, _grid, cv=3).fit(_X, _y)
_settings, _score = grid_search(_pipe, _grid, _X, _y, 3)
assert isinstance(_settings, dict), "best_settings should be a dictionary of parameter names to values."
assert _settings == _ref.best_params_, f"The best settings should be {_ref.best_params_}, but you found {_settings}."
assert _np.isclose(_score, _ref.best_score_), f"The best score should be {_ref.best_score_:.4f}, but you returned {_score}."
assert _pipe.get_params()["svc__C"] == 1.0, "Don't change the model passed in: clone it for each combination."
_tie = grid_search(_mp(_SS(), _SVC()), {"svc__C": [1e-6, 1e-5]}, _X, _y, 3)
assert _tie[0] == {"svc__C": 1e-6}, "When combinations tie, keep the first one tried (use > rather than >=)."
"SUCCESS: That is all GridSearchCV is: every combination, cross-validated, best one kept, plus the bookkeeping."
```

Hint: `product(*grid.values())` yields tuples of values, one per combination; `dict(zip(names, values))` turns each into a settings dictionary. `clone(model).set_params(**settings)` gives a fresh, configured copy.
:::

::: challenge Nested cross-validation by hand [medium]
Write the outer loop of nested cross-validation yourself. `nested_scores(search, X, y, outer)` takes an **unfitted** search object (such as a `GridSearchCV`), and a splitter `outer` (such as `KFold`). For each `(train, test)` pair from `outer.split(X, y)`, fit a fresh `clone(search)` on the training rows, then record its score on the test rows and its `best_params_`. Return a tuple `(scores, chosen)`: the list of outer scores and the list of chosen settings, in fold order.

Then run it on the starter's noise data and store the mean of the scores in `nested_mean`, and the best score of a single search fitted on all the data in `single_best`.

```python starter
import numpy as np
from sklearn.base import clone
from sklearn.model_selection import GridSearchCV, KFold
from sklearn.tree import DecisionTreeClassifier

def nested_scores(search, X, y, outer):
    return [], []

rng = np.random.default_rng(0)
X = rng.normal(size=(60, 10))
y = rng.integers(0, 2, 60)
search = GridSearchCV(DecisionTreeClassifier(random_state=0), {"max_depth": [1, 2, 3, 4, 5, 6, None], "min_samples_leaf": [1, 2, 4, 8, 16]}, cv=5)
outer = KFold(5, shuffle=True, random_state=0)

nested_mean = 0.0
single_best = 0.0
print(nested_mean, single_best)
```

```python solution
import numpy as np
from sklearn.base import clone
from sklearn.model_selection import GridSearchCV, KFold
from sklearn.tree import DecisionTreeClassifier

def nested_scores(search, X, y, outer):
    scores, chosen = [], []
    for train, test in outer.split(X, y):
        fitted = clone(search).fit(X[train], y[train])
        scores.append(fitted.score(X[test], y[test]))
        chosen.append(fitted.best_params_)
    return scores, chosen

rng = np.random.default_rng(0)
X = rng.normal(size=(60, 10))
y = rng.integers(0, 2, 60)
search = GridSearchCV(DecisionTreeClassifier(random_state=0), {"max_depth": [1, 2, 3, 4, 5, 6, None], "min_samples_leaf": [1, 2, 4, 8, 16]}, cv=5)
outer = KFold(5, shuffle=True, random_state=0)

scores, chosen = nested_scores(search, X, y, outer)
nested_mean = np.mean(scores)
single_best = clone(search).fit(X, y).best_score_
print(nested_mean, single_best)
print(chosen)
```

```python test
import numpy as _np
from sklearn.base import clone as _clone
from sklearn.model_selection import GridSearchCV as _GS, KFold as _KF, cross_val_score as _cvs
from sklearn.tree import DecisionTreeClassifier as _DTC
assert "nested_scores" in dir(), "Keep the function's name as nested_scores."
_r = _np.random.default_rng(0)
_X = _r.normal(size=(60, 10))
_y = _r.integers(0, 2, 60)
_s = _GS(_DTC(random_state=0), {"max_depth": [1, 2, 3]}, cv=3)
_out = _KF(4, shuffle=True, random_state=1)
_sc, _ch = nested_scores(_s, _X, _y, _out)
_want = _cvs(_GS(_DTC(random_state=0), {"max_depth": [1, 2, 3]}, cv=3), _X, _y, cv=_out)
assert len(_sc) == 4 and len(_ch) == 4, "Return one score and one chosen setting per outer fold."
assert _np.allclose(_sc, _want), f"Your outer scores {_np.round(_sc, 3)} differ from cross_val_score(search, X, y, cv=outer), {_np.round(_want, 3)}. Fit the search on the training rows only and score it on the test rows."
assert all(isinstance(c, dict) and "max_depth" in c for c in _ch), "chosen should hold each fold's best_params_ dictionary."
assert not hasattr(_s, "best_params_"), "Don't fit the search object you were given: fit clone(search) in each fold."
_big = _GS(_DTC(random_state=0), {"max_depth": [1, 2, 3, 4, 5, 6, None], "min_samples_leaf": [1, 2, 4, 8, 16]}, cv=5)
_nm = _cvs(_big, _X, _y, cv=_KF(5, shuffle=True, random_state=0)).mean()
_sb = _clone(_big).fit(_X, _y).best_score_
assert _np.isclose(nested_mean, _nm), f"nested_mean should be {_nm:.3f}."
assert _np.isclose(single_best, _sb), f"single_best should be {_sb:.3f}."
f"SUCCESS: The single search claims {_sb:.2f} on pure noise; nested cross-validation says {_nm:.2f}, close to the truth of 0.5. The settings chosen in each outer fold differ, too: on noise there is no 'right' setting to find."
```

Hint: Inside the loop, `clone(search).fit(X[train], y[train])` runs the inner search on the training rows only; its `score(X[test], y[test])` uses the refitted best model. For `single_best`, fit another clone on all of `X` and `y`.
:::

## What you learned

- Hyperparameters are settings chosen before training. `GridSearchCV` tries every combination from lists, cross-validates each, and refits the best (`best_params_`, `best_score_`, `cv_results_`).
- Search scale-like settings on a logarithmic grid; a table of results shows how settings trade off.
- `RandomizedSearchCV` draws combinations from distributions (`loguniform` for scale-like settings). For the same budget it explores each important setting more finely than a grid.
- The best score of a search is optimistically biased: it is the maximum of many noisy estimates. On pure noise a search reported 0.60.
- Nested cross-validation cross-validates the whole search (an outer loop around an inner search) and gives an honest estimate (0.47 on the noise data). Pass a search object to `cross_val_score` to do it in one line, or tune on a training split and report a held-out test score once.

That completes the supervised learning toolkit: models, evaluation, pipelines, features, and honest tuning. The next part of the series turns to data with no labels at all, beginning with the most famous clustering method: k-means.
