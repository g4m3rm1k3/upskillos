# Average rate of change

A speedometer shows the speed **now**, yet speed is distance divided by time, and "now" lasts no time at all. Every measured speed is really an average over some interval: an encoder counts pulses for a few milliseconds, a GPS compares positions a second apart. This lesson studies that average rate of change closely: what happens as the interval shrinks, which ways of computing it converge fastest, why shrinking the interval too far makes the answer worse rather than better, and how noise in real data changes the picture. It is the computational doorway to the derivative, the central idea of calculus, which the calculus block defines properly.

This lesson covers:

- the average rate of change as the slope of a secant line;
- shrinking the interval, and the instantaneous rate as its limit;
- forward and central differences, and how fast their errors shrink;
- why too small a step makes things worse in floating point;
- rates from noisy data, and the trade-off of a wider interval.

## The secant slope

::: math
\[ \frac{\Delta s}{\Delta t} = \frac{s(b) - s(a)}{b - a}, \qquad \frac{s(1 + h) - s(1)}{h} = 9.8 + 4.9\,h \;\;\text{for } s(t) = 4.9\,t^2 \]
- the average rate is the slope of the secant line through $(a, s(a))$ and $(b, s(b))$
- the excess $4.9\,h$ shrinks to zero with $h$
In code: `(f(b) - f(a)) / (b - a)` with `b = 1 + h`
:::


The **average rate of change** of a function f between a and b is

\[ \frac{f(b) - f(a)}{b - a} \]

the change in output divided by the change in input. Geometrically it is the slope of the **secant line** joining the points (a, f(a)) and (b, f(b)) on the graph. For position against time it is the average velocity, as in the previous lesson.

A part dropped from a machine falls a distance s(t) = 4.9 t² metres in t seconds (ignoring air resistance). Its average speed over the first second is 4.9 m/s, but it is clearly going faster at the end of that second than at the start. Predict before running: what does the average speed over [1, 1 + h] approach as h shrinks?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

def fall(t):
    return 4.9 * t ** 2

def average_rate(f, a, b):
    return (f(b) - f(a)) / (b - a)

for h in [1, 0.5, 0.1, 0.01, 0.001, 0.0001]:
    print(f"over [1, {1 + h:<7}]: average speed {average_rate(fall, 1, 1 + h):.6f} m/s")
```

```output
over [1, 2      ]: average speed 14.700000 m/s
over [1, 1.5    ]: average speed 12.250000 m/s
over [1, 1.1    ]: average speed 10.290000 m/s
over [1, 1.01   ]: average speed 9.849000 m/s
over [1, 1.001  ]: average speed 9.804900 m/s
over [1, 1.0001 ]: average speed 9.800490 m/s
```

The averages fall from 14.7 m/s over the interval [1, 2] toward 9.8 m/s, and they get there steadily: the excess is exactly 4.9h, because s(1 + h) − s(1) = 9.8h + 4.9h². Halve the interval, halve the excess.

## The instantaneous rate

::: math
\[ s'(t) = \lim_{h \to 0} \frac{s(t + h) - s(t)}{h}, \qquad \text{tangent at } t_0:\; y = s(t_0) + s'(t_0)\,(t - t_0) \]
- the derivative $s'(t_0)$ is the instantaneous rate, the slope of the tangent line
- for $s(t) = 4.9\,t^2$: $s'(1) = 9.8$
In code: each secant is drawn as `fall(1) + slope * (ts - 1)`; the tangent uses slope 9.8
:::


The number the averages approach as h shrinks to zero is the **instantaneous rate of change** at t = 1, the speed at that instant: 9.8 m/s. Calculus calls it the **derivative** and writes it s′(1). Here it can be found exactly, because the excess 4.9h visibly goes to zero, but even when it cannot, shrinking intervals give a numerical estimate.

Geometrically, as the second point slides toward the first, the secant lines swing toward a limiting line that just touches the curve at that point: the **tangent line**, whose slope is the derivative. Predict before running: how do the secants look on the graph as h shrinks?

```python type
ts = np.linspace(0, 2.2, 200)
fig, ax = plt.subplots(figsize=(6, 4))
ax.plot(ts, fall(ts), color="black", label="s(t) = 4.9 t²")
for h in [1.0, 0.5, 0.2]:
    slope = average_rate(fall, 1, 1 + h)
    ax.plot(ts, fall(1) + slope * (ts - 1), "--", label=f"secant, h = {h}")
