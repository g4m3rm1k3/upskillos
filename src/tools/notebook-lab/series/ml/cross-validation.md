# Validation and cross-validation

Over the last few lessons you have made several choices about models: the polynomial degree, the regularisation strength λ. Each time, the choice was made by comparing errors on a held-out validation set. And each time, a question was left hanging: how much can you trust one split? With a small dataset, a different random split can give a noticeably different score and even a different "best" choice. And once you have used the validation set to choose, is its score still an honest estimate of how the model will do on new data?

This lesson answers both questions. It sets out the roles of the **training, validation and test sets**, shows how much a single split's score wobbles, and introduces **k-fold cross-validation**, which uses every example for both training and validation to give steadier estimates. It ends with the full protocol for choosing a model and reporting its performance honestly, which is what every later lesson, and every real project, should follow.

## Three sets, three jobs

- The **training set** is what the model learns its parameters from.
- The **validation set** is for making choices: which model, which degree, which λ, which features. Every time you look at its score and change something, you are, in a small way, fitting to it.
- The **test set** is for one thing only: the final, honest estimate of performance on new data, measured **once**, after every choice has been made.

Why keep the test set separate from validation? Because choosing the best of many options by their validation scores is itself a kind of fitting. Try enough options, and one will score well on the validation set partly by luck. Its validation score is then optimistic. The test set, never used for any decision, is not.

You can see this optimism directly. Here, 100 "models" are simulated that are all equally useless: they guess at random. Pick the one with the best validation accuracy, then measure it on fresh test data. Predict: what will the winner score on the test set?

```python type
import numpy as np

rng = np.random.default_rng(0)
y_val = rng.integers(0, 2, 200)
y_test = rng.integers(0, 2, 200)

best_val, best_model = 0, None
for model in range(100):
    guesses_val = rng.integers(0, 2, 200)
    accuracy = (guesses_val == y_val).mean()
    if accuracy > best_val:
        best_val, best_model = accuracy, model
guesses_test = rng.integers(0, 2, 200)
print("best validation accuracy of 100 random guessers:", best_val)
print("that model's accuracy on the test set:          ", (guesses_test == y_test).mean())
```

```output
best validation accuracy of 100 random guessers: 0.58
that model's accuracy on the test set:           0.46
```

Every model is a coin-flipper with a true accuracy of 50%, yet the best of 100 scores well above that on validation, purely by luck. On the test set it drops straight back to about 50%. When you choose among many models, only an untouched test set tells the truth.

## One split is not enough

Now the other question. How much does a validation score depend on which examples happened to land in the validation set? Guess how far apart ten random splits will be before running the cell.

```python type
import numpy as np
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
X = df.drop(columns="target").to_numpy(dtype=float)
y = df["target"].to_numpy(dtype=float)

def fit_and_score(train, val):
    mean, std = X[train].mean(axis=0), X[train].std(axis=0)
    A = np.column_stack([np.ones(len(train)), (X[train] - mean) / std])
    B = np.column_stack([np.ones(len(val)), (X[val] - mean) / std])
    theta = np.linalg.solve(A.T @ A, A.T @ y[train])
    predictions = B @ theta
    return 1 - np.sum((y[val] - predictions) ** 2) / np.sum((y[val] - y[val].mean()) ** 2)

scores = []
for seed in range(10):
    order = np.random.default_rng(seed).permutation(len(X))
    scores.append(fit_and_score(order[:350], order[350:]))
print(np.round(scores, 3))
print(f"from {min(scores):.2f} to {max(scores):.2f}")
```

```output
[0.34  0.438 0.363 0.542 0.448 0.323 0.444 0.488 0.535 0.513]
from 0.32 to 0.54
```

The same model, the same data, ten different random splits: the validation R² ranges widely, from about 0.32 to 0.54. With 92 validation patients, a single score is a noisy estimate, just as the estimation lesson predicted for any statistic from a small sample. Choices made by comparing two such scores can easily be wrong.

## k-fold cross-validation

The fix is to validate on **every** example, not just one slice. **k-fold cross-validation** works like this:

1. Shuffle the data and divide it into `k` equal parts, called **folds** (5 or 10 are typical).
2. For each fold in turn: train on the other `k − 1` folds, and measure the score on this fold.
3. Report the **average** of the `k` scores (and their spread).

Every example is used for validation exactly once and for training `k − 1` times. The average of `k` scores is much steadier than any single one, and it uses all the data for both jobs. In the next cell, predict: will the five-fold means for different shuffles vary as much as the single splits did?

