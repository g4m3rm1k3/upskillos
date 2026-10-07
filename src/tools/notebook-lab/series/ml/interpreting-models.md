# Interpreting models and checking them

A good test score says a model predicts well on data like its test set. It does not say **why** the model predicts what it does, whether it will keep working when the world changes, or whether it treats different groups of people fairly. Those questions decide whether a model can be trusted in use, and they often matter more than the last point of accuracy.

This lesson builds the standard tools for answering them, mostly from scratch:

- **Permutation importance**: which features the model actually relies on, and why the impurity importances of trees can mislead.
- **Partial dependence**: how the prediction changes as one feature changes.
- **Detecting distribution shift**: noticing when new data no longer looks like the training data, with "adversarial validation".
- **Fairness checks**: comparing a model's decisions and errors across groups, including a model that is unfair without ever seeing the group.

## Permutation importance

To measure how much a model relies on a feature, break that feature and see how much the score drops. **Permutation importance** shuffles one column of the test data, which destroys its relationship with the target while keeping its distribution, and measures the fall in the score. A feature the model ignores can be shuffled harmlessly; a feature it depends on cannot. Repeating the shuffle several times gives an average and a sense of the noise.

The decision trees lesson warned that a tree's built-in **impurity importances** have a bias. Here is a demonstration: the diabetes data (10 measurements predicting disease progression a year later) plus one extra column of **pure random noise**. Before running, predict where the noise column will rank by each measure.

```python type
import numpy as np
from sklearn.datasets import load_diabetes
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split

data = load_diabetes()
noise = np.random.default_rng(0).normal(size=len(data.data))
X = np.column_stack([data.data, noise])
names = list(data.feature_names) + ["NOISE"]
X_train, X_test, y_train, y_test = train_test_split(X, data.target, test_size=0.4, random_state=1)
forest = RandomForestRegressor(n_estimators=200, random_state=0).fit(X_train, y_train)

impurity_order = np.argsort(forest.feature_importances_)[::-1]
print("impurity importance, top 5:", [names[i] for i in impurity_order[:5]])
test_result = permutation_importance(forest, X_test, y_test, n_repeats=20, random_state=0)
train_result = permutation_importance(forest, X_train, y_train, n_repeats=10, random_state=0)
for i in np.argsort(test_result.importances_mean)[::-1][:4]:
    print(f"  permutation on test data: {names[i]:<6} {test_result.importances_mean[i]:.3f} ± {test_result.importances_std[i]:.3f}")
print(f"NOISE: permutation importance on test data {test_result.importances_mean[-1]:.3f} ± {test_result.importances_std[-1]:.3f}, on training data {train_result.importances_mean[-1]:.3f}")
```

```output
impurity importance, top 5: ['bmi', 's5', 'bp', 'NOISE', 'age']
  permutation on test data: bmi    0.192 ± 0.054
  permutation on test data: s5     0.130 ± 0.044
  permutation on test data: bp     0.011 ± 0.023
  permutation on test data: s2     0.010 ± 0.007
NOISE: permutation importance on test data 0.003 ± 0.012, on training data 0.056
```

`permutation_importance` reports, for each feature, the mean and standard deviation of the drop in the model's score (R² here) over the repeated shuffles.

By impurity importance, the noise column ranks fourth, above most real measurements: random forests split on it often, because a continuous column with many distinct values offers many split points that happen to fit the training data. On the test data, permutation importance gives it about 0.003 ± 0.012, indistinguishable from zero: shuffling it costs nothing on new data, because it never carried real information. On the **training** data, though, its permutation importance is clearly positive: the forest memorised the noise there. So compute permutation importance on held-out data.

Two cautions about any importance measure. When two features are strongly correlated, shuffling one barely hurts (the model can lean on the other), so both can look unimportant even if together they matter a lot. And importance says what the **model** uses, not what causes the outcome in the world.

## Partial dependence

