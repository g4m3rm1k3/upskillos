# Fitting a line to data

The lines lesson found the least-squares line through noisy calibration points from two sums. That was the start of something much bigger. The same idea fits curves, surfaces and models with dozens of parameters, provided they are **linear in their parameters**, and it comes with a full account of uncertainty: how precisely the slope is known, and how well the model fits at all. This lesson rewrites least squares in matrix form, so that one line of code fits a straight line, a parabola or a calibration polynomial alike; checks fits with residuals and R²; attaches standard errors to the fitted parameters; solves the same problem in OpenMAT; and shows the trap of fitting too flexible a model.

This lesson covers:

- least squares as an overdetermined matrix system, A c ≈ y;
- residual plots and R² for judging a fit;
- polynomial and other curves that are linear in their parameters;
- standard errors and confidence intervals for slope and intercept;
- the same fit in OpenMAT;
- overfitting, and choosing the simplest adequate model.

## Least squares as a matrix problem

::: math
\[ A = \begin{pmatrix} 1 & x_1 \\ 1 & x_2 \\ \vdots & \vdots \\ 1 & x_n \end{pmatrix}, \qquad \min_{\mathbf{c}} \|\mathbf{y} - A\mathbf{c}\|^2, \qquad A^\mathsf{T} A\,\mathbf{c} = A^\mathsf{T}\mathbf{y} \]
- one row per data point; $\mathbf{c} = (c_0, c_1)$: intercept and slope
- the normal equations turn the overdetermined system into a small square one
In code: `np.linalg.solve(A.T @ A, A.T @ emf_mv)` and `np.linalg.lstsq(A, emf_mv, rcond=None)`
:::


Fitting y ≈ c₀ + c₁x to n points gives n equations in 2 unknowns, one per point: c₀ + c₁xᵢ ≈ yᵢ. In matrix form A c ≈ y, where the **design matrix** A has a column of ones (for the intercept) and a column of x values. With more equations than unknowns the system is **overdetermined**: no c satisfies them all, so least squares picks the c minimising the squared length of the residual vector, ‖y − A c‖². The minimum satisfies the **normal equations**

\[ A^\mathsf{T} A \, \mathbf{c} = A^\mathsf{T} \mathbf{y} \]

a small square system. Library routines such as `np.linalg.lstsq` solve the least-squares problem directly by more stable methods, covered in the linear algebra block. Predict before running: do the normal equations, `lstsq` and the two-sum formulas of the lines lesson give the same thermocouple calibration?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

temp_c = np.array([0, 50, 100, 150, 200, 250, 300, 350, 400], dtype=float)
emf_mv = np.array([0.002, 1.982, 3.983, 5.990, 8.021, 10.060, 12.122, 14.192, 16.281])

A = np.column_stack([np.ones_like(temp_c), temp_c])
normal = np.linalg.solve(A.T @ A, A.T @ emf_mv)
lstsq, *_ = np.linalg.lstsq(A, emf_mv, rcond=None)
dx = temp_c - temp_c.mean()
slope = (dx * (emf_mv - emf_mv.mean())).sum() / (dx ** 2).sum()
print("normal equations:", normal)
print("lstsq:           ", lstsq)
print("two-sum formulas:", np.array([emf_mv.mean() - slope * temp_c.mean(), slope]))
print(f"sensitivity {lstsq[1] * 1000:.2f} µV per °C")
```

```output
normal equations: [-0.06926667  0.040698  ]
lstsq:            [-0.06926667  0.040698  ]
two-sum formulas: [-0.06926667  0.040698  ]
sensitivity 40.70 µV per °C
```

`np.linalg.lstsq` returns the coefficients plus diagnostic extras, which `*_` discards. `rcond=None` selects NumPy's current default for treating tiny singular values as zero.

All three agree: an intercept of about −0.069 mV and a slope of 0.04070 mV per °C, a sensitivity of 40.7 µV/°C, close to a type K thermocouple's 41 µV/°C. The matrix form is the one to remember, because it generalises with no new algebra.

## Residuals and R²

::: math
\[ R^2 = 1 - \frac{\text{SSE}}{\text{SST}}, \qquad \text{SSE} = \sum_i r_i^2, \qquad \text{SST} = \sum_i (y_i - \bar{y})^2 \]
- $r_i = y_i - \hat{y}_i$: residuals; a pattern in them means the model's shape is wrong
- $R^2$ near 1 does not prove the model is right
In code: `resid = emf_mv - A @ lstsq`, then `1 - sse / sst`
:::


A fitted line always exists, so the question is whether it **fits**. Two tools answer it. The **coefficient of determination** R² = 1 − SSE/SST compares the residual sum of squares SSE with the total variation SST = Σ(yᵢ − ȳ)²: R² = 1 means a perfect fit, 0 means the line explains nothing. A **residual plot** is far more informative: residuals scattered randomly about zero mean the model's shape is right; a curve or trend in them means it is wrong, however high R² is. Predict before running: R² will be extremely close to 1. Do the residuals look random?

```python type
pred = A @ lstsq
resid = emf_mv - pred
sse = (resid ** 2).sum()
sst = ((emf_mv - emf_mv.mean()) ** 2).sum()
print(f"R² = {1 - sse / sst:.6f}")
print("residuals (µV):", np.round(resid * 1000, 1))

