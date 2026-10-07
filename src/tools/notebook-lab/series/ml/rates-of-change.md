# Rates of change

Here, in one sentence, is how nearly every machine learning model learns: it measures how wrong it is, works out which way to adjust each of its numbers to be a little less wrong, and adjusts them, over and over. The middle step, "which way to adjust, and by how much", needs one mathematical idea: the **rate of change** of the error as each number changes. That rate is called a **derivative**, and it is the subject of this lesson and the next.

You do not need any previous calculus. This lesson builds the derivative from the idea of a slope, computes it numerically with NumPy, and shows the few patterns it follows. It ends by using a derivative to walk downhill to the lowest point of a curve, which is the whole idea of training a model, in miniature.

## Average rate of change

A cyclist's distance from home, in kilometres, after `t` hours, is given by a function:

```python type
import numpy as np
import matplotlib.pyplot as plt

def distance(t):
    return 12 * t + 3 * t ** 2

t = np.linspace(0, 4, 100)
fig, ax = plt.subplots()
ax.plot(t, distance(t))
ax.set_xlabel("time (hours)")
ax.set_ylabel("distance (km)")
ax.set_title("The cyclist speeds up")
plt.show()
print("average speed over the first 2 hours:", (distance(2) - distance(0)) / 2, "km/h")
print("average speed from hour 2 to 3:", (distance(3) - distance(2)) / 1, "km/h")
```

```output
average speed over the first 2 hours: 18.0 km/h
average speed from hour 2 to 3: 27.0 km/h
```

Average speed is distance travelled divided by time taken. Over any interval from `a` to `b`, that is the **average rate of change** of the function:

\[
\frac{f(b) - f(a)}{b - a}
\]

On the graph, it is the **slope** of the straight line joining the two points: how much the line rises for each unit it runs to the right. The curve gets steeper as time goes on, and the average speeds grow to match: 18 km/h over the first two hours, 27 km/h during the third.

## Speed at an instant

What is the cyclist's speed at exactly 2 hours? A speedometer shows a single number at every moment, but "distance divided by time" needs an interval, and an instant has no length.

The way round it is to take shorter and shorter intervals starting at 2 hours, and watch what the average speed does. Predict: as the interval shrinks, what number will it settle towards?

```python type
def distance(t):
    return 12 * t + 3 * t ** 2

for h in [1, 0.1, 0.01, 0.001, 0.0001]:
    rate = (distance(2 + h) - distance(2)) / h
    print(f"interval {h:<7} average speed {rate:.5f}")
```

```output
interval 1       average speed 27.00000
interval 0.1     average speed 24.30000
interval 0.01    average speed 24.03000
interval 0.001   average speed 24.00300
interval 0.0001  average speed 24.00030
```

The averages close in on 24. That limiting value, the average rate of change over an interval that shrinks towards zero, is the **derivative** of the function at that point. For the cyclist it is the exact speed at 2 hours: 24 km/h. The derivative of `f` at `x` is written `f′(x)`:

\[
f'(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h}
\]

"lim" (for **limit**) with `h → 0` means "the value this settles towards as `h` gets closer and closer to zero". You cannot simply put `h = 0` into the fraction, because that would be zero divided by zero. The derivative is what the fraction approaches, never quite reaching.

## The derivative is the slope of the curve

Geometrically, as the interval shrinks, the line through the two points swings round until it just touches the curve at a single point, running in the same direction as the curve there. That line is the **tangent line**, and the derivative is its slope.

```python type
import numpy as np
import matplotlib.pyplot as plt

def f(x):
    return x ** 2

x0 = 1.5
slope = 2 * x0
x = np.linspace(-0.5, 3, 100)
fig, ax = plt.subplots()
ax.plot(x, f(x), label="f(x) = x²")
ax.plot(x, f(x0) + slope * (x - x0), "--", label=f"tangent at x = {x0}, slope {slope}")
ax.plot(x0, f(x0), "ko")
ax.set_ylim(-1, 9)
ax.legend()
plt.show()
```

The tangent line at a point is the best straight-line approximation to the curve **near** that point. Zoom in far enough on any smooth curve and it looks straight, and the derivative is the slope of that straight line. This is why derivatives are so useful: they turn complicated curves into simple straight lines, as long as you only look nearby.

## Computing derivatives numerically

The limit definition suggests a way to compute a derivative with a computer: pick a small `h` and compute the fraction. This is a **numerical derivative**. There are two common versions:

- the **forward difference**, `(f(x + h) − f(x)) / h`, straight from the definition;
- the **central difference**, `(f(x + h) − f(x − h)) / (2h)`, which looks equally far on both sides.