ax.plot(ts, fall(1) + 9.8 * (ts - 1), color="red", label="tangent, slope 9.8")
ax.plot([1], [fall(1)], "ko")
ax.set_ylim(-2, 24)
ax.set_xlabel("time (s)")
ax.set_ylabel("distance fallen (m)")
ax.legend(fontsize=8)
plt.show()
print("tangent line at t = 1: s ≈", fall(1), "+ 9.8 (t - 1)")
```

```output
tangent line at t = 1: s ≈ 4.9 + 9.8 (t - 1)
```

The secants pivot on the point (1, 4.9) and flatten toward the red tangent. Near t = 1 the tangent line is the best straight-line approximation to the curve, an idea that the calculus block turns into linear approximation and Newton's method.

## Forward and central differences

::: math
\[ \text{forward: } \frac{f(x+h) - f(x)}{h} = f'(x) + O(h), \qquad \text{central: } \frac{f(x+h) - f(x-h)}{2h} = f'(x) + O(h^2) \]
- $O(h)$: error proportional to $h$; $O(h^2)$: proportional to $h^2$
- halving $h$ halves the forward error but quarters the central error
In code: `(math.sin(x0 + h) - math.sin(x0)) / h` against `(math.sin(x0 + h) - math.sin(x0 - h)) / (2 * h)`
:::


Estimating a derivative from function values is called **numerical differentiation**. The secant over [x, x + h] is the **forward difference**. A better choice is usually the **central difference**, which uses points on both sides:

\[ f'(x) \approx \frac{f(x + h) - f(x - h)}{2h} \]

For the falling part, the central difference gives exactly 9.8 for any h: the 4.9h² terms cancel. In general the forward difference's error is proportional to h, while the central difference's error is proportional to h², so halving h halves one error but quarters the other. Predict before running: for f(x) = sin x at x = 1 (where the exact derivative is cos 1), how much more accurate is the central difference at h = 0.01?

```python type
x0 = 1.0
exact = math.cos(x0)
print(f"{'h':>8}  {'forward error':>14}  {'central error':>14}")
for h in [0.1, 0.05, 0.01, 0.005, 0.001]:
    fwd = (math.sin(x0 + h) - math.sin(x0)) / h
    ctr = (math.sin(x0 + h) - math.sin(x0 - h)) / (2 * h)
    print(f"{h:>8}  {fwd - exact:>14.3e}  {ctr - exact:>14.3e}")
```

```output
       h   forward error   central error
     0.1      -4.294e-02      -9.001e-04
    0.05      -2.126e-02      -2.251e-04
    0.01      -4.216e-03      -9.005e-06
   0.005      -2.106e-03      -2.251e-06
   0.001      -4.208e-04      -9.005e-08