fig, ax = plt.subplots(figsize=(6, 3))
ax.axhline(0, color="grey")
ax.plot(temp_c, resid * 1000, "o-")
ax.set_xlabel("temperature (°C)")
ax.set_ylabel("residual (µV)")
ax.set_title("Straight-line fit residuals")
plt.show()
```

```output
R² = 0.999928
residuals (µV): [ 71.3  16.4 -17.5 -45.4 -49.3 -45.2 -18.1  17.   71.1]
```

R² is 0.9999, which sounds like a perfect line. The residuals tell a different story: about +71 µV at both ends and −49 µV in the middle, a smooth U shape, the signature of curvature the line cannot follow. Real thermocouples are slightly non-linear, and calibration tables use polynomials. R² alone would never have revealed it.

## Curves that are linear in their parameters

::: math
\[ y \approx c_0 + c_1 x + c_2 x^2, \qquad A = \begin{pmatrix} 1 & x_i & x_i^2 \end{pmatrix}_{i = 1..n} \]
- linear least squares means linear in the coefficients $c_j$, not in $x$
- any model $\sum_j c_j f_j(x)$ fits the same way, one column per $f_j$
In code: `np.column_stack([np.ones_like(temp_c), temp_c, temp_c ** 2])`, then `lstsq`
:::


"Linear least squares" means linear in the **coefficients**, not in x. A quadratic c₀ + c₁x + c₂x² is linear in c₀, c₁, c₂: its design matrix simply gains a column of x². Any model of the form c₀f₀(x) + c₁f₁(x) + ... fits the same way, with one column per function: polynomials, sines and cosines, or 1/x terms. Predict before running: does adding an x² column remove the U-shaped residual pattern?

```python type
A2 = np.column_stack([np.ones_like(temp_c), temp_c, temp_c ** 2])
coef2, *_ = np.linalg.lstsq(A2, emf_mv, rcond=None)
resid2 = emf_mv - A2 @ coef2
print("quadratic coefficients:", coef2)
print("residuals (µV):", np.round(resid2 * 1000, 1))
print(f"rms residual: line {np.sqrt((resid ** 2).mean()) * 1000:.1f} µV, quadratic {np.sqrt((resid2 ** 2).mean()) * 1000:.1f} µV")
```

```output
quadratic coefficients: [1.76363636e-03 3.94803377e-02 3.04415584e-06]
residuals (µV): [ 0.2 -1.4  2.8 -2.3  1.4 -2.1  2.2 -0.8  0. ]
rms residual: line 44.6 µV, quadratic 1.7 µV
```

The x² coefficient is small (about 3 × 10⁻⁶ mV/°C²), but it removes the systematic pattern: the quadratic's residuals are a few microvolts with no obvious shape, and the rms residual drops from about 45 µV to under 2 µV. The remaining scatter is the measurement noise, which no model should try to follow.

## Uncertainty of the fit

::: math
\[ s = \sqrt{\frac{\text{SSE}}{n - 2}}, \qquad \text{SE}(c_1) = \frac{s}{\sqrt{\sum_i (x_i - \bar{x})^2}}, \qquad \text{SE}(c_0) = s\sqrt{\frac{1}{n} + \frac{\bar{x}^2}{\sum_i (x_i - \bar{x})^2}} \]
- $n - 2$: two parameters were fitted
- 95% interval: $c_1 \pm t_{n-2}\,\text{SE}(c_1)$
In code: `s = math.sqrt(((counts - X @ [c0, c1]) ** 2).sum() / (n - 2))`
:::


Fitted coefficients are estimates and deserve standard errors. For a straight line with n points, the residual standard deviation is s = √(SSE/(n − 2)), dividing by n − 2 because two parameters were fitted (the same reasoning as n − 1 for a mean). Then

\[ \text{SE}(\text{slope}) = \frac{s}{\sqrt{\sum (x_i - \bar{x})^2}}, \qquad \text{SE}(\text{intercept}) = s\sqrt{\frac{1}{n} + \frac{\bar{x}^2}{\sum (x_i - \bar{x})^2}} \]

and confidence intervals use the t distribution with n − 2 degrees of freedom. SciPy's `stats.linregress` reports the same values. Predict before running: a load cell is calibrated at 8 loads. How precisely is its sensitivity known?

```python type
load_kg = np.array([0, 5, 10, 15, 20, 25, 30, 35], dtype=float)
counts = np.array([412, 1235, 2061, 2880, 3711, 4527, 5362, 6181], dtype=float)
n = len(load_kg)
X = np.column_stack([np.ones(n), load_kg])
(c0, c1), *_ = np.linalg.lstsq(X, counts, rcond=None)
s = math.sqrt(((counts - X @ [c0, c1]) ** 2).sum() / (n - 2))
sxx = ((load_kg - load_kg.mean()) ** 2).sum()
se_slope = s / math.sqrt(sxx)
se_int = s * math.sqrt(1 / n + load_kg.mean() ** 2 / sxx)
t = stats.t.ppf(0.975, n - 2)
print(f"slope {c1:.3f} ± {t * se_slope:.3f} counts/kg (95%), intercept {c0:.1f} ± {t * se_int:.1f}")
r = stats.linregress(load_kg, counts)
print(f"linregress: slope {r.slope:.3f}, SE {r.stderr:.4f} (ours {se_slope:.4f}), intercept SE {r.intercept_stderr:.3f} (ours {se_int:.3f})")
```

```output
slope 164.874 ± 0.281 counts/kg (95%), intercept 410.8 ± 5.9
linregress: slope 164.874, SE 0.1149 (ours 0.1149), intercept SE 2.403 (ours 2.403)
```

The sensitivity is about 164.87 counts per kg, known to within about ±0.28 (95%), roughly 0.2%. The intercept, about 411 counts, is the zero-load reading, known to ±6 counts. Uncertainty in the slope shrinks with more points and with a wider spread of x: calibrating over the full range matters as much as taking many readings.

## The same fit in OpenMAT

::: math
\[ \mathbf{c} = (A^\mathsf{T} A)^{-1} A^\mathsf{T}\mathbf{y} \]
- with more rows than columns, left division returns the least-squares solution
- $A^\mathsf{T}$ is written `A'`; `.^` squares element by element
In code: `c = A \ counts` against `c_normal = (A' * A) \ (A' * counts)`
:::