Importance says **how much** a feature matters; it does not say **how**. **Partial dependence** shows the shape: set a feature to a value for **every** row of the data, average the model's predictions, and repeat over a range of values. The resulting curve is the model's average prediction as that feature varies, with the other features left as they really are.

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_diabetes
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

data = load_diabetes()
X_train, X_test, y_train, y_test = train_test_split(data.data, data.target, test_size=0.4, random_state=1)
forest = RandomForestRegressor(n_estimators=200, random_state=0).fit(X_train, y_train)

bmi = list(data.feature_names).index("bmi")
grid = np.linspace(X_test[:, bmi].min(), X_test[:, bmi].max(), 15)
curve = []
for value in grid:
    altered = X_test.copy()
    altered[:, bmi] = value
    curve.append(forest.predict(altered).mean())
print("average prediction at the lowest, middle and highest BMI:", round(curve[0]), round(curve[7]), round(curve[-1]))

fig, ax = plt.subplots(figsize=(6, 3.4))
ax.plot(grid, curve, marker="o")
ax.set_xlabel("bmi (scaled, as in the dataset)")
ax.set_ylabel("average predicted progression")
plt.show()
```

```output
average prediction at the lowest, middle and highest BMI: 111 190 194
```

The dataset's features are already centred and scaled, so BMI appears as small numbers around 0. The curve rises with BMI: higher body mass index, worse predicted progression, with a forest's typical staircase shape, flat at the extremes, where there were few training examples. Partial dependence is an average, so it can hide interactions: if a feature raises predictions for some people and lowers them for others, the average may look flat. scikit-learn's `PartialDependenceDisplay` draws these curves, and with `kind="individual"` also the per-row curves, which reveal such interactions.

## When the data moves

A model is only reliable on data like its training data. When a model is deployed somewhere new, or the world changes over time, the input distribution **shifts**. Here a model is trained only on patients with below-median BMI and then used on patients with above-median BMI. Predict before running: how much worse will it do on the new patients?

```python type
import numpy as np
from sklearn.datasets import load_diabetes
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, roc_auc_score
from sklearn.model_selection import cross_val_predict

data = load_diabetes()
X, y = data.data, data.target
bmi = X[:, list(data.feature_names).index("bmi")]
lower = bmi < np.median(bmi)
X_old, y_old = X[lower], y[lower]
X_new, y_new = X[~lower], y[~lower]

model = RandomForestRegressor(n_estimators=200, random_state=0).fit(X_old[:150], y_old[:150])
print(f"error on unseen patients like the training ones: MAE {mean_absolute_error(y_old[150:], model.predict(X_old[150:])):.1f}")
print(f"error on the new, higher-BMI patients:           MAE {mean_absolute_error(y_new, model.predict(X_new)):.1f}")

combined = np.vstack([X_old[:150], X_new])
is_new = np.r_[np.zeros(150), np.ones(len(X_new))]
detector = RandomForestClassifier(n_estimators=200, random_state=0)
p_new = cross_val_predict(detector, combined, is_new, cv=5, method="predict_proba")[:, 1]
print(f"can a classifier tell old from new data? AUC {roc_auc_score(is_new, p_new):.2f}")
detector.fit(combined, is_new)
print("feature that gives the shift away:", data.feature_names[int(np.argmax(detector.feature_importances_))])
```

```output
error on unseen patients like the training ones: MAE 42.7
error on the new, higher-BMI patients:           MAE 64.9
can a classifier tell old from new data? AUC 1.00
feature that gives the shift away: bmi
```

The error rises by about half, from 42.7 to 64.9: the forest has never seen high-BMI patients, and trees cannot extrapolate beyond their training range.

The second part is a practical trick for **detecting** shift before the error shows up (often you do not yet have labels for the new data): **adversarial validation**. Label the old data 0 and the new data 1, and train a classifier to tell them apart. If it cannot (AUC near 0.5), the distributions look the same. If it can, they differ, and its feature importances say where. Here the AUC is 1.00 and BMI is the feature that gives it away, exactly the shift that was built in. In real systems, monitoring the inputs this way, and the model's error once labels arrive, is how models are kept honest after deployment.

## Fairness checks

When a model makes decisions about people, overall accuracy can hide very different treatment of different groups. Fairness has several competing definitions, and in general they cannot all hold at once, so the first step is simply to **measure**:

- **Selection rate**: the fraction of each group the model approves.
- **True positive rate** (equal opportunity): of those who deserve approval (would repay), the fraction approved, per group.
- **False positive rate** and **calibration** (do predicted probabilities mean the same thing in each group?).

A simulated lending example. Two groups have the same distribution of underlying ability to repay, but group 1 has, on average, lower recorded income, for reasons unrelated to repayment, and lives in different postcodes. The model is **never shown the group**, only income and postcode. Predict before running: will its decisions differ between the groups?

```python type
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split