```

The forward error halves when h halves and drops tenfold when h drops tenfold: proportional to h. The central error drops fourfold and a hundredfold: proportional to h². At h = 0.01 the central difference is about 470 times more accurate, for the same two function evaluations. The orders come from the Taylor expansion in the calculus block, where the h² term's coefficient turns out to depend on the third derivative.

## When smaller is worse

::: math
\[ \text{total error} \approx \underbrace{C\,h^p}_{\text{method}} + \underbrace{\frac{\varepsilon\,|f|}{h}}_{\text{rounding}}, \qquad \varepsilon \approx 10^{-16} \]
- small $h$ shrinks the method error but magnifies rounding error
- the best $h$ balances them: about $\sqrt{\varepsilon} \approx 10^{-8}$ for forward differences
In code: `np.logspace(-15, -1, 57)` tries $h$ across 14 orders of magnitude
:::


Shrinking h should make the estimate ever better, but in floating point it does not. f(x + h) and f(x) agree in more and more leading digits as h shrinks, so subtracting them cancels those digits and leaves mostly rounding error, about 10⁻¹⁶ times f's size. Dividing by a tiny h then magnifies it. The total error is the method error (falling with h) plus the rounding error (growing like 10⁻¹⁶/h), so there is a best h in between. Predict before running: roughly where is the best h for the forward difference?

```python type
hs = np.logspace(-15, -1, 57)
fwd_err = [abs((math.sin(x0 + h) - math.sin(x0)) / h - exact) for h in hs]
ctr_err = [abs((math.sin(x0 + h) - math.sin(x0 - h)) / (2 * h) - exact) for h in hs]
fig, ax = plt.subplots(figsize=(6, 3.5))
ax.loglog(hs, fwd_err, "o-", markersize=3, label="forward")
ax.loglog(hs, ctr_err, "s-", markersize=3, label="central")
ax.set_xlabel("step h")
ax.set_ylabel("absolute error")
ax.legend()
plt.show()
print(f"best forward h ≈ {hs[np.argmin(fwd_err)]:.0e} (error {min(fwd_err):.1e}), best central h ≈ {hs[np.argmin(ctr_err)]:.0e} (error {min(ctr_err):.1e})")
```

```output
best forward h ≈ 6e-09 (error 2.5e-09), best central h ≈ 6e-06 (error 3.8e-13)
```

`np.logspace(-15, -1, 57)` gives 57 values evenly spaced in orders of magnitude from 10⁻¹⁵ to 10⁻¹. On log–log axes, each method's error is a V: a straight falling line where method error dominates (slope 1 for forward, 2 for central, the lesson on plotting's power-law slopes again), then a rising, ragged line where rounding dominates.

The forward difference is best near h ≈ 10⁻⁸, the square root of the float precision, with an error of a few times 10⁻⁹; the central difference is best at a larger h, around 10⁻⁵, with an error below 10⁻¹². At h = 10⁻¹⁵ both are wrong in the first or second digit. A sensible default for central differences is h ≈ 10⁻⁵ times the scale of x.

## Rates from noisy data

::: math
\[ v_i \approx \frac{x_{i+k} - x_{i-k}}{t_{i+k} - t_{i-k}}, \qquad \text{noise in } v_i \propto \frac{\sigma}{k\,\Delta t} \]
- $\sigma$: the noise in each position reading; $k$: samples on each side
- wider intervals average noise away but blur genuine changes in speed
In code: `(x[2 * k:] - x[:-2 * k]) / (t[2 * k:] - t[:-2 * k])`
:::


Measured data adds a second source of trouble. Every reading carries noise, and differencing two readings Δt apart divides that noise by Δt: halving the interval doubles the noise in the speed. For data, the "too small h" problem appears at a far larger h than float rounding, set by the sensor's noise.

The remedy is to difference over a **wider interval**, k samples on each side: v_i ≈ (x_{i+k} − x_{i−k}) / (t_{i+k} − t_{i−k}). The noise shrinks in proportion to 1/k, but the method error grows, because a wide interval blurs genuine changes in speed. Predict before running: for an encoder logging every millisecond with 0.1 mm of noise, is k = 1 or k = 20 better?

```python type
rng = np.random.default_rng(21)
t = np.arange(0, 1.0, 0.001)
true_x = 0.05 * (1 - np.cos(2 * math.pi * t))
true_v = 0.05 * 2 * math.pi * np.sin(2 * math.pi * t)
x_meas = true_x + rng.normal(0, 0.0001, t.size)

def central_over(t, x, k):
    return t[k:-k], (x[2 * k:] - x[:-2 * k]) / (t[2 * k:] - t[:-2 * k])

for k in [1, 5, 20, 80, 200]:
    tk, vk = central_over(t, x_meas, k)
    err = vk - true_v[k:-k]
    print(f"k = {k:>3} (interval {2 * k} ms): rms speed error {np.sqrt((err ** 2).mean()) * 1000:7.2f} mm/s")
