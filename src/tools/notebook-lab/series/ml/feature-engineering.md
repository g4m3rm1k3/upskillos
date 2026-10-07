# Feature engineering

A model can only use what its features make visible. Give a linear model the hour of the day as a single number from 0 to 23, and it can only learn "more rides later in the day" or "fewer": a straight line. It cannot learn "a peak at 8 in the morning and another at half past five", however much data it sees. Give it the same information in a different form, and the same model, unchanged, captures the peaks almost perfectly.

**Feature engineering** is the craft of turning raw columns into features a model can use: encoding categories, representing time, transforming skewed numbers, combining columns, and making missing values informative. It is often the single most effective way to improve a model, more than switching algorithms. This lesson works through one realistic dataset, where better features take a linear model from an R² of 0.21 to 0.92, past a boosted tree ensemble, and then looks at missing values and category encodings that can quietly leak.

## The data: bike rentals

A city bike-hire scheme records how many bikes are hired in each hour. (The data here is simulated, but shaped like real bike-hire data.) On working days there are two commuter peaks; at weekends there is one broad afternoon hump; warm weather brings more riders.

```python type
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
n = 2000
hour = rng.integers(0, 24, n)
weekday = rng.integers(0, 7, n)
temp = rng.normal(15, 7, n).round(1)
workday = weekday < 5
commute = np.exp(-((hour - 8) ** 2) / 2) * 180 + np.exp(-((hour - 17.5) ** 2) / 3) * 220
leisure = np.exp(-((hour - 14) ** 2) / 10) * 150
rides = np.where(workday, commute + 40 * np.exp(-((hour - 13) ** 2) / 8), leisure)
rides = np.clip(rides + 4 * np.clip(temp, 0, 30) + rng.normal(0, 20, n) + 20, 0, None).round(0)
bikes = pd.DataFrame({"hour": hour, "weekday": weekday, "temp": temp, "rides": rides})
print(bikes.head())

fig, ax = plt.subplots(figsize=(6, 3.5))
for is_workday, label in [(True, "Monday to Friday"), (False, "weekend")]:
    rows = bikes[(bikes.weekday < 5) == is_workday]
    ax.plot(rows.groupby("hour")["rides"].mean(), marker="o", label=label)
ax.set_xlabel("hour of day")
ax.set_ylabel("average rides")
ax.legend()
plt.show()
```

```output
   hour  weekday  temp  rides
0    20        5  25.8   98.0
1    15        0   7.7  119.0
2    12        3  10.4   76.0
3     6        5  10.2   71.0
4     7        5  20.5  133.0
```

`weekday` runs from 0 (Monday) to 6 (Sunday). The plot shows the pattern a good model must capture: two sharp peaks on working days, one gentle hump at weekends.

## Raw features: a straight line through peaks

Start with the obvious model: ridge regression on the three raw columns, scored by 5-fold cross-validation. `KFold(5, shuffle=True, random_state=0)` makes the folds random but repeatable, and every model below uses the same folds, so their scores are directly comparable.

```python type
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(0)
n = 2000
hour = rng.integers(0, 24, n)
weekday = rng.integers(0, 7, n)
temp = rng.normal(15, 7, n).round(1)
workday = weekday < 5
commute = np.exp(-((hour - 8) ** 2) / 2) * 180 + np.exp(-((hour - 17.5) ** 2) / 3) * 220
leisure = np.exp(-((hour - 14) ** 2) / 10) * 150
rides = np.where(workday, commute + 40 * np.exp(-((hour - 13) ** 2) / 8), leisure)
rides = np.clip(rides + 4 * np.clip(temp, 0, 30) + rng.normal(0, 20, n) + 20, 0, None).round(0)
bikes = pd.DataFrame({"hour": hour, "weekday": weekday, "temp": temp, "rides": rides})
X, y = bikes.drop(columns="rides"), bikes["rides"]
folds = KFold(5, shuffle=True, random_state=0)

raw = cross_val_score(make_pipeline(StandardScaler(), Ridge()), X, y, cv=folds).mean()
print(f"raw hour, weekday, temp: R² {raw:.3f}")

angle = 2 * np.pi * X["hour"] / 24
X_circle = X.assign(hour_sin=np.sin(angle), hour_cos=np.cos(angle)).drop(columns="hour")
circle = cross_val_score(make_pipeline(StandardScaler(), Ridge()), X_circle, y, cv=folds).mean()
print(f"hour as a point on a clock face: R² {circle:.3f}")
```

