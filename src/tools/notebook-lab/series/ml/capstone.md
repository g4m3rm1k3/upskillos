# Capstone: from data to a defensible model

This last lesson carries one realistic problem through the whole process this series has built, in the order a careful practitioner works: understand the data and the decision, find the traps, set baselines, compare models fairly, test once, turn predictions into decisions, check the model, and write an honest report.

The problem: a subscription company wants to predict which customers will cancel (**churn**) in the next three months, so it can offer them a discount. The offer costs money, so it should go to customers likely to leave, not to everyone. The data is simulated so you can rerun everything, but it contains the kinds of trouble real data does: a categorical mix, missing values, class imbalance and one column that would quietly ruin the project.

## Step 1: look at the data and the decision

Before any modelling, find out what each row and column means, how the target is distributed and what is missing. Predict before running: what fraction of customers churn, and which contract type churns most?

```python type
import numpy as np
import pandas as pd

def make_customers(n, seed):
    rng = np.random.default_rng(seed)
    contract = rng.choice(["monthly", "one_year", "two_year"], n, p=[0.55, 0.25, 0.2])
    tenure = np.round(rng.exponential(24, n)).clip(1, 72)
    charge = np.round(rng.normal(65, 20, n).clip(20, 120), 2)
    calls = rng.poisson(1.2, n)
    payment = rng.choice(["card", "bank", "cheque"], n, p=[0.45, 0.35, 0.2])
    age = rng.normal(45, 14, n).clip(18, 90).round()
    logit = (-2.3 + 1.3 * (contract == "monthly") - 0.9 * (contract == "two_year")
             - 0.035 * tenure + 0.018 * (charge - 65) + 0.45 * calls + 0.5 * (payment == "cheque")
             + 0.4 * np.maximum(calls - 3, 0) * (contract == "monthly"))
    churned = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
    offer = np.where(churned == 1, rng.random(n) < 0.7, rng.random(n) < 0.04).astype(int)
    age[rng.random(n) < 0.12] = np.nan
    return pd.DataFrame({"contract": contract, "tenure_months": tenure, "monthly_charge": charge,
                         "support_calls": calls, "payment": payment, "age": age,
                         "retention_offer": offer, "churned": churned})

customers = make_customers(5000, 0)
pd.set_option("display.width", 120)
pd.set_option("display.max_columns", None)
print(customers.head(), "\n")
print(f"churn rate: {customers['churned'].mean():.3f}")
print("fraction missing per column:", customers.isna().mean().round(3)[lambda s: s > 0].to_dict())
print("churn rate by contract:", customers.groupby("contract")["churned"].mean().round(3).to_dict())
```

```output
   contract  tenure_months  monthly_charge  support_calls payment   age  retention_offer  churned
0  one_year           72.0           42.71              1  cheque  20.0                1        0
1   monthly           63.0           79.65              1    card  48.0                0        0
2   monthly           14.0           82.91              3  cheque  43.0                1        0
3   monthly           72.0           67.54              1    card  44.0                0        0
4  two_year           29.0           45.79              1    card  37.0                0        0

churn rate: 0.183
fraction missing per column: {'age': 0.114}
churn rate by contract: {'monthly': 0.269, 'one_year': 0.096, 'two_year': 0.056}
```

`isna().mean()` gives the fraction missing in each column; the `[lambda s: s > 0]` filter keeps only columns with something missing.

About 18% of customers churn, so the classes are imbalanced: a model that always says "stays" is 82% accurate and useless. That rules out accuracy as the measure. Since the company will rank customers and target the riskiest, **ROC AUC** (how well the model ranks churners above non-churners) and **average precision** (precision across the ranking, sensitive to the rare class) fit the job. Age is missing for about 11% of customers, so the pipeline needs an imputer. Monthly contracts churn about five times as often as two-year contracts, a first sign of what the model will find.

## Step 2: hunt for leakage

Ask of every column: **would I know this at the moment I need to make the prediction?** The column `retention_offer` records whether the customer was given a retention offer. Look at how it relates to churn, and at what it does to a model's score.

