# Exploring a dataset

Before building any model, you need to understand the data. What does each column mean, and in what units? Is anything missing or impossible? Which values are typical and which unusual? Which features seem related to the thing you want to predict? This first investigation is called **exploratory data analysis** (EDA), and skipping it is the most common way machine learning projects go wrong: a model trained on data you do not understand will faithfully learn its errors and its quirks.

This lesson walks through a complete exploratory analysis of a real medical dataset, using everything from the previous lessons: pandas to inspect and summarise, NumPy for calculations, matplotlib for plots, and the statistics of correlation and spread. Treat it as a template: the same sequence of steps works on almost any tabular dataset.

## Start with a question

Exploration goes best with a question to guide it. The dataset here comes from a study of 442 diabetes patients. For each, it records ten measurements taken at the start of the study, and a number measuring how far the disease had progressed one year later. The question: **which of the starting measurements are related to how the disease progresses, and how strongly?** That is exactly the question a model would later try to answer precisely, so the exploration also tells you what to expect from it.

## Loading and first look

The dataset comes with scikit-learn, so it needs no download. `as_frame=True` returns it as pandas objects, and `scaled=False` keeps the original units rather than a pre-standardised version.

```python type
import pandas as pd
from sklearn.datasets import load_diabetes

data = load_diabetes(as_frame=True, scaled=False)
df = data.frame
print(df.shape)
df.head()
```

```output
(442, 11)
    age  sex   bmi     bp     s1     s2    s3   s4      s5    s6  target
0  59.0  2.0  32.1  101.0  157.0   93.2  38.0  4.0  4.8598  87.0   151.0
1  48.0  1.0  21.6   87.0  183.0  103.2  70.0  3.0  3.8918  69.0    75.0
2  72.0  2.0  30.5   93.0  156.0   93.6  41.0  4.0  4.6728  85.0   141.0
3  24.0  1.0  25.3   84.0  198.0  131.4  40.0  5.0  4.8903  89.0   206.0
4  50.0  1.0  23.0  101.0  192.0  125.4  52.0  4.0  4.2905  80.0   135.0
```

442 patients and 11 columns: ten measurements and the `target`. Every dataset should come with a description of its columns; this one's is in `data.DESCR`. The columns are age (years), sex (recorded as 1 or 2), bmi (body mass index), bp (average blood pressure), six blood measurements, and the target: a measure of disease progression after one year, where higher means worse. The blood measurements are `s1` total cholesterol, `s2` LDL ("bad") cholesterol, `s3` HDL ("good") cholesterol, `s4` total cholesterol divided by HDL, `s5` a measure of blood fats (the logarithm of the triglyceride level), and `s6` blood sugar.

```python type
df.info()
```

```output
<class 'pandas.core.frame.DataFrame'>
RangeIndex: 442 entries, 0 to 441
Data columns (total 11 columns):
 #   Column  Non-Null Count  Dtype
---  ------  --------------  -----
 0   age     442 non-null    float64
 1   sex     442 non-null    float64
 2   bmi     442 non-null    float64
 3   bp      442 non-null    float64
 4   s1      442 non-null    float64
 5   s2      442 non-null    float64
 6   s3      442 non-null    float64
 7   s4      442 non-null    float64
 8   s5      442 non-null    float64
 9   s6      442 non-null    float64
 10  target  442 non-null    float64
dtypes: float64(11)
memory usage: 38.1 KB
```

Every column is numeric and there are no missing values, which is unusually tidy for real data. Next, the summary statistics:

```python type
df.describe().round(1)
```