In MATLAB-style notation, the backslash operator does least squares automatically when the system is overdetermined: `A \ y` with more rows than columns returns the least-squares coefficients. `ones(n, 1)` makes the column of ones and `A'` is the transpose. The cell shares no variables with Python. Predict before running: do the backslash and the normal equations agree for the load cell?

```openmat
load = [0; 5; 10; 15; 20; 25; 30; 35];
counts = [412; 1235; 2061; 2880; 3711; 4527; 5362; 6181];
A = [ones(8, 1) load];
c = A \ counts
c_normal = (A' * A) \ (A' * counts)
resid = counts - A * c;
sse = sum(resid .^ 2)
```

`.^` squares element by element; plain `^` would mean a matrix power.

Both give the same intercept and slope as NumPy, and the residual sum of squares matches. This compactness is why MATLAB-style tools remain popular for calibration and data fitting.

## Too flexible a model

::: math
\[ \text{prediction error} = \sqrt{\frac{1}{m}\sum_{j=1}^{m} \big(y_j^\text{new} - \hat{y}(x_j^\text{new})\big)^2} \]
- a degree $n - 1$ polynomial passes through all $n$ points; degree 7 on 9 points nearly does, and predicts poorly
- judge a model on data it was not fitted to
In code: `np.polyfit(x, y, degree)` for degrees 1 and 7, scored with `np.polyval(coef, x_new)`
:::