```python type
import numpy as np
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
X = df.drop(columns="target").to_numpy(dtype=float)
y = df["target"].to_numpy(dtype=float)

def fit_and_score(train, val):
    mean, std = X[train].mean(axis=0), X[train].std(axis=0)
    A = np.column_stack([np.ones(len(train)), (X[train] - mean) / std])
    B = np.column_stack([np.ones(len(val)), (X[val] - mean) / std])
    theta = np.linalg.solve(A.T @ A, A.T @ y[train])
    predictions = B @ theta
    return 1 - np.sum((y[val] - predictions) ** 2) / np.sum((y[val] - y[val].mean()) ** 2)

def cross_validate(k, seed):
    order = np.random.default_rng(seed).permutation(len(X))
    folds = np.array_split(order, k)
    scores = []
    for i in range(k):
        val = folds[i]
        train = np.concatenate([folds[j] for j in range(k) if j != i])
        scores.append(fit_and_score(train, val))
    return np.array(scores)

scores = cross_validate(5, 0)
print("fold scores:", scores.round(3))
print(f"mean R² {scores.mean():.3f}, standard deviation {scores.std():.3f}")
print("means for five different shuffles:", [round(cross_validate(5, s).mean(), 3) for s in range(5)])
```

```output
fold scores: [0.501 0.503 0.533 0.557 0.343]
mean R² 0.487, standard deviation 0.075
means for five different shuffles: [np.float64(0.487), np.float64(0.48), np.float64(0.492), np.float64(0.489), np.float64(0.492)]
```

`np.array_split(order, k)` cuts the shuffled positions into `k` nearly equal pieces (it handles lengths that do not divide evenly). The individual fold scores still vary, which is honest information about how uncertain the estimate is. But the **means** over different shuffles agree far more closely than the single-split scores did. Notice that `fit_and_score` standardises using each training part's own statistics, so no information from the validation fold leaks into training.

The price is computation: `k` fits instead of one. For small and medium datasets that is almost always worth it. For huge datasets, where a single validation split is already large and stable, one split is fine.

## Choosing a hyperparameter with cross-validation

To choose λ for ridge, run cross-validation for each candidate and pick the one with the best mean score. The same folds should be used for every candidate, so they are compared on equal terms:

```python type
import numpy as np

rng = np.random.default_rng(1)
x = rng.uniform(-1, 1, 60)
y = np.sin(3 * x) + rng.normal(0, 0.3, 60)
P = np.column_stack([x ** k for k in range(1, 13)])

def ridge_fit(X, y, lam):
    A = np.column_stack([np.ones(len(X)), X])
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y)

folds = np.array_split(np.random.default_rng(0).permutation(60), 5)
lams = np.logspace(-6, 2, 17)
cv_mse = []
for lam in lams:
    errors = []
    for i in range(5):
        val = folds[i]
        train = np.concatenate([folds[j] for j in range(5) if j != i])
        theta = ridge_fit(P[train], y[train], lam)
        predictions = np.column_stack([np.ones(len(val)), P[val]]) @ theta
        errors.append(np.mean((predictions - y[val]) ** 2))
    cv_mse.append(np.mean(errors))
best = lams[int(np.argmin(cv_mse))]
print("cross-validated MSE by λ:", np.round(cv_mse, 3))
print("best λ:", best)
```

```output
cross-validated MSE by λ: [0.081 0.079 0.075 0.072 0.07  0.069 0.068 0.068 0.068 0.066 0.071 0.086
 0.118 0.185 0.279 0.395 0.517]
best λ: 0.03162277660168379
```

Look at the whole row of scores, not just the winner. The cross-validated error is almost flat over a wide range of small λ values, then climbs steeply once λ is large enough to flatten the curve. Many λ values are nearly as good as the best one, and a slightly different set of folds could easily pick a neighbour. What matters is staying on the flat part, well away from the cliff; the exact winner matters much less.

## The full protocol

Putting it all together, this is how to choose a model and report it honestly:

1. **Split off a test set** at the very start, and do not look at it again.
2. On the rest (the "development" data), use **cross-validation** to compare models and choose hyperparameters.
3. **Refit** the chosen model on all the development data (more data gives a better final model).
4. **Evaluate once** on the test set, and report that score.

If the test score is much worse than the cross-validation score, something went wrong, most often **leakage**: information from outside the training folds sneaking into training. The feature engineering and leakage lessons return to this.

## Cross-validation in scikit-learn

scikit-learn has all of this built in. `KFold` makes the folds and `cross_val_score` runs the whole loop:

```python type
from sklearn.datasets import load_diabetes
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_score

data = load_diabetes()
folds = KFold(n_splits=5, shuffle=True, random_state=0)
scores = cross_val_score(LinearRegression(), data.data, data.target, cv=folds, scoring="r2")
print(scores.round(3), scores.mean().round(3))
```

```output
[0.332 0.46  0.537 0.522 0.595] 0.489
```

(`load_diabetes()` without `scaled=False` gives the same data with its features already standardised, which makes no difference to plain linear regression; the mean R² of about 0.49 agrees with the hand-written version above.) The `scoring` argument names the measure. For errors, scikit-learn uses **negated** versions, such as `"neg_mean_squared_error"`, because it always treats a higher score as better.

## Variations worth knowing

- **Stratified k-fold** (`StratifiedKFold`), for classification: each fold keeps the same proportion of each class as the whole dataset. With rare classes, plain shuffling can leave a fold with almost none of them.
- **Leave-one-out**: `k` equals the number of examples, so each fold is a single example. Nearly unbiased, but expensive, and its estimate can be noisy.
- **Grouped data** (`GroupKFold`): if one patient contributes several rows, all of that patient's rows must go in the same fold. Otherwise the model is tested on patients it has already seen, and the score is optimistic.
- **Time series**: never shuffle. Train on the past and validate on the future, as the time series lesson will show; shuffling would let the model peek at tomorrow when predicting today.

::: challenge Make the folds [easy]
Write a function `make_folds(n, k, seed)` that returns a list of `k` pairs `(train_positions, val_positions)`, as NumPy arrays, for k-fold cross-validation on `n` examples. Follow the lesson exactly: shuffle with `np.random.default_rng(seed).permutation(n)`, split with `np.array_split(order, k)`, and for fold `i` use fold `i` for validation and all the other folds, joined in order with `np.concatenate`, for training.

```python starter
import numpy as np

def make_folds(n, k, seed):
    return []

for train, val in make_folds(10, 3, 0):
    print(train, val)
```

```python solution
import numpy as np

def make_folds(n, k, seed):
    order = np.random.default_rng(seed).permutation(n)
    folds = np.array_split(order, k)
    pairs = []
    for i in range(k):
        train = np.concatenate([folds[j] for j in range(k) if j != i])
        pairs.append((train, folds[i]))
    return pairs

for train, val in make_folds(10, 3, 0):
    print(train, val)
```

```python test
import numpy as _np
assert "make_folds" in dir(), "Keep the function's name as make_folds."
_pairs = make_folds(10, 3, 0)
assert len(_pairs) == 3, f"There should be 3 folds, but got {len(_pairs)}."
_all_val = _np.concatenate([_np.asarray(v) for _, v in _pairs])
assert sorted(_all_val.tolist()) == list(range(10)), "Every example should be used for validation exactly once."
for _tr, _va in _pairs:
    assert len(set(_np.asarray(_tr).tolist()) & set(_np.asarray(_va).tolist())) == 0, "A fold's training and validation positions must not overlap."
    assert len(_tr) + len(_va) == 10, "Training and validation together should cover all 10 examples."
_order = _np.random.default_rng(0).permutation(10)
_f = _np.array_split(_order, 3)
assert _np.array_equal(_pairs[1][1], _f[1]) and _np.array_equal(_pairs[1][0], _np.concatenate([_f[0], _f[2]])), "Follow the procedure exactly: permutation, array_split, fold i for validation, the others concatenated in order for training."
assert len(make_folds(23, 5, 1)) == 5, "It should work when n does not divide evenly by k."
"SUCCESS: Every example validated once, trained on k − 1 times."
```

Hint: After splitting, loop over `i` from 0 to `k − 1`. The validation positions are `folds[i]`; the training positions are the other folds, joined with `np.concatenate`.
:::

::: challenge Cross-validate a model [medium]
Write a function `cv_score(X, y, k, seed, fit, predict)` that returns the mean validation MSE across `k` folds, made exactly as in the last challenge. `fit(X_train, y_train)` returns a fitted model (anything), and `predict(model, X_val)` returns predictions, so the same function works for any model.

Then use it to compare ordinary least squares with ridge (λ = 5) on the starter's data, which has many features and few examples. Store the two mean MSEs in `ols_mse` and `ridge_mse`, using `k = 5` and `seed = 0`.

