# The scikit-learn workflow

You have now used a dozen scikit-learn models, and they all worked the same way: create, `fit`, `predict` or `score`. That uniformity is deliberate, and it is the library's real strength. Because every model, and every preprocessing step, follows the same small set of rules, they can be snapped together like building blocks: a scaler, then an imputer, then a model, all trained and cross-validated as one object.

This lesson is about that machinery. It explains the rules every scikit-learn object follows, shows a cross-validation mistake that makes pure noise look 93% predictable, and shows how a **pipeline** prevents it. Then it builds a complete model for a realistic table with numbers, categories and missing values, using a **column transformer**, and ends with writing your own transformer and saving a trained model.

## The estimator interface

Everything in scikit-learn that learns from data is an **estimator**, with three rules:

1. **Settings go in the constructor.** `Ridge(alpha=1.0)`, `KNeighborsClassifier(n_neighbors=5)`. These are **hyperparameters**: choices you make, not things learned from data. Creating the object learns nothing.
2. **`fit(X, y)` learns from data** and returns the estimator itself, so calls can be chained: `model = Ridge().fit(X, y)`.
3. **Learned values are attributes ending in an underscore**: `coef_`, `intercept_`, `mean_`, `classes_`. The underscore means "exists only after fitting".

Estimators then come in two main kinds. **Predictors** (models) add `predict(X)` and `score(X, y)`. **Transformers** (preprocessing steps) add `transform(X)`, which returns a changed version of the data, and `fit_transform(X)`, which fits and transforms in one call.

```python type
import numpy as np
from sklearn.preprocessing import StandardScaler

X_train = np.array([[1.0, 100.0], [2.0, 300.0], [3.0, 200.0]])
X_new = np.array([[4.0, 400.0]])

scaler = StandardScaler()
print("learned anything yet?", hasattr(scaler, "mean_"))  # hasattr(object, name): does it have that attribute?
scaler.fit(X_train)
print("means learned from the training data:", scaler.mean_)
print("standard deviations:", scaler.scale_.round(2))
print("new data, transformed with the TRAINING statistics:", scaler.transform(X_new).round(2))
print("hyperparameters:", scaler.get_params())
```

```output
learned anything yet? False
means learned from the training data: [  2. 200.]
standard deviations: [ 0.82 81.65]
new data, transformed with the TRAINING statistics: [[2.45 2.45]]
hyperparameters: {'copy': True, 'with_mean': True, 'with_std': True}
```

The scaler learns `mean_` and `scale_` (the standard deviations) from the training data, and `transform` applies **those** to any data, including new data. This split, fit on training data and transform everything with what was learned there, is exactly what keeps test data from influencing the model. `get_params()` lists the hyperparameters; every estimator has it, along with `set_params(...)` to change them.

## Leakage through preprocessing

Here is a mistake that is easy to make and dramatic in its effect. Take 60 examples with 10,000 features of **pure random noise**, and random labels. There is nothing to learn: any honest method should score about 50%. Now do something that sounds sensible: first keep the 20 features most related to the label (`SelectKBest` scores each feature against the labels and keeps the best `k`), then cross-validate a model on them. What accuracy do you expect it to report?

```python type
import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

rng = np.random.default_rng(0)
X = rng.normal(size=(60, 10_000))
y = rng.integers(0, 2, 60)

X_selected = SelectKBest(f_classif, k=20).fit_transform(X, y)
leaky = cross_val_score(LogisticRegression(), X_selected, y, cv=5).mean()
print(f"select on all the data, then cross-validate: {leaky:.2f}")

pipeline = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression())
honest = cross_val_score(pipeline, X, y, cv=5).mean()
print(f"selection inside a pipeline:                {honest:.2f}")
```

```output
select on all the data, then cross-validate: 0.93
selection inside a pipeline:                0.57
```

The first approach reports 93% accuracy on noise. What went wrong? With 10,000 random features, some will match the labels well **by chance**, and the selection step found them using **all 60 labels**, including those of the examples that later serve as test folds. The test folds were used to choose the features, so they are no longer unseen. Information from the test data **leaked** into training.

The second approach puts the selection **inside** the model as a pipeline. Now cross-validation refits the whole pipeline on each training fold: the features are chosen using only that fold's labels, and the held-out fold is truly unseen. The score drops to 0.57, about what guessing gives, which is the truth. (With only 12 examples per test fold, "about 50%" can easily come out as 57%.)

