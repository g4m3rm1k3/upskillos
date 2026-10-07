# Lines, slope and calibration

Most sensors do not measure what you want directly. A pressure transmitter outputs an electric current, a load cell a few millivolts, a digital thermometer a count from 0 to 4095. Turning that raw signal into bar, kilograms or degrees is **calibration**, and for most sensors the relationship is a straight line. Lines are the simplest functions, and among the most useful: two numbers, a slope and an intercept, describe one completely. This lesson treats the line as a tool: slope as a rate, a calibration found from two reference points, checking whether a sensor is really linear, fitting the best line through noisy data, and finding where two lines cross.

This lesson covers:

- slope as a rate of change, and the equation y = mx + b;
- the line through two points, and two-point calibration;
- inverting a line to convert back;
- measuring how far data departs from a line;
- the least-squares line through noisy data;
- where two lines intersect, and break-even problems.

## Slope and intercept

::: math
\[ y = m x + b, \qquad m = \frac{y_2 - y_1}{x_2 - x_1}, \qquad b = y_1 - m x_1 \]
- $m$: slope (here bar per mA); $b$: intercept, the value of $y$ at $x = 0$
- the 4–20 mA transmitter: $p = 0.625\,c - 2.5$ bar
In code: `line_through((4, 0), (20, 10))` returns `m, b`
:::


A line is the graph of y = mx + b. The **slope** m is the change in y per unit change in x, the same everywhere along the line: m = Δy / Δx between any two points on it. The **intercept** b is the value of y when x = 0. In applications both carry units: a slope in bar per milliamp, an intercept in bar.

Given two points (x₁, y₁) and (x₂, y₂), the slope is (y₂ − y₁)/(x₂ − x₁) and then b = y₁ − m x₁. If x₁ = x₂ the line is vertical and has no slope (the division is by zero); it cannot be written as y = mx + b.

The industrial standard for sensor signals is the **4–20 mA current loop**: a pressure transmitter ranged 0 to 10 bar outputs 4 mA at 0 bar and 20 mA at 10 bar. The 4 mA "live zero" means a broken wire, reading 0 mA, cannot be mistaken for zero pressure. Predict before running: what pressure does 12 mA represent?

```python type
import numpy as np
import matplotlib.pyplot as plt

def line_through(p, q):
    (x1, y1), (x2, y2) = p, q
    m = (y2 - y1) / (x2 - x1)
    return m, y1 - m * x1

m, b = line_through((4, 0), (20, 10))
print(f"pressure = {m} × current + ({b})   [bar, with current in mA]")
for current in [4, 8, 12, 16, 20, 2]:
    print(f"{current:>3} mA -> {m * current + b:6.3f} bar")
```

```output
pressure = 0.625 × current + (-2.5)   [bar, with current in mA]
  4 mA ->  0.000 bar
  8 mA ->  2.500 bar
 12 mA ->  5.000 bar
 16 mA ->  7.500 bar
 20 mA -> 10.000 bar
  2 mA -> -1.250 bar
```

The slope is 0.625 bar per mA, since 16 mA of span covers 10 bar, and the intercept is −2.5 bar. 12 mA, halfway through the current span, is 5 bar, halfway through the pressure range. 2 mA gives −1.25 bar, an impossible reading for this sensor. A real controller treats anything well below 4 mA as a fault rather than a pressure, which is exactly why the zero is "live".

## Two-point calibration

::: math
\[ c = m\,p + b \quad\Longleftrightarrow\quad p = \frac{c - b}{m} \]
- the sensor maps pressure $p$ to current $c$; calibration maps $c$ back to $p$
- the inverse line has slope $1/m$
In code: `line_through((4.08, 0), (19.92, 10))` builds the calibrated line from two reference readings
:::


The ideal 4–20 mA line assumes a perfect transmitter. A real one is slightly off: at 0 bar it might read 4.08 mA, at 10 bar 19.92 mA. **Two-point calibration** applies known reference pressures (from a dead-weight tester, say), records the raw readings, and builds the line through those two points instead of the ideal one. Every later reading is converted with the calibrated line.

Calibration needs a line in each direction. The sensor maps pressure to current; the conversion maps current back to pressure. The two are **inverse functions**: if c = m p + b then p = (c − b)/m, whose slope is 1/m. Predict before running: how big is the error at 12 mA if the ideal line is used on this transmitter?