```output
         age    sex    bmi     bp     s1  ...     s3     s4     s5     s6  target
count  442.0  442.0  442.0  442.0  442.0  ...  442.0  442.0  442.0  442.0   442.0
mean    48.5    1.5   26.4   94.6  189.1  ...   49.8    4.1    4.6   91.3   152.1
std     13.1    0.5    4.4   13.8   34.6  ...   12.9    1.3    0.5   11.5    77.1
min     19.0    1.0   18.0   62.0   97.0  ...   22.0    2.0    3.3   58.0    25.0
25%     38.2    1.0   23.2   84.0  164.2  ...   40.2    3.0    4.3   83.2    87.0
50%     50.0    1.0   25.7   93.0  186.0  ...   48.0    4.0    4.6   91.0   140.5
75%     59.0    2.0   29.3  105.0  209.8  ...   57.8    5.0    5.0   98.0   211.5
max     79.0    2.0   42.2  133.0  301.0  ...   99.0    9.1    6.1  124.0   346.0

[8 rows x 11 columns]
```

Read this table column by column, looking for anything surprising. Ages run from 19 to 79, a plausible adult range. BMI runs from about 18 to 42. Sex takes only the values 1 and 2, so it is really a **category** stored as a number, and its mean (1.5) means little on its own. The target runs from 25 to 346, with a median of 140.5, a little below its mean of 152, which hints that it is skewed towards high values. No column has an impossible minimum or maximum, such as a negative blood pressure.

## One column at a time

Next, look at the distribution of each variable, starting with the one you want to predict:

```python type
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame

fig, axes = plt.subplots(1, 3, figsize=(12, 3.2))
for ax, column in zip(axes, ["target", "bmi", "age"]):
    ax.hist(df[column], bins=25, edgecolor="white")
    ax.set_title(column)
plt.show()
```

The target is **right-skewed**: many patients with moderate progression, and a tail of patients with much higher values. BMI is roughly bell-shaped, slightly skewed. Age is spread fairly broadly. Nothing here is alarming, but the skew in the target is worth remembering: a model that makes large errors on the high values will be penalised heavily by squared error.

For a category like sex, count instead of plotting a histogram:

```python type
print(df["sex"].value_counts())
```

```output
sex
1.0    235
2.0    207
Name: count, dtype: int64
```

Two groups of similar size, so comparisons between them will be reasonably balanced.

## Relationships with the target

Now the question itself: which measurements move with the target? Start with the correlation of every column with the target, sorted by strength. Before running it, predict which measurement you expect to be most strongly related to how diabetes progresses.

```python type
correlations = df.corr()["target"].drop("target")
print(correlations.sort_values(key=abs, ascending=False).round(2))
```

```output
bmi    0.59
s5     0.57
bp     0.44
s4     0.43
s3    -0.39
s6     0.38
s1     0.21
age    0.19
s2     0.17
sex    0.04
Name: target, dtype: float64
```

`df.corr()` computes the correlation of every pair of columns, and `["target"]` takes the column of correlations with the target. `sort_values(key=abs)` sorts by the size of the correlation, ignoring its sign, since a strong negative relationship is as informative as a strong positive one.

BMI has the strongest relationship with progression (about 0.59), followed by `s5` and blood pressure. `s3`, HDL or "good" cholesterol, is negatively correlated: higher values go with **less** progression, which fits its reputation. Age and sex are only weakly related to the target on their own. Remember from the expectation lesson that correlation only measures straight-line relationships, so look at the strongest ones directly:

```python type
import matplotlib.pyplot as plt
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame

fig, axes = plt.subplots(1, 3, figsize=(12, 3.5))
for ax, column in zip(axes, ["bmi", "s5", "s3"]):
    ax.scatter(df[column], df["target"], s=8, alpha=0.5)
    r = df[column].corr(df["target"])
    ax.set_title(f"{column}: r = {r:.2f}")
    ax.set_xlabel(column)
axes[0].set_ylabel("progression after a year")
plt.show()
```

The plots confirm the correlations and add what numbers cannot show. The BMI relationship is clearly upward, but with lots of scatter: two patients with the same BMI can have very different outcomes. No single measurement predicts progression well on its own, which suggests a model will need to combine several of them.

## Relationships between the features