The rule: **every step that learns anything from data (scaling, imputing, selecting features, encoding categories) belongs inside the pipeline.** Scaling on all the data before cross-validation leaks too, usually far less dramatically, which is exactly why it goes unnoticed.

## Pipelines

A **pipeline** chains transformers and ends with a model. Fitting it fits each step in turn on the output of the previous one; predicting passes new data through the same fitted steps. The whole thing is itself an estimator, so it works with `cross_val_score` and anything else that takes a model.

```python type
from sklearn.datasets import load_wine
from sklearn.model_selection import cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)
model = Pipeline([
    ("scale", StandardScaler()),
    ("knn", KNeighborsClassifier(n_neighbors=5)),
])
print("cross-validated accuracy:", cross_val_score(model, X, y, cv=5).mean().round(3))

model.set_params(knn__n_neighbors=15)
print("with 15 neighbours:", cross_val_score(model, X, y, cv=5).mean().round(3))

model.fit(X, y)
print("steps:", list(model.named_steps))
print("the fitted scaler's first three means:", model.named_steps["scale"].mean_[:3].round(2))
```

```output
cross-validated accuracy: 0.949
with 15 neighbours: 0.955
steps: ['scale', 'knn']
the fitted scaler's first three means: [13.    2.34  2.37]
```

`Pipeline` takes a list of `(name, step)` pairs. `make_pipeline(...)`, used in earlier lessons, does the same but names the steps automatically after their classes, in lower case (`standardscaler`, `kneighborsclassifier`). A step's hyperparameters are reached with **the step's name, two underscores, and the parameter**: `knn__n_neighbors`. That double-underscore naming is how the hyperparameter search lesson will tune settings anywhere inside a pipeline. Fitted steps are available through `named_steps` (or by position: `model[0]` is the first step, `model[-1]` the last, `model[:-1]` everything but the model).

## Real tables: numbers, categories and gaps

Real data rarely arrives as a clean NumPy array. Here is a table of 400 flats for sale (made up, but realistic), as a pandas DataFrame: floor area, number of rooms, district, whether there is a balcony, and the price in thousands:

```python type
import numpy as np
import pandas as pd

rng = np.random.default_rng(1)
n = 400
district = rng.choice(["centre", "north", "riverside", "suburbs"], n, p=[0.2, 0.3, 0.2, 0.3])
area = rng.normal(70, 20, n).clip(25, 160).round(0)
rooms = np.clip(np.round(area / 25 + rng.normal(0, 0.6, n)), 1, 6)
balcony = rng.choice(["yes", "no"], n)
district_bonus = pd.Series(district).map({"centre": 120, "north": 40, "riverside": 80, "suburbs": 0}).to_numpy()
price = 1.6 * area + 8 * rooms + district_bonus + np.where(balcony == "yes", 15, 0) + rng.normal(0, 18, n)
flats = pd.DataFrame({"area": area, "rooms": rooms, "district": district, "balcony": balcony, "price": price.round(1)})
flats.loc[rng.choice(n, 30, replace=False), "area"] = np.nan

print(flats.head())
print("missing values per column:", flats.isna().sum().to_dict())
```

```output
   area  rooms   district balcony  price
0  66.0    4.0  riverside      no  203.8
1  36.0    1.0    suburbs     yes   46.2
2  74.0    2.0     centre      no  232.3
3  75.0    2.0    suburbs     yes  133.6
4  53.0    3.0      north      no  148.7
missing values per column: {'area': 30, 'rooms': 0, 'district': 0, 'balcony': 0, 'price': 0}
```

Two problems. Most models need numbers, but `district` and `balcony` are text, and **categories** cannot simply be numbered 0, 1, 2, 3, because that would claim "riverside" is between "north" and "suburbs". And 30 flats have no recorded area: most models refuse missing values outright.

The standard answers:

- **One-hot encoding** (`OneHotEncoder`) turns a category column into one 0/1 column per category: `district_centre`, `district_north`, and so on, with a 1 in the column matching each flat's district. No order is implied. The feature engineering lesson goes further into encodings.
- **Imputation** (`SimpleImputer`) fills missing values, for example with the column's median **learned from the training data**. That makes it a transformer with a `fit` step, so it belongs in the pipeline too.

