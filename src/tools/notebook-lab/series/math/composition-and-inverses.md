# Composition and inverse functions

A measurement passes through a chain of functions. Pressure bends a diaphragm, the bending changes a bridge voltage, an amplifier scales it, an ADC counts it. The reading that reaches the screen is the composition of all of these. Getting the pressure back means undoing the whole chain, in the right order. In practice the forward functions are often known only as calibration tables or fitted curves, not formulas. This lesson treats chains and their inverses: why order matters, why inverting a chain reverses it, how to invert a table or a fitted curve, and why an inverse can magnify noise enormously where the forward function is flat.

This lesson covers:

- composing functions, and why the order matters;
- inverse functions, restricted domains, and the inverse of a chain;
- inverting a calibration table by interpolation;
- inverting a fitted calibration curve: three methods compared;
- the derivative of an inverse, and where measurements lose precision.

## Composition

::: math
\[ (g \circ f)(x) = g\big(f(x)\big), \qquad g \circ f \ne f \circ g \;\text{ in general}, \qquad (h \circ g) \circ f = h \circ (g \circ f) \]
- $g \circ f$ means "apply $f$ first, then $g$": the function written on the right acts first, as with matrices
- composition is associative (brackets do not matter) but not commutative (order does)
In code: `compose(*funcs)` applies its arguments right to left; a unit chain built with it
:::

Applying one function to the output of another is **composition**: (g ∘ f)(x) = g(f(x)). As with the matrix products of the matrices-that-move-points lesson, the function written on the right acts first, and the order matters. "Double, then add 3" sends 5 to 13; "add 3, then double" sends it to 16. Brackets, however, do not matter: a chain of three functions gives the same result however it is grouped. So a long measurement chain can be built and reasoned about piece by piece.

In Python, functions are values. A function can take functions and return a new one, so composition is a two-line helper.

Predict before running: for f(x) = 2x and g(x) = x + 3, what are g(f(5)) and f(g(5))? And what surface speed does 3,000 rpm give on a 40 mm cutter, built as a chain?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

def compose(*funcs):
    def chained(x):
        for f in reversed(funcs):
            x = f(x)
        return x
    return chained

double = lambda x: 2 * x
add3 = lambda x: x + 3
print("g(f(5)) =", compose(add3, double)(5), "  f(g(5)) =", compose(double, add3)(5))

rpm_to_rad_s = lambda n: n * 2 * math.pi / 60
rad_s_to_surface = lambda w: w * 0.020
m_s_to_m_min = lambda v: v * 60
cutting_speed = compose(m_s_to_m_min, rad_s_to_surface, rpm_to_rad_s)
print(f"3,000 rpm on a 40 mm cutter: {cutting_speed(3000):.1f} m/min")
grouped = compose(compose(m_s_to_m_min, rad_s_to_surface), rpm_to_rad_s)
print("grouped differently:", round(grouped(3000), 6) == round(cutting_speed(3000), 6))
```

g(f(5)) = 13 and f(g(5)) = 16: order matters. The cutting-speed chain turns 3,000 rpm into 314.2 rad/s, then into 6.28 m/s at the 20 mm radius, then into 377.0 m/min. Grouping the three steps differently gives the same answer, because composition is associative.

## Inverses, and undoing a chain

::: math
\[ f^{-1}\big(f(x)\big) = x, \qquad (g \circ f)^{-1} = f^{-1} \circ g^{-1}, \qquad y = ax + b \;\Longrightarrow\; f^{-1}(y) = \frac{y - b}{a} \]
- to undo a chain, undo the last step first: socks on then shoes on is undone by shoes off then socks off
- a function that is not one-to-one needs its domain restricted before it has an inverse: $x^2$ on $x \ge 0$ has inverse $\sqrt{y}$
- the graph of $f^{-1}$ is the graph of $f$ reflected in the line $y = x$
In code: the Celsius–Kelvin–Fahrenheit chain inverted in reverse order, and the round trip
:::

The domain lesson showed that only one-to-one functions can be undone. For a function given by a formula, the inverse comes from solving y = f(x) for x, the rearranging lesson's job. An affine function y = ax + b has inverse x = (y − b)/a. A function that repeats values, such as x², must first have its domain restricted (to x ≥ 0, say) so that each output comes from one input.

A chain is undone in **reverse** order: undo the last step first. A Kelvin reading converted to Celsius and then to Fahrenheit is recovered by converting Fahrenheit back to Celsius, then Celsius back to Kelvin. Undoing the steps in the original order gives nonsense. On a graph, swapping x and y reflects every point in the line y = x, so the graph of an inverse is the mirror image of the original.

Predict before running: does undoing the Kelvin → Celsius → Fahrenheit chain in reverse order return the original 300 K, and what does the wrong order give?

```python
K_to_C = lambda k: k - 273.15
C_to_F = lambda c: c * 9 / 5 + 32
C_to_K = lambda c: c + 273.15
F_to_C = lambda f: (f - 32) * 5 / 9
forward = compose(C_to_F, K_to_C)
reading = forward(300.0)
print(f"300 K -> {reading:.2f} °F")
print("undone in reverse order (°F -> °C -> K):", round(compose(C_to_K, F_to_C)(reading), 10))
print("undone in the wrong order (apply C_to_K first):", round(F_to_C(C_to_K(reading)), 4))