Features related to **each other** matter too. Two strongly correlated features carry much the same information, which can make some models unstable (the collinearity problem from the linear systems lesson). A heatmap of the correlation matrix shows every pair at once:

```python type
import matplotlib.pyplot as plt
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
corr = df.drop(columns="target").corr()

fig, ax = plt.subplots(figsize=(6, 5))
image = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr)), corr.columns, rotation=45)
ax.set_yticks(range(len(corr)), corr.columns)
fig.colorbar(image, ax=ax, label="correlation")
plt.show()
print("strongest pair: s1 and s2, r =", round(corr.loc["s1", "s2"], 2))
```

```output
strongest pair: s1 and s2, r = 0.9
```

`imshow` draws the matrix as coloured squares, from `ax.imshow` in the plotting lesson. The colour map `"RdBu_r"` shows positive correlations in red and negative in blue, with `vmin` and `vmax` fixing the scale so that white means zero. `fig.colorbar` adds the key. The diagonal is always dark red: each feature correlates perfectly with itself. The standout is `s1` and `s2` (total and LDL cholesterol), correlated at about 0.9: they largely measure the same thing. The second is `s3` and `s4`, strongly negative (about −0.74), unsurprisingly, since `s4` is a ratio with HDL on the bottom. Pairs like these are worth noting before modelling.

## Comparing groups

Correlation handles numeric features. To see how the target varies across **ranges** of a feature, split it into bands and compare the groups. `pd.cut` divides a numeric column into intervals:

```python type
import pandas as pd
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
bands = pd.cut(df["bmi"], bins=[0, 25, 30, 35, 50], labels=["under 25", "25-30", "30-35", "35+"])
print(df.groupby(bands, observed=True)["target"].agg(["count", "mean", "median"]).round(1))
print(df.groupby("sex")["target"].mean().round(1))
```

```output
          count   mean  median
bmi
under 25    190  109.3    96.0
25-30       157  167.0   172.0
30-35        79  199.7   198.0
35+          16  280.4   272.0
sex
1.0    149.0
2.0    155.7
Name: target, dtype: float64
```

`pd.cut` returns a Series of band labels, one per patient, and `groupby` accepts that Series directly, grouping the rows by it without adding it to the DataFrame as a column. (`observed=True` tells pandas to show only bands that actually contain patients.)