```

```output
k =   1 (interval 2 ms): rms speed error   69.22 mm/s
k =   5 (interval 10 ms): rms speed error   13.65 mm/s
k =  20 (interval 40 ms): rms speed error    3.43 mm/s
k =  80 (interval 160 ms): rms speed error    9.96 mm/s
k = 200 (interval 400 ms): rms speed error   58.06 mm/s
```

The arrays are sliced so that `x[2k:] - x[:-2k]` pairs each sample with the one 2k samples earlier, and the result is assigned to the middle time, `t[k:-k]`. The rms (root-mean-square) error is the typical size of the error.

With k = 1 the speed estimate is dominated by noise: an rms error of about 70 mm/s on a signal whose peak is 314 mm/s. Widening to k = 20 cuts the error by a factor of more than ten. At k = 200 the interval spans 0.4 s, almost half a cycle, and the blurring error takes over again. The best interval balances the sensor's noise against how fast the true speed changes, the same balance as in the floating-point plot, with noise in place of rounding.

::: challenge Secant slopes [easy]
Write `average_rate(f, a, b)` returning (f(b) − f(a)) / (b − a), raising `ValueError` if a == b. Then write `secant_slopes(f, x, hs)` returning a list of `(h, slope)` tuples, where `slope` is the average rate over [x, x + h] rounded to 6 decimal places, in the order given. Raise `ValueError` if any h is 0. Negative h is allowed (it gives the interval to the left of x).

```python starter
def average_rate(f, a, b):
    return 0.0

def secant_slopes(f, x, hs):
    return []

print(secant_slopes(fall, 1, [1, 0.1, 0.01]))
```

```python solution
def average_rate(f, a, b):
    if a == b:
        raise ValueError("the interval must have non-zero width")
    return (f(b) - f(a)) / (b - a)

def secant_slopes(f, x, hs):
    return [(h, round(average_rate(f, x, x + h), 6)) for h in hs]

print(secant_slopes(fall, 1, [1, 0.1, 0.01]))
```

```python test
for _n in ["average_rate", "secant_slopes"]:
    assert _n in dir(), f"Define {_n}."
assert abs(average_rate(lambda t: 4.9 * t ** 2, 0, 1) - 4.9) < 1e-12, "Over the first second the average speed is 4.9 m/s."
assert average_rate(lambda x: x ** 3, 1, 3) == 13.0 and average_rate(lambda x: x ** 3, 3, 1) == 13.0, "Order of the ends does not matter."
try:
    average_rate(lambda x: x, 2, 2)
    assert False, "a == b should raise ValueError."
except ValueError:
    pass
assert secant_slopes(lambda t: 4.9 * t ** 2, 1, [1, 0.1, 0.01]) == [(1, 14.7), (0.1, 10.29), (0.01, 9.849)], f"Got {secant_slopes(lambda t: 4.9 * t ** 2, 1, [1, 0.1, 0.01])}."
assert secant_slopes(lambda t: 4.9 * t ** 2, 1, [-0.1]) == [(-0.1, 9.31)], "A negative h uses the interval to the left."
try:
    secant_slopes(lambda x: x, 1, [0.1, 0])
    assert False, "h = 0 should raise ValueError."
except ValueError:
    pass
"SUCCESS: Secant slopes from the right overshoot and from the left undershoot, closing in on the instantaneous rate 9.8 from both sides."
```

Hint: `secant_slopes` is a list comprehension over `hs` that calls `average_rate(f, x, x + h)`; the zero check in `average_rate` raises for h = 0.
:::

::: challenge A numerical derivative [medium]
Write `derivative(f, x, h=1e-5, method="central")` where `method` is `"forward"` ((f(x+h) − f(x))/h), `"backward"` ((f(x) − f(x−h))/h) or `"central"`; raise `ValueError` for any other method or for h ≤ 0. Then write `observed_order(f, x, exact, method, h=0.01)`: estimate how the error scales by computing the absolute error at h and at h/2 and returning log₂(error(h) / error(h/2)), rounded to 1 decimal place. For a method whose error is proportional to hᵖ, halving h divides the error by 2ᵖ, so this returns about p. Raise `ValueError` if either error is exactly 0.

```python starter
def derivative(f, x, h=1e-5, method="central"):
    return (f(x + h) - f(x)) / h

def observed_order(f, x, exact, method, h=0.01):
    return 0.0

print(derivative(math.sin, 1.0), math.cos(1.0))
```

```python solution
def derivative(f, x, h=1e-5, method="central"):
    if h <= 0:
        raise ValueError("h must be positive")
    if method == "forward":
        return (f(x + h) - f(x)) / h
    if method == "backward":
        return (f(x) - f(x - h)) / h
    if method == "central":
        return (f(x + h) - f(x - h)) / (2 * h)
    raise ValueError(f"unknown method {method!r}")