```python starter
import numpy as np

def cv_score(X, y, k, seed, fit, predict):
    return 0.0

def ridge_fit(X, y, lam):
    A = np.column_stack([np.ones(len(X)), X])
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y)

def predict(theta, X):
    return np.column_stack([np.ones(len(X)), X]) @ theta

rng = np.random.default_rng(2)
X = rng.normal(size=(40, 25))
y = X[:, 0] * 2 - X[:, 1] + rng.normal(0, 1, 40)

ols_mse = 0.0
ridge_mse = 0.0
print(ols_mse, ridge_mse)
```

```python solution
import numpy as np

def cv_score(X, y, k, seed, fit, predict):
    order = np.random.default_rng(seed).permutation(len(X))
    folds = np.array_split(order, k)
    errors = []
    for i in range(k):
        val = folds[i]
        train = np.concatenate([folds[j] for j in range(k) if j != i])
        model = fit(X[train], y[train])
        errors.append(np.mean((predict(model, X[val]) - y[val]) ** 2))
    return float(np.mean(errors))

def ridge_fit(X, y, lam):
    A = np.column_stack([np.ones(len(X)), X])
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y)

def predict(theta, X):
    return np.column_stack([np.ones(len(X)), X]) @ theta

rng = np.random.default_rng(2)
X = rng.normal(size=(40, 25))
y = X[:, 0] * 2 - X[:, 1] + rng.normal(0, 1, 40)

ols_mse = cv_score(X, y, 5, 0, lambda X, y: ridge_fit(X, y, 0.0), predict)
ridge_mse = cv_score(X, y, 5, 0, lambda X, y: ridge_fit(X, y, 5.0), predict)
print(ols_mse, ridge_mse)
```

```python test
import numpy as _np
assert "cv_score" in dir(), "Keep the function's name as cv_score."
def _rf(X, y, lam):
    A = _np.column_stack([_np.ones(len(X)), X])
    p = lam * _np.eye(A.shape[1])
    p[0, 0] = 0
    return _np.linalg.solve(A.T @ A + p, A.T @ y)
def _pr(t, X):
    return _np.column_stack([_np.ones(len(X)), X]) @ t
def _cv(X, y, k, s, lam):
    o = _np.random.default_rng(s).permutation(len(X))
    f = _np.array_split(o, k)
    e = []
    for i in range(k):
        tr = _np.concatenate([f[j] for j in range(k) if j != i])
        e.append(_np.mean((_pr(_rf(X[tr], y[tr], lam), X[f[i]]) - y[f[i]]) ** 2))
    return _np.mean(e)
_rng = _np.random.default_rng(2)
_X = _rng.normal(size=(40, 25))
_y = _X[:, 0] * 2 - _X[:, 1] + _rng.normal(0, 1, 40)
assert _np.isclose(cv_score(_X, _y, 5, 0, lambda X, y: _rf(X, y, 1.0), _pr), _cv(_X, _y, 5, 0, 1.0)), "cv_score should return the mean validation MSE over the k folds, made as in the last challenge."
assert _np.isclose(ols_mse, _cv(_X, _y, 5, 0, 0.0)) and _np.isclose(ridge_mse, _cv(_X, _y, 5, 0, 5.0)), "Store the cross-validated MSE for λ = 0 in ols_mse and for λ = 5 in ridge_mse."
assert ridge_mse < ols_mse, "Ridge should do much better here: 25 features and only 32 training examples per fold."
"SUCCESS: With 25 features and 32 training examples per fold, least squares overfits badly; ridge does far better."
```

Hint: This is `make_folds` plus a fit and a prediction inside the loop. Pass the ridge fitting function as a small `lambda X, y: ridge_fit(X, y, 5.0)`, since `fit` must take only the training data.
:::

::: challenge The honest protocol [medium]
Carry out the full protocol from the lesson on the starter's data:

1. hold out the **last 30** examples as the test set; the first 90 are the development set;
2. choose λ from `lams` by 5-fold cross-validation on the development set (seed 0), using `cv_score`, `ridge_fit` and `predict` from the last challenge (copy them into this cell, so it works on its own);
3. refit ridge with that λ on **all** 90 development examples;
4. compute the MSE on the 30 test examples, once.

Store the chosen λ in `chosen_lambda` and the final test MSE in `test_mse`.

```python starter
import numpy as np

rng = np.random.default_rng(3)
x = rng.uniform(-1, 1, 120)
y = np.sin(3 * x) + rng.normal(0, 0.3, 120)
X = np.column_stack([x ** k for k in range(1, 13)])
lams = list(np.logspace(-6, 2, 17))

chosen_lambda = lams[0]
test_mse = 0.0
print(chosen_lambda, test_mse)
```