The average progression rises steadily across the BMI bands, from about 110 for a BMI under 25 to about 280 for 35 and above: a clear, large effect, and one you could explain to a doctor without mentioning correlation. Check the counts, though: the top band holds only 16 patients. From the estimation lesson, its mean has a standard error of roughly 77/√16 ≈ 19 (77 is the target's standard deviation), so "about 280" is only accurate to within about ±40. By contrast, the two sex groups have very similar averages, consistent with sex's tiny correlation.

## Unusual values

Finally, look for values far from the rest. They may be data-entry errors, or genuine but rare cases, and either way you should know about them before modelling. A simple check is the z-score from the distributions lesson: how many standard deviations each value lies from its column's mean. Before running the cell, use the 68–95–99.7 rule to predict: if the data were normal, about how many of the 4,420 values (442 patients × 10 features) would lie more than 3 standard deviations out?

```python type
import numpy as np
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
features = df.drop(columns="target")
z = (features - features.mean()) / features.std()
extreme = (z.abs() > 3)
print(extreme.sum()[extreme.sum() > 0])
print("patients with any extreme value:", extreme.any(axis=1).sum())
```

```output
bmi    2
s1     2
s2     2
s3     5
s4     4
dtype: int64
patients with any extreme value: 12
```

A handful of patients have a measurement more than 3 standard deviations from the mean, mostly in the serum measurements. For normally distributed data you would expect about 3 in 1,000 values beyond 3 standard deviations, and with 442 patients and 10 features there are 4,420 values, so a dozen or so is not suspicious in itself. The next step would be to look at those rows individually and decide whether any are errors. Do not delete unusual values just because they are unusual: they are often real, and a model needs to see them.

## Write down what you found

An exploration is only useful if its conclusions are recorded. For this dataset:

1. **Clean and complete.** 442 patients, 10 numeric measurements, no missing values, no impossible values. Sex is a category coded as 1 and 2.
2. **The target is right-skewed**, with a long tail of high progression values.
3. **BMI is the strongest single predictor** (r ≈ 0.59), followed by `s5` and blood pressure. `s3` is negatively related. Average progression more than doubles from the lowest BMI band to the highest.
4. **No single feature predicts well alone**: every relationship has a lot of scatter. A model will need to combine features, and even then substantial unexplained variation should be expected.
5. **Some features overlap strongly**: `s1` and `s2` (r ≈ 0.9), and `s3` and `s4` (r ≈ −0.74).
6. **A few extreme values**, mostly in serum measurements, are worth inspecting but not obviously errors.

These findings set expectations for the models that follow. When you fit a linear regression to this data in a later lesson, finding that BMI gets a large positive weight, and that the model explains only part of the variation, will be exactly what this exploration predicted.

::: challenge Rank the features [easy]
Write a function `rank_features(df, target)` that returns a pandas Series of the correlation of every **other** column with the `target` column, sorted by **absolute** value from strongest to weakest, and rounded to 3 decimal places.

```python starter
import pandas as pd

def rank_features(df, target):
    return pd.Series(dtype=float)
```

```python solution
import pandas as pd

def rank_features(df, target):
    correlations = df.corr()[target].drop(target)
    return correlations.sort_values(key=abs, ascending=False).round(3)
```

```python test
import numpy as _np
import pandas as _pd
assert "rank_features" in dir(), "Keep the function's name as rank_features."
_rng = _np.random.default_rng(1)
_x = _rng.normal(size=200)
_df = _pd.DataFrame({"a": _x + _rng.normal(0, 2, 200), "b": -3 * _x + _rng.normal(0, 0.5, 200), "c": _rng.normal(size=200), "y": _x})
_got = rank_features(_df, "y")
assert isinstance(_got, _pd.Series), "Return a pandas Series."
assert "y" not in _got.index, "Leave the target's correlation with itself out."
assert list(_got.index) == ["b", "a", "c"], f"Sorted by strength (ignoring sign) the order should be ['b', 'a', 'c'], but got {list(_got.index)}. A strong negative correlation counts as strong."
assert _np.allclose(_got.values, _df.corr()["y"][["b", "a", "c"]].round(3).values), "The values should be the correlations with the target, rounded to 3 decimal places."
"SUCCESS: The first thing to compute on any new regression dataset."
```

Hint: `df.corr()[target]` gives every column's correlation with the target; `.drop(target)` removes its correlation with itself. `sort_values(key=abs, ascending=False)` sorts by size regardless of sign.
:::

::: challenge Compare bands [medium]
Write a function `band_summary(df, column, edges, target)` that splits `column` into bands with `pd.cut(df[column], bins=edges)`, and returns a DataFrame with one row per band (only bands that contain rows) and two columns, `count` and `mean`, giving the number of rows and the mean of `target` in each band, rounded to 1 decimal place. Do not change `df`.

```python starter
import pandas as pd

def band_summary(df, column, edges, target):
    return pd.DataFrame()
```

```python solution
import pandas as pd

def band_summary(df, column, edges, target):
    bands = pd.cut(df[column], bins=edges)
    return df.groupby(bands, observed=True)[target].agg(["count", "mean"]).round(1)
```

```python test
import pandas as _pd
assert "band_summary" in dir(), "Keep the function's name as band_summary."
_df = _pd.DataFrame({"age": [22, 25, 31, 38, 45, 47, 52, 70], "cost": [100, 120, 150, 170, 200, 210, 260, 400]})
_before = _df.copy()
_got = band_summary(_df, "age", [20, 30, 40, 50, 60, 80], "cost")
assert isinstance(_got, _pd.DataFrame), "Return a DataFrame."
assert list(_got.columns) == ["count", "mean"], f"The columns should be ['count', 'mean'], but got {list(_got.columns)}."
assert _got["count"].tolist() == [2, 2, 2, 1, 1], f"The counts per band should be [2, 2, 2, 1, 1], but got {_got['count'].tolist()}."
assert _got["mean"].tolist() == [110.0, 160.0, 205.0, 260.0, 400.0], f"The mean cost per band should be [110.0, 160.0, 205.0, 260.0, 400.0], but got {_got['mean'].tolist()}."
_sparse = band_summary(_df, "age", [0, 10, 20, 30, 100], "cost")
assert len(_sparse) == 2, "Leave out bands that contain no rows (observed=True)."
assert _df.equals(_before), "band_summary changed the DataFrame it was given."
"SUCCESS: A numeric feature turned into groups you can compare, and explain."
```

Hint: As in the lesson, you can group by the Series that `pd.cut` returns, without adding it as a column.
:::

::: challenge Find the unusual rows [medium]
Write a function `extreme_rows(df, k=3)` that returns the rows of `df` (all columns) in which **any** numeric column has a z-score, computed with that column's mean and standard deviation (pandas' default, `ddof=1`), larger than `k` in absolute value. Keep the original index labels, so you can find the rows again.