xs = np.linspace(0, 2, 200)
fig, ax = plt.subplots(figsize=(4, 4))
ax.plot(xs, xs ** 2, label="x² on x ≥ 0")
ax.plot(xs ** 2, xs, label="its inverse, √y")
ax.plot([0, 4], [0, 4], "k:", lw=1, label="y = x")
ax.set_xlim(0, 4)
ax.set_ylim(0, 4)
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

300 K is 80.33 °F, and the reverse chain returns 300.0 K exactly. The wrong order, adding 273.15 to a Fahrenheit number before converting, gives 178.6: meaningless. The plot shows x² on x ≥ 0 and its inverse √y mirrored in the dotted line y = x. Restricted to x ≥ 0, x² is one-to-one, which is why the mirror image is again a function.

## Inverting a calibration table

::: math
\[ x \approx x_i + (y - y_i)\,\frac{x_{i+1} - x_i}{y_{i+1} - y_i} \quad \text{for } y_i \le y \le y_{i+1} \]
- a strictly increasing table of $(x_i, y_i)$ can be read backwards: interpolate $x$ against $y$ instead of $y$ against $x$
- it works only on the range of the table, and only if the $y_i$ are strictly monotonic
In code: `np.interp(y, mv_cal, p_cal)` with the columns swapped, checked on readings between calibration points
:::

Sensors are calibrated by applying known inputs and recording outputs. For a pressure transducer, that means known pressures and the voltages they produce. The forward function, pressure → mV, then exists only as a table. Measurement needs the inverse, mV → pressure. If the table is strictly monotonic, the inverse is just the same table read the other way round: interpolate pressure against voltage. `np.interp(y, ys, xs)` does exactly that, as long as the ys increase. Between calibration points the result is a straight-line guess, so its accuracy depends on how curved the real function is.

The transducer here produces mV = 2.0p + 0.015p² + 0.4 for pressure p in bar (slightly non-linear, with an offset). It is calibrated at 0, 1, ..., 10 bar with 5 µV of noise.

Predict before running: how accurate is the swapped-table inverse for readings between the calibration points?