```output
raw hour, weekday, temp: R² 0.209
hour as a point on a clock face: R² 0.410
```

An R² of 0.21: the raw model explains very little, because the effect of the hour is nothing like a straight line.

The second model represents the hour as a point on a **circle**. Hour 23 and hour 0 are one hour apart, but as numbers they are 23 apart, which tells the model they are as different as possible. Mapping each hour to an angle and taking its sine and cosine puts the 24 hours around a clock face, so 23 and 0 sit next to each other. This **cyclical encoding** is the standard treatment for anything that wraps around: hours, days of the week, months, compass directions. It nearly doubles R², to 0.41. But a sine and a cosine can only make one smooth bump per day, and the data has two sharp peaks.

## Hours as categories

The most flexible option is to treat each hour as a **category**: one-hot encode it into 24 columns, so the model learns a separate level for each hour, with no assumption about shape at all. Predict before running: how much better than the clock face will this do?

```python type
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder

rng = np.random.default_rng(0)
n = 2000
hour = rng.integers(0, 24, n)
weekday = rng.integers(0, 7, n)
temp = rng.normal(15, 7, n).round(1)
workday = weekday < 5
commute = np.exp(-((hour - 8) ** 2) / 2) * 180 + np.exp(-((hour - 17.5) ** 2) / 3) * 220
leisure = np.exp(-((hour - 14) ** 2) / 10) * 150
rides = np.where(workday, commute + 40 * np.exp(-((hour - 13) ** 2) / 8), leisure)
rides = np.clip(rides + 4 * np.clip(temp, 0, 30) + rng.normal(0, 20, n) + 20, 0, None).round(0)
bikes = pd.DataFrame({"hour": hour, "weekday": weekday, "temp": temp, "rides": rides})
X, y = bikes.drop(columns="rides"), bikes["rides"]
folds = KFold(5, shuffle=True, random_state=0)

def score(model, data):
    return cross_val_score(model, data, y, cv=folds).mean()

one_hot_hour = ColumnTransformer([("hour", OneHotEncoder(), ["hour"]), ("rest", "passthrough", ["weekday", "temp"])])
print(f"one-hot hour:                {score(make_pipeline(one_hot_hour, Ridge()), X):.3f}")

X_work = X.assign(workday=(X["weekday"] < 5).astype(int))
X_both = X_work.assign(hour_and_day=X_work["hour"].astype(str) + "_" + X_work["workday"].astype(str))
combined = ColumnTransformer([("hour_and_day", OneHotEncoder(), ["hour_and_day"]), ("rest", "passthrough", ["temp"])])
print(f"one-hot (hour, workday) pair: {score(make_pipeline(combined, Ridge()), X_both):.3f}")

print(f"boosted trees on raw columns: {score(HistGradientBoostingRegressor(random_state=0), X):.3f}")
```

```output
one-hot hour:                0.677
one-hot (hour, workday) pair: 0.918
boosted trees on raw columns: 0.902
```

`"passthrough"` in a `ColumnTransformer` passes those columns on unchanged. One-hot hours lift R² to 0.68. Yet that model still predicts the **same** daily shape every day, shifted up or down; it cannot know that 8 a.m. on a Tuesday and 8 a.m. on a Sunday are completely different.

That is an **interaction**: the effect of one feature (hour) depends on another (working day or not). A linear model cannot discover interactions on its own; you have to build them as features. Here the interaction is built by combining the two columns into a single category, such as `"8_1"` (8 a.m. on a working day) or `"8_0"` (8 a.m. at the weekend), and one-hot encoding that: 48 columns, one per (hour, day type) pair. With it, plain ridge regression reaches **0.92**.