def observed_order(f, x, exact, method, h=0.01):
    e1 = abs(derivative(f, x, h, method) - exact)
    e2 = abs(derivative(f, x, h / 2, method) - exact)
    if e1 == 0 or e2 == 0:
        raise ValueError("an error is exactly zero, so no order can be measured")
    return round(math.log2(e1 / e2), 1)

print(derivative(math.sin, 1.0), math.cos(1.0))
```

```python test
import math as _math
for _n in ["derivative", "observed_order"]:
    assert _n in dir(), f"Define {_n}."
assert abs(derivative(_math.sin, 1.0) - _math.cos(1.0)) < 1e-9, "The central default is accurate."
assert abs(derivative(_math.exp, 0.5, 1e-3, "forward") - (_math.exp(0.501) - _math.exp(0.5)) / 1e-3) < 1e-12, "Forward difference."
assert abs(derivative(_math.exp, 0.5, 1e-3, "backward") - (_math.exp(0.5) - _math.exp(0.499)) / 1e-3) < 1e-12, "Backward difference."
assert derivative(lambda t: 4.9 * t ** 2, 1, 0.5) == 9.8, "Central differences are exact for a quadratic."
for _bad in [dict(h=0), dict(h=-1e-3), dict(method="sideways")]:
    try:
        derivative(_math.sin, 1.0, **_bad)
        assert False, f"derivative with {_bad} should raise ValueError."
    except ValueError:
        pass
assert observed_order(_math.sin, 1.0, _math.cos(1.0), "forward") == 1.0, f"Forward is first order; got {observed_order(_math.sin, 1.0, _math.cos(1.0), 'forward')}."
assert observed_order(_math.sin, 1.0, _math.cos(1.0), "backward") == 1.0, "Backward is first order."
assert observed_order(_math.exp, 0.3, _math.exp(0.3), "central") == 2.0, "Central is second order."
try:
    observed_order(lambda x: 5.0, 2.0, 0.0, "central")
    assert False, "A constant function is differentiated exactly: the error is 0, so raise ValueError."
except ValueError:
    pass
"SUCCESS: Halving h and comparing errors measures a method's order: 1 for one-sided differences, 2 for central ones."
```

Hint: For the order, compute `e1` with step h and `e2` with step h/2, both as absolute errors against `exact`, then `math.log2(e1 / e2)`.
:::

::: challenge Speed and acceleration from a log [hard]
Write `speed_from_log(t, x, k=1)` that returns `(t_mid, v)`: NumPy arrays of central-difference speeds over k samples on each side, v_i = (x[i+k] − x[i−k]) / (t[i+k] − t[i−k]), for every i from k to n − k − 1, with `t_mid` the matching `t[i]`. Then write `accel_from_log(t, x, k=1)` that returns `(t_mid, a)` using the second difference for **evenly spaced** samples, a_i = (x[i+k] − 2x[i] + x[i−k]) / (k Δt)². Both raise `ValueError` if k < 1, if the arrays differ in length or have fewer than 2k + 1 samples, or if the times are not strictly increasing; `accel_from_log` also raises `ValueError` if the time steps are not all equal (allow a relative difference of 1e-9 for rounding). Use array operations only: no `for` or `while` loops and no comprehensions.

```python starter
def speed_from_log(t, x, k=1):
    return t, x

def accel_from_log(t, x, k=1):
    return t, x

print(speed_from_log(np.array([0.0, 1, 2, 3]), np.array([0.0, 1, 4, 9])))
```

```python solution
def _check_log(t, x, k):
    t, x = np.asarray(t, dtype=float), np.asarray(x, dtype=float)
    if k < 1:
        raise ValueError("k must be at least 1")
    if len(t) != len(x) or len(t) < 2 * k + 1:
        raise ValueError("need equal-length arrays with at least 2k + 1 samples")
    if np.any(np.diff(t) <= 0):
        raise ValueError("times must be strictly increasing")
    return t, x

def speed_from_log(t, x, k=1):
    t, x = _check_log(t, x, k)
    return t[k:-k], (x[2 * k:] - x[:-2 * k]) / (t[2 * k:] - t[:-2 * k])