```python type
cal_m, cal_b = line_through((4.08, 0), (19.92, 10))
ideal = lambda c: 0.625 * c - 2.5
calibrated = lambda c: cal_m * c + cal_b
for current in [4.08, 12.0, 19.92]:
    print(f"{current:6.2f} mA: ideal {ideal(current):7.4f} bar, calibrated {calibrated(current):7.4f} bar, error {ideal(current) - calibrated(current):+.4f} bar")

sensor_m, sensor_b = 1 / cal_m, -cal_b / cal_m
print(f"sensor model: current = {sensor_m:.4f} × pressure + {sensor_b:.4f}")
print("round trip 7.3 bar ->", round(calibrated(sensor_m * 7.3 + sensor_b), 12), "bar")
```

```output
  4.08 mA: ideal  0.0500 bar, calibrated  0.0000 bar, error +0.0500 bar
 12.00 mA: ideal  5.0000 bar, calibrated  5.0000 bar, error +0.0000 bar
 19.92 mA: ideal  9.9500 bar, calibrated 10.0000 bar, error -0.0500 bar
sensor model: current = 1.5840 × pressure + 4.0800
round trip 7.3 bar -> 7.3 bar
```

At 12 mA the two lines agree, because this transmitter's errors are symmetric about mid-scale; at the ends the ideal line is off by 0.05 bar, 0.5% of full scale. The sensor model, the inverse line, has slope 1.584 mA per bar instead of the ideal 1.6. The round trip through both lines returns 7.3 bar.

## How linear is it?

::: math
\[ r_i = \hat{y}_i - y_i, \qquad \text{non-linearity} = \frac{\max_i |r_i|}{\text{full scale}} \times 100\% \]
- $\hat{y}_i$: the line's prediction; $y_i$: the true value; $r_i$: the residual
- residuals scattered around zero mean the line fits; a pattern means it does not
In code: `residual = calibrated(read_mA) - true_bar`, then `np.abs(residual).max() / 10`
:::


Two-point calibration assumes the sensor really is a straight line between the reference points. Checking that assumption takes more points: apply several known pressures, convert the readings with the calibrated line, and look at the **residuals**, the differences between the line's prediction and the true value. Instrument datasheets quote the largest residual as the **non-linearity**, as a percentage of full scale. Predict before running: is this transmitter better than 0.25% non-linearity?

```python type
true_bar = np.array([0, 2, 4, 6, 8, 10], dtype=float)
read_mA = np.array([4.08, 7.26, 10.43, 13.60, 16.76, 19.92])
predicted = calibrated(read_mA)
residual = predicted - true_bar
print("residuals (bar):", residual.round(4))
print(f"non-linearity: {np.abs(residual).max() / 10:.3%} of full scale")

fig, ax = plt.subplots(figsize=(6, 3))
ax.axhline(0, color="grey")
ax.plot(true_bar, residual * 1000, "o-")
ax.set_xlabel("applied pressure (bar)")
ax.set_ylabel("residual (mbar)")
ax.set_title("Calibration residuals")
plt.show()
```

```output
residuals (bar): [0.     0.0076 0.0088 0.0101 0.0051 0.    ]
non-linearity: 0.101% of full scale
```

`np.abs(residual).max() / 10` divides the worst error by the 10 bar full scale; the `:.3%` format multiplies by 100 and adds a percent sign.

The residuals are up to about 10 mbar, largest mid-range, giving a non-linearity of about 0.1%, well inside 0.25%. Plotting residuals is far more sensitive than plotting the data: on a graph of current against pressure these points look perfectly straight, while the residual plot shows a slight bow, the sensor's real behaviour.

## The best line through noisy data

::: math
\[ m = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sum_i (x_i - \bar{x})^2}, \qquad b = \bar{y} - m\,\bar{x} \]
- this least-squares line minimises $\sum_i \big(y_i - (m x_i + b)\big)^2$
- it always passes through the point of means $(\bar{x}, \bar{y})$
In code: `((x - xbar) * (y - ybar)).sum() / ((x - xbar) ** 2).sum()`, the same as `np.polyfit(x, y, 1)`
:::


With many noisy points there is no single line through all of them. The standard choice is the **least-squares line**: the m and b that make the sum of squared residuals, Σ(yᵢ − (m xᵢ + b))², as small as possible. Calculus (or the linear algebra block) shows the minimum is at