rng = np.random.default_rng(0)
n = 4000
group = rng.integers(0, 2, n)
ability = rng.normal(0, 1, n)
income = ability + 0.8 * (1 - group) + rng.normal(0, 0.5, n)
postcode = group + rng.normal(0, 0.5, n)
repaid = (ability + rng.normal(0, 0.7, n) > 0).astype(int)

X = np.column_stack([income, postcode])
X_train, X_test, y_train, y_test, g_train, g_test = train_test_split(X, repaid, group, test_size=0.5, random_state=0)
model = HistGradientBoostingClassifier(random_state=0).fit(X_train, y_train)
approved = model.predict(X_test)

for g in [0, 1]:
    in_group = g_test == g
    would_repay = in_group & (y_test == 1)
    print(f"group {g}: actually repay {y_test[in_group].mean():.2f}, approved {approved[in_group].mean():.2f}, "
          f"approved among those who would repay {approved[would_repay].mean():.2f}, accuracy {(approved[in_group] == y_test[in_group]).mean():.2f}")
```

```output
group 0: actually repay 0.49, approved 0.54, approved among those who would repay 0.76, accuracy 0.71
group 1: actually repay 0.50, approved 0.46, approved among those who would repay 0.70, accuracy 0.74
```

`train_test_split` can split several arrays at once, keeping them aligned, so the group labels stay matched to their rows without the model ever using them.

The two groups repay at the same rate (0.49 and 0.50), yet group 1 is approved **less** often (0.46 against 0.54). Among people who would repay, the model approves about 76% of group 0 but only about 70% of group 1. Group 1's accuracy is even slightly higher, so an accuracy-only check would see nothing wrong. Leaving the group out did not make the model fair: income carries a group difference unrelated to repayment, and a model blind to the group cannot correct for it. (Postcode, which tracks the group, actually narrows the gap a little here, because it lets the model partly undo the income offset; trained on income alone, the gap is wider.) The reverse also happens: other features can act as **proxies** for a removed attribute and reintroduce a bias through the back door. Either way, deleting a sensitive column settles nothing; only measuring does. Fixing a gap like this involves better features (here, income adjusted for the irrelevant group difference), constraints during training, or different thresholds per group, each with trade-offs that are partly technical and partly ethical choices, which is why the first duty is to measure and report.

::: challenge Permutation importance by hand [easy]
Write `permutation_importance_by_hand(model, X, y, score, repeats, seed)` returning an array with one importance per column: for each column, shuffle it `repeats` times (each time with `rng.permutation`, from one generator `rng = np.random.default_rng(seed)` used for every column in order), compute `score(y, model.predict(shuffled))` each time, shuffling a **fresh copy** of `X` for every repeat, and record the baseline score minus the average shuffled score.

```python starter
import numpy as np

def permutation_importance_by_hand(model, X, y, score, repeats, seed):
    return np.zeros(X.shape[1])
```

```python solution
import numpy as np