def accel_from_log(t, x, k=1):
    t, x = _check_log(t, x, k)
    steps = np.diff(t)
    if not np.allclose(steps, steps[0], rtol=1e-9, atol=0):
        raise ValueError("samples must be evenly spaced")
    dt = steps[0]
    return t[k:-k], (x[2 * k:] - 2 * x[k:-k] + x[:-2 * k]) / (k * dt) ** 2

print(speed_from_log(np.array([0.0, 1, 2, 3]), np.array([0.0, 1, 4, 9])))
```

```python test
import ast as _ast
for _n in ["speed_from_log", "accel_from_log"]:
    assert _n in dir(), f"Define {_n}."
_bad_nodes = (_ast.For, _ast.While, _ast.ListComp, _ast.GeneratorExp, _ast.SetComp, _ast.DictComp)
for _node in _ast.walk(_ast.parse(_source)):
    if isinstance(_node, _ast.FunctionDef):
        assert not any(isinstance(_x, _bad_nodes) for _x in _ast.walk(_node)), f"{_node.name} should use array operations, not loops or comprehensions."
_t = np.arange(0, 2.01, 0.1)
_x = 1.5 * _t ** 2 + 0.4 * _t
_tm, _v = speed_from_log(_t, _x)
assert np.shape(_v) == np.shape(_t[1:-1]) and np.shape(_tm) == np.shape(_t[1:-1]), f"With k = 1, 21 samples give 19 speeds; got {np.shape(_v)}."
assert np.allclose(_tm, _t[1:-1]) and np.allclose(_v, 3 * _t[1:-1] + 0.4), "Central differences are exact for a quadratic."
_tm, _a = accel_from_log(_t, _x, k=3)
assert np.allclose(_tm, _t[3:-3]) and np.allclose(_a, 3.0), "The second difference gives the constant acceleration 3."
_tu = np.array([0.0, 0.5, 2.0, 2.5, 4.0])
_tm, _v = speed_from_log(_tu, _tu ** 2)
assert np.allclose(_v, [2.0, 3.0, 6.0]), f"Uneven spacing: each speed divides by the actual time between its two samples; got {_v}."
try:
    accel_from_log(_tu, _tu ** 2)
    assert False, "accel_from_log with uneven spacing should raise ValueError."
except ValueError:
    pass
for _args in [(_t, _x, 0), (_t, _x, -1), (_t[:4], _x[:4], 2), (_t, _x[:-1], 1), (np.array([0, 1, 1, 2.0]), np.zeros(4), 1)]:
    for _f in (speed_from_log, accel_from_log):
        try:
            _f(*_args)
            assert False, f"{_f.__name__} should raise ValueError for k = {_args[2]}, lengths {len(_args[0])}/{len(_args[1])}."
        except ValueError:
            pass
_rng = np.random.default_rng(22)
_tt = np.arange(0, 1.0, 0.001)
_true_v = 0.05 * 2 * np.pi * np.sin(2 * np.pi * _tt)
_xm = 0.05 * (1 - np.cos(2 * np.pi * _tt)) + _rng.normal(0, 0.0001, _tt.size)
_e = {k: np.sqrt(((speed_from_log(_tt, _xm, k)[1] - _true_v[k:-k]) ** 2).mean()) for k in (1, 20)}
assert _e[20] < _e[1] / 5, "On the noisy encoder log, k = 20 must be much better than k = 1."
"SUCCESS: Speed and acceleration from a position log in two slices each; a wider k trades a little bias for much less noise."
```

Hint: With slices, `x[2*k:] - x[:-2*k]` pairs each sample with the one 2k earlier, and `x[k:-k]` is the middle one. For even spacing, compare `np.diff(t)` with its first value using `np.allclose(..., rtol=1e-9, atol=0)`.
:::

## What you learned

- The average rate of change (f(b) − f(a))/(b − a) is the slope of a secant line; for position it is average velocity.
- As the interval shrinks, secant slopes approach the instantaneous rate, the derivative, which is the slope of the tangent line.
- Forward differences have errors proportional to h; central differences, proportional to h², are far more accurate for the same work.
- In floating point, too small an h amplifies rounding error; the best h is near 10⁻⁸ for forward and 10⁻⁵ for central differences.
- With noisy data, differencing amplifies noise by 1/Δt. Differencing over a wider interval reduces noise but blurs real changes; the best width balances the two.

The next lesson turns to rotation: angles, radians and angular speed.