\[ m = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2}, \qquad b = \bar{y} - m \bar{x} \]

where x̄ and ȳ are the means. The line always passes through the point of means (x̄, ȳ). NumPy computes it with `np.polyfit(x, y, 1)`. Predict before running: does the least-squares line have a smaller sum of squared residuals than the line through the first and last points?

```python type
rng = np.random.default_rng(11)
load_kg = np.linspace(0, 50, 11)
counts = 812 + 163.4 * load_kg + rng.normal(0, 40, load_kg.size)

xbar, ybar = load_kg.mean(), counts.mean()
ls_m = ((load_kg - xbar) * (counts - ybar)).sum() / ((load_kg - xbar) ** 2).sum()
ls_b = ybar - ls_m * xbar
print(f"least squares: {ls_m:.3f} counts/kg, intercept {ls_b:.1f};  polyfit: {np.round(np.polyfit(load_kg, counts, 1), 3)}")
tp_m, tp_b = line_through((load_kg[0], counts[0]), (load_kg[-1], counts[-1]))
sse = lambda m, b: ((counts - (m * load_kg + b)) ** 2).sum()
print(f"sum of squared residuals: least squares {sse(ls_m, ls_b):,.0f}, two-point {sse(tp_m, tp_b):,.0f}")
```

```output
least squares: 163.049 counts/kg, intercept 829.0;  polyfit: [163.049 828.999]
sum of squared residuals: least squares 16,084, two-point 29,145
```

The data come from a simulated load cell whose true line is 163.4 counts per kg with an intercept of 812, plus noise.

The least-squares slope comes out close to the true 163.4, and `polyfit` gives the same slope and intercept (829.0 and 828.999 are the same number printed to different precisions). Its sum of squared residuals is smaller than the two-point line's, as it must be: least squares is the minimum. The two-point line trusts its two points completely, so the noise on those two readings goes straight into the slope. Least squares averages the noise across every point. Statistics later says how precise the fitted slope is.

## Where two lines meet

::: math
\[ m_1 x + b_1 = m_2 x + b_2 \quad\Longrightarrow\quad x = \frac{b_2 - b_1}{m_1 - m_2} \]
- defined only when $m_1 \ne m_2$; parallel lines never meet
- break-even: $2000 + 3.5\,n = 500 + 5\,n$ at $n = 1000$ parts
In code: `x = (b2 - b1) / (m1 - m2)`, after checking `m1 == m2`
:::


Two non-parallel lines cross at exactly one point, found by setting their y values equal: m₁x + b₁ = m₂x + b₂ gives x = (b₂ − b₁)/(m₁ − m₂). Parallel lines (equal slopes) never meet; identical lines meet everywhere.

A classic use is **break-even**. Machine A costs £2,000 to set up and £3.50 per part; machine B costs £500 to set up and £5.00 per part. Each total cost is a line in the number of parts, and the crossing is the batch size where they cost the same. Predict before running: above what batch size is machine A cheaper?

```python type
def intersect(m1, b1, m2, b2):
    if m1 == m2:
        return None
    x = (b2 - b1) / (m1 - m2)
    return x, m1 * x + b1

x, cost = intersect(3.50, 2000, 5.00, 500)
print(f"break-even at {x:.0f} parts, where both cost £{cost:,.2f}")
for parts in [500, 1000, 1500]:
    a, b_cost = 2000 + 3.5 * parts, 500 + 5 * parts
    print(f"{parts:>5} parts: A £{a:,.0f}  B £{b_cost:,.0f}  ->", "A" if a < b_cost else "B" if b_cost < a else "either")
```

```output
break-even at 1000 parts, where both cost £5,500.00
  500 parts: A £3,750  B £3,000  -> B
 1000 parts: A £5,500  B £5,500  -> either
 1500 parts: A £7,250  B £8,000  -> A
```

The lines cross at 1,000 parts, where both cost £5,500. Below that the cheaper setup wins; above it the cheaper parts do. The intersection formula divides by m₁ − m₂, which is why parallel lines need a special case.

::: challenge A calibration object [easy]
Write `two_point(raw1, true1, raw2, true2)` that returns a pair of functions `(to_true, to_raw)`: `to_true(raw)` converts a raw reading to the true quantity using the line through the two calibration points, and `to_raw(value)` is its inverse. Raise `ValueError` if the two raw readings are equal (no line), or if the two true values are equal (the line could not be inverted). Then write `scaled_4_20(low, high)`, which returns the `to_true` function for an ideal 4–20 mA transmitter ranged `low` to `high`.