```python type
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

print("churn rate by retention_offer:", customers.groupby("retention_offer")["churned"].mean().round(3).to_dict())

y = customers["churned"]
X = customers.drop(columns="churned")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
categorical = ["contract", "payment"]
numeric = ["tenure_months", "monthly_charge", "support_calls", "age"]
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)

def logistic_pipeline(numeric_columns):
    prepare = ColumnTransformer([
        ("categories", OneHotEncoder(handle_unknown="ignore"), categorical),
        ("numbers", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), numeric_columns),
    ])
    return make_pipeline(prepare, LogisticRegression(max_iter=1000))

with_leak = cross_val_score(logistic_pipeline(numeric + ["retention_offer"]), X_train, y_train, cv=cv, scoring="roc_auc")
without = cross_val_score(logistic_pipeline(numeric), X_train, y_train, cv=cv, scoring="roc_auc")
print(f"cross-validated AUC with retention_offer: {with_leak.mean():.3f}; without it: {without.mean():.3f}")
```

```output
churn rate by retention_offer: {0: 0.059, 1: 0.8}
cross-validated AUC with retention_offer: 0.924; without it: 0.773
```

The test set is split off here, before any model is compared, and it stays untouched until Step 4. All choices are made by cross-validation on the training set alone; `stratify=y` keeps the churn rate the same in both parts.

Customers who got an offer churned far more often, and including the column lifts the AUC from about 0.77 to 0.92. That is too good to be true, and it is not true: the offer is made by the retention team **after** a customer phones to cancel, so it is a consequence of churning, not a predictor available in advance. A model using it would look superb in testing and be useless in deployment, where the column is always 0 for the customers who matter. This is the leakage lesson's warning in its most common form: a feature recorded after the outcome. It is dropped from here on; the hint that gave it away was a column whose single-handed predictive power was suspiciously high, which the first challenge turns into a screening tool.

## Step 3: baselines, then models, compared fairly

Every model is compared against a baseline on the same cross-validation folds, with both measures and their spread across folds. Predict before running: will the flexible gradient-boosted model beat plain logistic regression here?

```python type
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GridSearchCV, cross_validate

trees_prepare = ColumnTransformer([
    ("categories", OneHotEncoder(handle_unknown="ignore"), categorical),
    ("numbers", "passthrough", numeric),
])
boosting = make_pipeline(trees_prepare, HistGradientBoostingClassifier(random_state=0))
tuned_boosting = GridSearchCV(
    boosting,
    {"histgradientboostingclassifier__learning_rate": [0.03, 0.1],
     "histgradientboostingclassifier__max_depth": [2, None]},
    cv=cv, scoring="roc_auc",
)
candidates = {
    "always the base rate": DummyClassifier(strategy="prior"),
    "logistic regression": logistic_pipeline(numeric),
    "gradient boosting": boosting,
    "boosting, tuned": tuned_boosting,
}
for name, model in candidates.items():
    scores = cross_validate(model, X_train, y_train, cv=cv, scoring=["roc_auc", "average_precision"])
    auc, ap = scores["test_roc_auc"], scores["test_average_precision"]
    print(f"{name:<22} AUC {auc.mean():.3f} ± {auc.std():.3f}   average precision {ap.mean():.3f} ± {ap.std():.3f}")
```

```output
always the base rate   AUC 0.500 ± 0.000   average precision 0.183 ± 0.000
logistic regression    AUC 0.773 ± 0.011   average precision 0.446 ± 0.039
gradient boosting      AUC 0.731 ± 0.023   average precision 0.385 ± 0.042
boosting, tuned        AUC 0.762 ± 0.014   average precision 0.422 ± 0.037
```

Tuning inside `cross_validate` is **nested** cross-validation: the grid search runs again inside every outer training fold, so the tuned model's score is not flattered by having chosen its settings on the data it is scored on. Histogram gradient boosting handles the missing ages itself, so its pipeline needs no imputer, and trees need no scaling.

The base rate scores AUC 0.5 and average precision equal to the churn rate, the floor any model must clear. Logistic regression reaches about 0.77 AUC. Default gradient boosting does **worse**, about 0.73, and tuning (which picks shallow trees) recovers only part of the gap. On a few thousand rows whose true relationships are mostly smooth and additive, the simple model is as good or better, and it is easier to explain, faster and more stable. The differences between the top models are about the size of their fold-to-fold spread, so the honest conclusion is that logistic regression is at least as good, and preferable for its simplicity. It is the choice.

## Step 4: test once, with uncertainty

The chosen model is fitted to the whole training set and scored, once, on the test set. A single number hides its own uncertainty, so a **bootstrap** gives a range: resample the test set with replacement many times and recompute the score.