```python type
import numpy as np

def f(x):
    return x ** 3

x, h = 2.0, 0.001
exact = 3 * x ** 2
forward = (f(x + h) - f(x)) / h
central = (f(x + h) - f(x - h)) / (2 * h)
print("exact:  ", exact)
print("forward:", forward, " error", abs(forward - exact))
print("central:", central, " error", abs(central - exact))
```

```output
exact:   12.0
forward: 12.006000999997823  error 0.006000999997823442
central: 12.000000999998317  error 9.999983170416726e-07
```

The central difference is far more accurate for the same `h`. The forward difference measures the slope of a line leaning slightly to one side, while the central difference's errors on the two sides largely cancel out.

You might think the smaller the `h`, the better. Predict what happens to the error as `h` gets extremely small:

```python type
import numpy as np
import matplotlib.pyplot as plt

def f(x):
    return np.sin(x)

x = 1.0
hs = 10.0 ** np.arange(-1, -16, -1)
errors = np.abs((f(x + hs) - f(x - hs)) / (2 * hs) - np.cos(x))

fig, ax = plt.subplots()
ax.loglog(hs, errors, "o-")
ax.set_xlabel("step size h")
ax.set_ylabel("error")
ax.set_title("Too small a step makes things worse")
plt.show()
print("best h:", hs[errors.argmin()])
```

```output
best h: 1e-05
```

The error falls as `h` shrinks, until around `h = 10⁻⁵` or `10⁻⁶`, and then **rises** again. For tiny `h`, `f(x + h)` and `f(x − h)` agree in almost all of their digits, and subtracting two nearly equal floats leaves mostly rounding error (lesson 2 of Python from Zero showed how floats are slightly inexact), which is then divided by a tiny number and magnified. `ax.loglog` uses logarithmic scales on both axes, so that each factor of ten takes the same space, which is the right way to plot quantities spanning many orders of magnitude. (`np.cos` is the derivative of `np.sin`, which is how the exact value is known.) A step of around `1e-5` with the central difference is a good default.

## Patterns in derivatives

Numerical derivatives work for any function, but for common functions the derivative follows simple patterns. Here is the most important, checked numerically. For `f(x) = xⁿ`, the derivative is `n xⁿ⁻¹`: bring the power down in front and reduce it by one.

```python type
import numpy as np

def numerical_derivative(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

x = 1.7
for n in [1, 2, 3, 4]:
    print(f"x^{n}: numerical {numerical_derivative(lambda t: t ** n, x):.5f}, rule {n * x ** (n - 1):.5f}")
print(f"exp: numerical {numerical_derivative(np.exp, x):.5f}, rule exp(x) = {np.exp(x):.5f}")
print(f"log: numerical {numerical_derivative(np.log, x):.5f}, rule 1/x = {1 / x:.5f}")
```

```output
x^1: numerical 1.00000, rule 1.00000
x^2: numerical 3.40000, rule 3.40000
x^3: numerical 8.67000, rule 8.67000
x^4: numerical 19.65200, rule 19.65200
exp: numerical 5.47395, rule exp(x) = 5.47395
log: numerical 0.58824, rule 1/x = 0.58824
```

So `x²` has derivative `2x`, which is why the tangent to `x²` at 1.5 had slope 3, and `x³` has derivative `3x²`. The cyclist's `12t + 3t²` has derivative `12 + 6t`, which at `t = 2` is 24, matching the limit found above. The other patterns you will need:

- A constant (a number on its own) has derivative 0: it does not change.
- A constant multiple stays: the derivative of `5x²` is `5 × 2x = 10x`.
- Sums split: the derivative of `f + g` is `f′ + g′`.
- The derivative of `eˣ` (`np.exp`) is `eˣ` itself: it grows at a rate equal to its own size, which is what makes it special.
- The derivative of `ln x` (`np.log`) is `1/x`.

You will rarely need to work derivatives out by hand in this series, but knowing these patterns lets you check what the code does, and the next lesson combines them into the rule that makes neural networks trainable.

## The derivative as a function

The derivative has a value at every point, so it is itself a function. Plotting a function and its derivative together shows how they relate:

```python type
import numpy as np
import matplotlib.pyplot as plt

def f(x):
    return x ** 3 - 3 * x

def f_prime(x):
    return 3 * x ** 2 - 3

x = np.linspace(-2.2, 2.2, 200)
fig, ax = plt.subplots()
ax.plot(x, f(x), label="f(x) = x³ − 3x")
ax.plot(x, f_prime(x), "--", label="f′(x) = 3x² − 3")
ax.axhline(0, color="gray", lw=0.8)
ax.legend()
plt.show()
```