For comparison, boosted trees on the raw columns score 0.90. Trees find interactions and non-linear shapes by themselves, which is a large part of their appeal. But the engineered linear model matches them, trains instantly, and its 48 weights can be read directly: each says how far this hour, on this kind of day, sits above or below the average, before the temperature effect is added. (In fairness to the trees: this data was simulated with exactly this structure, so the right feature was easy to know. On real data you discover such features by exploring, as in the plot above.) When you understand the data, a few good features can be worth more than a more powerful algorithm.

## More transformations worth knowing

- **Logarithms for skewed numbers.** Incomes, prices, populations and counts often have a long right tail: most values modest, a few huge. Taking `np.log1p(x)` compresses the tail, so a few extreme values stop dominating a linear model, and multiplicative effects ("10% more") become additive ones. The same often helps the **target**: model the log of a price, then exponentiate the prediction.
- **Ratios and differences.** Domain knowledge suggests combinations: debt divided by income, price per square metre, time since the last purchase. A model given debt and income separately has to work out the ratio for itself; a linear model cannot.
- **Binning.** Cutting a number into ranges (age 18–25, 26–40, …) with `KBinsDiscretizer` or `pd.cut` lets a linear model fit a step-shaped effect. It throws information away, so use it when the effect really is step-like.
- **Polynomial features.** The overfitting lesson built powers of `x` by hand to fit curves. scikit-learn's `PolynomialFeatures` does this for every feature, adding squares and also products of pairs of features, which are interactions too. They multiply quickly: with 20 features, degree 2 already means 230 columns.

Trees need little of this, since they are unaffected by monotonic transformations like logs and find interactions through their splits. For linear models, neural networks and distance-based methods, feature engineering matters a great deal.

## When missingness is information

The last lesson filled missing values with the median. That hides something: **why** the value is missing. Sometimes it is random: a sensor glitched. Often it is not. Applicants who leave the income field blank on a loan form may be the ones with something to hide. Then the fact that a value is missing is itself a strong predictor, and imputing erases it.

The fix is to keep a **missing indicator**: a 0/1 column saying "this was missing", alongside the imputed value. `SimpleImputer(add_indicator=True)` adds those columns automatically. Guess before running: how much can one extra 0/1 column be worth?

```python type
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(2)
m = 500
income = rng.normal(40, 12, m)
debt = rng.normal(10, 4, m)
defaulted = (0.08 * debt - 0.05 * income + rng.normal(0, 0.6, m) > -1.2).astype(int)
reported_income = income.copy()
hidden = ((defaulted == 1) & (rng.random(m) < 0.6)) | (rng.random(m) < 0.05)
reported_income[hidden] = np.nan
loans = pd.DataFrame({"income": reported_income, "debt": debt})

missing = loans["income"].isna()
print(f"income missing for {missing.mean():.0%} of applicants")
print(f"default rate when income is missing: {defaulted[missing].mean():.2f}, when reported: {defaulted[~missing].mean():.2f}")

for flag in [False, True]:
    model = make_pipeline(SimpleImputer(strategy="median", add_indicator=flag), StandardScaler(), LogisticRegression())
    accuracy = cross_val_score(model, loans, defaulted, cv=5).mean()
    print(f"add_indicator={flag}: accuracy {accuracy:.3f}")
```

```output
income missing for 32% of applicants
default rate when income is missing: 0.96, when reported: 0.27
add_indicator=False: accuracy 0.686
add_indicator=True: accuracy 0.864
```

In this simulated data, applicants who went on to default often left their income blank: the default rate is 0.96 among the missing and 0.27 among the rest. Median imputation turns every blank into an ordinary-looking income, and the model scores 0.69. With the indicator, the model can use "left it blank" directly, and accuracy jumps to 0.86.

## Encoding categories with many values

One-hot encoding works well for a handful of categories. With thousands (postcodes, product codes, user IDs) it creates thousands of sparse columns. A popular alternative is **target encoding**: replace each category by the **average target** for that category, so each postcode becomes "the average house price in this postcode".

It is powerful and dangerous. If a category's average is computed using an example's own target, that example's answer leaks into its feature, and categories with only one or two examples get a feature that simply **is** their target. Two safeguards are essential:

- Compute the averages on **training data only** (inside the pipeline, or per cross-validation fold), as with every learned step.
- **Smooth** the averages towards the overall mean, so that rare categories, whose averages are noisy, are pulled towards the global average: with `n` examples in a category and a smoothing strength `m`, use (n × category mean + m × global mean) / (n + m).

scikit-learn's `TargetEncoder` does both. For the training data it also uses **cross-fitting**: each training row is encoded with averages computed from the other folds, so no row ever sees its own target. You will write the smoothed version yourself in the last challenge.

::: challenge Around the clock [easy]
Write `cyclical(values, period)` that returns a 2-D array with two columns, the sine and cosine of `2π × values / period`. Then use it to encode the hours 0 to 23 (`np.arange(24)`, period 24), storing the result in `encoded`, and store the straight-line distance between the encodings of hour 23 and hour 0 in `gap_23_0`, and between hour 12 and hour 0 in `gap_12_0`.

```python starter
import numpy as np

def cyclical(values, period):
    return np.column_stack([values, values])

encoded = cyclical(np.arange(24), 24)
gap_23_0 = 0.0
gap_12_0 = 0.0
print(gap_23_0, gap_12_0)
```

```python solution
import numpy as np

def cyclical(values, period):
    angle = 2 * np.pi * np.asarray(values) / period
    return np.column_stack([np.sin(angle), np.cos(angle)])

encoded = cyclical(np.arange(24), 24)
gap_23_0 = float(np.linalg.norm(encoded[23] - encoded[0]))
gap_12_0 = float(np.linalg.norm(encoded[12] - encoded[0]))
print(gap_23_0, gap_12_0)
```

```python test
import numpy as _np
assert "cyclical" in dir(), "Keep the function's name as cyclical."
_e = cyclical(_np.arange(24), 24)
assert _np.shape(_e) == (24, 2), f"cyclical should return one row per value and two columns, shape (24, 2), not {_np.shape(_e)}."
assert _np.allclose(_e[0], [0, 1]) and _np.allclose(_e[6], [1, 0]), "Hour 0 should map to (sin 0, cos 0) = (0, 1), and hour 6 to (1, 0): put the sine first."
assert _np.allclose(cyclical(_np.array([0, 7]), 7), cyclical(_np.array([7, 14]), 7)), "Values one full period apart should get identical encodings."
assert _np.allclose((cyclical(_np.arange(12), 12) ** 2).sum(axis=1), 1), "Every encoded value should lie on the unit circle."
_g1 = _np.linalg.norm(_e[23] - _e[0])
_g2 = _np.linalg.norm(_e[12] - _e[0])
assert _np.isclose(gap_23_0, _g1) and _np.isclose(gap_12_0, _g2), f"gap_23_0 should be about {_g1:.3f} and gap_12_0 exactly 2."
"SUCCESS: On the clock face, 11 p.m. and midnight are neighbours (0.26 apart) and noon is as far from midnight as possible (2.0)."
```

Hint: Convert to an angle with `2 * np.pi * values / period`, then stack `np.sin(angle)` and `np.cos(angle)` as columns. `np.linalg.norm(a - b)` is the distance between two points.
:::

::: challenge Flag the gaps [medium]
Write `add_missing_flags(df, columns)` that returns a **new** DataFrame (leave the original unchanged) with, for each listed column in turn, an extra column added at the end named `<column>_missing` holding 1 where that column is missing and 0 elsewhere (as integers), and with the missing values themselves filled with that column's median.

Then apply it to the starter's loan table for the `income` column, store the result in `flagged`, and store the 5-fold cross-validated accuracy of `make_pipeline(StandardScaler(), LogisticRegression())` on `flagged` in `accuracy`.

```python starter
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

def add_missing_flags(df, columns):
    return df

rng = np.random.default_rng(2)
m = 500
income = rng.normal(40, 12, m)
debt = rng.normal(10, 4, m)
defaulted = (0.08 * debt - 0.05 * income + rng.normal(0, 0.6, m) > -1.2).astype(int)
reported_income = income.copy()
hidden = ((defaulted == 1) & (rng.random(m) < 0.6)) | (rng.random(m) < 0.05)
reported_income[hidden] = np.nan
loans = pd.DataFrame({"income": reported_income, "debt": debt})

flagged = None
accuracy = 0.0
print(accuracy)
```