def permutation_importance_by_hand(model, X, y, score, repeats, seed):
    rng = np.random.default_rng(seed)
    baseline = score(y, model.predict(X))
    importances = np.zeros(X.shape[1])
    for j in range(X.shape[1]):
        drops = []
        for _ in range(repeats):
            shuffled = X.copy()
            shuffled[:, j] = rng.permutation(shuffled[:, j])
            drops.append(baseline - score(y, model.predict(shuffled)))
        importances[j] = np.mean(drops)
    return importances
```

```python test
import numpy as _np
from sklearn.linear_model import LinearRegression as _LR
from sklearn.metrics import r2_score as _r2
assert "permutation_importance_by_hand" in dir(), "Keep the function's name as permutation_importance_by_hand."
_g = _np.random.default_rng(1)
_X = _g.normal(size=(300, 3))
_y = 3 * _X[:, 0] + 0.5 * _X[:, 1] + _g.normal(0, 0.1, 300)
_m = _LR().fit(_X, _y)
_imp = permutation_importance_by_hand(_m, _X, _y, _r2, 5, 0)
assert _np.shape(_imp) == (3,), "Return one importance per column."
assert _imp[0] > _imp[1] > abs(_imp[2]) and abs(_imp[2]) < 0.01, f"The first feature matters most, the second a little, the third not at all; got {_np.round(_imp, 3)}."
_rng = _np.random.default_rng(0); _base = _r2(_y, _m.predict(_X)); _ref = []
for _j in range(3):
    _d = []
    for _ in range(5):
        _s = _X.copy(); _s[:, _j] = _rng.permutation(_s[:, _j]); _d.append(_base - _r2(_y, _m.predict(_s)))
    _ref.append(_np.mean(_d))
assert _np.allclose(_imp, _ref), "Your importances differ from the expected values. Use one generator for all the shuffles, column by column, and shuffle a copy so the original X is untouched."
_X0 = _X.copy(); permutation_importance_by_hand(_m, _X, _y, _r2, 2, 3)
assert _np.array_equal(_X, _X0), "Don't change X itself: shuffle a copy."
"SUCCESS: Break one feature at a time and measure the damage: an importance that works for any model and any score."
```

Hint: Compute the baseline score once. For each column and each repeat, take a fresh copy of X, replace that column with `rng.permutation` of it, and record the drop in score; average the drops.
:::

::: challenge Partial dependence for two features [medium]
Interactions hide in one-feature partial dependence. Write `partial_dependence_2d(model, X, feature_a, grid_a, feature_b, grid_b)` returning a 2-D array whose entry `[i, j]` is the average prediction over all rows of `X` with column `feature_a` set to `grid_a[i]` and column `feature_b` set to `grid_b[j]`.

Then, for the starter's model of a target with a strong interaction (y = x₀ · x₁ plus noise), compute the 2-D partial dependence on features 0 and 1 over the grid `[-1, 0, 1]` for both, store it in `pd2`, and store in `pd_x0` the ordinary one-feature partial dependence of feature 0 over the same grid (averaging over the real values of feature 1).

```python starter
import numpy as np
from sklearn.ensemble import RandomForestRegressor

def partial_dependence_2d(model, X, feature_a, grid_a, feature_b, grid_b):
    return np.zeros((len(grid_a), len(grid_b)))

rng = np.random.default_rng(0)
X = rng.uniform(-1, 1, (600, 3))
y = X[:, 0] * X[:, 1] * 4 + rng.normal(0, 0.1, 600)
model = RandomForestRegressor(n_estimators=100, random_state=0).fit(X, y)
grid = np.array([-1.0, 0.0, 1.0])

pd2 = np.zeros((3, 3))
pd_x0 = np.zeros(3)
print(pd2.round(2), pd_x0.round(2))
```

```python solution
import numpy as np
from sklearn.ensemble import RandomForestRegressor

def partial_dependence_2d(model, X, feature_a, grid_a, feature_b, grid_b):
    result = np.zeros((len(grid_a), len(grid_b)))
    for i, a in enumerate(grid_a):
        for j, b in enumerate(grid_b):
            altered = X.copy()
            altered[:, feature_a] = a
            altered[:, feature_b] = b
            result[i, j] = model.predict(altered).mean()
    return result