A polynomial of degree n − 1 passes exactly through n points: zero residuals, R² = 1. That is not a better model, it is memorising the noise. Between the data points such a fit swings away from the truth, and its predictions are worse than a simple line's. This is **overfitting**, and the cure is to judge a model by how well it predicts data it was **not** fitted to. Predict before running: which predicts the held-back points better, a straight line or a degree-7 polynomial?

```python type
rng = np.random.default_rng(21)
x = np.linspace(0, 10, 9)
y = 2 + 0.5 * x + rng.normal(0, 0.3, x.size)
x_new = np.array([0.6, 3.3, 6.1, 9.4])
y_new = 2 + 0.5 * x_new + rng.normal(0, 0.3, x_new.size)

xs = np.linspace(0, 10, 300)
fig, ax = plt.subplots(figsize=(6, 3.2))
ax.plot(x, y, "ko", label="fitted points")
ax.plot(x_new, y_new, "rs", label="new points")
for degree in [1, 7]:
    coef = np.polyfit(x, y, degree)
    in_rms = np.sqrt(((np.polyval(coef, x) - y) ** 2).mean())
    out_rms = np.sqrt(((np.polyval(coef, x_new) - y_new) ** 2).mean())
    ax.plot(xs, np.polyval(coef, xs), label=f"degree {degree}")
    print(f"degree {degree}: rms error on the fitted points {in_rms:.3f}, on new points {out_rms:.3f}")
ax.set_ylim(0, 9)
ax.legend(fontsize=8)
plt.show()
```

```output
degree 1: rms error on the fitted points 0.299, on new points 0.216
degree 7: rms error on the fitted points 0.113, on new points 0.685
```

`np.polyfit(x, y, degree)` fits a polynomial by least squares (highest power first) and `np.polyval` evaluates it.

The degree-7 polynomial fits its own points better than the line, but on the new points its error is about three times the line's, because it bends to chase noise between the data. The straight line, the true model here, predicts the new points about as well as it fits the old ones. Prefer the simplest model whose residuals look random, and test it on data it has not seen. The hard challenge automates this check.

::: challenge Polynomial fits [easy]
Write `design_matrix(xs, degree)` returning the n × (degree + 1) NumPy array with columns 1, x, x², ..., x^degree. Write `fit_poly(xs, ys, degree)` returning the coefficients **in ascending order** (c₀ first) as a NumPy array, using your design matrix and `np.linalg.lstsq` (not `np.polyfit`). Raise `ValueError` if there are fewer points than coefficients, the lengths differ, or the degree is negative. Then write `r_squared(xs, ys, coeffs)` for ascending coefficients, as a plain float rounded to 6 decimal places.

```python starter
def design_matrix(xs, degree):
    return np.ones((len(xs), 1))

def fit_poly(xs, ys, degree):
    return np.zeros(degree + 1)

def r_squared(xs, ys, coeffs):
    return 0.0

print(fit_poly([0, 1, 2, 3], [1, 3, 5, 7], 1))
```

