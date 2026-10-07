# Linear regression by least squares

**Linear regression** is the oldest learning method in this series, and still one of the most used. It fits a straight line (or, with several features, a flat plane) through data, and it is the starting point for understanding almost every other model: logistic regression, neural networks and many more are built from the same pieces.

You have already fitted lines twice: with `np.linalg.lstsq` in the linear systems lesson, and with gradient descent in the last lesson. This lesson derives the exact answer for a line with one feature, using the calculus from the gradients lesson, so you can see precisely where it comes from. Then it covers what matters in practice: interpreting the fitted numbers, checking the fit by looking at the errors it leaves, and measuring how much of the variation it explains.

## The problem

You have `n` examples, each with one feature `xᵢ` and a label `yᵢ`. The model is a line:

\[
\hat{y} = w x + b
\]

and the loss is the mean squared error:

\[
L(w, b) = \frac{1}{n} \sum_{i=1}^{n} (w x_i + b - y_i)^2
\]

"Least squares" means choosing the `w` and `b` that make this as small as possible. The gradient descent in the last lesson found them by walking downhill. But for this loss there is a shortcut: the bottom of the valley can be found exactly, in one step.

## Finding the bottom exactly

At the lowest point of a smooth valley the ground is flat in every direction, so both partial derivatives are zero there. The gradients lesson worked them out:

\[
\frac{\partial L}{\partial b} = \frac{2}{n} \sum_i (w x_i + b - y_i) = 0
\qquad
\frac{\partial L}{\partial w} = \frac{2}{n} \sum_i (w x_i + b - y_i)\, x_i = 0
\]

Solve them. The first equation, divided by 2 and with the sum split up, says the average error is zero: `w x̄ + b − ȳ = 0`, where `x̄` and `ȳ` are the means of the `x` and `y` values. So

\[
b = \bar{y} - w \bar{x}
\]

which says the best line always passes through the point `(x̄, ȳ)`, the centre of the data. Substituting this `b` into the second equation turns each error into `w(xᵢ − x̄) − (yᵢ − ȳ)`, so the equation becomes

\[
\sum_i \big(w(x_i - \bar{x}) - (y_i - \bar{y})\big)\, x_i = 0
\]

The deviations `xᵢ − x̄` add up to zero, so replacing the final `xᵢ` by `xᵢ − x̄` subtracts `x̄` times a sum that is zero, and changes nothing. Then split the sum and solve for `w`, which gives the slope:

\[
w = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sum_i (x_i - \bar{x})^2}
\]

Look at the top and bottom: the top is `n` times the covariance of `x` and `y`, and the bottom is `n` times the variance of `x`, from the expectation lesson. So the slope is simply

\[
w = \frac{\text{Cov}(x, y)}{\text{Var}(x)}
\]

It makes sense: the more `y` moves together with `x` (covariance), the steeper the line, scaled by how spread out `x` is. (If you compute this with NumPy, use the same divisor for both: `np.cov` divides by `n − 1` but `np.var` by `n` unless you pass `ddof=1`, and mixing them gives a slightly wrong slope.) Check it against NumPy's own least squares fit:

```python type
import numpy as np

rng = np.random.default_rng(0)
x = rng.uniform(0, 10, 50)
y = 2.5 * x + 4 + rng.normal(0, 2, 50)

w = np.sum((x - x.mean()) * (y - y.mean())) / np.sum((x - x.mean()) ** 2)
b = y.mean() - w * x.mean()
print(f"formula:    w = {w:.4f}, b = {b:.4f}")
print("np.polyfit:", np.polyfit(x, y, 1).round(4))
```

```output
formula:    w = 2.6047, b = 3.5149
np.polyfit: [2.6047 3.5149]
```

They agree exactly. No searching, no step size, no iterations: the formula goes straight to the best line.

## What the numbers mean

The fitted numbers have plain meanings, and reading them is often the whole point of fitting a regression. Take the children's heights from the linear systems lesson:

```python type
import numpy as np

ages = np.array([2, 3, 4, 5, 6, 7, 8, 9])
heights = np.array([86, 95, 102, 109, 115, 121, 127, 133])
w = np.sum((ages - ages.mean()) * (heights - heights.mean())) / np.sum((ages - ages.mean()) ** 2)
b = heights.mean() - w * ages.mean()
print(f"height ≈ {w:.2f} × age + {b:.2f}")
print("predicted height at 6.5 years:", round(w * 6.5 + b, 1))
print("'predicted' height at 40 years:", round(w * 40 + b, 1))
```

```output
height ≈ 6.57 × age + 74.86
predicted height at 6.5 years: 117.6
'predicted' height at 40 years: 337.7
```

- The **slope** `w` has units of "label units per feature unit": about 6.6 cm per year. Each extra year of age goes with about 6.6 cm more height, **within this data**.
- The **intercept** `b` is the prediction when the feature is 0: about 75 cm at age 0, far more than a newborn's length of roughly 50 cm. An intercept is often meaningless like this, because the data may contain no examples near zero. (The BMI fit later in this lesson has an intercept of about −118: a negative disease progression at a BMI of 0, which no patient has.)

The last line shows the danger of using the line outside the range it was fitted on, which is called **extrapolation**: it predicts a 40-year-old is about 3.4 metres tall. Children grow roughly linearly between 2 and 9; adults do not grow at all. A regression line describes the relationship where the data is. Beyond that it is a guess, and often a bad one.

## Residuals: what the line leaves unexplained

The differences between the true labels and the line's predictions, `yᵢ − ŷᵢ`, are called **residuals**. They are what the model failed to explain, and looking at them is the best way to check whether a straight line was the right choice.

Here are two datasets, each fitted with the best straight line. Predict which residual plot will show a problem:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
x = rng.uniform(0, 10, 80)
datasets = {"straight": 3 * x + 2 + rng.normal(0, 2, 80),
            "curved": 0.4 * (x - 5) ** 2 + 3 * x + rng.normal(0, 2, 80)}

fig, axes = plt.subplots(2, 2, figsize=(10, 6))
for column, (name, y) in enumerate(datasets.items()):
    w, b = np.polyfit(x, y, 1)
    residuals = y - (w * x + b)
    axes[0, column].scatter(x, y, s=10)
    axes[0, column].plot(np.sort(x), w * np.sort(x) + b, color="tab:red")
    axes[0, column].set_title(f"{name} data")
    axes[1, column].scatter(x, residuals, s=10)
    axes[1, column].axhline(0, color="gray")
    axes[1, column].set_title("residuals")
plt.tight_layout()
plt.show()
```

(`plt.tight_layout()` adjusts the spacing so the titles of a grid of plots do not overlap.)

For the straight data, the residuals are a shapeless band around zero: the line has captured everything except random noise, which is exactly what you want. For the curved data, the residuals form a clear **U shape**: positive at both ends, negative in the middle. Any pattern in the residuals means the model is missing something systematic, here a curve. A straight line fitted to curved data still gives you numbers, and nothing warns you; the residual plot is how you find out.

## R²: how much does the line explain?

How good is the fit? The last lesson compared a model's loss with the baseline that always predicts the mean. The standard way to report a regression does exactly that, as a single number called **R²** (R squared), the **coefficient of determination**:

\[
R^2 = 1 - \frac{\sum_i (y_i - \hat{y}_i)^2}{\sum_i (y_i - \bar{y})^2}
\]

The top is the squared error the model leaves; the bottom is the squared error of the baseline that predicts the mean. So R² is the fraction of the baseline's error that the model removes: the fraction of the variation in `y` that the model **explains**. An R² of 1 means a perfect fit; 0 means no better than predicting the mean; and on new data it can even be negative, if the model is worse than the mean.

```python type
import numpy as np