rng = np.random.default_rng(0)
X = rng.uniform(-1, 1, (600, 3))
y = X[:, 0] * X[:, 1] * 4 + rng.normal(0, 0.1, 600)
model = RandomForestRegressor(n_estimators=100, random_state=0).fit(X, y)
grid = np.array([-1.0, 0.0, 1.0])

pd2 = partial_dependence_2d(model, X, 0, grid, 1, grid)
pd_x0 = np.array([model.predict(np.column_stack([np.full(len(X), v), X[:, 1:]])).mean() for v in grid])
print(pd2.round(2), pd_x0.round(2))
```

```python test
import numpy as _np
assert "partial_dependence_2d" in dir(), "Keep the function's name as partial_dependence_2d."
class _Lin:
    def predict(self, Z):
        return 2 * Z[:, 0] - Z[:, 1] + Z[:, 2]
_Xs = _np.array([[0.0, 0.0, 1.0], [0.0, 0.0, 3.0]])
_res = partial_dependence_2d(_Lin(), _Xs, 0, [0.0, 1.0], 1, [0.0, 2.0])
assert _np.allclose(_res, [[2.0, 0.0], [4.0, 2.0]]), f"For the model 2·x0 − x1 + x2 and rows with x2 = 1 and 3, the table should be [[2, 0], [4, 2]]; got {_np.round(_res, 3).tolist()}."
_g = _np.array([-1.0, 0.0, 1.0])
assert _np.allclose(pd2, partial_dependence_2d(model, X, 0, _g, 1, _g)), "pd2 should be your function's result for features 0 and 1 over [-1, 0, 1]."
_ref = _np.array([model.predict(_np.column_stack([_np.full(len(X), v), X[:, 1:]])).mean() for v in _g])
assert _np.allclose(pd_x0, _ref), "pd_x0 should average predictions with only feature 0 set to each grid value."
assert pd2[0, 0] > 1 and pd2[0, 2] < -1 and abs(pd_x0).max() < 0.6, "The 2-D table should show the interaction (large values of opposite signs in the corners) that the 1-D curve averages away."
f"SUCCESS: The one-feature curve for x0 is nearly flat ({_np.round(pd_x0, 2).tolist()}), as if x0 did not matter; the two-feature table reveals the truth: its effect flips sign with x1 (corners {pd2[0, 0]:.1f} and {pd2[0, 2]:.1f})."
```

Hint: Two nested loops over the grids: copy X, set both columns, predict and average. For the one-feature version, set only column 0.
:::

::: challenge A fairness report [medium]
Write `fairness_report(y_true, y_pred, group)` returning a dictionary that maps each group value (in sorted order) to a dictionary with keys `"selection_rate"` (fraction predicted 1), `"tpr"` (fraction predicted 1 among those with true label 1) and `"fpr"` (fraction predicted 1 among those with true label 0). Then write `disparate_impact(report)` returning the smallest selection rate divided by the largest (a common screening rule flags values below 0.8).

Apply both to the lesson's lending model, which the starter rebuilds, storing the results in `report` and `ratio`.

```python starter
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split

def fairness_report(y_true, y_pred, group):
    return {}

def disparate_impact(report):
    return 1.0

rng = np.random.default_rng(0)
n = 4000
group = rng.integers(0, 2, n)
ability = rng.normal(0, 1, n)
income = ability + 0.8 * (1 - group) + rng.normal(0, 0.5, n)
postcode = group + rng.normal(0, 0.5, n)
repaid = (ability + rng.normal(0, 0.7, n) > 0).astype(int)
X = np.column_stack([income, postcode])
X_train, X_test, y_train, y_test, g_train, g_test = train_test_split(X, repaid, group, test_size=0.5, random_state=0)
approved = HistGradientBoostingClassifier(random_state=0).fit(X_train, y_train).predict(X_test)

report = fairness_report(y_test, approved, g_test)
ratio = disparate_impact(report)
print(report, ratio)
```

```python solution
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split