```python type
from sklearn.metrics import average_precision_score, roc_auc_score

final_model = logistic_pipeline(numeric).fit(X_train, y_train)
p_test = final_model.predict_proba(X_test)[:, 1]
print(f"test AUC {roc_auc_score(y_test, p_test):.3f}, average precision {average_precision_score(y_test, p_test):.3f}")

rng = np.random.default_rng(0)
y_array = y_test.to_numpy()
boot = []
for _ in range(500):
    rows = rng.integers(0, len(y_array), len(y_array))
    boot.append(roc_auc_score(y_array[rows], p_test[rows]))
low, high = np.percentile(boot, [2.5, 97.5])
print(f"95% bootstrap interval for the test AUC: {low:.3f} to {high:.3f}")
```

```output
test AUC 0.780, average precision 0.445
95% bootstrap interval for the test AUC: 0.753 to 0.808
```

The test AUC, 0.78, lands close to the cross-validated 0.77, which is what a clean process should produce: nothing was tuned on the test set, so there was nothing for it to be optimistic about. The interval, roughly ±0.03, is the right way to report it: a claim of "0.78" with no range invites over-reading small differences.

## Step 5: from probabilities to a decision

The business needs a yes or no per customer, so a threshold must be chosen, and the right one comes from the **costs**, not from 0.5. Suppose an offer costs 10, and a churner who receives it stays with probability 0.4, keeping 120 of future revenue. Sending an offer to a customer with churn probability p is then worth, on average, p × 0.4 × 120 − 10 = 48p − 10, positive when p exceeds about 0.21. If the probabilities are well calibrated, that is the threshold; checking it empirically uses out-of-fold predictions on the training set, never the test set.

```python type
from sklearn.model_selection import cross_val_predict

def profit(y_true, p, threshold, value_saved=0.4 * 120, offer_cost=10):
    send = p >= threshold
    return float(np.sum(send * (y_true * value_saved - offer_cost)))

p_out_of_fold = cross_val_predict(logistic_pipeline(numeric), X_train, y_train, cv=cv, method="predict_proba")[:, 1]
thresholds = np.round(np.arange(0.05, 0.75, 0.05), 2)
train_profits = [profit(y_train.to_numpy(), p_out_of_fold, t) for t in thresholds]
best = thresholds[int(np.argmax(train_profits))]
print("profit on training customers by threshold:", dict(zip(thresholds.tolist(), np.round(train_profits).astype(int).tolist())))
print(f"chosen threshold {best}; theory says about {10 / 48:.2f}")
for label, t in [("send to everyone", 0.0), ("threshold 0.5", 0.5), (f"threshold {best}", best)]:
    print(f"on the test customers, {label:<17}: profit {profit(y_test.to_numpy(), p_test, t):6.0f}, offers sent {(p_test >= t).sum()}")
```

```output
profit on training customers by threshold: {0.05: 2416, 0.1: 6912, 0.15: 8732, 0.2: 9022, 0.25: 8876, 0.3: 7662, 0.35: 6388, 0.4: 5328, 0.45: 4480, 0.5: 3522, 0.55: 2386, 0.6: 1522, 0.65: 794, 0.7: 474}
chosen threshold 0.2; theory says about 0.21
on the test customers, send to everyone : profit  -1556, offers sent 1250
on the test customers, threshold 0.5    : profit   1328, offers sent 64
on the test customers, threshold 0.2    : profit   3148, offers sent 458
```

The `profit` function counts, for every customer sent an offer, the expected value saved if they are a churner minus the cost of the offer.

The empirical best threshold sits close to the calculated 0.21, a sign the model's probabilities are reasonably calibrated. On the test customers the chosen threshold earns clearly more than either extreme: sending to everyone wastes offers on the 82% who would have stayed, and the default 0.5 threshold is far too cautious, missing most churners worth saving. A good AUC is not the goal in itself; the decision built on the model is.

## Step 6: check what the model does

Before handing the model over, check what it relies on and whether it behaves sensibly across segments, using the tools of the previous lesson.

```python type
from sklearn.inspection import permutation_importance

result = permutation_importance(final_model, X_test, y_test, scoring="roc_auc", n_repeats=10, random_state=0)
for i in np.argsort(result.importances_mean)[::-1]:
    print(f"{X_test.columns[i]:<16} AUC drop {result.importances_mean[i]:.3f} ± {result.importances_std[i]:.3f}")

segments = pd.DataFrame({"contract": X_test["contract"], "actual": y_test, "predicted": p_test})
print(segments.groupby("contract")[["actual", "predicted"]].mean().round(3))
```