Read the dashed derivative curve as the steepness of the solid curve. Where `f′` is **positive**, `f` is going up; where it is **negative**, `f` is going down. And where `f′` crosses **zero**, at `x = −1` and `x = 1`, the curve is momentarily flat: those are the tops of hills and bottoms of valleys, called **maximum** and **minimum** points. (A flat point is not always a hill or a valley: `x³` is flat at 0 but keeps rising on both sides. What marks a hill or valley is the derivative actually **changing sign** there, from positive to negative or the other way round.) `ax.axhline(0)` draws a horizontal line at zero to make the crossings easy to see.

## Walking downhill

Training a model means finding the parameter values that make its error as small as possible: finding the bottom of a valley. The derivative says which way is downhill. If `f′(x)` is positive, the curve rises to the right, so step **left**; if it is negative, step right. In both cases: step in the direction of **minus** the derivative.

Here is that idea finding the minimum of `f(x) = (x − 3)² + 1` from a starting guess of `x = 0`. Each step moves `x` by a small multiple of the negative derivative. Predict: as the dots approach the bottom, will the steps get bigger or smaller?

```python type
import numpy as np
import matplotlib.pyplot as plt

def f(x):
    return (x - 3) ** 2 + 1

def f_prime(x):
    return 2 * (x - 3)

x = 0.0
step_size = 0.1
path = [x]
for _ in range(25):
    x = x - step_size * f_prime(x)
    path.append(x)
print("ended at x =", round(x, 4), "with f(x) =", round(f(x), 4))

grid = np.linspace(-0.5, 5.5, 200)
fig, ax = plt.subplots()
ax.plot(grid, f(grid))
ax.plot(path, [f(p) for p in path], "o-", color="tab:red", markersize=4)
ax.set_title("Each step moves downhill")
plt.show()
```

```output
ended at x = 2.9887 with f(x) = 1.0001
```

The red dots walk down the curve and settle near the bottom: after 25 steps `x` is about 2.99, within 0.01 of the true minimum at 3, and more steps would get closer still. The steps are big where the curve is steep and shrink as it flattens out near the minimum, because the derivative itself shrinks there. This procedure is **gradient descent**, and it is how neural networks with billions of parameters are trained. Its full treatment, including what happens when the step size is too big, comes later in the series. Before that, the next lesson extends derivatives to functions of many numbers at once, which is what a model with many parameters needs.

::: challenge A numerical derivative [easy]
Write a function `derivative(f, x, h=1e-5)` that returns the central-difference estimate of `f′(x)`. It should work when `x` is a NumPy array too, giving the derivative at every point at once (it will, if you only use arithmetic).

```python starter
def derivative(f, x, h=1e-5):
    return 0.0

print(derivative(lambda x: x ** 2, 3.0))
```

```python solution
def derivative(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

print(derivative(lambda x: x ** 2, 3.0))
```

```python test
import numpy as _np
assert "derivative" in dir(), "Keep the function's name as derivative."
assert _np.isclose(derivative(lambda x: x ** 2, 3.0), 6, atol=1e-6), f"The derivative of x² at 3 is 6, but got {derivative(lambda x: x ** 2, 3.0)}."
assert _np.isclose(derivative(_np.sin, 0.0), 1, atol=1e-6), "The derivative of sin at 0 is 1."
assert _np.isclose(derivative(_np.exp, 1.0), _np.e, atol=1e-5), "The derivative of exp at 1 is e."
_xs = _np.array([0.5, 1.0, 2.0])
assert _np.allclose(derivative(_np.log, _xs), 1 / _xs, atol=1e-5), "With an array of points, derivative should give the derivative at every point (for log, 1/x)."
_fwd = (lambda x: x ** 3)
assert abs(derivative(_fwd, 2.0, h=1e-3) - 12) < 1e-5, "Use the central difference, (f(x + h) − f(x − h)) / (2h), which is much more accurate than the forward difference."
"SUCCESS: A derivative for any function you can compute."
```

Hint: The central difference looks `h` to each side of `x` and divides by the total width, `2h`.
:::

::: challenge The tangent line [medium]
Write a function `tangent(f, x0)` that returns the slope `m` and intercept `c` of the tangent line to `f` at `x0`, so that the line is `y = m x + c`. Use your numerical derivative for the slope. The line must pass through the point `(x0, f(x0))`; use that to work out `c`.

For `f(x) = x²` at `x0 = 1.5`, the tangent has slope 3 and intercept −2.25.

```python starter
def derivative(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

def tangent(f, x0):
    return 0.0, 0.0

print(tangent(lambda x: x ** 2, 1.5))
```

```python solution
def derivative(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

def tangent(f, x0):
    m = derivative(f, x0)
    c = f(x0) - m * x0
    return m, c

print(tangent(lambda x: x ** 2, 1.5))
```