```python solution
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

def add_missing_flags(df, columns):
    result = df.copy()
    for column in columns:
        result[column + "_missing"] = result[column].isna().astype(int)
        result[column] = result[column].fillna(result[column].median())
    return result

rng = np.random.default_rng(2)
m = 500
income = rng.normal(40, 12, m)
debt = rng.normal(10, 4, m)
defaulted = (0.08 * debt - 0.05 * income + rng.normal(0, 0.6, m) > -1.2).astype(int)
reported_income = income.copy()
hidden = ((defaulted == 1) & (rng.random(m) < 0.6)) | (rng.random(m) < 0.05)
reported_income[hidden] = np.nan
loans = pd.DataFrame({"income": reported_income, "debt": debt})

flagged = add_missing_flags(loans, ["income"])
accuracy = cross_val_score(make_pipeline(StandardScaler(), LogisticRegression()), flagged, defaulted, cv=5).mean()
print(accuracy)
```

```python test
import numpy as _np
import pandas as _pd
assert "add_missing_flags" in dir(), "Keep the function's name as add_missing_flags."
_df = _pd.DataFrame({"a": [1.0, _np.nan, 3.0, 10.0], "b": [_np.nan, 2.0, 2.0, 4.0], "c": ["x", "y", "z", "w"]})
_before = _df.copy()
_out = add_missing_flags(_df, ["a", "b"])
assert _df.equals(_before), "add_missing_flags changed the original DataFrame. Work on df.copy()."
assert list(_out.columns) == ["a", "b", "c", "a_missing", "b_missing"], f"The result should keep the original columns and add a_missing and b_missing at the end, but its columns are {list(_out.columns)}."
assert list(_out["a_missing"]) == [0, 1, 0, 0] and list(_out["b_missing"]) == [1, 0, 0, 0], "Each flag should be 1 exactly where that column was missing."
assert str(_out["a_missing"].dtype).startswith("int"), "The flags should be integers (use .astype(int))."
assert _np.isclose(_out.loc[1, "a"], 3.0) and _np.isclose(_out.loc[0, "b"], 2.0), "Missing values should be filled with the column's median (3.0 for a, 2.0 for b), computed from the values that are present."
assert flagged is not None and "income_missing" in flagged.columns and not flagged["income"].isna().any(), "flagged should be the loan table with an income_missing column and no remaining gaps."
assert 0.84 < accuracy < 0.9, f"accuracy should be about 0.86, but it is {accuracy:.3f}."
"SUCCESS: The flag lets the model use the most telling fact in the table: who left the income blank. (In a real project the medians belong inside the pipeline, learned on each training fold, as SimpleImputer(add_indicator=True) does.)"
```

Hint: Start with `result = df.copy()`. For each column, `result[column].isna().astype(int)` makes the flag, which must be computed **before** `fillna(result[column].median())` fills the gaps.
:::

::: challenge Smoothed target encoding [medium]
Write `target_encode(train_categories, train_y, new_categories, m)` that returns an array with one encoded value for each entry of `new_categories`, computed **from the training data only**:

- for a category seen in training with `n` examples and mean target `c`, the value is (n × c + m × g) / (n + m), where `g` is the mean of all of `train_y`;
- for a category never seen in training, the value is `g`.

The inputs are lists or arrays of the same length. Then, for the starter's data, encode the training categories themselves with `m=0` and with `m=10`, and store the correlation (`np.corrcoef`) between each encoding and the training target in `corr_m0` and `corr_m10`.

```python starter
import numpy as np

def target_encode(train_categories, train_y, new_categories, m):
    return np.zeros(len(new_categories))

rng = np.random.default_rng(5)
codes = np.array([f"P{i}" for i in range(150)])
train_categories = rng.choice(codes, 300)
train_y = rng.normal(0, 1, 300)

corr_m0 = 0.0
corr_m10 = 0.0
print(corr_m0, corr_m10)
```