def r_squared(y, y_pred):
    return 1 - np.sum((y - y_pred) ** 2) / np.sum((y - y.mean()) ** 2)

rng = np.random.default_rng(2)
x = rng.uniform(0, 10, 100)
for noise in [1, 5, 15]:
    y = 3 * x + 2 + rng.normal(0, noise, 100)
    w, b = np.polyfit(x, y, 1)
    r2 = r_squared(y, w * x + b)
    print(f"noise {noise:>2}: w = {w:.2f}, R² = {r2:.3f}, r² = {np.corrcoef(x, y)[0, 1] ** 2:.3f}")
```

```output
noise  1: w = 2.98, R² = 0.988, r² = 0.988
noise  5: w = 2.98, R² = 0.694, r² = 0.694
noise 15: w = 2.24, R² = 0.164, r² = 0.164
```

With little noise, the line explains almost all the variation; with a lot, only a small part. The slope is also estimated less precisely as noise grows, but the main change is that most of the variation in `y` is noise that no line can explain. For a line with a single feature, R² equals the square of the correlation `r` from the expectation lesson, as the last column shows.

## A real example

The exploration lesson found that BMI was the strongest single predictor of diabetes progression, with a correlation of about 0.59. Fit the line:

```python type
import numpy as np
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
x = df["bmi"].to_numpy()
y = df["target"].to_numpy()

w = np.sum((x - x.mean()) * (y - y.mean())) / np.sum((x - x.mean()) ** 2)
b = y.mean() - w * x.mean()
pred = w * x + b
r2 = 1 - np.sum((y - pred) ** 2) / np.sum((y - y.mean()) ** 2)
print(f"progression ≈ {w:.1f} × BMI + {b:.1f}")
print(f"R² = {r2:.3f}")
```

```output
progression ≈ 10.2 × BMI + -117.8
R² = 0.344
```

Each extra point of BMI goes with about 10 more units of disease progression, and BMI alone explains about 34% of the variation (0.586² ≈ 0.34). That matches the exploration exactly: a clear relationship, but most of the variation left unexplained. Note that this R² is measured on the same data the line was fitted to. With only two parameters and 442 patients, it will be close to what a held-out test set would show, but a real evaluation measures it on data the model has not seen, as the last lesson explained. Combining several features, in the multiple regression lesson, will do better.

## The same thing in scikit-learn

**scikit-learn** is Python's main machine learning library, and every model in it follows the same pattern: create the model, `fit` it to training data, then `predict`. Here is the same fit:

```python type
from sklearn.datasets import load_diabetes
from sklearn.linear_model import LinearRegression

df = load_diabetes(as_frame=True, scaled=False).frame
model = LinearRegression()
model.fit(df[["bmi"]], df["target"])
print(model.coef_, model.intercept_)
print("R²:", round(model.score(df[["bmi"]], df["target"]), 3))
```

```output
[10.23312787] -117.7733665665647
R²: 0.344
```

The fitted slope is in `coef_` and the intercept in `intercept_` (a trailing underscore is scikit-learn's convention for values learned from data), and `score` returns R². Notice `df[["bmi"]]` with double brackets: scikit-learn always expects the features as a 2D table, even when there is only one feature. You will use scikit-learn increasingly in later lessons; having built the model yourself, you know exactly what `fit` is doing.

## One point can pull the line

Because the loss squares every error, a single point far from the others has a huge effect: the line bends towards it to avoid one enormous squared error. Predict how much one bad data point changes the slope:

```python type
import numpy as np