```python starter
def two_point(raw1, true1, raw2, true2):
    to_true = lambda raw: raw
    to_raw = lambda value: value
    return to_true, to_raw

def scaled_4_20(low, high):
    return lambda current: current

to_true, to_raw = two_point(4.08, 0, 19.92, 10)
print(to_true(12), to_raw(5))
```

```python solution
def two_point(raw1, true1, raw2, true2):
    if raw1 == raw2:
        raise ValueError("the two raw readings must differ")
    if true1 == true2:
        raise ValueError("the two true values must differ")
    m = (true2 - true1) / (raw2 - raw1)
    b = true1 - m * raw1
    to_true = lambda raw: m * raw + b
    to_raw = lambda value: (value - b) / m
    return to_true, to_raw

def scaled_4_20(low, high):
    return two_point(4, low, 20, high)[0]

to_true, to_raw = two_point(4.08, 0, 19.92, 10)
print(to_true(12), to_raw(5))
```

```python test
import math as _math
for _n in ["two_point", "scaled_4_20"]:
    assert _n in dir(), f"Define {_n}."
_t, _r = two_point(4.08, 0, 19.92, 10)
assert _math.isclose(_t(12), 5) and _math.isclose(_t(4.08), 0, abs_tol=1e-12) and _math.isclose(_t(19.92), 10), "to_true passes through both calibration points."
assert _math.isclose(_r(5), 12) and _math.isclose(_r(10), 19.92), "to_raw is the inverse."
for _v in [-3, 0.5, 7.3, 42]:
    assert _math.isclose(_t(_r(_v)), _v), "A round trip returns the value."
_t2, _r2 = two_point(1000, 100, 3000, 0)
assert _math.isclose(_t2(2000), 50) and _math.isclose(_r2(25), 2500), "A falling line (negative slope)."
for _bad in [(5, 0, 5, 10), (4, 3, 20, 3)]:
    try:
        two_point(*_bad)
        assert False, f"two_point{_bad} should raise ValueError."
    except ValueError:
        pass
_f = scaled_4_20(-50, 150)
assert _math.isclose(_f(4), -50) and _math.isclose(_f(20), 150) and _math.isclose(_f(12), 50), "A -50 to 150 °C transmitter: 12 mA is 50 °C."
"SUCCESS: A calibration is a line and its inverse, built from two reference points; the 4–20 mA standard is just a particular pair."
```

Hint: Compute the slope `m` and intercept `b` from the two points and return two lambdas that use them: `m * raw + b` and `(value - b) / m`.
:::

::: challenge Fitting and checking linearity [medium]
Write `fit_line(xs, ys)` returning the least-squares `(m, b)` using the lesson's formulas, **without** `np.polyfit`, `np.linalg.lstsq` or any other fitting library. Raise `ValueError` if there are fewer than 2 points, the lengths differ, or all x values are equal. Return plain Python floats (convert with `float(...)`). Then write `nonlinearity(xs, ys, full_scale)`: fit the least-squares line, and return the largest absolute residual as a percentage of `full_scale`, rounded to 3 decimal places.

```python starter
def fit_line(xs, ys):
    return np.polyfit(xs, ys, 1)

def nonlinearity(xs, ys, full_scale):
    return 0.0

print(fit_line([0, 1, 2], [1, 3, 5]))
```

```python solution
def fit_line(xs, ys):
    x, y = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    if len(x) != len(y) or len(x) < 2:
        raise ValueError("need two equal-length sequences of at least 2 points")
    dx = x - x.mean()
    sxx = (dx ** 2).sum()
    if sxx == 0:
        raise ValueError("the x values must not all be equal")
    m = (dx * (y - y.mean())).sum() / sxx
    return float(m), float(y.mean() - m * x.mean())

def nonlinearity(xs, ys, full_scale):
    m, b = fit_line(xs, ys)
    residual = np.asarray(ys, dtype=float) - (m * np.asarray(xs, dtype=float) + b)
    return round(float(np.abs(residual).max() / full_scale * 100), 3)

print(fit_line([0, 1, 2], [1, 3, 5]))
```