```python solution
import numpy as np

def target_encode(train_categories, train_y, new_categories, m):
    train_categories = np.asarray(train_categories)
    train_y = np.asarray(train_y, dtype=float)
    g = train_y.mean()
    encoding = {}
    for category in np.unique(train_categories):
        values = train_y[train_categories == category]
        encoding[category] = (len(values) * values.mean() + m * g) / (len(values) + m)
    return np.array([encoding.get(category, g) for category in new_categories])

rng = np.random.default_rng(5)
codes = np.array([f"P{i}" for i in range(150)])
train_categories = rng.choice(codes, 300)
train_y = rng.normal(0, 1, 300)

corr_m0 = np.corrcoef(target_encode(train_categories, train_y, train_categories, 0), train_y)[0, 1]
corr_m10 = np.corrcoef(target_encode(train_categories, train_y, train_categories, 10), train_y)[0, 1]
print(corr_m0, corr_m10)
```

```python test
import numpy as _np
assert "target_encode" in dir(), "Keep the function's name as target_encode."
_cats = ["a", "a", "b", "c", "c", "c"]
_y = [1.0, 3.0, 10.0, 0.0, 0.0, 3.0]
_g = _np.mean(_y)
_got = target_encode(_cats, _y, ["a", "b", "c", "z"], 0)
assert _np.allclose(_got, [2.0, 10.0, 1.0, _g]), f"With m = 0, each category gets its plain mean (a: 2, b: 10, c: 1) and an unseen category gets the overall mean {_g:.3f}; got {_np.round(_got, 3)}."
_got = target_encode(_cats, _y, ["a", "b", "c"], 2)
_want = [(2 * 2 + 2 * _g) / 4, (1 * 10 + 2 * _g) / 3, (3 * 1 + 2 * _g) / 5]
assert _np.allclose(_got, _want), f"With m = 2, each mean should be pulled towards the overall mean: (n × mean + m × g) / (n + m), giving {_np.round(_want, 3)}; got {_np.round(_got, 3)}."
assert _np.allclose(target_encode(_np.array(_cats), _np.array(_y), _np.array(["b"]), 1000), _g, atol=0.02), "With a huge m, every category should be pulled almost all the way to the overall mean."
_r = _np.random.default_rng(5)
_codes = _np.array([f"P{i}" for i in range(150)])
_tc = _r.choice(_codes, 300)
_ty = _r.normal(0, 1, 300)
_c0 = _np.corrcoef(target_encode(_tc, _ty, _tc, 0), _ty)[0, 1]
_c10 = _np.corrcoef(target_encode(_tc, _ty, _tc, 10), _ty)[0, 1]
assert _np.isclose(corr_m0, _c0) and _np.isclose(corr_m10, _c10), f"corr_m0 should be {_c0:.3f} and corr_m10 {_c10:.3f}."
f"SUCCESS: The target here is pure noise, yet the unsmoothed encoding of the training data correlates {_c0:.2f} with it: with about two examples per category, each example's own answer is baked into its feature. Smoothing cuts that to {_c10:.2f}. That is target leakage, and why the encoding must be learned on separate data."
```

Hint: Compute `g` first. For each distinct training category, select its targets with a boolean mask, apply the formula, and store it in a dictionary; then look up each new category with `dictionary.get(category, g)`.
:::

## What you learned

- Features decide what a model can see. On the bike data, ridge regression went from R² 0.21 (raw hour) to 0.41 (cyclical), 0.68 (one-hot hour) and 0.92 (hour × working-day interaction), past boosted trees on raw columns (0.90).
- Cyclical features (sine and cosine of 2π × value / period) keep wrap-around quantities like hours and months next to their neighbours.
- One-hot encoding lets a linear model learn any shape over a category; combining two categories into one captures their interaction, which linear models cannot find alone.
- Logs tame skewed values; ratios and differences encode domain knowledge; binning makes steps; polynomial features add curves and products.
- When missingness is informative, keep a missing indicator (`SimpleImputer(add_indicator=True)`): on the loan data it lifted accuracy from 0.69 to 0.86.
- Target encoding replaces a category by its average target; compute it on training data only and smooth it towards the global mean, or it leaks the answer.

Target encoding was a first glimpse of a wider danger: information that reaches a model during training but would never be available when it is used. The next lesson hunts down data leakage in all its forms, and deals with a second common trap, classes so imbalanced that accuracy becomes meaningless.