```python solution
def design_matrix(xs, degree):
    if degree < 0:
        raise ValueError("degree must be non-negative")
    x = np.asarray(xs, dtype=float)
    return np.column_stack([x ** k for k in range(degree + 1)])

def fit_poly(xs, ys, degree):
    x, y = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    if len(x) != len(y) or degree < 0 or len(x) < degree + 1:
        raise ValueError("need matching data with at least degree + 1 points")
    coef, *_ = np.linalg.lstsq(design_matrix(x, degree), y, rcond=None)
    return coef

def r_squared(xs, ys, coeffs):
    x, y = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    pred = design_matrix(x, len(coeffs) - 1) @ np.asarray(coeffs, dtype=float)
    sse = ((y - pred) ** 2).sum()
    sst = ((y - y.mean()) ** 2).sum()
    return round(float(1 - sse / sst), 6)

print(fit_poly([0, 1, 2, 3], [1, 3, 5, 7], 1))
```

```python test
import ast as _ast
for _n in ["design_matrix", "fit_poly", "r_squared"]:
    assert _n in dir(), f"Define {_n}."
_attrs = {_x.attr for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.Attribute)}
assert "polyfit" not in _attrs, "Use your design matrix with lstsq, not polyfit."
assert np.array_equal(design_matrix([1, 2, 3], 2), [[1, 1, 1], [1, 2, 4], [1, 3, 9]]), "Columns 1, x, x²."
assert np.allclose(fit_poly([0, 1, 2, 3], [1, 3, 5, 7], 1), [1, 2]), "Ascending order: intercept first."
_x = np.linspace(-2, 3, 12)
assert np.allclose(fit_poly(_x, 0.5 - _x + 2 * _x ** 2, 2), [0.5, -1, 2]), "Exact quadratic."
_t = np.array([0, 50, 100, 150, 200, 250, 300, 350, 400.0])
_e = np.array([0.02, 2.04, 4.11, 6.12, 8.15, 10.16, 12.23, 14.30, 16.38])
assert np.allclose(fit_poly(_t, _e, 2), np.polyfit(_t, _e, 2)[::-1]), "Matches least squares on the thermocouple data."
for _bad in [([1, 2], [1, 2], 2), ([1, 2, 3], [1, 2], 1), ([1, 2, 3], [1, 2, 3], -1)]:
    try:
        fit_poly(*_bad)
        assert False, f"fit_poly{_bad} should raise ValueError."
    except ValueError:
        pass
assert r_squared([0, 1, 2, 3], [1, 3, 5, 7], [1, 2]) == 1.0 and r_squared([0, 1, 2], [1, 2, 1], [4 / 3, 0]) == 0.0, "Perfect fit and a fit no better than the mean."
assert type(r_squared(_t, _e, fit_poly(_t, _e, 1))) is float, "Return a plain float."
"SUCCESS: One design-matrix column per term, one least-squares solve: lines, parabolas and calibration polynomials all fit the same way."
```

Hint: `np.column_stack([x ** k for k in range(degree + 1)])` builds the design matrix. `np.linalg.lstsq(A, y, rcond=None)[0]` gives the coefficients. For R², predict with the design matrix times the coefficients.
:::