```python solution
import numpy as np

def ridge_fit(X, y, lam):
    A = np.column_stack([np.ones(len(X)), X])
    penalty = lam * np.eye(A.shape[1])
    penalty[0, 0] = 0
    return np.linalg.solve(A.T @ A + penalty, A.T @ y)

def predict(theta, X):
    return np.column_stack([np.ones(len(X)), X]) @ theta

def cv_score(X, y, k, seed, fit, predict):
    order = np.random.default_rng(seed).permutation(len(X))
    folds = np.array_split(order, k)
    errors = []
    for i in range(k):
        val = folds[i]
        train = np.concatenate([folds[j] for j in range(k) if j != i])
        model = fit(X[train], y[train])
        errors.append(np.mean((predict(model, X[val]) - y[val]) ** 2))
    return float(np.mean(errors))

rng = np.random.default_rng(3)
x = rng.uniform(-1, 1, 120)
y = np.sin(3 * x) + rng.normal(0, 0.3, 120)
X = np.column_stack([x ** k for k in range(1, 13)])
lams = list(np.logspace(-6, 2, 17))

X_dev, y_dev, X_test, y_test = X[:90], y[:90], X[90:], y[90:]
scores = [cv_score(X_dev, y_dev, 5, 0, lambda A, b, lam=lam: ridge_fit(A, b, lam), predict) for lam in lams]
chosen_lambda = lams[int(np.argmin(scores))]
final = ridge_fit(X_dev, y_dev, chosen_lambda)
test_mse = float(np.mean((predict(final, X_test) - y_test) ** 2))
print(chosen_lambda, test_mse)
```

```python test
import numpy as _np
def _rf(X, y, lam):
    A = _np.column_stack([_np.ones(len(X)), X])
    p = lam * _np.eye(A.shape[1])
    p[0, 0] = 0
    return _np.linalg.solve(A.T @ A + p, A.T @ y)
def _pr(t, X):
    return _np.column_stack([_np.ones(len(X)), X]) @ t
def _cv(X, y, lam):
    o = _np.random.default_rng(0).permutation(len(X))
    f = _np.array_split(o, 5)
    return _np.mean([_np.mean((_pr(_rf(X[_np.concatenate([f[j] for j in range(5) if j != i])], y[_np.concatenate([f[j] for j in range(5) if j != i])], lam), X[f[i]]) - y[f[i]]) ** 2) for i in range(5)])
_rng = _np.random.default_rng(3)
_x = _rng.uniform(-1, 1, 120)
_y = _np.sin(3 * _x) + _rng.normal(0, 0.3, 120)
_X = _np.column_stack([_x ** k for k in range(1, 13)])
_l = list(_np.logspace(-6, 2, 17))
_best = _l[int(_np.argmin([_cv(_X[:90], _y[:90], lam) for lam in _l]))]
assert _np.isclose(chosen_lambda, _best), f"Cross-validation on the first 90 examples chooses λ = {_best:.3g}, but chosen_lambda is {chosen_lambda}."
_final = _rf(_X[:90], _y[:90], _best)
_want = _np.mean((_pr(_final, _X[90:]) - _y[90:]) ** 2)
assert _np.isclose(test_mse, _want), f"After refitting on all 90 development examples, the test MSE should be {_want:.4f}, but test_mse is {test_mse}."
"SUCCESS: Chosen by cross-validation, refitted on everything allowed, and tested once. That is the number to report."
```

Hint: For each λ, pass `lambda A, b: ridge_fit(A, b, lam)` as the fit function; since `cv_score` calls it straight away, it uses the current λ. (If you ever build a list of such functions first and call them later, they would all see the loop's last λ, because a closure looks up `lam` when it runs, not when it was made. Writing `lambda A, b, lam=lam: ...` stores the current value as a default argument and avoids that.)
:::

## What you learned

- The training set fits parameters, the validation set guides choices, and the test set gives one final, honest estimate. Choosing among many options by validation score makes that score optimistic.
- A single train/validation split gives a noisy score, especially with small datasets.
- k-fold cross-validation trains `k` times, validating on each fold once, and averages the scores: steadier, and every example is used for both jobs. Standardise inside each fold.
- Choose hyperparameters by their mean cross-validated score, on the same folds for every candidate.
- The full protocol: hold out a test set, cross-validate on the rest to choose, refit on all of it, test once.
- scikit-learn's `KFold` and `cross_val_score` automate the loop; error scores are negated so that higher is always better.
- Use stratified folds for classification, grouped folds when examples share a source, and forward-in-time splits for time series.

That completes the core of regression. Next the series turns to classification, starting with the very first learning machine: the perceptron.