Different columns need different treatment, and a `ColumnTransformer` routes each group of columns to its own transformer and puts the results side by side:

```python type
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

rng = np.random.default_rng(1)
n = 400
district = rng.choice(["centre", "north", "riverside", "suburbs"], n, p=[0.2, 0.3, 0.2, 0.3])
area = rng.normal(70, 20, n).clip(25, 160).round(0)
rooms = np.clip(np.round(area / 25 + rng.normal(0, 0.6, n)), 1, 6)
balcony = rng.choice(["yes", "no"], n)
district_bonus = pd.Series(district).map({"centre": 120, "north": 40, "riverside": 80, "suburbs": 0}).to_numpy()
price = 1.6 * area + 8 * rooms + district_bonus + np.where(balcony == "yes", 15, 0) + rng.normal(0, 18, n)
flats = pd.DataFrame({"area": area, "rooms": rooms, "district": district, "balcony": balcony, "price": price.round(1)})
flats.loc[rng.choice(n, 30, replace=False), "area"] = np.nan
X, y = flats.drop(columns="price"), flats["price"]

preprocess = ColumnTransformer([
    ("numbers", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), ["area", "rooms"]),
    ("categories", OneHotEncoder(handle_unknown="ignore"), ["district", "balcony"]),
])
model = make_pipeline(preprocess, Ridge(alpha=1.0))
print("cross-validated R²:", cross_val_score(model, X, y, cv=5).mean().round(3))

model.fit(X, y)
names = model[:-1].get_feature_names_out()
for name, weight in zip(names, model[-1].coef_):
    print(f"  {name:<32} {weight:7.1f}")

new_flat = pd.DataFrame({"area": [80], "rooms": [3], "district": ["harbour"], "balcony": ["yes"]})
print("predicted price for a flat in a district never seen in training:", model.predict(new_flat).round(1))
```

```output
cross-validated R²: 0.888
  numbers__area                       28.3
  numbers__rooms                      13.2
  categories__district_centre         59.8
  categories__district_north         -20.1
  categories__district_riverside      20.0
  categories__district_suburbs       -59.8
  categories__balcony_no              -6.4
  categories__balcony_yes              6.4
predicted price for a flat in a district never seen in training: [225.3]
```

Each entry in the `ColumnTransformer` is `(name, transformer, columns)`. The numeric columns go through a small pipeline of their own (impute, then scale), and the category columns through the encoder. The whole model takes the DataFrame as it is and cross-validates to an R² of 0.89. (Try it with only the numeric part of the transformer: the district matters so much that R² falls to about 0.36.)

`get_feature_names_out()` lists the columns the model actually sees, prefixed with the transformer's name. The weights read sensibly. The four district columns always add up to exactly 1 (each flat is in one district), so the penalty settles their weights around zero, and each district's weight is measured from the average of the four. The true district bonuses used to make the data were 120, 40, 80 and 0, which average 60; so the centre comes out at about +60 and the suburbs at about −60. Finally, `handle_unknown="ignore"` means a category never seen in training, such as the "harbour" district, becomes all zeros instead of an error. Without it, the model would crash on the first unusual flat it met in use.

## Your own transformers

Any class with `fit` and `transform` methods can be a pipeline step. Inheriting from `BaseEstimator` and `TransformerMixin` adds `get_params`, `set_params` and `fit_transform` for free (the classes lesson covered inheritance). Following the conventions, settings are stored unchanged in `__init__`, learned values get a trailing underscore, and `fit` returns `self`:

```python type
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

class AddLog(BaseEstimator, TransformerMixin):
    """Add log(1 + x) of each column as extra columns."""

    def __init__(self, columns=None):
        self.columns = columns

    def fit(self, X, y=None):
        X = np.asarray(X, dtype=float)
        self.columns_ = list(range(X.shape[1])) if self.columns is None else list(self.columns)
        return self

    def transform(self, X):
        X = np.asarray(X, dtype=float)
        return np.column_stack([X, np.log1p(X[:, self.columns_])])

data = np.array([[1.0, 10.0], [3.0, 1000.0]])
print(AddLog(columns=[1]).fit_transform(data).round(3))
print(AddLog().get_params())
```