```output
contract         AUC drop 0.121 ± 0.008
tenure_months    AUC drop 0.087 ± 0.009
support_calls    AUC drop 0.036 ± 0.005
monthly_charge   AUC drop 0.019 ± 0.005
payment          AUC drop 0.006 ± 0.003
age              AUC drop 0.000 ± 0.000
retention_offer  AUC drop 0.000 ± 0.000
          actual  predicted
contract
monthly    0.263      0.278
one_year   0.107      0.090
two_year   0.055      0.054
```

`permutation_importance` works on the whole pipeline, so it shuffles the raw columns (a whole categorical column at once) rather than the one-hot pieces; `retention_offer` is still in `X_test` but the pipeline never reads it, so its importance is exactly 0.

Contract type, tenure and support calls carry most of the signal, and age and the leaked column contribute nothing, as they should. Within each contract type, the average predicted churn probability is close to the actual churn rate: the model is calibrated per segment, not only overall, which is what makes the cost-based threshold trustworthy for every kind of customer.

## Step 7: the report

The work ends with a short, honest account that someone else could check and act on:

- **Goal and decision:** rank customers by risk of churning in the next three months; send a retention offer when the predicted probability is at least about 0.2, the break-even point under the stated costs.
- **Data:** 5,000 customers, 18% churn; age missing for 11% (median-imputed). `retention_offer` was **excluded** as leakage: it is recorded after a customer asks to cancel.
- **Model:** logistic regression on contract, payment method, tenure, monthly charge, support calls and age. Gradient boosting was tried, with tuning in nested cross-validation, and did not beat it.
- **Performance:** test AUC about 0.78 with a 95% bootstrap interval of roughly ±0.03, consistent with cross-validation. Probabilities are calibrated overall and within each contract type.
- **Limits and monitoring:** trained on one period's customers; if prices, contracts or the customer mix change, performance will drift, so inputs should be monitored (adversarial validation) and the model rescored as new outcomes arrive. The offer's 40% success rate is an assumption that should be measured with a controlled trial.

::: challenge A leakage screen [easy]
Write `leakage_screen(X, y, limit)` returning a list of the names of numeric columns (in their original order) whose value **on its own** separates the classes suspiciously well: compute `roc_auc_score(y, column)` for each numeric column (skip any column with missing values), take `max(auc, 1 - auc)` so that a strongly negative relationship counts too, and include the column if that exceeds `limit`.

Apply it to the lesson's training data with `limit=0.75` and store the result in `suspects`.

```python starter
import numpy as np
from sklearn.metrics import roc_auc_score

def leakage_screen(X, y, limit):
    return []

suspects = leakage_screen(X_train, y_train, 0.75)
print(suspects)
```

```python solution
import numpy as np
from sklearn.metrics import roc_auc_score

def leakage_screen(X, y, limit):
    flagged = []
    for name in X.select_dtypes("number").columns:
        column = X[name]
        if column.isna().any():
            continue
        auc = roc_auc_score(y, column)
        if max(auc, 1 - auc) > limit:
            flagged.append(name)
    return flagged

suspects = leakage_screen(X_train, y_train, 0.75)
print(suspects)
```