::: challenge Calibration with uncertainty [medium]
Write `line_fit(xs, ys, level=0.95)` that fits y = c₀ + c₁x by least squares and returns a dict with `"slope"`, `"intercept"`, `"se_slope"`, `"se_intercept"` (the lesson's formulas, with s = √(SSE/(n − 2))) and `"ci_slope"`, a `(low, high)` tuple using `scipy.stats.t.ppf` with n − 2 degrees of freedom. All values are plain floats. Raise `ValueError` for fewer than 3 points, mismatched lengths, or all x equal. Then write `predict(fit, x)`, the fitted value at x, and `x_from_reading(fit, y)`, the inverse (the load that gives a reading), raising `ValueError` if the slope is 0.

```python starter
def line_fit(xs, ys, level=0.95):
    return {"slope": 0.0, "intercept": 0.0, "se_slope": 0.0, "se_intercept": 0.0, "ci_slope": (0.0, 0.0)}

def predict(fit, x):
    return 0.0

def x_from_reading(fit, y):
    return 0.0

print(line_fit([0, 5, 10, 15], [412, 1235, 2061, 2880]))
```

```python solution
def line_fit(xs, ys, level=0.95):
    x, y = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    n = len(x)
    if n != len(y) or n < 3:
        raise ValueError("need matching data with at least 3 points")
    sxx = ((x - x.mean()) ** 2).sum()
    if sxx == 0:
        raise ValueError("the x values must not all be equal")
    slope = ((x - x.mean()) * (y - y.mean())).sum() / sxx
    intercept = y.mean() - slope * x.mean()
    s = math.sqrt(((y - intercept - slope * x) ** 2).sum() / (n - 2))
    se_slope = s / math.sqrt(sxx)
    se_int = s * math.sqrt(1 / n + x.mean() ** 2 / sxx)
    t = stats.t.ppf(0.5 + level / 2, n - 2)
    return {"slope": float(slope), "intercept": float(intercept), "se_slope": float(se_slope),
            "se_intercept": float(se_int), "ci_slope": (float(slope - t * se_slope), float(slope + t * se_slope))}

def predict(fit, x):
    return fit["intercept"] + fit["slope"] * x

def x_from_reading(fit, y):
    if fit["slope"] == 0:
        raise ValueError("a zero slope cannot be inverted")
    return (y - fit["intercept"]) / fit["slope"]

print(line_fit([0, 5, 10, 15], [412, 1235, 2061, 2880]))
```

```python test
for _n in ["line_fit", "predict", "x_from_reading"]:
    assert _n in dir(), f"Define {_n}."
_x = np.array([0, 5, 10, 15, 20, 25, 30, 35], dtype=float)
_y = np.array([412, 1235, 2061, 2880, 3711, 4527, 5362, 6181], dtype=float)
_f = line_fit(_x, _y)
_r = stats.linregress(_x, _y)
for _k, _v in [("slope", _r.slope), ("intercept", _r.intercept), ("se_slope", _r.stderr), ("se_intercept", _r.intercept_stderr)]:
    assert abs(_f[_k] - _v) < 1e-9 * max(1, abs(_v)), f"{_k}: expected {_v}, got {_f[_k]}."
    assert type(_f[_k]) is float, f"{_k} must be a plain float."
_t = stats.t.ppf(0.975, 6)
assert abs(_f["ci_slope"][0] - (_r.slope - _t * _r.stderr)) < 1e-9 and abs(_f["ci_slope"][1] - (_r.slope + _t * _r.stderr)) < 1e-9, "95% interval with n - 2 degrees of freedom."
_f99 = line_fit(_x, _y, 0.99)
assert _f99["ci_slope"][0] < _f["ci_slope"][0], "A 99% interval is wider."
assert abs(predict(_f, 12.5) - (_r.intercept + 12.5 * _r.slope)) < 1e-9 and abs(x_from_reading(_f, predict(_f, 17.3)) - 17.3) < 1e-9, "Prediction and its inverse."
for _bad in [([1, 2], [1, 2]), ([1, 2, 3], [1, 2]), ([2, 2, 2], [1, 2, 3])]:
    try:
        line_fit(*_bad)
        assert False, f"line_fit{_bad} should raise ValueError."
    except ValueError:
        pass
try:
    x_from_reading({"slope": 0.0, "intercept": 1.0}, 5)
    assert False, "A zero slope should raise ValueError."
except ValueError:
    pass
"SUCCESS: A calibration line with standard errors and a confidence interval: the sensitivity, and how well it is known."
```

Hint: Compute the slope and intercept from the centred sums, then the residuals and s with n − 2. The two standard-error formulas are in the lesson; the interval is slope ± t × SE with `stats.t.ppf(0.5 + level / 2, n - 2)`.
:::

::: challenge Choosing the degree [hard]
**Leave-one-out cross-validation** judges a model by its predictions: for each point in turn, fit the model to all the **other** points, predict the left-out one, and record the squared prediction error. The mean of those errors estimates how well the model predicts new data. Write `loo_error(xs, ys, degree)` returning that mean squared error as a plain float, using least-squares polynomial fits (`np.polyfit` is allowed here); raise `ValueError` if there are not at least degree + 2 points. Then write `choose_degree(xs, ys, max_degree)`: return the degree from 0 to `max_degree` with the smallest leave-one-out error, preferring the **lower** degree unless a higher one is better by more than 5% (that is, only switch to a higher degree when its error is below 0.95 times the best so far).

```python starter
def loo_error(xs, ys, degree):
    return 0.0

def choose_degree(xs, ys, max_degree):
    return max_degree

print(choose_degree(np.linspace(0, 10, 12), 2 + 0.5 * np.linspace(0, 10, 12), 4))
```

```python solution
def loo_error(xs, ys, degree):
    x, y = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    n = len(x)
    if n < degree + 2 or len(y) != n:
        raise ValueError("need at least degree + 2 points")
    errors = []
    for i in range(n):
        keep = np.arange(n) != i
        coef = np.polyfit(x[keep], y[keep], degree)
        errors.append((np.polyval(coef, x[i]) - y[i]) ** 2)
    return float(np.mean(errors))

def choose_degree(xs, ys, max_degree):
    best_degree, best_error = 0, loo_error(xs, ys, 0)
    for d in range(1, max_degree + 1):
        e = loo_error(xs, ys, d)
        if e < 0.95 * best_error:
            best_degree, best_error = d, e
    return best_degree

print(choose_degree(np.linspace(0, 10, 12), 2 + 0.5 * np.linspace(0, 10, 12), 4))
```

```python test
import warnings as _w
for _n in ["loo_error", "choose_degree"]:
    assert _n in dir(), f"Define {_n}."
_x = np.linspace(0, 10, 12)
assert loo_error(_x, 2 + 0.5 * _x, 1) < 1e-20, "A perfect line predicts every left-out point."
assert abs(loo_error([0, 1, 2], [0, 0, 3], 0) - ((1.5 ** 2 + 1.5 ** 2 + 3 ** 2) / 3)) < 1e-12, "Degree 0 predicts the mean of the others."
assert type(loo_error(_x, _x ** 2, 2)) is float, "Return a plain float."
try:
    loo_error([1, 2, 3], [1, 2, 3], 2)
    assert False, "Too few points for the degree should raise ValueError."
except ValueError:
    pass
_rng = np.random.default_rng(291)
_yl = 2 + 0.5 * _x + _rng.normal(0, 0.3, _x.size)
_yq = 1 - 0.8 * _x + 0.15 * _x ** 2 + _rng.normal(0, 0.3, _x.size)
with _w.catch_warnings():
    _w.simplefilter("ignore")
    _dl, _dq = choose_degree(_x, _yl, 6), choose_degree(_x, _yq, 6)
assert _dl == 1, f"Noisy linear data should choose degree 1; got {_dl}."
assert _dq == 2, f"Noisy quadratic data should choose degree 2; got {_dq}."
assert choose_degree(_x, np.full(_x.size, 3.0) + _rng.normal(0, 0.1, _x.size), 3) == 0, "Flat noisy data: a constant."
"SUCCESS: Leaving each point out in turn measures prediction, not fit; with a small preference for simpler models it picks the true degree instead of the most flexible one."
```

Hint: For each i, fit with `np.polyfit(x[keep], y[keep], degree)` where `keep` excludes i, and evaluate at x[i] with `np.polyval`. In `choose_degree`, walk up from degree 0, switching only when a higher degree's error is below 0.95 times the best so far.
:::

## What you learned

- Least squares solves the overdetermined system A c ≈ y; the normal equations AᵀAc = Aᵀy give the solution, and `lstsq` computes it stably.
- R² near 1 is not enough: residual plots reveal a wrong model shape (a U means missed curvature).
- Any model linear in its coefficients fits the same way, one design-matrix column per term.
- Slope and intercept have standard errors from s = √(SSE/(n − 2)); intervals use t with n − 2 degrees of freedom. A wider spread of x pins the slope down.
- OpenMAT's backslash does least squares for overdetermined systems.
- Flexible models overfit; leave-one-out cross-validation measures prediction and favours the simplest adequate model.

The next lesson uses derivatives and search to find the best design: optimisation.