```output
[[   1.      10.       2.398]
 [   3.    1000.       6.909]]
{'columns': None}
```

`np.log1p(x)` computes log(1 + x), which is safe at zero. `fit` learns nothing much here (it just settles which columns to use), but it must exist so the pipeline can call it. For a transformation with nothing to learn at all, `FunctionTransformer(np.log1p)` wraps a plain function as a transformer in one line.

## Saving a trained model

A fitted pipeline is an ordinary Python object, so the standard `pickle` module can turn it into bytes, to be written to a file and loaded later, with every fitted step inside:

```python type
import pickle
import numpy as np
from sklearn.datasets import load_wine
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)
model = make_pipeline(StandardScaler(), KNeighborsClassifier()).fit(X, y)

saved = pickle.dumps(model)
print(f"the whole fitted pipeline is {len(saved):,} bytes")
restored = pickle.loads(saved)
print("same predictions after loading:", (restored.predict(X) == model.predict(X)).all())
```

```output
the whole fitted pipeline is 23,445 bytes
same predictions after loading: True
```

`pickle.dumps` gives the bytes and `pickle.loads` rebuilds the object; with files, use `pickle.dump(model, f)` and `pickle.load(f)` on a file opened in binary mode (`"wb"` and `"rb"`). Two cautions: load pickles only from sources you trust, since loading one can run arbitrary code; and load them with the same scikit-learn version that saved them.

::: challenge Tune a step [easy]
Build a pipeline with `make_pipeline` that scales the wine features with `StandardScaler` and then classifies them with `KNeighborsClassifier(n_neighbors=5)`, and store it in `model`. Store its 5-fold cross-validated mean accuracy in `score_5`.

Then use `set_params` with the correct double-underscore name to change the number of neighbours to 25, and store the new cross-validated mean accuracy in `score_25`.

```python starter
from sklearn.datasets import load_wine
from sklearn.model_selection import cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)
model = None
score_5 = 0.0
score_25 = 0.0
print(score_5, score_25)
```

```python solution
from sklearn.datasets import load_wine
from sklearn.model_selection import cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)
model = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5))
score_5 = cross_val_score(model, X, y, cv=5).mean()
model.set_params(kneighborsclassifier__n_neighbors=25)
score_25 = cross_val_score(model, X, y, cv=5).mean()
print(score_5, score_25)
```

```python test
import numpy as _np
from sklearn.datasets import load_wine as _lw
from sklearn.model_selection import cross_val_score as _cvs
from sklearn.neighbors import KNeighborsClassifier as _KNC
from sklearn.pipeline import Pipeline as _P, make_pipeline as _mp
from sklearn.preprocessing import StandardScaler as _SS
assert isinstance(model, _P), "model should be a pipeline made with make_pipeline."
assert [type(s).__name__ for s in model] == ["StandardScaler", "KNeighborsClassifier"], "The pipeline should have two steps: a StandardScaler, then a KNeighborsClassifier."
assert model.get_params()["kneighborsclassifier__n_neighbors"] == 25, "After set_params, the classifier's n_neighbors should be 25. With make_pipeline the step is named kneighborsclassifier, so the parameter is kneighborsclassifier__n_neighbors."
_X, _y = _lw(return_X_y=True)
_s5 = _cvs(_mp(_SS(), _KNC(n_neighbors=5)), _X, _y, cv=5).mean()
_s25 = _cvs(_mp(_SS(), _KNC(n_neighbors=25)), _X, _y, cv=5).mean()
assert _np.isclose(score_5, _s5), f"score_5 should be {_s5:.3f}."
assert _np.isclose(score_25, _s25), f"score_25 should be {_s25:.3f}."
"SUCCESS: One object to fit, score and tune: the step name, two underscores, and the setting."
```

Hint: `make_pipeline` names each step after its class in lower case, so the classifier's step is `kneighborsclassifier`. `model.set_params(kneighborsclassifier__n_neighbors=25)` changes the setting in place.
:::

::: challenge A clipping transformer [medium]
Extreme values can drag a model around. Write a transformer class `Clip(BaseEstimator, TransformerMixin)` that limits each column to a range learned from the **training** data:

- `__init__(self, low=1, high=99)` stores the two percentiles unchanged.
- `fit(X, y=None)` stores, in `low_` and `high_`, the `low`-th and `high`-th percentiles of each column (use `np.percentile(X, q, axis=0)`), and returns `self`.
- `transform(X)` returns `X` with every value clipped to its column's `[low_, high_]` range (`np.clip` accepts arrays of limits).

Then put it in a pipeline before `LinearRegression`, `make_pipeline(Clip(5, 95), LinearRegression())`, and store the pipeline's 5-fold cross-validated R² on the starter's data in `clipped_r2`. Store the R² of plain `LinearRegression()` in `plain_r2`.

```python starter
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

class Clip(BaseEstimator, TransformerMixin):
    def __init__(self, low=1, high=99):
        self.low = low
        self.high = high

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        return X

rng = np.random.default_rng(3)
X = rng.normal(0, 1, (300, 3))
y = X @ np.array([2.0, -1.0, 0.5]) + rng.normal(0, 0.5, 300)
glitches = rng.choice(300, 6, replace=False)
X[glitches, 0] = 80.0

plain_r2 = 0.0
clipped_r2 = 0.0
print(plain_r2, clipped_r2)
```

```python solution
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

class Clip(BaseEstimator, TransformerMixin):
    def __init__(self, low=1, high=99):
        self.low = low
        self.high = high

    def fit(self, X, y=None):
        X = np.asarray(X, dtype=float)
        self.low_ = np.percentile(X, self.low, axis=0)
        self.high_ = np.percentile(X, self.high, axis=0)
        return self

    def transform(self, X):
        return np.clip(np.asarray(X, dtype=float), self.low_, self.high_)

rng = np.random.default_rng(3)
X = rng.normal(0, 1, (300, 3))
y = X @ np.array([2.0, -1.0, 0.5]) + rng.normal(0, 0.5, 300)
glitches = rng.choice(300, 6, replace=False)
X[glitches, 0] = 80.0

plain_r2 = cross_val_score(LinearRegression(), X, y, cv=5).mean()
clipped_r2 = cross_val_score(make_pipeline(Clip(5, 95), LinearRegression()), X, y, cv=5).mean()
print(plain_r2, clipped_r2)
```

```python test
import numpy as _np
from sklearn.base import clone as _clone
from sklearn.linear_model import LinearRegression as _LR
from sklearn.model_selection import cross_val_score as _cvs
from sklearn.pipeline import make_pipeline as _mp
assert "Clip" in dir(), "Keep the class name Clip."
_c = Clip(10, 90)
assert _c.get_params() == {"low": 10, "high": 90}, "Store low and high unchanged in __init__, under those names, so get_params works."
_train = _np.column_stack([_np.arange(101.0), _np.arange(101.0) * 2])
assert _c.fit(_train) is _c, "fit should return self."
assert _np.allclose(_c.low_, [10, 20]) and _np.allclose(_c.high_, [90, 180]), f"For columns 0..100 and 0..200, the 10th and 90th percentiles are [10, 20] and [90, 180], but low_ and high_ are {_c.low_} and {_c.high_}."
_new = _np.array([[-50.0, 500.0], [50.0, 100.0]])
assert _np.allclose(_c.transform(_new), [[10, 180], [50, 100]]), "transform should clip new data to the limits learned in fit, not to the new data's own percentiles."
assert _np.allclose(_clone(Clip(5, 95)).fit_transform(_train)[:, 0].min(), 5), "fit_transform (from TransformerMixin) should work too."
_r = _np.random.default_rng(3)
_X = _r.normal(0, 1, (300, 3))
_y = _X @ _np.array([2.0, -1.0, 0.5]) + _r.normal(0, 0.5, 300)
_X[_r.choice(300, 6, replace=False), 0] = 80.0
_plain = _cvs(_LR(), _X, _y, cv=5).mean()
assert _np.isclose(plain_r2, _plain), f"plain_r2 should be {_plain:.3f}."
_clipped = _cvs(_mp(Clip(5, 95), _LR()), _X, _y, cv=5).mean()
assert _np.isclose(clipped_r2, _clipped), f"clipped_r2 should be {_clipped:.3f}."
assert clipped_r2 > plain_r2, "Clipping the glitches should improve the cross-validated R²."
f"SUCCESS: Six glitched values held plain regression to R² {_plain:.2f}; clipping inside the pipeline, with limits learned on each training fold, lifts it to {_clipped:.2f}."
```