```python test
import ast as _ast, math as _math
for _n in ["fit_line", "nonlinearity"]:
    assert _n in dir(), f"Define {_n}."
_names = {(_n.attr if isinstance(_n, _ast.Attribute) else _n.id) for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, (_ast.Attribute, _ast.Name))}
for _banned in ["polyfit", "lstsq", "linregress", "Polynomial"]:
    assert _banned not in _names, f"Use the least-squares formulas instead of {_banned}."
_m, _b = fit_line([0, 1, 2], [1, 3, 5])
assert _math.isclose(_m, 2) and _math.isclose(_b, 1), "Exact data gives the exact line."
_rng = np.random.default_rng(12)
_x = _rng.uniform(0, 100, 40); _y = 3.2 * _x - 7 + _rng.normal(0, 5, 40)
_ref = np.polyfit(_x, _y, 1)
_m, _b = fit_line(_x, _y)
assert _math.isclose(_m, _ref[0], rel_tol=1e-9) and _math.isclose(_b, _ref[1], rel_tol=1e-9), "Must agree with least squares on noisy data."
assert all(type(_v) is float for _v in fit_line([1, 2, 3], [2, 4, 7])), "Return plain floats."
for _bad in [([1], [1]), ([1, 2], [1]), ([3, 3, 3], [1, 2, 3])]:
    try:
        fit_line(*_bad)
        assert False, f"fit_line{_bad} should raise ValueError."
    except ValueError:
        pass
assert nonlinearity([0, 1, 2, 3], [0, 1, 2, 3], 3) == 0.0, "A perfect line has zero non-linearity."
assert nonlinearity([0, 1, 2], [0, -2, 0], 10) == 13.333 and nonlinearity([0, 1, 2], [0, 2, 0], 10) == 13.333, f"Fit y = 2/3; worst residual 4/3 = 13.333% of 10; got {nonlinearity([0, 1, 2], [0, 2, 0], 10)}."
"SUCCESS: The least-squares line from two sums, and a datasheet-style non-linearity figure from its residuals."
```

Hint: With `dx = x - x.mean()`, the slope is `(dx * (y - y.mean())).sum() / (dx ** 2).sum()` and the intercept is `y.mean() - m * x.mean()`. Residuals are `y - (m * x + b)`.
:::