```python
rng = np.random.default_rng(64)
true_mv = lambda p: 2.0 * p + 0.015 * p ** 2 + 0.4
p_cal = np.linspace(0, 10, 11)
mv_cal = true_mv(p_cal) + rng.normal(0, 0.005, p_cal.size)
print("calibration voltages strictly increasing?", bool(np.all(np.diff(mv_cal) > 0)))
p_test = np.linspace(0.3, 9.7, 48)
mv_test = true_mv(p_test)
p_interp = np.interp(mv_test, mv_cal, p_cal)
print(f"table inverse: largest error {np.abs(p_interp - p_test).max() * 1000:.1f} mbar over 0.3 to 9.7 bar")
print("a reading beyond the table:", np.interp(30.0, mv_cal, p_cal), "bar  (np.interp silently clamps to the last point)")
```

The calibration voltages increase strictly, so the table can be read backwards. The swapped-table inverse is within about 4.8 mbar everywhere between 0.3 and 9.7 bar, set by the curvature between calibration points and the calibration noise. A reading of 30 mV, far beyond the 10 bar point, comes back as exactly 10 bar. `np.interp` clamps to the ends without any warning, the domain lesson's trap again. A real conversion function must check that the reading lies within the calibrated range.

## Inverting a fitted curve

::: math
\[ \text{forward fit: } y = c_2 p^2 + c_1 p + c_0, \qquad p_{k+1} = p_k - \frac{c_2 p_k^2 + c_1 p_k + c_0 - y}{2 c_2 p_k + c_1}, \qquad \text{or a direct fit: } p \approx d_2 y^2 + d_1 y + d_0 \]
- fit the physics in its natural direction (pressure causes voltage) and invert the fitted curve numerically, or
- fit the inverse directly (pressure as a polynomial in voltage), which is fast to evaluate but is not the model's natural shape
In code: `np.polyfit` both ways; Newton's method on the forward fit for every reading at once
:::

A fitted curve smooths out calibration noise better than a table does, and a quadratic fits this transducer's physics exactly. There are two ways to invert a fitted curve. Fit the forward model (mV as a quadratic in pressure) and solve it for each reading. A quadratic can be solved by formula; for a general curve, Newton's method of the solving-equations lesson works on a whole array of readings at once. Or fit the inverse directly: pressure as a polynomial in mV. That is simpler at run time, but the true inverse is not a quadratic, so the direct fit carries a small model error.

Predict before running: rank the swapped table, the direct inverse fit and Newton's method on the forward fit by their largest error.

```python
fwd = np.polyfit(p_cal, mv_cal, 2)
direct = np.polyfit(mv_cal, p_cal, 2)
p_direct = np.polyval(direct, mv_test)
p_newton = mv_test / 2
slope = np.polyder(fwd)
for _ in range(20):
    p_newton = p_newton - (np.polyval(fwd, p_newton) - mv_test) / np.polyval(slope, p_newton)
print("forward fit (c2, c1, c0):", fwd.round(5), " true (0.015, 2.0, 0.4)")
for label, est in [("swapped table", p_interp), ("direct inverse fit", p_direct), ("Newton on the forward fit", p_newton)]:
    print(f"{label:<26} largest error {np.abs(est - p_test).max() * 1000:.2f} mbar")
```

The forward fit recovers the transducer's coefficients closely (0.0149, 2.0016, 0.397). Newton's method on that fit is the most accurate inverse, at about 1.3 mbar worst case. The direct inverse fit gives 3.3 mbar, because a quadratic in mV cannot exactly represent the inverse of a quadratic in pressure. The swapped table gives 4.8 mbar. Inverting the right model beats fitting the wrong model to the inverse. Many instrument calibrations (thermocouple standards, for example) publish both forward and inverse polynomials for this reason, each fitted in its own direction.

## The derivative of an inverse