Hint: In `fit`, `np.percentile(X, self.low, axis=0)` gives one value per column. In `transform`, `np.clip(X, self.low_, self.high_)` broadcasts those per-column limits across every row.
:::

::: challenge Cars with gaps [medium]
The starter builds a table of 300 used cars: `make` (a category), `age` in years, `mileage` in thousands of km (with some values missing), and `price`. Build a model for the price:

- a `ColumnTransformer` that sends `["age", "mileage"]` through `make_pipeline(SimpleImputer(strategy="median"), StandardScaler())` and `["make"]` through `OneHotEncoder(handle_unknown="ignore")`;
- followed by `Ridge(alpha=1.0)`, all in one pipeline stored in `model`.

Store its 5-fold cross-validated R² in `r2`. Then fit `model` on all the data, and:

- use `get_feature_names_out()` on the fitted preprocessing step and the model's `coef_` to find the weights of the BMW and Fiat columns, and store the BMW weight minus the Fiat weight in `bmw_vs_fiat`;
- store the predicted price for a 3-year-old car with 40 thousand km, made by "Lada" (a make not in the data), in `lada`.

```python starter
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

rng = np.random.default_rng(7)
n = 300
make = rng.choice(["Ford", "Toyota", "BMW", "Fiat"], n)
age = rng.integers(0, 15, n).astype(float)
mileage = (age * 14 + rng.normal(0, 15, n)).clip(0)
base = pd.Series(make).map({"Ford": 18, "Toyota": 21, "BMW": 34, "Fiat": 14}).to_numpy()
price = base * np.exp(-0.09 * age) - 0.02 * mileage + rng.normal(0, 1.5, n)
cars = pd.DataFrame({"make": make, "age": age, "mileage": mileage.round(0), "price": price.round(2)})
cars.loc[rng.choice(n, 25, replace=False), "mileage"] = np.nan
X, y = cars.drop(columns="price"), cars["price"]

model = None
r2 = 0.0
bmw_vs_fiat = 0.0
lada = 0.0
print(r2, bmw_vs_fiat, lada)
```

```python solution
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

rng = np.random.default_rng(7)
n = 300
make = rng.choice(["Ford", "Toyota", "BMW", "Fiat"], n)
age = rng.integers(0, 15, n).astype(float)
mileage = (age * 14 + rng.normal(0, 15, n)).clip(0)
base = pd.Series(make).map({"Ford": 18, "Toyota": 21, "BMW": 34, "Fiat": 14}).to_numpy()
price = base * np.exp(-0.09 * age) - 0.02 * mileage + rng.normal(0, 1.5, n)
cars = pd.DataFrame({"make": make, "age": age, "mileage": mileage.round(0), "price": price.round(2)})
cars.loc[rng.choice(n, 25, replace=False), "mileage"] = np.nan
X, y = cars.drop(columns="price"), cars["price"]

preprocess = ColumnTransformer([
    ("numbers", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), ["age", "mileage"]),
    ("make", OneHotEncoder(handle_unknown="ignore"), ["make"]),
])
model = make_pipeline(preprocess, Ridge(alpha=1.0))
r2 = cross_val_score(model, X, y, cv=5).mean()
model.fit(X, y)
weights = dict(zip(model[:-1].get_feature_names_out(), model[-1].coef_))
bmw_vs_fiat = weights["make__make_BMW"] - weights["make__make_Fiat"]
lada = float(model.predict(pd.DataFrame({"make": ["Lada"], "age": [3.0], "mileage": [40.0]}))[0])
print(r2, bmw_vs_fiat, lada)
```