rng = np.random.default_rng(3)
x = rng.uniform(0, 10, 30)
y = 2 * x + 1 + rng.normal(0, 1, 30)
print("slope without the outlier:", np.polyfit(x, y, 1)[0].round(3))
x_bad = np.append(x, 10)
y_bad = np.append(y, -30)
print("slope with one outlier:   ", np.polyfit(x_bad, y_bad, 1)[0].round(3))
```

```output
slope without the outlier: 1.941
slope with one outlier:    0.942
```

One data-entry error out of 31 points roughly halves the slope, from about 1.9 to about 0.9. This is why the exploration lesson looked for extreme values before modelling, and why the next lesson looks at losses that are less sensitive to them.

::: challenge Least squares from the formula [easy]
Write a function `fit_line(x, y)` that returns `(w, b)`, the least squares slope and intercept, using the formulas from the lesson: `w` as the sum of products of deviations over the sum of squared deviations of `x`, and `b = ȳ − w x̄`. Do not use `np.polyfit`, `np.linalg.lstsq` or scikit-learn; the check compares with them.

```python starter
import numpy as np

def fit_line(x, y):
    return 0.0, 0.0

print(fit_line(np.array([1.0, 2, 3, 4]), np.array([3.0, 5, 7, 9])))
```

```python solution
import numpy as np

def fit_line(x, y):
    w = np.sum((x - x.mean()) * (y - y.mean())) / np.sum((x - x.mean()) ** 2)
    b = y.mean() - w * x.mean()
    return float(w), float(b)

print(fit_line(np.array([1.0, 2, 3, 4]), np.array([3.0, 5, 7, 9])))
```

```python test
import numpy as _np
assert "fit_line" in dir(), "Keep the function's name as fit_line."
assert "polyfit" not in _source and "lstsq" not in _source and "sklearn" not in _source, "Use the formulas, not polyfit, lstsq or scikit-learn."
assert _np.allclose(fit_line(_np.array([1.0, 2, 3, 4]), _np.array([3.0, 5, 7, 9])), (2, 1)), "Points exactly on y = 2x + 1 should give (2, 1)."
_rng = _np.random.default_rng(5)
for _ in range(3):
    _x = _rng.normal(10, 3, 40)
    _y = -1.7 * _x + 12 + _rng.normal(0, 2, 40)
    assert _np.allclose(fit_line(_x, _y), _np.polyfit(_x, _y, 1)), f"For random data the best line is {tuple(_np.polyfit(_x, _y, 1).round(4))}, but fit_line returned {fit_line(_x, _y)}."
"SUCCESS: The exact least squares line, from two short formulas."
```

Hint: Compute the deviations `x − x̄` and `y − ȳ` with `x.mean()` and `y.mean()`. The slope is the sum of their products divided by the sum of the squared `x` deviations.
:::

::: challenge R² [easy]
Write a function `r_squared(y, y_pred)` that returns the coefficient of determination: one minus the sum of squared residuals divided by the sum of squared deviations of `y` from its mean.

```python starter
import numpy as np

def r_squared(y, y_pred):
    return 0.0

print(r_squared(np.array([1.0, 2, 3]), np.array([1.1, 1.9, 3.2])))
```

```python solution
import numpy as np

def r_squared(y, y_pred):
    return float(1 - np.sum((y - y_pred) ** 2) / np.sum((y - y.mean()) ** 2))