```python test
import numpy as _np
import pandas as _pd
assert "leakage_screen" in dir(), "Keep the function's name as leakage_screen."
_df = _pd.DataFrame({"a": [1, 2, 3, 4, 5, 6], "word": list("xyzxyz"), "b": [6, 5, 4, 3, 2, 1], "c": [1, 2, 1, 2, 1, 2], "d": [1, _np.nan, 3, 4, 5, 6]})
_y = _np.array([0, 0, 0, 1, 1, 1])
_got = leakage_screen(_df, _y, 0.75)
assert "word" not in _got, "Only check numeric columns: `X.select_dtypes(\"number\")` selects them."
assert "d" not in _got, "Skip columns that contain missing values."
assert "b" in _got, "A column that perfectly separates the classes in reverse (AUC 0) is just as suspicious: use max(auc, 1 − auc)."
assert _got == ["a", "b"], f"Expected ['a', 'b'] in the original column order; got {_got}."
assert suspects == ["retention_offer"], f"On the churn data only retention_offer should be flagged at 0.75; got {suspects}."
"SUCCESS: The screen flags retention_offer at once. A single column that predicts this well is not proof of leakage, but it is always worth asking when that value becomes known."
```

Hint: Loop over `X.select_dtypes("number").columns`; skip a column if `X[name].isna().any()`; compute the AUC with the column's values as the scores.
:::

::: challenge The best threshold for any costs [medium]
Write `best_threshold(y_true, p, value_saved, offer_cost, candidates)` returning the candidate threshold with the highest total profit, where sending an offer to a customer (probability at least the threshold) earns `value_saved` minus `offer_cost` if they would churn and loses `offer_cost` if not. If several thresholds tie, return the smallest. Also write `break_even(value_saved, offer_cost)` returning the probability at which an offer exactly pays for itself.

Then use the lesson's out-of-fold predictions to find the best threshold when offers are expensive (`value_saved=48`, `offer_cost=25`), over the candidates `np.round(np.arange(0.05, 0.95, 0.05), 2)`, storing it in `expensive_threshold`.

```python starter
import numpy as np

def best_threshold(y_true, p, value_saved, offer_cost, candidates):
    return candidates[0]

def break_even(value_saved, offer_cost):
    return 0.5

candidates = np.round(np.arange(0.05, 0.95, 0.05), 2)
expensive_threshold = best_threshold(y_train.to_numpy(), p_out_of_fold, 48, 25, candidates)
print(expensive_threshold, break_even(48, 25))
```

```python solution
import numpy as np

def best_threshold(y_true, p, value_saved, offer_cost, candidates):
    y_true, p = np.asarray(y_true), np.asarray(p)
    profits = [np.sum((p >= t) * (y_true * value_saved - offer_cost)) for t in candidates]
    return candidates[int(np.argmax(profits))]

def break_even(value_saved, offer_cost):
    return offer_cost / value_saved

candidates = np.round(np.arange(0.05, 0.95, 0.05), 2)
expensive_threshold = best_threshold(y_train.to_numpy(), p_out_of_fold, 48, 25, candidates)
print(expensive_threshold, break_even(48, 25))
```

```python test
import numpy as _np
assert "best_threshold" in dir() and "break_even" in dir(), "Keep both function names."
_y = _np.array([1, 1, 0, 0, 1, 0])
_p = _np.array([0.9, 0.6, 0.55, 0.2, 0.3, 0.1])
_c = [0.1, 0.25, 0.5, 0.7]
assert _np.isclose(best_threshold(_y, _p, 10, 2, _c), 0.25), "With value 10 and cost 2, sending to everyone from 0.25 up earns the most (three churners for four offers)."
assert _np.isclose(best_threshold(_y, _p, 10, 9, _c), 0.7), "With cost 9, only the most certain customer is worth an offer."
assert _np.isclose(best_threshold(_np.array([1, 0]), _np.array([0.8, 0.3]), 10, 1, [0.4, 0.5, 0.6]), 0.4), "When thresholds tie, return the smallest: np.argmax returns the first maximum."
assert _np.isclose(break_even(48, 10), 10 / 48) and _np.isclose(break_even(48, 25), 25 / 48), "Break-even is where p × value_saved = offer_cost."
_ref = best_threshold(y_train.to_numpy(), p_out_of_fold, 48, 25, _np.round(_np.arange(0.05, 0.95, 0.05), 2))
assert _np.isclose(expensive_threshold, _ref) and 0.4 <= expensive_threshold <= 0.65, f"Expected a threshold near the break-even of 0.52; got {expensive_threshold}."
f"SUCCESS: With costly offers the best threshold rises to {expensive_threshold}, close to the break-even {break_even(48, 25):.2f}: calibrated probabilities let the costs set the threshold directly."
```

Hint: For each candidate, the profit is the sum of `(p >= t) * (y_true * value_saved - offer_cost)`; `np.argmax` picks the first best. Break-even solves p × value_saved = offer_cost.
:::

::: challenge Is the difference real? [medium]
Two models' test AUCs differ by a little; is that more than noise? Write `paired_bootstrap_auc(y, p_a, p_b, n_boot, seed)` that, using `rng = np.random.default_rng(seed)`, draws `n_boot` resamples of the test rows (with `rng.integers(0, n, n)`), computes AUC(a) − AUC(b) on each, and returns a tuple `(mean_difference, low, high)` where `low` and `high` are the 2.5th and 97.5th percentiles of the differences. **Paired** means both models are scored on the same resampled rows each time.

Then compare the lesson's final logistic model (`p_test`) with a default gradient-boosting pipeline fitted on the training set (`boosting` from Step 3), with 300 resamples and seed 0. Store the tuple in `comparison`.

```python starter
import numpy as np
from sklearn.metrics import roc_auc_score

def paired_bootstrap_auc(y, p_a, p_b, n_boot, seed):
    return 0.0, 0.0, 0.0

p_boost = boosting.fit(X_train, y_train).predict_proba(X_test)[:, 1]
comparison = paired_bootstrap_auc(y_test.to_numpy(), p_test, p_boost, 300, 0)
print(comparison)
```

```python solution
import numpy as np
from sklearn.metrics import roc_auc_score

def paired_bootstrap_auc(y, p_a, p_b, n_boot, seed):
    y, p_a, p_b = np.asarray(y), np.asarray(p_a), np.asarray(p_b)
    rng = np.random.default_rng(seed)
    n = len(y)
    differences = []
    for _ in range(n_boot):
        rows = rng.integers(0, n, n)
        differences.append(roc_auc_score(y[rows], p_a[rows]) - roc_auc_score(y[rows], p_b[rows]))
    low, high = np.percentile(differences, [2.5, 97.5])
    return float(np.mean(differences)), float(low), float(high)

p_boost = boosting.fit(X_train, y_train).predict_proba(X_test)[:, 1]
comparison = paired_bootstrap_auc(y_test.to_numpy(), p_test, p_boost, 300, 0)
print(comparison)
```

```python test
import numpy as _np
from sklearn.metrics import roc_auc_score as _auc
assert "paired_bootstrap_auc" in dir(), "Keep the function's name as paired_bootstrap_auc."
_g = _np.random.default_rng(5)
_y = _g.integers(0, 2, 400)
_pa = _y + _g.normal(0, 0.8, 400)
_pb = _y + _g.normal(0, 1.6, 400)
_res = paired_bootstrap_auc(_y, _pa, _pb, 200, 1)
assert len(_res) == 3, "Return a tuple (mean_difference, low, high)."
_rng = _np.random.default_rng(1); _d = []
for _ in range(200):
    _r = _rng.integers(0, 400, 400); _d.append(_auc(_y[_r], _pa[_r]) - _auc(_y[_r], _pb[_r]))
assert _np.allclose(_res, (_np.mean(_d), *_np.percentile(_d, [2.5, 97.5]))), "Your numbers differ from the expected ones. Draw each resample with rng.integers(0, n, n) and score both models on the same rows."
assert _res[1] > 0, "The clearly better model's interval should lie above 0."
_same = paired_bootstrap_auc(_y, _pa, _pa, 20, 0)
assert _np.allclose(_same, 0), "A model compared with itself should give exactly 0 difference."
_m, _lo, _hi = comparison
assert _np.isclose(_m, roc_auc_score(y_test, p_test) - roc_auc_score(y_test, p_boost), atol=0.02), "comparison should compare p_test (logistic) with the boosting pipeline's test probabilities."
f"SUCCESS: Logistic minus boosting: {_m:+.3f}, 95% interval {_lo:+.3f} to {_hi:+.3f}. " + ("The interval excludes 0, so on this test set the logistic model is genuinely better." if _lo > 0 else "The interval includes 0, so this test set cannot separate the two models.")
```

Hint: Convert the inputs with `np.asarray`, draw `rows` once per resample and use it for both models; `np.percentile(differences, [2.5, 97.5])` gives the interval.
:::

## What you learned

- Start from the decision: it chooses the measure (ranking quality and precision on the rare class here, not accuracy) and, through the costs, the threshold.
- Hunt leakage by asking when each value becomes known; a column that predicts suspiciously well on its own is the usual giveaway.
- Hold out the test set first, compare every model against a baseline on the same folds with spreads, and tune inside nested cross-validation. Simpler models often win on modest tabular data.
- Test once, report an interval, check importances and per-segment calibration, and write down the exclusions, assumptions and monitoring plan.

That completes the machine learning series: from a straight line fitted by hand, through classical models, unsupervised learning, neural networks, sequence models and reinforcement learning, to a full project done carefully. The habits in this last lesson (honest validation, baselines, uncertainty and checking) matter more than any single algorithm.