```python test
import numpy as _np
import pandas as _pd
from sklearn.compose import ColumnTransformer as _CT
from sklearn.impute import SimpleImputer as _SI
from sklearn.linear_model import Ridge as _R
from sklearn.model_selection import cross_val_score as _cvs
from sklearn.pipeline import make_pipeline as _mp, Pipeline as _P
from sklearn.preprocessing import OneHotEncoder as _OHE, StandardScaler as _SS
assert isinstance(model, _P) and isinstance(model[0], _CT) and type(model[-1]).__name__ == "Ridge", "model should be a pipeline: a ColumnTransformer, then Ridge."
_enc = [t for _, t, cols in model[0].transformers if list(cols) == ["make"]]
assert _enc and isinstance(_enc[0], _OHE) and _enc[0].handle_unknown == "ignore", "Send the 'make' column through OneHotEncoder(handle_unknown='ignore')."
_r = _np.random.default_rng(7)
_n = 300
_make = _r.choice(["Ford", "Toyota", "BMW", "Fiat"], _n)
_age = _r.integers(0, 15, _n).astype(float)
_mil = (_age * 14 + _r.normal(0, 15, _n)).clip(0)
_base = _pd.Series(_make).map({"Ford": 18, "Toyota": 21, "BMW": 34, "Fiat": 14}).to_numpy()
_price = _base * _np.exp(-0.09 * _age) - 0.02 * _mil + _r.normal(0, 1.5, _n)
_cars = _pd.DataFrame({"make": _make, "age": _age, "mileage": _mil.round(0), "price": _price.round(2)})
_cars.loc[_r.choice(_n, 25, replace=False), "mileage"] = _np.nan
_X, _y = _cars.drop(columns="price"), _cars["price"]
_ref = _mp(_CT([("n", _mp(_SI(strategy="median"), _SS()), ["age", "mileage"]), ("c", _OHE(handle_unknown="ignore"), ["make"])]), _R(alpha=1.0))
_want = _cvs(_ref, _X, _y, cv=5).mean()
assert _np.isclose(r2, _want), f"r2 should be {_want:.3f}. Check the imputer strategy, the scaler and the encoder."
_ref.fit(_X, _y)
_w = dict(zip(_ref[:-1].get_feature_names_out(), _ref[-1].coef_))
_names = [n for n in _w if n.endswith("BMW")] + [n for n in _w if n.endswith("Fiat")]
_diff = _w[_names[0]] - _w[_names[1]]
assert _np.isclose(bmw_vs_fiat, _diff), f"bmw_vs_fiat should be the BMW column's weight minus the Fiat column's, about {_diff:.2f}. Find them by name in get_feature_names_out()."
_lada = _ref.predict(_pd.DataFrame({"make": ["Lada"], "age": [3.0], "mileage": [40.0]}))[0]
assert _np.isclose(lada, _lada), f"lada should be about {_lada:.2f}."
f"SUCCESS: R² {_want:.2f} from one pipeline that imputes, scales and encodes inside every fold; and an unseen make, with all its make columns zero, still gets a price ({_lada:.1f}) from its age and mileage instead of an error."
```

Hint: Follow the shape of the flats example: `ColumnTransformer([(name, transformer, columns), ...])` inside `make_pipeline(..., Ridge(alpha=1.0))`. `dict(zip(model[:-1].get_feature_names_out(), model[-1].coef_))` pairs each column name with its weight; the names start with your transformer's name, such as `make__make_BMW`. To predict one car, build a one-row DataFrame with the same column names.
:::

## What you learned

- Every scikit-learn estimator takes its hyperparameters in the constructor, learns in `fit` (which returns `self`), and stores learned values in attributes ending in `_`. Models add `predict` and `score`; transformers add `transform` and `fit_transform`.
- Any step that learns from data (scaling, imputing, selecting, encoding) must be fitted only on training data. Selecting features on all the data before cross-validation made pure noise score 93%; inside a pipeline it scored about chance.
- `Pipeline` / `make_pipeline` chain steps into one estimator; step settings are named `step__parameter` and changed with `set_params`.
- `ColumnTransformer` sends groups of columns to different transformers: `SimpleImputer` for missing values, `StandardScaler` for numbers, `OneHotEncoder(handle_unknown="ignore")` for categories. `get_feature_names_out()` lists the resulting columns.
- Custom transformers need `fit` (returning `self`) and `transform`; inherit from `BaseEstimator` and `TransformerMixin`. `FunctionTransformer` wraps a plain function.
- `pickle` saves and loads a fitted pipeline; load only trusted files, with the same library version.

The flats model used the district as-is and the area as-is. Often the best way to improve a model is not a cleverer algorithm but better features: transformed, combined, or encoded more thoughtfully. That is the next lesson, feature engineering.