def fairness_report(y_true, y_pred, group):
    report = {}
    for g in sorted(np.unique(group).tolist()):
        mask = group == g
        report[g] = {
            "selection_rate": float(y_pred[mask].mean()),
            "tpr": float(y_pred[mask & (y_true == 1)].mean()),
            "fpr": float(y_pred[mask & (y_true == 0)].mean()),
        }
    return report

def disparate_impact(report):
    rates = [values["selection_rate"] for values in report.values()]
    return min(rates) / max(rates)

rng = np.random.default_rng(0)
n = 4000
group = rng.integers(0, 2, n)
ability = rng.normal(0, 1, n)
income = ability + 0.8 * (1 - group) + rng.normal(0, 0.5, n)
postcode = group + rng.normal(0, 0.5, n)
repaid = (ability + rng.normal(0, 0.7, n) > 0).astype(int)
X = np.column_stack([income, postcode])
X_train, X_test, y_train, y_test, g_train, g_test = train_test_split(X, repaid, group, test_size=0.5, random_state=0)
approved = HistGradientBoostingClassifier(random_state=0).fit(X_train, y_train).predict(X_test)

report = fairness_report(y_test, approved, g_test)
ratio = disparate_impact(report)
print(report, ratio)
```

```python test
import numpy as _np
assert "fairness_report" in dir() and "disparate_impact" in dir(), "Keep both function names."
_yt = _np.array([1, 1, 0, 0, 1, 0, 1, 0])
_yp = _np.array([1, 0, 1, 0, 1, 1, 1, 1])
_g = _np.array(["a", "a", "a", "a", "b", "b", "b", "b"])
_rep = fairness_report(_yt, _yp, _g)
assert list(_rep) == ["a", "b"], "The report should have one entry per group, in sorted order."
assert _np.isclose(_rep["a"]["selection_rate"], 0.5) and _np.isclose(_rep["b"]["selection_rate"], 1.0), "Selection rates should be 0.5 for a and 1.0 for b."
assert _np.isclose(_rep["a"]["tpr"], 0.5) and _np.isclose(_rep["a"]["fpr"], 0.5), "For group a: true positive rate 1/2, false positive rate 1/2."
assert _np.isclose(_rep["b"]["tpr"], 1.0) and _np.isclose(_rep["b"]["fpr"], 1.0), "For group b: everyone approved, so both rates are 1."
assert _np.isclose(disparate_impact(_rep), 0.5), "Disparate impact is the smallest selection rate over the largest: 0.5 / 1.0."
assert set(report) == {0, 1} and ratio < 0.9, "Apply both functions to the lending model's test predictions."
f"SUCCESS: Selection-rate ratio {ratio:.2f}, true positive rates {report[0]['tpr']:.2f} versus {report[1]['tpr']:.2f}: the 0.8 screening rule would not flag this model, even though deserving applicants in group 1 are approved less often. One number is never the whole review."
```

Hint: For each group value, build a boolean mask and take means of `y_pred` over the mask, over `mask & (y_true == 1)` and over `mask & (y_true == 0)`. `sorted(np.unique(group).tolist())` gives the groups in order as plain Python values.
:::

## What you learned

- Permutation importance shuffles one feature at a time on held-out data and measures the score's drop; impurity importances can rank pure noise highly, and importance on training data rewards memorisation. Correlated features share and hide their importance.
- Partial dependence averages predictions as one feature varies; it can hide interactions that two-feature or per-row curves reveal.
- Models degrade on shifted data (MAE 42.7 → 64.9 on higher-BMI patients). Adversarial validation detects shift: if a classifier can tell old from new data, they differ, and its importances show where.
- Fairness checks compare selection rates, true and false positive rates and calibration across groups. Removing the sensitive attribute is not enough when other features act as proxies: the lending model approved fewer of a group that repaid just as often.

The final lesson puts the whole series together: a single realistic problem carried from raw data through exploration, baselines, models, tuning, checking and an honest report.