print(r_squared(np.array([1.0, 2, 3]), np.array([1.1, 1.9, 3.2])))
```

```python test
import numpy as _np
assert "r_squared" in dir(), "Keep the function's name as r_squared."
_y = _np.array([3.0, 5, 7, 9])
assert _np.isclose(r_squared(_y, _y), 1), "A perfect prediction has R² = 1."
assert _np.isclose(r_squared(_y, _np.full(4, _y.mean())), 0), "Predicting the mean gives R² = 0."
assert r_squared(_y, _np.array([9.0, 7, 5, 3])) < 0, "A prediction worse than the mean gives a negative R²."
_rng = _np.random.default_rng(6)
_yy = _rng.normal(size=50)
_pp = _yy + _rng.normal(0, 0.5, 50)
assert _np.isclose(r_squared(_yy, _pp), 1 - _np.sum((_yy - _pp) ** 2) / _np.sum((_yy - _yy.mean()) ** 2)), "R² is 1 − SSE / SST."
"SUCCESS: The fraction of the variation a model explains."
```

Hint: The top of the fraction is the sum of `(y − y_pred)²`; the bottom is the sum of `(y − ȳ)²`, the error of always predicting the mean.
:::

::: challenge Blood pressure and progression [easy]
Using the diabetes data (loaded as in the lesson, with `scaled=False`), fit a least squares line predicting `target` from the blood pressure column `bp`, using your own formulas (you may copy them from the challenges above). Then set:

- `bp_slope`: the fitted slope,
- `bp_r2`: the R² of the fit on the whole dataset,
- `predicted_at_100`: the predicted progression for a blood pressure of 100.

Compare `bp_r2` with BMI's R² of about 0.34 from the lesson.

```python starter
import numpy as np
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame

bp_slope = 0.0
bp_r2 = 0.0
predicted_at_100 = 0.0
print(bp_slope, bp_r2, predicted_at_100)
```

```python solution
import numpy as np
from sklearn.datasets import load_diabetes

df = load_diabetes(as_frame=True, scaled=False).frame
x = df["bp"].to_numpy()
y = df["target"].to_numpy()

w = np.sum((x - x.mean()) * (y - y.mean())) / np.sum((x - x.mean()) ** 2)
b = y.mean() - w * x.mean()
pred = w * x + b

bp_slope = w
bp_r2 = 1 - np.sum((y - pred) ** 2) / np.sum((y - y.mean()) ** 2)
predicted_at_100 = w * 100 + b
print(bp_slope, bp_r2, predicted_at_100)
```

```python test
import numpy as _np
from sklearn.datasets import load_diabetes as _ld
_df = _ld(as_frame=True, scaled=False).frame
_w, _b = _np.polyfit(_df["bp"], _df["target"], 1)
_pred = _w * _df["bp"] + _b
_r2 = 1 - _np.sum((_df["target"] - _pred) ** 2) / _np.sum((_df["target"] - _df["target"].mean()) ** 2)
assert _np.isclose(bp_slope, _w), f"The fitted slope for bp should be about {_w:.3f}, but bp_slope is {bp_slope}."
assert _np.isclose(bp_r2, _r2), f"The R² should be about {_r2:.3f}, but bp_r2 is {bp_r2}."
assert _np.isclose(predicted_at_100, _w * 100 + _b), f"The prediction at a blood pressure of 100 should be about {_w * 100 + _b:.1f}, but it is {predicted_at_100}."
"SUCCESS: Blood pressure explains about a fifth of the variation, around half as much as BMI."
```

Hint: Select `df["bp"]` and `df["target"]` as arrays, apply the two formulas, then compute R² from the predictions. The prediction at 100 is `w × 100 + b`.
:::

## What you learned

- Least squares chooses `w` and `b` to minimise the mean squared error. Setting both partial derivatives to zero gives the exact answer: `w = Cov(x, y) / Var(x)` and `b = ȳ − w x̄`, so the line passes through the centre of the data.
- The slope is the change in `y` per unit of `x`; the intercept is the prediction at `x = 0`, often meaningless. Predicting outside the range of the data (extrapolation) is unreliable.
- Residuals, `y − ŷ`, show what the model missed. A shapeless band around zero is good; any pattern means the model is missing something systematic.
- R² = 1 − SSE/SST is the fraction of variation explained, comparing the model with predicting the mean. For a single feature it equals r².
- scikit-learn models follow `fit`, `predict`, `score`; learned values end in an underscore, and features are always a 2D table.
- Squared error lets a single outlier pull the line strongly.

Squared error made the maths neat, but it is only one way to measure wrongness, and it has weaknesses, such as its sensitivity to outliers. Next you will compare loss functions and see how the choice of loss changes what a model learns.