```python test
import numpy as _np
assert "tangent" in dir(), "Keep the function's name as tangent."
_m, _c = tangent(lambda x: x ** 2, 1.5)
assert _np.isclose(_m, 3, atol=1e-5) and _np.isclose(_c, -2.25, atol=1e-5), f"The tangent to x² at 1.5 is y = 3x − 2.25, but got slope {_m} and intercept {_c}."
for _f, _x0 in [(_np.exp, 0.0), (_np.sin, 1.0), (lambda x: x ** 3 - 3 * x, -0.5)]:
    _m, _c = tangent(_f, _x0)
    assert _np.isclose(_m * _x0 + _c, _f(_x0), atol=1e-6), f"The tangent at x0 = {_x0} must pass through the point (x0, f(x0))."
    _h = 1e-3
    assert abs((_m * (_x0 + _h) + _c) - _f(_x0 + _h)) < 1e-4, "Near x0, the tangent line should be very close to the curve."
"SUCCESS: The best straight-line approximation to a curve at a point."
```

Hint: The slope is the derivative at `x0`. A line `y = m x + c` passes through `(x0, f(x0))` when `f(x0) = m × x0 + c`; rearrange that for `c`.
:::

::: challenge Find the flat points [medium]
Write a function `flat_points(f, lo, hi, n=10001)` that returns an array of the approximate `x` positions between `lo` and `hi` where `f′` changes sign, which are the hills and valleys of `f`. Evaluate the derivative on `n` evenly spaced points with `np.linspace`, find each place where it goes from positive to negative or negative to positive between neighbouring points, and return the **first** `x` of each such pair. No loops.

For `f(x) = x³ − 3x` between −2 and 2, the answer is two points, very close to −1 and 1.

```python starter
import numpy as np

def flat_points(f, lo, hi, n=10001):
    return np.array([])

print(flat_points(lambda x: x ** 3 - 3 * x, -2, 2).round(3))
```

```python solution
import numpy as np

def flat_points(f, lo, hi, n=10001):
    x = np.linspace(lo, hi, n)
    h = 1e-5
    slope = (f(x + h) - f(x - h)) / (2 * h)
    changes = slope[:-1] * slope[1:] < 0
    return x[:-1][changes]

print(flat_points(lambda x: x ** 3 - 3 * x, -2, 2).round(3))
```

```python test
import numpy as _np
import ast as _ast
assert "flat_points" in dir(), "Keep the function's name as flat_points."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Find the sign changes with array operations, without a loop."
_got = _np.asarray(flat_points(lambda x: x ** 3 - 3 * x, -2, 2))
assert _got.shape == (2,) and _np.allclose(_got, [-1, 1], atol=1e-3), f"For x³ − 3x on [−2, 2] the flat points are near −1 and 1, but got {_got}."
_got = _np.asarray(flat_points(lambda x: (x - 0.7) ** 2, -1, 3))
assert _got.shape == (1,) and _np.isclose(_got[0], 0.7, atol=1e-3), f"(x − 0.7)² has one flat point, at 0.7, but got {_got}."
_got = _np.asarray(flat_points(_np.sin, 0, 10))
assert _np.allclose(_got, [_np.pi / 2, 3 * _np.pi / 2, 5 * _np.pi / 2], atol=1e-3), f"sin has flat points at π/2, 3π/2 and 5π/2 between 0 and 10, but got {_got}."
assert _np.asarray(flat_points(lambda x: 2 * x + 1, 0, 5)).size == 0, "A straight line has no flat points, so the result should be empty."
"SUCCESS: You found the hills and valleys from where the slope changes sign."
```

Hint: `slope[:-1]` and `slope[1:]` line up each point with its right-hand neighbour. Two numbers have opposite signs exactly when their product is negative, so `slope[:-1] * slope[1:] < 0` marks every sign change. Use that boolean array as a mask on the `x` values (all but the last).
:::

## What you learned

- The average rate of change of `f` from `a` to `b` is `(f(b) − f(a)) / (b − a)`: the slope of the line joining the two points.
- The derivative `f′(x)` is the limit of that slope as the interval shrinks to zero: the instantaneous rate of change, and the slope of the tangent line.
- Near a point, a smooth curve is almost straight; the tangent line is the best straight-line approximation.
- A numerical derivative uses a small `h`. The central difference, `(f(x + h) − f(x − h)) / (2h)`, is much more accurate than the forward difference, and `h` around `1e-5` avoids both approximation error and float rounding error.
- Patterns: `xⁿ → n xⁿ⁻¹`, constants → 0, constant multiples and sums carry through, `eˣ → eˣ`, `ln x → 1/x`.
- Positive derivative: the function is increasing; negative: decreasing; zero: a flat point such as a minimum or maximum.
- Stepping `x` by a small multiple of `−f′(x)` walks downhill to a minimum: gradient descent, the way models learn.

A model has many numbers to adjust, not one. Next you will take derivatives of functions of many variables, collect them into the gradient, and meet the chain rule, which is how derivatives pass through the layers of a neural network.