::: challenge Lines in general form [hard]
The form y = mx + b cannot describe vertical lines, which are common in geometry (x = 40 is a vertical edge of a part). The **general form** a x + b y = c describes every line, including vertical ones (b = 0). Write `line_from_points(p, q)` returning `(a, b, c)` with `a = y2 - y1`, `b = x1 - x2` and `c = a * x1 + b * y1`; raise `ValueError` if p and q are the same point. Write `meet(l1, l2)` for two lines in general form: return the intersection point `(x, y)` (by Cramer's rule: with `det = a1*b2 - a2*b1`, x = (c1*b2 − c2*b1)/det and y = (a1*c2 − a2*c1)/det), or `None` if the lines are parallel and distinct. Raise `ValueError` if a line has a = b = 0, or if the two lines are the same line (every coefficient proportional, for example 2x + 4y = 6 and x + 2y = 3). The tests use whole-number coefficients, so `det == 0` is an exact test. Finally write `segments_cross(p1, p2, q1, q2)`: whether the line segment from p1 to p2 and the segment from q1 to q2 share a point, using `meet` and checking that the point lies within both segments' x and y ranges (inclusive). Return False for parallel segments, and also for segments on the same line (a simplification).

```python starter
def line_from_points(p, q):
    return (0, 0, 0)

def meet(l1, l2):
    return None

def segments_cross(p1, p2, q1, q2):
    return False

print(meet(line_from_points((0, 0), (4, 4)), line_from_points((0, 4), (4, 0))))
```

```python solution
def line_from_points(p, q):
    (x1, y1), (x2, y2) = p, q
    if (x1, y1) == (x2, y2):
        raise ValueError("two distinct points are needed")
    a, b = y2 - y1, x1 - x2
    return (a, b, a * x1 + b * y1)

def meet(l1, l2):
    (a1, b1, c1), (a2, b2, c2) = l1, l2
    if (a1 == 0 and b1 == 0) or (a2 == 0 and b2 == 0):
        raise ValueError("a and b cannot both be zero")
    det = a1 * b2 - a2 * b1
    if det == 0:
        if a1 * c2 - a2 * c1 == 0 and b1 * c2 - b2 * c1 == 0:
            raise ValueError("the lines are the same line")
        return None
    return ((c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det)

def segments_cross(p1, p2, q1, q2):
    try:
        point = meet(line_from_points(p1, p2), line_from_points(q1, q2))
    except ValueError:
        return False
    if point is None:
        return False
    x, y = point
    eps = 1e-9
    def within(a, b):
        return (min(a[0], b[0]) - eps <= x <= max(a[0], b[0]) + eps and
                min(a[1], b[1]) - eps <= y <= max(a[1], b[1]) + eps)
    return within(p1, p2) and within(q1, q2)

print(meet(line_from_points((0, 0), (4, 4)), line_from_points((0, 4), (4, 0))))
```

```python test
for _n in ["line_from_points", "meet", "segments_cross"]:
    assert _n in dir(), f"Define {_n}."
assert line_from_points((1, 2), (4, 8)) == (6, -3, 0), f"a = y2 - y1, b = x1 - x2, c = a x1 + b y1; got {line_from_points((1, 2), (4, 8))}."
assert line_from_points((40, 0), (40, 30)) == (30, 0, 1200), "A vertical line: b = 0."
try:
    line_from_points((3, 3), (3, 3))
    assert False, "The same point twice should raise ValueError."
except ValueError:
    pass
assert meet(line_from_points((0, 0), (4, 4)), line_from_points((0, 4), (4, 0))) == (2.0, 2.0), "The diagonals of a square meet at its centre."
assert meet((1, 0, 40), (0, 1, 25)) == (40.0, 25.0), "x = 40 meets y = 25 at (40, 25)."
assert meet((30, 0, 1200), line_from_points((0, 0), (80, 20))) == (40.0, 10.0), "A vertical line meets a sloped one."
assert meet((1, 2, 3), (2, 4, 7)) is None, "Parallel and distinct: None."
for _l1, _l2 in [((2, 4, 6), (1, 2, 3)), ((0, 3, 9), (0, -1, -3)), ((0, 0, 1), (1, 1, 1))]:
    try:
        meet(_l1, _l2)
        assert False, f"meet{(_l1, _l2)} should raise ValueError (same line, or not a line)."
    except ValueError:
        pass
assert meet((1, 0, 0), (2, 0, 6)) is None, "Two different vertical lines are parallel."
assert segments_cross((0, 0), (4, 4), (0, 4), (4, 0)) is True, "Crossing diagonals."
assert segments_cross((0, 0), (1, 1), (0, 4), (4, 0)) is False, "The lines cross at (2, 2), beyond the first segment."
assert segments_cross((0, 0), (2, 2), (0, 4), (4, 0)) is True, "Touching at an end point counts."
assert segments_cross((0, 0), (4, 0), (0, 1), (4, 1)) is False and segments_cross((0, 0), (2, 0), (1, 0), (3, 0)) is False, "Parallel, and collinear (simplified to False)."
assert segments_cross((40, 0), (40, 30), (0, 0), (80, 20)) is True and segments_cross((40, 0), (40, 5), (0, 0), (80, 20)) is False, "A vertical edge."
"SUCCESS: The general form handles every line, vertical ones included, and Cramer's rule finds crossings without dividing by a slope."
```

Hint: For `meet`, compute the determinant; if it is zero the lines are parallel, and they are the same line exactly when `a1*c2 - a2*c1` and `b1*c2 - b2*c1` are also zero. For `segments_cross`, find where the two infinite lines meet, then check the point against each segment's bounding box (allow a tiny tolerance such as 1e-9 for rounding).
:::

## What you learned

- A line y = mx + b has a constant slope m = Δy/Δx (a rate, with units) and an intercept b. Vertical lines have no slope.
- Two-point calibration builds the line through two reference readings; its inverse converts back, with slope 1/m.
- Residuals from a line reveal non-linearity far more clearly than a plot of the data; datasheets quote the worst one as a percentage of full scale.
- The least-squares line minimises the sum of squared residuals, passes through the mean point, and averages out noise that a two-point line absorbs.
- Lines meet where their values are equal, which solves break-even problems. The general form ax + by = c handles vertical lines, and Cramer's rule finds intersections.

The next lesson follows an object's position over time: motion in one dimension.