::: math
\[ \big(f^{-1}\big)'(y) = \frac{1}{f'(x)}, \quad y = f(x), \qquad \delta x \approx \frac{\delta y}{|f'(x)|}, \qquad \theta = \arcsin\frac{a}{g}, \;\; \frac{d\theta}{da} = \frac{1}{g\cos\theta} \]
- where the forward function is steep, the inverse is flat and readings are precise; where it is flat, the inverse is steep and noise is magnified
- a tilt sensor measures $a = g\sin\theta$; near $90°$, $\cos\theta \to 0$ and the angle becomes very uncertain
In code: the angle error from 0.01 m/s² of accelerometer noise, at several tilts
:::

Differentiating f⁻¹(f(x)) = x with the chain rule gives (f⁻¹)′(y) · f′(x) = 1. **The inverse's slope is the reciprocal of the forward slope.** That fact decides how measurement noise passes through an inverse. A small error δy in the reading becomes an error δy/|f′(x)| in the recovered input. A sensor is precise where its output changes quickly with the input, and poor where its curve flattens.

An accelerometer used as a tilt sensor measures the component of gravity along its axis, a = g sin θ. The angle is recovered as θ = arcsin(a/g). Near 0° the sine is steep and the angle is well determined. Near 90° the sine is flat, cos θ approaches 0, and the same accelerometer noise produces large angle errors. That is why tilt sensors use a second axis near vertical.

Predict before running: with 0.01 m/s² of noise, how uncertain is the angle at 10°, 60°, 85° and 89°?

```python
g, noise = 9.81, 0.01
for deg in [10, 60, 85, 89]:
    th = math.radians(deg)
    by_formula = math.degrees(noise / (g * math.cos(th)))
    a = g * math.sin(th)
    simulated = math.degrees(np.std(np.arcsin(np.clip((a + rng.normal(0, noise, 200_000)) / g, -1, 1))))
    print(f"tilt {deg:>2}°: angle uncertainty {by_formula:.3f}° by 1/f′, {simulated:.3f}° simulated")
```

At 10° the 0.01 m/s² noise gives about 0.06° of angle uncertainty, and at 60° about 0.12°, as 1/cos θ grows. At 85° it is 0.67°, and at 89° the linear formula says 3.3°. There the simulation gives a smaller spread, because the arcsine saturates at 90° and the non-linearity of the propagation lesson takes over. Either way, the precision is gone. Every inverse has the same story: check the forward slope before trusting the recovered value.

::: challenge Undoing chains [easy]
Write `affine_inverse(a, b)`: return the inverse function of x ↦ ax + b; raise `ValueError` if a is 0. Write `invert_chain(inverses)`: given the list of **inverse** functions [f₁⁻¹, f₂⁻¹, ..., fₙ⁻¹] of a chain applied in the order f₁ first, then f₂, ..., then fₙ, return the function that undoes the whole chain (with an empty list, the identity). Do not rely on the lesson's `compose`; write the loop yourself. Then write `round_trip_error(forward, inverse, xs)`: the largest |inverse(forward(x)) − x| over the values in `xs`, as a plain float.

```python starter
def affine_inverse(a, b):
    return lambda y: y

def invert_chain(inverses):
    return lambda y: y

def round_trip_error(forward, inverse, xs):
    return 0.0

c_to_f = lambda c: c * 9 / 5 + 32
print(round_trip_error(c_to_f, affine_inverse(9 / 5, 32), [-40, 0, 37, 100]))
```

```python solution
def affine_inverse(a, b):
    if a == 0:
        raise ValueError("a constant function has no inverse")
    return lambda y: (y - b) / a

def invert_chain(inverses):
    steps = list(inverses)
    def undo(y):
        for g in reversed(steps):
            y = g(y)
        return y
    return undo

def round_trip_error(forward, inverse, xs):
    return float(max(abs(inverse(forward(x)) - x) for x in xs))

c_to_f = lambda c: c * 9 / 5 + 32
print(round_trip_error(c_to_f, affine_inverse(9 / 5, 32), [-40, 0, 37, 100]))
```

```python test
import math
for _n in ["affine_inverse", "invert_chain", "round_trip_error"]:
    assert _n in dir(), f"Define {_n}."
_inv = affine_inverse(9 / 5, 32)
assert abs(_inv(212) - 100) < 1e-12 and abs(_inv(32)) < 1e-12, "Fahrenheit to Celsius as an affine inverse."
try:
    affine_inverse(0, 5)
    assert False, "a = 0 should raise ValueError."
except ValueError:
    pass
_f1, _f1i = (lambda k: k - 273.15), (lambda c: c + 273.15)
_f2, _f2i = (lambda c: c * 9 / 5 + 32), (lambda f: (f - 32) * 5 / 9)
_f3, _f3i = (lambda f: f * 10), (lambda u: u / 10)
_undo = invert_chain([_f1i, _f2i, _f3i])
_x = 300.0
_y = _f3(_f2(_f1(_x)))
assert abs(_undo(_y) - _x) < 1e-9, f"Undo the chain: last step first; got {_undo(_y)}."
assert abs(invert_chain([_f1i])(_f1(_x)) - _x) < 1e-12 and invert_chain([])(5) == 5, "One step; and no steps (the identity)."
_wrong = lambda y: _f3i(_f2i(_f1i(y)))
assert abs(_wrong(_y) - _x) > 1, "Undoing in the original order would be wrong."
_e = round_trip_error(_f2, affine_inverse(9 / 5, 32), [-40, 0, 37, 100])
assert type(_e) is float and _e < 1e-12, "A correct inverse round-trips to rounding level."
assert abs(round_trip_error(lambda v: v ** 2, math.sqrt, [-3.0, 2.0]) - 6.0) < 1e-12, "√(x²) = |x|: the round trip fails by 6 at x = -3, outside the restricted domain."
"SUCCESS: A chain is undone by applying the inverses in reverse order, and a round trip shows whether an inverse really undoes its function."
```

Hint: The inverse of ax + b is (y − b)/a. If the chain applied f₁ first, its undoing must apply fₙ⁻¹ first: loop over `reversed(inverses)`. The round-trip error is the max of |inverse(forward(x)) − x|.
:::

::: challenge Inverting a table [medium]
Write `table_inverse(xs, ys)`: given a calibration table (lists or arrays) whose ys are strictly increasing or strictly decreasing, return a function that maps a reading y (a number) to x by linear interpolation; the returned function raises `ValueError` for a reading outside [min(ys), max(ys)]. `table_inverse` itself raises `ValueError` if the lengths differ, there are fewer than 2 points, or the ys are not strictly monotonic. Then write `inverse_slope(f, x, h=1e-6)`: the derivative of f⁻¹ at y = f(x), computed as 1/f′(x) with a central difference; raise `ZeroDivisionError` if the estimated f′(x) is 0.

```python starter
import numpy as np

def table_inverse(xs, ys):
    return lambda y: 0.0

def inverse_slope(f, x, h=1e-6):
    return 0.0

inv = table_inverse([0, 1, 2], [0.4, 2.4, 4.5])
print(inv(3.0))
```

```python solution
import numpy as np

def table_inverse(xs, ys):
    xs = np.asarray(xs, dtype=float)
    ys = np.asarray(ys, dtype=float)
    if xs.size != ys.size or xs.size < 2:
        raise ValueError("need two or more matching points")
    d = np.diff(ys)
    if np.all(d > 0):
        yy, xx = ys, xs
    elif np.all(d < 0):
        yy, xx = ys[::-1], xs[::-1]
    else:
        raise ValueError("ys must be strictly monotonic")
    def inverse(y):
        if not yy[0] <= y <= yy[-1]:
            raise ValueError("reading outside the calibrated range")
        return float(np.interp(y, yy, xx))
    return inverse

def inverse_slope(f, x, h=1e-6):
    d = (f(x + h) - f(x - h)) / (2 * h)
    if d == 0:
        raise ZeroDivisionError("f'(x) = 0: the inverse is not differentiable here")
    return float(1 / d)

inv = table_inverse([0, 1, 2], [0.4, 2.4, 4.5])
print(inv(3.0))
```

```python test
import math
import numpy as np
for _n in ["table_inverse", "inverse_slope"]:
    assert _n in dir(), f"Define {_n}."
_inv = table_inverse([0, 1, 2], [0.4, 2.4, 4.5])
assert abs(_inv(3.0) - (1 + 0.6 / 2.1)) < 1e-12 and _inv(0.4) == 0.0 and _inv(4.5) == 2.0, "Interpolate x against y, ends included."
assert type(_inv(1.0)) is float, "A plain float."
for _bad in [0.39, 4.6]:
    try:
        _inv(_bad)
        assert False, f"A reading of {_bad} is outside the table: ValueError."
    except ValueError:
        pass
_dec = table_inverse(np.array([-40.0, 0.0, 25.0, 85.0]), np.array([401860.0, 33621.0, 10000.0, 1087.0]))
assert abs(_dec(10000.0) - 25.0) < 1e-12 and _dec(33621.0) == 0.0, "A decreasing table (thermistor) works too."
assert -40 < _dec(200000.0) < 0, "Between the first two points."
for _bad in [([0, 1, 2], [1.0, 2.0]), ([0], [1.0]), ([0, 1, 2], [1.0, 3.0, 2.0]), ([0, 1, 2], [1.0, 1.0, 2.0])]:
    try:
        table_inverse(*_bad)
        assert False, f"table_inverse{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(inverse_slope(lambda x: x ** 3, 2.0) - 1 / 12) < 1e-8, "(f^-1)'(8) = 1/f'(2) = 1/12 for f = x³."
assert abs(inverse_slope(math.sin, math.radians(60)) - 2.0) < 1e-6, "arcsin' at sin 60° is 1/cos 60° = 2."
try:
    inverse_slope(lambda x: x ** 2, 0.0)
    assert False, "f'(0) = 0 for x²: ZeroDivisionError."
except ZeroDivisionError:
    pass
"SUCCESS: A monotonic table reads backwards by swapping its columns, and the inverse's slope is the reciprocal of the forward slope."
```

Hint: Check the signs of `np.diff(ys)`; for a decreasing table reverse both arrays so that the ys increase, then use `np.interp(y, ys, xs)`. The inverse slope is 1 divided by (f(x + h) − f(x − h))/(2h).
:::

::: challenge Calibrating a transducer [hard]
Write `calibrate(p_cal, mv_cal, degree=2)`: fit the forward model mV(p) as a polynomial of the given degree with `np.polyfit`, and return a function `read(mv)` that converts a reading (a number or a NumPy array) to pressure by Newton's method on the fitted polynomial, starting from the linear estimate p = (mv − c₀)/c₁ of the fit's two lowest coefficients and taking 30 steps. `read` must raise `ValueError` if any reading lies outside [fit(min p_cal), fit(max p_cal)] (the calibrated range), and `calibrate` must raise `ValueError` if the fitted curve is not strictly increasing on [min p_cal, max p_cal] (check its derivative at 1001 equally spaced points). Return plain floats for number inputs and arrays for array inputs.

```python starter
import numpy as np

def calibrate(p_cal, mv_cal, degree=2):
    return lambda mv: mv / 2

p = np.linspace(0, 10, 11)
read = calibrate(p, 2.0 * p + 0.015 * p ** 2 + 0.4)
print(read(10.0))
```

```python solution
import numpy as np

def calibrate(p_cal, mv_cal, degree=2):
    p_cal = np.asarray(p_cal, dtype=float)
    mv_cal = np.asarray(mv_cal, dtype=float)
    coef = np.polyfit(p_cal, mv_cal, degree)
    deriv = np.polyder(coef)
    grid = np.linspace(p_cal.min(), p_cal.max(), 1001)
    if np.any(np.polyval(deriv, grid) <= 0):
        raise ValueError("the fitted curve is not strictly increasing")
    lo, hi = np.polyval(coef, p_cal.min()), np.polyval(coef, p_cal.max())
    c0, c1 = coef[-1], coef[-2]
    def read(mv):
        y = np.asarray(mv, dtype=float)
        if np.any(y < lo) or np.any(y > hi):
            raise ValueError("reading outside the calibrated range")
        p = (y - c0) / c1
        for _ in range(30):
            p = p - (np.polyval(coef, p) - y) / np.polyval(deriv, p)
        return float(p) if p.ndim == 0 else p
    return read

p = np.linspace(0, 10, 11)
read = calibrate(p, 2.0 * p + 0.015 * p ** 2 + 0.4)
print(read(10.0))
```

```python test
import numpy as np
for _n in ["calibrate"]:
    assert _n in dir(), f"Define {_n}."
_f = lambda p: 2.0 * p + 0.015 * p ** 2 + 0.4
_p = np.linspace(0, 10, 11)
_read = calibrate(_p, _f(_p))
assert abs(_read(_f(4.37)) - 4.37) < 1e-9 and type(_read(5.0)) is float, "Exact data: exact inverse; plain float for a number."
_t = np.linspace(0.3, 9.7, 48)
_arr = _read(_f(_t))
assert isinstance(_arr, np.ndarray) and _arr.shape == _t.shape and np.abs(_arr - _t).max() < 1e-9, "Arrays in, arrays out."
_g = np.random.default_rng(64)
_noisy = calibrate(_p, _f(_p) + _g.normal(0, 0.005, _p.size))
assert np.abs(_noisy(_f(_t)) - _t).max() < 0.004, f"With 5 µV noise the inverse stays within 4 mbar; got {np.abs(_noisy(_f(_t)) - _t).max():.4f}."
_cubic = calibrate(_p, 1.5 * _p + 0.02 * _p ** 2 - 0.001 * _p ** 3, degree=3)
assert abs(_cubic(1.5 * 6 + 0.02 * 36 - 0.001 * 216) - 6.0) < 1e-8, "Degree 3."
for _bad in [_f(-1.0), _f(10.5)]:
    try:
        _read(_bad)
        assert False, f"A reading of {_bad:.3f} mV is outside the calibrated range: ValueError."
    except ValueError:
        pass
try:
    _read(np.array([5.0, 30.0]))
    assert False, "Any reading outside the range in an array: ValueError."
except ValueError:
    pass
try:
    calibrate(_p, 10 - (_p - 5) ** 2)
    assert False, "A curve that rises and falls cannot be inverted: ValueError."
except ValueError:
    pass
"SUCCESS: Fit the physics in its natural direction, check it is one-to-one on the calibrated range, and invert it with Newton's method."
```

Hint: `np.polyfit` returns the highest power first, so the constant is `coef[-1]` and the linear coefficient `coef[-2]`. Newton's step is p − (fit(p) − y)/fit′(p) with `np.polyval(np.polyder(coef), p)`, and it works on whole arrays at once.
:::

## What you learned

- Composition g ∘ f applies f first; it is associative but not commutative, and a measurement chain is a composition of physical and electronic steps.
- Only one-to-one functions (possibly after restricting the domain) have inverses; a chain is undone in reverse order, (g ∘ f)⁻¹ = f⁻¹ ∘ g⁻¹, and an inverse's graph is the reflection in y = x.
- A strictly monotonic calibration table is inverted by swapping its columns and interpolating, but only within its range: `np.interp` clamps silently.
- For fitted calibrations, inverting the forward model numerically beat fitting the inverse directly, and both beat the raw table.
- The inverse's slope is 1/f′: where a sensor's response is flat, noise is magnified, as for a tilt sensor near 90°.

The next lesson moves and reshapes graphs: shifting, stretching and reflecting functions, the operations needed to align one signal with another.