```python starter
import pandas as pd

def extreme_rows(df, k=3):
    return df.iloc[0:0]
```

```python solution
import pandas as pd

def extreme_rows(df, k=3):
    numeric = df.select_dtypes("number")
    z = (numeric - numeric.mean()) / numeric.std()
    return df[(z.abs() > k).any(axis=1)]
```

```python test
import numpy as _np
import pandas as _pd
assert "extreme_rows" in dir(), "Keep the function's name as extreme_rows."
_rng = _np.random.default_rng(2)
_df = _pd.DataFrame({"a": _rng.normal(0, 1, 300), "b": _rng.normal(50, 5, 300), "label": ["x"] * 300})
_df.loc[17, "a"] = 9.0
_df.loc[240, "b"] = 5.0
_num = _df[["a", "b"]]
_z = (_num - _num.mean()) / _num.std()
_want = list(_df.index[(_z.abs() > 3).any(axis=1)])
_got = extreme_rows(_df)
assert isinstance(_got, _pd.DataFrame), "Return a DataFrame."
assert list(_got.index) == _want, f"The rows with an extreme value are {_want}, but got {list(_got.index)}. Check any column, keep the original index, and ignore text columns."
assert "label" in _got.columns, "Return all the columns of those rows."
assert list(extreme_rows(_df, k=2).index) == list(_df.index[(_z.abs() > 2).any(axis=1)]), "The threshold k should be used."
"SUCCESS: The rows worth a closer look, found in three lines."
```

Hint: `df.select_dtypes("number")` keeps only the numeric columns. Compute the z-scores for all of them at once (a DataFrame minus its column means broadcasts, just like NumPy), then `(z.abs() > k).any(axis=1)` marks rows with any extreme value.
:::

## What you learned

- Exploratory data analysis comes before modelling: understand what each column means, check for missing and impossible values, and find the relationships worth modelling.
- Start from a question; it decides what to look at.
- `info` and `describe` catch missing data, impossible values and categories coded as numbers.
- Look at each variable's distribution with histograms, and at categories with `value_counts`.
- `df.corr()` ranks features by their relationship with the target; scatter plots show what the numbers miss.
- A correlation heatmap shows features that carry overlapping information.
- `pd.cut` turns a numeric feature into bands; `groupby` then compares the target across them.
- z-scores flag unusual values to inspect; unusual does not mean wrong.
- Write the findings down; they set expectations for the models that follow.

That completes the foundations. Next the series turns to machine learning itself, starting with what it actually means for a program to learn from data.
